"""
Step 4: Export classified data as JSON for the frontend.

Produces:
  - public/data/bible_metadata.json (copy from processed)
  - public/data/references_t1t2t3.json (Tiers 1-3, loaded first)
  - public/data/references_t4.json (Tier 4, loaded on demand)
  - public/data/references_t5.json (Tier 5, loaded on demand)
  - public/data/classification_stats.json
  - public/data/text/{abbrev}.json (66 files, verse text by chapter:verse)
  - public/data/refs/{abbrev}.json (66 files, cross-refs per verse)
  - public/data/manifest.json (per-book stats)
"""

import os
import json
import shutil
import pandas as pd
from collections import defaultdict
from config import BOOK_BY_NUM, BOOKS

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')
PUBLIC_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'data')


def build_chapter_lookup(metadata):
    """Build a lookup from (book_num, chapter) -> globalIndex."""
    lookup = {}
    for book in metadata['books']:
        for ch in book['chapterDetails']:
            lookup[(book['num'], ch['chapter'])] = ch['globalIndex']
    return lookup


def convert_references(df, chapter_lookup):
    """Convert references DataFrame to compact render format."""
    records = []
    for _, row in df.iterrows():
        from_key = (int(row['from_book']), int(row['from_chapter']))
        to_key = (int(row['to_book']), int(row['to_chapter']))

        from_idx = chapter_lookup.get(from_key)
        to_idx = chapter_lookup.get(to_key)

        if from_idx is None or to_idx is None:
            continue

        records.append({
            "f": from_idx,
            "t": to_idx,
            "r": int(row['tier']),
            "v": int(row['votes']),
            "fb": int(row['from_book']),
            "tb": int(row['to_book']),
        })

    return records


def build_num_to_abbrev():
    """Build book number to abbreviation mapping."""
    mapping = {}
    for book in BOOKS:
        mapping[book['num']] = book['abbrev']
    return mapping


def build_evidence(row, has_evidence):
    """
    Build the compact per-reference evidence element ("show receipts"):
      0 when no evidence (missing-text default tier 5, or old CSV),
      ["f", formula, shared]      formula match (tier 1/2)
      ["r", runLen]               verbatim run (tier 1, or 3 via routing)
      ["o", jaccardPct, theoShared]  overlap analysis (tier 3/4/5),
                                     jaccardPct is int 0-100
    """
    if not has_evidence:
        return 0
    ev_type = row['ev_type'] if pd.notna(row['ev_type']) else ''
    if ev_type == 'f':
        return ["f", str(row['ev_detail']), int(row['ev_shared'])]
    if ev_type == 'r':
        return ["r", int(float(row['ev_detail']))]
    if ev_type == 'o':
        return ["o", int(round(float(row['ev_detail']) * 100)), int(row['ev_shared'])]
    return 0


def extract_verse_refs(refs_df):
    """Extract cross-references grouped by verse."""
    # Check for optional columns
    has_quoter = 'quoter' in refs_df.columns
    has_ambiguous = 'ambiguous' in refs_df.columns
    has_evidence = 'ev_type' in refs_df.columns

    # Build a dict: (from_book, from_chapter, from_verse) -> list of entries
    verse_refs = defaultdict(list)

    for _, row in refs_df.iterrows():
        from_book = int(row['from_book'])
        from_chapter = int(row['from_chapter'])
        from_verse = int(row['from_verse'])
        to_book = int(row['to_book'])
        to_chapter = int(row['to_chapter'])
        to_verse = int(row['to_verse'])
        tier = int(row['tier'])
        votes = int(row['votes'])

        evidence = build_evidence(row, has_evidence)

        # Direction: 1 if from side
        # Build entry for from verse
        flags = 0
        if has_ambiguous and pd.notna(row['ambiguous']) and row['ambiguous']:
            flags |= 1
        if has_quoter and pd.notna(row['quoter']) and row['quoter']:
            flags |= 2

        entry_from = (to_book, to_chapter, to_verse, tier, votes, 1, flags, evidence)
        verse_refs[(from_book, from_chapter, from_verse)].append(entry_from)

        # Build entry for to verse (other direction)
        flags_to = 0
        if has_ambiguous and pd.notna(row['ambiguous']) and row['ambiguous']:
            flags_to |= 1
        # quoter flag doesn't apply to to side

        entry_to = (from_book, from_chapter, from_verse, tier, votes, 0, flags_to, evidence)
        verse_refs[(to_book, to_chapter, to_verse)].append(entry_to)

    return verse_refs


def format_verse_ref(book_num, chapter, verse, num_to_abbrev):
    """Format reference as abbrev.chapter.verse."""
    abbrev = num_to_abbrev.get(book_num, f"B{book_num}")
    return f"{abbrev}.{chapter}.{verse}"


def build_book_matrix(refs_csv_path, output_path):
    """
    Build the direction-aware 66x66 book matrix for "The Ledger" view.

    The classified CSV stores TSK-style references bidirectionally at the verse
    level (Matt.4.4->Deut.8.3 AND Deut.8.3->Matt.4.4 both appear), so the raw
    from->to orientation of the chapter aggregate is NOT quoter->quoted and
    cannot be used to claim direction. This step instead:

      * collapses each underlying reference to a single canonical verse-pair,
      * for directed tiers (1-2) orients it by the classifier's `quoter` column
        (row = who speaks / quotes, col = who is quoted),
      * for undirected tiers (3-5) records symmetric kinship (book pair, i<=j),
      * resolves the rare mirror tier-disagreement by keeping the strongest
        (lowest) tier.

    Emits a tiny sparse JSON:
      { nBooks, directed:{ "1":[[row,col,n],..], "2":[..] },
        undirected:{ "3":[[a,b,n],..], "4":[..], "5":[..] } }
    Indices are 0-based book numbers (Genesis=0 .. Revelation=65).
    """
    import csv as _csv

    DIRECTED = (1, 2)
    UNDIRECTED = (3, 4, 5)

    # First pass: strongest tier + oriented books per canonical verse-pair.
    # value = [tier, speaker_book0, quoted_book0, book_a0, book_b0]
    #   speaker/quoted are 0-based, oriented by quoter (for directed tiers)
    #   a<=b are the 0-based book endpoints (for undirected tiers)
    pairs = {}
    with open(refs_csv_path, encoding='utf-8') as f:
        for row in _csv.DictReader(f):
            tier = int(row['tier'])
            fb = int(row['from_book']) - 1
            tb = int(row['to_book']) - 1
            quoter = row['quoter']
            # orient: speaker = the quoter side, quoted = the other side
            if quoter == 'from':
                speaker, quoted = fb, tb
            elif quoter == 'to':
                speaker, quoted = tb, fb
            else:
                speaker, quoted = fb, tb  # no orientation info; fall back
            a, b = (fb, tb) if fb <= tb else (tb, fb)
            key = tuple(sorted((row['from_ref'], row['to_ref'])))
            prev = pairs.get(key)
            if prev is None or tier < prev[0]:
                pairs[key] = [tier, speaker, quoted, a, b]

    directed = {str(t): defaultdict(int) for t in DIRECTED}
    undirected = {str(t): defaultdict(int) for t in UNDIRECTED}

    for tier, speaker, quoted, a, b in pairs.values():
        if tier in DIRECTED:
            directed[str(tier)][(speaker, quoted)] += 1
        elif tier in UNDIRECTED:
            undirected[str(tier)][(a, b)] += 1

    def to_triples(d):
        return sorted([[i, j, n] for (i, j), n in d.items()])

    out = {
        "generated_from": "references_classified.csv",
        "note": ("directed = tiers 1-2 oriented quoter(row)->quoted(col), "
                 "pair-deduped; undirected = tiers 3-5 symmetric kinship "
                 "(a<=b), pair-deduped. 0-based book indices (Gen=0..Rev=65)."),
        "nBooks": 66,
        "directed": {t: to_triples(directed[t]) for t in directed},
        "undirected": {t: to_triples(undirected[t]) for t in undirected},
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))

    size_kb = os.path.getsize(output_path) / 1024
    d_cells = sum(len(v) for v in out['directed'].values())
    u_cells = sum(len(v) for v in out['undirected'].values())
    print(f"  Wrote book_matrix.json ({size_kb:.0f} KB) "
          f"— {d_cells} directed cells, {u_cells} undirected cells, "
          f"{len(pairs):,} unique references")


def main():
    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)
    text_dir = os.path.join(PUBLIC_DATA_DIR, 'text')
    refs_dir = os.path.join(PUBLIC_DATA_DIR, 'refs')
    os.makedirs(text_dir, exist_ok=True)
    os.makedirs(refs_dir, exist_ok=True)

    print("Step 4: Exporting data for frontend")
    print()

    # Load metadata
    meta_path = os.path.join(PROCESSED_DIR, 'bible_metadata.json')
    if not os.path.exists(meta_path):
        print("ERROR: Run 02_build_metadata.py first.")
        return

    with open(meta_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    chapter_lookup = build_chapter_lookup(metadata)

    # Load classified references
    refs_path = os.path.join(PROCESSED_DIR, 'references_classified.csv')
    if not os.path.exists(refs_path):
        print("ERROR: Run 03_classify.py first.")
        return

    refs_df = pd.read_csv(refs_path)
    print(f"Loaded {len(refs_df):,} classified references")

    # Convert all references (keep for tier splitting)
    all_refs = convert_references(refs_df, chapter_lookup)
    print(f"Converted {len(all_refs):,} references to render format")

    # Split by tier (using compact key 'r' for tier)
    t1t2t3 = [r for r in all_refs if r['r'] in (1, 2, 3)]
    t4 = [r for r in all_refs if r['r'] == 4]
    t5 = [r for r in all_refs if r['r'] == 5]

    print(f"  Tiers 1-3: {len(t1t2t3):,}")
    print(f"  Tier 4:    {len(t4):,}")
    print(f"  Tier 5:    {len(t5):,}")

    # Write JSON files
    def write_json(data, filename):
        path = os.path.join(PUBLIC_DATA_DIR, filename)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'))
        size_kb = os.path.getsize(path) / 1024
        print(f"  Wrote {filename} ({size_kb:.0f} KB)")

    write_json(t1t2t3, 'references_t1t2t3.json')
    write_json(t4, 'references_t4.json')
    write_json(t5, 'references_t5.json')

    # Build the direction-aware book matrix for The Ledger (66x66 view).
    build_book_matrix(refs_path, os.path.join(PUBLIC_DATA_DIR, 'book_matrix.json'))

    # Copy metadata
    shutil.copy(meta_path, os.path.join(PUBLIC_DATA_DIR, 'bible_metadata.json'))
    print("  Copied bible_metadata.json")

    # Copy classification stats
    stats_path = os.path.join(PROCESSED_DIR, 'classification_stats.json')
    if os.path.exists(stats_path):
        shutil.copy(stats_path, os.path.join(PUBLIC_DATA_DIR, 'classification_stats.json'))
        print("  Copied classification_stats.json")

    print()
    print("Building per-book shards...")

    # Load bible text
    bible_text_path = os.path.join(PROCESSED_DIR, 'bible_text.json')
    if not os.path.exists(bible_text_path):
        print("ERROR: Run 02_build_metadata.py first.")
        return

    with open(bible_text_path, 'r', encoding='utf-8') as f:
        bible_text = json.load(f)

    # Build num_to_abbrev mapping
    num_to_abbrev = build_num_to_abbrev()

    # Extract verse refs from classified data
    verse_refs = extract_verse_refs(refs_df)
    print(f"Indexed {len(verse_refs):,} verses with cross-references")

    # Build text and refs for each book
    manifest_data = {"books": {}, "generated_from": "references_classified.csv"}
    total_text_bytes = 0
    total_refs_bytes = 0
    shard_sizes = []

    for book in BOOKS:
        book_num = book['num']
        abbrev = book['abbrev']

        # Build text file
        text_by_book = {}
        for ch_v_key, text in bible_text.items():
            # Key format: "booknum.chapter.verse"
            parts = ch_v_key.split('.')
            if len(parts) == 3:
                bnum = int(parts[0])
                if bnum == book_num:
                    chapter = parts[1]
                    verse = parts[2]
                    if chapter not in text_by_book:
                        text_by_book[chapter] = {}
                    text_by_book[chapter][verse] = text

        # Write text file
        text_path = os.path.join(text_dir, f'{abbrev}.json')
        with open(text_path, 'w', encoding='utf-8') as f:
            json.dump(text_by_book, f, separators=(',', ':'))
        text_bytes = os.path.getsize(text_path)
        total_text_bytes += text_bytes

        # Build refs file
        refs_by_book = {}
        for (v_book, v_ch, v_verse), entries in verse_refs.items():
            if v_book == book_num:
                key = f"{v_ch}:{v_verse}"
                refs_list = []
                for entry in entries:
                    other_book, other_ch, other_v, tier, votes, direction, flags, evidence = entry
                    other_ref = format_verse_ref(other_book, other_ch, other_v, num_to_abbrev)
                    refs_list.append([other_ref, tier, votes, direction, flags, evidence])

                # Sort by tier ascending, then votes descending
                refs_list.sort(key=lambda x: (x[1], -x[2]))
                refs_by_book[key] = refs_list

        # Write refs file
        refs_path = os.path.join(refs_dir, f'{abbrev}.json')
        with open(refs_path, 'w', encoding='utf-8') as f:
            json.dump(refs_by_book, f, separators=(',', ':'))
        refs_bytes = os.path.getsize(refs_path)
        total_refs_bytes += refs_bytes

        # Add to manifest
        ref_count = len(refs_by_book)
        manifest_data['books'][abbrev] = {
            'refCount': ref_count,
            'textBytes': text_bytes,
            'refBytes': refs_bytes
        }

        shard_sizes.append((abbrev, text_bytes + refs_bytes))

    # Write manifest
    manifest_path = os.path.join(PUBLIC_DATA_DIR, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest_data, f, separators=(',', ':'))
    manifest_bytes = os.path.getsize(manifest_path)

    print(f"  Created {len(BOOKS)} text files, {len(BOOKS)} refs files")
    print(f"  Total text/: {total_text_bytes:,} bytes")
    print(f"  Total refs/: {total_refs_bytes:,} bytes")
    print(f"  Manifest: {manifest_bytes:,} bytes")

    # Sort by size and report top 3
    shard_sizes.sort(key=lambda x: -x[1])
    print(f"\nLargest shards (combined):")
    for i, (abbrev, size) in enumerate(shard_sizes[:3], 1):
        print(f"  {i}. {abbrev}: {size:,} bytes")

    print("\nDone! Frontend data is ready in public/data/")


if __name__ == '__main__':
    main()
