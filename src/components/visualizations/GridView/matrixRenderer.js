import { hexToRgba } from '../../../utils/colorScales';

/**
 * Canvas renderer for the cross-reference heatmap. Mirrors the ArcDiagram
 * house style: a pure draw function, DPR handled by the caller, all colors
 * sampled from CSS custom properties at draw time (passed in as `colors`) so
 * the matrix redraws correctly on theme change.
 *
 * Encoding: tier-agnostic density. A single ink hue (which is legible on
 * --viz-bg in BOTH themes by construction) whose opacity is a log-scaled
 * function of the cell's ref count. The diagonal (self-references) is drawn
 * but de-emphasized. Tier color is never used here — it stays reserved for
 * the tooltip and the reference panel, per DESIGN.md.
 */

const MIN_ALPHA = 0.09;
const MAX_ALPHA = 0.95;

/**
 * Compute matrix layout (cell size + centered origin) for the given canvas
 * area. Kept separate so mouse hit-testing and drawing share one source.
 */
export function computeLayout(width, height, nRows, nCols, opts = {}) {
  const gutterLeft = opts.gutterLeft ?? 46;
  const gutterTop = opts.gutterTop ?? 44;
  const padRight = 14;
  const padBottom = 16;
  const usableW = Math.max(width - gutterLeft - padRight, 1);
  const usableH = Math.max(height - gutterTop - padBottom, 1);
  const cell = Math.max(Math.min(usableW / nCols, usableH / nRows), 1);
  const matrixW = cell * nCols;
  const matrixH = cell * nRows;
  const originX = gutterLeft + (usableW - matrixW) / 2;
  const originY = gutterTop + (usableH - matrixH) / 2;
  return { cell, originX, originY, matrixW, matrixH, gutterLeft, gutterTop };
}

/** Global chapter/book index at a mouse position, or null if outside the grid. */
export function cellAtPoint(layout, nRows, nCols, mx, my) {
  const { originX, originY, cell } = layout;
  const j = Math.floor((mx - originX) / cell);
  const i = Math.floor((my - originY) / cell);
  if (i < 0 || i >= nRows || j < 0 || j >= nCols) return null;
  return { i, j };
}

export function drawMatrix(ctx, config) {
  const {
    counts, maxOffDiag,
    nRows, nCols, layout, colors,
    rowLabels, colLabels,
    diagonalCell,       // (i,j)=>bool: is this a self-reference cell to de-emphasize
    testamentDivRow,    // draw a divider AFTER this row index (or null)
    testamentDivCol,
    hoverCell, cursorCell,
    width, height,
  } = config;

  const { cell, originX, originY } = layout;
  const scaleMax = Math.log1p(maxOffDiag || 1);
  const gap = cell >= 14 ? 1 : cell >= 7 ? 0.5 : 0;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.vizBg;
  ctx.fillRect(0, 0, width, height);

  // --- Cells ---
  for (let i = 0; i < nRows; i++) {
    const y = originY + i * cell;
    for (let j = 0; j < nCols; j++) {
      const c = counts[i * nCols + j];
      if (c === 0) continue;
      const t = scaleMax > 0 ? Math.log1p(c) / scaleMax : 1;
      let alpha = MIN_ALPHA + t * (MAX_ALPHA - MIN_ALPHA);
      const isDiag = diagonalCell(i, j);
      if (isDiag) alpha *= 0.28; // de-emphasize self-references
      if (alpha > 1) alpha = 1;
      ctx.fillStyle = hexToRgba(isDiag ? colors.ink3 : colors.ink, alpha);
      const x = originX + j * cell;
      ctx.fillRect(x + gap, y + gap, cell - gap * 2, cell - gap * 2);
    }
  }

  // --- Testament dividers ---
  ctx.lineWidth = 1;
  ctx.strokeStyle = hexToRgba(colors.ink2, 0.55);
  if (testamentDivCol != null) {
    const x = originX + (testamentDivCol + 1) * cell;
    ctx.beginPath();
    ctx.moveTo(x, originY);
    ctx.lineTo(x, originY + nRows * cell);
    ctx.stroke();
  }
  if (testamentDivRow != null) {
    const y = originY + (testamentDivRow + 1) * cell;
    ctx.beginPath();
    ctx.moveTo(originX, y);
    ctx.lineTo(originX + nCols * cell, y);
    ctx.stroke();
  }

  // --- Hover crosshair + cell outline ---
  const active = hoverCell || cursorCell;
  if (active) {
    // faint row/column band
    ctx.fillStyle = hexToRgba(colors.ink2, 0.08);
    ctx.fillRect(originX, originY + active.i * cell, nCols * cell, cell);
    ctx.fillRect(originX + active.j * cell, originY, cell, nRows * cell);
    // cell outline (accent for keyboard cursor, ink for pointer hover)
    ctx.lineWidth = 2;
    ctx.strokeStyle = cursorCell && !hoverCell
      ? hexToRgba(colors.accent, 0.95)
      : hexToRgba(colors.ink, 0.85);
    ctx.strokeRect(
      originX + active.j * cell + 0.5,
      originY + active.i * cell + 0.5,
      cell - 1,
      cell - 1,
    );
  }

  // --- Axis labels (skip labels that would collide) ---
  const labelPx = Math.min(11, Math.max(8, Math.round(cell * 0.72)));
  ctx.font = `${labelPx}px -apple-system, 'Segoe UI', system-ui, sans-serif`;
  const step = Math.max(1, Math.ceil((labelPx + 2) / cell));

  // Left (row) labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < nRows; i++) {
    const emphasized = active && active.i === i;
    if (i % step !== 0 && !emphasized) continue;
    ctx.fillStyle = emphasized ? colors.ink : colors.ink2;
    ctx.fillText(rowLabels[i], originX - 6, originY + i * cell + cell / 2);
  }

  // Top (column) labels, rotated to read upward
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let j = 0; j < nCols; j++) {
    const emphasized = active && active.j === j;
    if (j % step !== 0 && !emphasized) continue;
    ctx.save();
    ctx.translate(originX + j * cell + cell / 2, originY - 6);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = emphasized ? colors.ink : colors.ink2;
    ctx.fillText(colLabels[j], 0, 0);
    ctx.restore();
  }
}

// --- Ledger (book-level, direction-aware) renderer ---------------------------

const GROUND_MIN = 0.05;
const GROUND_MAX = 0.30;
const WARM_MIN = 0.16;
const WARM_MAX = 0.96;

/** Perceptual intensity in [0,1] for a cell, raw (log) or density (sqrt). */
function cellIntensity(count, i, j, maxRaw, maxDens, normalize, chapters) {
  if (count <= 0) return 0;
  if (normalize && chapters) {
    const dens = count / ((chapters[i] * chapters[j]) || 1);
    if (maxDens <= 0) return 0;
    const t = Math.sqrt(dens / maxDens);
    return t > 1 ? 1 : t;
  }
  if (maxRaw <= 0) return 0;
  const t = Math.log1p(count) / Math.log1p(maxRaw);
  return t > 1 ? 1 : t;
}

/**
 * Draw the 66x66 Ledger. `mode` = 'directed' plots the two layers (faint
 * symmetric kinship ground + oriented warm quote/allusion layer) and the
 * "who speaks / who is quoted" micro-labels + structural landmarks; 'symmetric'
 * collapses to a single-hue density heatmap that makes no direction claim.
 */
export function drawLedger(ctx, config) {
  const {
    mode, N, layout, colors, bookLabels,
    warmCount, warmTier, groundCount, symCount,
    maxWarmRaw, maxWarmDens, maxGroundRaw, maxGroundDens, maxSymRaw, maxSymDens,
    normalize, chapters,
    testamentDiv, hoverCell, cursorCell,
    showLandmarks, landmarks,
    width, height,
  } = config;

  const { cell, originX, originY } = layout;
  const gap = cell >= 14 ? 1 : cell >= 7 ? 0.5 : 0;
  const directed = mode === 'directed';

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.vizBg;
  ctx.fillRect(0, 0, width, height);

  const cellRect = (i, j) => {
    const x = originX + j * cell + gap;
    const y = originY + i * cell + gap;
    ctx.fillRect(x, y, cell - gap * 2, cell - gap * 2);
  };

  if (directed) {
    // Ground layer: faint symmetric kinship (tiers 3-5), lavender.
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const c = groundCount[i * N + j];
        if (c === 0) continue;
        const t = cellIntensity(c, i, j, maxGroundRaw, maxGroundDens, normalize, chapters);
        let alpha = GROUND_MIN + t * (GROUND_MAX - GROUND_MIN);
        if (i === j) alpha *= 0.4;
        ctx.fillStyle = hexToRgba(colors.tier4, alpha);
        cellRect(i, j);
      }
    }
    // Warm layer: oriented quotes/allusions (tiers 1-2), tier color by strength.
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const c = warmCount[i * N + j];
        if (c === 0) continue;
        const tier = warmTier[i * N + j];
        const t = cellIntensity(c, i, j, maxWarmRaw, maxWarmDens, normalize, chapters);
        let alpha = WARM_MIN + t * (WARM_MAX - WARM_MIN);
        if (i === j) alpha *= 0.5;
        const hue = tier === 1 ? colors.tier1 : colors.tier2;
        ctx.fillStyle = hexToRgba(hue, alpha);
        cellRect(i, j);
      }
    }
  } else {
    // Symmetric density: single ink hue, no direction claim.
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const c = symCount[i * N + j];
        if (c === 0) continue;
        const t = cellIntensity(c, i, j, maxSymRaw, maxSymDens, normalize, chapters);
        let alpha = 0.09 + t * (0.95 - 0.09);
        const isDiag = i === j;
        if (isDiag) alpha *= 0.28;
        ctx.fillStyle = hexToRgba(isDiag ? colors.ink3 : colors.ink, alpha);
        cellRect(i, j);
      }
    }
  }

  // --- Testament dividers ---
  ctx.lineWidth = 1;
  ctx.strokeStyle = hexToRgba(colors.ink2, 0.55);
  if (testamentDiv != null) {
    const x = originX + (testamentDiv + 1) * cell;
    const y = originY + (testamentDiv + 1) * cell;
    ctx.beginPath();
    ctx.moveTo(x, originY); ctx.lineTo(x, originY + N * cell);
    ctx.moveTo(originX, y); ctx.lineTo(originX + N * cell, y);
    ctx.stroke();
  }

  // --- Hover crosshair + cell outline ---
  const active = hoverCell || cursorCell;
  if (active) {
    ctx.fillStyle = hexToRgba(colors.ink2, 0.08);
    ctx.fillRect(originX, originY + active.i * cell, N * cell, cell);
    ctx.fillRect(originX + active.j * cell, originY, cell, N * cell);
    ctx.lineWidth = 2;
    ctx.strokeStyle = cursorCell && !hoverCell
      ? hexToRgba(colors.accent, 0.95)
      : hexToRgba(colors.ink, 0.85);
    ctx.strokeRect(
      originX + active.j * cell + 0.5,
      originY + active.i * cell + 0.5,
      cell - 1, cell - 1,
    );
  }

  // --- Landmarks (structural block labels; book-level only) ---
  if (directed && showLandmarks && landmarks) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 9.5px -apple-system, 'Segoe UI', system-ui, sans-serif`;
    for (const lm of landmarks) {
      const cx = originX + (lm.col + 0.5) * cell;
      const cy = originY + (lm.row + 0.5) * cell;
      ctx.save();
      if (lm.rotate) {
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(-cx, -cy);
      }
      // halo for legibility over cells
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = hexToRgba(colors.vizBg, 0.85);
      ctx.strokeText(lm.text, cx, cy);
      ctx.fillStyle = colors.ink3;
      ctx.fillText(lm.text, cx, cy);
      ctx.restore();
    }
  }

  // --- Axis labels: book abbrevs (stepped) ---
  const labelPx = Math.min(11, Math.max(8, Math.round(cell * 0.72)));
  ctx.font = `${labelPx}px -apple-system, 'Segoe UI', system-ui, sans-serif`;
  const step = Math.max(1, Math.ceil((labelPx + 2) / cell));
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < N; i++) {
    const emphasized = active && active.i === i;
    if (i % step !== 0 && !emphasized) continue;
    ctx.fillStyle = emphasized ? colors.ink : colors.ink2;
    ctx.fillText(bookLabels[i], originX - 6, originY + i * cell + cell / 2);
  }
  ctx.textAlign = 'left';
  for (let j = 0; j < N; j++) {
    const emphasized = active && active.j === j;
    if (j % step !== 0 && !emphasized) continue;
    ctx.save();
    ctx.translate(originX + j * cell + cell / 2, originY - 6);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = emphasized ? colors.ink : colors.ink2;
    ctx.fillText(bookLabels[j], 0, 0);
    ctx.restore();
  }

  // --- Direction micro-labels (only in directed mode) ---
  if (directed) {
    ctx.font = `600 10px -apple-system, 'Segoe UI', system-ui, sans-serif`;
    const matrixH = N * cell;
    const matrixW = N * cell;
    // "WHO IS QUOTED →" along the top, above the columns
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = colors.ink2;
    drawTracked(ctx, 'WHO IS QUOTED →', originX, originY - layout.gutterTop + 14, 0.12);
    // "WHO SPEAKS ↓" down the left, rotated
    ctx.save();
    const lx = originX - layout.gutterLeft + 13;
    ctx.translate(lx, originY);
    ctx.rotate(Math.PI / 2);
    drawTracked(ctx, 'WHO SPEAKS ↓', 0, 0, 0.12);
    ctx.restore();
    void matrixH; void matrixW;
  }
}

/** Draw uppercase micro-label text with manual letter-spacing (tracking). */
function drawTracked(ctx, text, x, y, emPerChar) {
  const size = 10;
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + size * emPerChar;
  }
}
