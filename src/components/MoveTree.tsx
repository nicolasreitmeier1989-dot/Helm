"use client";

import { useMemo } from "react";
import type { MoveNode, Simulation } from "@/lib/types";

// --- Layout: assign x/y to nodes per scenario.
interface Laid {
  node: MoveNode;
  x: number;
  y: number;
  scenarioIdx: number;
}

interface LayoutResult {
  nodes: Laid[];
  width: number;
  height: number;
  rowHeight: number;
  colWidth: number;
  maxRound: number;
  scenarioOffsets: number[]; // y-offset where each scenario starts
  scenarioHeights: number[];
}

function layoutTree(sim: Simulation): LayoutResult {
  const rowHeight = 110;
  const colWidth = 280;

  const laidById: Record<string, Laid> = {};
  const result: Laid[] = [];
  const scenarioOffsets: number[] = [];
  const scenarioHeights: number[] = [];

  let yCursor = 0;
  let maxRound = 0;

  sim.rootIds.forEach((rid, scenarioIdx) => {
    scenarioOffsets.push(yCursor);
    // Collect leaves order via depth-first traversal.
    const leafYs: { id: string; y: number }[] = [];
    let leafCounter = 0;

    const walk = (id: string): { firstLeafY: number; lastLeafY: number } => {
      const n = sim.nodes[id];
      maxRound = Math.max(maxRound, n.round);
      if (n.children.length === 0) {
        const y = yCursor + leafCounter * rowHeight;
        leafYs.push({ id, y });
        leafCounter++;
        const laid: Laid = { node: n, x: n.round * colWidth, y, scenarioIdx };
        laidById[id] = laid;
        result.push(laid);
        return { firstLeafY: y, lastLeafY: y };
      }
      const childBounds = n.children.map((c) => walk(c));
      const firstLeafY = childBounds[0].firstLeafY;
      const lastLeafY = childBounds[childBounds.length - 1].lastLeafY;
      const my = (firstLeafY + lastLeafY) / 2;
      const laid: Laid = { node: n, x: n.round * colWidth, y: my, scenarioIdx };
      laidById[id] = laid;
      result.push(laid);
      return { firstLeafY, lastLeafY };
    };

    walk(rid);
    const scenHeight = Math.max(1, leafCounter) * rowHeight;
    scenarioHeights.push(scenHeight);
    yCursor += scenHeight + 60; // gap between scenarios
  });

  const width = (maxRound + 1) * colWidth + 40;
  const height = yCursor;
  return { nodes: result, width, height, rowHeight, colWidth, maxRound, scenarioOffsets, scenarioHeights };
}

export function MoveTree({
  sim,
  selectedId,
  onSelect,
}: {
  sim: Simulation;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const layout = useMemo(() => layoutTree(sim), [sim]);

  // Build set of ancestors of selected node for highlighting
  const highlighted = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    let cur: string | null = selectedId;
    while (cur) {
      set.add(cur);
      const n: MoveNode | undefined = sim.nodes[cur];
      cur = n?.parentId ?? null;
    }
    return set;
  }, [selectedId, sim]);

  const nodeW = 240;
  const nodeH = 78;

  return (
    <div className="overflow-auto border border-ink-300/60 bg-ink-50 grid-bg relative" style={{ maxHeight: "70vh" }}>
      {/* Round headers */}
      <div
        className="sticky top-0 z-20 flex bg-ink-100/95 backdrop-blur border-b border-ink-300/60"
        style={{ width: layout.width }}
      >
        {Array.from({ length: layout.maxRound + 1 }).map((_, r) => (
          <div
            key={r}
            className="flex items-center justify-between px-3 h-8 border-r border-ink-300/60"
            style={{ width: layout.colWidth }}
          >
            <span className="font-mono text-[10px] tracking-widest text-ink-500">
              {r === 0 ? "T0 // OPENING" : `T${r} // ROUND`}
            </span>
            <span className="font-mono text-[10px] text-ink-700">
              {r === 0 ? "US" : r % 2 === 1 ? "COMPETITOR" : "US"}
            </span>
          </div>
        ))}
      </div>

      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        {/* Scenario band labels */}
        {layout.scenarioOffsets.map((off, i) => (
          <div
            key={i}
            className="absolute left-2 z-10"
            style={{ top: off + 8 }}
          >
            <div className="font-mono text-[9px] tracking-widest text-ink-500 bg-ink-100/80 border border-ink-300/60 px-1.5 py-0.5">
              S{i + 1} · {sim.scenarios[i]?.label.toUpperCase()}
            </div>
          </div>
        ))}

        {/* Edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={layout.width}
          height={layout.height}
        >
          {layout.nodes.map(({ node, x, y }) => {
            if (!node.parentId) return null;
            const parent = layout.nodes.find((l) => l.node.id === node.parentId)!;
            const x1 = parent.x + 20 + nodeW;
            const y1 = parent.y + nodeH / 2;
            const x2 = x + 20;
            const y2 = y + nodeH / 2;
            const mx = (x1 + x2) / 2;
            const isHL = highlighted.has(node.id) && highlighted.has(node.parentId);
            const stroke = isHL ? "#141414" : "#bdbdbd";
            const opacity = isHL ? 1 : 0.5 + node.probability * 0.4;
            const width = isHL ? 1.6 : 0.6 + node.probability * 1.2;
            return (
              <g key={node.id}>
                <path
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  stroke={stroke}
                  strokeWidth={width}
                  fill="none"
                  opacity={opacity}
                />
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 4}
                  fill={isHL ? "#141414" : "#8a8a8a"}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                >
                  p={(node.probability * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {layout.nodes.map(({ node, x, y }) => {
          const isHL = highlighted.has(node.id);
          const isSelected = selectedId === node.id;
          const isOpp = node.actor === "OPPONENT";
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node.id)}
              className={`absolute text-left transition-colors group ${
                isSelected
                  ? "bg-ink-900 text-ink-0 border-ink-900"
                  : isHL
                    ? "bg-ink-200 text-ink-900 border-ink-700"
                    : "bg-ink-100 text-ink-900 border-ink-300/60 hover:border-ink-700"
              } border`}
              style={{ left: x + 20, top: y, width: nodeW, height: nodeH }}
            >
              <div
                className={`flex items-center justify-between px-2 h-5 border-b ${
                  isSelected ? "border-ink-700 bg-ink-900" : "border-ink-300/60 bg-ink-200/40"
                }`}
              >
                <span className={`font-mono text-[9px] tracking-widest ${isSelected ? "text-ink-700" : "text-ink-500"}`}>
                  {isOpp ? "⌖ OPP" : "◇ SELF"} · {node.category}
                </span>
                <span className={`font-mono text-[9px] ${isSelected ? "text-ink-800" : "text-ink-600"}`}>
                  R{node.round}
                </span>
              </div>
              <div className="px-2 pt-1.5 pb-1">
                <div className="text-[11.5px] leading-tight font-medium line-clamp-2">{node.title}</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-ink-200">
                <div
                  className={`h-full ${isSelected ? "bg-ink-0" : "bg-ink-900"}`}
                  style={{ width: `${node.cumulativeProbability * 100}%` }}
                />
              </div>
              {isOpp && (
                <div
                  className="absolute top-1 right-1 font-mono text-[9px] tracking-wider opacity-80"
                  title="Expected value × probability, scaled 0–100"
                >
                  T{node.threat}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
