import { Link } from 'react-router-dom';
import { parseTargetRef, resolveBook, bookSlug } from '../../utils/bookSlug';

/**
 * Turn a dotted ref string into a Reader route + human label.
 * - 3-part "Isa.9.6"  -> { to: '/read/isa/9?v=6', label: 'Isa 9:6' }
 * - 2-part "Mark.14"  -> { to: '/read/mark/14',    label: 'Mark 14' }
 * Returns null when the book can't be resolved.
 */
function refToLink(ref) {
  if (!ref) return null;
  const parts = String(ref).split('.');

  if (parts.length === 3) {
    const parsed = parseTargetRef(ref);
    if (!parsed) return null;
    return {
      to: `/read/${bookSlug(parsed.book)}/${parsed.chapter}?v=${parsed.verse}`,
      label: `${parsed.book.abbrev} ${parsed.chapter}:${parsed.verse}`,
    };
  }

  if (parts.length === 2) {
    const [abbrev, chapter] = parts;
    const book = resolveBook(abbrev);
    const chap = Number(chapter);
    if (!book || !Number.isInteger(chap)) return null;
    return {
      to: `/read/${bookSlug(book)}/${chap}`,
      label: `${book.abbrev} ${chap}`,
    };
  }

  return null;
}

/**
 * A single deep-link into the Reader. Every ref shown anywhere in the feed
 * routes one tap away to the verse/chapter that backs the claim — the
 * bias-killer requirement. Renders as a quiet chip by default.
 */
export default function RefLink({ refStr, variant = 'chip', children }) {
  const link = refToLink(refStr);
  if (!link) {
    return <span className="xref xref--dead">{refStr}</span>;
  }
  return (
    <Link className={`xref xref--${variant}`} to={link.to}>
      {children || link.label}
    </Link>
  );
}
