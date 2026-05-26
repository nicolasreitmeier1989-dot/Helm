// HELM — Claude-backed strategic reasoner.
// Server-side only. Returns the same Simulation shape as the local heuristic,
// so the UI is identical regardless of backend.

import Anthropic from "@anthropic-ai/sdk";
import { attachIndicatorsToSimulation } from "./engine";
import type {
  CompetitorProfile,
  MoveCategory,
  MoveNode,
  OwnProfile,
  Scenario,
  Simulation,
} from "./types";

// ---------- Static prompt material (cached) ----------

const CATEGORIES: MoveCategory[] = [
  "PRICING",
  "PRODUCT",
  "M&A",
  "TALENT",
  "GEO",
  "CHANNEL",
  "BRAND",
  "REGULATORY",
  "CAPITAL",
  "PARTNERSHIP",
];

// Long, frozen system prompt. Comes BEFORE any volatile content (per
// shared/prompt-caching.md). Min cacheable prefix on Opus 4.7 is 4096 tokens
// — this prompt + move library is sized to clear that bar.
const SYSTEM_PROMPT = `You are HELM, an adversarial strategy reasoner for corporate competitive intelligence.
Your job is to simulate how a specific competitor will respond to our opening move across multiple rounds
and multiple scenarios, and to recommend our counter-moves. You think like a game-theory analyst combined
with a top-tier strategy partner: you anticipate the opponent 3–5 moves ahead, weight branches by realistic
conditional probability, and identify the highest expected-loss trajectories so that we can pre-empt them.

# MENTAL MODEL

Round T0 is our opening move. Rounds T1, T3, T5… are OPPONENT moves (their best response to the state of
play). Rounds T2, T4, T6… are our SELF moves (our best response to their response). Within each round,
the actor considers several plausible moves — these are the children of the parent node. Conditional
probabilities of siblings must sum to ~1.0.

For OPPONENT moves you reason FROM THE OPPONENT'S PERSPECTIVE. You weight their move set by:
- Posture (AGGRESSIVE / EXPANSIVE / DEFENSIVE / OPPORTUNISTIC / CONSERVATIVE) — defines their default risk tolerance.
- Leadership bias (-100 visionary/founder, +100 PE/optimizer) — visionary tilts toward PRODUCT, BRAND, GEO, M&A;
  optimizer tilts toward CAPITAL discipline, REGULATORY moats, CHANNEL economics, PRICING optimization.
- War chest — gates capital-intensive moves (M&A, CAPITAL, GEO expansion).
- Innovation index — gates PRODUCT and PARTNERSHIP options.
- Brand power — gates BRAND-led plays and category repositioning.
- Recent signals — these are heavy priors. If the opponent just hired 12 senior people in a vertical, TALENT
  and GEO moves in that vertical become much more likely.

For SELF moves you act as our strategist: address the opponent's threat surgically, prefer asymmetric counters
(low cost for us / high cost for them), and protect cash-generating cores.

# MOVE CATEGORIES

PRICING: list/discount architecture, bundling, lock-in contracts, freemium, premium tier launches.
PRODUCT: feature launches, platform plays, vertical solutions, deprecations, AI-native re-architectures.
M&A: full acquisitions, tuck-ins, joint ventures, carve-outs, divestitures, strategic spin-offs.
TALENT: targeted senior hires, acqui-hires, talent hub buildout, restructurings.
GEO: market entry, regional headquarters, exits from sub-scale geographies.
CHANNEL: D2C pivots, reseller programs, marketplace deals, field-force scaling.
BRAND: repositioning, category creation, thought leadership, comparative campaigns, deliberate silence.
REGULATORY: standardization lobbying, antitrust filings, compliance certifications, data residency moves.
CAPITAL: mega-rounds, IPO preparation, debt facilities, buybacks, cost programs.
PARTNERSHIP: hyperscaler co-sell, supplier exclusives, ecosystem alliances, open-source foundations.

# REASONING DISCIPLINE

- Branch probabilities are conditional on the parent path. Siblings must sum to ~1.0 (we will normalize
  slightly if needed).
- Threat is OUR risk if the move executes (0..100). Cost is what the move costs the actor (0..100).
- Counter-moves attached to OPPONENT nodes are CONCRETE actions WE can take to neutralize that specific
  threat — not generic platitudes. They should reference the lever (price-match, retention package,
  defensive M&A, regulatory filing, channel exclusive, etc.).
- Rationale on each node is one short sentence linking the move to the opponent's profile and to the
  parent move. Avoid filler.
- Be realistic: aggressive opponents do not suddenly play conservatively without a reason in the signals.
- 4–5 categories should appear across each scenario's tree — diversity prevents single-axis tunnel vision.

# OUTPUT

Return JSON exactly conforming to the schema. Do NOT include the opening move as a child — it is the
implicit root provided by the user. The first round of children (round 1) are OPPONENT responses to our
opening. Then round 2 are OUR responses to each opponent move. And so on, alternating, up to the user's
horizon. Use a stable temp_id per scenario (e.g. "s1m3" — scenario 1 move 3).

The user message will provide the competitor profile, our position, the scenarios (each carries a weight
and possibly an override on the competitor's posture / war chest / innovation that you must adopt for that
scenario only), and the horizon + branching factor. Respect both.`;

// ---------- Output schema (must satisfy structured-outputs constraints) ----------
// - additionalProperties: false on every object
// - No recursion (we use parent_temp_id references inside a flat list)
// - All declared properties listed in `required`

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
          root_rationale: {
            type: "string",
            description: "Why this opening provokes the responses in this scenario.",
          },
          moves: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                temp_id: { type: "string" },
                parent_temp_id: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                  description: "null means this node is a child of the opening move.",
                },
                round: { type: "integer" },
                actor: { type: "string", enum: ["OPPONENT", "SELF"] },
                category: { type: "string", enum: CATEGORIES as unknown as string[] },
                title: { type: "string" },
                rationale: { type: "string" },
                probability: {
                  type: "number",
                  description: "Conditional probability given parent, 0..1.",
                },
                threat: { type: "integer", description: "0..100, our risk if executed." },
                cost: { type: "integer", description: "0..100, cost to the actor." },
                counters: {
                  type: "array",
                  description:
                    "3–4 concrete counter-moves (only populated for OPPONENT nodes; empty for SELF).",
                  items: { type: "string" },
                },
              },
              required: [
                "temp_id",
                "parent_temp_id",
                "round",
                "actor",
                "category",
                "title",
                "rationale",
                "probability",
                "threat",
                "cost",
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

  // Long output (multi-scenario, multi-round structured JSON) → stream so we
  // don't hit SDK HTTP timeouts. Adaptive thinking lets Opus 4.7 decide depth.
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

// ---------- Helpers ----------

function buildUserPayload(input: SimulateLLMInput): string {
  // Compact, deterministic JSON in the user turn — no timestamps, no Date.now().
  // (Anything volatile here is OK; it sits AFTER the cached system prefix.)
  return JSON.stringify(
    {
      competitor: input.competitor,
      own: {
        name: input.own.name,
        intent: input.own.intent,
        opening_move: input.own.openingMove,
        horizon_rounds: input.own.horizonRounds,
        branching_factor: input.own.branchingFactor,
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
        "Return scenarios[] in the same order. For each scenario, produce a tree that respects the requested horizon and branching factor. Apply the scenario's modifiers (if any) as an override on the competitor profile for THIS scenario only.",
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
  category: MoveCategory;
  title: string;
  rationale: string;
  probability: number;
  threat: number;
  cost: number;
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

function assembleSimulation(
  resp: LLMResponse,
  input: SimulateLLMInput,
  usage: Usage,
): Simulation {
  const nodes: Record<string, MoveNode> = {};
  const rootIds: string[] = [];

  let nodeCounter = 0;
  const nextId = () => `n${(++nodeCounter).toString(36)}`;

  // Sort scenarios by declared index just in case the model returned them out of order.
  const sorted = [...resp.scenarios].sort(
    (a, b) => a.scenario_index - b.scenario_index,
  );

  sorted.forEach((scen, idx) => {
    const scenario = input.scenarios[scen.scenario_index] ?? input.scenarios[idx];

    // Root: our opening move.
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
      counters: [],
      children: [],
    };
    rootIds.push(rootId);

    // Map temp_id → global id
    const idMap: Record<string, string> = {};
    for (const m of scen.moves) {
      idMap[m.temp_id] = nextId();
    }

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

    // Build nodes in round order so parents exist before children.
    const movesByRound = [...scen.moves].sort((a, b) => a.round - b.round);
    for (const m of movesByRound) {
      const id = idMap[m.temp_id];
      const parentId = m.parent_temp_id ? idMap[m.parent_temp_id] : rootId;
      const parent = nodes[parentId];
      if (!parent) continue;
      const node: MoveNode = {
        id,
        parentId,
        round: m.round,
        actor: m.actor,
        category: m.category,
        title: m.title,
        rationale: m.rationale,
        probability: m.probability,
        cumulativeProbability: parent.cumulativeProbability * m.probability,
        threat: clamp(m.threat, 0, 100),
        cost: clamp(m.cost, 0, 100),
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
    // Stash usage for the UI debug strip.
    // (Not part of the canonical type; cast via index access.)
    ...({ usage } as Record<string, unknown>),
  } as Simulation;

  // Attach deterministic indicators to OPPONENT nodes so triggers / watchlist
  // work uniformly across backends.
  attachIndicatorsToSimulation(sim);
  return sim;
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
