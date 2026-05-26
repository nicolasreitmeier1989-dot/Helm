"use client";

// HELM — Calibration Ledger panel (Phase 5Y.1).
//
// Two tabs:
//   STATS    — big Brier score + band, three sub-stats, per-scenario
//              Brier sub-scores.
//   PENDING  — list of unevaluated predictions; each row has three small
//              buttons HAPPENED · PARTIAL · DIDN'T.
//
// Header action: "RECORD CURRENT SIMULATION". Calls recordPredictions(sim,
// projectId) — idempotent — and shows an inline "+N captured" toast for
// ~2 seconds.

import { useEffect, useMemo, useState } from "react";
import { Card, Stat } from "./Chrome";
import {
  computeStats,
  evaluatePrediction,
  listPredictions,
  recordPredictions,
  type CalibrationStats,
  type Prediction,
  type PredictionOutcome,
} from "@/lib/predictions";
import type { Simulation } from "@/lib/types";

type Tab = "STATS" | "PENDING";

export function CalibrationPanel({
  sim,
  activeProjectId,
}: {
  sim: Simulation;
  activeProjectId?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("STATS");
  const [stats, setStats] = useState<CalibrationStats>(emptyStats());
  const [pending, setPending] = useState<Prediction[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setStats(computeStats());
    setPending(
      listPredictions()
        .filter((p) => !p.evaluated)
        .sort((a, b) => b.predictedAt.localeCompare(a.predictedAt))
        .slice(0, 12),
    );
  }, [nonce]);

  const refresh = () => setNonce((n) => n + 1);

  const handleRecord = () => {
    const added = recordPredictions(sim, activeProjectId ?? undefined);
    setToast(
      added === 0
        ? "Already captured — no new predictions"
        : `+${added} predictions captured`,
    );
    refresh();
    setTimeout(() => setToast(null), 2000);
  };

  const handleEvaluate = (id: string, outcome: PredictionOutcome) => {
    evaluatePrediction(id, outcome);
    refresh();
  };

  const unevaluatedCount = stats.totalPredictions - stats.evaluatedCount;

  return (
    <Card
      title="CALIBRATION // LEDGER"
      meta={`${stats.totalPredictions} TOTAL · ${stats.evaluatedCount} EVAL'D`}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setTab("STATS")}
          className={`font-mono text-[10px] tracking-widest px-2.5 py-1 border transition-colors ${
            tab === "STATS"
              ? "border-ink-900 bg-ink-900 text-ink-0"
              : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
          }`}
        >
          STATS
        </button>
        <button
          onClick={() => setTab("PENDING")}
          className={`font-mono text-[10px] tracking-widest px-2.5 py-1 border transition-colors ${
            tab === "PENDING"
              ? "border-ink-900 bg-ink-900 text-ink-0"
              : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
          }`}
        >
          PENDING · {unevaluatedCount}
        </button>
        <button
          onClick={handleRecord}
          className="ml-auto font-mono text-[10px] tracking-widest border border-ink-900 px-2.5 py-1 hover:bg-ink-900 hover:text-ink-0 transition-colors"
        >
          + RECORD CURRENT SIMULATION
        </button>
      </div>

      {toast && (
        <div className="border border-ink-900 bg-ink-100 px-3 py-1.5 mb-3 font-mono text-[10px] tracking-wider text-ink-1000">
          {toast}
        </div>
      )}

      {stats.totalPredictions === 0 ? (
        <EmptyState />
      ) : tab === "STATS" ? (
        <StatsView stats={stats} />
      ) : (
        <PendingView pending={pending} onEvaluate={handleEvaluate} />
      )}
    </Card>
  );
}

// ---------- subviews ----------

function EmptyState() {
  return (
    <div className="border border-dashed border-ink-300 p-4 space-y-2">
      <div className="font-mono text-[10px] tracking-widest text-ink-500">
        EMPTY LEDGER
      </div>
      <p className="text-[12.5px] text-ink-700 leading-relaxed">
        Calibration is the difference between a tool you trust and a tool you
        ignore. Click <span className="font-mono">RECORD CURRENT SIMULATION</span>{" "}
        to start capturing predictions. When real-world events resolve them,
        mark them HAPPENED / PARTIAL / DIDN'T.
      </p>
      <p className="text-[12.5px] text-ink-700 leading-relaxed">
        Over time HELM scores how well its forecasts track reality — a rolling
        Brier score across all captured predictions.
      </p>
    </div>
  );
}

function StatsView({ stats }: { stats: CalibrationStats }) {
  const brierLabel =
    stats.brierScore === null ? "—" : stats.brierScore.toFixed(3);
  const bandLabel = stats.brierBand ?? "AWAITING DATA";
  const unevaluated = stats.totalPredictions - stats.evaluatedCount;

  return (
    <div className="space-y-4">
      <div className="border border-ink-300/60 bg-ink-100/40 p-4">
        <div className="font-mono text-[9px] tracking-widest text-ink-500 uppercase mb-1">
          BRIER SCORE
        </div>
        <div className="font-mono text-[44px] leading-none text-ink-1000 tracking-tight">
          {brierLabel}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`font-mono text-[10px] tracking-widest px-2 py-0.5 border ${bandColor(
              stats.brierBand,
            )}`}
          >
            {bandLabel}
          </span>
          <span className="font-mono text-[9px] text-ink-500 tracking-wider">
            lower is sharper · 0 = perfect
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="TOTAL" value={stats.totalPredictions} hint="captured" />
        <Stat label="EVAL'D" value={stats.evaluatedCount} hint="resolved" />
        <Stat label="PENDING" value={unevaluated} hint="awaiting outcome" />
      </div>

      <div>
        <div className="font-mono text-[9px] tracking-widest text-ink-500 uppercase mb-1.5">
          BY SCENARIO
        </div>
        {stats.byScenario.length === 0 ? (
          <div className="font-mono text-[10px] text-ink-500">—</div>
        ) : (
          <ul className="space-y-1">
            {stats.byScenario.map((row) => (
              <li
                key={row.scenario}
                className="flex items-center justify-between border-b border-ink-200/70 py-1"
              >
                <span className="font-mono text-[11px] text-ink-900 truncate pr-2">
                  {row.scenario}
                </span>
                <span className="font-mono text-[10px] text-ink-700 tracking-wider whitespace-nowrap">
                  n={row.count} · brier={row.brier === null ? "—" : row.brier.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PendingView({
  pending,
  onEvaluate,
}: {
  pending: Prediction[];
  onEvaluate: (id: string, outcome: PredictionOutcome) => void;
}) {
  if (pending.length === 0) {
    return (
      <div className="font-mono text-[10px] text-ink-500 leading-relaxed">
        No pending predictions. Either none captured yet, or every captured
        prediction has been resolved.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {pending.map((p) => (
        <li
          key={p.id}
          className="border border-ink-300/60 p-2 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] tracking-widest text-ink-500 truncate">
              {p.scenarioLabel}
            </span>
            <span className="font-mono text-[9px] tracking-wider text-ink-500 whitespace-nowrap">
              P={Math.round(p.predictedProbability * 100)}% · T=
              {Math.round(p.predictedThreat)}
            </span>
          </div>
          <div
            className="text-[12.5px] text-ink-1000 leading-snug"
            title={p.description}
          >
            {truncate(p.description, 100)}
          </div>
          <div className="flex items-center gap-1">
            <PendingBtn
              label="HAPPENED"
              onClick={() => onEvaluate(p.id, "HAPPENED")}
            />
            <PendingBtn
              label="PARTIAL"
              onClick={() => onEvaluate(p.id, "PARTIAL")}
            />
            <PendingBtn
              label="DIDN'T"
              onClick={() => onEvaluate(p.id, "DID_NOT_HAPPEN")}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PendingBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[10px] tracking-widest border border-ink-400 text-ink-700 px-2 py-0.5 hover:border-ink-900 hover:text-ink-1000 hover:bg-ink-100 transition-colors"
    >
      {label}
    </button>
  );
}

// ---------- helpers ----------

function bandColor(b: CalibrationStats["brierBand"]): string {
  switch (b) {
    case "EXCELLENT":
      return "border-ink-900 text-ink-1000 bg-ink-100";
    case "GOOD":
      return "border-ink-700 text-ink-900";
    case "FAIR":
      return "border-ink-500 text-ink-700";
    case "POOR":
      return "border-ink-400 text-ink-500";
    default:
      return "border-ink-300 text-ink-500";
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function emptyStats(): CalibrationStats {
  return {
    totalPredictions: 0,
    evaluatedCount: 0,
    brierScore: null,
    brierBand: null,
    byScenario: [],
    recentlyEvaluated: [],
  };
}
