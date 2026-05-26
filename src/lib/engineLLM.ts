// HELM — Claude-backed strategic reasoner (v0.3).
//
// Returns the same Simulation shape as the local heuristic, so the UI is
// identical regardless of backend. Updated for the topology model: each move
// the LLM emits now carries a `dominant_target` plus a short rationale. Full
// TopologyDelta synthesis is then done locally — this keeps the JSON schema
// small enough that structured-outputs validation always succeeds, while
// still letting Claude choose WHICH layer / dimension / block to hit.

import Anthropic from "@anthropic-ai/sdk";
import { attachIndicatorsToSimulation } from "./engine";
import { deriveCategoryFromDeltas } from "./topology";
import type {
  BMCBlockKind,
  CapabilityDimension,
  CompetitorProfile,
  MoveCategory,
  MoveNode,
  OwnProfile,
  Scenario,
  Simulation,
  TopologyDelta,
} from "./types";

// ---------- Static prompt material ----------

const SYSTEM_PROMPT = `You are HELM, an adversarial strategy reasoner for corporate competitive intelligence.

You simulate how a specific competitor will respond to our opening move across multiple rounds and multiple
scenarios, then recommend our counter-moves. You think like a game-theory analyst combined with a top-tier
strategy partner: anticipate the opponent 3–5 moves ahead, weight branches by realistic conditional
probability, identify the highest expected-loss trajectories.

# THE STRATEGIC TOPOLOGY (the model you reason over)

Every entity (us + competitor) has a THREE-LAYER topology:

1) CAPABILITIES across four dimensions — PEOPLE, TECH, ORG, PROCESSES — each capability has a level (0..100)
   and an importance (0..100). High importance + low level = a strategic vulnerability. High level + high
   importance = a moat.

2) BUSINESS MODEL CANVAS — the 9 Osterwalder blocks: CUSTOMER_SEGMENTS, VALUE_PROPOSITIONS, CHANNELS,
   CUSTOMER_RELATIONSHIPS, REVENUE_STREAMS, KEY_RESOURCES, KEY_ACTIVITIES, KEY_PARTNERS, COST_STRUCTURE.
   Each block has a strength (0..100). Shared CUSTOMER_SEGMENTS between the opponent and us = collision.

3) VALUE PROPOSITION CANVAS (per segment) — customerProfile (jobs/pains/gains) vs valueMap
   (productsServices/painRelievers/gainCreators). Attacks on the valueMap of a shared segment are the
   hottest competitive moves.

# MENTAL MODEL FOR MOVES

Every move shifts ONE point on the topology. You pick:
  - the LAYER (CAPABILITIES, BMC, or VPC)
  - the OP (ADD, STRENGTHEN, WEAKEN, REMOVE, MIGRATE)
  - the TARGET (which dimension / which block kind / which VPC item kind)
  - a magnitude (0..100)

For OPPONENT moves you reason FROM the OPPONENT'S perspective. Weight their move set by their posture, their
leadership bias, their war chest, innovation index, brand power and recent signals.

For SELF (our) moves you act as our strategist: counter the opponent's specific delta. Prefer asymmetric
moves (low cost / high impact). Defend our moats. Exploit the opponent's structural gaps.

Round T0 is our opening (the implicit root provided by the user). Rounds T1, T3 = OPPONENT moves;
Rounds T2, T4 = SELF moves. Sibling probabilities must sum to ~1.0 (we will normalize).

# OUTPUT

Return JSON exactly conforming to the schema. Do NOT include the opening move as a child — it's the root.
The first round of children (round 1) are OPPONENT responses. Use a stable temp_id per scenario
(e.g. "s1m3"). Categories are derived locally — you don't need to set them.`;

const SIMULATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    scenarios: {
      type: "array",
      description: "One entry per input scenario, same order.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scenario_index: { type: "integer" },
          root_rationale: { type: "string" },
          moves: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                temp_id: { type: "string" },
                parent_temp_id: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                round: { type: "integer" },
                actor: { type: "string", enum: ["OPPONENT", "SELF"] },
                title: { type: "string" },
                rationale: { type: "string" },
                probability: { type: "number" },
                cost: { type: "integer", description: "0..100, cost to the actor." },
                // Dominant target — selected from a fixed enum so the schema
                // stays compact. Threat & deltas are synthesized locally.
                layer: {
                  type: "string",
                  enum: ["CAPABILITIES", "BMC", "VPC"],
                },
                op: {
                  type: "string",
                  enum: ["ADD", "STRENGTHEN", "WEAKEN", "REMOVE", "MIGRATE"],
                },
                capability_dimension: {
                  anyOf: [
                    { type: "string", enum: ["PEOPLE", "TECH", "ORG", "PROCESSES"] },
                    { type: "null" },
                  ],
                  description: "Required when layer = CAPABILITIES.",
                },
                bmc_block_kind: {
                  anyOf: [
                    {
                      type: "string",
                      enum: [
                        "CUSTOMER_SEGMENTS",
                        "VALUE_PROPOSITIONS",
                        "CHANNELS",
                        "CUSTOMER_RELATIONSHIPS",
                        "REVENUE_STREAMS",
                        "KEY_RESOURCES",
                        "KEY_ACTIVITIES",
                        "KEY_PARTNERS",
                        "COST_STRUCTURE",
                      ],
                    },
                    { type: "null" },
                  ],
                  description: "Required when layer = BMC or VPC (parent block of the VPC).",
                },
                vpc_side: {
                  anyOf: [
                    { type: "string", enum: ["CUSTOMER_PROFILE", "VALUE_MAP"] },
                    { type: "null" },
                  ],
                },
                vpc_item_kind: {
                  anyOf: [
                    {
                      type: "string",
                      enum: [
                        "jobs", "pains", "gains",
                        "productsServices", "painRelievers", "gainCreators",
                      ],
                    },
                    { type: "null" },
                  ],
                },
                target_label: {
                  type: "string",
                  description: "Short human label for what is being changed.",
                },
                magnitude: { type: "integer", description: "0..100" },
                counters: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "temp_id",
                "parent_temp_id",
                "round",
                "actor",
                "title",
                "rationale",
                "probability",
                "cost",
                "layer",
                "op",
                "capability_dimension",
                "bmc_block_kind",
                "vpc_side",
                "vpc_item_kind",
                "target_label",
                "magnitude",
                "counters",
              ],
            },
          },
        },
        required: ["scenario_index", "root_rationale", "moves"],
      },
    },
  },
  required: ["scenarios"],
} as const;

// ---------- Public API ----------

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface SimulateLLMInput {
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
}

export async function simulateWithClaude(
  input: SimulateLLMInput,
): Promise<Simulation> {
  if (!isClaudeConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic();
  const userPayload = buildUserPayload(input);

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        name: "helm_simulation",
        schema: SIMULATION_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPayload }],
  });

  const finalMessage = await stream.finalMessage();

  const textBlock = finalMessage.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  let parsed: LLMResponse;
  try {
    parsed = JSON.parse(textBlock.text) as LLMResponse;
  } catch (e) {
    throw new Error(`Claude response was not valid JSON: ${(e as Error).message}`);
  }

  return assembleSimulation(parsed, input, {
    cacheRead: finalMessage.usage.cache_read_input_tokens ?? 0,
    cacheCreate: finalMessage.usage.cache_creation_input_tokens ?? 0,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  });
}

// ---------- helpers ----------

function buildUserPayload(input: SimulateLLMInput): string {
  return JSON.stringify(
    {
      competitor: {
        name: input.competitor.name,
        industry: input.competitor.industry,
        marketShare: input.competitor.marketShare,
        warChest: input.competitor.warChest,
        innovationIndex: input.competitor.innovationIndex,
        brandPower: input.competitor.brandPower,
        posture: input.competitor.posture,
        leadershipBias: input.competitor.leadershipBias,
        recentSignals: input.competitor.recentSignals,
        topology: input.competitor.topology,
      },
      own: {
        name: input.own.name,
        intent: input.own.intent,
        diagnosis: input.own.diagnosis,
        guiding_policy: input.own.guidingPolicy,
        opening_move: input.own.openingMove,
        horizon_rounds: input.own.horizonRounds,
        branching_factor: input.own.branchingFactor,
        topology: input.own.topology,
      },
      scenarios: input.scenarios.map((s, i) => ({
        index: i,
        id: s.id,
        label: s.label,
        description: s.description,
        weight: s.weight,
        modifiers: s.modifiers,
      })),
      instructions:
        "Return scenarios[] in the same order. For each scenario, build a tree respecting horizon and branching. Apply scenario modifiers as a competitor-profile override for THAT scenario only. Pick deltas that exploit OUR structural weaknesses (low-level + high-importance capabilities; weak BMC blocks; shared customer segments).",
    },
    null,
    0,
  );
}

interface LLMMove {
  temp_id: string;
  parent_temp_id: string | null;
  round: number;
  actor: "OPPONENT" | "SELF";
  title: string;
  rationale: string;
  probability: number;
  cost: number;
  layer: "CAPABILITIES" | "BMC" | "VPC";
  op: "ADD" | "STRENGTHEN" | "WEAKEN" | "REMOVE" | "MIGRATE";
  capability_dimension: CapabilityDimension | null;
  bmc_block_kind: BMCBlockKind | null;
  vpc_side: "CUSTOMER_PROFILE" | "VALUE_MAP" | null;
  vpc_item_kind:
    | "jobs"
    | "pains"
    | "gains"
    | "productsServices"
    | "painRelievers"
    | "gainCreators"
    | null;
  target_label: string;
  magnitude: number;
  counters: string[];
}

interface LLMScenario {
  scenario_index: number;
  root_rationale: string;
  moves: LLMMove[];
}

interface LLMResponse {
  scenarios: LLMScenario[];
}

interface Usage {
  cacheRead: number;
  cacheCreate: number;
  inputTokens: number;
  outputTokens: number;
}

function deltaFromLLM(m: LLMMove): TopologyDelta {
  const layer = m.layer;
  if (layer === "CAPABILITIES" && m.capability_dimension) {
    return {
      layer,
      op: m.op,
      target: { kind: "CAPABILITY", dimension: m.capability_dimension },
      newLabel: m.op === "ADD" ? m.target_label : undefined,
      magnitude: clamp(m.magnitude, 0, 100),
      description: m.target_label,
    };
  }
  if (layer === "BMC" && m.bmc_block_kind) {
    return {
      layer,
      op: m.op,
      target: { kind: "BMC_BLOCK", blockKind: m.bmc_block_kind },
      newLabel: m.op === "ADD" ? m.target_label : undefined,
      magnitude: clamp(m.magnitude, 0, 100),
      description: m.target_label,
    };
  }
  if (layer === "VPC" && m.vpc_side && m.vpc_item_kind) {
    return {
      layer,
      op: m.op,
      target: {
        kind: "VPC_ITEM",
        side: m.vpc_side,
        itemKind: m.vpc_item_kind,
      },
      newLabel: m.op === "ADD" ? m.target_label : undefined,
      magnitude: clamp(m.magnitude, 0, 100),
      description: m.target_label,
    };
  }
  // Fallback — degenerate to a BMC VALUE_PROPOSITIONS strengthen
  return {
    layer: "BMC",
    op: "STRENGTHEN",
    target: { kind: "BMC_BLOCK", blockKind: "VALUE_PROPOSITIONS" },
    magnitude: clamp(m.magnitude, 0, 100),
    description: m.target_label || "Value-Prop reinforce",
  };
}

function threatFromDeltasLLM(
  deltas: TopologyDelta[],
  own: OwnProfile,
): number {
  const ourTop = own.topology;
  let t = 0;
  for (const d of deltas) {
    const mag = clamp(d.magnitude, 0, 100);
    const tgt = d.target;

    if (tgt.kind === "BMC_BLOCK") {
      const haveSameKind = ourTop.bmc.blocks.some((b) => b.kind === tgt.blockKind);
      if (haveSameKind) t += mag * 0.4;
    }
    if (tgt.kind === "VPC_ITEM") {
      t += mag * 0.6;
    }
    if (tgt.kind === "CAPABILITY") {
      const ourCaps = ourTop.capabilities.filter((c) => c.dimension === tgt.dimension);
      const avgLevel =
        ourCaps.length === 0
          ? 30
          : ourCaps.reduce((s, c) => s + c.level, 0) / ourCaps.length;
      const maxImp =
        ourCaps.length === 0 ? 50 : Math.max(...ourCaps.map((c) => c.importance));
      if (avgLevel < 65 && maxImp >= 65) t += mag * 0.5;
      else t += mag * 0.25;
    }
  }
  return Math.round(Math.max(0, Math.min(100, t)));
}

function assembleSimulation(
  resp: LLMResponse,
  input: SimulateLLMInput,
  usage: Usage,
): Simulation {
  const nodes: Record<string, MoveNode> = {};
  const rootIds: string[] = [];

  let nodeCounter = 0;
  const nextId = () => `n${(++nodeCounter).toString(36)}`;

  const sorted = [...resp.scenarios].sort(
    (a, b) => a.scenario_index - b.scenario_index,
  );

  sorted.forEach((scen, idx) => {
    const scenario = input.scenarios[scen.scenario_index] ?? input.scenarios[idx];

    const rootId = nextId();
    nodes[rootId] = {
      id: rootId,
      parentId: null,
      round: 0,
      actor: "SELF",
      category: "PRODUCT",
      title: input.own.openingMove || "Eröffnungszug",
      rationale: scen.root_rationale || `Eröffnungszug — Szenario: ${scenario.label}`,
      probability: 1,
      cumulativeProbability: 1,
      threat: 0,
      cost: 30,
      deltas: [],
      counters: [],
      children: [],
    };
    rootIds.push(rootId);

    const idMap: Record<string, string> = {};
    for (const m of scen.moves) idMap[m.temp_id] = nextId();

    // Normalize sibling probabilities per parent and per round.
    const groups: Record<string, LLMMove[]> = {};
    for (const m of scen.moves) {
      const k = `${m.parent_temp_id ?? "__root__"}|${m.round}`;
      (groups[k] ||= []).push(m);
    }
    for (const k in groups) {
      const sum = groups[k].reduce((s, m) => s + Math.max(0, m.probability), 0) || 1;
      groups[k].forEach((m) => {
        m.probability = Math.max(0.01, m.probability) / sum;
      });
    }

    const movesByRound = [...scen.moves].sort((a, b) => a.round - b.round);
    for (const m of movesByRound) {
      const id = idMap[m.temp_id];
      const parentId = m.parent_temp_id ? idMap[m.parent_temp_id] : rootId;
      const parent = nodes[parentId];
      if (!parent) continue;
      const delta = deltaFromLLM(m);
      const deltas: TopologyDelta[] = [delta];
      const category: MoveCategory = deriveCategoryFromDeltas(deltas);
      const threat =
        m.actor === "OPPONENT"
          ? threatFromDeltasLLM(deltas, input.own)
          : Math.max(0, 100 - parent.threat);
      const node: MoveNode = {
        id,
        parentId,
        round: m.round,
        actor: m.actor,
        category,
        title: m.title,
        rationale: m.rationale,
        probability: m.probability,
        cumulativeProbability: parent.cumulativeProbability * m.probability,
        threat,
        cost: clamp(m.cost, 0, 100),
        deltas,
        counters: m.actor === "OPPONENT" ? (m.counters || []).slice(0, 4) : [],
        children: [],
      };
      nodes[id] = node;
      parent.children.push(id);
    }
  });

  const sim: Simulation = {
    id: `sim_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    competitor: input.competitor,
    own: input.own,
    scenarios: input.scenarios,
    nodes,
    rootIds,
    ...({ usage } as Record<string, unknown>),
  } as Simulation;

  attachIndicatorsToSimulation(sim);
  return sim;
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
