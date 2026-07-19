import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import useAppStore from '../../../stores/useAppStore';
import useCanvasSize from '../../../hooks/useCanvasSize';
import {
  renderBase,
  renderHighlight,
  renderUnfoldBase,
  appendUnfoldArcs,
  renderUnfoldLanding,
} from './arcRenderer';
import './unfold.css';

const UNFOLD_SPEEDS = [4, 16, 64]; // chapters per second (cycle button)

export default function ArcDiagram() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
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

  // Unfold (time-playback) mode — view-local state only.
  const [unfoldMode, setUnfoldMode] = useState(false);
  const [playhead, setPlayhead] = useState(0); // float global chapter index
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  // { lastP, needsRebuild } — drives incremental-vs-rebuild decision.
  const unfoldStateRef = useRef({ lastP: -1, needsRebuild: true });

  const totalChapters = metadata?.totalChapters || 1189;
  const visibleChapters = totalChapters / zoomLevel;
  const viewStart = panOffset;
  const viewEnd = panOffset + visibleChapters;

  const arcHeight = Math.max(containerHeight * 0.75, 300);
  const barHeight = Math.max(containerHeight * 0.15, 60);
  const axisHeight = 30;

  // --- Derived metadata: per-chapter label, book starts, NT boundary ---
  const chapterMeta = useMemo(() => {
    if (!metadata) return null;
    const arr = new Array(totalChapters);
    for (const book of metadata.books) {
      for (const cd of book.chapterDetails) {
        arr[cd.globalIndex] = { bookName: book.name, chapter: cd.chapter };
      }
    }
    return arr;
  }, [metadata, totalChapters]);

  const bookStarts = useMemo(() => {
    if (!metadata) return [];
    return metadata.books.map((b) => b.chapterDetails[0].globalIndex);
  }, [metadata]);

  const ntStart = useMemo(() => {
    if (!metadata) return 929;
    const nt = metadata.books.find((b) => b.testament === 'NT');
    return nt ? nt.chapterDetails[0].globalIndex : 929;
  }, [metadata]);

  // --- Unfold arc index: tier-filtered arcs sorted by max(from,to) ascending,
  // plus prefixEnd[c] = count of arcs whose max endpoint is <= c. The arc set
  // for any playhead P is then the contiguous prefix sortedArcs[0 .. prefixEnd[P]]
  // (O(1) slicing); the "landing" arcs for P are the slice [prefixEnd[P-1] .. prefixEnd[P]].
  const { sortedArcs, prefixEnd } = useMemo(() => {
    if (!references) return { sortedArcs: null, prefixEnd: null };
    const filtered = references.filter((a) => tierVisibility[a.tier]);
    filtered.sort(
      (a, b) => Math.max(a.from, a.to) - Math.max(b.from, b.to),
    );
    const ends = new Int32Array(totalChapters);
    let idx = 0;
    for (let c = 0; c < totalChapters; c++) {
      while (
        idx < filtered.length
        && Math.max(filtered[idx].from, filtered[idx].to) <= c
      ) {
        idx++;
      }
      ends[c] = idx;
    }
    return { sortedArcs: filtered, prefixEnd: ends };
  }, [references, tierVisibility, totalChapters]);

  const speed = UNFOLD_SPEEDS[speedIdx];

  // Clamp pan offset
  const clampPan = useCallback((pan) => {
    const max = totalChapters - totalChapters / zoomLevel;
    return Math.min(Math.max(pan, 0), Math.max(max, 0));
  }, [totalChapters, zoomLevel]);

  // --- Track prefers-reduced-motion changes ---
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Wheel zoom — attached via useEffect for passive:false. Disabled in Unfold mode.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const handleWheel = (e) => {
      if (unfoldMode) return;
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
  }, [totalChapters, panOffset, unfoldMode]);

  // Drag-to-pan (disabled in Unfold mode)
  const handleMouseDown = useCallback((e) => {
    if (unfoldMode || zoomLevel <= 1) return;
    if (e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, pan: panOffset };
      e.preventDefault();
    }
  }, [unfoldMode, zoomLevel, panOffset]);

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
    return undefined;
  }, [isDragging, handleMouseMoveGlobal, handleMouseUpGlobal]);

  // ============================================================
  // NORMAL MODE rendering (two-layer architecture — preserved).
  // All three effects early-return in Unfold mode; toggling the mode off
  // re-runs them (unfoldMode is in their deps), restoring the full render.
  // ============================================================

  // Render the full arc set to an offscreen canvas — the expensive pass
  // (~55k curves). Hover/selection changes never re-run this.
  useEffect(() => {
    if (unfoldMode) return;
    if (!references || !metadata || width === 0) return;

    if (!baseCanvasRef.current) baseCanvasRef.current = document.createElement('canvas');
    const base = baseCanvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    base.width = width * dpr;
    base.height = arcHeight * dpr;
    const ctx = base.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    renderBase(ctx, references, {
      width,
      height: arcHeight,
      tierVisibility,
      colorMode,
      theme,
      totalChapters,
      viewStart,
      viewEnd,
    });
  }, [unfoldMode, references, metadata, width, arcHeight, tierVisibility, colorMode, theme, viewStart, viewEnd, totalChapters]);

  // Composite: cached base (dimmed when a chapter is highlighted) plus only
  // the highlighted chapter's arcs — cheap, safe to run on every mouse move.
  useEffect(() => {
    if (unfoldMode) return;
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    if (!canvas || !base || !references || !metadata || width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = arcHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, arcHeight);

    const highlightChapter = hoveredChapter ?? selectedChapter;
    if (highlightChapter !== null && highlightChapter !== undefined) {
      ctx.globalAlpha = 0.12;
      ctx.drawImage(base, 0, 0, width, arcHeight);
      ctx.globalAlpha = 1;
      renderHighlight(ctx, references, {
        width,
        height: arcHeight,
        tierVisibility,
        colorMode,
        theme,
        totalChapters,
        viewStart,
        viewEnd,
      }, highlightChapter);
    } else {
      ctx.drawImage(base, 0, 0, width, arcHeight);
    }
  }, [unfoldMode, references, metadata, width, arcHeight, tierVisibility, colorMode, theme, hoveredChapter, selectedChapter, viewStart, viewEnd, totalChapters]);

  // ============================================================
  // UNFOLD MODE rendering.
  // Invariant: base offscreen canvas holds the accumulated prefix. Forward
  // advance strokes ONLY the newly-arrived arcs onto it (no clear); a
  // backward move / jump / appearance change forces one full prefix rebuild.
  // ============================================================

  // Mark the base dirty (force a full rebuild) whenever an input that changes
  // every arc's appearance/position changes, or when entering the mode.
  useEffect(() => {
    unfoldStateRef.current.needsRebuild = true;
  }, [unfoldMode, colorMode, theme, sortedArcs, width, arcHeight]);

  // Paint pass — reacts to playhead (and, while paused, hover). Runs at most
  // once per commit; React batches the rAF/scrub state updates to one per frame.
  useEffect(() => {
    if (!unfoldMode || width === 0 || !sortedArcs || !prefixEnd) return;
    if (!baseCanvasRef.current) baseCanvasRef.current = document.createElement('canvas');

    const base = baseCanvasRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const Pi = Math.max(0, Math.min(totalChapters - 1, Math.floor(playhead)));
    const st = unfoldStateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const config = {
      width,
      height: arcHeight,
      tierVisibility,
      colorMode,
      theme,
      totalChapters,
      viewStart: 0,
      viewEnd: totalChapters,
    };

    const baseCtx = base.getContext('2d');
    const rebuild = st.needsRebuild || st.lastP < 0 || Pi < st.lastP;

    if (rebuild) {
      // Full prefix rebuild — resizing resets the transform, so re-scale.
      base.width = width * dpr;
      base.height = arcHeight * dpr;
      baseCtx.setTransform(1, 0, 0, 1, 0, 0);
      baseCtx.scale(dpr, dpr);
      const t0 = (import.meta.env.DEV && performance.now()) || 0;
      renderUnfoldBase(baseCtx, sortedArcs.slice(0, prefixEnd[Pi]), config);
      if (import.meta.env.DEV) {
        window.__unfoldRebuildMs = performance.now() - t0;
        window.__unfoldRebuildCount = prefixEnd[Pi];
      }
    } else if (Pi > st.lastP) {
      // Forward incremental — stroke only newly-arrived arcs, no clear.
      const from = prefixEnd[st.lastP];
      const to = prefixEnd[Pi];
      if (to > from) appendUnfoldArcs(baseCtx, sortedArcs.slice(from, to), config);
    }

    // Composite base -> visible canvas, then landing arcs bright on top.
    canvas.width = width * dpr;
    canvas.height = arcHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, arcHeight);
    ctx.drawImage(base, 0, 0, width, arcHeight);

    const landFrom = Pi > 0 ? prefixEnd[Pi - 1] : 0;
    const landing = sortedArcs.slice(landFrom, prefixEnd[Pi]);
    if (landing.length) renderUnfoldLanding(ctx, landing, config);

    // While paused, normal hover highlight still works (over the prefix).
    // While playing, hover is ignored to avoid competing redraw paths.
    if (!isPlaying && hoveredChapter != null && hoveredChapter <= Pi) {
      renderHighlight(ctx, sortedArcs.slice(0, prefixEnd[Pi]), config, hoveredChapter);
    }

    st.lastP = Pi;
    st.needsRebuild = false;
  }, [unfoldMode, playhead, width, arcHeight, sortedArcs, prefixEnd, tierVisibility, colorMode, theme, isPlaying, hoveredChapter, totalChapters]);

  // Playback loop — advance the playhead in chapters/second. Never autoplays
  // (only runs while isPlaying), and never runs under reduced motion.
  useEffect(() => {
    if (!unfoldMode || !isPlaying || reducedMotion) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayhead((p) => {
        const np = p + speed * dt;
        if (np >= totalChapters - 1) {
          setIsPlaying(false);
          return totalChapters - 1;
        }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [unfoldMode, isPlaying, speed, reducedMotion, totalChapters]);

  // ============================================================
  // Bar chart — normal (zoom-aware) and unfold (ghost future chapters).
  // ============================================================
  useEffect(() => {
    if (unfoldMode) return;
    const canvas = barCanvasRef.current;
    if (!canvas || !metadata || width === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = barHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
  }, [unfoldMode, metadata, width, barHeight, theme, viewStart, viewEnd, visibleChapters]);

  // Unfold bars: full view, played chapters solid, future chapters ghosted.
  useEffect(() => {
    if (!unfoldMode) return;
    const canvas = barCanvasRef.current;
    if (!canvas || !metadata || width === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = barHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    const Pi = Math.max(0, Math.min(totalChapters - 1, Math.floor(playhead)));
    const chapterWidth = width / totalChapters;

    ctx.clearRect(0, 0, width, barHeight);
    ctx.fillStyle = barFill;

    for (let i = 0; i < verseCounts.length; i++) {
      const x = (i / totalChapters) * width;
      const h = (verseCounts[i] / maxVerses) * barHeight;
      // Ghost the "not yet written" chapters; solid for the written prefix.
      ctx.globalAlpha = i <= Pi ? barOpacity : barOpacity * 0.22;
      ctx.fillRect(x, barHeight - h, Math.max(chapterWidth - 0.5, 0.5), h);
    }
    ctx.globalAlpha = 1;
  }, [unfoldMode, metadata, width, barHeight, theme, playhead, totalChapters]);

  // ============================================================
  // Mouse interaction on the arc canvas (hover / click).
  // ============================================================
  const handleMouseMove = useCallback((e) => {
    if (!metadata || width === 0 || isDragging) return;
    // While playing, hover is ignored (no competing redraw path).
    if (unfoldMode && isPlaying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Unfold uses the full view; normal mode uses the zoom/pan window.
    const chapter = unfoldMode
      ? Math.floor((x / width) * totalChapters)
      : Math.floor(viewStart + (x / width) * visibleChapters);
    setHoveredChapter(Math.min(Math.max(chapter, 0), totalChapters - 1));
  }, [metadata, width, setHoveredChapter, viewStart, visibleChapters, totalChapters, isDragging, unfoldMode, isPlaying]);

  const handleMouseLeave = useCallback(() => {
    setHoveredChapter(null);
  }, [setHoveredChapter]);

  const handleClick = useCallback((e) => {
    if (!metadata || width === 0 || isDragging || unfoldMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chapter = Math.floor(viewStart + (x / width) * visibleChapters);
    setSelectedChapter(Math.min(Math.max(chapter, 0), totalChapters - 1));
  }, [metadata, width, setSelectedChapter, viewStart, visibleChapters, totalChapters, isDragging, unfoldMode]);

  // ============================================================
  // Unfold controls — enter/exit, play/pause, speed, step, scrub.
  // ============================================================
  const enterUnfold = useCallback(() => {
    setZoomLevel(1);
    setPanOffset(0);
    setHoveredChapter(null);
    setSelectedChapter(null);
    setIsPlaying(false);
    setPlayhead(0);
    unfoldStateRef.current = { lastP: -1, needsRebuild: true };
    setUnfoldMode(true);
  }, [setHoveredChapter, setSelectedChapter]);

  const exitUnfold = useCallback(() => {
    setIsPlaying(false);
    setHoveredChapter(null);
    unfoldStateRef.current = { lastP: -1, needsRebuild: true };
    setUnfoldMode(false);
  }, [setHoveredChapter]);

  const clampPlayhead = useCallback(
    (v) => Math.max(0, Math.min(totalChapters - 1, v)),
    [totalChapters],
  );

  const stepChapter = useCallback((dir) => {
    setIsPlaying(false);
    setPlayhead((p) => clampPlayhead(Math.floor(p) + dir));
  }, [clampPlayhead]);

  const stepBook = useCallback((dir) => {
    setIsPlaying(false);
    setPlayhead((p) => {
      const Pi = Math.floor(p);
      if (dir > 0) {
        const next = bookStarts.find((s) => s > Pi);
        return next != null ? next : totalChapters - 1;
      }
      for (let i = bookStarts.length - 1; i >= 0; i--) {
        if (bookStarts[i] < Pi) return bookStarts[i];
      }
      return 0;
    });
  }, [bookStarts, totalChapters]);

  const togglePlay = useCallback(() => {
    if (reducedMotion) return;
    setPlayhead((p) => (p >= totalChapters - 1 ? 0 : p)); // replay from start if at end
    setIsPlaying((v) => !v);
  }, [reducedMotion, totalChapters]);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((i) => (i + 1) % UNFOLD_SPEEDS.length);
  }, []);

  // Keyboard: Space = play/pause, arrows = step chapter, shift+arrows = step book.
  useEffect(() => {
    if (!unfoldMode) return undefined;
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) stepBook(1); else stepChapter(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) stepBook(-1); else stepChapter(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unfoldMode, togglePlay, stepChapter, stepBook]);

  // Track scrubbing — throttled to one playhead update per animation frame.
  const trackRef = useRef(null);
  const scrubbingRef = useRef(false);
  const pendingFracRef = useRef(null);
  const scrubRafRef = useRef(0);

  const applyPendingScrub = useCallback(() => {
    scrubRafRef.current = 0;
    if (pendingFracRef.current == null) return;
    const frac = pendingFracRef.current;
    pendingFracRef.current = null;
    setPlayhead(clampPlayhead(frac * (totalChapters - 1)));
  }, [clampPlayhead, totalChapters]);

  const scheduleScrub = useCallback((frac) => {
    pendingFracRef.current = frac;
    if (!scrubRafRef.current) {
      scrubRafRef.current = requestAnimationFrame(applyPendingScrub);
    }
  }, [applyPendingScrub]);

  const fracFromEvent = useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const onTrackPointerDown = useCallback((e) => {
    setIsPlaying(false);
    scrubbingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    scheduleScrub(fracFromEvent(e));
  }, [fracFromEvent, scheduleScrub]);

  const onTrackPointerMove = useCallback((e) => {
    if (!scrubbingRef.current) return;
    scheduleScrub(fracFromEvent(e));
  }, [fracFromEvent, scheduleScrub]);

  const onTrackPointerUp = useCallback((e) => {
    scrubbingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  if (!references || !metadata) {
    return <div className="arc__placeholder">Loading arc diagram...</div>;
  }

  // Visible books for axis labels
  const visibleBooks = metadata.books.filter((book) => {
    const bookStart = book.chapterDetails[0].globalIndex;
    const bookEnd = book.chapterDetails[book.chapterDetails.length - 1].globalIndex;
    return bookEnd >= viewStart && bookStart <= viewEnd;
  });

  const Pi = Math.max(0, Math.min(totalChapters - 1, Math.floor(playhead)));
  const playedFrac = Pi / (totalChapters - 1);
  const testamentFrac = ntStart / (totalChapters - 1);
  const posLabel = chapterMeta && chapterMeta[Pi]
    ? `${chapterMeta[Pi].bookName} ${chapterMeta[Pi].chapter}`
    : '';

  return (
    <div ref={containerRef} className="arc">
      {/* Unfold toggle pill (top-left) */}
      <button
        type="button"
        className={`arc__unfold-toggle${unfoldMode ? ' is-active' : ''}`}
        onClick={unfoldMode ? exitUnfold : enterUnfold}
        aria-pressed={unfoldMode}
        title="Play the canon accumulating in canonical order"
      >
        <span className="arc__unfold-toggle-glyph" aria-hidden="true">◷</span>
        {unfoldMode ? 'Unfolding' : 'Unfold'}
      </button>

      {/* Zoom indicator (hidden in Unfold mode — zoom is reset & disabled) */}
      {!unfoldMode && zoomLevel > 1 && (
        <div className="arc__zoom-badge">
          <span>{zoomLevel.toFixed(1)}x</span>
          <button
            type="button"
            onClick={() => { setZoomLevel(1); setPanOffset(0); }}
            className="arc__reset-btn"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="arc__canvas"
        style={{
          height: arcHeight,
          cursor: unfoldMode ? 'default' : (zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'),
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      />

      {/* Unfold scrubber overlay */}
      {unfoldMode && (
        <div className="unfold-scrubber">
          <div
            ref={trackRef}
            className="unfold-track"
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
            role="slider"
            aria-label="Playhead — canonical chapter"
            aria-valuemin={1}
            aria-valuemax={totalChapters}
            aria-valuenow={Pi + 1}
            aria-valuetext={`${posLabel}, chapter ${Pi + 1} of ${totalChapters}`}
            tabIndex={0}
          >
            <div className="unfold-track__rail" />
            <div className="unfold-track__played" style={{ width: `${playedFrac * 100}%` }} />
            <div className="unfold-track__testament" style={{ left: `${testamentFrac * 100}%` }} title="Old Testament / New Testament boundary" />
            <div className="unfold-track__playhead" style={{ left: `${playedFrac * 100}%` }} />
          </div>

          <div className="unfold-controls">
            <button
              type="button"
              className="unfold-pill unfold-pill--play"
              onClick={togglePlay}
              disabled={reducedMotion}
              title={reducedMotion ? 'Playback disabled (reduced motion) — scrub or use arrow keys' : 'Play / pause (Space)'}
            >
              <span className="unfold-pill__glyph" aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="unfold-pill"
              onClick={cycleSpeed}
              disabled={reducedMotion}
              title="Playback speed (chapters per second)"
            >
              {speed} ch/s
            </button>
            <span className="unfold-controls__spacer" />
            <span className="unfold-position">
              {posLabel}
              {' '}
              <span className="unfold-position__ordinal">
                — chapter {(Pi + 1).toLocaleString()} of {totalChapters.toLocaleString()}
              </span>
            </span>
            <span className="unfold-controls__spacer" />
            <button
              type="button"
              className="unfold-pill"
              onClick={exitUnfold}
              title="Exit Unfold mode"
            >
              Exit
            </button>
          </div>

          <div className="unfold-microcopy">
            canonical order — reading order, not a dating claim
          </div>
        </div>
      )}

      {/* Book labels axis */}
      <div className="arc__axis" style={{ height: axisHeight }}>
        {visibleBooks.map((book) => {
          const startChapter = book.chapterDetails[0].globalIndex;
          const x = ((startChapter - viewStart) / visibleChapters) * 100;
          const isNTStart = book.num === 40;
          return (
            <span
              key={book.num}
              className={`arc__book-label${isNTStart ? ' arc__book-label--nt' : ''}`}
              style={{
                left: `${x}%`,
                fontSize: zoomLevel > 3 ? 10 : 8,
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
        className="arc__canvas"
        style={{ height: barHeight }}
      />
    </div>
  );
}
