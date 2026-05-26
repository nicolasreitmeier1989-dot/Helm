// HELM — domain model for adversarial strategy simulation.

export type Posture =
  | "AGGRESSIVE"
  | "EXPANSIVE"
  | "DEFENSIVE"
  | "OPPORTUNISTIC"
  | "CONSERVATIVE";

export type MoveCategory =
  | "PRICING"
  | "PRODUCT"
  | "M&A"
  | "TALENT"
  | "GEO"
  | "CHANNEL"
  | "BRAND"
  | "REGULATORY"
  | "CAPITAL"
  | "PARTNERSHIP";

export interface CompetitorProfile {
  name: string;
  industry: string;
  marketShare: number;          // 0..1
  warChest: number;             // 0..100, normalized capital availability
  innovationIndex: number;      // 0..100
  brandPower: number;           // 0..100
  posture: Posture;
  leadershipBias: number;       // -100 (founder/visionary, risky) .. +100 (PE/optimizer, conservative)
  recentSignals: string[];      // free-text observed signals
}

export interface OwnProfile {
  name: string;
  intent: string;               // strategic intent narrative
  openingMove: string;          // the move WE play in round 1
  horizonRounds: number;        // depth of look-ahead
  branchingFactor: number;      // moves considered per node
}

export interface MoveNode {
  id: string;
  parentId: string | null;
  round: number;                // 1..N
  actor: "OPPONENT" | "SELF";
  category: MoveCategory;
  title: string;
  rationale: string;
  probability: number;          // 0..1 conditional probability (given parent)
  cumulativeProbability: number;// 0..1
  threat: number;               // 0..100, threat-to-us if executed
  cost: number;                 // 0..100, cost-to-opponent
  counters: string[];           // our suggested counter-moves
  children: string[];
  indicators?: Indicator[];     // observable leading indicators for this move (OPPONENT only)
}

// ---------- Indicators & Triggers (Strategic Operations Center) ----------

export type IndicatorSource =
  | "NEWS"
  | "HIRING"
  | "PATENT"
  | "FILING"
  | "PRICING"
  | "CHANNEL"
  | "REGULATORY"
  | "CAPITAL"
  | "SOCIAL";

export interface Indicator {
  id: string;
  nodeId: string;            // MoveNode this indicator is attached to
  label: string;             // short, human-readable headline
  source: IndicatorSource;   // origin / type of evidence stream
  description: string;       // 1-line elaboration
  weight: number;            // 0..1 — how diagnostic this signal is for the parent move
}

export type TriggerState =
  | "ARMED"      // monitoring, not fired
  | "FIRING"     // candidate evidence under review (UI-only transient)
  | "FIRED"      // confirmed observed
  | "ACK"        // acknowledged by the operator
  | "DISMISSED"; // operator deemed irrelevant / false positive

export interface Trigger {
  id: string;
  indicatorId: string;
  nodeId: string;
  simulationId: string;
  state: TriggerState;
  firedAt?: string;
  acknowledgedAt?: string;
  evidenceUrl?: string;
  evidenceNote?: string;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  weight: number;               // 0..1 prior probability of scenario
  modifiers: Partial<CompetitorProfile>;
}

export interface Simulation {
  id: string;
  createdAt: string;
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
  nodes: Record<string, MoveNode>;
  rootIds: string[];            // one per scenario
}
