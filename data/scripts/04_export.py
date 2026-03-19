"""
Step 4: Export classified data as JSON for the frontend.

Produces:
  - public/data/bible_metadata.json (copy from processed)
  - public/data/references_t1t2t3.json (Tiers 1-3, loaded first)
  - public/data/references_t4.json (Tier 4, loaded on demand)
  - public/data/references_t5.json (Tier 5, loaded on demand)
  - public/data/classification_stats.json
"""

import os
import json
import shutil
import pandas as pd
from config import BOOK_BY_NUM

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


def main():
    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

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

    # Convert all references
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

    # Copy metadata
    shutil.copy(meta_path, os.path.join(PUBLIC_DATA_DIR, 'bible_metadata.json'))
    print("  Copied bible_metadata.json")

    # Copy classification stats
    stats_path = os.path.join(PROCESSED_DIR, 'classification_stats.json')
    if os.path.exists(stats_path):
        shutil.copy(stats_path, os.path.join(PUBLIC_DATA_DIR, 'classification_stats.json'))
        print("  Copied classification_stats.json")

    print("\nDone! Frontend data is ready in public/data/")


if __name__ == '__main__':
    main()
