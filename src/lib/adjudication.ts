// HELM — Phase 5X.1 white-cell adjudication.
//
// Separates strategic INTENT from operational EFFECT. A senior planner who
// reads `threat = 80` should not internalize that the M&A move WILL happen
// at full magnitude. Reality: ~60% of corporate moves fail to land at intent
// because of friction — regulatory drag, internal coalition collapse,
// capability deficits, customer inertia, capital shortfalls, time-to-impact
// lag, and baseline execution risk.
//
// The adjudication layer accepts a candidate move (intent), the opponent's
// profile, our topology, and a round context, then produces an outcome
// distribution over {achieved, partial, blocked}, the list of frictions
// that shaped the distribution, the expected-realization fraction, and the
// realized threat (= intentThreat × expectedRealization).
//
// Phase 5X also re-exports a small module-level state slot used by
// EngineToggle to remember the selected Claude sub-mode (DIRECT vs
// ADJUDICATED) without us touching dashboard.tsx. See bottom of file.

import type {
  Adjudication,
  CapabilityDimension,
  CompetitorProfile,
  Friction,
  FrictionFactor,
  MoveCategory,
  OutcomeDistribution,
  StrategicTopology,
  TopologyDelta,
} from "./types";
import type { AIPatternId } from "./aiNativePatterns";
import { AI_NATIVE_PATTERNS } from "./aiNativePatterns";

// ---------- public API ----------

export interface AdjudicateInput {
  deltas: TopologyDelta[];
  intentThreat: number;
  category: MoveCategory;
  cost: number;
}

export interface AdjudicateContext {
  round: number;
  aiPattern?: AIPatternId;
}

export function adjudicate(
  move: AdjudicateInput,
  opponent: CompetitorProfile,
  ourTopology: StrategicTopology,
  context: AdjudicateContext,
): Adjudication {
  // 1. Baseline distribution.
  let achieved = 0.6;
  let partial = 0.3;
  let blocked = 0.1;

  // 2. Collect friction candidates.
  const frictions: Friction[] = [];

  // REGULATORY_DRAG — for moves whose dominant category collides with regulated
  // industries. Magnitude scaled by industry signal text.
  if (
    move.category === "M&A" ||
    move.category === "PRICING" ||
    move.category === "REGULATORY"
  ) {
    const industry = (opponent.industry ?? "").toLowerCase();
    const HEAVY = ["finance", "pharma", "telecom", "compliance", "regulated", "banking", "insurance", "health"];
    const matchedTerms = HEAVY.filter((w) => industry.includes(w));
    if (matchedTerms.length > 0 || move.category === "REGULATORY") {
      const base = matchedTerms.length > 0 ? 0.35 + Math.min(matchedTerms.length, 3) * 0.08 : 0.3;
      const mag = clamp01(base);
      const sigSnippet = matchedTerms.length > 0
        ? matchedTerms.join("/")
        : "general regulatory environment";
      frictions.push({
        factor: "REGULATORY_DRAG",
        magnitude: mag,
        rationale: `${categoryLabel(move.category)}-Zug trifft auf ${sigSnippet} — Genehmigungs- und Compliance-Latenz erwartet.`,
      });
    }
  }

  // CAPABILITY_DEFICIT — moves whose deltas hit a capability dimension where
  // OPPONENT's own aggregate level in that dimension < 50 (they can't execute
  // it). A small bump if the relevant set is DECLINING/OBSOLETE.
  const dimsTouched = new Set<CapabilityDimension>();
  for (const d of move.deltas) {
    if (d.target.kind === "CAPABILITY" && d.target.dimension) {
      dimsTouched.add(d.target.dimension);
    }
    if (d.target.kind === "CAPABILITY_SET" && d.target.dimension) {
      dimsTouched.add(d.target.dimension);
    }
  }
  for (const dim of dimsTouched) {
    const caps = opponent.topology.capabilities.filter((c) => {
      const set = opponent.topology.capabilitySets.find((s) => s.id === c.setId);
      return set?.dimension === dim;
    });
    if (caps.length === 0) continue;
    const avg = caps.reduce((s, c) => s + c.level, 0) / caps.length;
    if (avg >= 50) continue;
    let mag = (50 - avg) / 100;
    const setsInDim = opponent.topology.capabilitySets.filter((s) => s.dimension === dim);
    const fading = setsInDim.some((s) => s.lifecycle === "DECLINING" || s.lifecycle === "OBSOLETE");
    if (fading) mag += 0.08;
    mag = clamp01(mag);
    frictions.push({
      factor: "CAPABILITY_DEFICIT",
      magnitude: mag,
      rationale: `Gegner-${dim}-Capability-Pool im Schnitt bei ${avg.toFixed(0)}/100${
        fading ? ", relevantes Set bereits in DECLINING/OBSOLETE" : ""
      } — Ausführungs-Kapazität fehlt.`,
    });
  }

  // COALITION_RISK — AGGRESSIVE posture + optimizer-leaning leadership resists
  // aggressive bets; or M&A moves mentioned in CFO/Board signals.
  const optimizerBias = opponent.leadershipBias > 30;
  const aggressive = opponent.posture === "AGGRESSIVE";
  const isMnA = move.category === "M&A";
  const signalsLower = (opponent.recentSignals ?? []).map((s) => s.toLowerCase());
  const cfoBoardMention = signalsLower.some(
    (s) => s.includes("cfo") || s.includes("board") || s.includes("aufsichtsrat"),
  );
  if ((aggressive && optimizerBias) || (isMnA && cfoBoardMention)) {
    // 0.25–0.45 scaling
    const lo = 0.25;
    const hi = 0.45;
    const biasFrac = clamp01((opponent.leadershipBias - 30) / 70);
    const mag = clamp01(lo + (hi - lo) * (biasFrac * 0.5 + (cfoBoardMention ? 0.5 : 0.3)));
    const why = aggressive && optimizerBias
      ? `Aggressive Posture trifft auf optimizer-leaning Leadership (bias ${opponent.leadershipBias}) — interner Widerstand erwartet.`
      : `CFO/Board-Signale in jüngsten Earnings/Filings — M&A-Koalition fragil.`;
    frictions.push({ factor: "COALITION_RISK", magnitude: mag, rationale: why });
  }

  // CUSTOMER_INERTIA — deltas targeting CUSTOMER_SEGMENTS (switching segments
  // is slow). Magnitude 0.25.
  const touchesCustSeg = move.deltas.some(
    (d) => d.target.kind === "BMC_BLOCK" && d.target.blockKind === "CUSTOMER_SEGMENTS",
  );
  if (touchesCustSeg) {
    frictions.push({
      factor: "CUSTOMER_INERTIA",
      magnitude: 0.25,
      rationale: "Delta verschiebt Customer-Segments — Sales-Cycle und Switching-Costs absorbieren Initial-Impact.",
    });
  }

  // CAPITAL_SHORTFALL — cost > warChest. Magnitude = (cost - warChest) / 100,
  // clamped to 0..0.5.
  if (move.cost > opponent.warChest) {
    const mag = clamp01(Math.min(0.5, (move.cost - opponent.warChest) / 100));
    frictions.push({
      factor: "CAPITAL_SHORTFALL",
      magnitude: mag,
      rationale: `Move-Kosten ${move.cost} > War-Chest ${opponent.warChest} — Kapitaldecke knapp, Tempo wird gedrosselt.`,
    });
  }

  // TIME_TO_IMPACT_LAG — only for early rounds (round <= 1) when an AI-native
  // pattern is in play. Magnitude derived from pattern's natural velocity.
  if (context.aiPattern && context.round <= 1) {
    const pattern = AI_NATIVE_PATTERNS.find((p) => p.id === context.aiPattern);
    if (pattern) {
      const mag = velocityToFrictionMagnitude(pattern.timeToImpact);
      if (mag > 0) {
        frictions.push({
          factor: "TIME_TO_IMPACT_LAG",
          magnitude: mag,
          rationale: `AI-Native Pattern "${pattern.name}" hat natürlichen Time-to-Impact von ${pattern.timeToImpact} — Frühround-Lag.`,
        });
      }
    }
  }

  // EXECUTION_RISK — always-on baseline. Strategy execution is hard.
  frictions.push({
    factor: "EXECUTION_RISK",
    magnitude: 0.1,
    rationale: "Baseline-Execution-Risiko: Plan-zu-Wirklichkeit-Lücke selbst bei guter Vorbereitung.",
  });

  // 3. Apply each friction to the distribution.
  // achieved -= magnitude * 0.5; partial += magnitude * 0.3; blocked += magnitude * 0.2.
  for (const f of frictions) {
    achieved -= f.magnitude * 0.5;
    partial += f.magnitude * 0.3;
    blocked += f.magnitude * 0.2;
  }

  // 4. Clamp each to [0,1] and normalize so they sum to 1.
  achieved = clamp01(achieved);
  partial = clamp01(partial);
  blocked = clamp01(blocked);
  let total = achieved + partial + blocked;
  if (total <= 0) {
    achieved = 0.6;
    partial = 0.3;
    blocked = 0.1;
    total = 1;
  }
  achieved /= total;
  partial /= total;
  blocked /= total;

  const outcomeDistribution: OutcomeDistribution = { achieved, partial, blocked };

  // 5. expectedRealization.
  const expectedRealization = 1 * achieved + 0.5 * partial + 0 * blocked;

  // 6. realizedThreat.
  const intent = clamp01to100(move.intentThreat);
  const realizedThreat = Math.round(intent * expectedRealization);

  return {
    intentThreat: intent,
    outcomeDistribution,
    frictions,
    expectedRealization,
    realizedThreat,
  };
}

// ---------- helpers ----------

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clamp01to100(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function categoryLabel(c: MoveCategory): string {
  switch (c) {
    case "M&A": return "M&A";
    case "PRICING": return "Pricing";
    case "REGULATORY": return "Regulatory";
    default: return c.toString();
  }
}

// AI-pattern velocity → time-to-impact friction magnitude (0..1).
//
// "immediate"           → 0     (no lag)
// "12–24 months"        → 0.20  (mid)
// "18–36 months"        → 0.30
// "24 months"           → 0.30
// "24–48 months"        → 0.40
// "36+ months"          → 0.55  (high)
// "structural"          → 0.45  (slow but inevitable)
function velocityToFrictionMagnitude(timeToImpact: string): number {
  const t = timeToImpact.toLowerCase();
  if (t.includes("immediate")) return 0;
  if (t.includes("36+") || t.includes("36 +")) return 0.55;
  if (t.includes("structural")) return 0.45;
  if (t.includes("24–48") || t.includes("24-48")) return 0.4;
  if (t.includes("18–36") || t.includes("18-36")) return 0.3;
  if (t.includes("24")) return 0.3;
  if (t.includes("12–24") || t.includes("12-24")) return 0.2;
  return 0.15;
}

// ---------- Friction factor presentation helpers (used by Inspector) ----------

export const FRICTION_LABELS: Record<FrictionFactor, string> = {
  REGULATORY_DRAG: "Regulatory Drag",
  COALITION_RISK: "Coalition Risk",
  CAPABILITY_DEFICIT: "Capability Deficit",
  CUSTOMER_INERTIA: "Customer Inertia",
  CAPITAL_SHORTFALL: "Capital Shortfall",
  TIME_TO_IMPACT_LAG: "Time-to-Impact Lag",
  EXECUTION_RISK: "Execution Risk",
};

// ---------- Module-level mutable state for Claude sub-mode selection ----------
//
// Phase 5X.2 introduces a sub-mode toggle (DIRECT vs ADJUDICATED) inside the
// EngineToggle component. The dashboard's runClaude POST body is owned by
// dashboard.tsx which we cannot modify, so we expose a tiny module-scoped
// slot the toggle writes into; anyone constructing a /api/simulate body can
// pick it up. Default DIRECT preserves today's behavior.

export type ClaudeSubMode = "DIRECT" | "ADJUDICATED";

let _claudeSubMode: ClaudeSubMode = "DIRECT";
const _subModeListeners = new Set<(m: ClaudeSubMode) => void>();

export function getClaudeSubMode(): ClaudeSubMode {
  return _claudeSubMode;
}

export function setClaudeSubMode(m: ClaudeSubMode): void {
  if (_claudeSubMode === m) return;
  _claudeSubMode = m;
  _subModeListeners.forEach((fn) => fn(m));
}

export function subscribeClaudeSubMode(
  cb: (m: ClaudeSubMode) => void,
): () => void {
  _subModeListeners.add(cb);
  return () => _subModeListeners.delete(cb);
}

// ---------- Last-run cost tracker (surfaced by EngineToggle) ----------

export interface LastRunUsage {
  mode: ClaudeSubMode;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  at: string;  // ISO timestamp
}

let _lastRun: LastRunUsage | null = null;
const _lastRunListeners = new Set<(u: LastRunUsage | null) => void>();

export function getLastRunUsage(): LastRunUsage | null {
  return _lastRun;
}

export function setLastRunUsage(u: LastRunUsage | null): void {
  _lastRun = u;
  _lastRunListeners.forEach((fn) => fn(u));
}

export function subscribeLastRunUsage(
  cb: (u: LastRunUsage | null) => void,
): () => void {
  _lastRunListeners.add(cb);
  return () => _lastRunListeners.delete(cb);
}

// Opus 4.7 pricing: $5/1M input, $25/1M output, $0.50/1M cache reads.
export function computeOpus47Cost(usage: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}): number {
  const inCost = (usage.inputTokens / 1_000_000) * 5;
  const outCost = (usage.outputTokens / 1_000_000) * 25;
  const cacheCost = (usage.cacheReadTokens / 1_000_000) * 0.5;
  return inCost + outCost + cacheCost;
}
