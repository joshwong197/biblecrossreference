import { useMemo } from 'react';
import * as d3 from 'd3';
import { TESTAMENT_COLORS_DARK, TESTAMENT_COLORS_LIGHT, GROUP_COLORS_DARK, GROUP_COLORS_LIGHT, getTestamentPairKey, getBookGroupKey } from '../../../utils/colorScales';

export default function ConnectionLines({
  edges,
  theme,
  colorMode,
  hoveredNode,
  selectedNode,
}) {
  const testamentColors = theme === 'dark' ? TESTAMENT_COLORS_DARK : TESTAMENT_COLORS_LIGHT;
  const groupColors = theme === 'dark' ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;
  const accentColor = theme === 'dark' ? '#58A6FF' : '#0969DA';

  const { widthScale, maxCount } = useMemo(() => {
    const counts = edges.map((e) => e.count);
    const max = Math.max(...counts, 1);
    return {
      widthScale: d3.scaleSqrt().domain([1, max]).range([0.5, 4]),
      maxCount: max,
    };
  }, [edges]);

  // Collect gradient defs needed for group mode cross-group connections
  const gradientDefs = useMemo(() => {
    if (colorMode !== 'group') return [];
    const seen = new Set();
    const defs = [];
    for (const edge of edges) {
      const s = edge.source;
      const t = edge.target;
      if (!s || !t) continue;
      const fromGroup = getBookGroupKey(s.num);
      const toGroup = getBookGroupKey(t.num);
      if (fromGroup === toGroup) continue;
      const pairKey = `${fromGroup}-${toGroup}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      defs.push({ id: `grad-${pairKey}`, from: groupColors[fromGroup], to: groupColors[toGroup] });
    }
    return defs;
  }, [edges, colorMode, groupColors]);

  return (
    <g>
      {colorMode === 'group' && (
        <defs>
          {gradientDefs.map((d) => (
            <linearGradient key={d.id} id={d.id} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={d.from} />
              <stop offset="100%" stopColor={d.to} />
            </linearGradient>
          ))}
        </defs>
      )}
      {edges.map((edge, i) => {
        const source = edge.source;
        const target = edge.target;
        if (!source || !target || source.x == null || target.x == null) return null;

        const isConnectedToHovered = hoveredNode !== null && (
          source.id === hoveredNode || target.id === hoveredNode
        );
        const isConnectedToSelected = selectedNode !== null && (
          source.id === selectedNode || target.id === selectedNode
        );

        let opacity;
        if (hoveredNode !== null || selectedNode !== null) {
          opacity = (isConnectedToHovered || isConnectedToSelected) ? 0.7 : 0.04;
        } else {
          opacity = 0.1 + (edge.count / maxCount) * 0.4;
        }

        let color;
        if (colorMode === 'testament') {
          const key = getTestamentPairKey(source.num, target.num);
          color = testamentColors[key];
        } else if (colorMode === 'group') {
          const fromGroup = getBookGroupKey(source.num);
          const toGroup = getBookGroupKey(target.num);
          if (fromGroup === toGroup) {
            color = groupColors[fromGroup];
          } else {
            color = `url(#grad-${fromGroup}-${toGroup})`;
          }
        } else {
          color = accentColor;
        }

        const sw = (isConnectedToHovered || isConnectedToSelected)
          ? widthScale(edge.count) * 1.5
          : widthScale(edge.count);

        return (
          <line
            key={`${source.id}-${target.id}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke={color}
            strokeWidth={sw}
            opacity={opacity}
            style={{ transition: 'opacity 0.2s' }}
          />
        );
      })}
    </g>
  );
}
