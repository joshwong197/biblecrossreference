import { useRef, useEffect, useCallback, useState } from 'react';
import useAppStore from '../../../stores/useAppStore';
import useCanvasSize from '../../../hooks/useCanvasSize';
import { renderArcs } from './arcRenderer';

export default function ArcDiagram() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const { width, height: containerHeight } = useCanvasSize(containerRef);

  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const colorMode = useAppStore((s) => s.colorMode);
  const theme = useAppStore((s) => s.theme);
  const hoveredChapter = useAppStore((s) => s.hoveredChapter);
  const selectedChapter = useAppStore((s) => s.selectedChapter);
  const setHoveredChapter = useAppStore((s) => s.setHoveredChapter);
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter);

  // Zoom/pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, pan: 0 });

  const totalChapters = metadata?.totalChapters || 1189;
  const visibleChapters = totalChapters / zoomLevel;
  const viewStart = panOffset;
  const viewEnd = panOffset + visibleChapters;

  const arcHeight = Math.max(containerHeight * 0.75, 300);
  const barHeight = Math.max(containerHeight * 0.15, 60);
  const axisHeight = 30;

  // Clamp pan offset
  const clampPan = useCallback((pan) => {
    const max = totalChapters - totalChapters / zoomLevel;
    return Math.min(Math.max(pan, 0), Math.max(max, 0));
  }, [totalChapters, zoomLevel]);

  // Wheel zoom — attached via useEffect for passive:false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseFraction = mouseX / rect.width;

      // Zoom centered on cursor
      const zoomDelta = e.deltaY > 0 ? -0.5 : 0.5;
      setZoomLevel((prevZoom) => {
        const newZoom = Math.min(Math.max(prevZoom + zoomDelta, 1), 15);
        // Adjust pan to keep cursor position stable
        const prevVisible = totalChapters / prevZoom;
        const newVisible = totalChapters / newZoom;
        const cursorChapter = panOffset + mouseFraction * prevVisible;
        const newPan = cursorChapter - mouseFraction * newVisible;
        const maxPan = totalChapters - newVisible;
        setPanOffset(Math.min(Math.max(newPan, 0), Math.max(maxPan, 0)));
        return newZoom;
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [totalChapters, panOffset]);

  // Drag-to-pan
  const handleMouseDown = useCallback((e) => {
    if (zoomLevel <= 1) return;
    if (e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, pan: panOffset };
      e.preventDefault();
    }
  }, [zoomLevel, panOffset]);

  const handleMouseMoveGlobal = useCallback((e) => {
    if (!isDragging || !width) return;
    const dx = e.clientX - dragStartRef.current.x;
    const chapterDelta = -(dx / width) * visibleChapters;
    setPanOffset(clampPan(dragStartRef.current.pan + chapterDelta));
  }, [isDragging, width, visibleChapters, clampPan]);

  const handleMouseUpGlobal = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mouseup', handleMouseUpGlobal);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mouseup', handleMouseUpGlobal);
      };
    }
  }, [isDragging, handleMouseMoveGlobal, handleMouseUpGlobal]);

  // Render arcs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !references || !metadata || width === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = arcHeight * dpr;
    ctx.scale(dpr, dpr);

    renderArcs(ctx, references, {
      width,
      height: arcHeight,
      tierVisibility,
      colorMode,
      theme,
      hoveredChapter,
      selectedChapter,
      totalChapters,
      viewStart,
      viewEnd,
    });
  }, [references, metadata, width, arcHeight, tierVisibility, colorMode, theme, hoveredChapter, selectedChapter, viewStart, viewEnd, totalChapters]);

  // Render bar chart (zoom-aware)
  useEffect(() => {
    const canvas = barCanvasRef.current;
    if (!canvas || !metadata || width === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = barHeight * dpr;
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const barFill = style.getPropertyValue('--bar-fill').trim();
    const barOpacity = parseFloat(style.getPropertyValue('--bar-fill-opacity').trim()) || 0.5;

    const verseCounts = [];
    for (const book of metadata.books) {
      for (const ch of book.chapterDetails) {
        verseCounts.push(ch.verses);
      }
    }
    const maxVerses = Math.max(...verseCounts);

    ctx.clearRect(0, 0, width, barHeight);
    ctx.fillStyle = barFill;
    ctx.globalAlpha = barOpacity;

    const chapterWidth = width / visibleChapters;
    const startIdx = Math.max(0, Math.floor(viewStart));
    const endIdx = Math.min(verseCounts.length, Math.ceil(viewEnd));

    for (let i = startIdx; i < endIdx; i++) {
      const x = (i - viewStart) / visibleChapters * width;
      const h = (verseCounts[i] / maxVerses) * barHeight;
      ctx.fillRect(x, barHeight - h, Math.max(chapterWidth - 0.5, 0.5), h);
    }
  }, [metadata, width, barHeight, theme, viewStart, viewEnd, visibleChapters]);

  // Mouse interaction (zoom-aware)
  const handleMouseMove = useCallback((e) => {
    if (!metadata || width === 0 || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chapter = Math.floor(viewStart + (x / width) * visibleChapters);
    setHoveredChapter(Math.min(Math.max(chapter, 0), totalChapters - 1));
  }, [metadata, width, setHoveredChapter, viewStart, visibleChapters, totalChapters, isDragging]);

  const handleMouseLeave = useCallback(() => {
    setHoveredChapter(null);
  }, [setHoveredChapter]);

  const handleClick = useCallback((e) => {
    if (!metadata || width === 0 || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chapter = Math.floor(viewStart + (x / width) * visibleChapters);
    setSelectedChapter(Math.min(Math.max(chapter, 0), totalChapters - 1));
  }, [metadata, width, setSelectedChapter, viewStart, visibleChapters, totalChapters, isDragging]);

  if (!references || !metadata) {
    return <div style={styles.placeholder}>Loading arc diagram...</div>;
  }

  // Visible books for axis labels
  const visibleBooks = metadata.books.filter((book) => {
    const bookStart = book.chapterDetails[0].globalIndex;
    const bookEnd = book.chapterDetails[book.chapterDetails.length - 1].globalIndex;
    return bookEnd >= viewStart && bookStart <= viewEnd;
  });

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Zoom indicator */}
      {zoomLevel > 1 && (
        <div style={styles.zoomBadge}>
          <span>{zoomLevel.toFixed(1)}x</span>
          <button
            onClick={() => { setZoomLevel(1); setPanOffset(0); }}
            style={styles.resetBtn}
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          ...styles.canvas,
          height: arcHeight,
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'crosshair',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      />
      {/* Book labels axis */}
      <div style={{ ...styles.axis, height: axisHeight }}>
        {visibleBooks.map((book) => {
          const startChapter = book.chapterDetails[0].globalIndex;
          const x = ((startChapter - viewStart) / visibleChapters) * 100;
          const isNTStart = book.num === 40;
          return (
            <span
              key={book.num}
              style={{
                ...styles.bookLabel,
                left: `${x}%`,
                fontSize: zoomLevel > 3 ? 10 : 8,
                ...(isNTStart ? styles.ntBorder : {}),
              }}
              title={book.name}
            >
              {zoomLevel > 3 ? book.name : book.abbrev}
            </span>
          );
        })}
      </div>
      <canvas
        ref={barCanvasRef}
        style={{ ...styles.canvas, height: barHeight }}
      />
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    width: '100%',
    display: 'block',
  },
  axis: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    flexShrink: 0,
    borderTop: '1px solid var(--divider)',
  },
  bookLabel: {
    position: 'absolute',
    fontSize: 8,
    color: 'var(--text-muted)',
    transform: 'rotate(-45deg)',
    transformOrigin: 'top left',
    whiteSpace: 'nowrap',
    top: 4,
  },
  ntBorder: {
    borderLeft: '2px solid var(--accent)',
    paddingLeft: 2,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
  },
  zoomBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    zIndex: 10,
  },
  resetBtn: {
    padding: '2px 6px',
    fontSize: 10,
    border: '1px solid var(--border)',
    borderRadius: 3,
    backgroundColor: 'var(--button-bg)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
};
