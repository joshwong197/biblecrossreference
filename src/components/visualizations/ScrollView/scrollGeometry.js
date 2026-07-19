import * as THREE from 'three';
import { getTestamentPairKey } from '../../../utils/colorScales';

/* ------------------------------------------------------------------ *
 * Helix layout + chord geometry helpers for ScrollView ("The Scroll").
 *
 * The concept: the Bible is a line of 1,189 chapters (global index 0 = Gen 1
 * … 1188 = Rev 22). We coil that line into a helix of HELIX_TURNS turns —
 * Genesis at the top, Revelation at the bottom. Every cross-reference is a
 * CHORD through the open interior: a quadratic bezier from chapter i to
 * chapter j whose control point is pulled toward the central axis at the
 * average height. Depth = canonical sequence. Side-on the coil echoes the
 * Arc diagram; sighted down the axis the chords project into a rose window.
 * ------------------------------------------------------------------ */

export const HELIX_TURNS = 7;      // ~7 turns coils the 1,189-chapter line
export const HELIX_RADIUS = 3;     // coil radius (world units)
export const HELIX_HEIGHT = 12;    // top (y=+6, Genesis) to bottom (y=-6, Rev)

// Control-point radius as a fraction of HELIX_RADIUS: the chord midpoint is
// pulled in toward the axis to ~0.15R, so chords cut through the interior
// rather than hugging the coil surface.
const AXIS_PULL = 0.15;

// Segments per chord. Fixed and low (calm 3D): 8 gives a smooth curve while
// keeping the merged buffers small. vertsPerChord = CHORD_SEGMENTS * 2.
export const CHORD_SEGMENTS = 8;

// ponytail: one hard ceiling on how many chords we upload to the GPU. Calmer
// than the globe's 60k — the prior 3D view's feedback was "too intense", so we
// err quiet. When the enabled tiers exceed this budget we fill tiers 1..5 in
// order, so tier 5 (the weak "shared vocabulary" class) drops first, then tier
// 4, and a direct quotation never loses its chord to a vocabulary coincidence.
// Within the tier that overflows we keep the strongest `votes`. Deterministic,
// so the picture is stable across re-renders. The UI surfaces a note whenever
// the cap engages.
export const MAX_CHORDS_RENDERED = 30000;

/** Vector3 position of a chapter (0-based global index) on the helix. */
export function getChapterPosition(index, totalChapters, radius = HELIX_RADIUS, height = HELIX_HEIGHT) {
  const t = totalChapters > 1 ? index / (totalChapters - 1) : 0;
  const theta = t * Math.PI * 2 * HELIX_TURNS;
  return new THREE.Vector3(
    radius * Math.cos(theta),
    height * (0.5 - t),
    radius * Math.sin(theta),
  );
}

/** Flat Float32Array [x,y,z, ...] of every chapter position (built once). */
export function computeChapterPositions(totalChapters, radius = HELIX_RADIUS, height = HELIX_HEIGHT) {
  const arr = new Float32Array(totalChapters * 3);
  const denom = totalChapters > 1 ? totalChapters - 1 : 1;
  for (let i = 0; i < totalChapters; i++) {
    const t = i / denom;
    const theta = t * Math.PI * 2 * HELIX_TURNS;
    arr[i * 3] = radius * Math.cos(theta);
    arr[i * 3 + 1] = height * (0.5 - t);
    arr[i * 3 + 2] = radius * Math.sin(theta);
  }
  return arr;
}

/** Map each global chapter index -> { bookNum, bookName, chapter, isOT }. */
export function buildChapterIndex(metadata) {
  const arr = new Array(metadata.totalChapters);
  for (const book of metadata.books) {
    const isOT = book.testament === 'OT';
    for (const cd of book.chapterDetails) {
      arr[cd.globalIndex] = { bookNum: book.num, bookName: book.name, chapter: cd.chapter, isOT };
    }
  }
  return arr;
}

/**
 * Pick which chords to render under the MAX_CHORDS_RENDERED ceiling.
 * Lower tiers are kept whole first; the tier that overflows the remaining
 * budget keeps its strongest `votes`. Returns the flat chord list plus counts
 * so the UI can show a "showing strongest N of M" note.
 */
export function selectVisibleChords(references, tierVisibility) {
  const byTier = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  let totalEnabled = 0;
  for (const r of references) {
    if (tierVisibility[r.tier]) {
      byTier[r.tier].push(r);
      totalEnabled++;
    }
  }

  const chords = [];
  let budget = MAX_CHORDS_RENDERED;
  for (const tier of [1, 2, 3, 4, 5]) {
    const bucket = byTier[tier];
    if (!bucket.length || budget <= 0) continue;
    if (bucket.length <= budget) {
      for (const r of bucket) chords.push(r);
      budget -= bucket.length;
    } else {
      const kept = bucket.slice().sort((a, b) => b.votes - a.votes).slice(0, budget);
      for (const r of kept) chords.push(r);
      budget = 0;
    }
  }

  return { chords, totalEnabled, shown: chords.length, capped: chords.length < totalEnabled };
}

/** Group selected chords by tier (color mode 'tier') or testament pair. */
export function groupChords(chords, colorMode) {
  const groups = new Map();
  for (const r of chords) {
    const key = colorMode === 'testament' ? getTestamentPairKey(r.fromBook, r.toBook) : r.tier;
    let g = groups.get(key);
    if (!g) {
      g = { key, tier: r.tier, refs: [] };
      groups.set(key, g);
    }
    g.refs.push(r);
  }
  return [...groups.values()];
}

/**
 * Build one merged lineSegments BufferGeometry for a list of chords.
 * Each chord is a quadratic bezier from chapter `from` to chapter `to` whose
 * control point sits near the central axis (radius AXIS_PULL * HELIX_RADIUS)
 * at the average height of the two endpoints — so the chord dives through the
 * open interior. No per-point Vector3 allocation; everything is scalar into
 * typed arrays. If `colorForTier` (tier -> THREE.Color) is supplied a
 * per-vertex color attribute is added so one draw call can carry mixed tier
 * colors (used for the highlight overlay).
 */
export function buildChordGeometry(refs, positions, radius = HELIX_RADIUS, colorForTier) {
  const n = refs.length;
  const seg = CHORD_SEGMENTS;
  const vertCount = n * seg * 2;

  const out = new Float32Array(vertCount * 3);
  const colors = colorForTier ? new Float32Array(vertCount * 3) : null;
  const ctrlR = radius * AXIS_PULL;
  let o = 0;

  for (let i = 0; i < n; i++) {
    const r = refs[i];
    const ai = r.from * 3;
    const bi = r.to * 3;
    const ax = positions[ai], ay = positions[ai + 1], az = positions[ai + 2];
    const bx = positions[bi], by = positions[bi + 1], bz = positions[bi + 2];

    // Control point: pull the midpoint toward the axis. Direction is the
    // averaged xz (radial) direction of the two endpoints; when they sit on
    // opposite sides of the coil that averages to ~0, so we drop the control
    // straight onto the axis (0,·,0). Height is the average of the endpoints.
    const dx = ax + bx;
    const dz = az + bz;
    const dl = Math.sqrt(dx * dx + dz * dz);
    let cx, cz;
    if (dl < 1e-6) {
      cx = 0; cz = 0;
    } else {
      const k = ctrlR / dl;
      cx = dx * k; cz = dz * k;
    }
    const cy = (ay + by) / 2;

    let cr = 0, cg = 0, cb = 0;
    if (colors) {
      const col = colorForTier(r.tier);
      cr = col.r; cg = col.g; cb = col.b;
    }

    let px = ax, py = ay, pz = az;
    for (let s = 1; s <= seg; s++) {
      const t = s / seg;
      const mt = 1 - t;
      const a0 = mt * mt, a1 = 2 * mt * t, a2 = t * t;
      const qx = a0 * ax + a1 * cx + a2 * bx;
      const qy = a0 * ay + a1 * cy + a2 * by;
      const qz = a0 * az + a1 * cz + a2 * bz;

      out[o] = px; out[o + 1] = py; out[o + 2] = pz;
      out[o + 3] = qx; out[o + 4] = qy; out[o + 5] = qz;
      if (colors) {
        colors[o] = cr; colors[o + 1] = cg; colors[o + 2] = cb;
        colors[o + 3] = cr; colors[o + 4] = cg; colors[o + 5] = cb;
      }
      o += 6;

      px = qx; py = qy; pz = qz;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3));
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** BufferGeometry for the faint continuous coil line (a polyline strip). */
export function buildCoilGeometry(positions) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

/**
 * BufferGeometry for a thin ring around the coil at a given chapter's height —
 * used to mark the OT/NT boundary (index 929 = Matthew 1). A closed circle of
 * radius HELIX_RADIUS at that y.
 */
export function buildBoundaryRing(index, totalChapters, radius = HELIX_RADIUS, height = HELIX_HEIGHT) {
  const denom = totalChapters > 1 ? totalChapters - 1 : 1;
  const y = height * (0.5 - index / denom);
  const pts = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    pts.push(new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta)));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}
