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


# Dashes joined when they appear INSIDE a word. The Cambridge KJV text uses
# an EN-DASH (U+2013) inside compound proper names ("Beth-lehem" is printed
# "Beth–lehem"); ~2,380 verses contain them. Joining makes
# "beth–lehem" tokenize identically to "bethlehem" so intra-word dash
# variants match in both token-overlap and verbatim-run comparisons.
_INTRA_WORD_DASH_RE = re.compile(r'(?<=\w)[–—‐‑-](?=\w)')


def tokenize(text):
    """
    Simple word tokenizer for KJV English text.
    Lowercases, joins intra-word dashes/hyphens (en-dash compound names like
    "Beth–lehem" -> "bethlehem"), removes punctuation, splits on
    whitespace. Used by both tokenize_and_filter and the verbatim-run path,
    so the dash normalization applies to both.
    """
    text = text.lower()
    text = _INTRA_WORD_DASH_RE.sub('', text)
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


def longest_common_run(words_a, words_b):
    """
    Length of the longest common CONTIGUOUS run of words between two word
    sequences (longest common substring at word level).

    Intended for verbatim-quotation detection: pass lightly normalized raw
    words (lowercased, punctuation stripped, stop words KEPT -- quotations
    are verbatim runs like "the just shall live by faith", which is mostly
    stop words).

    Uses a positions-index scan; O(len_a * occurrences) which is fast for
    verse-sized inputs. Returns 0 if either sequence is empty.
    """
    if not words_a or not words_b:
        return 0
    # index positions of each word in b
    positions = {}
    for j, w in enumerate(words_b):
        positions.setdefault(w, []).append(j)

    best = 0
    len_a, len_b = len(words_a), len(words_b)
    for i, w in enumerate(words_a):
        if len_a - i <= best:
            break  # cannot beat current best from here
        if w not in positions:
            continue
        # skip starts that are mid-run continuations of a run already scanned
        if i > 0:
            prev_a = words_a[i - 1]
        else:
            prev_a = None
        for j in positions[w]:
            if prev_a is not None and j > 0 and words_b[j - 1] == prev_a:
                continue  # covered by the run starting one word earlier
            k = 0
            while i + k < len_a and j + k < len_b and words_a[i + k] == words_b[j + k]:
                k += 1
            if k > best:
                best = k
    return best


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
