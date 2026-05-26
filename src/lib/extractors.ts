// WFC — Anthropic-SDK-based wizard extractors (Phase 4).
//
// Each extractor takes a free-text "describe your business" paragraph from
// the user and returns a typed object that matches the wizard step's shape.
// Models: claude-opus-4-7, adaptive thinking, structured-output via
// json_schema. Short cached system prompt (cache_control: ephemeral) keeps
// re-extractions cheap when the user iterates on a single step.

import Anthropic from "@anthropic-ai/sdk";
import type {
  BMCBlock,
  BMCBlockKind,
  Capability,
  CapabilityDimension,
  CapabilitySet,
  CompetitorProfile,
  Posture,
  StrategicTopology,
  ValuePropositionCanvas,
  VPCItem,
} from "./types";

export type ExtractKind =
  | "BMC"
  | "VPC"
  | "CAPABILITIES"
  | "COMPETITOR_BASIC"
  | "AI_NATIVE_COMPETITOR"
  | "COMPETITOR_URL"
  | "COMPETITOR_TEXT";

export interface ExtractRequest {
  kind: ExtractKind;
  description: string;
  /**
   * Optional contextual hint. For VPC: { customerSegmentLabel: string } —
   * names which segment we're extracting jobs/pains/gains for.
   * For COMPETITOR_BASIC: { ourBusiness?: string } — short paragraph about
   * us, useful for shared-segment inference.
   */
  context?: Record<string, unknown>;
}

export function isExtractorConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ---------- Shared client + helpers ----------

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

interface CallOpts {
  systemPrompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  userPayload: string;
}

async function callClaude(opts: CallOpts): Promise<unknown> {
  if (!isExtractorConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        name: opts.schemaName,
        schema: opts.schema,
      },
    },
    system: [
      {
        type: "text",
        text: opts.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: opts.userPayload }],
  });

  const finalMessage = await stream.finalMessage();
  const textBlock = finalMessage.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return JSON.parse(textBlock.text);
}

// ---------- BMC extractor ----------

const BMC_SYSTEM = `You extract a Business Model Canvas (BMC) from a free-text paragraph.

Return JSON for the 9 Osterwalder blocks: CUSTOMER_SEGMENTS, VALUE_PROPOSITIONS, CHANNELS,
CUSTOMER_RELATIONSHIPS, REVENUE_STREAMS, KEY_RESOURCES, KEY_ACTIVITIES, KEY_PARTNERS, COST_STRUCTURE.

Rules:
- Each block has an array of items. Most companies have 1–3 items per block; you may add up to 4.
- Each item has: label (≤80 chars, the user's actual vocabulary, not generic strategy-speak),
  optional description (one short sentence), and a strength (0..100) reflecting how strong /
  defensible / fully-formed that aspect is, based on signals in the paragraph.
- If the paragraph doesn't mention something explicitly, infer a reasonable default but pick a
  conservative strength (40–60). Don't hallucinate specific facts (names, numbers, partners).
- Match the language of the input (German in → German out).`;

const BMC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: {
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
          label: { type: "string" },
          description: { type: "string" },
          strength: { type: "integer" },
        },
        required: ["kind", "label", "description", "strength"],
      },
    },
  },
  required: ["blocks"],
} as const;

interface BMCRaw {
  blocks: {
    kind: BMCBlockKind;
    label: string;
    description: string;
    strength: number;
  }[];
}

export async function extractBMC(description: string): Promise<BMCBlock[]> {
  const raw = (await callClaude({
    systemPrompt: BMC_SYSTEM,
    schema: BMC_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "wfc_bmc_extract",
    userPayload: JSON.stringify({ description }),
  })) as BMCRaw;

  return raw.blocks.map((b) => ({
    id: uid("bmc"),
    kind: b.kind,
    label: b.label,
    description: b.description || undefined,
    strength: clamp(b.strength, 0, 100),
  }));
}

// ---------- VPC extractor ----------

const VPC_SYSTEM = `You extract a Value Proposition Canvas (VPC) for ONE customer segment from a free-text paragraph.

Customer profile = the SEGMENT's reality:
  jobs (what they're trying to get done), pains (their frustrations), gains (the outcomes they hope for).
Value map = what WE offer them:
  productsServices (what we sell), painRelievers (how we ease their pain), gainCreators (how we deliver upside).

Rules:
- 2–4 items per list. Each item has a label (≤60 chars) and a weight (0..100) indicating
  how important / central that item is.
- Match the language of the input.
- Don't invent customers or features that aren't implied.`;

const VPC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    jobs: vpcList(),
    pains: vpcList(),
    gains: vpcList(),
    productsServices: vpcList(),
    painRelievers: vpcList(),
    gainCreators: vpcList(),
  },
  required: [
    "jobs",
    "pains",
    "gains",
    "productsServices",
    "painRelievers",
    "gainCreators",
  ],
} as const;

function vpcList() {
  return {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        weight: { type: "integer" },
      },
      required: ["label", "weight"],
    },
  } as const;
}

interface VPCRaw {
  jobs: { label: string; weight: number }[];
  pains: { label: string; weight: number }[];
  gains: { label: string; weight: number }[];
  productsServices: { label: string; weight: number }[];
  painRelievers: { label: string; weight: number }[];
  gainCreators: { label: string; weight: number }[];
}

export async function extractVPC(
  description: string,
  customerSegmentBlockId: string,
  customerSegmentLabel: string,
): Promise<ValuePropositionCanvas> {
  const raw = (await callClaude({
    systemPrompt: VPC_SYSTEM,
    schema: VPC_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "wfc_vpc_extract",
    userPayload: JSON.stringify({
      customerSegment: customerSegmentLabel,
      description,
    }),
  })) as VPCRaw;

  const toItems = (
    list: { label: string; weight: number }[],
  ): VPCItem[] =>
    list.map((it) => ({
      id: uid("vi"),
      label: it.label,
      weight: clamp(it.weight, 0, 100),
    }));

  return {
    id: uid("vpc"),
    customerSegmentBlockId,
    customerProfile: {
      jobs: toItems(raw.jobs),
      pains: toItems(raw.pains),
      gains: toItems(raw.gains),
    },
    valueMap: {
      productsServices: toItems(raw.productsServices),
      painRelievers: toItems(raw.painRelievers),
      gainCreators: toItems(raw.gainCreators),
    },
  };
}

// ---------- CAPABILITIES extractor ----------

const CAP_SYSTEM = `You extract capability sets and capabilities from a free-text "describe your team and tech" paragraph.

CapabilitySets are emergent buckets — name them after how the user describes their advantage
(e.g. "Vertical Sales Force DACH", "Audit-Grade Release Engineering"). Each set has a dimension
(PEOPLE | TECH | ORG | PROCESSES), an era (year it became strategically relevant), and a
lifecycle (EMERGING | GROWING | MATURE | DECLINING | OBSOLETE).

Capabilities live INSIDE sets via setId. Each capability has a level (0..100, current strength)
and an importance (0..100, how strategic it is).

Rules:
- 3–6 sets total across the four dimensions; 1–4 capabilities per set.
- Use the user's vocabulary, not generic strategy phrases.
- Default era to 2020 if not mentioned. Default lifecycle to MATURE unless described as
  new/emerging or sunsetting.
- Match the language of the input.`;

const CAP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    capabilitySets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          temp_id: { type: "string" },
          name: { type: "string" },
          dimension: {
            type: "string",
            enum: ["PEOPLE", "TECH", "ORG", "PROCESSES"],
          },
          era: { type: "integer" },
          lifecycle: {
            type: "string",
            enum: ["EMERGING", "GROWING", "MATURE", "DECLINING", "OBSOLETE"],
          },
          description: { type: "string" },
        },
        required: [
          "temp_id",
          "name",
          "dimension",
          "era",
          "lifecycle",
          "description",
        ],
      },
    },
    capabilities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          set_temp_id: { type: "string" },
          label: { type: "string" },
          level: { type: "integer" },
          importance: { type: "integer" },
        },
        required: ["set_temp_id", "label", "level", "importance"],
      },
    },
  },
  required: ["capabilitySets", "capabilities"],
} as const;

interface CapsRaw {
  capabilitySets: {
    temp_id: string;
    name: string;
    dimension: CapabilityDimension;
    era: number;
    lifecycle: CapabilitySet["lifecycle"];
    description: string;
  }[];
  capabilities: {
    set_temp_id: string;
    label: string;
    level: number;
    importance: number;
  }[];
}

export async function extractCapabilities(
  description: string,
): Promise<{ capabilitySets: CapabilitySet[]; capabilities: Capability[] }> {
  const raw = (await callClaude({
    systemPrompt: CAP_SYSTEM,
    schema: CAP_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "wfc_capabilities_extract",
    userPayload: JSON.stringify({ description }),
  })) as CapsRaw;

  const idMap: Record<string, string> = {};
  const sets: CapabilitySet[] = raw.capabilitySets.map((s) => {
    const id = uid("cs");
    idMap[s.temp_id] = id;
    return {
      id,
      name: s.name,
      dimension: s.dimension,
      era: s.era,
      lifecycle: s.lifecycle,
      source: "STANDARD",
      description: s.description || undefined,
    };
  });
  const caps: Capability[] = raw.capabilities
    .filter((c) => idMap[c.set_temp_id])
    .map((c) => ({
      id: uid("cap"),
      setId: idMap[c.set_temp_id],
      label: c.label,
      level: clamp(c.level, 0, 100),
      importance: clamp(c.importance, 0, 100),
    }));

  return { capabilitySets: sets, capabilities: caps };
}

// ---------- COMPETITOR_BASIC extractor ----------

const COMP_SYSTEM = `You extract a competitor profile from a free-text paragraph.

Return:
- name (short, ALL CAPS company name)
- industry (1-line market segment)
- posture (AGGRESSIVE | EXPANSIVE | DEFENSIVE | OPPORTUNISTIC | CONSERVATIVE)
- warChest, innovationIndex, brandPower (each 0..100)
- a sketched topology with: a small BMC (2–4 blocks across the most relevant kinds),
  1–2 VPCs (each tied to one of the BMC customer segments), and 3–4 capability sets
  with 1–2 capabilities each.

Be conservative when the paragraph is sparse. Match the input language.`;

const COMP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    industry: { type: "string" },
    posture: {
      type: "string",
      enum: [
        "AGGRESSIVE",
        "EXPANSIVE",
        "DEFENSIVE",
        "OPPORTUNISTIC",
        "CONSERVATIVE",
      ],
    },
    warChest: { type: "integer" },
    innovationIndex: { type: "integer" },
    brandPower: { type: "integer" },
    marketShare: { type: "number" },
    recentSignals: { type: "array", items: { type: "string" } },
    bmc: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          temp_id: { type: "string" },
          kind: {
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
          label: { type: "string" },
          strength: { type: "integer" },
        },
        required: ["temp_id", "kind", "label", "strength"],
      },
    },
    vpcs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          customer_segment_temp_id: { type: "string" },
          jobs: { type: "array", items: { type: "string" } },
          pains: { type: "array", items: { type: "string" } },
          gains: { type: "array", items: { type: "string" } },
          productsServices: { type: "array", items: { type: "string" } },
          painRelievers: { type: "array", items: { type: "string" } },
          gainCreators: { type: "array", items: { type: "string" } },
        },
        required: [
          "customer_segment_temp_id",
          "jobs",
          "pains",
          "gains",
          "productsServices",
          "painRelievers",
          "gainCreators",
        ],
      },
    },
    capabilitySets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          temp_id: { type: "string" },
          name: { type: "string" },
          dimension: {
            type: "string",
            enum: ["PEOPLE", "TECH", "ORG", "PROCESSES"],
          },
          era: { type: "integer" },
          lifecycle: {
            type: "string",
            enum: ["EMERGING", "GROWING", "MATURE", "DECLINING", "OBSOLETE"],
          },
          capabilities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                level: { type: "integer" },
                importance: { type: "integer" },
              },
              required: ["label", "level", "importance"],
            },
          },
        },
        required: [
          "temp_id",
          "name",
          "dimension",
          "era",
          "lifecycle",
          "capabilities",
        ],
      },
    },
  },
  required: [
    "name",
    "industry",
    "posture",
    "warChest",
    "innovationIndex",
    "brandPower",
    "marketShare",
    "recentSignals",
    "bmc",
    "vpcs",
    "capabilitySets",
  ],
} as const;

interface CompRaw {
  name: string;
  industry: string;
  posture: Posture;
  warChest: number;
  innovationIndex: number;
  brandPower: number;
  marketShare: number;
  recentSignals: string[];
  bmc: {
    temp_id: string;
    kind: BMCBlockKind;
    label: string;
    strength: number;
  }[];
  vpcs: {
    customer_segment_temp_id: string;
    jobs: string[];
    pains: string[];
    gains: string[];
    productsServices: string[];
    painRelievers: string[];
    gainCreators: string[];
  }[];
  capabilitySets: {
    temp_id: string;
    name: string;
    dimension: CapabilityDimension;
    era: number;
    lifecycle: CapabilitySet["lifecycle"];
    capabilities: {
      label: string;
      level: number;
      importance: number;
    }[];
  }[];
}

export async function extractCompetitorBasic(
  description: string,
  context?: { ourBusiness?: string },
): Promise<CompetitorProfile> {
  const raw = (await callClaude({
    systemPrompt: COMP_SYSTEM,
    schema: COMP_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "wfc_competitor_basic_extract",
    userPayload: JSON.stringify({ description, ourBusiness: context?.ourBusiness }),
  })) as CompRaw;

  // Wire up topology — temp ids → real ids.
  const bmcIdMap: Record<string, string> = {};
  const bmcBlocks: BMCBlock[] = raw.bmc.map((b) => {
    const id = uid("bmc");
    bmcIdMap[b.temp_id] = id;
    return {
      id,
      kind: b.kind,
      label: b.label,
      strength: clamp(b.strength, 0, 100),
    };
  });

  const vpcs: ValuePropositionCanvas[] = raw.vpcs
    .map((v) => {
      const segId = bmcIdMap[v.customer_segment_temp_id];
      if (!segId) return null;
      const toItems = (labels: string[]): VPCItem[] =>
        labels.map((l) => ({ id: uid("vi"), label: l, weight: 60 }));
      return {
        id: uid("vpc"),
        customerSegmentBlockId: segId,
        customerProfile: {
          jobs: toItems(v.jobs),
          pains: toItems(v.pains),
          gains: toItems(v.gains),
        },
        valueMap: {
          productsServices: toItems(v.productsServices),
          painRelievers: toItems(v.painRelievers),
          gainCreators: toItems(v.gainCreators),
        },
      } satisfies ValuePropositionCanvas;
    })
    .filter((v): v is ValuePropositionCanvas => v !== null);

  const sets: CapabilitySet[] = [];
  const caps: Capability[] = [];
  for (const s of raw.capabilitySets) {
    const setId = uid("cs");
    sets.push({
      id: setId,
      name: s.name,
      dimension: s.dimension,
      era: s.era,
      lifecycle: s.lifecycle,
      source: "STANDARD",
    });
    for (const c of s.capabilities) {
      caps.push({
        id: uid("cap"),
        setId,
        label: c.label,
        level: clamp(c.level, 0, 100),
        importance: clamp(c.importance, 0, 100),
      });
    }
  }

  const topology: StrategicTopology = {
    capabilitySets: sets,
    capabilities: caps,
    bmc: { blocks: bmcBlocks },
    vpcs,
  };

  return {
    name: raw.name.toUpperCase(),
    industry: raw.industry,
    marketShare: Math.max(0, Math.min(0.8, raw.marketShare ?? 0.2)),
    warChest: clamp(raw.warChest, 0, 100),
    innovationIndex: clamp(raw.innovationIndex, 0, 100),
    brandPower: clamp(raw.brandPower, 0, 100),
    posture: raw.posture,
    leadershipBias: 0,
    recentSignals: raw.recentSignals.slice(0, 6),
    topology,
  };
}

// ---------- AI_NATIVE_COMPETITOR extractor (Phase 4.5) ----------
//
// Sharpens a pattern-derived template using the user's three fear-paragraphs
// (workflow / pricing / flywheel) and the chosen pattern name. Produces a
// CompetitorProfile with: industry tied to the inferred sector, a refined
// posture, a realistic suggested name, and a small topology with the
// MUST-HAVE "AI-Native Operations" set plus 2-3 pattern-specific sets.

const AI_NATIVE_COMP_SYSTEM = `You sharpen the profile of an AI-native challenger that the user is afraid of.

You receive:
  - three short paragraphs (workflow / pricing / data flywheel fears)
  - the disruption pattern they picked (e.g. "Cost-Floor Reset", "Workflow Collapse")

Return a sharpened CompetitorProfile that goes beyond the generic template:
  - a plausible suggested name (short, no real-company names)
  - inferred industry (one line)
  - posture (AGGRESSIVE | EXPANSIVE | DEFENSIVE | OPPORTUNISTIC | CONSERVATIVE)
  - warChest / innovationIndex / brandPower (0..100)
  - 2-3 capability sets with realistic labels (each with 1-3 capabilities). The
    set "AI-Native Operations" MUST be present, EMERGING, era 2024.
  - 2-4 BMC blocks across the most relevant kinds for the chosen pattern
  - 1 VPC tied to one of the BMC customer segments

Be specific and grounded. Match the language of the user's input.`;

const AI_NATIVE_COMP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    industry: { type: "string" },
    posture: {
      type: "string",
      enum: [
        "AGGRESSIVE",
        "EXPANSIVE",
        "DEFENSIVE",
        "OPPORTUNISTIC",
        "CONSERVATIVE",
      ],
    },
    warChest: { type: "integer" },
    innovationIndex: { type: "integer" },
    brandPower: { type: "integer" },
    marketShare: { type: "number" },
    recentSignals: { type: "array", items: { type: "string" } },
    bmc: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          temp_id: { type: "string" },
          kind: {
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
          label: { type: "string" },
          strength: { type: "integer" },
        },
        required: ["temp_id", "kind", "label", "strength"],
      },
    },
    vpcs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          customer_segment_temp_id: { type: "string" },
          jobs: { type: "array", items: { type: "string" } },
          pains: { type: "array", items: { type: "string" } },
          gains: { type: "array", items: { type: "string" } },
          productsServices: { type: "array", items: { type: "string" } },
          painRelievers: { type: "array", items: { type: "string" } },
          gainCreators: { type: "array", items: { type: "string" } },
        },
        required: [
          "customer_segment_temp_id",
          "jobs",
          "pains",
          "gains",
          "productsServices",
          "painRelievers",
          "gainCreators",
        ],
      },
    },
    capabilitySets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          temp_id: { type: "string" },
          name: { type: "string" },
          dimension: {
            type: "string",
            enum: ["PEOPLE", "TECH", "ORG", "PROCESSES"],
          },
          era: { type: "integer" },
          lifecycle: {
            type: "string",
            enum: ["EMERGING", "GROWING", "MATURE", "DECLINING", "OBSOLETE"],
          },
          capabilities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                level: { type: "integer" },
                importance: { type: "integer" },
              },
              required: ["label", "level", "importance"],
            },
          },
        },
        required: [
          "temp_id",
          "name",
          "dimension",
          "era",
          "lifecycle",
          "capabilities",
        ],
      },
    },
  },
  required: [
    "name",
    "industry",
    "posture",
    "warChest",
    "innovationIndex",
    "brandPower",
    "marketShare",
    "recentSignals",
    "bmc",
    "vpcs",
    "capabilitySets",
  ],
} as const;

export interface AINativeFearContext {
  patternName: string;
  fearWorkflow?: string;
  fearPricing?: string;
  fearFlywheel?: string;
}

export async function extractAINativeCompetitor(
  ctx: AINativeFearContext,
): Promise<CompetitorProfile> {
  const userPayload = JSON.stringify({
    pattern: ctx.patternName,
    fearWorkflow: ctx.fearWorkflow ?? "",
    fearPricing: ctx.fearPricing ?? "",
    fearFlywheel: ctx.fearFlywheel ?? "",
  });

  const raw = (await callClaude({
    systemPrompt: AI_NATIVE_COMP_SYSTEM,
    schema: AI_NATIVE_COMP_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "wfc_ai_native_competitor_extract",
    userPayload,
  })) as CompRaw;

  // Re-use the same wiring as extractCompetitorBasic — temp ids → real ids.
  const bmcIdMap: Record<string, string> = {};
  const bmcBlocks: BMCBlock[] = raw.bmc.map((b) => {
    const id = uid("bmc");
    bmcIdMap[b.temp_id] = id;
    return {
      id,
      kind: b.kind,
      label: b.label,
      strength: clamp(b.strength, 0, 100),
    };
  });

  const vpcs: ValuePropositionCanvas[] = raw.vpcs
    .map((v) => {
      const segId = bmcIdMap[v.customer_segment_temp_id];
      if (!segId) return null;
      const toItems = (labels: string[]): VPCItem[] =>
        labels.map((l) => ({ id: uid("vi"), label: l, weight: 65 }));
      return {
        id: uid("vpc"),
        customerSegmentBlockId: segId,
        customerProfile: {
          jobs: toItems(v.jobs),
          pains: toItems(v.pains),
          gains: toItems(v.gains),
        },
        valueMap: {
          productsServices: toItems(v.productsServices),
          painRelievers: toItems(v.painRelievers),
          gainCreators: toItems(v.gainCreators),
        },
      } satisfies ValuePropositionCanvas;
    })
    .filter((v): v is ValuePropositionCanvas => v !== null);

  const sets: CapabilitySet[] = [];
  const caps: Capability[] = [];
  for (const s of raw.capabilitySets) {
    const setId = uid("cs");
    sets.push({
      id: setId,
      name: s.name,
      dimension: s.dimension,
      era: s.era,
      lifecycle: s.lifecycle,
      source: "STANDARD",
    });
    for (const c of s.capabilities) {
      caps.push({
        id: uid("cap"),
        setId,
        label: c.label,
        level: clamp(c.level, 0, 100),
        importance: clamp(c.importance, 0, 100),
      });
    }
  }

  const topology: StrategicTopology = {
    capabilitySets: sets,
    capabilities: caps,
    bmc: { blocks: bmcBlocks },
    vpcs,
  };

  return {
    name: raw.name.toUpperCase(),
    industry: raw.industry,
    marketShare: Math.max(0, Math.min(0.5, raw.marketShare ?? 0.05)),
    warChest: clamp(raw.warChest, 0, 100),
    innovationIndex: clamp(raw.innovationIndex, 0, 100),
    brandPower: clamp(raw.brandPower, 0, 100),
    posture: raw.posture,
    leadershipBias: -50,
    recentSignals: raw.recentSignals.slice(0, 6),
    topology,
  };
}

// ---------- COMPETITOR_URL / COMPETITOR_TEXT extractors (Phase 5Y.2) ----------
//
// Topology-aware extraction from a competitor URL or any raw text (press
// release, earnings transcript, Wikipedia entry, etc.). Both flows share
// the same Claude call and schema; URL extractor adds a fetch step.
// Claude is instructed to be inferred-only and to flag uncertainty in the
// `recentSignals` field rather than fabricate specific facts.

const COMP_FROM_SOURCE_SYSTEM = `You are extracting a competitor profile from a raw source text supplied below.

Output a CompetitorProfile (name, industry, posture, war-chest signal, innovation index, brand power,
recent signals, and three-layer topology: capability sets, BMC blocks, 1–2 VPCs) tied to that competitor.

Be concrete but inferred-only: never fabricate specific factual claims (revenue figures, named
executives, real customer logos) you cannot read in the source text. When in doubt, mark
uncertainty in the recentSignals as "[uncertain] ..." or note it explicitly in a capability set's
description. Capability set lifecycles must reflect what the text actually says: if the text
mentions AI heavily, include an "AI-Native Operations" set with lifecycle EMERGING (era 2024).
If the text describes a legacy on-premise stack, mark its capability sets DECLINING or MATURE.

Use the user's language (English in → English out, German in → German out).
Be conservative on warChest / innovationIndex / brandPower (0–100) when the source is thin.`;

// Re-use the COMP_SCHEMA (same shape as extractCompetitorBasic — same return type).

export interface CompetitorSourceContext {
  /** Optional hint from the user, e.g. "This is their investor-relations page" */
  hint?: string;
  /** Optional source URL — included in the user payload so the model knows the provenance */
  sourceUrl?: string;
}

async function extractCompetitorFromSource(
  rawText: string,
  ctx: CompetitorSourceContext,
): Promise<CompetitorProfile> {
  const trimmed = rawText.slice(0, 15_000);
  const userPayload = JSON.stringify({
    hint: ctx.hint ?? "",
    sourceUrl: ctx.sourceUrl ?? "",
    sourceText: trimmed,
  });

  const raw = (await callClaude({
    systemPrompt: COMP_FROM_SOURCE_SYSTEM,
    schema: COMP_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "wfc_competitor_from_source_extract",
    userPayload,
  })) as CompRaw;

  // Same wiring as extractCompetitorBasic: temp ids → real ids.
  const bmcIdMap: Record<string, string> = {};
  const bmcBlocks: BMCBlock[] = raw.bmc.map((b) => {
    const id = uid("bmc");
    bmcIdMap[b.temp_id] = id;
    return {
      id,
      kind: b.kind,
      label: b.label,
      strength: clamp(b.strength, 0, 100),
    };
  });

  const vpcs: ValuePropositionCanvas[] = raw.vpcs
    .map((v) => {
      const segId = bmcIdMap[v.customer_segment_temp_id];
      if (!segId) return null;
      const toItems = (labels: string[]): VPCItem[] =>
        labels.map((l) => ({ id: uid("vi"), label: l, weight: 60 }));
      return {
        id: uid("vpc"),
        customerSegmentBlockId: segId,
        customerProfile: {
          jobs: toItems(v.jobs),
          pains: toItems(v.pains),
          gains: toItems(v.gains),
        },
        valueMap: {
          productsServices: toItems(v.productsServices),
          painRelievers: toItems(v.painRelievers),
          gainCreators: toItems(v.gainCreators),
        },
      } satisfies ValuePropositionCanvas;
    })
    .filter((v): v is ValuePropositionCanvas => v !== null);

  const sets: CapabilitySet[] = [];
  const caps: Capability[] = [];
  for (const s of raw.capabilitySets) {
    const setId = uid("cs");
    sets.push({
      id: setId,
      name: s.name,
      dimension: s.dimension,
      era: s.era,
      lifecycle: s.lifecycle,
      source: "SIGNAL_DERIVED",
    });
    for (const c of s.capabilities) {
      caps.push({
        id: uid("cap"),
        setId,
        label: c.label,
        level: clamp(c.level, 0, 100),
        importance: clamp(c.importance, 0, 100),
      });
    }
  }

  const topology: StrategicTopology = {
    capabilitySets: sets,
    capabilities: caps,
    bmc: { blocks: bmcBlocks },
    vpcs,
  };

  // Recent signals: prefix with the source URL if present so the operator
  // can later audit where each claim came from.
  const recentSignals = (raw.recentSignals ?? []).slice(0, 6);
  if (ctx.sourceUrl && !recentSignals.some((s) => s.includes(ctx.sourceUrl!))) {
    recentSignals.unshift(`[source] ${ctx.sourceUrl}`);
  }

  return {
    name: raw.name.toUpperCase(),
    industry: raw.industry,
    marketShare: Math.max(0, Math.min(0.8, raw.marketShare ?? 0.15)),
    warChest: clamp(raw.warChest, 0, 100),
    innovationIndex: clamp(raw.innovationIndex, 0, 100),
    brandPower: clamp(raw.brandPower, 0, 100),
    posture: raw.posture,
    leadershipBias: 0,
    recentSignals: recentSignals.slice(0, 6),
    topology,
  };
}

export async function extractCompetitorFromURL(
  url: string,
  hint?: string,
): Promise<CompetitorProfile> {
  // Lazy import — keeps the client bundle free of the fetcher.
  const { fetchUrlAsText } = await import("./urlFetcher");
  const { text, sourceUrl } = await fetchUrlAsText(url);
  if (!text || text.length < 80) {
    throw new Error("Fetched page has too little usable text");
  }
  return extractCompetitorFromSource(text, { hint, sourceUrl });
}

export async function extractCompetitorFromText(
  text: string,
  hint?: string,
): Promise<CompetitorProfile> {
  if (!text || text.trim().length < 40) {
    throw new Error("Source text is too short");
  }
  return extractCompetitorFromSource(text, { hint });
}

// ---------- shared ----------

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
