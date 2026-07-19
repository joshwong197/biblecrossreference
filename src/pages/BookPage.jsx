import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { resolveBook, bookSlug } from '../utils/bookSlug';
import { useArtImage } from '../hooks/useArtImage';
import { loadBookRefs } from '../utils/readerCache';
import { BOOKS } from '../constants/books';
import bookIntros from '../data/bookIntros.json';
import '../about.css';

const METADATA_URL = '/data/bible_metadata.json';
const MATRIX_URL = '/data/book_matrix.json';

/**
 * Book About page (/book/:slug) — "register 3" (document typography, like
 * AboutPage) for a single book: optional hero art, name, commentary-style
 * intro prose (from src/data/bookIntros.json, filled in independently — see
 * the defensive lookups below), and data sections computed live from the
 * classified dataset (top verses, quotation partners). Counts, not claims.
 */
export default function BookPage() {
  const { slug } = useParams();
  const book = resolveBook(slug);
  const [metadata, setMetadata] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(METADATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setMetadata(data);
      })
      .catch(() => {
        /* Stats line just won't render — nothing else on the page depends on it. */
      });
    fetch(MATRIX_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setMatrix(data);
      })
      .catch(() => { /* partners section just won't render */ });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!book) return undefined;
    let cancelled = false;
    const { abbrev } = book;
    loadBookRefs(abbrev)
      .then((shard) => {
        if (!cancelled) setRefs({ abbrev, shard });
      })
      .catch(() => { /* top-verses section just won't render */ });
    return () => {
      cancelled = true;
    };
  }, [book]);

  // Hooks must run unconditionally before any early return, so resolve art
  // for whatever abbrev we have (possibly undefined pre-redirect) — the
  // hook itself no-ops when abbrev is falsy.
  const fullArt = useArtImage(book?.abbrev, '-full');
  const bannerArt = useArtImage(book?.abbrev, '');

  // Top 5 most-connected verses in this book (all visible tiers, post-dedupe).
  const topVerses = useMemo(() => {
    if (!refs || !book || refs.abbrev !== book.abbrev) return [];
    return Object.entries(refs.shard)
      .map(([key, entries]) => {
        const [chapter, verse] = key.split(':').map(Number);
        return { chapter, verse, count: entries.length };
      })
      .sort((a, b) => b.count - a.count || a.chapter - b.chapter || a.verse - b.verse)
      .slice(0, 5);
  }, [refs, book]);

  // Directed quotation partners from book_matrix.json (tiers 1–2,
  // row quotes column, 0-based canonical book indices) plus symmetric
  // kinship partners (tiers 3–5).
  const partners = useMemo(() => {
    if (!matrix || !book) return null;
    const idx = BOOKS.findIndex((b) => b.abbrev === book.abbrev);
    if (idx < 0) return null;

    const quotes = new Map(); // this book quotes -> count
    const quotedBy = new Map(); // quoted by -> count
    for (const tier of ['1', '2']) {
      for (const [r, c, n] of matrix.directed?.[tier] || []) {
        if (r === idx && c !== idx) quotes.set(c, (quotes.get(c) || 0) + n);
        if (c === idx && r !== idx) quotedBy.set(r, (quotedBy.get(r) || 0) + n);
      }
    }
    const kin = new Map();
    for (const tier of ['3', '4', '5']) {
      for (const [a, b, n] of matrix.undirected?.[tier] || []) {
        if (a === idx && b !== idx) kin.set(b, (kin.get(b) || 0) + n);
        if (b === idx && a !== idx) kin.set(a, (kin.get(a) || 0) + n);
      }
    }
    const top = (m) => [...m.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([i, n]) => ({ book: BOOKS[i], count: n }));
    return { quotes: top(quotes), quotedBy: top(quotedBy), kin: top(kin) };
  }, [matrix, book]);

  if (!book) {
    return <Navigate to="/read" replace />;
  }

  const canonicalSlug = bookSlug(book);
  if (slug !== canonicalSlug) {
    return <Navigate to={`/book/${canonicalSlug}`} replace />;
  }

  // Defensive: the intro JSON is authored by a separate process. Missing
  // file (import resolves to {}), missing key, or missing fields all just
  // mean the page renders without that section — never a crash.
  const intro = (bookIntros && bookIntros[book.abbrev]) || {};
  const proseSections = [
    ['Authorship & date', intro.attribution],
    ['Setting', intro.setting],
    ['Themes', intro.themes],
  ].filter(([, text]) => text);
  const outline = Array.isArray(intro.outline) && intro.outline.length > 0 ? intro.outline : null;

  const meta = metadata && Array.isArray(metadata.books)
    ? metadata.books.find((b) => b.abbrev === book.abbrev)
    : null;

  let artSrc = null;
  let artFull = false;
  if (fullArt.status === 'loaded') {
    artSrc = fullArt.src;
    artFull = true;
  } else if (bannerArt.status === 'loaded') {
    artSrc = bannerArt.src;
    artFull = false;
  }

  const partnerRows = partners
    ? [
      [`${book.name} quotes`, partners.quotes, '→'],
      ['Quoted & echoed by', partners.quotedBy, '←'],
      ['Closest kinship', partners.kin, '↔'],
    ].filter(([, list]) => list.length > 0)
    : [];

  return (
    <div className="about-page book-page">
      <div className="about-content">
        <Link to="/read" className="about-back">&larr; Back to Reader</Link>

        {artSrc && (
          <div className={`book-art${artFull ? '' : ' book-art--banner'}`}>
            <img src={artSrc} alt={`${book.name} artwork`} className="book-art__img" />
          </div>
        )}

        <h1 className="about-h1 book-title">{book.name}</h1>

        {meta && (
          <div className="book-stats">
            <span className="book-stats__item">{meta.testament === 'OT' ? 'Old' : 'New'} Testament</span>
            <span className="book-stats__item">{meta.chapters.toLocaleString()} chapters</span>
            <span className="book-stats__item">{meta.verses.toLocaleString()} verses</span>
          </div>
        )}

        {intro.blurb && <p className="about-p book-blurb">{intro.blurb}</p>}

        <Link to={`/read/${canonicalSlug}/1`} className="book-cta">
          Read {book.name} 1 &rarr;
        </Link>

        {proseSections.map(([title, text]) => (
          <section key={title}>
            <h2 className="about-h2">{title}</h2>
            <p className="about-p">{text}</p>
          </section>
        ))}

        {outline && (
          <section>
            <h2 className="about-h2">Structure</h2>
            <ul className="book-outline">
              {outline.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>
        )}

        {(topVerses.length > 0 || partnerRows.length > 0) && (
          <section>
            <h2 className="about-h2">In the cross-reference data</h2>

            {partnerRows.length > 0 && (
              <div className="book-partners">
                {partnerRows.map(([label, list, arrow]) => (
                  <div className="book-partners__row" key={label}>
                    <span className="book-partners__label">{label}</span>
                    <span className="book-partners__books">
                      {list.map(({ book: b, count }) => (
                        <Link key={b.abbrev} to={`/book/${bookSlug(b)}`} className="book-partners__chip">
                          <span className="book-partners__arrow">{arrow}</span>
                          {b.name}
                          <span className="book-partners__count">{count.toLocaleString()}</span>
                        </Link>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {topVerses.length > 0 && (
              <>
                <h3 className="book-data-sub">Most connected verses</h3>
                <ul className="book-top-verses">
                  {topVerses.map(({ chapter, verse, count }) => (
                    <li key={`${chapter}:${verse}`}>
                      <Link to={`/read/${canonicalSlug}/${chapter}?v=${verse}`} className="book-top-verses__link">
                        {book.name} {chapter}:{verse}
                      </Link>
                      <span className="book-top-verses__count">{count.toLocaleString()} connections</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="book-data-note">
              Counts from this project&rsquo;s classified reference set — quotation
              direction shown only where the text supports it.{' '}
              <Link to="/about">How these are classified &rarr;</Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
