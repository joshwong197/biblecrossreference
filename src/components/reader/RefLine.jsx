import { TIERS } from '../../constants/tiers';
import { parseTargetRef } from '../../utils/bookSlug';
import RefPreviewCard from './RefPreviewCard';

/** The ref line under a verse: quiet indented row of always-visible chips,
 * the 3 strongest (shard order is already strongest-first) then a "+N"
 * chip. Tapping a chip expands one inline preview card at a time. */
export default function RefLine({ entries, tierVisibility, openEntry, onToggle, onOpenFullList }) {
  const filtered = entries.filter(([, tier]) => tierVisibility[tier]);
  if (filtered.length === 0) return null;

  const visible = filtered.slice(0, 3);
  const remaining = filtered.length - visible.length;
  const activeEntry = openEntry && filtered.includes(openEntry) ? openEntry : null;

  return (
    <>
      <div className="reader-refline">
        {visible.map((entry, idx) => {
          const [otherRef, tier, , , flags] = entry;
          const parsed = parseTargetRef(otherRef);
          if (!parsed) return null;
          const ambiguous = (flags & 1) === 1;

          return (
            <button
              key={`${otherRef}-${idx}`}
              type="button"
              className="reader-chip"
              aria-pressed={entry === activeEntry}
              onClick={() => onToggle(entry)}
            >
              {ambiguous && <span className="reader-chip__approx">&asymp;</span>}
              <span className="reader-chip__dot" style={{ backgroundColor: `var(${TIERS[tier].cssVar})` }} />
              {parsed.book.abbrev} {parsed.chapter}:{parsed.verse}
            </button>
          );
        })}
        {remaining > 0 && (
          <button type="button" className="reader-chip reader-chip--more" onClick={onOpenFullList}>
            +{remaining}
          </button>
        )}
      </div>
      {activeEntry && <RefPreviewCard entry={activeEntry} onClose={() => onToggle(activeEntry)} />}
    </>
  );
}
