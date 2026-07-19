import { TIERS, TIER_IDS } from '../../constants/tiers';
import { parseTargetRef } from '../../utils/bookSlug';
import { useTargetVerse } from '../../hooks/useTargetVerse';

/** "+N" full ref list: bottom sheet on mobile, side panel >=900px (CSS
 * handles the layout switch), grouped by tier, each row a chip + first
 * words of the target verse. */
export default function RefFullList({ entries, verseLabel, onClose, onSelectEntry }) {
  const byTier = TIER_IDS
    .map((id) => ({ id, items: entries.filter(([, tier]) => tier === id) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <div className="reader-fulllist__overlay" onClick={onClose} />
      <div className="reader-fulllist__panel" role="dialog" aria-label={`All cross-references for ${verseLabel}`}>
        <div className="reader-fulllist__header">
          <span className="reader-fulllist__title">
            {verseLabel} &middot; {entries.length} reference{entries.length === 1 ? '' : 's'}
          </span>
          <button type="button" className="reader-preview__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="reader-fulllist__body">
          {byTier.map((group) => (
            <div key={group.id}>
              <div className="reader-fulllist__group-label">
                <span
                  className="reader-tier-pill__dot"
                  style={{ backgroundColor: `var(${TIERS[group.id].cssVar})` }}
                />
                {TIERS[group.id].shortLabel} ({group.items.length})
              </div>
              {group.items.map((entry, idx) => (
                <FullListRow key={`${entry[0]}-${idx}`} entry={entry} onSelect={() => onSelectEntry(entry)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FullListRow({ entry, onSelect }) {
  const [otherRef, , , , flags] = entry;
  const parsed = parseTargetRef(otherRef);
  const text = useTargetVerse(otherRef);

  if (!parsed) return null;
  const ambiguous = (flags & 1) === 1;
  const words = text ? text.split(' ') : [];
  const preview = words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : words.join(' ');

  return (
    <button type="button" className="reader-fulllist__row" onClick={onSelect}>
      <span className="reader-fulllist__row-ref">
        {ambiguous ? '≈ ' : ''}
        {parsed.book.abbrev} {parsed.chapter}:{parsed.verse}
      </span>
      <span className="reader-fulllist__row-preview">{preview}</span>
    </button>
  );
}
