import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { resolveBook, bookSlug } from '../utils/bookSlug';
import { useArtImage } from '../hooks/useArtImage';
import bookIntros from '../data/bookIntros.json';
import '../about.css';

const METADATA_URL = '/data/bible_metadata.json';

/**
 * Book About page (/book/:slug) — "register 3" (document typography, like
 * AboutPage) for a single book: optional hero art, name, an intro blurb
 * (from src/data/bookIntros.json, filled in independently — see the
 * defensive lookups below), a small stats line, and a way into the Reader.
 */
export default function BookPage() {
  const { slug } = useParams();
  const book = resolveBook(slug);
  const [metadata, setMetadata] = useState(null);

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
    return () => {
      cancelled = true;
    };
  }, []);

  // Hooks must run unconditionally before any early return, so resolve art
  // for whatever abbrev we have (possibly undefined pre-redirect) — the
  // hook itself no-ops when abbrev is falsy.
  const fullArt = useArtImage(book?.abbrev, '-full');
  const bannerArt = useArtImage(book?.abbrev, '');

  if (!book) {
    return <Navigate to="/read" replace />;
  }

  const canonicalSlug = bookSlug(book);
  if (slug !== canonicalSlug) {
    return <Navigate to={`/book/${canonicalSlug}`} replace />;
  }

  // Defensive: the intro JSON is authored by a separate process. Missing
  // file (import resolves to {}), missing key, or missing blurb all just
  // mean the page renders without a blurb — never a crash.
  const intro = (bookIntros && bookIntros[book.abbrev]) || null;
  const blurb = intro && intro.blurb ? intro.blurb : null;

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

        {blurb && <p className="about-p book-blurb">{blurb}</p>}

        <Link to={`/read/${canonicalSlug}/1`} className="book-cta">
          Read {book.name} 1 &rarr;
        </Link>
      </div>
    </div>
  );
}
