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
import { adjudicate } from "./adjudication";
import type {
  Adjudication,
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
  // Phase 5X.2 — DIRECT (default, single call) vs ADJUDICATED (Red/White/Blue
  // per scenario per round).
  mode?: "DIRECT" | "ADJUDICATED";
}

export async function simulateWithClaude(
  input: SimulateLLMInput,
): Promise<Simulation> {
  if (!isClaudeConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const mode = input.mode ?? "DIRECT";
  if (mode === "ADJUDICATED") {
    return runAdjudicatedPipeline(input);
  }
  return runDirectPipeline(input);
}

async function runDirectPipeline(input: SimulateLLMInput): Promise<Simulation> {
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
      const ourCaps = ourTop.capabilities.filter((c) => {
        const set = ourTop.capabilitySets.find((s) => s.id === c.setId);
        return set?.dimension === tgt.dimension;
      });
      const avgLevel =
        ourCaps.length === 0
          ? 30
          : ourCaps.reduce((s, c) => s + c.level, 0) / ourCaps.length;
      const maxImp =
        ourCaps.length === 0 ? 50 : Math.max(...ourCaps.map((c) => c.importance));
      if (avgLevel < 65 && maxImp >= 65) t += mag * 0.5;
      else t += mag * 0.25;
    }
    if (tgt.kind === "CAPABILITY_SET") {
      // Treat as moderate threat — LLM tree uses a simpler heuristic for the set layer.
      t += mag * 0.35;
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

// =====================================================================
// Phase 5X.2 — ADJUDICATED pipeline (sealed Red / White / Blue cells)
// =====================================================================
//
// The DIRECT pipeline asks one Claude call to produce the whole tree —
// which means the model is reasoning as Red AND Blue inside one context
// (collusion). The ADJUDICATED pipeline issues three Claude calls per
// round per scenario with sealed system prompts:
//
//   1. RED   — sees only its own profile + round state, drafts 2–3 moves.
//   2. WHITE — sees both profiles, produces an Adjudication per move
//              (outcome distribution, frictions, realized threat).
//   3. BLUE  — sees the realized red moves (not raw intent), drafts
//              counter-moves; never sees Red's reasoning trace.
//
// Cost trade-off: ~$0.80–$1.50/run vs $0.10/run for DIRECT. The user
// opts in via the EngineToggle radio.

const RED_SYSTEM_PROMPT = `You are RED CELL — the opponent's strategist in an adversarial corporate-strategy war game.

You see ONLY your own profile (the opponent), a redacted summary of the defender's surface (not their plans, not their internal capability levels), and the current round state. You do NOT see the defender's strategic moves, their kernel, or what they will do next. You are not negotiating; you are scheming.

Produce 2–3 plausible next moves for THIS round only. Each move is a topology delta with explicit intent magnitude (0..100) and rationale. Be honest about your posture, your war chest, your leadership bias. Plausible means: a move your CEO would actually approve given the constraints — not an idealized maximizer.

Output JSON conforming exactly to the schema. Do not include counter-moves or defender responses.`;

const WHITE_SYSTEM_PROMPT = `You are WHITE CELL — the war-game adjudicator. You have read-access to both profiles.

Given each Red move (its delta, intent magnitude, and category), estimate the realistic outcome distribution over {achieved, partial, blocked} and list the 2–4 frictions that shaped the distribution. Frictions are one of: REGULATORY_DRAG, COALITION_RISK, CAPABILITY_DEFICIT, CUSTOMER_INERTIA, CAPITAL_SHORTFALL, TIME_TO_IMPACT_LAG, EXECUTION_RISK. Each friction has a magnitude (0..1) and a one-sentence rationale grounded in the profiles.

Achieved + partial + blocked must sum to 1.0. Realized threat = intentThreat × (1*achieved + 0.5*partial + 0*blocked), rounded.

Output JSON conforming exactly to the schema. Be skeptical of full-magnitude assumptions — ~60% of corporate moves fail to land at intent.`;

const BLUE_SYSTEM_PROMPT = `You are BLUE CELL — our defender's strategist.

You see ONLY the realized opponent moves AFTER white-cell adjudication (so you see the realistic, friction-adjusted effect, not raw intent), our own profile, and the round state. You do NOT see the opponent's draft reasoning or their unrealized variants.

Produce 2–3 counter-responses for THIS round. Each response is a topology delta on OUR side with rationale. Prefer asymmetric counters (low cost, high leverage). Defend our moats; exploit the friction the opponent encountered.

Output JSON conforming exactly to the schema.`;

const RED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    moves: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          temp_id: { type: "string" },
          title: { type: "string" },
          rationale: { type: "string" },
          probability: { type: "number" },
          cost: { type: "integer" },
          layer: { type: "string", enum: ["CAPABILITIES", "BMC", "VPC"] },
          op: { type: "string", enum: ["ADD", "STRENGTHEN", "WEAKEN", "REMOVE", "MIGRATE"] },
          capability_dimension: {
            anyOf: [
              { type: "string", enum: ["PEOPLE", "TECH", "ORG", "PROCESSES"] },
              { type: "null" },
            ],
          },
          bmc_block_kind: {
            anyOf: [
              {
                type: "string",
                enum: [
                  "CUSTOMER_SEGMENTS", "VALUE_PROPOSITIONS", "CHANNELS",
                  "CUSTOMER_RELATIONSHIPS", "REVENUE_STREAMS", "KEY_RESOURCES",
                  "KEY_ACTIVITIES", "KEY_PARTNERS", "COST_STRUCTURE",
                ],
              },
              { type: "null" },
            ],
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
                enum: ["jobs", "pains", "gains", "productsServices", "painRelievers", "gainCreators"],
              },
              { type: "null" },
            ],
          },
          target_label: { type: "string" },
          magnitude: { type: "integer" },
          intent_threat: { type: "integer", description: "0..100 — what this would do to the defender if fully achieved." },
        },
        required: [
          "temp_id", "title", "rationale", "probability", "cost",
          "layer", "op", "capability_dimension", "bmc_block_kind",
          "vpc_side", "vpc_item_kind", "target_label", "magnitude",
          "intent_threat",
        ],
      },
    },
  },
  required: ["moves"],
} as const;

const WHITE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    adjudications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          move_temp_id: { type: "string" },
          intent_threat: { type: "integer" },
          outcome: {
            type: "object",
            additionalProperties: false,
            properties: {
              achieved: { type: "number" },
              partial: { type: "number" },
              blocked: { type: "number" },
            },
            required: ["achieved", "partial", "blocked"],
          },
          frictions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                factor: {
                  type: "string",
                  enum: [
                    "REGULATORY_DRAG", "COALITION_RISK", "CAPABILITY_DEFICIT",
                    "CUSTOMER_INERTIA", "CAPITAL_SHORTFALL", "TIME_TO_IMPACT_LAG",
                    "EXECUTION_RISK",
                  ],
                },
                magnitude: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["factor", "magnitude", "rationale"],
            },
          },
          realized_threat: { type: "integer" },
        },
        required: ["move_temp_id", "intent_threat", "outcome", "frictions", "realized_threat"],
      },
    },
  },
  required: ["adjudications"],
} as const;

const BLUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    responses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          parent_red_temp_id: { type: "string" },
          temp_id: { type: "string" },
          title: { type: "string" },
          rationale: { type: "string" },
          probability: { type: "number" },
          cost: { type: "integer" },
          layer: { type: "string", enum: ["CAPABILITIES", "BMC", "VPC"] },
          op: { type: "string", enum: ["ADD", "STRENGTHEN", "WEAKEN", "REMOVE", "MIGRATE"] },
          capability_dimension: {
            anyOf: [
              { type: "string", enum: ["PEOPLE", "TECH", "ORG", "PROCESSES"] },
              { type: "null" },
            ],
          },
          bmc_block_kind: {
            anyOf: [
              {
                type: "string",
                enum: [
                  "CUSTOMER_SEGMENTS", "VALUE_PROPOSITIONS", "CHANNELS",
                  "CUSTOMER_RELATIONSHIPS", "REVENUE_STREAMS", "KEY_RESOURCES",
                  "KEY_ACTIVITIES", "KEY_PARTNERS", "COST_STRUCTURE",
                ],
              },
              { type: "null" },
            ],
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
                enum: ["jobs", "pains", "gains", "productsServices", "painRelievers", "gainCreators"],
              },
              { type: "null" },
            ],
          },
          target_label: { type: "string" },
          magnitude: { type: "integer" },
        },
        required: [
          "parent_red_temp_id", "temp_id", "title", "rationale", "probability", "cost",
          "layer", "op", "capability_dimension", "bmc_block_kind",
          "vpc_side", "vpc_item_kind", "target_label", "magnitude",
        ],
      },
    },
  },
  required: ["responses"],
} as const;

interface RedMoveOut {
  temp_id: string;
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
    | "jobs" | "pains" | "gains"
    | "productsServices" | "painRelievers" | "gainCreators"
    | null;
  target_label: string;
  magnitude: number;
  intent_threat: number;
}

interface WhiteAdjOut {
  move_temp_id: string;
  intent_threat: number;
  outcome: { achieved: number; partial: number; blocked: number };
  frictions: {
    factor:
      | "REGULATORY_DRAG" | "COALITION_RISK" | "CAPABILITY_DEFICIT"
      | "CUSTOMER_INERTIA" | "CAPITAL_SHORTFALL" | "TIME_TO_IMPACT_LAG"
      | "EXECUTION_RISK";
    magnitude: number;
    rationale: string;
  }[];
  realized_threat: number;
}

interface BlueResponseOut {
  parent_red_temp_id: string;
  temp_id: string;
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
    | "jobs" | "pains" | "gains"
    | "productsServices" | "painRelievers" | "gainCreators"
    | null;
  target_label: string;
  magnitude: number;
}

interface UsageAcc {
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheCreate: number;
}

async function callClaudeJson(
  client: Anthropic,
  systemPrompt: string,
  userPayload: string,
  schemaName: string,
  schema: Record<string, unknown>,
  usage: UsageAcc,
): Promise<unknown> {
  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        name: schemaName,
        schema,
      },
    },
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPayload }],
  });
  const final = await stream.finalMessage();
  usage.inputTokens += final.usage.input_tokens ?? 0;
  usage.outputTokens += final.usage.output_tokens ?? 0;
  usage.cacheRead += final.usage.cache_read_input_tokens ?? 0;
  usage.cacheCreate += final.usage.cache_creation_input_tokens ?? 0;
  const textBlock = final.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  try {
    return JSON.parse(textBlock.text);
  } catch (e) {
    throw new Error(`Claude response was not valid JSON: ${(e as Error).message}`);
  }
}

async function runAdjudicatedPipeline(
  input: SimulateLLMInput,
): Promise<Simulation> {
  const client = new Anthropic();
  const usage: UsageAcc = { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreate: 0 };

  const nodes: Record<string, MoveNode> = {};
  const rootIds: string[] = [];
  let nodeCounter = 0;
  const nextId = () => `n${(++nodeCounter).toString(36)}`;

  // Defender-redacted view that Red sees: high-level surface only.
  const redactedDefender = {
    name: input.own.name,
    intent: input.own.intent,
    industry_overlap: "shares some BMC blocks with you (Customer Segments, Value Propositions)",
    horizon_rounds: input.own.horizonRounds,
    // Capability set names but not levels — Red can intuit the shape but
    // not the asymmetries.
    capability_set_names: input.own.topology.capabilitySets.map((s) => s.name),
  };

  for (const scen of input.scenarios) {
    const effComp = applyScenarioModifiers(input.competitor, scen);

    const rootId = nextId();
    nodes[rootId] = {
      id: rootId,
      parentId: null,
      round: 0,
      actor: "SELF",
      category: "PRODUCT",
      title: input.own.openingMove || "Eröffnungszug",
      rationale: `Eröffnungszug — Szenario: ${scen.label}`,
      probability: 1,
      cumulativeProbability: 1,
      threat: 0,
      cost: 30,
      deltas: [],
      counters: [],
      children: [],
    };
    rootIds.push(rootId);

    // Frontier: list of (parentNodeId, parentSummary). We grow the tree
    // round-by-round; OPPONENT rounds = 1, 3, ...; SELF rounds = 2, 4, ...
    let frontier: { parentId: string; parentSummary: string }[] = [
      { parentId: rootId, parentSummary: input.own.openingMove },
    ];

    for (let round = 1; round <= input.own.horizonRounds; round++) {
      const isOpponent = round % 2 === 1;
      const newFrontier: { parentId: string; parentSummary: string }[] = [];

      for (const frame of frontier) {
        if (isOpponent) {
          // RED call
          const redPayload = JSON.stringify({
            you_are_the_opponent: {
              name: effComp.name,
              industry: effComp.industry,
              market_share: effComp.marketShare,
              war_chest: effComp.warChest,
              innovation_index: effComp.innovationIndex,
              brand_power: effComp.brandPower,
              posture: effComp.posture,
              leadership_bias: effComp.leadershipBias,
              recent_signals: effComp.recentSignals,
              topology_summary: summarizeTopology(effComp.topology),
            },
            defender_redacted: redactedDefender,
            round,
            scenario: { id: scen.id, label: scen.label, description: scen.description },
            parent_move_summary: frame.parentSummary,
            branching_factor: input.own.branchingFactor,
          });
          const redOut = (await callClaudeJson(
            client,
            RED_SYSTEM_PROMPT,
            redPayload,
            "helm_red",
            RED_SCHEMA as unknown as Record<string, unknown>,
            usage,
          )) as { moves: RedMoveOut[] };

          // WHITE call — adjudicate each Red move.
          const whitePayload = JSON.stringify({
            opponent_profile: {
              name: effComp.name,
              industry: effComp.industry,
              war_chest: effComp.warChest,
              posture: effComp.posture,
              leadership_bias: effComp.leadershipBias,
              recent_signals: effComp.recentSignals,
              topology_summary: summarizeTopology(effComp.topology),
            },
            defender_topology: input.own.topology,
            round,
            red_moves: redOut.moves,
          });
          const whiteOut = (await callClaudeJson(
            client,
            WHITE_SYSTEM_PROMPT,
            whitePayload,
            "helm_white",
            WHITE_SCHEMA as unknown as Record<string, unknown>,
            usage,
          )) as { adjudications: WhiteAdjOut[] };

          // Materialize Red nodes with the adjudication attached.
          const adjByMove = new Map<string, WhiteAdjOut>();
          for (const a of whiteOut.adjudications) adjByMove.set(a.move_temp_id, a);

          // Normalize sibling probabilities.
          const sumP = redOut.moves.reduce(
            (s, m) => s + Math.max(0, m.probability),
            0,
          ) || 1;

          const redIdByTempId = new Map<string, string>();
          for (const m of redOut.moves) {
            const id = nextId();
            redIdByTempId.set(m.temp_id, id);
            const parent = nodes[frame.parentId];
            const prob = Math.max(0.01, m.probability) / sumP;
            const delta = deltaFromGeneric(m);
            const deltas: TopologyDelta[] = [delta];
            const category: MoveCategory = deriveCategoryFromDeltas(deltas);
            const intentThreat = clamp(m.intent_threat, 0, 100);
            const whiteAdj = adjByMove.get(m.temp_id);
            const adjudication: Adjudication = whiteAdj
              ? normalizeAdjudication(whiteAdj, intentThreat)
              : adjudicate(
                  { deltas, intentThreat, category, cost: m.cost },
                  effComp,
                  input.own.topology,
                  { round },
                );
            const realizedThreat = adjudication.realizedThreat;
            const node: MoveNode = {
              id,
              parentId: frame.parentId,
              round,
              actor: "OPPONENT",
              category,
              title: m.title,
              rationale: m.rationale,
              probability: prob,
              cumulativeProbability: parent.cumulativeProbability * prob,
              threat: realizedThreat,
              intentThreat,
              adjudication,
              cost: clamp(m.cost, 0, 100),
              deltas,
              counters: [],
              children: [],
            };
            nodes[id] = node;
            parent.children.push(id);
            newFrontier.push({
              parentId: id,
              parentSummary: `${m.title} (realized threat ${realizedThreat})`,
            });
          }
        } else {
          // SELF round — BLUE call. The parent is a Red node; Blue sees the
          // adjudicated effect, not the raw red plan.
          const parent = nodes[frame.parentId];
          if (!parent || parent.actor !== "OPPONENT") {
            // Skip — should not happen with our growth pattern.
            continue;
          }
          const realizedRedSummary = {
            title: parent.title,
            category: parent.category,
            realized_threat: parent.threat,
            adjudication: parent.adjudication
              ? {
                  expectedRealization: parent.adjudication.expectedRealization,
                  outcomeDistribution: parent.adjudication.outcomeDistribution,
                  frictions: parent.adjudication.frictions.map((f) => ({
                    factor: f.factor,
                    magnitude: f.magnitude,
                    rationale: f.rationale,
                  })),
                }
              : null,
            delta: parent.deltas[0] ?? null,
          };
          const bluePayload = JSON.stringify({
            our_profile: {
              name: input.own.name,
              intent: input.own.intent,
              diagnosis: input.own.diagnosis,
              guiding_policy: input.own.guidingPolicy,
              opening_move: input.own.openingMove,
              topology: input.own.topology,
            },
            realized_opponent_move: realizedRedSummary,
            round,
            scenario: { id: scen.id, label: scen.label },
            branching_factor: input.own.branchingFactor,
          });
          const blueOut = (await callClaudeJson(
            client,
            BLUE_SYSTEM_PROMPT,
            bluePayload,
            "helm_blue",
            BLUE_SCHEMA as unknown as Record<string, unknown>,
            usage,
          )) as { responses: BlueResponseOut[] };

          const sumP = blueOut.responses.reduce(
            (s, m) => s + Math.max(0, m.probability),
            0,
          ) || 1;

          for (const m of blueOut.responses) {
            const id = nextId();
            const prob = Math.max(0.01, m.probability) / sumP;
            const delta = deltaFromGeneric(m);
            const deltas: TopologyDelta[] = [delta];
            const category: MoveCategory = deriveCategoryFromDeltas(deltas);
            // SELF threat = how much we reduce parent opponent-threat
            const selfThreat = Math.max(0, 100 - parent.threat);
            const node: MoveNode = {
              id,
              parentId: frame.parentId,
              round,
              actor: "SELF",
              category,
              title: m.title,
              rationale: m.rationale,
              probability: prob,
              cumulativeProbability: parent.cumulativeProbability * prob,
              threat: selfThreat,
              cost: clamp(m.cost, 0, 100),
              deltas,
              counters: [],
              children: [],
            };
            nodes[id] = node;
            parent.children.push(id);
            newFrontier.push({
              parentId: id,
              parentSummary: m.title,
            });
          }
        }
      }

      frontier = newFrontier;
      if (frontier.length === 0) break;
    }
  }

  const sim: Simulation = {
    id: `sim_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    competitor: input.competitor,
    own: input.own,
    scenarios: input.scenarios,
    nodes,
    rootIds,
    ...({
      usage: {
        cacheRead: usage.cacheRead,
        cacheCreate: usage.cacheCreate,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        mode: "ADJUDICATED",
      },
    } as Record<string, unknown>),
  } as Simulation;

  attachIndicatorsToSimulation(sim);
  return sim;
}

function applyScenarioModifiers(
  c: CompetitorProfile,
  s?: Scenario,
): CompetitorProfile {
  if (!s?.modifiers) return c;
  return { ...c, ...s.modifiers };
}

function summarizeTopology(
  topology: SimulateLLMInput["competitor"]["topology"],
): Record<string, unknown> {
  return {
    capability_sets: topology.capabilitySets.map((s) => ({
      name: s.name,
      dimension: s.dimension,
      lifecycle: s.lifecycle,
      era: s.era,
    })),
    bmc_blocks: topology.bmc.blocks.map((b) => ({
      kind: b.kind,
      label: b.label,
      strength: b.strength,
    })),
  };
}

// Normalize White's adjudication output into our Adjudication shape, with
// clamping/normalization for robustness. White is asked to compute
// realized_threat itself; if it's off we recompute.
function normalizeAdjudication(
  w: WhiteAdjOut,
  intentThreat: number,
): Adjudication {
  let { achieved, partial, blocked } = w.outcome;
  achieved = Math.max(0, achieved ?? 0);
  partial = Math.max(0, partial ?? 0);
  blocked = Math.max(0, blocked ?? 0);
  const sum = achieved + partial + blocked;
  if (sum > 0) {
    achieved /= sum;
    partial /= sum;
    blocked /= sum;
  } else {
    achieved = 0.6;
    partial = 0.3;
    blocked = 0.1;
  }
  const expectedRealization = 1 * achieved + 0.5 * partial + 0 * blocked;
  const realizedThreat = Math.round(intentThreat * expectedRealization);
  return {
    intentThreat,
    outcomeDistribution: { achieved, partial, blocked },
    frictions: (w.frictions ?? []).map((f) => ({
      factor: f.factor,
      magnitude: Math.max(0, Math.min(1, f.magnitude)),
      rationale: f.rationale,
    })),
    expectedRealization,
    realizedThreat,
  };
}

// Construct a TopologyDelta from a generic Red/Blue move shape. Mirrors
// `deltaFromLLM` above but accepts both shapes.
function deltaFromGeneric(m: {
  layer: "CAPABILITIES" | "BMC" | "VPC";
  op: "ADD" | "STRENGTHEN" | "WEAKEN" | "REMOVE" | "MIGRATE";
  capability_dimension: CapabilityDimension | null;
  bmc_block_kind: BMCBlockKind | null;
  vpc_side: "CUSTOMER_PROFILE" | "VALUE_MAP" | null;
  vpc_item_kind:
    | "jobs" | "pains" | "gains"
    | "productsServices" | "painRelievers" | "gainCreators"
    | null;
  target_label: string;
  magnitude: number;
}): TopologyDelta {
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
  return {
    layer: "BMC",
    op: "STRENGTHEN",
    target: { kind: "BMC_BLOCK", blockKind: "VALUE_PROPOSITIONS" },
    magnitude: clamp(m.magnitude, 0, 100),
    description: m.target_label || "Value-Prop reinforce",
  };
}
