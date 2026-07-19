import { useState, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BOOKS } from '../../../constants/books';

// Zoom in past this distance -> every book label appears; farther out only the
// major books (>= MAJOR_MIN_CHAPTERS) show, to keep the coil legible.
const SHOW_ALL_DIST = 11;
const MAJOR_MIN_CHAPTERS = 10;
const scratch = new THREE.Vector3();

/**
 * Book labels at each book's first-chapter position on the coil. Major books
 * (>= 10 chapters) are always shown; the rest appear when the camera is near.
 * Labels are billboarded (drei Html always faces camera) and occlusion-faded
 * by the coil's radial normal so labels on the far side of the helix fade out
 * rather than reading as soup. A testament-colored tick precedes each. Colors
 * come from sampled tokens.
 */
export default function ScrollLabels({ metadata, getPosition, radius, tokens }) {
  const [showAll, setShowAll] = useState(false);
  const camera = useThree((s) => s.camera);
  const nodes = useRef(new Map()); // id -> { node, dir }

  const labels = useMemo(() => {
    if (!metadata) return [];
    return metadata.books.map((book) => {
      const startIndex = book.chapterDetails[0].globalIndex;
      const pos = getPosition(startIndex, metadata.totalChapters, radius);
      const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize(); // radial normal
      pos.addScaledVector(dir, 0.55); // nudge the label off the coil surface
      return {
        name: book.name,
        abbrev: BOOKS[book.num - 1]?.abbrev || book.abbrev,
        isOT: BOOKS[book.num - 1]?.testament === 'OT',
        major: book.chapterDetails.length >= MAJOR_MIN_CHAPTERS,
        pos,
        dir,
      };
    });
  }, [metadata, getPosition, radius]);

  useFrame(() => {
    const dist = camera.position.length();
    const shouldShowAll = dist < SHOW_ALL_DIST;
    if (shouldShowAll !== showAll) setShowAll(shouldShowAll);

    // Occlusion fade: dot(labelRadialDir, cameraRadialDir). Near side -> opaque,
    // far side of the coil -> hidden. Uses only the xz (radial) components.
    scratch.set(camera.position.x, 0, camera.position.z).normalize();
    nodes.current.forEach((entry) => {
      const { node, dir } = entry;
      if (!node) return;
      const facing = dir.x * scratch.x + dir.z * scratch.z;
      let o = (facing + 0.15) / 0.5; // ramp across -0.15 .. 0.35
      o = o < 0 ? 0 : o > 1 ? 1 : o;
      node.style.opacity = String(o);
      node.style.visibility = o < 0.02 ? 'hidden' : 'visible';
    });
  });

  if (!metadata) return null;

  const setNode = (id, dir) => (el) => {
    if (el) nodes.current.set(id, { node: el, dir });
    else nodes.current.delete(id);
  };

  const visible = labels.filter((b) => b.major || showAll);

  return (
    <group>
      {visible.map((b) => (
        <Html
          key={b.abbrev}
          position={[b.pos.x, b.pos.y, b.pos.z]}
          distanceFactor={12}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            ref={setNode(b.abbrev, b.dir)}
            className={`scroll-label${b.major ? ' scroll-label--major' : ''}`}
            title={b.name}
            style={{ background: `${tokens.vizBg}D9`, color: tokens.ink2, borderColor: tokens.line }}
          >
            <span className="scroll-label__tick" style={{ background: b.isOT ? tokens.ot : tokens.nt }} />
            {b.abbrev}
          </div>
        </Html>
      ))}
    </group>
  );
}
