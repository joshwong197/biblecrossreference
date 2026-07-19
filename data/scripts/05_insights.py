#!/usr/bin/env python3
"""
Build insights.json for Bible cross-reference Explore feed.
Analyzes references_classified.csv + bible_text.json to generate
compact, data-driven statistics and notable connections.
"""

import csv
import json
import os
import sys
from collections import defaultdict, Counter
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from config import BOOKS, BOOK_BY_NUM

# Constants
DATA_DIR = Path(__file__).parent / ".." / "processed"
OUTPUT_DIR = Path(__file__).parent / ".." / ".." / "public" / "data"
CSV_PATH = DATA_DIR / "references_classified.csv"
BIBLE_TEXT_PATH = DATA_DIR / "bible_text.json"

# Messianic books (from spec)
MESSIANIC_BOOK_NUMS = {23, 19, 38, 33, 27, 5, 1, 2, 28, 39}  # Isaiah, Psalms, Zech, Micah, Daniel, Deut, Gen, Exod, Hosea, Malachi

# Build abbrev lookup
ABBREV_BY_NUM = {b["num"]: b["abbrev"] for b in BOOKS}


def truncate_text(text, max_chars=200):
    """Truncate verse text to max_chars."""
    if not text:
        return ""
    if len(text) > max_chars:
        return text[:max_chars - 1] + "…"
    return text


def format_ref(book_num, chapter, verse):
    """Format a reference as Abbrev.Chapter.Verse."""
    abbrev = ABBREV_BY_NUM.get(book_num, str(book_num))
    return f"{abbrev}.{chapter}.{verse}"


def get_verse_text(bible_text, book_num, chapter, verse):
    """Retrieve KJV text for a verse."""
    key = f"{book_num}.{chapter}.{verse}"
    return truncate_text(bible_text.get(key, ""))


def load_csv():
    """Load references_classified.csv; return list of dicts."""
    rows = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric strings to int
            row['votes'] = int(row['votes'])
            row['from_book'] = int(row['from_book'])
            row['to_book'] = int(row['to_book'])
            row['from_chapter'] = int(row['from_chapter'])
            row['from_verse'] = int(row['from_verse'])
            row['to_chapter'] = int(row['to_chapter'])
            row['to_verse'] = int(row['to_verse'])
            row['tier'] = int(row['tier'])
            row['is_cross_testament'] = row['is_cross_testament'].lower() == 'true'
            row['ambiguous'] = row['ambiguous'].lower() == 'true'
            rows.append(row)
    return rows


def load_bible_text():
    """Load bible_text.json; return dict."""
    with open(BIBLE_TEXT_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_most_connected_verses(rows, bible_text):
    """
    Build most_connected_verses: top 50 verses by reference count.
    Each verse can appear as from_ref or to_ref.
    """
    verse_counts = defaultdict(lambda: {"count": 0, "by_tier": defaultdict(int)})

    for row in rows:
        # Count from_ref
        from_key = (row['from_book'], row['from_chapter'], row['from_verse'])
        verse_counts[from_key]["count"] += 1
        verse_counts[from_key]["by_tier"][row['tier']] += 1

        # Count to_ref
        to_key = (row['to_book'], row['to_chapter'], row['to_verse'])
        verse_counts[to_key]["count"] += 1
        verse_counts[to_key]["by_tier"][row['tier']] += 1

    # Sort and truncate to top 50
    sorted_verses = sorted(
        verse_counts.items(),
        key=lambda x: x[1]["count"],
        reverse=True
    )[:50]

    result = []
    for (book_num, chapter, verse), stats in sorted_verses:
        ref = format_ref(book_num, chapter, verse)
        text = get_verse_text(bible_text, book_num, chapter, verse)
        by_tier = dict(sorted(stats["by_tier"].items()))
        result.append({
            "ref": ref,
            "count": stats["count"],
            "by_tier": by_tier,
            "text": text
        })

    return result


def build_most_quoted_ot(rows, bible_text):
    """
    Build most_quoted_ot: top 25 OT verses with NT quotations.
    Find tier 1-2 cross-testament refs where OT is the non-quoter side
    (meaning NT is quoting OT).
    """
    ot_quotes = defaultdict(lambda: {"count": 0, "quoters": []})

    for row in rows:
        if row['tier'] not in (1, 2) or not row['is_cross_testament']:
            continue

        from_is_ot = row['from_book'] < 40
        to_is_ot = row['to_book'] < 40

        # Determine which side is OT
        if from_is_ot and not to_is_ot:
            # from_ref is OT, to_ref is NT
            ot_key = (row['from_book'], row['from_chapter'], row['from_verse'])
            nt_ref = format_ref(row['to_book'], row['to_chapter'], row['to_verse'])
            ot_quotes[ot_key]["count"] += 1
            if len(ot_quotes[ot_key]["quoters"]) < 5:
                ot_quotes[ot_key]["quoters"].append(nt_ref)
        elif to_is_ot and not from_is_ot:
            # to_ref is OT, from_ref is NT
            ot_key = (row['to_book'], row['to_chapter'], row['to_verse'])
            nt_ref = format_ref(row['from_book'], row['from_chapter'], row['from_verse'])
            ot_quotes[ot_key]["count"] += 1
            if len(ot_quotes[ot_key]["quoters"]) < 5:
                ot_quotes[ot_key]["quoters"].append(nt_ref)

    # Sort and truncate to top 25
    sorted_ot = sorted(
        ot_quotes.items(),
        key=lambda x: x[1]["count"],
        reverse=True
    )[:25]

    result = []
    for (book_num, chapter, verse), stats in sorted_ot:
        ref = format_ref(book_num, chapter, verse)
        text = get_verse_text(bible_text, book_num, chapter, verse)
        result.append({
            "ref": ref,
            "nt_quotes": stats["count"],
            "text": text,
            "quoters": stats["quoters"]
        })

    return result


def build_messianic_thread(rows, bible_text):
    """
    Build messianic_thread: tier 1-2 cross-testament pairs where
    OT book is in MESSIANIC_BOOK_NUMS. Cap at 100, sort by votes desc.
    """
    pairs = []

    for row in rows:
        if row['tier'] not in (1, 2) or not row['is_cross_testament']:
            continue

        from_is_ot = row['from_book'] < 40
        to_is_ot = row['to_book'] < 40

        # Determine OT and NT sides
        if from_is_ot and not to_is_ot:
            ot_book = row['from_book']
            nt_book = row['to_book']
            ot_ref = format_ref(row['from_book'], row['from_chapter'], row['from_verse'])
            nt_ref = format_ref(row['to_book'], row['to_chapter'], row['to_verse'])
            ot_text = get_verse_text(bible_text, row['from_book'], row['from_chapter'], row['from_verse'])
            nt_text = get_verse_text(bible_text, row['to_book'], row['to_chapter'], row['to_verse'])
        elif to_is_ot and not from_is_ot:
            ot_book = row['to_book']
            nt_book = row['from_book']
            ot_ref = format_ref(row['to_book'], row['to_chapter'], row['to_verse'])
            nt_ref = format_ref(row['from_book'], row['from_chapter'], row['from_verse'])
            ot_text = get_verse_text(bible_text, row['to_book'], row['to_chapter'], row['to_verse'])
            nt_text = get_verse_text(bible_text, row['from_book'], row['from_chapter'], row['from_verse'])
        else:
            continue

        # Check if OT book is messianic
        if ot_book not in MESSIANIC_BOOK_NUMS:
            continue

        pairs.append({
            "ot": ot_ref,
            "nt": nt_ref,
            "tier": row['tier'],
            "votes": row['votes'],
            "ambiguous": row['ambiguous'],
            "ot_text": ot_text,
            "nt_text": nt_text
        })

    # Sort by votes desc and cap at 100
    pairs.sort(key=lambda x: x['votes'], reverse=True)
    return pairs[:100]


def build_genesis_revelation(rows, bible_text):
    """
    Build genesis_revelation:
    1. All pairs (any tier 1-4) where one is Genesis 1-3 and other is Revelation 20-22
    2. Any other Genesis×Revelation tier 1-3 pairs
    Cap at 60.
    """
    pairs = []

    for row in rows:
        if row['tier'] not in (1, 2, 3, 4):
            continue

        from_book = row['from_book']
        to_book = row['to_book']

        # Check for Genesis 1-3 × Revelation 20-22
        from_is_gen_13 = from_book == 1 and row['from_chapter'] <= 3
        to_is_gen_13 = to_book == 1 and row['to_chapter'] <= 3
        from_is_rev_2022 = from_book == 66 and row['from_chapter'] >= 20
        to_is_rev_2022 = to_book == 66 and row['to_chapter'] >= 20

        is_gen_rev_special = (from_is_gen_13 and to_is_rev_2022) or (to_is_gen_13 and from_is_rev_2022)

        # Check for general Genesis × Revelation (any chapter, tier 1-3)
        from_is_gen = from_book == 1
        to_is_gen = to_book == 1
        from_is_rev = from_book == 66
        to_is_rev = to_book == 66

        is_gen_rev = (from_is_gen and to_is_rev) or (to_is_gen and from_is_rev)
        is_gen_rev_tier123 = is_gen_rev and row['tier'] in (1, 2, 3)

        if is_gen_rev_special or is_gen_rev_tier123:
            gen_ref = format_ref(row['from_book'], row['from_chapter'], row['from_verse']) if from_is_gen else format_ref(row['to_book'], row['to_chapter'], row['to_verse'])
            rev_ref = format_ref(row['from_book'], row['from_chapter'], row['from_verse']) if from_is_rev else format_ref(row['to_book'], row['to_chapter'], row['to_verse'])

            gen_text = get_verse_text(bible_text, row['from_book'], row['from_chapter'], row['from_verse']) if from_is_gen else get_verse_text(bible_text, row['to_book'], row['to_chapter'], row['to_verse'])
            rev_text = get_verse_text(bible_text, row['from_book'], row['from_chapter'], row['from_verse']) if from_is_rev else get_verse_text(bible_text, row['to_book'], row['to_chapter'], row['to_verse'])

            pairs.append({
                "gen": gen_ref,
                "rev": rev_ref,
                "tier": row['tier'],
                "votes": row['votes'],
                "gen_text": gen_text,
                "rev_text": rev_text
            })

    # Sort by votes desc and cap at 60
    pairs.sort(key=lambda x: x['votes'], reverse=True)
    return pairs[:60]


def build_synoptic_web(rows):
    """
    Build synoptic_web: counts of Matt-Mark, Matt-Luke, Mark-Luke parallels (tier 3 only).
    Also find densest_parallels (up to 20 chapter pairs).
    """
    gospel_nums = {'Matt': 40, 'Mark': 41, 'Luke': 42}
    gospel_order = ['Matt', 'Mark', 'Luke']  # Canonical order

    # Track counts using a tuple key that respects gospel order
    pair_counts_temp = defaultdict(int)
    chapter_pairs = defaultdict(int)

    for row in rows:
        if row['tier'] != 3:
            continue

        from_book = row['from_book']
        to_book = row['to_book']

        # Identify gospels
        from_gospel = None
        to_gospel = None
        for name, num in gospel_nums.items():
            if from_book == num:
                from_gospel = name
            if to_book == num:
                to_gospel = name

        if not from_gospel or not to_gospel or from_gospel == to_gospel:
            continue

        # Create consistent pair key using canonical gospel order
        g1, g2 = from_gospel, to_gospel
        if gospel_order.index(g1) > gospel_order.index(g2):
            g1, g2 = g2, g1
        pair_key = f"{g1}-{g2}"
        pair_counts_temp[pair_key] += 1

        # Track chapter pairs (sorted for consistency)
        ch_from = f"{from_gospel}.{row['from_chapter']}"
        ch_to = f"{to_gospel}.{row['to_chapter']}"
        ch_pair = tuple(sorted([ch_from, ch_to]))
        chapter_pairs[ch_pair] += 1

    # Build pair_counts with canonical ordering
    pair_counts = {}
    for i, g1 in enumerate(gospel_order):
        for g2 in gospel_order[i+1:]:
            key = f"{g1}-{g2}"
            pair_counts[key] = pair_counts_temp.get(key, 0)

    # Top 20 densest chapter pairs
    densest = sorted(
        chapter_pairs.items(),
        key=lambda x: x[1],
        reverse=True
    )[:20]

    densest_list = []
    for (ch_a, ch_b), count in densest:
        densest_list.append({"a": ch_a, "b": ch_b, "count": count})

    return {
        "pair_counts": pair_counts,
        "densest_parallels": densest_list
    }


def build_superlatives(rows, most_connected_verses, most_quoted_ot, messianic_thread):
    """
    Build superlatives: most_connected_chapter, most_quoting_nt_book, highest_voted_pair, tier1_cross_testament_count.
    """
    # Most connected chapter (by total references)
    chapter_counts = defaultdict(int)
    for row in rows:
        from_ch = f"{ABBREV_BY_NUM[row['from_book']]}.{row['from_chapter']}"
        to_ch = f"{ABBREV_BY_NUM[row['to_book']]}.{row['to_chapter']}"
        chapter_counts[from_ch] += 1
        chapter_counts[to_ch] += 1

    most_connected_ch = max(chapter_counts.items(), key=lambda x: x[1])

    # Most quoting NT book (tier 1-2 references)
    nt_book_t12_counts = Counter()
    for row in rows:
        if row['tier'] not in (1, 2):
            continue
        if row['from_book'] >= 40:
            nt_book_t12_counts[ABBREV_BY_NUM[row['from_book']]] += 1
        if row['to_book'] >= 40:
            nt_book_t12_counts[ABBREV_BY_NUM[row['to_book']]] += 1

    most_quoting_nt = max(nt_book_t12_counts.items(), key=lambda x: x[1]) if nt_book_t12_counts else ("N/A", 0)

    # Highest voted pair
    highest_voted = max(rows, key=lambda x: x['votes'])
    highest_voted_pair = {
        "from": format_ref(highest_voted['from_book'], highest_voted['from_chapter'], highest_voted['from_verse']),
        "to": format_ref(highest_voted['to_book'], highest_voted['to_chapter'], highest_voted['to_verse']),
        "votes": highest_voted['votes'],
        "tier": highest_voted['tier']
    }

    # Tier 1 cross-testament count
    tier1_ct_count = sum(1 for row in rows if row['tier'] == 1 and row['is_cross_testament'])

    return {
        "most_connected_chapter": {"ref": most_connected_ch[0], "count": most_connected_ch[1]},
        "most_quoting_nt_book": {"book": most_quoting_nt[0], "t12_count": most_quoting_nt[1]},
        "highest_voted_pair": highest_voted_pair,
        "tier1_cross_testament_count": tier1_ct_count
    }


def main():
    print("Loading data...")
    rows = load_csv()
    bible_text = load_bible_text()

    print(f"Loaded {len(rows)} reference rows")

    # Build stats
    print("Building stats...")
    total = len(rows)
    by_tier = Counter(row['tier'] for row in rows)
    cross_testament = sum(1 for row in rows if row['is_cross_testament'])
    ambiguous_total = sum(1 for row in rows if row['ambiguous'])

    stats = {
        "total": total,
        "by_tier": dict(sorted(by_tier.items())),
        "cross_testament": cross_testament,
        "ambiguous_total": ambiguous_total
    }

    print(f"Stats: {total} total | tier breakdown: {dict(by_tier)} | {cross_testament} cross-testament | {ambiguous_total} ambiguous")

    # Build sections
    print("Building most_connected_verses...")
    most_connected_verses = build_most_connected_verses(rows, bible_text)
    print(f"  {len(most_connected_verses)} verses")

    print("Building most_quoted_ot...")
    most_quoted_ot = build_most_quoted_ot(rows, bible_text)
    print(f"  {len(most_quoted_ot)} OT verses")

    print("Building messianic_thread...")
    messianic_thread = build_messianic_thread(rows, bible_text)
    print(f"  {len(messianic_thread)} pairs")

    print("Building genesis_revelation...")
    genesis_revelation = build_genesis_revelation(rows, bible_text)
    print(f"  {len(genesis_revelation)} pairs")

    print("Building synoptic_web...")
    synoptic_web = build_synoptic_web(rows)
    print(f"  pair_counts: {synoptic_web['pair_counts']}")
    print(f"  {len(synoptic_web['densest_parallels'])} densest chapter pairs")

    print("Building superlatives...")
    superlatives = build_superlatives(rows, most_connected_verses, most_quoted_ot, messianic_thread)
    print(f"  most_connected_chapter: {superlatives['most_connected_chapter']}")
    print(f"  most_quoting_nt_book: {superlatives['most_quoting_nt_book']}")
    print(f"  tier1_cross_testament_count: {superlatives['tier1_cross_testament_count']}")

    # Build output
    output = {
        "generated_from": "references_classified.csv",
        "stats": stats,
        "most_connected_verses": most_connected_verses,
        "most_quoted_ot": most_quoted_ot,
        "messianic_thread": messianic_thread,
        "genesis_revelation": genesis_revelation,
        "synoptic_web": synoptic_web,
        "superlatives": superlatives
    }

    # Write compact JSON (no whitespace)
    output_path = OUTPUT_DIR / "insights.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'), ensure_ascii=False)

    file_size = output_path.stat().st_size
    print(f"\nWrote {output_path}")
    print(f"File size: {file_size:,} bytes")

    # Print spot-check samples
    print("\n=== SPOT CHECKS ===")
    print("\nTop 5 most_connected_verses:")
    for v in most_connected_verses[:5]:
        print(f"  {v['ref']}: {v['count']} refs | {v['by_tier']} | {v['text'][:60]}...")

    print("\nTop 5 most_quoted_ot:")
    for v in most_quoted_ot[:5]:
        print(f"  {v['ref']}: {v['nt_quotes']} NT refs | {v['quoters']}")

    print("\nSynoptic pair counts:")
    for pair, count in synoptic_web['pair_counts'].items():
        print(f"  {pair}: {count}")


if __name__ == "__main__":
    main()
