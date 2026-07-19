import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TIERS } from '../../../constants/tiers';
import { bookSlug } from '../../../utils/bookSlug';
import { getCellReferences } from './matrixAggregation';

/**
 * Side panel listing the actual references between one chapter of book I and
 * one chapter of book J, strongest-first, tier-badged. Emulates the
 * ReferencePanel pattern (tier dot + label, votes, expandable rows) but scoped
 * to a single directional chapter pair, with real Reader links.
 *
 * Note: the loaded reference dataset is chapter-level (records carry no verse),
 * so "Open in Reader" targets the source chapter without a ?v= anchor.
 */
export default function MatrixPanel({
  bookI, bookJ, chapterI, chapterJ, globalFrom, globalTo,
  references, tierVisibility, onClose,
}) {
  const refs = useMemo(
    () => getCellReferences(references, tierVisibility, bookI.num, bookJ.num, globalFrom, globalTo),
    [references, tierVisibility, bookI.num, bookJ.num, globalFrom, globalTo],
  );

  const slugI = bookSlug(bookI);

  return (
    <div className="gv-panel" role="dialog" aria-label="Chapter references">
      <div className="gv-panel-header">
        <div>
          <div className="gv-panel-title">
            {bookI.abbrev} {chapterI} &times; {bookJ.abbrev} {chapterJ}
          </div>
          <div className="gv-panel-sub">
            {refs.length} reference{refs.length === 1 ? '' : 's'}
          </div>
        </div>
        <button className="gv-panel-close" onClick={onClose} aria-label="Close panel">
          &times;
        </button>
      </div>
      <div className="gv-panel-body">
        {refs.length === 0 && (
          <div className="gv-panel-empty">No references in the active tiers.</div>
        )}
        {refs.map((ref, idx) => {
          const tier = TIERS[ref.tier];
          return (
            <div className="gv-ref-row" key={`${ref.tier}-${idx}`}>
              <div className="gv-ref-top">
                <span className="gv-badge">
                  <span
                    className="gv-badge-dot"
                    style={{ backgroundColor: `var(--tier-${ref.tier})` }}
                  />
                  {tier ? `${tier.shortLabel} · Tier ${ref.tier}` : `Tier ${ref.tier}`}
                </span>
                <span className="gv-votes">{ref.votes.toLocaleString()} votes</span>
              </div>
              <Link className="gv-open" to={`/read/${slugI}/${chapterI}`}>
                Open in Reader &rarr;
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
