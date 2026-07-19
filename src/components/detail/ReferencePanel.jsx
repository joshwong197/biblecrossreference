import { useMemo, useState, useRef, useCallback } from 'react';
import useAppStore from '../../stores/useAppStore';
import { TIERS } from '../../constants/tiers';
import VerseTooltip from '../shared/VerseTooltip';
import useVerseText from '../../hooks/useVerseText';

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
        lookup[ch.globalIndex] = {
          bookName: book.name,
          bookAbbrev: book.abbrev,
          chapter: ch.chapter,
          verses: ch.verses,
        };
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

  // Selected verse text from the per-book text shard (lazy, cached)
  const selectedInfo = selectedChapter !== null && chapterLookup ? chapterLookup[selectedChapter] : null;
  const { getText } = useVerseText(selectedVerse && selectedInfo ? selectedInfo.bookAbbrev : null);
  const verseText = selectedVerse && selectedInfo ? getText(selectedInfo.chapter, selectedVerse) : null;

  if (!selectedInfo) return null;

  const info = selectedInfo;

  return (
    <div className="ref-panel">
      <div className="ref-panel__header">
        <span className="ref-panel__title">{info.bookName} {info.chapter}{selectedVerse ? `:${selectedVerse}` : ''}</span>
        <button onClick={() => setSelectedChapter(null)} className="ref-panel__close" aria-label="Close reference panel">&times;</button>
      </div>

      {verseText && (
        <div className="ref-panel__verse">
          <span className="ref-panel__verse-num">{selectedVerse}</span> {verseText}
        </div>
      )}

      <div className="ref-panel__count">
        {totalCount.toLocaleString()} cross-references
        {selectedVerse ? <span className="ref-panel__chapter-note"> (chapter-level)</span> : ''}
      </div>

      {refsFrom.length > 0 && (
        <RefSection
          label={`References from here (${refsFrom.length})`}
          refs={refsFrom}
          chapterLookup={chapterLookup}
          getTarget={(r) => r.to}
          onSelect={setSelectedChapter}
        />
      )}
      {refsTo.length > 0 && (
        <RefSection
          label={`Referenced by (${refsTo.length})`}
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
  const [hoveredRef, setHoveredRef] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const hoverTimer = useRef(null);

  const handleMouseEnter = useCallback((targetInfo, e) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoveredRef(targetInfo);
      setAnchorRect(e.currentTarget.getBoundingClientRect());
    }, 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setHoveredRef(null);
    setAnchorRect(null);
  }, []);

  // Group by tier
  const byTier = useMemo(() => {
    const groups = {};
    for (const ref of refs) {
      if (!groups[ref.tier]) groups[ref.tier] = [];
      groups[ref.tier].push(ref);
    }
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
    <div className="ref-panel__section">
      <button onClick={() => setExpanded(!expanded)} className="ref-panel__section-header" aria-expanded={expanded}>
        <span>{expanded ? '\u25BE' : '\u25B8'} {label}</span>
      </button>
      {expanded && (
        <div>
          {byTier.map(({ tier, items }) => {
            const tierInfo = TIERS[tier];
            return (
              <div key={tier} className="ref-panel__tier-group">
                <div className="ref-panel__tier-label">
                  <span
                    className="ref-panel__tier-dot"
                    style={{ backgroundColor: `var(--tier-${tier})` }}
                  />
                  {tierInfo?.shortLabel || `Tier ${tier}`}
                  <span className="ref-panel__tier-count">({items.length})</span>
                </div>
                {items.map((ref, idx) => {
                  count++;
                  if (count > maxItems) return null;
                  const target = getTarget(ref);
                  const targetInfo = chapterLookup[target];
                  if (!targetInfo) return null;
                  return (
                    <button
                      key={`${ref.from}-${ref.to}-${idx}`}
                      onClick={() => onSelect(target)}
                      onMouseEnter={(e) => handleMouseEnter(targetInfo, e)}
                      onMouseLeave={handleMouseLeave}
                      className="ref-panel__row"
                    >
                      <span>{targetInfo.bookAbbrev} {targetInfo.chapter}</span>
                      <span className="ref-panel__votes">{ref.votes} votes</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {!showAll && count > maxItems && (
            <button onClick={() => setShowAll(true)} className="ref-panel__show-all">
              Show all ({refs.length})
            </button>
          )}
        </div>
      )}
      {hoveredRef && anchorRect && (
        <VerseTooltip
          bookAbbrev={hoveredRef.bookAbbrev}
          bookName={hoveredRef.bookName}
          chapter={hoveredRef.chapter}
          verse={1}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}
