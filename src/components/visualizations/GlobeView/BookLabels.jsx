import { useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useAppStore from '../../../stores/useAppStore';
import { BOOKS, BOOK_GROUPS } from '../../../constants/books';

const GROUP_ORDER = [
  BOOK_GROUPS.PENTATEUCH,
  BOOK_GROUPS.HISTORICAL,
  BOOK_GROUPS.WISDOM,
  BOOK_GROUPS.MAJOR_PROPHETS,
  BOOK_GROUPS.MINOR_PROPHETS,
  BOOK_GROUPS.GOSPELS,
  BOOK_GROUPS.ACTS,
  BOOK_GROUPS.PAULINE,
  BOOK_GROUPS.GENERAL,
  BOOK_GROUPS.REVELATION,
];

export default function BookLabels({ metadata, getPosition, radius }) {
  const theme = useAppStore((s) => s.theme);
  const [showBooks, setShowBooks] = useState(false);
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const dist = camera.position.length();
    const shouldShow = dist < 11;
    if (shouldShow !== showBooks) setShowBooks(shouldShow);
  });

  if (!metadata) return null;

  const groupLabels = computeGroupLabels(metadata, getPosition, radius);
  const bookLabels = showBooks ? computeBookLabels(metadata, getPosition, radius) : [];

  const isDark = theme === 'dark';

  return (
    <group>
      {groupLabels.map((g) => (
        <Html
          key={g.name}
          position={[g.pos.x, g.pos.y, g.pos.z]}
          distanceFactor={15}
          center
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            ...styles.groupLabel,
            backgroundColor: isDark ? 'rgba(13,17,23,0.85)' : 'rgba(250,250,250,0.85)',
            color: isDark ? '#C9D1D9' : '#24292F',
            borderColor: isDark ? '#30363D' : '#D0D7DE',
          }}>
            {g.name}
          </div>
        </Html>
      ))}

      {bookLabels.map((b) => (
        <Html
          key={b.abbrev}
          position={[b.pos.x, b.pos.y, b.pos.z]}
          distanceFactor={12}
          center
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              ...styles.bookLabel,
              backgroundColor: isDark ? 'rgba(13,17,23,0.8)' : 'rgba(250,250,250,0.8)',
              color: b.isOT
                ? (isDark ? '#4A90D9' : '#2B5C8A')
                : (isDark ? '#E8675A' : '#B84A3E'),
              borderColor: b.isOT
                ? (isDark ? '#4A90D9' : '#2B5C8A')
                : (isDark ? '#E8675A' : '#B84A3E'),
            }}
            title={b.name}
          >
            {b.abbrev}
          </div>
        </Html>
      ))}
    </group>
  );
}

function computeGroupLabels(metadata, getPosition, radius) {
  const groups = {};

  for (const book of metadata.books) {
    const group = BOOKS[book.num - 1]?.group;
    if (!group) continue;
    if (!groups[group]) groups[group] = { first: Infinity, last: -Infinity };
    const firstCh = book.chapterDetails[0].globalIndex;
    const lastCh = book.chapterDetails[book.chapterDetails.length - 1].globalIndex;
    groups[group].first = Math.min(groups[group].first, firstCh);
    groups[group].last = Math.max(groups[group].last, lastCh);
  }

  return GROUP_ORDER.filter((name) => groups[name]).map((name) => {
    const g = groups[name];
    const midIndex = Math.floor((g.first + g.last) / 2);
    const pos = getPosition(midIndex, metadata.totalChapters, metadata.otChapters, radius);
    // offset outward
    const dir = pos.clone().normalize();
    pos.addScaledVector(dir, 0.6);
    return { name, pos };
  });
}

function computeBookLabels(metadata, getPosition, radius) {
  return metadata.books.map((book) => {
    const details = book.chapterDetails;
    const midIndex = details[Math.floor(details.length / 2)].globalIndex;
    const pos = getPosition(midIndex, metadata.totalChapters, metadata.otChapters, radius);
    const dir = pos.clone().normalize();
    pos.addScaledVector(dir, 0.35);
    const isOT = BOOKS[book.num - 1]?.testament === 'OT';
    return {
      name: book.name,
      abbrev: BOOKS[book.num - 1]?.abbrev || book.abbrev,
      pos,
      isOT,
    };
  });
}

const styles = {
  groupLabel: {
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    border: '1px solid',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  bookLabel: {
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    border: '1px solid',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
};
