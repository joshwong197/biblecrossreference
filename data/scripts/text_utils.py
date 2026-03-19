"""
Text processing utilities for cross-reference classification.

Provides tokenization, stop word removal, and similarity computation
for KJV English text.
"""

import re
import string
from config import KJV_STOP_WORDS, THEOLOGICAL_TERMS

# Standard English stop words (minimal set to complement KJV-specific ones)
ENGLISH_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "is", "was", "are", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must",
    "it", "its", "he", "him", "his", "she", "her", "they", "them",
    "their", "we", "us", "our", "you", "your", "i", "me", "my",
    "this", "that", "these", "those", "which", "who", "whom",
    "what", "when", "where", "how", "not", "no", "nor",
    "if", "then", "than", "so", "as", "into", "out", "up",
    "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "only", "own", "same", "too",
    "very", "just", "because", "about", "after", "before",
    "between", "through", "during", "above", "below",
    "again", "further", "there", "here", "once",
}

ALL_STOP_WORDS = ENGLISH_STOP_WORDS | KJV_STOP_WORDS


def tokenize(text):
    """
    Simple word tokenizer for KJV English text.
    Lowercases, removes punctuation, splits on whitespace.
    """
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    return text.split()


def tokenize_and_filter(text):
    """Tokenize and remove stop words."""
    tokens = tokenize(text)
    return [t for t in tokens if t not in ALL_STOP_WORDS and len(t) > 1]


def compute_jaccard(tokens_a, tokens_b):
    """Compute Jaccard similarity between two token sets."""
    set_a = set(tokens_a)
    set_b = set(tokens_b)
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def count_shared_content_words(tokens_a, tokens_b):
    """Count words shared between two token lists."""
    return len(set(tokens_a) & set(tokens_b))


def count_shared_theological_terms(tokens_a, tokens_b):
    """Count theological vocabulary shared between two token lists."""
    return len(set(tokens_a) & set(tokens_b) & THEOLOGICAL_TERMS)


def has_proper_noun_overlap(text_a, text_b, min_shared=2):
    """
    Detect shared proper nouns between two texts.
    Uses capitalization in original text (before lowercasing) as a heuristic.
    """
    def extract_capitalized(text):
        # Find words that start with uppercase (potential proper nouns)
        words = re.findall(r'\b[A-Z][a-z]{2,}\b', text)
        # Filter out common sentence starters
        return set(w.lower() for w in words)

    proper_a = extract_capitalized(text_a)
    proper_b = extract_capitalized(text_b)
    shared = proper_a & proper_b

    # Remove common non-proper-noun capitalized words
    common_false_positives = {"the", "and", "for", "but", "not", "shall", "lord", "god"}
    shared -= common_false_positives

    return len(shared) >= min_shared, shared
