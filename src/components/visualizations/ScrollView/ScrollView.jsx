import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import useAppStore from '../../../stores/useAppStore';
import { TOTAL_CHAPTERS, OT_CHAPTERS } from '../../../constants/books';
import { bookByNum, bookSlug } from '../../../utils/bookSlug';
import ScrollLabels from './ScrollLabels';
import useVizTokens from './useVizTokens';
import {
  HELIX_RADIUS,
  HELIX_HEIGHT,
  getChapterPosition,
  computeChapterPositions,
  buildChapterIndex,
  selectVisibleChords,
  groupChords,
  buildChordGeometry,
  buildCoilGeometry,
  buildBoundaryRing,
} from './scrollGeometry';
import './ScrollView.css';

// Per-tier opacity relative to the token base (--arc-base-opacity): tier 1 the
// most present, tier 5 the faintest. Graded so the strong connections read
// first — but overall calmer than the globe (the prior 3D view read "too
// intense"), reinforced by the lower chord cap in scrollGeometry.
const TIER_OPACITY_MULT = { 1: 1.55, 2: 1.25, 3: 0.95, 4: 0.68, 5: 0.46 };

// Camera presets (world positions; target is always the origin).
const DEFAULT_CAM = [8, 4.5, 13]; // gentle 3/4 view of the whole coil
const PRESETS = {
  side: [0, 0, 15],        // side elevation — echoes the Arc diagram
  axis: [0, 14, 0.001],    // down the axis — chords project into a rose window
};
const PRESET_MS = 800;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ *
 * Chapter points — clickable. event.index is the global chapter index.
 * Subtle marks riding the coil; testament-colored.
 * ------------------------------------------------------------------ */
function ChapterPoints({ positions, otChapters, tokens, selected, onSelect }) {
  const geometry = useMemo(() => {
    const total = positions.length / 3;
    const colors = new Float32Array(total * 3);
    const ot = new THREE.Color(tokens.ot);
    const nt = new THREE.Color(tokens.nt);
    for (let i = 0; i < total; i++) {
      const c = i < otChapters ? ot : nt;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, otChapters, tokens.ot, tokens.nt]);

  return (
    <points
      geometry={geometry}
      onClick={(e) => { e.stopPropagation(); onSelect(e.index); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <pointsMaterial
        size={selected == null ? 0.05 : 0.04}
        vertexColors
        sizeAttenuation
        transparent
        opacity={selected == null ? 0.75 : 0.35}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 * Chords — merged geometry per tier/testament group (<=5 draw calls).
 * Dark: additive blending -> overlaps glow on near-black. Light: normal
 * blending with a higher base opacity so chords hold up on #FAFAFA.
 * ------------------------------------------------------------------ */
function Chords({ positions, tokens, selected, onCapInfo }) {
  const references = useAppStore((s) => s.references);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const colorMode = useAppStore((s) => s.colorMode);

  const { chords, capInfo } = useMemo(() => {
    const sel = selectVisibleChords(references, tierVisibility);
    return { chords: sel.chords, capInfo: { shown: sel.shown, total: sel.totalEnabled, capped: sel.capped } };
  }, [references, tierVisibility]);

  useEffect(() => { onCapInfo(capInfo); }, [capInfo, onCapInfo]);

  // Base group geometries — depend only on geometry inputs, NOT theme/selection.
  const groups = useMemo(() => {
    return groupChords(chords, colorMode).map((g) => ({
      key: g.key,
      tier: g.tier,
      geometry: buildChordGeometry(g.refs, positions, HELIX_RADIUS),
    }));
  }, [chords, colorMode, positions]);

  // Highlight overlay — only chords touching the selected chapter, mixed colors
  // in one draw call. Rebuilds only when the selection changes.
  const highlight = useMemo(() => {
    if (selected == null) return null;
    const touching = chords.filter((r) => r.from === selected || r.to === selected);
    if (!touching.length) return null;
    const tierColor = new Map();
    const colorFor = (tier) => {
      let c = tierColor.get(tier);
      if (!c) { c = new THREE.Color(tokens.tier[tier]); tierColor.set(tier, c); }
      return c;
    };
    return buildChordGeometry(touching, positions, HELIX_RADIUS, colorFor);
  }, [selected, chords, positions, tokens]);

  const dimmed = selected != null;
  const blending = tokens.isDark ? THREE.AdditiveBlending : THREE.NormalBlending;

  return (
    <group>
      {groups.map((g) => {
        const color = colorMode === 'testament' ? tokens.testament[g.key] : tokens.tier[g.tier];
        const mult = colorMode === 'testament' ? 1 : (TIER_OPACITY_MULT[g.tier] ?? 1);
        let opacity = tokens.baseOpacity * mult;
        if (dimmed) opacity *= 0.12;
        opacity = Math.max(0.03, Math.min(0.9, opacity));
        return (
          <lineSegments key={`${g.key}-${tokens.isDark}`} geometry={g.geometry}>
            <lineBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              blending={blending}
              depthWrite={false}
              toneMapped={false}
            />
          </lineSegments>
        );
      })}

      {highlight && (
        <lineSegments key={`hl-${tokens.isDark}`} geometry={highlight}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={tokens.isDark ? 0.9 : 0.95}
            blending={blending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The coil itself: a faint continuous polyline through every chapter.
 * ------------------------------------------------------------------ */
function Coil({ positions, tokens }) {
  const geometry = useMemo(() => buildCoilGeometry(positions), [positions]);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={tokens.ink3} transparent opacity={0.55} toneMapped={false} />
    </line>
  );
}

/* ------------------------------------------------------------------ *
 * OT/NT boundary: a thin gold ring around the coil at index 929 (Matt 1).
 * ------------------------------------------------------------------ */
function BoundaryRing({ totalChapters, otChapters, tokens }) {
  const geometry = useMemo(
    () => buildBoundaryRing(otChapters, totalChapters, HELIX_RADIUS, HELIX_HEIGHT),
    [totalChapters, otChapters],
  );
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={tokens.accent} transparent opacity={0.55} toneMapped={false} />
    </line>
  );
}

/* ------------------------------------------------------------------ *
 * Selection marker on the selected chapter point.
 * ------------------------------------------------------------------ */
function SelectionMarker({ positions, selected, tokens }) {
  if (selected == null) return null;
  const i = selected * 3;
  return (
    <mesh position={[positions[i], positions[i + 1], positions[i + 2]]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color={tokens.accent} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Α / Ω end caps at the top (Genesis 1) and bottom (Revelation 22).
 * Quiet — ink-3, per DESIGN.md.
 * ------------------------------------------------------------------ */
function EndCaps({ totalChapters, tokens }) {
  const genPos = useMemo(() => getChapterPosition(0, totalChapters, HELIX_RADIUS), [totalChapters]);
  const revPos = useMemo(() => getChapterPosition(totalChapters - 1, totalChapters, HELIX_RADIUS), [totalChapters]);

  const cap = (pos, label, title) => (
    <Html
      position={[pos.x, pos.y + (label === 'Α' ? 0.9 : -0.9), pos.z]}
      center
      distanceFactor={13}
      style={{ pointerEvents: 'none' }}
    >
      <div className="scroll-endcap" title={title} style={{ color: tokens.ink3, borderColor: tokens.ink3, background: `${tokens.vizBg}D9` }}>
        {label}
      </div>
    </Html>
  );

  return (
    <group>
      {cap(genPos, 'Α', 'Genesis 1 — the beginning')}
      {cap(revPos, 'Ω', 'Revelation 22 — the end')}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * OrbitControls + camera presets + idle auto-rotate.
 * - Presets animate over PRESET_MS with an ease (instant under reduced motion).
 * - Slow idle auto-rotate (~60s/rev) runs until the FIRST user interaction,
 *   then stops permanently. Never runs under reduced motion.
 * - OrbitControls damping; panning disabled; no roll.
 * ------------------------------------------------------------------ */
function CameraRig({ reduced, presetApiRef }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const anim = useRef(null);        // { from: Vector3, to: Vector3, start: number }
  const interacted = useRef(false); // permanently true after first interaction

  // Expose a preset trigger to the parent via the passed ref object.
  useEffect(() => {
    presetApiRef.current = (name) => {
      const p = PRESETS[name];
      if (!p) return;
      interacted.current = true; // using a preset counts as interaction
      const to = new THREE.Vector3(p[0], p[1], p[2]);
      if (reduced) {
        camera.position.copy(to);
        camera.lookAt(0, 0, 0);
        controlsRef.current?.update();
        return;
      }
      anim.current = { from: camera.position.clone(), to, start: performance.now() };
    };
  }, [reduced, camera, presetApiRef]);

  // First real drag/zoom stops auto-rotate for good and cancels any preset anim.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const onStart = () => { interacted.current = true; anim.current = null; };
    c.addEventListener('start', onStart);
    return () => c.removeEventListener('start', onStart);
  }, []);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.autoRotate = !reduced && !interacted.current && !anim.current;

    if (anim.current) {
      const a = anim.current;
      let p = (performance.now() - a.start) / PRESET_MS;
      if (p >= 1) p = 1;
      const e = easeInOutCubic(p);
      camera.position.lerpVectors(a.from, a.to, e);
      camera.lookAt(0, 0, 0);
      if (p >= 1) { anim.current = null; c.update(); }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!reduced}
      dampingFactor={0.08}
      autoRotateSpeed={1.0}   /* ~60s per revolution at 60fps */
      rotateSpeed={0.65}
      zoomSpeed={0.7}
      minDistance={6}
      maxDistance={30}
      enablePan={false}
    />
  );
}

/* ------------------------------------------------------------------ */
export default function ScrollView() {
  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const selectedChapter = useAppStore((s) => s.selectedChapter);
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter);
  const tokens = useVizTokens();
  const reduced = usePrefersReducedMotion();
  const presetApiRef = useRef(null);
  const [capInfo, setCapInfo] = useState({ shown: 0, total: 0, capped: false });

  // Selection is the shared store selectedChapter — the ?ch= deep link sets it
  // (VisualizationPage), ReferencePanel opens from it, and clicking a chapter
  // point writes it. Clamp to a valid index for the geometry lookups.
  const selected = useMemo(() => {
    const ch = selectedChapter;
    return Number.isInteger(ch) && ch >= 0 && ch < TOTAL_CHAPTERS ? ch : null;
  }, [selectedChapter]);

  const positions = useMemo(
    () => (metadata ? computeChapterPositions(metadata.totalChapters, HELIX_RADIUS, HELIX_HEIGHT) : null),
    [metadata],
  );
  const chapterIndex = useMemo(() => (metadata ? buildChapterIndex(metadata) : null), [metadata]);

  // ref count for the selected chapter (visible tiers only)
  const selectedRefCount = useMemo(() => {
    if (selected == null || !references) return 0;
    let n = 0;
    for (const r of references) {
      if (!tierVisibility[r.tier]) continue;
      if (r.from === selected || r.to === selected) n++;
    }
    return n;
  }, [selected, references, tierVisibility]);

  if (!references || !metadata || !positions) {
    return <div className="scroll-loading">Loading the scroll…</div>;
  }

  const card = selected != null && chapterIndex[selected] ? chapterIndex[selected] : null;
  const cardBook = card ? bookByNum(card.bookNum) : null;

  return (
    <div className="scroll-root">
      <Canvas
        camera={{ position: DEFAULT_CAM, fov: 45 }}
        style={{ background: tokens.vizBg }}
        raycaster={{ params: { Points: { threshold: 0.12 } } }}
        onPointerMissed={() => setSelectedChapter(null)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[8, 10, 6]} intensity={0.5} />
        <Coil positions={positions} tokens={tokens} />
        <BoundaryRing totalChapters={metadata.totalChapters} otChapters={metadata.otChapters ?? OT_CHAPTERS} tokens={tokens} />
        <ChapterPoints
          positions={positions}
          otChapters={metadata.otChapters ?? OT_CHAPTERS}
          tokens={tokens}
          selected={selected}
          onSelect={setSelectedChapter}
        />
        <Chords
          positions={positions}
          tokens={tokens}
          selected={selected}
          onCapInfo={setCapInfo}
        />
        <SelectionMarker positions={positions} selected={selected} tokens={tokens} />
        <EndCaps totalChapters={metadata.totalChapters} tokens={tokens} />
        <ScrollLabels metadata={metadata} getPosition={getChapterPosition} radius={HELIX_RADIUS} tokens={tokens} />
        <CameraRig reduced={reduced} presetApiRef={presetApiRef} />
      </Canvas>

      {/* Camera preset buttons — quiet chips in the canvas corner. */}
      <div className="scroll-presets">
        <button type="button" className="scroll-preset" onClick={() => presetApiRef.current?.('side')}>Side</button>
        <button type="button" className="scroll-preset" onClick={() => presetApiRef.current?.('axis')}>Axis</button>
      </div>

      {card && cardBook && (
        <div className="scroll-card" role="dialog" aria-label="Chapter details">
          <button className="scroll-card__close" onClick={() => setSelectedChapter(null)} aria-label="Close">×</button>
          <div className="scroll-card__eyebrow">{card.isOT ? 'Old Testament' : 'New Testament'}</div>
          <div className="scroll-card__title">{card.bookName} {card.chapter}</div>
          <div className="scroll-card__meta">
            <span className="scroll-card__count">{selectedRefCount}</span> cross-reference{selectedRefCount === 1 ? '' : 's'} in view
          </div>
          <Link className="scroll-card__link" to={`/read/${bookSlug(cardBook)}/${card.chapter}`}>
            Open in Reader →
          </Link>
        </div>
      )}

      <div className="scroll-hint">
        {capInfo.capped
          ? `Showing strongest ${capInfo.shown.toLocaleString()} of ${capInfo.total.toLocaleString()} chords · click a chapter to focus`
          : 'Drag to rotate · scroll to zoom · click a chapter to focus'}
      </div>
    </div>
  );
}
