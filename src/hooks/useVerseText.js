import { useEffect, useCallback } from 'react';
import useAppStore from '../stores/useAppStore';

export default function useVerseText() {
  const verseText = useAppStore((s) => s.verseText);
  const verseTextLoading = useAppStore((s) => s.verseTextLoading);
  const loadVerseText = useAppStore((s) => s.loadVerseText);

  const getText = useCallback((bookAbbrev, chapter, verse) => {
    if (!verseText) return null;
    const book = verseText[bookAbbrev];
    if (!book) return null;
    const ch = book[String(chapter)];
    if (!ch) return null;
    if (verse) {
      return ch[String(verse)] || null;
    }
    // Return first verse as preview if no specific verse
    const firstKey = Object.keys(ch)[0];
    return firstKey ? ch[firstKey] : null;
  }, [verseText]);

  const ensureLoaded = useCallback(() => {
    if (!verseText && !verseTextLoading) {
      loadVerseText();
    }
  }, [verseText, verseTextLoading, loadVerseText]);

  return { getText, loading: verseTextLoading, loaded: !!verseText, ensureLoaded };
}
