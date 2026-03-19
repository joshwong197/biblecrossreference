"""
Step 1: Download and parse cross-reference data and Bible text.

Downloads:
  - Cross-references from OpenBible.info
  - KJV Bible text from scrollmapper/bible_databases

Output:
  - data/raw/cross_references.txt
  - data/raw/t_kjv.csv
"""

import os
import io
import zipfile
import requests
import pandas as pd
import re
from config import ABBREV_TO_NUM, BOOK_BY_NUM

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')

CROSS_REF_URL = "https://a.openbible.info/data/cross-references.zip"
KJV_URL = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/KJV.csv"


def download_file(url, dest_path, desc="file"):
    """Download a file if it doesn't already exist."""
    if os.path.exists(dest_path):
        print(f"  Already exists: {dest_path}")
        return
    print(f"  Downloading {desc}...")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, 'wb') as f:
        f.write(resp.content)
    print(f"  Saved to {dest_path} ({len(resp.content):,} bytes)")


def download_cross_references():
    """Download and extract cross-references from OpenBible.info."""
    zip_path = os.path.join(RAW_DIR, 'cross-references.zip')
    txt_path = os.path.join(RAW_DIR, 'cross_references.txt')

    if os.path.exists(txt_path):
        print("  Cross-references already extracted.")
        return txt_path

    download_file(CROSS_REF_URL, zip_path, "cross-references")

    print("  Extracting ZIP...")
    with zipfile.ZipFile(zip_path, 'r') as zf:
        # Find the main data file in the zip
        names = zf.namelist()
        data_file = None
        for name in names:
            if name.endswith('.txt') or name.endswith('.csv'):
                data_file = name
                break
        if data_file is None:
            data_file = names[0]

        with zf.open(data_file) as src, open(txt_path, 'wb') as dst:
            dst.write(src.read())

    print(f"  Extracted to {txt_path}")
    return txt_path


def download_kjv():
    """Download KJV Bible text from scrollmapper."""
    csv_path = os.path.join(RAW_DIR, 'KJV.csv')
    download_file(KJV_URL, csv_path, "KJV Bible text")
    return csv_path


def parse_verse_ref(ref_str):
    """
    Parse a verse reference like 'Gen.1.1' or 'Matt.4.4' into
    (book_num, chapter, verse).
    """
    ref_str = ref_str.strip()

    # Handle formats like "Gen.1.1", "1Sam.1.1", "Song.1.1"
    parts = ref_str.split('.')
    if len(parts) >= 3:
        # Book name might contain dots (unlikely) or be multi-part
        book_str = parts[0]
        try:
            chapter = int(parts[1])
            verse = int(parts[2])
        except ValueError:
            return None

        book_num = ABBREV_TO_NUM.get(book_str.lower())
        if book_num is None:
            # Try common variations
            for key, num in ABBREV_TO_NUM.items():
                if key.startswith(book_str.lower()):
                    book_num = num
                    break

        if book_num is not None:
            return (book_num, chapter, verse)

    return None


def parse_cross_references(txt_path):
    """
    Parse the OpenBible cross-references file.
    Format: 'From Verse\tTo Verse\tVotes'
    """
    print("  Parsing cross-references...")
    records = []

    with open(txt_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f):
            line = line.strip()

            # Skip headers and comments
            if not line or line.startswith('#') or line.startswith('From'):
                continue

            parts = line.split('\t')
            if len(parts) < 3:
                continue

            from_ref_str = parts[0].strip()
            to_ref_str = parts[1].strip()
            try:
                votes = int(parts[2].strip())
            except ValueError:
                votes = 0

            # Handle verse ranges in "to" (e.g., "Gen.1.1-Gen.1.3")
            to_parts = to_ref_str.split('-')
            to_ref_str_start = to_parts[0]

            from_parsed = parse_verse_ref(from_ref_str)
            to_parsed = parse_verse_ref(to_ref_str_start)

            if from_parsed is None or to_parsed is None:
                continue

            from_book, from_ch, from_vs = from_parsed
            to_book, to_ch, to_vs = to_parsed

            from_testament = BOOK_BY_NUM[from_book]["testament"]
            to_testament = BOOK_BY_NUM[to_book]["testament"]

            records.append({
                "from_ref": from_ref_str,
                "to_ref": to_ref_str,
                "votes": votes,
                "from_book": from_book,
                "from_chapter": from_ch,
                "from_verse": from_vs,
                "to_book": to_book,
                "to_chapter": to_ch,
                "to_verse": to_vs,
                "from_testament": from_testament,
                "to_testament": to_testament,
                "is_cross_testament": from_testament != to_testament,
            })

    df = pd.DataFrame(records)
    print(f"  Parsed {len(df):,} cross-references")
    return df


def parse_kjv(csv_path):
    """Parse the KJV Bible text CSV into a structured format."""
    print("  Parsing KJV text...")
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]

    # Detect column format — scrollmapper uses different column names across versions
    # Possible formats: (id, b, c, v, t) or (Book, Chapter, Verse, Text)
    col_map = {}
    cols_lower = {c.lower(): c for c in df.columns}
    if 'b' in cols_lower:
        col_map = {'book': cols_lower['b'], 'chapter': cols_lower['c'], 'verse': cols_lower['v'], 'text': cols_lower['t']}
    elif 'book' in cols_lower:
        col_map = {'book': cols_lower['book'], 'chapter': cols_lower['chapter'], 'verse': cols_lower['verse'], 'text': cols_lower['text']}
    else:
        # Try positional: assume id, book, chapter, verse, text or book, chapter, verse, text
        ncols = len(df.columns)
        if ncols >= 5:
            col_map = {'book': df.columns[1], 'chapter': df.columns[2], 'verse': df.columns[3], 'text': df.columns[4]}
        elif ncols >= 4:
            col_map = {'book': df.columns[0], 'chapter': df.columns[1], 'verse': df.columns[2], 'text': df.columns[3]}
        else:
            print(f"  ERROR: Unexpected columns: {list(df.columns)}")
            return {}, df

    print(f"  Detected columns: {col_map}")

    # Build a dictionary keyed by "book.chapter.verse"
    bible_text = {}
    for _, row in df.iterrows():
        book_raw = row[col_map['book']]
        # Handle both numeric and string book identifiers
        try:
            book_num = int(book_raw)
        except (ValueError, TypeError):
            # Book is a name string — look it up
            book_num = ABBREV_TO_NUM.get(str(book_raw).lower().strip())
            if book_num is None:
                continue
        chapter = int(row[col_map['chapter']])
        verse = int(row[col_map['verse']])
        text = str(row[col_map['text']]).strip()
        key = f"{book_num}.{chapter}.{verse}"
        bible_text[key] = text

    print(f"  Parsed {len(bible_text):,} verses")
    return bible_text, df


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    print("Step 1: Downloading data sources")
    print()

    print("[1/4] Cross-reference data")
    txt_path = download_cross_references()

    print("[2/4] KJV Bible text")
    kjv_path = download_kjv()

    print("[3/4] Parsing cross-references")
    refs_df = parse_cross_references(txt_path)

    print("[4/4] Parsing KJV text")
    bible_text, kjv_df = parse_kjv(kjv_path)

    # Save processed data
    refs_output = os.path.join(PROCESSED_DIR, 'references_clean.csv')
    refs_df.to_csv(refs_output, index=False)
    print(f"\nSaved clean references to {refs_output}")

    # Save Bible text as JSON for quick lookup
    import json
    text_output = os.path.join(PROCESSED_DIR, 'bible_text.json')
    with open(text_output, 'w', encoding='utf-8') as f:
        json.dump(bible_text, f)
    print(f"Saved Bible text to {text_output}")

    # Summary
    print(f"\n=== Summary ===")
    print(f"Total cross-references: {len(refs_df):,}")
    print(f"Total Bible verses: {len(bible_text):,}")
    print(f"Unique from-books: {refs_df['from_book'].nunique()}")
    print(f"Unique to-books: {refs_df['to_book'].nunique()}")
    print(f"Cross-testament refs: {refs_df['is_cross_testament'].sum():,}")
    print(f"Vote range: {refs_df['votes'].min()} to {refs_df['votes'].max()}")
    print(f"Mean votes: {refs_df['votes'].mean():.1f}")


if __name__ == '__main__':
    main()
