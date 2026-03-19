"""
Step 2: Build Bible metadata JSON for the frontend.

Reads the KJV CSV and produces a structured metadata file with:
- Book info (name, testament, group, chapter count)
- Per-chapter verse counts
- Global chapter indices (0-1188)

Output:
  - data/processed/bible_metadata.json
"""

import os
import json
import pandas as pd
from config import BOOKS, BOOK_BY_NUM, ABBREV_TO_NUM

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')


def main():
    kjv_path = os.path.join(RAW_DIR, 'KJV.csv')
    if not os.path.exists(kjv_path):
        print("ERROR: Run 01_ingest.py first to download the KJV data.")
        return

    print("Building Bible metadata...")

    df = pd.read_csv(kjv_path)
    df.columns = [c.strip() for c in df.columns]

    # Detect column names
    cols_lower = {c.lower(): c for c in df.columns}
    if 'b' in cols_lower:
        book_col, ch_col = cols_lower['b'], cols_lower['c']
    elif 'book' in cols_lower:
        book_col, ch_col = cols_lower['book'], cols_lower['chapter']
    else:
        # Positional fallback
        ncols = len(df.columns)
        if ncols >= 5:
            book_col, ch_col = df.columns[1], df.columns[2]
        else:
            book_col, ch_col = df.columns[0], df.columns[1]

    print(f"  Using columns: book={book_col}, chapter={ch_col}")

    # If book column contains names, convert to numbers
    sample_val = df[book_col].iloc[0]
    try:
        int(sample_val)
        # Already numeric
    except (ValueError, TypeError):
        # Convert book names to numbers
        print("  Converting book names to numbers...")
        df['_book_num'] = df[book_col].apply(
            lambda x: ABBREV_TO_NUM.get(str(x).lower().strip())
        )
        df = df.dropna(subset=['_book_num'])
        df['_book_num'] = df['_book_num'].astype(int)
        book_col = '_book_num'

    # Count verses per chapter per book
    chapter_counts = df.groupby([book_col, ch_col]).size().reset_index(name='verse_count')

    global_index = 0
    books_meta = []
    total_verses = 0

    for book_info in BOOKS:
        book_num = book_info["num"]
        book_chapters = chapter_counts[chapter_counts[book_col] == book_num].sort_values(ch_col)

        chapter_details = []
        book_total_verses = 0

        for _, row in book_chapters.iterrows():
            ch_num = int(row[ch_col])
            v_count = int(row['verse_count'])
            chapter_details.append({
                "chapter": ch_num,
                "verses": v_count,
                "globalIndex": global_index,
            })
            global_index += 1
            book_total_verses += v_count

        total_verses += book_total_verses

        books_meta.append({
            "num": book_num,
            "name": book_info["name"],
            "abbrev": book_info["abbrev"],
            "testament": book_info["testament"],
            "group": book_info["group"],
            "chapters": len(chapter_details),
            "verses": book_total_verses,
            "chapterOffset": chapter_details[0]["globalIndex"] if chapter_details else 0,
            "chapterDetails": chapter_details,
        })

    # Count OT vs NT chapters
    ot_chapters = sum(b["chapters"] for b in books_meta if b["testament"] == "OT")
    nt_chapters = sum(b["chapters"] for b in books_meta if b["testament"] == "NT")

    metadata = {
        "books": books_meta,
        "totalChapters": global_index,
        "totalVerses": total_verses,
        "otChapters": ot_chapters,
        "ntChapters": nt_chapters,
    }

    # Save
    output_path = os.path.join(PROCESSED_DIR, 'bible_metadata.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"\n=== Bible Metadata ===")
    print(f"Total books: {len(books_meta)}")
    print(f"Total chapters: {global_index}")
    print(f"Total verses: {total_verses:,}")
    print(f"OT chapters: {ot_chapters}")
    print(f"NT chapters: {nt_chapters}")
    print(f"\nSaved to {output_path}")

    # Validate against known totals
    if global_index != 1189:
        print(f"WARNING: Expected 1189 chapters, got {global_index}")
    if total_verses != 31102:
        print(f"WARNING: Expected 31102 verses, got {total_verses}")


if __name__ == '__main__':
    main()
