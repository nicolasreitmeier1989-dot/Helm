// WFC — AI-native attack patterns (Phase 4.5).
//
// Seven disruption playbooks the user can pick from in the WFC ("Worst
// Feared AI-Native Competitor") wizard. Each pattern carries:
//   - which of OUR BMC blocks it hits hardest
//   - which capability dimensions matter most when defending against it
//   - a competitorTemplate() that produces a realistic AI-native profile
//     (posture, warChest, innovationIndex, brandPower, and a sketched
//     three-layer topology) the engine can simulate against.
//
// Templates are deliberately abstract (the user customizes industry/context
// later); they MUST always include one MUST-HAVE CapabilitySet named
// "AI-Native Operations" (EMERGING, era 2024, STANDARD) so the existing
// emerging-collision math has a target to latch onto.

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

export type AIPatternId =
  | "COGNITIVE_ARBITRAGE"
  | "WORKFLOW_COLLAPSE"
  | "SELF_SERVICE_ABSORPTION"
  | "PERSONALIZATION_UNIT_OF_ONE"
  | "VERTICAL_AGENT_STACK"
  | "COST_FLOOR_RESET"
  | "DATA_FLYWHEEL_CAPTURE";

export interface AIPattern {
  id: AIPatternId;
  name: string;
  mechanism: string;
  timeToImpact: string;
  examples: string[];
  exposedBlocks: BMCBlockKind[];
  exposedDimensions: CapabilityDimension[];
  competitorTemplate: () => Partial<CompetitorProfile>;
}

// ---------- helpers ----------

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

interface CapSeed {
  label: string;
  level: number;
  importance: number;
}

interface SetSeed {
  name: string;
  dimension: CapabilityDimension;
  era: number;
  lifecycle: CapabilitySet["lifecycle"];
  description?: string;
  caps: CapSeed[];
}

function buildSets(seeds: SetSeed[]): {
  sets: CapabilitySet[];
  caps: Capability[];
} {
  const sets: CapabilitySet[] = [];
  const caps: Capability[] = [];
  for (const s of seeds) {
    const setId = uid("cs");
    sets.push({
      id: setId,
      name: s.name,
      dimension: s.dimension,
      era: s.era,
      lifecycle: s.lifecycle,
      source: "STANDARD",
      description: s.description,
    });
    for (const c of s.caps) {
      caps.push({
        id: uid("cap"),
        setId,
        label: c.label,
        level: c.level,
        importance: c.importance,
      });
    }
  }
  return { sets, caps };
}

interface BlockSeed {
  kind: BMCBlockKind;
  label: string;
  strength: number;
  description?: string;
}

function buildBMC(seeds: BlockSeed[]): BMCBlock[] {
  return seeds.map((b) => ({
    id: uid("bmc"),
    kind: b.kind,
    label: b.label,
    strength: b.strength,
    description: b.description,
  }));
}

function buildVPC(
  segmentBlockId: string,
  spec: {
    jobs: { label: string; weight: number }[];
    pains: { label: string; weight: number }[];
    gains: { label: string; weight: number }[];
    productsServices: { label: string; weight: number }[];
    painRelievers: { label: string; weight: number }[];
    gainCreators: { label: string; weight: number }[];
  },
): ValuePropositionCanvas {
  const toItems = (xs: { label: string; weight: number }[]): VPCItem[] =>
    xs.map((x) => ({ id: uid("vi"), label: x.label, weight: x.weight }));
  return {
    id: uid("vpc"),
    customerSegmentBlockId: segmentBlockId,
    customerProfile: {
      jobs: toItems(spec.jobs),
      pains: toItems(spec.pains),
      gains: toItems(spec.gains),
    },
    valueMap: {
      productsServices: toItems(spec.productsServices),
      painRelievers: toItems(spec.painRelievers),
      gainCreators: toItems(spec.gainCreators),
    },
  };
}

// Shared MUST-HAVE set for every AI-native template.
function aiNativeOpsSeed(extraCaps: CapSeed[] = []): SetSeed {
  return {
    name: "AI-Native Operations",
    dimension: "TECH",
    era: 2024,
    lifecycle: "EMERGING",
    description:
      "Agent + inference + eval layer built into every operational seam.",
    caps: [
      { label: "Agentic operations layer", level: 78, importance: 90 },
      { label: "Continuous model evals", level: 70, importance: 80 },
      ...extraCaps,
    ],
  };
}

// ---------- The 7 patterns ----------

function tplCognitiveArbitrage(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed([
      { label: "LLM-augmented reasoning pipelines", level: 80, importance: 90 },
    ]),
    {
      name: "Domain Reasoning Models",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      description: "Fine-tuned reasoning stacks per regulated workflow.",
      caps: [
        { label: "Vertical fine-tunes (legal/medical/finance)", level: 72, importance: 85 },
        { label: "Human-in-the-loop QA workflows", level: 60, importance: 70 },
      ],
    },
    {
      name: "AI-Native Research Bench",
      dimension: "PEOPLE",
      era: 2024,
      lifecycle: "GROWING",
      caps: [
        { label: "Applied ML research engineers", level: 78, importance: 80 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "Mid-market customers of expensive expert services", strength: 60 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "Expert-grade analysis at 1/10th the price", strength: 85 },
    { id: uid("bmc"), kind: "CHANNELS", label: "Self-serve API + product-led sign-up", strength: 78 },
    { id: uid("bmc"), kind: "REVENUE_STREAMS", label: "Per-task pricing replacing billable-hour", strength: 80 },
    { id: uid("bmc"), kind: "KEY_RESOURCES", label: "Reasoning-tuned model weights + eval set", strength: 80 },
    { id: uid("bmc"), kind: "COST_STRUCTURE", label: "Mostly inference + small ops team", strength: 75 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Get expert-grade analysis fast", weight: 90 },
      { label: "Avoid paying for senior partner hours", weight: 80 },
    ],
    pains: [
      { label: "Slow turnaround from human experts", weight: 85 },
      { label: "Six-figure bills for routine work", weight: 80 },
    ],
    gains: [
      { label: "Hours instead of weeks", weight: 85 },
      { label: "Predictable per-task cost", weight: 75 },
    ],
    productsServices: [
      { label: "AI expert-analysis platform", weight: 90 },
    ],
    painRelievers: [
      { label: "Continuous availability, no scheduling", weight: 80 },
      { label: "Auditable reasoning traces", weight: 70 },
    ],
    gainCreators: [
      { label: "10x cost reduction at 90% quality", weight: 90 },
    ],
  });

  return {
    name: "ARBITRAGE.AI",
    industry: "AI-native expert-services replacement",
    posture: "AGGRESSIVE",
    marketShare: 0.05,
    warChest: 80,
    innovationIndex: 92,
    brandPower: 35,
    leadershipBias: -70,
    recentSignals: [
      "$120M Series B at $1.2B valuation",
      "Hired three partners from top-tier law firm",
      "Public benchmark beats human baseline on key task",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

function tplWorkflowCollapse(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed(),
    {
      name: "End-to-End Workflow Models",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      description: "Single prompt replaces a 7-step chain of human tools.",
      caps: [
        { label: "Multi-step planning agents", level: 80, importance: 90 },
        { label: "Tool-use orchestration", level: 75, importance: 85 },
      ],
    },
    {
      name: "Product-Led Growth Engine",
      dimension: "PROCESSES",
      era: 2023,
      lifecycle: "GROWING",
      caps: [
        { label: "Free-tier viral activation", level: 70, importance: 80 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "Knowledge workers running multi-tool workflows", strength: 65 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "One prompt, the whole workflow done", strength: 88 },
    { id: uid("bmc"), kind: "KEY_ACTIVITIES", label: "Compressing 7-step processes into single calls", strength: 85 },
    { id: uid("bmc"), kind: "CHANNELS", label: "Bottom-up product-led adoption", strength: 78 },
    { id: uid("bmc"), kind: "REVENUE_STREAMS", label: "Per-seat freemium → enterprise upsell", strength: 72 },
    { id: uid("bmc"), kind: "KEY_RESOURCES", label: "Workflow-graph agent framework", strength: 80 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Get the whole task done, not just step 1", weight: 90 },
    ],
    pains: [
      { label: "Stitching 7 SaaS tools together", weight: 85 },
      { label: "Context loss between tools", weight: 75 },
    ],
    gains: [
      { label: "Single surface, single bill", weight: 80 },
    ],
    productsServices: [
      { label: "Workflow-collapsing AI assistant", weight: 90 },
    ],
    painRelievers: [
      { label: "Replaces the whole tool chain", weight: 85 },
    ],
    gainCreators: [
      { label: "Hours saved per task", weight: 80 },
    ],
  });

  return {
    name: "COLLAPSE.AI",
    industry: "AI-native workflow replacement",
    posture: "AGGRESSIVE",
    marketShare: 0.04,
    warChest: 75,
    innovationIndex: 90,
    brandPower: 30,
    leadershipBias: -60,
    recentSignals: [
      "Free tier crossed 500k weekly active users",
      "Replaced incumbent tool at three Fortune 500 pilots",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

function tplSelfServiceAbsorption(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed(),
    {
      name: "Conversational UX",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      caps: [
        { label: "Chat-first onboarding", level: 78, importance: 85 },
        { label: "Smart form-filling agents", level: 72, importance: 75 },
      ],
    },
    {
      name: "Lightweight Distribution",
      dimension: "PROCESSES",
      era: 2024,
      lifecycle: "EMERGING",
      caps: [
        { label: "Direct-to-consumer growth ops", level: 65, importance: 70 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "End-users currently paying intermediaries", strength: 55 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "Skip the middleman, do it yourself in minutes", strength: 80 },
    { id: uid("bmc"), kind: "CHANNELS", label: "Direct app + SEO + content", strength: 70 },
    { id: uid("bmc"), kind: "REVENUE_STREAMS", label: "Tiny fee per transaction, not per hour", strength: 78 },
    { id: uid("bmc"), kind: "CUSTOMER_RELATIONSHIPS", label: "Self-serve + AI concierge", strength: 70 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Get the outcome without hiring a pro", weight: 85 },
    ],
    pains: [
      { label: "Intermediary fees eat the value", weight: 80 },
      { label: "Slow back-and-forth via email", weight: 70 },
    ],
    gains: [
      { label: "Cheaper and faster than hiring", weight: 85 },
    ],
    productsServices: [
      { label: "Self-serve AI agent", weight: 85 },
    ],
    painRelievers: [
      { label: "Eliminates middleman entirely", weight: 88 },
    ],
    gainCreators: [
      { label: "Instant turnaround", weight: 75 },
    ],
  });

  return {
    name: "DIRECT.AI",
    industry: "AI-native disintermediator",
    posture: "OPPORTUNISTIC",
    marketShare: 0.03,
    warChest: 60,
    innovationIndex: 85,
    brandPower: 40,
    leadershipBias: -50,
    recentSignals: [
      "Bypassed traditional broker channel in test market",
      "App store top-10 in target category",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

function tplPersonalizationUnitOfOne(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed(),
    {
      name: "Personalisation Engine",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      caps: [
        { label: "Per-user model adaptation", level: 78, importance: 90 },
        { label: "Longitudinal context memory", level: 70, importance: 85 },
      ],
    },
    {
      name: "Empathic Interaction Design",
      dimension: "PEOPLE",
      era: 2024,
      lifecycle: "GROWING",
      caps: [
        { label: "Behavioral & clinical specialists", level: 72, importance: 75 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "Mass market previously priced out of bespoke service", strength: 60 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "Bespoke service at consumer pricing", strength: 88 },
    { id: uid("bmc"), kind: "CUSTOMER_RELATIONSHIPS", label: "1:1 AI relationship, indefinitely", strength: 80 },
    { id: uid("bmc"), kind: "REVENUE_STREAMS", label: "Subscription with negligible marginal cost per user", strength: 78 },
    { id: uid("bmc"), kind: "KEY_RESOURCES", label: "Per-user state and adaptation graph", strength: 80 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Get advice tailored to my exact situation", weight: 90 },
    ],
    pains: [
      { label: "Generic one-size-fits-all advice", weight: 80 },
      { label: "Bespoke service costs $$$$", weight: 85 },
    ],
    gains: [
      { label: "Feels like having a personal expert", weight: 88 },
    ],
    productsServices: [
      { label: "Adaptive AI companion", weight: 90 },
    ],
    painRelievers: [
      { label: "Affordable bespoke at $20/mo", weight: 90 },
    ],
    gainCreators: [
      { label: "Better outcomes per dollar than the premium incumbent", weight: 80 },
    ],
  });

  return {
    name: "UNITOFONE.AI",
    industry: "AI-native personalisation at scale",
    posture: "EXPANSIVE",
    marketShare: 0.02,
    warChest: 70,
    innovationIndex: 88,
    brandPower: 45,
    leadershipBias: -40,
    recentSignals: [
      "User retention 4x category average",
      "Closed strategic deal with national retailer",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

function tplVerticalAgentStack(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed(),
    {
      name: "Vertical Agent Stack",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      description: "A single AI-native owns the entire vertical workflow.",
      caps: [
        { label: "Specialised agents per workflow step", level: 80, importance: 90 },
        { label: "Cross-agent state + handoff", level: 72, importance: 85 },
      ],
    },
    {
      name: "Vertical Domain Engineering",
      dimension: "PEOPLE",
      era: 2024,
      lifecycle: "GROWING",
      caps: [
        { label: "Domain SMEs paired with ML engineers", level: 75, importance: 80 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "Functional buyers (SDR/AE/CSM, finance ops, etc.)", strength: 60 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "Replace the whole function with an agent stack", strength: 85 },
    { id: uid("bmc"), kind: "KEY_ACTIVITIES", label: "Operating the end-to-end workflow as a service", strength: 85 },
    { id: uid("bmc"), kind: "CHANNELS", label: "Direct enterprise sales + outbound proof-of-value", strength: 70 },
    { id: uid("bmc"), kind: "CUSTOMER_RELATIONSHIPS", label: "Outcome-based managed service", strength: 75 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Hit the function's number with less headcount", weight: 90 },
    ],
    pains: [
      { label: "Hiring + onboarding humans is slow and expensive", weight: 85 },
      { label: "Multiple SaaS tools per function don't talk", weight: 75 },
    ],
    gains: [
      { label: "Buy the outcome, not the headcount", weight: 88 },
    ],
    productsServices: [
      { label: "End-to-end agent stack for the function", weight: 90 },
    ],
    painRelievers: [
      { label: "One vendor, one outcome SLA", weight: 80 },
    ],
    gainCreators: [
      { label: "Variable cost replacing fixed headcount", weight: 85 },
    ],
  });

  return {
    name: "STACK.AI",
    industry: "Vertical AI agent stack",
    posture: "AGGRESSIVE",
    marketShare: 0.04,
    warChest: 85,
    innovationIndex: 90,
    brandPower: 35,
    leadershipBias: -55,
    recentSignals: [
      "Outcome-based contract signed with Fortune 100",
      "Built former incumbent's CEO into advisory board",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

function tplCostFloorReset(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed(),
    {
      name: "Ultra-Cheap Inference",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      description: "A new price/quality frontier the incumbent can't match.",
      caps: [
        { label: "Distilled small models tuned per task", level: 80, importance: 90 },
        { label: "Cost-per-call < $0.01", level: 78, importance: 90 },
      ],
    },
    {
      name: "Capital-Lean Operations",
      dimension: "ORG",
      era: 2024,
      lifecycle: "GROWING",
      caps: [
        { label: "Tiny ops team, no field sales", level: 80, importance: 75 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "Price-sensitive long tail of customers", strength: 65 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "Good-enough quality at a new price floor", strength: 88 },
    { id: uid("bmc"), kind: "REVENUE_STREAMS", label: "Usage-based, fractions of a cent per call", strength: 85 },
    { id: uid("bmc"), kind: "COST_STRUCTURE", label: "Inference cost only — no humans in the loop", strength: 85 },
    { id: uid("bmc"), kind: "CHANNELS", label: "API-first, dev-led adoption", strength: 75 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Get the task done at the lowest possible cost", weight: 90 },
    ],
    pains: [
      { label: "Premium incumbent priced for enterprise", weight: 85 },
    ],
    gains: [
      { label: "100x cheaper at acceptable quality", weight: 88 },
    ],
    productsServices: [
      { label: "Commodity-priced AI service", weight: 88 },
    ],
    painRelievers: [
      { label: "Pay only for what you use", weight: 80 },
    ],
    gainCreators: [
      { label: "Unlocks use cases that weren't viable at the old price", weight: 85 },
    ],
  });

  return {
    name: "FLOOR.AI",
    industry: "AI-native price disruptor",
    posture: "AGGRESSIVE",
    marketShare: 0.06,
    warChest: 70,
    innovationIndex: 88,
    brandPower: 30,
    leadershipBias: -65,
    recentSignals: [
      "Published pricing 100x below category benchmark",
      "Developer adoption growing 30% week-over-week",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

function tplDataFlywheelCapture(): Partial<CompetitorProfile> {
  const { sets, caps } = buildSets([
    aiNativeOpsSeed(),
    {
      name: "Proprietary Data Engineering",
      dimension: "TECH",
      era: 2024,
      lifecycle: "GROWING",
      description: "Usage data accumulates faster than the incumbent can match.",
      caps: [
        { label: "Closed-loop usage telemetry", level: 82, importance: 95 },
        { label: "Continuous fine-tune from production traffic", level: 78, importance: 90 },
      ],
    },
    {
      name: "Data Network Effects",
      dimension: "ORG",
      era: 2024,
      lifecycle: "EMERGING",
      caps: [
        { label: "Every new user improves the model", level: 75, importance: 90 },
      ],
    },
  ]);

  const segmentId = uid("bmc");
  const blocks: BMCBlock[] = [
    { id: segmentId, kind: "CUSTOMER_SEGMENTS", label: "Customers whose data must stay with the AI-native vendor", strength: 60 },
    { id: uid("bmc"), kind: "VALUE_PROPOSITIONS", label: "Gets smarter the more you use it", strength: 90 },
    { id: uid("bmc"), kind: "KEY_RESOURCES", label: "Proprietary task-and-outcome dataset", strength: 92 },
    { id: uid("bmc"), kind: "KEY_ACTIVITIES", label: "Closed-loop training on customer outcomes", strength: 85 },
    { id: uid("bmc"), kind: "REVENUE_STREAMS", label: "Subscription that compounds switching cost over time", strength: 80 },
  ];

  const vpc = buildVPC(segmentId, {
    jobs: [
      { label: "Get progressively better outcomes over time", weight: 85 },
    ],
    pains: [
      { label: "Static tools that never learn from my data", weight: 80 },
    ],
    gains: [
      { label: "Compounding advantage from staying", weight: 85 },
    ],
    productsServices: [
      { label: "Learning AI platform", weight: 90 },
    ],
    painRelievers: [
      { label: "Continuous improvement, no version migration", weight: 80 },
    ],
    gainCreators: [
      { label: "Switching cost grows the longer you use it", weight: 85 },
    ],
  });

  return {
    name: "FLYWHEEL.AI",
    industry: "AI-native data-network challenger",
    posture: "EXPANSIVE",
    marketShare: 0.05,
    warChest: 85,
    innovationIndex: 90,
    brandPower: 45,
    leadershipBias: -45,
    recentSignals: [
      "Disclosed 100x training data accumulation vs incumbent",
      "Top customers refuse to switch — data moat working",
    ],
    topology: {
      capabilitySets: sets,
      capabilities: caps,
      bmc: { blocks },
      vpcs: [vpc],
    },
  };
}

// ---------- The exported library ----------

export const AI_NATIVE_PATTERNS: AIPattern[] = [
  {
    id: "COGNITIVE_ARBITRAGE",
    name: "Cognitive Arbitrage",
    mechanism: "Replace expensive human reasoning with cheap AI at scale",
    timeToImpact: "18–36 months",
    examples: ["Harvey (legal review)", "Hippocratic AI (clinical triage)"],
    exposedBlocks: ["KEY_RESOURCES", "COST_STRUCTURE", "VALUE_PROPOSITIONS"],
    exposedDimensions: ["PEOPLE", "TECH"],
    competitorTemplate: tplCognitiveArbitrage,
  },
  {
    id: "WORKFLOW_COLLAPSE",
    name: "Workflow Collapse",
    mechanism: "Compress a 7-step human workflow into one prompt",
    timeToImpact: "12–24 months",
    examples: ["Cursor (dev workflows)", "Mercury Bank (AI bookkeeping)"],
    exposedBlocks: ["KEY_ACTIVITIES", "VALUE_PROPOSITIONS", "CHANNELS"],
    exposedDimensions: ["TECH", "PROCESSES"],
    competitorTemplate: tplWorkflowCollapse,
  },
  {
    id: "SELF_SERVICE_ABSORPTION",
    name: "Self-Service Absorption",
    mechanism: "Customers do the work themselves; intermediary disappears",
    timeToImpact: "24–48 months",
    examples: ["DoNotPay (legal forms)", "AI tax preparation"],
    exposedBlocks: ["CHANNELS", "CUSTOMER_RELATIONSHIPS", "REVENUE_STREAMS"],
    exposedDimensions: ["PROCESSES", "ORG"],
    competitorTemplate: tplSelfServiceAbsorption,
  },
  {
    id: "PERSONALIZATION_UNIT_OF_ONE",
    name: "Personalization at unit-of-one",
    mechanism: "What only the rich could afford becomes universal",
    timeToImpact: "36+ months",
    examples: ["Khanmigo (tutoring)", "AI wealth advisors"],
    exposedBlocks: ["CUSTOMER_RELATIONSHIPS", "VALUE_PROPOSITIONS", "CUSTOMER_SEGMENTS"],
    exposedDimensions: ["PEOPLE", "TECH"],
    competitorTemplate: tplPersonalizationUnitOfOne,
  },
  {
    id: "VERTICAL_AGENT_STACK",
    name: "Vertical Agent Stack",
    mechanism: "A single AI-native owns the end-to-end vertical workflow",
    timeToImpact: "24 months",
    examples: ["AI SDR+AE+CSM stacks"],
    exposedBlocks: ["KEY_ACTIVITIES", "CHANNELS", "CUSTOMER_RELATIONSHIPS"],
    exposedDimensions: ["PEOPLE", "TECH", "PROCESSES"],
    competitorTemplate: tplVerticalAgentStack,
  },
  {
    id: "COST_FLOOR_RESET",
    name: "Cost-Floor Reset",
    mechanism: 'New "good enough" price destroys the premium',
    timeToImpact: "immediate",
    examples: ["AI customer support at $0.01/conv"],
    exposedBlocks: ["COST_STRUCTURE", "REVENUE_STREAMS", "VALUE_PROPOSITIONS"],
    exposedDimensions: ["TECH", "ORG"],
    competitorTemplate: tplCostFloorReset,
  },
  {
    id: "DATA_FLYWHEEL_CAPTURE",
    name: "Data Flywheel Capture",
    mechanism: "New entrant accumulates a proprietary data loop incumbent can't match",
    timeToImpact: "structural",
    examples: ["Anyone with usage-data moats"],
    exposedBlocks: ["KEY_RESOURCES", "KEY_ACTIVITIES", "VALUE_PROPOSITIONS"],
    exposedDimensions: ["TECH", "ORG"],
    competitorTemplate: tplDataFlywheelCapture,
  },
];

export function getPattern(id: AIPatternId): AIPattern {
  const p = AI_NATIVE_PATTERNS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown AIPatternId: ${id}`);
  return p;
}

// ---------- Public builders ----------

/**
 * competitorFromPattern — fully-formed CompetitorProfile from a pattern,
 * with the user's fear context optionally biasing name/description.
 */
export function competitorFromPattern(
  pattern: AIPattern,
  fearContext: { name?: string; description?: string } = {},
): CompetitorProfile {
  const tpl = pattern.competitorTemplate();
  const baseTopology: StrategicTopology = tpl.topology ?? {
    capabilitySets: [],
    capabilities: [],
    bmc: { blocks: [] },
    vpcs: [],
  };

  return {
    name: fearContext.name?.toUpperCase() ?? tpl.name ?? "AI-NATIVE CHALLENGER",
    industry: tpl.industry ?? "AI-native disruption",
    marketShare: tpl.marketShare ?? 0.04,
    warChest: tpl.warChest ?? 70,
    innovationIndex: tpl.innovationIndex ?? 90,
    brandPower: tpl.brandPower ?? 35,
    posture: tpl.posture ?? "AGGRESSIVE",
    leadershipBias: tpl.leadershipBias ?? -50,
    recentSignals:
      fearContext.description && fearContext.description.length > 0
        ? [fearContext.description.slice(0, 200), ...(tpl.recentSignals ?? [])]
        : tpl.recentSignals ?? [],
    topology: baseTopology,
  };
}

/**
 * exposureFromPattern — given a pattern and OUR topology, returns which of
 * OUR BMC blocks and capability sets are exposed. Used by StepExposure to
 * highlight defaults the user can edit.
 */
export function exposureFromPattern(
  pattern: AIPattern,
  ownTopology: StrategicTopology,
): { exposedBlockIds: string[]; exposedSetIds: string[] } {
  const exposedBlockIds = ownTopology.bmc.blocks
    .filter((b) => pattern.exposedBlocks.includes(b.kind))
    .map((b) => b.id);
  const exposedSetIds = ownTopology.capabilitySets
    .filter((s) => {
      if (!pattern.exposedDimensions.includes(s.dimension)) return false;
      // DECLINING in an exposed dimension = high exposure; MATURE = moderate;
      // EMERGING/GROWING = low (we have momentum there).
      return s.lifecycle === "DECLINING" || s.lifecycle === "MATURE";
    })
    .map((s) => s.id);
  return { exposedBlockIds, exposedSetIds };
}

/**
 * AI-Native Disruption scenario seed — pre-loaded into the wizard's final
 * scenario list so the war-game has the "pattern plays out at maximum
 * velocity" rollout to compare against the baseline.
 */
export function disruptionScenario(pattern: AIPattern): {
  id: string;
  label: string;
  description: string;
  weight: number;
  modifiers: Partial<CompetitorProfile>;
} {
  return {
    id: "s-ai-native",
    label: "AI-Native Disruption",
    description: `The ${pattern.name} pattern plays out at maximum velocity (${pattern.timeToImpact}). ${pattern.mechanism}.`,
    weight: 0.35,
    modifiers: {
      posture: "AGGRESSIVE",
      innovationIndex: 95,
      warChest: 90,
    },
  };
}
