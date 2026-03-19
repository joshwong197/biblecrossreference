import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import useAppStore from '../../../stores/useAppStore';
import { TIER_COLORS_DARK, TIER_COLORS_LIGHT, TESTAMENT_COLORS_DARK, TESTAMENT_COLORS_LIGHT, getTestamentPairKey } from '../../../utils/colorScales';

const GLOBE_RADIUS = 5;
const ARC_SEGMENTS = 32;
const SPIRAL_TURNS = 4.5;

function getChapterPosition(index, totalChapters, otChapters, radius) {
  const t = index / (totalChapters - 1);

  // OT: north pole (+80°) → equator (0°)
  // NT: equator (0°) → south pole (-80°)
  let phi;
  if (index < otChapters) {
    const localT = index / otChapters;
    phi = (Math.PI / 2) * 0.89 * (1 - localT); // ~80° → 0°
  } else {
    const localT = (index - otChapters) / (totalChapters - otChapters);
    phi = -(Math.PI / 2) * 0.89 * localT; // 0° → ~-80°
  }

  const theta = t * Math.PI * 2 * SPIRAL_TURNS;

  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(theta)
  );
}

function ChapterPoints({ metadata }) {
  const theme = useAppStore((s) => s.theme);
  const pointsRef = useRef();

  const geometry = useMemo(() => {
    if (!metadata) return null;

    const positions = new Float32Array(metadata.totalChapters * 3);
    const colors = new Float32Array(metadata.totalChapters * 3);

    const otColor = new THREE.Color(theme === 'dark' ? '#4A90D9' : '#2B5C8A');
    const ntColor = new THREE.Color(theme === 'dark' ? '#E8675A' : '#B84A3E');

    for (let i = 0; i < metadata.totalChapters; i++) {
      const pos = getChapterPosition(i, metadata.totalChapters, metadata.otChapters, GLOBE_RADIUS);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const isNT = i >= metadata.otChapters;
      const color = isNT ? ntColor : otColor;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [metadata, theme]);

  if (!geometry) return null;

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial size={0.08} vertexColors sizeAttenuation />
    </points>
  );
}

function ArcLines({ references, metadata }) {
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const colorMode = useAppStore((s) => s.colorMode);
  const theme = useAppStore((s) => s.theme);
  const tierColors = theme === 'dark' ? TIER_COLORS_DARK : TIER_COLORS_LIGHT;
  const testamentColors = theme === 'dark' ? TESTAMENT_COLORS_DARK : TESTAMENT_COLORS_LIGHT;
  const groupRef = useRef();

  const lineGeometries = useMemo(() => {
    if (!references || !metadata) return [];

    const visibleRefs = references.filter(
      (r) => tierVisibility[r.tier] && r.tier <= 3
    );

    const maxArcs = 5000;
    const refs = visibleRefs.length > maxArcs
      ? visibleRefs.sort((a, b) => b.votes - a.votes).slice(0, maxArcs)
      : visibleRefs;

    // Group by color mode
    let groups;
    if (colorMode === 'testament') {
      groups = {};
      for (const ref of refs) {
        const key = getTestamentPairKey(ref.fromBook, ref.toBook);
        if (!groups[key]) groups[key] = { refs: [], color: new THREE.Color(testamentColors[key]) };
        groups[key].refs.push(ref);
      }
    } else {
      groups = {};
      for (const ref of refs) {
        const tier = ref.tier;
        if (!groups[tier]) groups[tier] = { refs: [], color: new THREE.Color(tierColors[tier]), tier };
        groups[tier].refs.push(ref);
      }
    }

    const result = [];

    for (const [key, group] of Object.entries(groups)) {
      const positions = [];

      for (const ref of group.refs) {
        const p1 = getChapterPosition(ref.from, metadata.totalChapters, metadata.otChapters, GLOBE_RADIUS);
        const p2 = getChapterPosition(ref.to, metadata.totalChapters, metadata.otChapters, GLOBE_RADIUS);

        const distance = Math.abs(ref.to - ref.from);
        const heightFactor = (distance / metadata.totalChapters) * 2 + 0.3;
        const midPoint = new THREE.Vector3()
          .addVectors(p1, p2)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(GLOBE_RADIUS + heightFactor);

        for (let s = 0; s < ARC_SEGMENTS; s++) {
          const t1 = s / ARC_SEGMENTS;
          const t2 = (s + 1) / ARC_SEGMENTS;

          const pt1 = quadBezier(p1, midPoint, p2, t1);
          const pt2 = quadBezier(p1, midPoint, p2, t2);

          positions.push(pt1.x, pt1.y, pt1.z, pt2.x, pt2.y, pt2.z);
        }
      }

      if (positions.length > 0) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3)
        );
        const tier = group.tier || 2;
        result.push({ geometry: geo, color: group.color, tier });
      }
    }

    return result;
  }, [references, metadata, tierVisibility, colorMode, tierColors, testamentColors]);

  return (
    <group ref={groupRef}>
      {lineGeometries.map((item, idx) => (
        <lineSegments key={idx} geometry={item.geometry}>
          <lineBasicMaterial
            color={item.color}
            transparent
            opacity={item.tier === 1 ? 0.6 : item.tier === 2 ? 0.4 : 0.25}
            linewidth={1}
          />
        </lineSegments>
      ))}
    </group>
  );
}

function quadBezier(p0, p1, p2, t) {
  const mt = 1 - t;
  return new THREE.Vector3(
    mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z,
  );
}

function GlobeSphere() {
  const theme = useAppStore((s) => s.theme);
  const color = theme === 'dark' ? '#1a1a2e' : '#e8e8f0';

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 0.98, 64, 32]} />
      <meshPhongMaterial
        color={color}
        transparent
        opacity={0.15}
        wireframe={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function SphereGrid() {
  const theme = useAppStore((s) => s.theme);

  const geometry = useMemo(() => {
    const points = [];

    // Latitude rings at -45°, 0° (equator), +45°
    for (const lat of [-45, 0, 45]) {
      const phi = (lat * Math.PI) / 180;
      const ringRadius = GLOBE_RADIUS * Math.cos(phi);
      const y = GLOBE_RADIUS * Math.sin(phi);
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(
          ringRadius * Math.cos(theta), y, ringRadius * Math.sin(theta)
        ));
      }
      // Add a break point (NaN) to separate rings visually
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={theme === 'dark' ? '#444' : '#bbb'}
        transparent
        opacity={0.2}
      />
    </line>
  );
}

function AutoRotate() {
  const { scene } = useThree();
  useFrame((_, delta) => {
    scene.rotation.y += delta * 0.05;
  });
  return null;
}

export default function GlobeView() {
  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const theme = useAppStore((s) => s.theme);

  if (!references || !metadata) {
    return <div style={styles.loading}>Loading globe view...</div>;
  }

  return (
    <div style={styles.container}>
      <Canvas
        camera={{ position: [0, 6, 10], fov: 50 }}
        style={{ background: theme === 'dark' ? '#0D1117' : '#FAFAFA' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <GlobeSphere />
        <SphereGrid />
        <ChapterPoints metadata={metadata} />
        <ArcLines references={references} metadata={metadata} />
        <AutoRotate />
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={6}
          maxDistance={20}
          enablePan={false}
        />
      </Canvas>
      <div style={styles.hint}>
        Drag to rotate &middot; Scroll to zoom &middot; Helix: Genesis (top) &rarr; Revelation (bottom)
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
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
