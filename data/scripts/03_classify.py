"""
Step 3: Classify cross-references into 5 tiers.

Three-pass classification:
  Pass 1: Vote score bands (prior)
  Pass 2: Formula detection (Tier 1 & 2)
  Pass 3: Textual overlap analysis (Tier 3, 4, 5)

Output:
  - data/processed/references_classified.csv
  - data/processed/classification_stats.json
"""

import os
import json
import pandas as pd
from config import (
    QUOTATION_FORMULAS, FULFILLMENT_FORMULAS,
    BOOK_BY_NUM,
)
from text_utils import (
    tokenize_and_filter, compute_jaccard,
    count_shared_theological_terms, has_proper_noun_overlap,
)

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')


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


def pass1_vote_score(df):
    """Pass 1: Assign vote bands as priors."""
    print("  Pass 1: Vote score bands...")
    conditions = [
        df['votes'] >= 50,
        (df['votes'] >= 10) & (df['votes'] < 50),
        df['votes'] < 10,
    ]
    labels = ['high', 'medium', 'low']
    df['vote_band'] = pd.np.select(conditions, labels, default='low') if hasattr(pd, 'np') else 'low'

    # Use numpy directly
    import numpy as np
    df['vote_band'] = np.select(conditions, labels, default='low')

    print(f"    High ({'>'}=50 votes): {(df['vote_band'] == 'high').sum():,}")
    print(f"    Medium (10-49 votes): {(df['vote_band'] == 'medium').sum():,}")
    print(f"    Low (<10 votes): {(df['vote_band'] == 'low').sum():,}")
    return df


def pass2_formula_detection(df, bible_text):
    """Pass 2: Detect quotation and fulfillment formulas for Tier 1 and 2."""
    print("  Pass 2: Formula detection...")

    tier_assignments = {}
    tier1_count = 0
    tier2_count = 0

    for idx, row in df.iterrows():
        from_text = get_verse_text(
            bible_text, row['from_book'], row['from_chapter'], row['from_verse']
        ).lower()

        if not from_text:
            continue

        # Check Tier 1: Quotation formulas
        is_quotation = False
        for formula in QUOTATION_FORMULAS:
            if formula in from_text:
                # Verify textual overlap with target verse
                to_text = get_verse_text(
                    bible_text, row['to_book'], row['to_chapter'], row['to_verse']
                )
                if to_text:
                    from_tokens = tokenize_and_filter(from_text)
                    to_tokens = tokenize_and_filter(to_text.lower())
                    shared = len(set(from_tokens) & set(to_tokens))
                    if shared >= 3:
                        tier_assignments[idx] = 1
                        tier1_count += 1
                        is_quotation = True
                        break

        if is_quotation:
            continue

        # Check Tier 2: Fulfillment formulas
        for formula in FULFILLMENT_FORMULAS:
            if formula in from_text:
                tier_assignments[idx] = 2
                tier2_count += 1
                break

    # Apply assignments
    for idx, tier in tier_assignments.items():
        df.at[idx, 'tier'] = tier

    print(f"    Tier 1 (Direct Quotation): {tier1_count:,}")
    print(f"    Tier 2 (Allusion/Fulfillment): {tier2_count:,}")
    return df


def pass3_textual_overlap(df, bible_text):
    """Pass 3: Classify remaining references by textual similarity."""
    print("  Pass 3: Textual overlap analysis...")

    unclassified = df[df['tier'] == 0].index
    print(f"    Analyzing {len(unclassified):,} unclassified references...")

    tier3_count = 0
    tier4_count = 0
    tier5_count = 0
    batch_size = 10000

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
            continue

        from_tokens = tokenize_and_filter(from_text.lower())
        to_tokens = tokenize_and_filter(to_text.lower())

        jaccard = compute_jaccard(from_tokens, to_tokens)
        proper_overlap, shared_names = has_proper_noun_overlap(from_text, to_text, min_shared=2)
        theological_shared = count_shared_theological_terms(from_tokens, to_tokens)

        # Tier 3: High textual overlap + shared proper nouns
        if jaccard >= 0.35 and proper_overlap:
            df.at[idx, 'tier'] = 3
            tier3_count += 1
        elif jaccard >= 0.45:
            df.at[idx, 'tier'] = 3
            tier3_count += 1
        # Tier 4: Medium overlap or theological terms
        elif jaccard >= 0.15 or (theological_shared >= 2 and row['vote_band'] != 'low'):
            df.at[idx, 'tier'] = 4
            tier4_count += 1
        elif row['vote_band'] == 'high' and theological_shared >= 1:
            df.at[idx, 'tier'] = 4
            tier4_count += 1
        # Tier 5: Everything else
        else:
            df.at[idx, 'tier'] = 5
            tier5_count += 1

    print(f"    Tier 3 (Parallel Passage): {tier3_count:,}")
    print(f"    Tier 4 (Thematic Echo): {tier4_count:,}")
    print(f"    Tier 5 (Shared Vocabulary): {tier5_count:,}")
    return df


def main():
    print("Step 3: Classifying cross-references")
    print()

    refs_df, bible_text = load_data()
    if refs_df is None:
        return

    # Initialize tier column
    refs_df['tier'] = 0

    print(f"Total references to classify: {len(refs_df):,}")
    print()

    # Run three passes
    refs_df = pass1_vote_score(refs_df)
    print()
    refs_df = pass2_formula_detection(refs_df, bible_text)
    print()
    refs_df = pass3_textual_overlap(refs_df, bible_text)
    print()

    # Save classified references
    output_path = os.path.join(PROCESSED_DIR, 'references_classified.csv')
    refs_df.to_csv(output_path, index=False)
    print(f"Saved classified references to {output_path}")

    # Generate stats
    stats = {
        "total": len(refs_df),
        "by_tier": {},
        "cross_testament": int(refs_df['is_cross_testament'].sum()),
    }

    for tier in range(1, 6):
        count = int((refs_df['tier'] == tier).sum())
        stats["by_tier"][str(tier)] = count

    stats_path = os.path.join(PROCESSED_DIR, 'classification_stats.json')
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)

    print(f"\n=== Classification Results ===")
    for tier in range(1, 6):
        count = stats["by_tier"][str(tier)]
        pct = count / len(refs_df) * 100
        print(f"  Tier {tier}: {count:>8,} ({pct:.1f}%)")
    print(f"  Cross-testament: {stats['cross_testament']:,}")


if __name__ == '__main__':
    main()
