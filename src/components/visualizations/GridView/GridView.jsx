import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAppStore from '../../../stores/useAppStore';
import useCanvasSize from '../../../hooks/useCanvasSize';
import { BOOKS } from '../../../constants/books';
import { TIERS } from '../../../constants/tiers';
import { buildChapterMatrix, buildLedgerMatrices, NO_TIER } from './matrixAggregation';
import { drawMatrix, drawLedger, computeLayout, cellAtPoint } from './matrixRenderer';
import MatrixPanel from './MatrixPanel';
import './GridView.css';

const BOOK_ABBREVS = BOOKS.map((b) => b.abbrev);
const N_BOOKS = 66;
const OT_LAST_INDEX = 38; // Malachi (book 39) — testament divider after this

// Structural landmarks (0-based book indices). Names only, never claims.
const LANDMARKS = [
  { text: 'Synoptic web', row: 41, col: 40, rotate: false },
  { text: 'Kings ↔ Chronicles', row: 12, col: 11, rotate: false },
  { text: 'Psalms', row: 50, col: 18, rotate: true },
  { text: 'Isaiah', row: 56, col: 22, rotate: true },
];

function sampleColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    vizBg: get('--viz-bg', '#0D1117'),
    ink: get('--ink', '#E8E6E1'),
    ink2: get('--ink-2', '#98968F'),
    ink3: get('--ink-3', '#5A5954'),
    line: get('--line', '#2A2A27'),
    accent: get('--accent', '#58A6FF'),
    tier1: get('--tier-1', '#FFD700'),
    tier2: get('--tier-2', '#FF6B35'),
    tier3: get('--tier-3', '#4ECDC4'),
    tier4: get('--tier-4', '#9B8EC4'),
  };
}

export default function GridView() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const layoutRef = useRef(null); // { layout, nRows, nCols } for hit-testing
  const { width, height } = useCanvasSize(wrapRef);

  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const theme = useAppStore((s) => s.theme);

  // Drill state lives in the URL (?zoom=i-j) so the browser/phone back
  // gesture exits the chapter zoom instead of leaving the page entirely.
  const [searchParams, setSearchParams] = useSearchParams();
  const pair = useMemo(() => {
    const m = /^(\d{1,2})-(\d{1,2})$/.exec(searchParams.get('zoom') || '');
    if (!m) return null;
    const i = Number(m[1]);
    const j = Number(m[2]);
    return i < N_BOOKS && j < N_BOOKS ? { i, j } : null;
  }, [searchParams]);
  const [hoverCell, setHoverCell] = useState(null); // { i, j }
  const [cursorCell, setCursorCell] = useState(null); // keyboard focus cell
  const [tooltip, setTooltip] = useState(null); // { x, y, i, j }
  const [selectedCell, setSelectedCell] = useState(null); // { ci, cj } -> panel

  // Ledger controls (book-level only).
  const [showDirection, setShowDirection] = useState(true);
  const [normalize, setNormalize] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Direction-aware book matrix (public/data/book_matrix.json). Loaded once.
  const [bookMatrixData, setBookMatrixData] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/data/book_matrix.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setBookMatrixData(d); })
      .catch(() => { /* fall back to symmetric density from chapter aggregate */ });
    return () => { alive = false; };
  }, []);

  const isChapter = pair !== null;

  const chapters = useMemo(
    () => (metadata ? metadata.books.map((b) => b.chapters) : null),
    [metadata],
  );

  // --- Book-level Ledger aggregation (honors tier filter) ---
  const ledger = useMemo(
    () => buildLedgerMatrices(bookMatrixData, tierVisibility, chapters),
    [bookMatrixData, tierVisibility, chapters],
  );

  const chapterMatrix = useMemo(() => {
    if (!isChapter || !references || !metadata) return null;
    return buildChapterMatrix(references, tierVisibility, pair.i, pair.j, metadata);
  }, [isChapter, references, tierVisibility, pair, metadata]);

  // At book level the directed layer is only real when book_matrix loaded.
  const directedMode = showDirection && !!bookMatrixData;

  // --- Active view derived values ---
  const nRows = isChapter && chapterMatrix ? chapterMatrix.nRows : N_BOOKS;
  const nCols = isChapter && chapterMatrix ? chapterMatrix.nCols : N_BOOKS;
  const bookCounts = ledger.symCount; // hit-test / drill gate at book level
  const counts = isChapter && chapterMatrix ? chapterMatrix.counts : bookCounts;
  const chTopTier = isChapter && chapterMatrix ? chapterMatrix.topTier : null;
  const maxOffDiag = isChapter && chapterMatrix ? chapterMatrix.maxOffDiag : 0;
  const sameBook = isChapter && chapterMatrix ? chapterMatrix.sameBook : false;

  const rowLabels = useMemo(() => {
    if (!isChapter) return BOOK_ABBREVS;
    return Array.from({ length: nRows }, (_, k) => String(k + 1));
  }, [isChapter, nRows]);

  const colLabels = useMemo(() => {
    if (!isChapter) return BOOK_ABBREVS;
    return Array.from({ length: nCols }, (_, k) => String(k + 1));
  }, [isChapter, nCols]);

  const bookI = isChapter && metadata ? metadata.books[pair.i] : null;
  const bookJ = isChapter && metadata ? metadata.books[pair.j] : null;

  // --- Render ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = sampleColors();

    if (isChapter) {
      if (!chapterMatrix) return;
      const layout = computeLayout(width, height, nRows, nCols);
      layoutRef.current = { layout, nRows, nCols };
      drawMatrix(ctx, {
        counts, maxOffDiag,
        nRows, nCols, layout, colors,
        rowLabels, colLabels,
        diagonalCell: (i, j) => sameBook && i === j,
        testamentDivRow: null,
        testamentDivCol: null,
        hoverCell, cursorCell,
        width, height,
      });
      return;
    }

    // Book level: the Ledger.
    const layout = computeLayout(width, height, N_BOOKS, N_BOOKS,
      directedMode ? { gutterLeft: 66, gutterTop: 62 } : {});
    layoutRef.current = { layout, nRows: N_BOOKS, nCols: N_BOOKS };
    drawLedger(ctx, {
      mode: directedMode ? 'directed' : 'symmetric',
      N: N_BOOKS, layout, colors, bookLabels: BOOK_ABBREVS,
      warmCount: ledger.warmCount, warmTier: ledger.warmTier,
      groundCount: ledger.groundCount, symCount: ledger.symCount,
      maxWarmRaw: ledger.maxWarmRaw, maxWarmDens: ledger.maxWarmDens,
      maxGroundRaw: ledger.maxGroundRaw, maxGroundDens: ledger.maxGroundDens,
      maxSymRaw: ledger.maxSymRaw, maxSymDens: ledger.maxSymDens,
      normalize, chapters,
      testamentDiv: OT_LAST_INDEX,
      hoverCell, cursorCell,
      showLandmarks: showLabels, landmarks: LANDMARKS,
      width, height,
    });
  }, [
    isChapter, chapterMatrix, ledger, directedMode, normalize, chapters,
    counts, maxOffDiag, nRows, nCols, sameBook, showLabels,
    rowLabels, colLabels, hoverCell, cursorCell, theme, width, height,
  ]);

  // Micro fade on drill in/out (CSS transition handles the tween; reduced
  // motion disables the transition, so this simply snaps).
  const viewKey = isChapter ? `${pair.i}-${pair.j}` : 'book';
  const prevViewRef = useRef(viewKey);
  useEffect(() => {
    if (prevViewRef.current === viewKey) return;
    prevViewRef.current = viewKey;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.opacity = '0.4';
    const id = requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    return () => cancelAnimationFrame(id);
  }, [viewKey]);

  // --- Pointer interaction ---
  const handleMouseMove = useCallback((e) => {
    const store = layoutRef.current;
    if (!store) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cell = cellAtPoint(store.layout, store.nRows, store.nCols, mx, my);
    if (!cell) {
      setHoverCell(null);
      setTooltip(null);
      return;
    }
    setHoverCell(cell);
    setTooltip({ x: mx, y: my, i: cell.i, j: cell.j });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
    setTooltip(null);
  }, []);

  const drillOrSelect = useCallback((cell) => {
    const idx = cell.i * nCols + cell.j;
    if (counts[idx] === 0) return;
    if (!isChapter) {
      setSearchParams({ zoom: `${cell.i}-${cell.j}` }); // pushes history: back gesture un-zooms
      setHoverCell(null);
      setTooltip(null);
      setCursorCell(null);
      setSelectedCell(null);
    } else {
      // Tag with the pair key so a stale panel never survives history
      // navigation into a different zoom (selection is never reset by the
      // back gesture — only ignored).
      setSelectedCell({ ci: cell.i, cj: cell.j, key: `${pair.i}-${pair.j}` });
    }
  }, [counts, nCols, isChapter, pair, setSearchParams]);

  const handleClick = useCallback((e) => {
    const store = layoutRef.current;
    if (!store) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cell = cellAtPoint(store.layout, store.nRows, store.nCols,
      e.clientX - rect.left, e.clientY - rect.top);
    if (cell) drillOrSelect(cell);
  }, [drillOrSelect]);

  // --- Keyboard interaction (arrow keys move a cursor cell; Enter drills) ---
  const handleKeyDown = useCallback((e) => {
    const move = (di, dj) => {
      e.preventDefault();
      setCursorCell((prev) => {
        const base = prev || hoverCell || { i: 0, j: 0 };
        return {
          i: Math.min(Math.max(base.i + di, 0), nRows - 1),
          j: Math.min(Math.max(base.j + dj, 0), nCols - 1),
        };
      });
    };
    switch (e.key) {
      case 'ArrowUp': move(-1, 0); break;
      case 'ArrowDown': move(1, 0); break;
      case 'ArrowLeft': move(0, -1); break;
      case 'ArrowRight': move(0, 1); break;
      case 'Enter':
      case ' ': {
        const target = cursorCell || hoverCell;
        if (target) { e.preventDefault(); drillOrSelect(target); }
        break;
      }
      case 'Escape':
        if (selectedCell) setSelectedCell(null);
        else if (isChapter) setSearchParams({});
        break;
      default: break;
    }
  }, [nRows, nCols, hoverCell, cursorCell, drillOrSelect, selectedCell, isChapter, setSearchParams]);

  const goBack = useCallback(() => {
    setSearchParams({});
    setSelectedCell(null);
    setHoverCell(null);
    setCursorCell(null);
    setTooltip(null);
  }, [setSearchParams]);

  if (!references || !metadata) {
    return <div className="gv-loading">Loading matrix view...</div>;
  }

  // --- Tooltip content ---
  let tooltipNode = null;
  if (tooltip) {
    const idx = tooltip.i * nCols + tooltip.j;
    const clampX = Math.min(tooltip.x + 14, width - 236);
    const clampY = Math.min(tooltip.y + 14, height - 90);
    const style = { left: Math.max(clampX, 4), top: Math.max(clampY, 4) };

    if (isChapter) {
      const count = counts[idx];
      const tier = chTopTier ? chTopTier[idx] : NO_TIER;
      const fromLabel = `${bookI.abbrev} ${tooltip.i + 1}`;
      const toLabel = `${bookJ.abbrev} ${tooltip.j + 1}`;
      tooltipNode = (
        <div className="gv-tooltip" style={style}>
          <div className="gv-tt-title">{fromLabel} &rarr; {toLabel}</div>
          <div className="gv-tt-sub">
            {count.toLocaleString()} reference{count === 1 ? '' : 's'}
          </div>
          {count > 0 && tier !== NO_TIER && TIERS[tier] && (
            <div className="gv-tt-tier gv-tt-sub">
              <span className="gv-tt-dot" style={{ backgroundColor: `var(--tier-${tier})` }} />
              strongest: {TIERS[tier].shortLabel}
            </div>
          )}
        </div>
      );
    } else {
      const warm = ledger.warmCount[idx];
      const warmT = ledger.warmTier[idx];
      const ground = ledger.groundCount[idx];
      const total = counts[idx];
      const rowName = BOOKS[tooltip.i].name;
      const colName = BOOKS[tooltip.j].name;
      tooltipNode = (
        <div className="gv-tooltip" style={style}>
          <div className="gv-tt-title">
            {rowName} {directedMode ? '→' : '↔'} {colName}
          </div>
          {directedMode ? (
            <>
              <div className="gv-tt-sub">
                {warm > 0
                  ? `${warm.toLocaleString()} quote${warm === 1 ? '' : 's'} & allusion${warm === 1 ? '' : 's'}`
                  : 'no quotation in this direction'}
              </div>
              {warm > 0 && warmT !== NO_TIER && TIERS[warmT] && (
                <div className="gv-tt-tier gv-tt-sub">
                  <span className="gv-tt-dot" style={{ backgroundColor: `var(--tier-${warmT})` }} />
                  {rowName} quotes {colName}
                </div>
              )}
              {ground > 0 && (
                <div className="gv-tt-sub">{ground.toLocaleString()} kinship link{ground === 1 ? '' : 's'}</div>
              )}
            </>
          ) : (
            <div className="gv-tt-sub">
              {total.toLocaleString()} connection{total === 1 ? '' : 's'}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="gv-root">
      <div className="gv-topbar">
        {isChapter ? (
          <div className="gv-breadcrumb">
            <button className="gv-back" onClick={goBack}>&lsaquo; back</button>
            <span className="gv-crumb-title">{bookI.name} &times; {bookJ.name}</span>
            <span>chapter &times; chapter &middot; density</span>
          </div>
        ) : (
          <div className="gv-breadcrumb">
            <span className="gv-crumb-title">The Ledger</span>
            <span>66 &times; 66 books</span>
          </div>
        )}

        {!isChapter && (
          <div className="gv-controls">
            <button
              className={`gv-pill${directedMode ? ' is-on' : ''}`}
              onClick={() => setShowDirection((v) => !v)}
              aria-pressed={directedMode}
              disabled={!bookMatrixData}
              title="Show quotation direction (rows quote columns)"
            >
              Direction
            </button>
            <button
              className={`gv-pill${normalize ? ' is-on' : ''}`}
              onClick={() => setNormalize((v) => !v)}
              aria-pressed={normalize}
              title="Divide by chapter-pair count so large books stop dominating"
            >
              Normalize
            </button>
            {directedMode && (
              <button
                className={`gv-pill${showLabels ? ' is-on' : ''}`}
                onClick={() => setShowLabels((v) => !v)}
                aria-pressed={showLabels}
                title="Structural landmark labels"
              >
                Labels
              </button>
            )}
          </div>
        )}

        <div className="gv-legend">
          {isChapter
            ? 'darker = more references · click a cell for details'
            : directedMode
              ? 'darker = more · click any cell to zoom'
              : 'darker = more connections · click any cell to zoom'}
        </div>
      </div>

      <div className="gv-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="gv-canvas"
          tabIndex={0}
          role="img"
          aria-label={isChapter
            ? `Chapter reference matrix, ${bookI.name} rows by ${bookJ.name} columns`
            : 'Book reference ledger, 66 by 66 books, rows quote columns'}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        />
        {tooltipNode}
        {selectedCell && bookI && bookJ && selectedCell.key === `${pair.i}-${pair.j}` && (
          <MatrixPanel
            bookI={bookI}
            bookJ={bookJ}
            chapterI={selectedCell.ci + 1}
            chapterJ={selectedCell.cj + 1}
            globalFrom={chapterMatrix.offI + selectedCell.ci}
            globalTo={chapterMatrix.offJ + selectedCell.cj}
            references={references}
            tierVisibility={tierVisibility}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </div>

      {!isChapter && (
        <div className="gv-layer-legend">
          {directedMode
            ? 'Direction shown for quotes & allusions (tiers 1–2); kinship tiers (3–5) shown without direction.'
            : 'Symmetric density across all visible tiers — no direction claimed. Turn on Direction to orient by who quotes whom.'}
        </div>
      )}
    </div>
  );
}
