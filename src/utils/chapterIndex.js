import { BOOKS } from '../constants/books';
import { CHAPTER_COUNTS } from '../constants/chapterCounts';

/**
 * Cumulative chapter offset per book — the 0-based globalIndex of that
 * book's chapter 1. bible_metadata.json's chapterDetails[].globalIndex is
 * 0-based and this table matches it exactly for all 1189 chapters:
 * Genesis 1 -> 0, Matthew 1 -> 929, Revelation 22 -> 1188.
 */
const BOOK_OFFSET = new Map();
let running = 0;
for (const book of BOOKS) {
  BOOK_OFFSET.set(book.num, running);
  running += CHAPTER_COUNTS[book.abbrev] || 1;
}

/**
 * Given a book record (from books.js/bookSlug.js) and a 1-based chapter
 * number, return the 0-based globalIndex used by the viz layer (ArcDiagram,
 * GlobeView, GridView, bible_metadata.json). Returns null if the book isn't
 * recognized.
 */
export function chapterGlobalIndex(book, chapter) {
  const offset = BOOK_OFFSET.get(book.num);
  if (offset === undefined) return null;
  return offset + (chapter - 1);
}
