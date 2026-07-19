import { useCallback, useEffect, useState } from 'react';
import { loadBookText } from '../utils/readerCache';

/**
 * Verse text for one book, loaded lazily from the per-book text shard
 * (shares readerCache with the Reader, so nothing is fetched twice).
 */
export default function useVerseText(bookAbbrev) {
  // Keyed by abbrev so stale state is derived away, not reset in the effect
  const [loadedBook, setLoadedBook] = useState({ abbrev: null, data: null });

  useEffect(() => {
    if (!bookAbbrev) return undefined;
    let cancelled = false;
    loadBookText(bookAbbrev)
      .then((data) => {
        if (!cancelled) setLoadedBook({ abbrev: bookAbbrev, data });
      })
      .catch(() => {
        if (!cancelled) setLoadedBook({ abbrev: bookAbbrev, data: null });
      });
    return () => { cancelled = true; };
  }, [bookAbbrev]);

  const book = loadedBook.abbrev === bookAbbrev ? loadedBook.data : null;
  const loading = !!bookAbbrev && loadedBook.abbrev !== bookAbbrev;

  const getText = useCallback((chapter, verse) => {
    const ch = book?.[String(chapter)];
    if (!ch) return null;
    if (verse) return ch[String(verse)] || null;
    const firstKey = Object.keys(ch)[0];
    return firstKey ? ch[firstKey] : null;
  }, [book]);

  return { getText, loading, loaded: !!book };
}
