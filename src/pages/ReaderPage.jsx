import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { resolveBook, bookSlug, chapterCount } from '../utils/bookSlug';
import { useReaderBook } from '../hooks/useReaderBook';
import { setLastRead } from '../utils/readerHistory';
import useAppStore from '../stores/useAppStore';
import ChapterNav from '../components/reader/ChapterNav';
import BookChapterPicker from '../components/reader/BookChapterPicker';
import TierFilterPills from '../components/reader/TierFilterPills';
import RefLine from '../components/reader/RefLine';
import RefFullList from '../components/reader/RefFullList';
import BookArtBanner from '../components/reader/BookArtBanner';
import '../reader.css';

export default function ReaderPage() {
  const { book: bookParam, chapter: chapterParam } = useParams();
  const [searchParams] = useSearchParams();
  const book = resolveBook(bookParam);

  if (!book) {
    return <Navigate to="/read/john/1" replace />;
  }

  const canonicalSlug = bookSlug(book);
  const chapterNum = Number(chapterParam);
  const maxChapter = chapterCount(book.abbrev);
  const validChapter = Number.isInteger(chapterNum) && chapterNum >= 1 && chapterNum <= maxChapter;

  if (bookParam !== canonicalSlug || !validChapter) {
    return <Navigate to={`/read/${canonicalSlug}/${validChapter ? chapterNum : 1}`} replace />;
  }

  // Keyed by book+chapter so React remounts (and resets local UI state like
  // the open preview/full-list) on navigation instead of needing an effect
  // that calls setState synchronously to reset it.
  return (
    <ReaderChapter
      key={`${canonicalSlug}-${chapterNum}`}
      book={book}
      chapter={chapterNum}
      highlightVerse={searchParams.get('v')}
    />
  );
}

function ReaderChapter({ book, chapter, highlightVerse }) {
  const { text, refs, loading, error } = useReaderBook(book.abbrev);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openPreview, setOpenPreview] = useState(null); // { verseNum, entry }
  const [openFullListVerse, setOpenFullListVerse] = useState(null);

  // Persist last-read location for the /read redirect.
  useEffect(() => {
    if (!loading && !error) {
      setLastRead(bookSlug(book), chapter);
    }
  }, [book, chapter, loading, error]);

  // Scroll to + gently highlight the ?v= verse. Highlight is applied
  // directly to the DOM node (an "external system") rather than via React
  // state, so this effect never calls setState.
  useEffect(() => {
    if (loading || !highlightVerse) return undefined;
    const el = document.getElementById(`verse-${chapter}-${highlightVerse}`);
    if (!el) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.setAttribute('data-highlight', 'true');
    // Matches the 2.5s CSS fade (reader.css); reduced-motion users get a
    // static tint that this timer clears instead of an animated fade.
    const timer = setTimeout(() => el.setAttribute('data-highlight', 'false'), 2600);
    return () => {
      clearTimeout(timer);
      el.setAttribute('data-highlight', 'false');
    };
  }, [loading, highlightVerse, chapter]);

  const verses = useMemo(() => {
    if (!text) return [];
    const chapterObj = text[String(chapter)];
    if (!chapterObj) return [];
    return Object.keys(chapterObj)
      .map(Number)
      .sort((a, b) => a - b)
      .map((num) => ({ num, text: chapterObj[String(num)] }));
  }, [text, chapter]);

  if (loading) {
    return (
      <div className="reader-page">
        <div className="reader-page__inner">
          <p style={{ color: 'var(--ink-2)', padding: '24px 0' }}>Loading {book.name} {chapter}&hellip;</p>
        </div>
      </div>
    );
  }

  if (error || verses.length === 0) {
    return (
      <div className="reader-page">
        <div className="reader-page__inner">
          <p style={{ color: 'var(--ink-2)', padding: '24px 0' }}>Couldn&rsquo;t load {book.name} {chapter}.</p>
        </div>
      </div>
    );
  }

  const fullListVerse = verses.find((v) => v.num === openFullListVerse) || null;
  const fullListEntries = fullListVerse
    ? (refs[`${chapter}:${fullListVerse.num}`] || []).filter(([, tier]) => tierVisibility[tier])
    : [];

  return (
    <div className="reader-page">
      <TierFilterPills />
      <div className="reader-page__inner">
        <div className="reader-chapter-header">
          <BookArtBanner abbrev={book.abbrev} />
          <div className="reader-chapter-header__content">
            <ChapterNav book={book} chapter={chapter} onOpenPicker={() => setPickerOpen(true)} />
            <div className="reader-chapter-numeral">{chapter}</div>
          </div>
        </div>
        <div className="reader-verse-flow">
          {verses.map((verse) => {
            const entries = refs[`${chapter}:${verse.num}`] || [];
            return (
              <div
                key={verse.num}
                id={`verse-${chapter}-${verse.num}`}
                className="reader-verse"
                data-highlight="false"
              >
                <span>
                  <span className="reader-verse__num">{verse.num}</span>
                  <span className="reader-verse__text">{verse.text}</span>
                </span>
                <RefLine
                  entries={entries}
                  tierVisibility={tierVisibility}
                  openEntry={openPreview && openPreview.verseNum === verse.num ? openPreview.entry : null}
                  onToggle={(entry) =>
                    setOpenPreview((prev) =>
                      prev && prev.verseNum === verse.num && prev.entry === entry
                        ? null
                        : { verseNum: verse.num, entry })
                  }
                  onOpenFullList={() => setOpenFullListVerse(verse.num)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {fullListVerse && (
        <RefFullList
          entries={fullListEntries}
          verseLabel={`${book.name} ${chapter}:${fullListVerse.num}`}
          onClose={() => setOpenFullListVerse(null)}
          onSelectEntry={(entry) => {
            setOpenFullListVerse(null);
            setOpenPreview({ verseNum: fullListVerse.num, entry });
          }}
        />
      )}

      {pickerOpen && <BookChapterPicker currentBook={book} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
