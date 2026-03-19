import { TIER_COLORS_DARK, TIER_COLORS_LIGHT, TESTAMENT_COLORS_DARK, TESTAMENT_COLORS_LIGHT, hexToRgba, getTestamentPairKey } from '../../../utils/colorScales';

export function renderArcs(ctx, arcs, config) {
  const {
    width,
    height,
    tierVisibility,
    colorMode,
    theme,
    hoveredChapter,
    selectedChapter,
    totalChapters,
    viewStart = 0,
    viewEnd = totalChapters,
  } = config;

  const baseline = height * 0.95;
  const maxArcHeight = height * 0.9;
  const baseOpacity = theme === 'dark' ? 0.25 : 0.35;
  const visibleChapters = viewEnd - viewStart;

  ctx.clearRect(0, 0, width, height);

  // Filter by tier visibility
  const visibleArcs = arcs.filter((a) => tierVisibility[a.tier]);

  // Filter by viewport (skip arcs fully outside visible range)
  const viewportArcs = visibleChapters < totalChapters
    ? visibleArcs.filter((a) => {
        const minCh = Math.min(a.from, a.to);
        const maxCh = Math.max(a.from, a.to);
        return maxCh >= viewStart && minCh <= viewEnd;
      })
    : visibleArcs;

  const highlightChapter = hoveredChapter ?? selectedChapter;

  if (colorMode === 'testament') {
    renderByTestament(ctx, viewportArcs, { width, baseline, maxArcHeight, baseOpacity, theme, highlightChapter, totalChapters, viewStart, visibleChapters });
  } else {
    renderByTier(ctx, viewportArcs, { width, baseline, maxArcHeight, baseOpacity, theme, highlightChapter, totalChapters, viewStart, visibleChapters });
  }
}

function renderByTier(ctx, arcs, config) {
  const { width, baseline, maxArcHeight, baseOpacity, theme, highlightChapter, totalChapters, viewStart, visibleChapters } = config;
  const tierColors = theme === 'dark' ? TIER_COLORS_DARK : TIER_COLORS_LIGHT;
  const tiers = [5, 4, 3, 2, 1];

  for (const tier of tiers) {
    const tierArcs = arcs.filter((a) => a.tier === tier);
    if (tierArcs.length === 0) continue;

    const color = tierColors[tier];
    renderArcGroup(ctx, tierArcs, color, { width, baseline, maxArcHeight, baseOpacity, highlightChapter, totalChapters, viewStart, visibleChapters });
  }
}

function renderByTestament(ctx, arcs, config) {
  const { width, baseline, maxArcHeight, baseOpacity, theme, highlightChapter, totalChapters, viewStart, visibleChapters } = config;
  const testamentColors = theme === 'dark' ? TESTAMENT_COLORS_DARK : TESTAMENT_COLORS_LIGHT;

  // Group by testament pair
  const groups = { 'cross': [], 'OT-OT': [], 'NT-NT': [] };
  for (const arc of arcs) {
    const key = getTestamentPairKey(arc.fromBook, arc.toBook);
    groups[key].push(arc);
  }

  // Draw order: cross first (background), then OT-OT, then NT-NT
  for (const key of ['cross', 'OT-OT', 'NT-NT']) {
    if (groups[key].length === 0) continue;
    renderArcGroup(ctx, groups[key], testamentColors[key], { width, baseline, maxArcHeight, baseOpacity, highlightChapter, totalChapters, viewStart, visibleChapters });
  }
}

function renderArcGroup(ctx, arcs, color, config) {
  const { width, baseline, maxArcHeight, baseOpacity, highlightChapter, totalChapters, viewStart, visibleChapters } = config;

  if (highlightChapter !== null && highlightChapter !== undefined) {
    // Dim arcs (not connected to highlight chapter)
    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(color, baseOpacity * 0.1);
    ctx.lineWidth = 0.5;
    for (const arc of arcs) {
      if (arc.from === highlightChapter || arc.to === highlightChapter) continue;
      drawArc(ctx, arc, width, baseline, maxArcHeight, totalChapters, viewStart, visibleChapters);
    }
    ctx.stroke();

    // Highlighted arcs
    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(color, 0.8);
    ctx.lineWidth = 1.5;
    for (const arc of arcs) {
      if (arc.from !== highlightChapter && arc.to !== highlightChapter) continue;
      drawArc(ctx, arc, width, baseline, maxArcHeight, totalChapters, viewStart, visibleChapters);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(color, baseOpacity);
    ctx.lineWidth = 0.5;
    for (const arc of arcs) {
      drawArc(ctx, arc, width, baseline, maxArcHeight, totalChapters, viewStart, visibleChapters);
    }
    ctx.stroke();
  }
}

function drawArc(ctx, arc, width, baseline, maxArcHeight, totalChapters, viewStart, visibleChapters) {
  const x1 = ((arc.from - viewStart) / visibleChapters) * width;
  const x2 = ((arc.to - viewStart) / visibleChapters) * width;
  const distance = Math.abs(arc.to - arc.from);
  const controlY = baseline - (distance / totalChapters) * maxArcHeight;

  ctx.moveTo(x1, baseline);
  ctx.quadraticCurveTo((x1 + x2) / 2, controlY, x2, baseline);
}
