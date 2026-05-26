"use client";

import type { Simulation, TopologyDelta, Trigger } from "@/lib/types";
import { BarMeter, Card, Label, Stat } from "./Chrome";
import { categoryHeatmap, threatIndex, topPaths } from "@/lib/engine";
import { fireTrigger, ackTrigger, dismissTrigger, resetTrigger } from "@/lib/triggers";

export function ThreatPanel({ sim }: { sim: Simulation }) {
  const heatmap = categoryHeatmap(sim);
  const idx = threatIndex(sim);
  return (
    <Card title="THREAT INDEX" meta="EV × P COMPOSITE">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="THREAT" value={`${idx}`} hint="0..100 EV-gewichtet" large />
        <Stat label="ROUNDS" value={sim.own.horizonRounds} hint="Vorausschau" large />
        <Stat label="NODES" value={Object.keys(sim.nodes).length} hint="Gesamt-Knoten" large />
      </div>

      <Label>Kategorische Druckkarte</Label>
      <div className="space-y-1.5">
        {heatmap.slice(0, 8).map(({ category, weight }) => (
          <div key={category} className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-widest text-ink-700 w-24">{category}</span>
            <div className="flex-1">
              <BarMeter value={weight * 100} />
            </div>
            <span className="font-mono text-[10px] text-ink-800 w-12 text-right">{(weight * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PathPanel({
  sim,
  onSelect,
}: {
  sim: Simulation;
  onSelect: (id: string) => void;
}) {
  const paths = topPaths(sim, 5);
  return (
    <Card title="HIGHEST-RISK TRAJECTORIES" meta="TOP-5">
      <div className="space-y-2.5">
        {paths.map((p, i) => {
          const opening = sim.nodes[p.ids[0]];
          const tail = sim.nodes[p.ids[p.ids.length - 1]];
          return (
            <button
              key={i}
              onClick={() => onSelect(tail.id)}
              className="w-full text-left border border-ink-300/60 bg-ink-100/30 p-2.5 hover:border-ink-700 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] tracking-widest text-ink-500">
                  PATH-{(i + 1).toString().padStart(2, "0")} · {p.scenarioLabel.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-ink-900">
                  P={(p.cumulativeProbability * 100).toFixed(2)}% · Σ T={p.totalThreat.toFixed(1)}
                </span>
              </div>
              <div className="font-mono text-[10.5px] text-ink-800 leading-relaxed">
                {p.ids.map((id, k) => {
                  const n = sim.nodes[id];
                  const isOpp = n.actor === "OPPONENT";
                  return (
                    <span key={id}>
                      <span className={isOpp ? "text-ink-900" : "text-ink-600"}>
                        {isOpp ? "⌖ " : "◇ "}
                        {n.title.length > 38 ? n.title.slice(0, 36) + "…" : n.title}
                      </span>
                      {k < p.ids.length - 1 && <span className="text-ink-500"> → </span>}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function NodeDetail({
  sim,
  nodeId,
  triggers = [],
  onTriggerChange,
}: {
  sim: Simulation;
  nodeId: string | null;
  triggers?: Trigger[];
  onTriggerChange?: () => void;
}) {
  const node = nodeId ? sim.nodes[nodeId] : null;

  if (!node) {
    return (
      <Card title="NODE INSPECTOR" meta="// SELECT NODE">
        <div className="text-[12px] font-mono text-ink-500 leading-relaxed">
          Klick auf einen Knoten im Move-Tree, um Detail-Analyse, Begründung und
          empfohlene Counter-Moves zu laden.
        </div>
      </Card>
    );
  }

  const ancestors: typeof node[] = [];
  let cur = node;
  while (cur.parentId) {
    cur = sim.nodes[cur.parentId];
    ancestors.unshift(cur);
  }

  return (
    <Card title="NODE INSPECTOR" meta={`${node.actor} · R${node.round}`}>
      <div className="space-y-4">
        <div>
          <Label>Selected Move</Label>
          <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
            {node.category} · P={(node.probability * 100).toFixed(1)}% · Σ P=
            {(node.cumulativeProbability * 100).toFixed(2)}%
          </div>
          <div className="text-[14px] text-ink-950 leading-tight">{node.title}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="THREAT" value={node.threat} hint="0..100" />
          <Stat label="OPP. COST" value={node.cost} hint="0..100" />
        </div>

        <div>
          <Label>Rationale</Label>
          <div className="text-[12px] text-ink-800 leading-relaxed">{node.rationale}</div>
        </div>

        {node.deltas && node.deltas.length > 0 && (
          <div>
            <Label>Move Delta</Label>
            <ul className="space-y-1.5">
              {node.deltas.map((d, i) => (
                <li key={i} className="border border-ink-300/60 bg-ink-100/40 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono text-[10px] tracking-widest text-ink-900">
                      {deltaOpGlyph(d)} {d.op} · {d.layer}
                    </span>
                    <span className="font-mono text-[9px] tracking-widest text-ink-500">
                      MAG {d.magnitude}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] tracking-wider text-ink-500 mb-1">
                    {deltaTargetLabel(d)}
                  </div>
                  <div className="text-[11.5px] text-ink-900 leading-tight">
                    {d.description}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ancestors.length > 0 && (
          <div>
            <Label>Trajectory</Label>
            <ol className="space-y-1 text-[11px] font-mono text-ink-700">
              {ancestors.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <span className="text-ink-500">R{a.round}</span>
                  <span className={a.actor === "OPPONENT" ? "text-ink-900" : "text-ink-600"}>
                    {a.actor === "OPPONENT" ? "⌖" : "◇"} {a.title}
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-2 border-t border-ink-300/40 pt-1 mt-1">
                <span className="text-ink-500">R{node.round}</span>
                <span className="text-ink-950 font-medium">
                  {node.actor === "OPPONENT" ? "⌖" : "◇"} {node.title}
                </span>
              </li>
            </ol>
          </div>
        )}

        {node.actor === "OPPONENT" && (node.indicators?.length ?? 0) > 0 && (
          <div>
            <Label>Leading Indicators</Label>
            <ul className="space-y-1.5">
              {(node.indicators ?? []).map((ind) => {
                const trg = triggers.find(
                  (t) => t.indicatorId === ind.id && t.simulationId === sim.id,
                );
                const state = trg?.state ?? "ARMED";
                return (
                  <li
                    key={ind.id}
                    className="border border-ink-300/60 bg-ink-100/40 px-2.5 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-mono text-[9px] tracking-widest text-ink-500">
                        {ind.source} · W={(ind.weight * 100).toFixed(0)}
                      </span>
                      <span
                        className={`font-mono text-[9px] tracking-widest px-1.5 py-0.5 border border-ink-300/60 ${
                          state === "FIRED"
                            ? "bg-ink-900 text-ink-0"
                            : state === "ACK"
                              ? "bg-ink-700 text-ink-0"
                              : state === "DISMISSED"
                                ? "bg-ink-100 text-ink-500"
                                : "bg-ink-200 text-ink-800"
                        }`}
                      >
                        {state}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink-950 leading-tight">
                      {ind.label}
                    </div>
                    <div className="font-mono text-[10px] text-ink-500 leading-relaxed mt-0.5">
                      {ind.description}
                    </div>
                    {trg && onTriggerChange && (
                      <div className="mt-1.5 flex gap-1">
                        {state === "ARMED" && (
                          <>
                            <button
                              onClick={() => {
                                fireTrigger(trg.id, {});
                                onTriggerChange();
                              }}
                              className="font-mono text-[9.5px] tracking-widest px-2 py-0.5 border border-ink-900 hover:bg-ink-900 hover:text-ink-0 transition-colors"
                            >
                              FIRE
                            </button>
                            <button
                              onClick={() => {
                                dismissTrigger(trg.id);
                                onTriggerChange();
                              }}
                              className="font-mono text-[9.5px] tracking-widest px-2 py-0.5 border border-ink-400 text-ink-600 hover:border-ink-700 hover:text-ink-900 transition-colors"
                            >
                              DISMISS
                            </button>
                          </>
                        )}
                        {state === "FIRED" && (
                          <>
                            <button
                              onClick={() => {
                                ackTrigger(trg.id);
                                onTriggerChange();
                              }}
                              className="font-mono text-[9.5px] tracking-widest px-2 py-0.5 border border-ink-900 hover:bg-ink-900 hover:text-ink-0 transition-colors"
                            >
                              ACK
                            </button>
                            <button
                              onClick={() => {
                                resetTrigger(trg.id);
                                onTriggerChange();
                              }}
                              className="font-mono text-[9.5px] tracking-widest px-2 py-0.5 border border-ink-400 text-ink-600 hover:border-ink-700 hover:text-ink-900 transition-colors"
                            >
                              RESET
                            </button>
                          </>
                        )}
                        {(state === "ACK" || state === "DISMISSED") && (
                          <button
                            onClick={() => {
                              resetTrigger(trg.id);
                              onTriggerChange();
                            }}
                            className="font-mono text-[9.5px] tracking-widest px-2 py-0.5 border border-ink-400 text-ink-600 hover:border-ink-700 hover:text-ink-900 transition-colors"
                          >
                            RESET
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {node.counters.length > 0 && (
          <div>
            <Label>Counter-Move-Bibliothek</Label>
            <ul className="space-y-1.5">
              {node.counters.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12px] text-ink-900 border border-ink-300/60 bg-ink-100/40 px-2.5 py-1.5"
                >
                  <span className="font-mono text-[10px] text-ink-500 mt-0.5">
                    C{(i + 1).toString().padStart(2, "0")}
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------- delta presentation helpers ----------

function deltaOpGlyph(d: TopologyDelta): string {
  switch (d.op) {
    case "ADD": return "+";
    case "STRENGTHEN": return "↑";
    case "WEAKEN": return "↓";
    case "REMOVE": return "−";
    case "MIGRATE": return "⤴";
  }
}

function deltaTargetLabel(d: TopologyDelta): string {
  const t = d.target;
  if (t.kind === "CAPABILITY") {
    return `CAPABILITY · ${t.dimension}${
      d.newLabel ? ` · "${d.newLabel}"` : ""
    }`;
  }
  if (t.kind === "BMC_BLOCK") {
    return `BMC · ${humanBlockKind(t.blockKind)}${
      d.newLabel ? ` · "${d.newLabel}"` : ""
    }`;
  }
  return `VPC · ${t.side} · ${t.itemKind}${
    d.newLabel ? ` · "${d.newLabel}"` : ""
  }`;
}

function humanBlockKind(k: string): string {
  return k.replace(/_/g, " ").toLowerCase();
}
