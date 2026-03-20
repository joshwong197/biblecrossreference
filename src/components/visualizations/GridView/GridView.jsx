import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import useAppStore from '../../../stores/useAppStore';
import useCanvasSize from '../../../hooks/useCanvasSize';
import { BOOKS } from '../../../constants/books';
import useForceLayout from './useForceLayout';
import BookNode, { NODE_WIDTH, NODE_HEIGHT } from './BookNode';
import ConnectionLines from './ConnectionLines';

const MIN_COUNT_OPTIONS = [1, 5, 10, 25, 50];

export default function GridView() {
  const outerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const { width: containerWidth, height: containerHeight } = useCanvasSize(outerRef);

  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const colorMode = useAppStore((s) => s.colorMode);
  const theme = useAppStore((s) => s.theme);
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter);

  const [minCount, setMinCount] = useState(5);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Build 66x66 matrix (same as before)
  const matrix = useMemo(() => {
    if (!references || !metadata) return null;

    const mat = Array.from({ length: 66 }, () => Array(66).fill(0));

    const chapterToBook = new Array(metadata.totalChapters);
    for (const book of metadata.books) {
      for (const ch of book.chapterDetails) {
        chapterToBook[ch.globalIndex] = book.num - 1;
      }
    }

    for (const ref of references) {
      if (!tierVisibility[ref.tier]) continue;
      const fromBook = chapterToBook[ref.from];
      const toBook = chapterToBook[ref.to];
      if (fromBook !== undefined && toBook !== undefined) {
        mat[fromBook][toBook]++;
        mat[toBook][fromBook]++;
      }
    }

    return mat;
  }, [references, metadata, tierVisibility]);

  const { nodes, edges, tick, dragHandlers } = useForceLayout(
    matrix, containerWidth, containerHeight, minCount
  );

  // Set up zoom/pan on SVG
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.setAttribute('transform', event.transform);
      });

    d3.select(svg).call(zoom);

    return () => {
      d3.select(svg).on('.zoom', null);
    };
  }, [containerWidth, containerHeight]);

  // Get connected edges for hovered node (for tooltip)
  const hoveredConnections = useMemo(() => {
    if (hoveredNode === null) return [];
    return edges.filter(
      (e) => e.source?.id === hoveredNode || e.target?.id === hoveredNode
    ).sort((a, b) => b.count - a.count);
  }, [edges, hoveredNode, tick]);

  const handleNodeHover = useCallback((nodeId) => {
    setHoveredNode(nodeId);
    if (nodeId !== null) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        const connectedEdges = edges
          .filter((e) => e.source?.id === nodeId || e.target?.id === nodeId)
          .sort((a, b) => b.count - a.count);
        const topConnections = connectedEdges.slice(0, 5);
        setTooltip({
          node,
          connections: topConnections,
          total: connectedEdges.length,
          totalRefs: connectedEdges.reduce((sum, e) => sum + e.count, 0),
        });
      }
    } else {
      setTooltip(null);
    }
  }, [nodes, edges, tick]);

  const handleNodeSelect = useCallback((nodeId) => {
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
    // Open ReferencePanel for first chapter of book
    if (metadata) {
      const book = metadata.books.find((b) => b.num === nodeId + 1);
      if (book?.chapterDetails?.length) {
        setSelectedChapter(book.chapterDetails[0].globalIndex);
      }
    }
  }, [metadata, setSelectedChapter]);

  if (!references || !metadata) {
    return <div style={styles.loading}>Loading connections view...</div>;
  }

  return (
    <div ref={outerRef} style={styles.container}>
      {/* Min count filter */}
      <div style={styles.controls}>
        <span style={styles.controlLabel}>Min refs:</span>
        {MIN_COUNT_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setMinCount(n)}
            style={{
              ...styles.filterBtn,
              backgroundColor: minCount === n
                ? (theme === 'dark' ? '#58A6FF' : '#0969DA')
                : (theme === 'dark' ? '#21262D' : '#F6F8FA'),
              color: minCount === n
                ? '#fff'
                : (theme === 'dark' ? '#8B949E' : '#57606A'),
            }}
          >
            {n}
          </button>
        ))}
        <span style={styles.edgeCount}>
          {edges.length} connections
        </span>
      </div>

      <svg
        ref={svgRef}
        width={containerWidth}
        height={containerHeight - 36}
        style={{ display: 'block' }}
      >
        <g ref={gRef}>
          <ConnectionLines
            edges={edges}
            theme={theme}
            colorMode={colorMode}
            hoveredNode={hoveredNode}
            selectedNode={selectedNode}
          />
          {nodes.map((node) => (
            <BookNode
              key={node.id}
              node={node}
              metadata={metadata}
              theme={theme}
              isHovered={hoveredNode === node.id}
              isSelected={selectedNode === node.id}
              isDimmed={
                (hoveredNode !== null && hoveredNode !== node.id &&
                  !edges.some(
                    (e) =>
                      (e.source?.id === hoveredNode && e.target?.id === node.id) ||
                      (e.target?.id === hoveredNode && e.source?.id === node.id)
                  ))
              }
              onHover={handleNodeHover}
              onSelect={handleNodeSelect}
              dragHandlers={dragHandlers}
            />
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          ...styles.tooltip,
          backgroundColor: theme === 'dark' ? '#161B22' : '#fff',
          borderColor: theme === 'dark' ? '#30363D' : '#D0D7DE',
          color: theme === 'dark' ? '#C9D1D9' : '#24292F',
        }}>
          <div style={styles.tooltipTitle}>{tooltip.node.name}</div>
          <div style={styles.tooltipSubtitle}>
            {tooltip.total} connections &middot; {tooltip.totalRefs.toLocaleString()} total refs
          </div>
          {tooltip.connections.length > 0 && (
            <div style={styles.tooltipList}>
              {tooltip.connections.map((edge, i) => {
                const other = edge.source?.id === tooltip.node.id ? edge.target : edge.source;
                return (
                  <div key={i} style={styles.tooltipItem}>
                    <span>{other?.name}</span>
                    <span style={styles.tooltipCount}>{edge.count}</span>
                  </div>
                );
              })}
              {tooltip.total > 5 && (
                <div style={styles.tooltipMore}>+{tooltip.total - 5} more</div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={styles.hint}>
        Drag books to rearrange &middot; Scroll to zoom &middot; Click book for details
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderBottom: '1px solid var(--border)',
    height: 36,
    boxSizing: 'border-box',
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginRight: 2,
  },
  filterBtn: {
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  edgeCount: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  tooltip: {
    position: 'absolute',
    top: 48,
    right: 12,
    padding: '10px 14px',
    border: '1px solid',
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    zIndex: 10,
    minWidth: 180,
    maxWidth: 240,
  },
  tooltipTitle: {
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 2,
  },
  tooltipSubtitle: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 8,
  },
  tooltipList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  tooltipItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
  },
  tooltipCount: {
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  tooltipMore: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: 2,
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
    whiteSpace: 'nowrap',
  },
};
