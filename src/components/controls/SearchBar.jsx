import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import useAppStore from '../../stores/useAppStore';

export default function SearchBar() {
  const metadata = useAppStore((s) => s.metadata);
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Build search index from metadata
  const searchIndex = useMemo(() => {
    if (!metadata) return [];
    const entries = [];
    for (const book of metadata.books) {
      // Create entries for each chapter
      for (const ch of book.chapterDetails) {
        entries.push({
          label: `${book.name} ${ch.chapter}`,
          shortLabel: `${book.abbrev} ${ch.chapter}`,
          bookName: book.name.toLowerCase(),
          bookAbbrev: book.abbrev.toLowerCase(),
          chapter: ch.chapter,
          globalIndex: ch.globalIndex,
        });
      }
    }
    return entries;
  }, [metadata]);

  const suggestions = useMemo(() => {
    if (!query.trim() || !searchIndex.length) return [];

    const q = query.trim().toLowerCase();

    // Parse query: "Book Chapter:Verse" or "Book Chapter" or just "Book"
    const match = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    const bookQuery = match ? match[1] : q;
    const chapterQuery = match ? parseInt(match[2]) : null;
    const verseQuery = match && match[3] ? parseInt(match[3]) : null;

    // Find matching books
    const results = [];
    const seen = new Set();

    for (const entry of searchIndex) {
      const bookMatch =
        entry.bookName.startsWith(bookQuery) ||
        entry.bookAbbrev.startsWith(bookQuery) ||
        entry.bookName.includes(bookQuery);

      if (!bookMatch) continue;

      if (chapterQuery !== null) {
        if (entry.chapter === chapterQuery) {
          // Find verse count for this chapter to validate verse number
          const book = metadata.books.find(b => b.name.toLowerCase() === entry.bookName);
          const chDetail = book?.chapterDetails.find(c => c.chapter === chapterQuery);
          const maxVerse = chDetail?.verses || 999;
          const validVerse = verseQuery && verseQuery >= 1 && verseQuery <= maxVerse ? verseQuery : null;

          results.push({
            ...entry,
            verse: validVerse || verseQuery,
            label: verseQuery ? `${entry.label}:${verseQuery}` : entry.label,
            shortLabel: verseQuery ? `${entry.shortLabel}:${verseQuery}` : entry.shortLabel,
          });
        }
      } else {
        const bookKey = entry.bookName;
        if (!seen.has(bookKey)) {
          seen.add(bookKey);
          results.push(entry);
        }
      }

      if (results.length >= 8) break;
    }

    return results;
  }, [query, searchIndex, metadata]);

  const handleSelect = useCallback((entry) => {
    setSelectedChapter(entry.globalIndex, entry.verse || null);
    setQuery(entry.label);
    setShowDropdown(false);
  }, [setSelectedChapter]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [suggestions, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!metadata) return null;

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.label}>Search</div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. John 3:16, Gen 1..."
        style={styles.input}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={styles.dropdown}>
          {suggestions.map((entry) => (
            <button
              key={entry.globalIndex}
              onClick={() => handleSelect(entry)}
              style={styles.suggestion}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span style={styles.suggestionLabel}>{entry.label}</span>
              <span style={styles.suggestionAbbrev}>{entry.shortLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '5px 8px',
    fontSize: 12,
    border: '1px solid var(--border)',
    borderRadius: 4,
    backgroundColor: 'var(--button-bg)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '100%',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    boxShadow: '0 4px 12px var(--shadow)',
    zIndex: 100,
    maxHeight: 240,
    overflowY: 'auto',
  },
  suggestion: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    border: 'none',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  suggestionLabel: {
    fontWeight: 500,
  },
  suggestionAbbrev: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
};
