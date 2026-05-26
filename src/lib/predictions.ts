// HELM — Calibration Ledger (Phase 5Y.1).
//
// Every OPPONENT move node in a generated simulation is implicitly a
// prediction: "We think there is an N% chance the competitor will do X."
// Today we throw those away on re-roll. The Calibration Ledger captures
// them, lets the operator mark them HAPPENED / PARTIAL / DID_NOT_HAPPEN
// when reality plays out, and computes a rolling Brier score so HELM's
// forecasting discipline is visible — and improvable — over time.
//
// Storage is intentionally self-contained: localStorage under
// `helm:predictions:v1`. No dependency on the project store; predictions
// outlive the projects they were extracted from. Module is SSR-safe
// (every entry point no-ops when `window` is missing).

import type { Simulation } from "./types";

export type PredictionOutcome = "HAPPENED" | "PARTIAL" | "DID_NOT_HAPPEN";

export interface Prediction {
  id: string;
  simulationId: string;
  projectId?: string;
  nodeId: string;
  category: string; // mirror of MoveNode.category
  predictedAt: string; // ISO
  description: string; // node.title
  rationale: string; // node.rationale
  scenarioLabel: string;
  predictedProbability: number; // node.cumulativeProbability, 0..1
  predictedThreat: number; // node.threat, 0..100
  // Evaluation — filled in by user later
  evaluated?: boolean;
  evaluatedAt?: string;
  outcome?: PredictionOutcome;
  evaluationNote?: string;
}

export type BrierBand = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export interface CalibrationStats {
  totalPredictions: number;
  evaluatedCount: number;
  brierScore: number | null;
  brierBand: BrierBand | null;
  byScenario: { scenario: string; count: number; brier: number | null }[];
  recentlyEvaluated: Prediction[]; // last 10 evaluations
}

const STORE_KEY = "helm:predictions:v1";

// ---------- raw persistence ----------

function load(): Prediction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Prediction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: Prediction[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(items));
  } catch {
    /* quota or serialisation — ignore */
  }
}

function uid(): string {
  return `pred_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

// ---------- public API ----------

export function listPredictions(): Prediction[] {
  return load();
}

// Idempotent: skip if a prediction with same {simulationId, nodeId}
// already exists. Records only OPPONENT nodes (those are what we're
// actually predicting; SELF moves are our hypothetical responses, not
// reality-checkable claims). Returns the count newly captured.
export function recordPredictions(
  sim: Simulation,
  projectId?: string,
): number {
  const existing = load();
  const existingKey = new Set(
    existing.map((p) => `${p.simulationId}::${p.nodeId}`),
  );
  const predictedAt = new Date().toISOString();

  // Map rootIds → scenario labels (rootIds[i] belongs to scenarios[i]).
  const scenarioByRootId: Record<string, string> = {};
  sim.rootIds.forEach((rid, i) => {
    scenarioByRootId[rid] =
      sim.scenarios[i]?.label ?? `Scenario ${i + 1}`;
  });

  // Walk children to inherit scenarioLabel.
  const labelByNodeId: Record<string, string> = {};
  const assign = (nodeId: string, label: string) => {
    labelByNodeId[nodeId] = label;
    const node = sim.nodes[nodeId];
    if (!node) return;
    for (const c of node.children) assign(c, label);
  };
  for (const rid of sim.rootIds) {
    assign(rid, scenarioByRootId[rid] ?? "Scenario");
  }

  const next = [...existing];
  let added = 0;
  for (const id in sim.nodes) {
    const n = sim.nodes[id];
    if (n.actor !== "OPPONENT") continue;
    const key = `${sim.id}::${n.id}`;
    if (existingKey.has(key)) continue;
    next.push({
      id: uid(),
      simulationId: sim.id,
      projectId,
      nodeId: n.id,
      category: String(n.category),
      predictedAt,
      description: n.title,
      rationale: n.rationale,
      scenarioLabel: labelByNodeId[n.id] ?? "Scenario",
      predictedProbability: clamp01(n.cumulativeProbability),
      predictedThreat: clampN(n.threat, 0, 100),
      evaluated: false,
    });
    added += 1;
  }

  save(next);
  return added;
}

export function evaluatePrediction(
  id: string,
  outcome: PredictionOutcome,
  note?: string,
): void {
  const items = load();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return;
  items[idx] = {
    ...items[idx],
    evaluated: true,
    evaluatedAt: new Date().toISOString(),
    outcome,
    evaluationNote: note,
  };
  save(items);
}

export function unevaluatePrediction(id: string): void {
  const items = load();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const { evaluated: _e, evaluatedAt: _a, outcome: _o, evaluationNote: _n, ...rest } =
    items[idx];
  void _e;
  void _a;
  void _o;
  void _n;
  items[idx] = { ...rest, evaluated: false };
  save(items);
}

export function deletePrediction(id: string): void {
  const items = load().filter((p) => p.id !== id);
  save(items);
}

// Brier formula: (1/N) * Σ (predicted_prob - actual_binary)^2
// actual_binary: HAPPENED=1, PARTIAL=0.5, DID_NOT_HAPPEN=0
// Bands: < 0.10 EXCELLENT, < 0.20 GOOD, < 0.30 FAIR, ≥ 0.30 POOR
export function computeStats(): CalibrationStats {
  const items = load();
  const evaluated = items.filter((p) => p.evaluated && p.outcome);
  const brierScore =
    evaluated.length === 0 ? null : brier(evaluated);

  // By-scenario rollup.
  const byScenarioMap: Record<
    string,
    { count: number; evaluated: Prediction[] }
  > = {};
  for (const p of items) {
    const k = p.scenarioLabel || "Scenario";
    if (!byScenarioMap[k]) byScenarioMap[k] = { count: 0, evaluated: [] };
    byScenarioMap[k].count += 1;
    if (p.evaluated && p.outcome) byScenarioMap[k].evaluated.push(p);
  }
  const byScenario = Object.entries(byScenarioMap)
    .map(([scenario, v]) => ({
      scenario,
      count: v.count,
      brier: v.evaluated.length === 0 ? null : brier(v.evaluated),
    }))
    .sort((a, b) => b.count - a.count);

  const recentlyEvaluated = evaluated
    .slice()
    .sort((a, b) => {
      const ta = a.evaluatedAt ?? "";
      const tb = b.evaluatedAt ?? "";
      return tb.localeCompare(ta);
    })
    .slice(0, 10);

  return {
    totalPredictions: items.length,
    evaluatedCount: evaluated.length,
    brierScore,
    brierBand: brierScore === null ? null : band(brierScore),
    byScenario,
    recentlyEvaluated,
  };
}

// ---------- internals ----------

function brier(evaluated: Prediction[]): number {
  let sum = 0;
  for (const p of evaluated) {
    const actual = actualBinary(p.outcome);
    const diff = p.predictedProbability - actual;
    sum += diff * diff;
  }
  return sum / evaluated.length;
}

function actualBinary(outcome: PredictionOutcome | undefined): number {
  if (outcome === "HAPPENED") return 1;
  if (outcome === "PARTIAL") return 0.5;
  return 0;
}

function band(brierScore: number): BrierBand {
  if (brierScore < 0.1) return "EXCELLENT";
  if (brierScore < 0.2) return "GOOD";
  if (brierScore < 0.3) return "FAIR";
  return "POOR";
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampN(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
