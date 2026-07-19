"""
Step 3: Classify cross-references into 5 tiers.

Passes:
  Pass 0: Directionality (quoter assignment)
  Pass 1: Vote score bands (prior)
  Pass 2: Tier 1 & 2 detection -- TWO paths:
            (a) citation-formula detection + token-overlap verification
            (b) verbatim-run detection: longest common CONTIGUOUS word run
                between the two verses (raw words, stop words KEPT). A run
                of >= VERBATIM_RUN_MIN consecutive shared words qualifies
                regardless of formula -- this catches unintroduced verbatim
                quotes like Heb 10:38 <- Hab 2:4 ("the just shall live by
                faith") that formula-only detection cannot reach.

            CORPUS ROUTING for verbatim-run-only hits (no passing citation
            formula): cross-testament pairs -> Tier 1 (unintroduced NT
            reproduction of OT wording is quotation; the gold set
            corroborates); same-corpus pairs (OT->OT or NT->NT) -> Tier 3
            (same text recorded twice with no citation: Kings/Chronicles,
            Isa 36-39 || 2 Kgs 18-20, Psalm doublets, synoptic parallels --
            the literal Tier 3 "parallel passage" definition).
            Formula-backed hits keep their tier regardless of corpus.
  Pass 3: Textual overlap analysis (Tier 3, 4, 5)

Directionality: TSK reference pairs are not chronologically directed --
either side of a pair may be listed as "from" or "to". Before formula
detection we compute which side is the potential QUOTER: the verse later
in canonical order (higher book num; tiebreak chapter, then verse). Only
the quoter's text (and the verse immediately preceding it) is scanned for
formulas, and any formula-path Tier-1 match is verified against token
overlap with the OTHER side. This fixes cases like Gen.1.1 -> 1John.1.1
where the OT verse happened to be stored as "from" and the NT quoting verse
was never scanned under the old from-only logic.

Formula lists distinguish CITATION formulas (author quoting an earlier
text: "as it is written") from SPEECH-REPORT formulas (prophet uttering
original divine speech: "thus saith the lord") -- speech-report formulas
were removed after diagnostics showed they generated thousands of OT->OT
false Tier 1s. See the comment in config.py.

VERBATIM_RUN_MIN (N) is chosen empirically: the run length for every pair
is computed once, then N in {4, 5, 6} is evaluated against the
gold-standard set (gold recall vs total Tier-1 count) and the best
trade-off is selected automatically (see choose_verbatim_n).

Output:
  - data/processed/references_classified.csv (adds tier, quoter, ambiguous)
  - data/processed/classification_stats.json

=====================================================================
AMBIGUITY RULES (exact -- see also stats["rules"] in the JSON output)
=====================================================================
`ambiguous` is True (tier assignment unchanged) whenever a decision was
close enough to a boundary that a different judgment call could plausibly
have landed elsewhere. A Tier-1 row is ambiguous unless at least one of
its detection paths is SOLID:

  - verbatim path is solid when run > N (run == N exactly is borderline);
  - formula path is solid when the formula was found in the quoter verse
    itself (not only in the preceding verse) AND shared-token overlap is
    STRICTLY ABOVE the minimum for that formula's class:
      * strong formulas: minimum is STRONG_MIN_OVERLAP (3, or 2 if the
        gold-recall loosening triggered)
      * generic formulas (config.GENERIC_QUOTATION_FORMULAS): minimum is
        GENERIC_MIN_OVERLAP (5)

  1. Tier 1: ambiguous if NO path is solid (i.e. every path that fired
     was exactly at its minimum, or the formula appeared only in the
     preceding verse).
  2. Tier 3 via same-corpus verbatim routing (pass 2): ambiguous iff
     run == N exactly.
  3. Tier 2 (fulfillment formula): ambiguous if shared content-word
     overlap with the other verse is 0 (fulfillment language present but
     no textual corroboration for this specific pair), or the formula was
     found only in the preceding verse.
  4. Tier 3/4/5 via jaccard similarity (pass 3): ambiguous if jaccard is
     within +/-0.05 of any threshold that participates in the decision at
     that branch (0.35, 0.45, or 0.15).
  5. Tier 4 via the theological-term fallback: ambiguous if
     theological_shared is exactly at its threshold (2), or exactly 1 when
     the vote_band=='high' single-term fallback branch is what fired.
"""

import os
import json
import numpy as np
import pandas as pd
from collections import Counter
from config import (
    QUOTATION_FORMULAS, FULFILLMENT_FORMULAS, GENERIC_QUOTATION_FORMULAS,
    BOOK_BY_NUM,
)
from text_utils import (
    tokenize, tokenize_and_filter, compute_jaccard,
    count_shared_theological_terms, has_proper_noun_overlap,
    longest_common_run,
)
from gold_standard import GOLD_STANDARD_QUOTES

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')

STRONG_MIN_OVERLAP_DEFAULT = 3
STRONG_MIN_OVERLAP_LOOSENED = 2
GENERIC_MIN_OVERLAP = 5
VERBATIM_RUN_CANDIDATES = (4, 5, 6)
VERBATIM_T1_TARGET_RANGE = (500, 2000)
JACCARD_TIER3_HIGH = 0.45
JACCARD_TIER3_PROPER = 0.35
JACCARD_TIER4 = 0.15
JACCARD_AMBIGUOUS_BAND = 0.05
GOLD_RECALL_FLOOR = 0.60

# Strong formulas = quotation formulas not flagged generic; check strong first
# so a row with both kinds of match is credited with the stronger evidence.
STRONG_QUOTATION_FORMULAS = [
    f for f in QUOTATION_FORMULAS if f not in GENERIC_QUOTATION_FORMULAS
]
GENERIC_QUOTATION_FORMULAS_ORDERED = [
    f for f in QUOTATION_FORMULAS if f in GENERIC_QUOTATION_FORMULAS
]


def load_data():
    """Load clean references and Bible text."""
    refs_path = os.path.join(PROCESSED_DIR, 'references_clean.csv')
    text_path = os.path.join(PROCESSED_DIR, 'bible_text.json')

    if not os.path.exists(refs_path) or not os.path.exists(text_path):
        print("ERROR: Run 01_ingest.py first.")
        return None, None

    refs_df = pd.read_csv(refs_path)
    with open(text_path, 'r', encoding='utf-8') as f:
        bible_text = json.load(f)

    return refs_df, bible_text


def get_verse_text(bible_text, book_num, chapter, verse):
    """Look up verse text by book number, chapter, verse."""
    key = f"{book_num}.{chapter}.{verse}"
    return bible_text.get(key, "")


def get_chapter_text(bible_text, book_num, chapter):
    """Get all text for a chapter (for broader context matching)."""
    texts = []
    for verse_num in range(1, 200):
        key = f"{book_num}.{chapter}.{verse_num}"
        text = bible_text.get(key)
        if text:
            texts.append(text)
        elif verse_num > 5:
            break
    return " ".join(texts)


def assign_quoter(df):
    """
    Determine, for every row, which side is the potential quoter: the verse
    later in canonical order (higher book num; tiebreak chapter, then verse).
    Vectorized via a composite sort key (book * 1e6 + chapter * 1e3 + verse).
    """
    print("  Pass 0: Directionality (quoter assignment)...")
    from_key = (df['from_book'] * 1_000_000 + df['from_chapter'] * 1000 + df['from_verse'])
    to_key = (df['to_book'] * 1_000_000 + df['to_chapter'] * 1000 + df['to_verse'])
    df['quoter'] = np.where(to_key > from_key, 'to', 'from')
    print(f"    Quoter='from': {(df['quoter'] == 'from').sum():,}")
    print(f"    Quoter='to':   {(df['quoter'] == 'to').sum():,}")
    return df


def pass1_vote_score(df):
    """Pass 1: Assign vote bands as priors."""
    print("  Pass 1: Vote score bands...")
    conditions = [
        df['votes'] >= 50,
        (df['votes'] >= 10) & (df['votes'] < 50),
        df['votes'] < 10,
    ]
    labels = ['high', 'medium', 'low']
    df['vote_band'] = np.select(conditions, labels, default='low')

    print(f"    High ({'>'}=50 votes): {(df['vote_band'] == 'high').sum():,}")
    print(f"    Medium (10-49 votes): {(df['vote_band'] == 'medium').sum():,}")
    print(f"    Low (<10 votes): {(df['vote_band'] == 'low').sum():,}")
    return df


def pass2_scan(df, bible_text):
    """
    Pass 2 scan stage: for every row compute the raw evidence used for
    Tier 1/2 decisions, WITHOUT applying thresholds. Thresholds (formula
    overlap minimums, verbatim N) are applied later by apply_pass2 -- this
    makes N tuning and gold-recall loosening cheap (no re-scan).

    Verse tokenizations are cached per verse key (both filtered content
    tokens and raw tokens with stop words kept).

    Returns dict idx -> {
        'q_formula': first matching quotation formula name or None
                     (strong formulas checked before generic ones),
        'q_generic': True if that formula is generic-class,
        'q_prev_only': formula found only in the verse preceding the quoter,
        'f_formula': fulfillment formula found (bool),
        'f_formula_name': the matched fulfillment formula string (or None),
        'f_prev_only': fulfillment formula only in preceding verse,
        'shared': shared filtered-token count (quoter+prev vs other),
        'run': longest common contiguous raw-word run (quoter vs other),
    }
    Rows with no evidence at all are omitted.
    """
    print("  Pass 2 (scan): formula + verbatim-run evidence...")

    filtered_cache = {}
    raw_cache = {}
    rawset_cache = {}
    lower_cache = {}

    def filtered_tokens(key):
        toks = filtered_cache.get(key)
        if toks is None:
            toks = frozenset(tokenize_and_filter(bible_text.get(key, "").lower()))
            filtered_cache[key] = toks
        return toks

    def raw_tokens(key):
        toks = raw_cache.get(key)
        if toks is None:
            toks = tuple(tokenize(bible_text.get(key, "")))
            raw_cache[key] = toks
            rawset_cache[key] = frozenset(toks)
        return toks

    def raw_token_set(key):
        raw_tokens(key)
        return rawset_cache[key]

    def lower_text(key):
        t = lower_cache.get(key)
        if t is None:
            t = bible_text.get(key, "").lower()
            lower_cache[key] = t
        return t

    min_candidate_n = min(VERBATIM_RUN_CANDIDATES)
    scan = {}
    batch_size = 25000

    quoter_is_from = (df['quoter'] == 'from').to_numpy()
    fb = df['from_book'].to_numpy(); fc = df['from_chapter'].to_numpy(); fv = df['from_verse'].to_numpy()
    tb = df['to_book'].to_numpy(); tc = df['to_chapter'].to_numpy(); tv = df['to_verse'].to_numpy()
    index = df.index.to_numpy()

    for i in range(len(df)):
        if i > 0 and i % batch_size == 0:
            print(f"    Scanned {i:,}/{len(df):,}...")

        if quoter_is_from[i]:
            q_book, q_ch, q_v = fb[i], fc[i], fv[i]
            o_book, o_ch, o_v = tb[i], tc[i], tv[i]
        else:
            q_book, q_ch, q_v = tb[i], tc[i], tv[i]
            o_book, o_ch, o_v = fb[i], fc[i], fv[i]

        q_key = f"{q_book}.{q_ch}.{q_v}"
        q_prev_key = f"{q_book}.{q_ch}.{q_v - 1}" if q_v > 1 else None
        o_key = f"{o_book}.{o_ch}.{o_v}"

        quoter_text = lower_text(q_key)
        quoter_prev_text = lower_text(q_prev_key) if q_prev_key else ""

        if not quoter_text and not quoter_prev_text:
            continue

        other_filtered = filtered_tokens(o_key)
        combined = filtered_tokens(q_key) | (
            filtered_tokens(q_prev_key) if q_prev_key else frozenset()
        )
        shared = len(combined & other_filtered)

        # Quotation formula candidate: strong first, then generic
        q_formula = None
        q_generic = False
        q_prev_only = False
        for formula in STRONG_QUOTATION_FORMULAS:
            in_q = formula in quoter_text
            if in_q or (formula in quoter_prev_text):
                q_formula = formula
                q_prev_only = not in_q
                break
        if q_formula is None:
            for formula in GENERIC_QUOTATION_FORMULAS_ORDERED:
                in_q = formula in quoter_text
                if in_q or (formula in quoter_prev_text):
                    q_formula = formula
                    q_generic = True
                    q_prev_only = not in_q
                    break

        # Fulfillment formula
        f_formula = False
        f_formula_name = None
        f_prev_only = False
        for formula in FULFILLMENT_FORMULAS:
            in_q = formula in quoter_text
            if in_q or (formula in quoter_prev_text):
                f_formula = True
                f_formula_name = formula
                f_prev_only = not in_q
                break

        # Verbatim run (quoter verse vs other verse), raw words with stop
        # words KEPT. Quick reject: a run >= min N requires at least min-N
        # shared word types; cheap set-overlap filter before the full scan.
        run = 0
        q_raw = raw_tokens(q_key)
        o_raw = raw_tokens(o_key)
        if q_raw and o_raw and len(raw_token_set(q_key) & raw_token_set(o_key)) >= min_candidate_n:
            run = longest_common_run(q_raw, o_raw)

        if q_formula is not None or f_formula or run >= min_candidate_n:
            scan[index[i]] = {
                'q_formula': q_formula,
                'q_generic': q_generic,
                'q_prev_only': q_prev_only,
                'f_formula': f_formula,
                'f_formula_name': f_formula_name,
                'f_prev_only': f_prev_only,
                'shared': shared,
                'run': run,
            }

    print(f"    Rows with any Tier-1/2 evidence: {len(scan):,}")
    return scan


def apply_pass2(df, scan, verbatim_n, strong_min_overlap):
    """
    Apply Tier 1/2 thresholds to the scan evidence.

    Corpus routing: verbatim-run-only hits (no PASSING citation formula)
    go to Tier 1 when the pair is cross-testament, but to Tier 3 when both
    verses are in the same corpus (OT->OT or NT->NT) -- same text recorded
    twice is a parallel passage, not a quotation. Formula-backed Tier 1s
    keep Tier 1 regardless of corpus.

    Returns the df with tier/ambiguous set for pass-2-decided rows, plus a
    Counter of the formula (or verbatim-only marker) credited per Tier-1 row.
    """
    tier1_count = 0
    tier2_count = 0
    tier3_verbatim_count = 0
    t1_histogram = Counter()
    cross_testament = df['is_cross_testament'].to_dict()

    for idx, ev in scan.items():
        run = ev['run']
        shared = ev['shared']

        t1_via_run = run >= verbatim_n
        min_required = GENERIC_MIN_OVERLAP if ev['q_generic'] else strong_min_overlap
        t1_via_formula = ev['q_formula'] is not None and shared >= min_required

        if t1_via_run and not t1_via_formula and not cross_testament[idx]:
            # Same-corpus verbatim parallel: Tier 3 (parallel passage)
            df.at[idx, 'tier'] = 3
            tier3_verbatim_count += 1
            df.at[idx, 'ambiguous'] = (run == verbatim_n)
            df.at[idx, 'ev_type'] = 'r'
            df.at[idx, 'ev_detail'] = str(run)
            df.at[idx, 'ev_shared'] = 0
        elif t1_via_run or t1_via_formula:
            df.at[idx, 'tier'] = 1
            tier1_count += 1
            run_solid = t1_via_run and run > verbatim_n
            formula_solid = (
                t1_via_formula and shared > min_required and not ev['q_prev_only']
            )
            df.at[idx, 'ambiguous'] = not (run_solid or formula_solid)
            if t1_via_formula:
                t1_histogram[ev['q_formula']] += 1
            else:
                t1_histogram['(verbatim run only, no formula)'] += 1
            # Evidence: record whichever path determined the tier; the run
            # is evaluated first in this code order, so it wins when both
            # fired (recording only -- classification is unaffected).
            if t1_via_run:
                df.at[idx, 'ev_type'] = 'r'
                df.at[idx, 'ev_detail'] = str(run)
                df.at[idx, 'ev_shared'] = 0
            else:
                df.at[idx, 'ev_type'] = 'f'
                df.at[idx, 'ev_detail'] = ev['q_formula']
                df.at[idx, 'ev_shared'] = shared
        elif ev['f_formula']:
            df.at[idx, 'tier'] = 2
            tier2_count += 1
            df.at[idx, 'ambiguous'] = (shared == 0) or ev['f_prev_only']
            df.at[idx, 'ev_type'] = 'f'
            df.at[idx, 'ev_detail'] = ev['f_formula_name']
            df.at[idx, 'ev_shared'] = shared

    print(f"    Tier 1 (Direct Quotation): {tier1_count:,} "
          f"(verbatim N={verbatim_n}, strong overlap min={strong_min_overlap})")
    print(f"    Tier 2 (Allusion/Fulfillment): {tier2_count:,}")
    print(f"    Tier 3 via same-corpus verbatim routing: {tier3_verbatim_count:,}")
    return df, t1_histogram


def pass3_textual_overlap(df, bible_text):
    """Classify remaining references (tier == 0) by textual similarity."""
    print("  Pass 3: Textual overlap analysis...")

    unclassified = df[df['tier'] == 0].index
    print(f"    Analyzing {len(unclassified):,} unclassified references...")

    tier3_count = 0
    tier4_count = 0
    tier5_count = 0
    batch_size = 25000

    def near(value, threshold):
        return abs(value - threshold) <= JACCARD_AMBIGUOUS_BAND

    for i, idx in enumerate(unclassified):
        if i > 0 and i % batch_size == 0:
            print(f"    Processed {i:,}/{len(unclassified):,}...")

        row = df.loc[idx]

        from_text = get_verse_text(
            bible_text, row['from_book'], row['from_chapter'], row['from_verse']
        )
        to_text = get_verse_text(
            bible_text, row['to_book'], row['to_chapter'], row['to_verse']
        )

        if not from_text or not to_text:
            df.at[idx, 'tier'] = 5
            tier5_count += 1
            # ev_type stays '' -- missing-text default Tier 5, no evidence
            continue

        from_tokens = tokenize_and_filter(from_text.lower())
        to_tokens = tokenize_and_filter(to_text.lower())

        jaccard = compute_jaccard(from_tokens, to_tokens)
        proper_overlap, shared_names = has_proper_noun_overlap(from_text, to_text, min_shared=2)
        theological_shared = count_shared_theological_terms(from_tokens, to_tokens)

        ambiguous = False

        # Tier 3: High textual overlap + shared proper nouns
        if jaccard >= JACCARD_TIER3_PROPER and proper_overlap:
            df.at[idx, 'tier'] = 3
            tier3_count += 1
            ambiguous = near(jaccard, JACCARD_TIER3_PROPER)
        elif jaccard >= JACCARD_TIER3_HIGH:
            df.at[idx, 'tier'] = 3
            tier3_count += 1
            ambiguous = near(jaccard, JACCARD_TIER3_HIGH)
        # Tier 4: Medium overlap or theological terms
        elif jaccard >= JACCARD_TIER4 or (theological_shared >= 2 and row['vote_band'] != 'low'):
            df.at[idx, 'tier'] = 4
            tier4_count += 1
            ambiguous = near(jaccard, JACCARD_TIER4) or (theological_shared == 2)
        elif row['vote_band'] == 'high' and theological_shared >= 1:
            df.at[idx, 'tier'] = 4
            tier4_count += 1
            ambiguous = (theological_shared == 1)
        # Tier 5: Everything else
        else:
            df.at[idx, 'tier'] = 5
            tier5_count += 1
            ambiguous = near(jaccard, JACCARD_TIER4)

        df.at[idx, 'ambiguous'] = ambiguous
        df.at[idx, 'ev_type'] = 'o'
        df.at[idx, 'ev_detail'] = f"{jaccard:.2f}"
        df.at[idx, 'ev_shared'] = theological_shared

    print(f"    Tier 3 (Parallel Passage): {tier3_count:,}")
    print(f"    Tier 4 (Thematic Echo): {tier4_count:,}")
    print(f"    Tier 5 (Shared Vocabulary): {tier5_count:,}")
    return df


def build_pair_lookup(df):
    """
    Build a dict mapping an unordered (verse_tuple, verse_tuple) key -> tier,
    for gold-standard recall lookups. Since OT book nums (1-39) are always
    less than NT book nums (40-66), the lower-book-num side is always first
    in the key regardless of which CSV column it came from.
    """
    from_a = list(zip(df['from_book'], df['from_chapter'], df['from_verse']))
    to_a = list(zip(df['to_book'], df['to_chapter'], df['to_verse']))
    lookup = {}
    for a, b, tier in zip(from_a, to_a, df['tier']):
        key = (a, b) if a <= b else (b, a)
        lookup[key] = tier
    return lookup


def measure_gold_recall(df):
    """
    Measure gold-standard recall: of the well-attested NT quotations of the
    OT in gold_standard.GOLD_STANDARD_QUOTES that actually exist as rows in
    the reference data, what fraction landed in Tier 1 or 2?

    NOTE: KJV NT often quotes the Septuagint, not the KJV OT's underlying
    text, so English token overlap can miss genuine quotes -- see the
    caution in gold_standard.py. The verbatim-run path plus the
    strong-formula loosening mechanism (3 -> 2 when recall < 60%) exist to
    compensate.
    """
    lookup = build_pair_lookup(df)
    found = 0
    in_tier12 = 0
    for nt_book, nt_ch, nt_v, ot_book, ot_ch, ot_v in GOLD_STANDARD_QUOTES:
        key = ((ot_book, ot_ch, ot_v), (nt_book, nt_ch, nt_v))
        tier = lookup.get(key)
        if tier is not None:
            found += 1
            if tier in (1, 2):
                in_tier12 += 1
    recall = (in_tier12 / found) if found else 0.0
    return {
        "gold_total": len(GOLD_STANDARD_QUOTES),
        "gold_found_in_data": found,
        "gold_in_tier1_or_2": in_tier12,
        "recall": recall,
    }


def choose_verbatim_n(df, scan, strong_min_overlap):
    """
    Evaluate each candidate N against the gold set (Tier-1/2 recall) and
    the total Tier-1 count, print the table, and pick the best trade-off:
    among candidates whose T1 total falls in VERBATIM_T1_TARGET_RANGE,
    the one with highest recall; if none lands in range, the candidate
    closest to the range (tiebreak: higher recall). Gold recall here only
    depends on Pass 2 since Tier 1/2 are decided entirely by Pass 2.
    """
    print("  Tuning verbatim-run threshold N against gold standard...")

    gold_keys = set()
    for nt_book, nt_ch, nt_v, ot_book, ot_ch, ot_v in GOLD_STANDARD_QUOTES:
        gold_keys.add(((ot_book, ot_ch, ot_v), (nt_book, nt_ch, nt_v)))

    from_tuples = dict(zip(df.index, zip(df['from_book'], df['from_chapter'], df['from_verse'])))
    to_tuples = dict(zip(df.index, zip(df['to_book'], df['to_chapter'], df['to_verse'])))
    key_by_idx = {}
    present_gold_keys = set()
    for idx in df.index:
        a, b = from_tuples[idx], to_tuples[idx]
        key = (a, b) if a <= b else (b, a)
        key_by_idx[idx] = key
        if key in gold_keys:
            present_gold_keys.add(key)
    found = len(present_gold_keys)

    cross_testament = df['is_cross_testament'].to_dict()

    table = []
    for n in VERBATIM_RUN_CANDIDATES:
        t1_total = 0
        t2_total = 0
        t3_verbatim_total = 0
        gold_hit_keys = set()
        for idx, ev in scan.items():
            min_required = GENERIC_MIN_OVERLAP if ev['q_generic'] else strong_min_overlap
            t1_via_run = ev['run'] >= n
            t1_via_formula = (
                ev['q_formula'] is not None and ev['shared'] >= min_required
            )
            if t1_via_run and not t1_via_formula and not cross_testament[idx]:
                t3_verbatim_total += 1  # same-corpus verbatim -> Tier 3
                continue
            t1 = t1_via_run or t1_via_formula
            t2 = (not t1) and ev['f_formula']
            if t1:
                t1_total += 1
            elif t2:
                t2_total += 1
            if (t1 or t2) and key_by_idx[idx] in present_gold_keys:
                gold_hit_keys.add(key_by_idx[idx])
        recall = len(gold_hit_keys) / found if found else 0.0
        table.append({
            "n": n, "tier1_total": t1_total, "tier2_total": t2_total,
            "tier3_same_corpus_verbatim": t3_verbatim_total,
            "gold_in_tier1_or_2": len(gold_hit_keys), "gold_found": found,
            "recall": recall,
        })
        print(f"    N={n}: T1={t1_total:,}  T2={t2_total:,}  "
              f"T3(same-corpus verbatim)={t3_verbatim_total:,}  "
              f"gold recall={recall*100:.1f}% ({len(gold_hit_keys)}/{found})")

    lo, hi = VERBATIM_T1_TARGET_RANGE
    in_range = [r for r in table if lo <= r['tier1_total'] <= hi]
    if in_range:
        best = max(in_range, key=lambda r: r['recall'])
    else:
        def dist(r):
            t = r['tier1_total']
            return lo - t if t < lo else (t - hi if t > hi else 0)
        best = min(table, key=lambda r: (dist(r), -r['recall']))
    print(f"    Chosen N = {best['n']}")
    return best['n'], table


def classify(refs_df, bible_text, strong_min_overlap, scan=None, verbatim_n=None):
    """
    Run classification. If scan is None it is computed (expensive). If
    verbatim_n is None it is chosen against the gold set. Returns
    (df, scan, verbatim_n, n_table, t1_histogram).
    """
    df = refs_df.copy()
    df['tier'] = 0
    df['ambiguous'] = False
    # Evidence columns ("show receipts"): why each pair got its tier.
    #   ev_type:  'f' formula match (tier 1/2), 'r' verbatim run (tier 1, or
    #             3 via same-corpus routing), 'o' overlap analysis (tier
    #             3/4/5), '' missing-text default tier 5.
    #   ev_detail: 'f' -> matched formula string; 'r' -> run length;
    #              'o' -> jaccard rounded to 2dp.
    #   ev_shared: 'f' -> shared-token count used in the decision;
    #              'o' -> shared theological term count; 'r' -> 0.
    df['ev_type'] = ''
    df['ev_detail'] = ''
    df['ev_shared'] = 0

    df = assign_quoter(df)
    print()
    df = pass1_vote_score(df)
    print()
    if scan is None:
        scan = pass2_scan(df, bible_text)
        print()

    n_table = None
    if verbatim_n is None:
        verbatim_n, n_table = choose_verbatim_n(df, scan, strong_min_overlap)
        print()

    print("  Pass 2 (apply): Tier 1/2 assignment...")
    df, t1_histogram = apply_pass2(df, scan, verbatim_n, strong_min_overlap)
    print()
    df = pass3_textual_overlap(df, bible_text)
    print()
    return df, scan, verbatim_n, n_table, t1_histogram


def main():
    print("Step 3: Classifying cross-references")
    print()

    refs_df, bible_text = load_data()
    if refs_df is None:
        return

    # Capture the previous run's tier counts (if any) so we can verify that
    # bookkeeping-only changes (e.g. evidence recording) leave the
    # classification itself untouched.
    prior_by_tier = None
    prior_stats_path = os.path.join(PROCESSED_DIR, 'classification_stats.json')
    if os.path.exists(prior_stats_path):
        with open(prior_stats_path, 'r', encoding='utf-8') as f:
            prior_by_tier = json.load(f).get('by_tier')

    print(f"Total references to classify: {len(refs_df):,}")
    print()

    df, scan, verbatim_n, n_table, t1_histogram = classify(
        refs_df, bible_text, strong_min_overlap=STRONG_MIN_OVERLAP_DEFAULT
    )

    gold_result = measure_gold_recall(df)
    loosened = False
    print("=== Gold-standard recall (initial) ===")
    print(f"  Gold pairs defined:        {gold_result['gold_total']:,}")
    print(f"  Found in reference data:   {gold_result['gold_found_in_data']:,}")
    print(f"  Landed in Tier 1/2:        {gold_result['gold_in_tier1_or_2']:,}")
    print(f"  Recall:                    {gold_result['recall']*100:.1f}%")
    print()

    if gold_result['gold_found_in_data'] > 0 and gold_result['recall'] < GOLD_RECALL_FLOOR:
        print(f"  Recall below {GOLD_RECALL_FLOOR*100:.0f}% floor -- loosening strong-formula "
              f"overlap minimum to {STRONG_MIN_OVERLAP_LOOSENED} and re-applying...")
        print()
        loosened = True
        df, scan, verbatim_n, _, t1_histogram = classify(
            refs_df, bible_text,
            strong_min_overlap=STRONG_MIN_OVERLAP_LOOSENED,
            scan=scan, verbatim_n=verbatim_n,
        )
        gold_result = measure_gold_recall(df)
        print("=== Gold-standard recall (after loosening) ===")
        print(f"  Found in reference data:  {gold_result['gold_found_in_data']:,}")
        print(f"  Landed in Tier 1/2:       {gold_result['gold_in_tier1_or_2']:,}")
        print(f"  Recall:                   {gold_result['recall']*100:.1f}%")
        print()

    final_strong_min_overlap = (
        STRONG_MIN_OVERLAP_LOOSENED if loosened else STRONG_MIN_OVERLAP_DEFAULT
    )

    # Save classified references
    output_path = os.path.join(PROCESSED_DIR, 'references_classified.csv')
    df.to_csv(output_path, index=False)
    print(f"Saved classified references to {output_path}")

    # Generate stats
    stats = {
        "total": len(df),
        "by_tier": {},
        "ambiguous_by_tier": {},
        "cross_testament": int(df['is_cross_testament'].sum()),
        "quoter_distribution": {
            "from": int((df['quoter'] == 'from').sum()),
            "to": int((df['quoter'] == 'to').sum()),
        },
        "gold_standard": {
            **gold_result,
            "recall_loosening_applied": loosened,
        },
        "verbatim_run": {
            "chosen_n": verbatim_n,
            "tuning_table": n_table,
        },
        "tier1_formula_histogram_top10": dict(t1_histogram.most_common(10)),
        "rules": {
            "pass1_vote_bands": "high: votes>=50; medium: 10<=votes<50; low: votes<10",
            "directionality": (
                "quoter = the side later in canonical order (higher book num; "
                "tiebreak chapter, then verse). Only the quoter's verse and the "
                "verse immediately preceding it are scanned for formulas; the "
                "verbatim-run check compares the quoter's verse to the other verse."
            ),
            "tier1_direct_quotation": (
                f"EITHER (a) verbatim run: the two verses share a contiguous "
                f"run of >= {verbatim_n} identical words (lowercased, "
                f"punctuation stripped, intra-word dashes joined, stop words "
                f"kept) AND the pair is cross-testament (see corpus routing "
                f"below); OR (b) citation formula: the quoter (or preceding) "
                f"verse contains a formula from QUOTATION_FORMULAS AND shared "
                f"content-word overlap with the other verse is >= "
                f"{final_strong_min_overlap} for strong formulas or >= "
                f"{GENERIC_MIN_OVERLAP} for generic formulas "
                f"(GENERIC_QUOTATION_FORMULAS); formula-backed hits keep "
                f"Tier 1 regardless of corpus. Speech-report formulas "
                f"('thus saith the lord', 'the word of the lord came', "
                f"'god said') are deliberately excluded: they introduce "
                f"original divine speech, not citations of earlier texts."
            ),
            "verbatim_corpus_routing": (
                "same-corpus verbatim parallels are parallel passages "
                "(Tier 3) per tier definitions; cross-testament verbatim "
                "runs are quotations (Tier 1). Same-corpus verbatim-only "
                "hits (OT->OT or NT->NT, no passing citation formula) are "
                "same text recorded twice -- Kings/Chronicles, "
                "Isa 36-39 || 2 Kgs 18-20, Psalm doublets, synoptic "
                "parallels -- and are routed to Tier 3, flagged ambiguous "
                "only when the run is exactly at the minimum N."
            ),
            "tier2_fulfillment": (
                "quoter (or preceding) verse contains a formula from "
                "FULFILLMENT_FORMULAS and the pair did not qualify for Tier 1 "
                "(no overlap minimum required, but zero shared content words "
                "is flagged ambiguous)."
            ),
            "tier3_parallel_passage": (
                f"same-corpus verbatim run >= {verbatim_n} words with no "
                f"passing citation formula (see verbatim_corpus_routing), OR "
                f"jaccard >= {JACCARD_TIER3_PROPER} AND >=2 shared proper "
                f"nouns, OR jaccard >= {JACCARD_TIER3_HIGH} alone."
            ),
            "tier4_thematic_echo": (
                f"jaccard >= {JACCARD_TIER4}, OR (shared theological terms >= 2 "
                f"AND vote_band != 'low'), OR (vote_band == 'high' AND shared "
                f"theological terms >= 1)."
            ),
            "tier5_shared_vocabulary": "everything else.",
            "evidence": (
                "evidence fields (ev_type/ev_detail/ev_shared: the matched "
                "formula, verbatim-run length, or jaccard/theological-term "
                "figures behind each decision) are published per-reference "
                "so any classification can be independently verified."
            ),
            "ambiguous_flag": (
                "flags borderline calls without changing the tier. Tier 1 is "
                "ambiguous unless a detection path is solid (verbatim run "
                "strictly above N, or a formula in the quoter verse itself "
                "with overlap strictly above its class minimum); Tier 3 via "
                "same-corpus verbatim routing is ambiguous only when the run "
                "is exactly N; Tier 2 is ambiguous when overlap is zero or "
                "the formula appeared only in the preceding verse; Tiers 3-5 "
                "via pass-3 similarity are ambiguous within +/-0.05 of a "
                "jaccard threshold or exactly at a theological-term "
                "threshold. Full rules: AMBIGUITY RULES comment block in "
                "03_classify.py."
            ),
        },
    }

    for tier in range(1, 6):
        tier_mask = df['tier'] == tier
        count = int(tier_mask.sum())
        stats["by_tier"][str(tier)] = count
        stats["ambiguous_by_tier"][str(tier)] = int((tier_mask & df['ambiguous']).sum())

    t1_mask = df['tier'] == 1
    stats["tier1_by_corpus"] = {
        "cross_testament": int((t1_mask & df['is_cross_testament']).sum()),
        "ot_to_ot": int((t1_mask & (df['from_book'] < 40) & (df['to_book'] < 40)).sum()),
        "nt_to_nt": int((t1_mask & (df['from_book'] >= 40) & (df['to_book'] >= 40)).sum()),
    }

    # Tier-count identity check vs the previous stats (bookkeeping-only
    # changes must not move any reference between tiers).
    if prior_by_tier is not None:
        identical = prior_by_tier == stats["by_tier"]
        print(f"\n  Tier counts vs previous classification_stats.json: "
              f"{'IDENTICAL' if identical else 'CHANGED'}")
        if not identical:
            for t in sorted(set(prior_by_tier) | set(stats['by_tier'])):
                p, c = prior_by_tier.get(t), stats['by_tier'].get(t)
                if p != c:
                    print(f"    Tier {t}: {p} -> {c}")

    stats_path = os.path.join(PROCESSED_DIR, 'classification_stats.json')
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)

    print(f"\n=== Classification Results ===")
    for tier in range(1, 6):
        count = stats["by_tier"][str(tier)]
        amb = stats["ambiguous_by_tier"][str(tier)]
        pct = count / len(df) * 100
        print(f"  Tier {tier}: {count:>8,} ({pct:.1f}%)  [ambiguous: {amb:,}]")
    print(f"  Cross-testament: {stats['cross_testament']:,}")
    print(f"  Quoter=from: {stats['quoter_distribution']['from']:,}  "
          f"Quoter=to: {stats['quoter_distribution']['to']:,}")
    print(f"  Verbatim run N: {verbatim_n}")
    print(f"  Tier 1 by corpus: cross-testament={stats['tier1_by_corpus']['cross_testament']:,}  "
          f"OT->OT={stats['tier1_by_corpus']['ot_to_ot']:,}  "
          f"NT->NT={stats['tier1_by_corpus']['nt_to_nt']:,}")
    print(f"  Gold-standard recall: {gold_result['recall']*100:.1f}% "
          f"({gold_result['gold_in_tier1_or_2']}/{gold_result['gold_found_in_data']} found pairs, "
          f"loosened={loosened})")
    print(f"\n  Tier-1 formula histogram (top 10):")
    for name, cnt in t1_histogram.most_common(10):
        print(f"    {cnt:6,}  {name}")


if __name__ == '__main__':
    main()
