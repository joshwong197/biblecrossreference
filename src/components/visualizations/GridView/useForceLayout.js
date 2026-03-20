import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { BOOKS, BOOK_GROUPS } from '../../../constants/books';

const G = BOOK_GROUPS;

const GROUP_CENTERS = {
  [G.PENTATEUCH]:     { x: 0.15, y: 0.12 },
  [G.HISTORICAL]:     { x: 0.15, y: 0.35 },
  [G.WISDOM]:         { x: 0.15, y: 0.55 },
  [G.MAJOR_PROPHETS]: { x: 0.15, y: 0.72 },
  [G.MINOR_PROPHETS]: { x: 0.15, y: 0.9 },
  [G.GOSPELS]:        { x: 0.85, y: 0.12 },
  [G.ACTS]:           { x: 0.85, y: 0.32 },
  [G.PAULINE]:        { x: 0.85, y: 0.52 },
  [G.GENERAL]:        { x: 0.85, y: 0.75 },
  [G.REVELATION]:     { x: 0.85, y: 0.92 },
};

export default function useForceLayout(matrix, width, height, minCount) {
  const simulationRef = useRef(null);
  const [tick, setTick] = useState(0);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);

  const { nodes: initialNodes, edges } = useMemo(() => {
    if (!matrix || !width || !height) return { nodes: [], edges: [] };

    const nodes = BOOKS.map((book, i) => {
      const center = GROUP_CENTERS[book.group] || { x: 0.5, y: 0.5 };
      return {
        id: i,
        num: book.num,
        name: book.name,
        abbrev: book.abbrev,
        testament: book.testament,
        group: book.group,
        x: center.x * width + (Math.random() - 0.5) * 40,
        y: center.y * height + (Math.random() - 0.5) * 40,
      };
    });

    const edges = [];
    for (let i = 0; i < 66; i++) {
      for (let j = i + 1; j < 66; j++) {
        const count = matrix[i][j];
        if (count >= minCount) {
          edges.push({ source: i, target: j, count });
        }
      }
    }

    return { nodes, edges };
  }, [matrix, width, height, minCount]);

  useEffect(() => {
    if (!initialNodes.length || !width || !height) return;

    // Preserve existing positions if nodes already exist
    const nodes = initialNodes.map((n) => {
      const existing = nodesRef.current?.find((e) => e.id === n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, fx: existing.fx, fy: existing.fy };
      }
      return n;
    });

    nodesRef.current = nodes;
    edgesRef.current = edges.map((e) => ({ ...e }));

    const maxCount = Math.max(...edges.map((e) => e.count), 1);

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edgesRef.current)
        .id((d) => d.id)
        .distance((d) => {
          const strength = d.count / maxCount;
          return 200 - strength * 150;
        })
        .strength((d) => {
          return Math.min(d.count / maxCount * 0.3, 0.2);
        })
      )
      .force('charge', d3.forceManyBody().strength(-120).distanceMax(400))
      .force('collide', d3.forceCollide(65))
      .force('x', d3.forceX((d) => {
        const center = GROUP_CENTERS[d.group] || { x: 0.5 };
        return center.x * width;
      }).strength(0.15))
      .force('y', d3.forceY((d) => {
        const center = GROUP_CENTERS[d.group] || { y: 0.5 };
        return center.y * height;
      }).strength(0.15))
      .alphaDecay(0.02)
      .on('tick', () => {
        // Contain nodes within bounds
        for (const node of nodes) {
          node.x = Math.max(60, Math.min(width - 60, node.x));
          node.y = Math.max(35, Math.min(height - 35, node.y));
        }
        setTick((t) => t + 1);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [initialNodes, edges, width, height]);

  const dragHandlers = useMemo(() => ({
    onDragStart: (nodeId, event) => {
      const sim = simulationRef.current;
      if (!sim) return;
      sim.alphaTarget(0.1).restart();
      const node = nodesRef.current?.find((n) => n.id === nodeId);
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
      }
    },
    onDrag: (nodeId, x, y) => {
      const node = nodesRef.current?.find((n) => n.id === nodeId);
      if (node) {
        node.fx = x;
        node.fy = y;
      }
    },
    onDragEnd: (nodeId) => {
      const sim = simulationRef.current;
      if (!sim) return;
      sim.alphaTarget(0);
      const node = nodesRef.current?.find((n) => n.id === nodeId);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    },
  }), []);

  return {
    nodes: nodesRef.current || [],
    edges: edgesRef.current || [],
    tick,
    dragHandlers,
  };
}
