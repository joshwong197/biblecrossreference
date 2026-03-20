import { useRef, useCallback } from 'react';
import { BOOK_GROUPS } from '../../../constants/books';

const GROUP_COLORS_DARK = {
  [BOOK_GROUPS.PENTATEUCH]:     { bg: '#1a2a3a', header: '#2D5F8A', border: '#3A7CB8' },
  [BOOK_GROUPS.HISTORICAL]:     { bg: '#1a2a2a', header: '#2A7A6A', border: '#38A090' },
  [BOOK_GROUPS.WISDOM]:         { bg: '#2a2a1a', header: '#8A7A2D', border: '#B8A03A' },
  [BOOK_GROUPS.MAJOR_PROPHETS]: { bg: '#2a1a2a', header: '#7A3D7A', border: '#A050A0' },
  [BOOK_GROUPS.MINOR_PROPHETS]: { bg: '#2a1a25', header: '#7A3D5A', border: '#A05078' },
  [BOOK_GROUPS.GOSPELS]:        { bg: '#2a1a1a', header: '#8A3A2D', border: '#B84A38' },
  [BOOK_GROUPS.ACTS]:           { bg: '#2a2218', header: '#8A6A2D', border: '#B88A38' },
  [BOOK_GROUPS.PAULINE]:        { bg: '#1a2230', header: '#3A5A8A', border: '#4A70B0' },
  [BOOK_GROUPS.GENERAL]:        { bg: '#1a2828', header: '#3A6A6A', border: '#4A8888' },
  [BOOK_GROUPS.REVELATION]:     { bg: '#2a1a20', header: '#8A2A40', border: '#B03850' },
};

const GROUP_COLORS_LIGHT = {
  [BOOK_GROUPS.PENTATEUCH]:     { bg: '#EBF2FA', header: '#3A7CB8', border: '#A8CBE8' },
  [BOOK_GROUPS.HISTORICAL]:     { bg: '#E8F5F0', header: '#2A8A72', border: '#90D0B8' },
  [BOOK_GROUPS.WISDOM]:         { bg: '#F5F2E0', header: '#8A7A2D', border: '#D0C070' },
  [BOOK_GROUPS.MAJOR_PROPHETS]: { bg: '#F2E8F2', header: '#7A3D7A', border: '#C090C0' },
  [BOOK_GROUPS.MINOR_PROPHETS]: { bg: '#F2E0EC', header: '#7A3D5A', border: '#C080A0' },
  [BOOK_GROUPS.GOSPELS]:        { bg: '#FAE8E8', header: '#B84A38', border: '#E0A0A0' },
  [BOOK_GROUPS.ACTS]:           { bg: '#F5EFE0', header: '#8A6A2D', border: '#D0B878' },
  [BOOK_GROUPS.PAULINE]:        { bg: '#E8EEF8', header: '#3A5A8A', border: '#90A8D0' },
  [BOOK_GROUPS.GENERAL]:        { bg: '#E8F0F0', header: '#3A6A6A', border: '#90C0C0' },
  [BOOK_GROUPS.REVELATION]:     { bg: '#FAE0E8', header: '#A03050', border: '#D88898' },
};

const NODE_WIDTH = 110;
const NODE_HEIGHT = 62;
const HEADER_HEIGHT = 22;
const CORNER_RADIUS = 5;

export { NODE_WIDTH, NODE_HEIGHT };

export default function BookNode({
  node,
  metadata,
  theme,
  isHovered,
  isSelected,
  isDimmed,
  onHover,
  onSelect,
  dragHandlers,
  transform,
}) {
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const colors = theme === 'dark'
    ? GROUP_COLORS_DARK[node.group] || GROUP_COLORS_DARK[BOOK_GROUPS.PENTATEUCH]
    : GROUP_COLORS_LIGHT[node.group] || GROUP_COLORS_LIGHT[BOOK_GROUPS.PENTATEUCH];

  const bookMeta = metadata?.books?.find((b) => b.num === node.num);
  const chapters = bookMeta?.chapters || '?';
  const verses = bookMeta?.verses || '?';

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragHandlers.onDragStart(node.id, e);

    const handlePointerMove = (ev) => {
      if (!dragging.current) return;
      const svgEl = e.target.closest('svg');
      if (!svgEl) return;
      const pt = svgEl.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const ctm = svgEl.getScreenCTM()?.inverse();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm);
      dragHandlers.onDrag(node.id, svgPt.x, svgPt.y);
    };

    const handlePointerUp = () => {
      dragging.current = false;
      dragHandlers.onDragEnd(node.id);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [node.id, dragHandlers]);

  const opacity = isDimmed ? 0.15 : 1;
  const strokeWidth = isHovered || isSelected ? 2 : 1;
  const strokeColor = isSelected ? '#58A6FF' : (isHovered ? colors.border : colors.border);

  return (
    <g
      transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
      style={{ cursor: 'grab', opacity, transition: 'opacity 0.2s' }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => onHover(node.id)}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {/* Card body */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
        fill={colors.bg}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Header bar */}
      <clipPath id={`clip-header-${node.id}`}>
        <rect width={NODE_WIDTH} height={HEADER_HEIGHT} rx={CORNER_RADIUS} ry={CORNER_RADIUS} />
      </clipPath>
      <rect
        width={NODE_WIDTH}
        height={HEADER_HEIGHT}
        fill={colors.header}
        clipPath={`url(#clip-header-${node.id})`}
      />
      {/* Fill bottom corners of header */}
      <rect
        y={HEADER_HEIGHT - CORNER_RADIUS}
        width={NODE_WIDTH}
        height={CORNER_RADIUS}
        fill={colors.header}
      />

      {/* Book name */}
      <text
        x={NODE_WIDTH / 2}
        y={HEADER_HEIGHT / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={11}
        fontWeight={700}
        fontFamily="-apple-system, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {node.name}
      </text>

      {/* Body info */}
      <text
        x={8}
        y={HEADER_HEIGHT + 14}
        fill={theme === 'dark' ? '#8B949E' : '#57606A'}
        fontSize={9}
        fontFamily="-apple-system, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {chapters} chapters
      </text>
      <text
        x={8}
        y={HEADER_HEIGHT + 27}
        fill={theme === 'dark' ? '#8B949E' : '#57606A'}
        fontSize={9}
        fontFamily="-apple-system, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {verses} verses
      </text>

      {/* Testament badge */}
      <rect
        x={NODE_WIDTH - 28}
        y={HEADER_HEIGHT + 8}
        width={20}
        height={14}
        rx={3}
        fill={node.testament === 'OT'
          ? (theme === 'dark' ? '#1a3050' : '#D0E0F0')
          : (theme === 'dark' ? '#3a1a1a' : '#F0D0D0')
        }
      />
      <text
        x={NODE_WIDTH - 18}
        y={HEADER_HEIGHT + 15}
        textAnchor="middle"
        dominantBaseline="central"
        fill={node.testament === 'OT'
          ? (theme === 'dark' ? '#4A90D9' : '#2B5C8A')
          : (theme === 'dark' ? '#E8675A' : '#B84A3E')
        }
        fontSize={8}
        fontWeight={700}
        fontFamily="-apple-system, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {node.testament}
      </text>
    </g>
  );
}
