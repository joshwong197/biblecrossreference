import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import useAppStore from '../../../stores/useAppStore';
import useCanvasSize from '../../../hooks/useCanvasSize';
import { BOOKS } from '../../../constants/books';
import { TESTAMENT_COLORS_DARK, TESTAMENT_COLORS_LIGHT, hexToRgba, getTestamentPairKey } from '../../../utils/colorScales';

const BASE_MARGIN = { top: 80, right: 20, bottom: 20, left: 80 };

export default function GridView() {
  const outerRef = useRef(null);
  const canvasRef = useRef(null);
  const { width: containerWidth, height: containerHeight } = useCanvasSize(outerRef);

  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const colorMode = useAppStore((s) => s.colorMode);
  const theme = useAppStore((s) => s.theme);
  const [tooltip, setTooltip] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Build 66x66 matrix
  const matrix = useMemo(() => {
    if (!references || !metadata) return null;

    const mat = Array.from({ length: 66 }, () => Array(66).fill(0));

    const chapterToBook = new Array(metadata.totalChapters);
    for (const book of metadata.books) {
      for (const ch of book.chapterDetails) {
        chapterToBook[ch.globalIndex] = book.num - 1;
      }
    }

    for (const ref of references) {
      if (!tierVisibility[ref.tier]) continue;
      const fromBook = chapterToBook[ref.from];
      const toBook = chapterToBook[ref.to];
      if (fromBook !== undefined && toBook !== undefined) {
        mat[fromBook][toBook]++;
        mat[toBook][fromBook]++;
      }
    }

    return mat;
  }, [references, metadata, tierVisibility]);

  const maxVal = useMemo(() => {
    if (!matrix) return 1;
    let max = 0;
    for (let i = 0; i < 66; i++) {
      for (let j = 0; j < 66; j++) {
        if (matrix[i][j] > max) max = matrix[i][j];
      }
    }
    return max || 1;
  }, [matrix]);

  // Canvas dimensions scale with zoom
  const canvasW = containerWidth * zoomLevel;
  const canvasH = containerHeight * zoomLevel;

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix || canvasW === 0 || canvasH === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const margin = {
      top: BASE_MARGIN.top * zoomLevel,
      right: BASE_MARGIN.right * zoomLevel,
      bottom: BASE_MARGIN.bottom * zoomLevel,
      left: BASE_MARGIN.left * zoomLevel,
    };

    const gridW = canvasW - margin.left - margin.right;
    const gridH = canvasH - margin.top - margin.bottom;
    const cellW = gridW / 66;
    const cellH = gridH / 66;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const accentColor = theme === 'dark' ? '#58A6FF' : '#0969DA';
    const testamentColors = theme === 'dark' ? TESTAMENT_COLORS_DARK : TESTAMENT_COLORS_LIGHT;

    // Draw cells
    for (let i = 0; i < 66; i++) {
      for (let j = 0; j < 66; j++) {
        const val = matrix[i][j];
        if (val === 0) continue;

        const intensity = Math.pow(val / maxVal, 0.4);
        const x = margin.left + j * cellW;
        const y = margin.top + i * cellH;

        if (colorMode === 'testament') {
          const key = getTestamentPairKey(i + 1, j + 1);
          ctx.fillStyle = hexToRgba(testamentColors[key], intensity * 0.9);
        } else {
          ctx.fillStyle = hexToRgba(accentColor, intensity * 0.9);
        }
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    // OT/NT boundary
    const textColor = theme === 'dark' ? '#8B949E' : '#57606A';
    const otEnd = 39;
    const ntX = margin.left + otEnd * cellW;
    const ntY = margin.top + otEnd * cellH;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5 * zoomLevel;
    ctx.beginPath();
    ctx.moveTo(ntX, margin.top);
    ctx.lineTo(ntX, margin.top + gridH);
    ctx.moveTo(margin.left, ntY);
    ctx.lineTo(margin.left + gridW, ntY);
    ctx.stroke();

    // Book labels
    ctx.fillStyle = textColor;
    const fontSize = Math.max(Math.min(cellW * 0.8, 12 * zoomLevel), 7);
    ctx.font = `${fontSize}px -apple-system, sans-serif`;

    // Top labels (rotated)
    for (let i = 0; i < 66; i++) {
      const x = margin.left + i * cellW + cellW / 2;
      ctx.save();
      ctx.translate(x, margin.top - 4 * zoomLevel);
      ctx.rotate(-Math.PI / 3);
      ctx.textAlign = 'left';
      ctx.fillText(zoomLevel >= 2 ? BOOKS[i].name : BOOKS[i].abbrev, 0, 0);
      ctx.restore();
    }

    // Left labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 66; i++) {
      const y = margin.top + i * cellH + cellH / 2;
      ctx.fillText(zoomLevel >= 2 ? BOOKS[i].name : BOOKS[i].abbrev, margin.left - 4 * zoomLevel, y);
    }
  }, [matrix, maxVal, canvasW, canvasH, theme, colorMode, zoomLevel]);

  // Wheel zoom
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.3 : 0.3;
        setZoomLevel((prev) => Math.min(Math.max(prev + delta, 1), 5));
      }
    };

    outer.addEventListener('wheel', handleWheel, { passive: false });
    return () => outer.removeEventListener('wheel', handleWheel);
  }, []);

  // Tooltip
  const handleMouseMove = useCallback((e) => {
    if (!matrix || canvasW === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollEl = outerRef.current;
    const x = e.clientX - rect.left + (scrollEl?.scrollLeft || 0);
    const y = e.clientY - rect.top + (scrollEl?.scrollTop || 0);

    const margin = {
      top: BASE_MARGIN.top * zoomLevel,
      left: BASE_MARGIN.left * zoomLevel,
    };
    const gridW = canvasW - margin.left - BASE_MARGIN.right * zoomLevel;
    const gridH = canvasH - margin.top - BASE_MARGIN.bottom * zoomLevel;
    const cellW = gridW / 66;
    const cellH = gridH / 66;

    const col = Math.floor((x - margin.left) / cellW);
    const row = Math.floor((y - margin.top) / cellH);

    if (col >= 0 && col < 66 && row >= 0 && row < 66) {
      const val = matrix[row][col];
      if (val > 0) {
        setTooltip({
          x: e.clientX - rect.left + 10,
          y: e.clientY - rect.top - 10,
          from: BOOKS[row].name,
          to: BOOKS[col].name,
          count: val,
        });
        return;
      }
    }
    setTooltip(null);
  }, [matrix, canvasW, canvasH, zoomLevel]);

  if (!references || !metadata) {
    return <div style={styles.loading}>Loading grid view...</div>;
  }

  return (
    <div ref={outerRef} style={{ ...styles.container, overflow: zoomLevel > 1 ? 'auto' : 'hidden' }}>
      {zoomLevel > 1 && (
        <div style={styles.zoomBadge}>
          <span>{zoomLevel.toFixed(1)}x</span>
          <button onClick={() => setZoomLevel(1)} style={styles.resetBtn}>Reset</button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: canvasW,
          height: canvasH,
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div style={{ ...styles.tooltip, left: tooltip.x, top: tooltip.y, position: 'fixed' }}>
          <strong>{tooltip.from}</strong> &harr; <strong>{tooltip.to}</strong>
          <br />
          {tooltip.count.toLocaleString()} references
        </div>
      )}
      {zoomLevel <= 1 && (
        <div style={styles.hint}>Ctrl+scroll to zoom</div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  tooltip: {
    padding: '6px 10px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-primary)',
    pointerEvents: 'none',
    zIndex: 10,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px var(--shadow)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
  },
  zoomBadge: {
    position: 'sticky',
    top: 8,
    left: '100%',
    transform: 'translateX(-100%)',
    display: 'inline-flex',
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
    marginRight: 8,
    marginTop: 8,
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
  hint: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid var(--border)',
    opacity: 0.8,
  },
};
