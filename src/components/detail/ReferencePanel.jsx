import { useMemo, useState } from 'react';
import useAppStore from '../../stores/useAppStore';
import { TIERS } from '../../constants/tiers';

export default function ReferencePanel() {
  const selectedChapter = useAppStore((s) => s.selectedChapter);
  const selectedVerse = useAppStore((s) => s.selectedVerse);
  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter);

  // Build O(1) chapter lookup
  const chapterLookup = useMemo(() => {
    if (!metadata) return null;
    const lookup = new Array(metadata.totalChapters);
    for (const book of metadata.books) {
      for (const ch of book.chapterDetails) {
        lookup[ch.globalIndex] = { bookName: book.name, bookAbbrev: book.abbrev, chapter: ch.chapter };
      }
    }
    return lookup;
  }, [metadata]);

  // Find refs for selected chapter
  const { refsFrom, refsTo, totalCount } = useMemo(() => {
    if (selectedChapter === null || !references) {
      return { refsFrom: [], refsTo: [], totalCount: 0 };
    }
    const from = references.filter((r) => r.from === selectedChapter);
    const to = references.filter((r) => r.to === selectedChapter);
    return { refsFrom: from, refsTo: to, totalCount: from.length + to.length };
  }, [selectedChapter, references]);

  if (selectedChapter === null || !chapterLookup) return null;

  const info = chapterLookup[selectedChapter];
  if (!info) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>{info.bookName} {info.chapter}{selectedVerse ? `:${selectedVerse}` : ''}</span>
        <button onClick={() => setSelectedChapter(null)} style={styles.closeBtn}>&times;</button>
      </div>
      <div style={styles.count}>
        {totalCount.toLocaleString()} cross-references
        {selectedVerse ? <span style={styles.chapterNote}> (chapter-level)</span> : ''}
      </div>

      {refsFrom.length > 0 && (
        <RefSection
          label={`From (${refsFrom.length})`}
          refs={refsFrom}
          chapterLookup={chapterLookup}
          getTarget={(r) => r.to}
          onSelect={setSelectedChapter}
        />
      )}
      {refsTo.length > 0 && (
        <RefSection
          label={`To (${refsTo.length})`}
          refs={refsTo}
          chapterLookup={chapterLookup}
          getTarget={(r) => r.from}
          onSelect={setSelectedChapter}
        />
      )}
    </div>
  );
}

function RefSection({ label, refs, chapterLookup, getTarget, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Group by tier
  const byTier = useMemo(() => {
    const groups = {};
    for (const ref of refs) {
      if (!groups[ref.tier]) groups[ref.tier] = [];
      groups[ref.tier].push(ref);
    }
    // Sort tiers
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([tier, items]) => ({
        tier: Number(tier),
        items: items.sort((a, b) => b.votes - a.votes),
      }));
  }, [refs]);

  const maxItems = showAll ? Infinity : 30;
  let count = 0;

  return (
    <div style={styles.section}>
      <button onClick={() => setExpanded(!expanded)} style={styles.sectionHeader}>
        <span>{expanded ? '\u25BE' : '\u25B8'} {label}</span>
      </button>
      {expanded && (
        <div>
          {byTier.map(({ tier, items }) => {
            const tierInfo = TIERS[tier];
            return (
              <div key={tier} style={styles.tierGroup}>
                <div style={styles.tierLabel}>
                  <span
                    style={{
                      ...styles.tierDot,
                      backgroundColor: `var(--tier-${tier})`,
                    }}
                  />
                  {tierInfo?.shortLabel || `Tier ${tier}`}
                  <span style={styles.tierCount}>({items.length})</span>
                </div>
                {items.map((ref) => {
                  count++;
                  if (count > maxItems) return null;
                  const target = getTarget(ref);
                  const targetInfo = chapterLookup[target];
                  if (!targetInfo) return null;
                  return (
                    <button
                      key={`${ref.from}-${ref.to}`}
                      onClick={() => onSelect(target)}
                      style={styles.refItem}
                    >
                      <span>{targetInfo.bookAbbrev} {targetInfo.chapter}</span>
                      <span style={styles.votes}>{ref.votes}v</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {!showAll && count > maxItems && (
            <button onClick={() => setShowAll(true)} style={styles.showMore}>
              Show all ({refs.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: {
    padding: '8px 0',
    borderTop: '1px solid var(--border)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 12px',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  count: {
    fontSize: 11,
    color: 'var(--text-muted)',
    padding: '2px 12px 6px',
  },
  section: {
    borderTop: '1px solid var(--border)',
  },
  sectionHeader: {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  tierGroup: {
    padding: '0 12px 4px',
  },
  tierLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '3px 0',
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  tierCount: {
    fontWeight: 400,
    color: 'var(--text-muted)',
    marginLeft: 2,
  },
  refItem: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '3px 8px 3px 16px',
    fontSize: 11,
    color: 'var(--text-primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 3,
  },
  votes: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  showMore: {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    fontSize: 11,
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
  },
  chapterNote: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
};
