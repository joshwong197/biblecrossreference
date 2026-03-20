import { useEffect, useRef, useState } from 'react';
import useVerseText from '../../hooks/useVerseText';

export default function VerseTooltip({ bookAbbrev, bookName, chapter, verse, anchorRect }) {
  const { getText, loading, loaded, ensureLoaded } = useVerseText();
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

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

  const text = loaded ? getText(bookAbbrev, chapter, verse) : null;
  const reference = verse
    ? `${bookName || bookAbbrev} ${chapter}:${verse}`
    : `${bookName || bookAbbrev} ${chapter}:1`;

  return (
    <div
      ref={tooltipRef}
      style={{
        ...styles.tooltip,
        top: position.top,
        left: position.left,
      }}
    >
      <div style={styles.reference}>{reference}</div>
      {loading && <div style={styles.loading}>Loading verse text...</div>}
      {!loading && text && <div style={styles.text}>{text}</div>}
      {!loading && !text && loaded && (
        <div style={styles.loading}>Verse text not available</div>
      )}
    </div>
  );
}

const styles = {
  tooltip: {
    position: 'fixed',
    zIndex: 1000,
    maxWidth: 340,
    padding: '10px 14px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  },
  reference: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 6,
  },
  text: {
    fontSize: 12,
    lineHeight: 1.5,
    color: 'var(--text-primary)',
    fontStyle: 'italic',
  },
  loading: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
};
