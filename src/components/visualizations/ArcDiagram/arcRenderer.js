import { TIER_COLORS_DARK, TIER_COLORS_LIGHT, TESTAMENT_COLORS_DARK, TESTAMENT_COLORS_LIGHT, hexToRgba, getTestamentPairKey } from '../../../utils/colorScales';

/**
 * Two-layer rendering: renderBase draws every visible arc (expensive, ~55k
 * curves — cached to an offscreen canvas by the component), renderHighlight
 * draws only the arcs touching one chapter (cheap, runs on every hover).
 */

function getVisibleArcs(arcs, config) {
  const { tierVisibility, totalChapters, viewStart, viewEnd } = config;
  const visibleChapters = viewEnd - viewStart;

  const tierFiltered = arcs.filter((a) => tierVisibility[a.tier]);
  if (visibleChapters >= totalChapters) return tierFiltered;
  return tierFiltered.filter((a) => {
    const minCh = Math.min(a.from, a.to);
    const maxCh = Math.max(a.from, a.to);
    return maxCh >= viewStart && minCh <= viewEnd;
  });
}

/** Group arcs by draw color, in back-to-front draw order. */
function groupArcs(arcs, { colorMode, theme }) {
  if (colorMode === 'testament') {
    const colors = theme === 'dark' ? TESTAMENT_COLORS_DARK : TESTAMENT_COLORS_LIGHT;
    const groups = { cross: [], 'OT-OT': [], 'NT-NT': [] };
    for (const arc of arcs) {
      groups[getTestamentPairKey(arc.fromBook, arc.toBook)].push(arc);
    }
    return ['cross', 'OT-OT', 'NT-NT']
      .filter((key) => groups[key].length > 0)
      .map((key) => ({ color: colors[key], arcs: groups[key] }));
  }

  const colors = theme === 'dark' ? TIER_COLORS_DARK : TIER_COLORS_LIGHT;
  return [5, 4, 3, 2, 1]
    .map((tier) => ({ color: colors[tier], arcs: arcs.filter((a) => a.tier === tier) }))
    .filter((g) => g.arcs.length > 0);
}

/** Base stroke opacity for the faint "already drawn" arcs, per theme. */
function baseOpacityFor(theme) {
  return theme === 'dark' ? 0.25 : 0.35;
}

/**
 * Stroke a set of arcs, grouped by draw color, at a fixed opacity/width.
 * Shared by every render path — callers pass the exact arc set to draw
 * (no internal view/tier filtering), so it also serves incremental draws.
 */
function strokeArcGroups(ctx, arcs, config, opacity, lineWidth) {
  const { height } = config;
  const baseline = height * 0.95;
  const maxArcHeight = height * 0.9;

  const groups = groupArcs(arcs, config);
  for (const { color, arcs: groupArcsList } of groups) {
    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.lineWidth = lineWidth;
    for (const arc of groupArcsList) {
      drawArc(ctx, arc, config, baseline, maxArcHeight);
    }
    ctx.stroke();
  }
}

export function renderBase(ctx, arcs, config) {
  const { width, height, theme } = config;
  ctx.clearRect(0, 0, width, height);
  strokeArcGroups(ctx, getVisibleArcs(arcs, config), config, baseOpacityFor(theme), 0.5);
}

export function renderHighlight(ctx, arcs, config, highlightChapter) {
  const touching = getVisibleArcs(arcs, config).filter(
    (a) => a.from === highlightChapter || a.to === highlightChapter,
  );
  strokeArcGroups(ctx, touching, config, 0.8, 1.5);
}

/* ============================================================
   Unfold mode — time playback
   These take an already-tier-filtered, pre-sliced arc array (the
   component owns the sorted-by-max prefix index) and a full-view config
   (viewStart 0 .. viewEnd totalChapters), so no view/tier filtering
   happens here. renderUnfoldBase clears then paints the whole prefix;
   appendUnfoldArcs strokes only the newly-arrived arcs onto the persistent
   base WITHOUT clearing (the forward-playback fast path); renderUnfoldLanding
   paints the arriving chapter's arcs bright over the composite.
   ============================================================ */
export function renderUnfoldBase(ctx, arcs, config) {
  const { width, height, theme } = config;
  ctx.clearRect(0, 0, width, height);
  strokeArcGroups(ctx, arcs, config, baseOpacityFor(theme), 0.5);
}

export function appendUnfoldArcs(ctx, arcs, config) {
  strokeArcGroups(ctx, arcs, config, baseOpacityFor(config.theme), 0.5);
}

export function renderUnfoldLanding(ctx, arcs, config) {
  strokeArcGroups(ctx, arcs, config, 0.9, 1.6);
}

function drawArc(ctx, arc, config, baseline, maxArcHeight) {
  const { width, totalChapters, viewStart, viewEnd } = config;
  const visibleChapters = viewEnd - viewStart;
  const x1 = ((arc.from - viewStart) / visibleChapters) * width;
  const x2 = ((arc.to - viewStart) / visibleChapters) * width;
  const distance = Math.abs(arc.to - arc.from);
  const controlY = baseline - (distance / totalChapters) * maxArcHeight;

  ctx.moveTo(x1, baseline);
  ctx.quadraticCurveTo((x1 + x2) / 2, controlY, x2, baseline);
}
