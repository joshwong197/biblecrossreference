import { useEffect, useState } from 'react';
import { loadBookText } from '../utils/readerCache';
import { parseTargetRef } from '../utils/bookSlug';

/**
 * Given a shard cross-ref target like "Rom.5.8", lazily fetches that book's
 * text shard (cached) and resolves the verse string. Returns null while
 * loading or if the ref can't be parsed/found.
 *
 * Result is keyed by the ref it was resolved for, so a stale value is never
 * shown for a different ref (checked at read time, not via a resetting
 * setState call in the effect body).
 */
export function useTargetVerse(ref) {
  const [result, setResult] = useState(() => ({ ref: null, text: null }));

  useEffect(() => {
    const parsed = parseTargetRef(ref);
    if (!parsed) return undefined;
    let cancelled = false;

    loadBookText(parsed.abbrev)
      .then((bookText) => {
        if (cancelled) return;
        const chapterObj = bookText[String(parsed.chapter)];
        setResult({ ref, text: chapterObj ? chapterObj[String(parsed.verse)] || null : null });
      })
      .catch(() => {
        if (!cancelled) setResult({ ref, text: null });
      });

    return () => { cancelled = true; };
  }, [ref]);

  return result.ref === ref ? result.text : null;
}
