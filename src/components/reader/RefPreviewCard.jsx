import { Link } from 'react-router-dom';
import { TIERS } from '../../constants/tiers';
import { parseTargetRef, bookSlug } from '../../utils/bookSlug';
import { chapterGlobalIndex } from '../../utils/chapterIndex';
import { useTargetVerse } from '../../hooks/useTargetVerse';

/**
 * Plain-English one-liner for the shard evidence element (entry[5]):
 *   ["f", formula, sharedTokens] | ["r", runLength] | ["o", jaccardPct, theoShared] | 0.
 * Older cached 5-element entries carry no evidence — return null (no line).
 */
function evidenceReceipt(evidence) {
  if (!Array.isArray(evidence)) return null;
  const [kind] = evidence;
  if (kind === 'f') {
    const [, formula, shared] = evidence;
    return `Contains "${formula}" · ${shared} shared significant word${shared === 1 ? '' : 's'}`;
  }
  if (kind === 'r') {
    const [, runLength] = evidence;
    // "an 8-word / 11-word / 18-word / 80-word run", otherwise "a" —
    // matches how the number is read aloud.
    const an = runLength === 11 || runLength === 18 || String(runLength).startsWith('8');
    return `Shares ${an ? 'an' : 'a'} ${runLength}-word verbatim run with this verse`;
  }
  if (kind === 'o') {
    const [, pct, theo] = evidence;
    const overlap = `${pct}% word overlap`;
    return theo > 0
      ? `${overlap} · ${theo} shared theological term${theo === 1 ? '' : 's'}`
      : overlap;
  }
  return null;
}

/** Inline expanding preview card per DESIGN.md: tier badge, evidence receipt,
 * full target ref, target verse text, "Open in Reader ->" and "View on Arc"
 * (deep link — the target chapter arrives selected on the arc diagram). */
export default function RefPreviewCard({ entry, onClose }) {
  const [otherRef, tier, , , flags] = entry;
  const evidence = entry.length > 5 ? entry[5] : 0;
  const parsed = parseTargetRef(otherRef);
  const text = useTargetVerse(otherRef);
  const ambiguous = (flags & 1) === 1;
  const tierInfo = TIERS[tier];

  if (!parsed || !tierInfo) return null;

  const receipt = evidenceReceipt(evidence);
  const targetGlobalIndex = chapterGlobalIndex(parsed.book, parsed.chapter);

  return (
    <div className="reader-preview" role="region" aria-label="Cross-reference preview">
      <div className="reader-preview__header">
        <span className="reader-preview__badge">
          <span className="reader-preview__badge-dot" style={{ backgroundColor: `var(${tierInfo.cssVar})` }} />
          {tierInfo.shortLabel.toUpperCase()} &middot; Tier {tierInfo.id}
        </span>
        <button type="button" className="reader-preview__close" onClick={onClose} aria-label="Close preview">
          &times;
        </button>
      </div>

      {receipt && <div className="reader-preview__receipt">{receipt}</div>}

      <div className="reader-preview__ref">
        {parsed.book.name} {parsed.chapter}:{parsed.verse}
      </div>

      <div className="reader-preview__text">{text || '…'}</div>

      {ambiguous && (
        <div className="reader-preview__note">
          &asymp; Approximate classification &mdash; this connection was auto-detected and may be imprecise.
        </div>
      )}

      <div className="reader-preview__actions">
        <Link
          className="reader-preview__action"
          to={`/read/${bookSlug(parsed.book)}/${parsed.chapter}?v=${parsed.verse}`}
        >
          Open in Reader &rarr;
        </Link>
        <Link
          className="reader-preview__action"
          to={targetGlobalIndex != null ? `/arc?ch=${targetGlobalIndex}` : '/arc'}
        >
          View on Arc
        </Link>
      </div>
    </div>
  );
}
