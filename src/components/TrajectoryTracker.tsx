"use client";

import { useMemo } from "react";
import type { Simulation, Trigger } from "@/lib/types";
import { inferCurrentTrajectory } from "@/lib/triggers";
import { Card, Label } from "./Chrome";

export function TrajectoryTracker({
  sim,
  triggers,
  onSelectNode,
}: {
  sim: Simulation;
  triggers: Trigger[];
  onSelectNode?: (id: string) => void;
}) {
  const inference = useMemo(
    () => inferCurrentTrajectory(sim, triggers),
    [sim, triggers],
  );

  const top = inference.paths.slice(0, 3);

  const confColor =
    inference.confidence === "HIGH"
      ? "bg-ink-900 text-ink-0"
      : inference.confidence === "MED"
        ? "bg-ink-700 text-ink-0"
        : "bg-ink-300 text-ink-800";

  return (
    <Card
      title="CURRENT TRAJECTORY // POSTERIOR"
      meta={`FIRED ${inference.totalFired} · ${inference.confidence}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Label>Which scenario is the world actually running?</Label>
          <div className="text-[11px] text-ink-500 leading-relaxed">
            Posterior probability per ending node, given the indicators that have fired.
          </div>
        </div>
        <span
          className={`font-mono text-[10px] tracking-widest px-2 py-1 ${confColor} border border-ink-900`}
        >
          CONF · {inference.confidence}
        </span>
      </div>

      {top.length === 0 ? (
        <div className="font-mono text-[10.5px] text-ink-500 border border-dashed border-ink-300/60 px-3 py-4">
          Keine Pfade verfügbar.
        </div>
      ) : (
        <div className="space-y-2">
          {top.map((p, i) => {
            const pct = p.posterior * 100;
            const priorPct = p.prior * 100;
            const delta = pct - priorPct;
            const deltaStr =
              delta > 0.05
                ? `+${delta.toFixed(2)}pp`
                : delta < -0.05
                  ? `${delta.toFixed(2)}pp`
                  : "≈0";
            const endingId = p.ids[p.ids.length - 1];
            return (
              <button
                key={i}
                onClick={() => onSelectNode?.(endingId)}
                className="w-full text-left border border-ink-300/60 bg-ink-100/30 p-2.5 hover:border-ink-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] tracking-widest text-ink-500">
                    RANK-{(i + 1).toString().padStart(2, "0")} · {p.scenarioLabel.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-ink-900">
                    POST={pct.toFixed(1)}% · PRIOR={priorPct.toFixed(1)}% · Δ {deltaStr}
                  </span>
                </div>
                <div className="text-[12px] text-ink-950 leading-tight mb-1">
                  ⌖ {p.endingTitle}
                </div>
                <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-widest text-ink-500">
                  <span className="text-ink-900">FIRED {p.fired}</span>
                  <span>·</span>
                  <span>ARMED {p.dormant}</span>
                  <span>·</span>
                  <span>{p.ids.length - 1} ROUNDS</span>
                </div>
                <div className="h-1.5 bg-ink-200 relative mt-2 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-ink-900"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 border-r border-ink-700"
                    style={{ width: `${Math.min(100, priorPct)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 font-mono text-[9.5px] tracking-widest text-ink-500 leading-relaxed border-t border-ink-300/60 pt-2">
        Solid bar = posterior · vertical mark = prior. Fire indicators in the watchlist to update inference.
      </div>
    </Card>
  );
}
