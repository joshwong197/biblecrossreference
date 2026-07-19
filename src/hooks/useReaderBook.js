import { useEffect, useState } from 'react';
import { loadBookText, loadBookRefs } from '../utils/readerCache';

/**
 * Loads the text + refs shards for one book (two fetches, cached at module
 * level so switching chapters within a book or returning to it is free).
 * Intentionally does NOT touch the viz useDataLoader gate.
 *
 * `loading` is derived by comparing the settled result's abbrev against the
 * requested one, rather than tracked with its own setState call, so the
 * effect only ever calls setState from inside the async completion
 * (satisfies react-hooks/set-state-in-effect).
 */
export function useReaderBook(abbrev) {
  const [result, setResult] = useState(() => ({ abbrev: null, text: null, refs: null, error: null }));

  useEffect(() => {
    if (!abbrev) return undefined;
    let cancelled = false;

    Promise.all([loadBookText(abbrev), loadBookRefs(abbrev)])
      .then(([text, refs]) => {
        if (!cancelled) setResult({ abbrev, text, refs, error: null });
      })
      .catch((error) => {
        if (!cancelled) setResult({ abbrev, text: null, refs: null, error });
      });

    return () => { cancelled = true; };
  }, [abbrev]);

  const loading = result.abbrev !== abbrev;
  return {
    text: loading ? null : result.text,
    refs: loading ? null : result.refs,
    error: loading ? null : result.error,
    loading,
  };
}
