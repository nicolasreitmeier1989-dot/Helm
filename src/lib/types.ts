// HELM — domain model for adversarial strategy simulation.
//
// v0.3 introduces a three-layer Strategic Topology that replaces the implicit
// "category"-driven model. Both OUR profile and the OPPONENT profile carry a
// full topology (Capabilities + Business Model Canvas + Value Proposition
// Canvases). Moves are now Topology Deltas — concrete shifts on one of those
// layers. The legacy `MoveCategory` enum stays as a derived summary tag for
// visualization grouping; `posture / warChest / innovationIndex / brandPower`
// stay on the competitor profile as summary signals derived alongside the
// topology.

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

// ---------- Strategic Topology (NEW v0.3) ----------

// Layer 1 — Capabilities (inside-out: what we can DO)
//
// v0.3F: capabilities live INSIDE capability sets. Sets are emergent,
// not fixed buckets — they carry a lifecycle (EMERGING → OBSOLETE),
// an era (year the set became strategically relevant), and a source
// (STANDARD library, CUSTOM user-defined, or SIGNAL_DERIVED from world
// events). A capability belongs to exactly one set via `setId`; the set
// itself carries the dimension.
export type CapabilityDimension = "PEOPLE" | "TECH" | "ORG" | "PROCESSES";

export type CapabilitySetLifecycle =
  | "EMERGING"
  | "GROWING"
  | "MATURE"
  | "DECLINING"
  | "OBSOLETE";

export type CapabilitySetSource = "STANDARD" | "CUSTOM" | "SIGNAL_DERIVED";

export interface CapabilitySet {
  id: string;
  name: string;                      // "AI-Native Operations", "Regulatory Tradecraft"
  dimension: CapabilityDimension;
  era: number;                       // year the set became strategically relevant
  lifecycle: CapabilitySetLifecycle;
  source: CapabilitySetSource;
  description?: string;
}

export interface Capability {
  id: string;
  setId: string;                     // FK to a CapabilitySet
  label: string;
  level: number;       // 0..100 — current strength
  importance: number;  // 0..100 — how strategic this capability is
  notes?: string;
}

// Layer 2 — Business Model Canvas (Osterwalder, 9 blocks)
export type BMCBlockKind =
  | "CUSTOMER_SEGMENTS"
  | "VALUE_PROPOSITIONS"
  | "CHANNELS"
  | "CUSTOMER_RELATIONSHIPS"
  | "REVENUE_STREAMS"
  | "KEY_RESOURCES"
  | "KEY_ACTIVITIES"
  | "KEY_PARTNERS"
  | "COST_STRUCTURE";

export interface BMCBlock {
  id: string;
  kind: BMCBlockKind;
  label: string;          // e.g., "Regulated finance mid-market"
  description?: string;
  strength: number;       // 0..100 — defensibility / quality
  evidence?: string[];
}

export interface BusinessModelCanvas {
  blocks: BMCBlock[];     // multiple items per kind allowed
}

// Layer 3 — Value Proposition Canvas (Osterwalder, per customer segment)
export interface VPCItem {
  id: string;
  label: string;
  weight: number;         // 0..100
}

export interface ValuePropositionCanvas {
  id: string;
  customerSegmentBlockId: string;   // FK to BMC block of kind CUSTOMER_SEGMENTS
  customerProfile: {
    jobs: VPCItem[];
    pains: VPCItem[];
    gains: VPCItem[];
  };
  valueMap: {
    productsServices: VPCItem[];
    painRelievers: VPCItem[];
    gainCreators: VPCItem[];
  };
}

export interface StrategicTopology {
  capabilitySets: CapabilitySet[];   // open list of sets (emergent, evolving)
  capabilities: Capability[];        // each belongs to a set via setId
  bmc: BusinessModelCanvas;
  vpcs: ValuePropositionCanvas[];
}

// ---------- Profiles ----------

export interface CompetitorProfile {
  name: string;
  industry: string;
  marketShare: number;          // 0..1
  warChest: number;             // 0..100 (legacy summary)
  innovationIndex: number;      // 0..100 (legacy summary)
  brandPower: number;           // 0..100 (legacy summary)
  posture: Posture;
  leadershipBias: number;       // -100 (visionary) .. +100 (optimizer)
  recentSignals: string[];
  topology: StrategicTopology;  // NEW — the real model
}

export interface OwnProfile {
  name: string;
  intent: string;               // strategic intent narrative
  // Rumelt kernel — NEW fields:
  diagnosis: string;            // The strategic situation in plain language.
  guidingPolicy: string;        // The chosen approach to overcome the diagnosis.
  openingMove: string;          // The first coherent action implementing the policy.
  horizonRounds: number;        // depth of look-ahead
  branchingFactor: number;      // moves considered per node
  topology: StrategicTopology;  // NEW
}

// ---------- Moves are Topology Deltas (NEW v0.3) ----------

export type DeltaOp = "ADD" | "STRENGTHEN" | "WEAKEN" | "REMOVE" | "MIGRATE";

export type DeltaTarget =
  | {
      kind: "CAPABILITY";
      dimension: CapabilityDimension;
      capabilityId?: string;
      setId?: string;                 // optional FK to the parent set (v0.3F)
    }
  | {
      kind: "CAPABILITY_SET";
      setId?: string;                 // when ADDing a new set, this is empty
      dimension?: CapabilityDimension;
    }
  | {
      kind: "BMC_BLOCK";
      blockKind: BMCBlockKind;
      blockId?: string;
    }
  | {
      kind: "VPC_ITEM";
      vpcId?: string;
      side: "CUSTOMER_PROFILE" | "VALUE_MAP";
      itemKind:
        | "jobs"
        | "pains"
        | "gains"
        | "productsServices"
        | "painRelievers"
        | "gainCreators";
      itemId?: string;
    };

export interface TopologyDelta {
  layer: "CAPABILITIES" | "BMC" | "VPC";
  op: DeltaOp;
  target: DeltaTarget;
  newLabel?: string;       // for ADD / MIGRATE
  magnitude: number;       // 0..100 — how big the change
  description: string;     // human-readable
}

export interface MoveNode {
  id: string;
  parentId: string | null;
  round: number;                // 1..N
  actor: "OPPONENT" | "SELF";
  title: string;
  rationale: string;
  probability: number;          // 0..1 conditional probability (given parent)
  cumulativeProbability: number;// 0..1
  threat: number;               // 0..100, threat-to-us; COMPUTED from deltas in v0.3
  cost: number;                 // 0..100, cost-to-opponent
  deltas: TopologyDelta[];      // NEW — what shifts on the topology
  counters: string[];           // our suggested counter-moves
  children: string[];
  indicators?: Indicator[];     // observable leading indicators (OPPONENT only)
  // Derived summary tag for visualization grouping (computed from dominant
  // delta target). Kept for backward compatibility with v0.2 panels.
  category: MoveCategory;
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
  | "SOCIAL"
  | "EMERGENCE";

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
