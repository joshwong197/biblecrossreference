import { useEffect, useRef, useState } from 'react';
import useVerseText from '../../hooks/useVerseText';
// VerseTooltip renders from the viz page and (via SearchBar/ReferencePanel) is
// reachable outside it, so it imports the chrome stylesheet itself. Vite dedupes.
import '../../viz-chrome.css';

export default function VerseTooltip({ bookAbbrev, bookName, chapter, verse, anchorRect }) {
  const { getText, loading, loaded } = useVerseText(bookAbbrev);
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRect || !tooltipRef.current) return;
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchorRect.top - tt.height - 8;
    let left = anchorRect.left + anchorRect.width / 2 - tt.width / 2;

    // Flip below if too close to top
    if (top < 8) {
      top = anchorRect.bottom + 8;
    }
    // Clamp horizontally
    left = Math.max(8, Math.min(left, vw - tt.width - 8));
    // Clamp vertically
    top = Math.max(8, Math.min(top, vh - tt.height - 8));

    setPosition({ top, left });
  }, [anchorRect, loaded]);

  const text = loaded ? getText(chapter, verse) : null;
  const reference = verse
    ? `${bookName || bookAbbrev} ${chapter}:${verse}`
    : `${bookName || bookAbbrev} ${chapter}:1`;

  return (
    <div
      ref={tooltipRef}
      className="verse-tooltip"
      style={{ top: position.top, left: position.left }}
    >
      <div className="verse-tooltip__ref">{reference}</div>
      {loading && <div className="verse-tooltip__loading">Loading verse text...</div>}
      {!loading && text && <div className="verse-tooltip__text">{text}</div>}
      {!loading && !text && loaded && (
        <div className="verse-tooltip__loading">Verse text not available</div>
      )}
    </div>
  );
}
