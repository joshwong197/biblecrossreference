import { BOOKS } from '../constants/books';
import { CHAPTER_COUNTS } from '../constants/chapterCounts';

const slugToBook = new Map();
const nameToBook = new Map();
const numToBook = new Map();

for (const book of BOOKS) {
  slugToBook.set(book.abbrev.toLowerCase(), book);
  nameToBook.set(book.name.toLowerCase(), book);
  numToBook.set(book.num, book);
}

/** Canonical route slug for a book (lowercase abbrev). */
export function bookSlug(book) {
  return book.abbrev.toLowerCase();
}

/**
 * Resolve a route param (lowercase abbrev, any-case abbrev, or full name) to a
 * book record from books.js. Returns null if nothing matches.
 */
export function resolveBook(param) {
  if (!param) return null;
  const key = decodeURIComponent(String(param)).toLowerCase().trim();
  return slugToBook.get(key) || nameToBook.get(key) || null;
}

/** Number of chapters in a book, by abbrev. */
export function chapterCount(abbrev) {
  return CHAPTER_COUNTS[abbrev] || 1;
}

export function bookByNum(num) {
  return numToBook.get(num) || null;
}

/**
 * Given a book + chapter, compute the previous chapter's {book, chapter},
 * crossing book boundaries at the edges. Returns null at the very start/end
 * of the canon.
 */
export function prevChapterOf(book, chapter) {
  if (chapter > 1) return { book, chapter: chapter - 1 };
  const prevBook = numToBook.get(book.num - 1);
  if (!prevBook) return null;
  return { book: prevBook, chapter: chapterCount(prevBook.abbrev) };
}

export function nextChapterOf(book, chapter) {
  const count = chapterCount(book.abbrev);
  if (chapter < count) return { book, chapter: chapter + 1 };
  const nextBook = numToBook.get(book.num + 1);
  if (!nextBook) return null;
  return { book: nextBook, chapter: 1 };
}

/** Parse a shard cross-ref target like "Rom.5.8" into its parts. */
export function parseTargetRef(ref) {
  const parts = ref.split('.');
  if (parts.length !== 3) return null;
  const [abbrev, chapter, verse] = parts;
  const book = slugToBook.get(abbrev.toLowerCase());
  if (!book) return null;
  return { book, abbrev, chapter: Number(chapter), verse: Number(verse) };
}
