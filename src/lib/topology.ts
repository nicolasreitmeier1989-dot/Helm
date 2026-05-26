// HELM — topology math. Pure functions over StrategicTopology.
//
// Provides:
//   - vpcFit(vpc):                    0..100 score for how well a value map
//                                     resolves a customer profile.
//   - bmcOverlapScore(a, b):          0..100 — overlap on shared BMC blocks
//                                     (especially customer segments).
//   - capabilityAsymmetry(a, b):      where each side has an edge.
//   - applyDeltaToTopology(t, d):     pure transform — returns a new topology.

import type {
  BMCBlock,
  BMCBlockKind,
  BusinessModelCanvas,
  Capability,
  CapabilityDimension,
  StrategicTopology,
  TopologyDelta,
  VPCItem,
  ValuePropositionCanvas,
} from "./types";

// ---------- token / label utilities ----------

const STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "with", "at",
  "by", "from", "as", "is", "are", "be", "this", "that", "der", "die", "das",
  "den", "dem", "des", "und", "oder", "im", "für", "auf", "zu", "mit", "von",
  "ein", "eine", "einen", "einem", "einer",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Two labels "match" if they share at least one significant token (length>=3,
 * not a stopword) OR if one is a substring of the other.
 */
export function labelsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return true;
  if (al.length >= 4 && bl.includes(al)) return true;
  if (bl.length >= 4 && al.includes(bl)) return true;
  const ta = new Set(tokens(a));
  for (const t of tokens(b)) if (ta.has(t)) return true;
  return false;
}

// ---------- VPC fit ----------

function weightedMatch(A: VPCItem[], B: VPCItem[]): number {
  if (A.length === 0) return 50;
  const totalW = A.reduce((s, a) => s + Math.max(1, a.weight), 0);
  let acc = 0;
  for (const a of A) {
    const matches = B.filter((b) => labelsMatch(a.label, b.label)).length;
    // saturates at 1
    const cov = Math.min(1, matches / Math.max(1, 1));
    acc += Math.max(1, a.weight) * cov;
  }
  return (acc / Math.max(1, totalW)) * 100;
}

/**
 * vpcFit — average of weighted matches across the three customer-profile /
 * value-map pairs. Returns 0..100.
 */
export function vpcFit(vpc: ValuePropositionCanvas): number {
  const a = weightedMatch(vpc.customerProfile.pains, vpc.valueMap.painRelievers);
  const b = weightedMatch(vpc.customerProfile.gains, vpc.valueMap.gainCreators);
  const c = weightedMatch(vpc.customerProfile.jobs, vpc.valueMap.productsServices);
  return Math.round((a + b + c) / 3);
}

// ---------- BMC overlap ----------

/**
 * bmcOverlapScore — 0..100. Looks at blocks of the same kind on both sides,
 * checks for label matches, and weighs CUSTOMER_SEGMENTS overlap most heavily
 * (it's where competitive collision actually happens). VALUE_PROPOSITIONS and
 * CHANNELS overlap next; the rest contribute a smaller share.
 */
export function bmcOverlapScore(
  a: BusinessModelCanvas,
  b: BusinessModelCanvas,
): number {
  const WEIGHTS: Record<BMCBlockKind, number> = {
    CUSTOMER_SEGMENTS: 3.0,
    VALUE_PROPOSITIONS: 2.0,
    CHANNELS: 1.5,
    CUSTOMER_RELATIONSHIPS: 1.0,
    REVENUE_STREAMS: 1.5,
    KEY_RESOURCES: 1.0,
    KEY_ACTIVITIES: 1.0,
    KEY_PARTNERS: 1.0,
    COST_STRUCTURE: 0.5,
  };
  let num = 0;
  let den = 0;
  const kinds = Object.keys(WEIGHTS) as BMCBlockKind[];
  for (const k of kinds) {
    const w = WEIGHTS[k];
    const aB = a.blocks.filter((x) => x.kind === k);
    const bB = b.blocks.filter((x) => x.kind === k);
    if (aB.length === 0 || bB.length === 0) {
      den += w;
      continue;
    }
    let hits = 0;
    for (const ax of aB) {
      if (bB.some((bx) => labelsMatch(ax.label, bx.label))) hits++;
    }
    const cov = hits / Math.max(1, aB.length);
    num += w * cov;
    den += w;
  }
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

/**
 * Returns the BMC blocks that appear (by label) on BOTH sides. Useful for the
 * comparison UI and for the engine when picking collision targets.
 */
export function sharedBlocks(
  a: BusinessModelCanvas,
  b: BusinessModelCanvas,
  kind?: BMCBlockKind,
): { ours: BMCBlock; theirs: BMCBlock }[] {
  const aB = a.blocks.filter((x) => !kind || x.kind === kind);
  const out: { ours: BMCBlock; theirs: BMCBlock }[] = [];
  for (const ax of aB) {
    const bx = b.blocks.find(
      (y) => y.kind === ax.kind && labelsMatch(ax.label, y.label),
    );
    if (bx) out.push({ ours: ax, theirs: bx });
  }
  return out;
}

// ---------- Capability asymmetry ----------

export interface CapabilityAsymmetry {
  ourEdge: number;    // 0..100 — aggregated advantage strength
  theirEdge: number;  // 0..100 — aggregated disadvantage / their advantage
  perDimension: Record<
    CapabilityDimension,
    { ourLevel: number; theirLevel: number; importance: number; delta: number }
  >;
}

/**
 * capabilityAsymmetry — for each dimension, compares importance-weighted
 * capability levels between two sides. Positive delta = our advantage, negative
 * = their advantage. Aggregates ourEdge / theirEdge into 0..100 summary scores.
 */
export function capabilityAsymmetry(
  ours: Capability[],
  theirs: Capability[],
): CapabilityAsymmetry {
  const dims: CapabilityDimension[] = ["PEOPLE", "TECH", "ORG", "PROCESSES"];
  const perDimension = {} as CapabilityAsymmetry["perDimension"];
  let posSum = 0;
  let negSum = 0;
  let weightSum = 0;
  for (const dim of dims) {
    const a = ours.filter((c) => c.dimension === dim);
    const b = theirs.filter((c) => c.dimension === dim);
    const aLvl =
      a.length === 0
        ? 0
        : a.reduce((s, c) => s + (c.level * Math.max(1, c.importance)) / 100, 0) /
          Math.max(1, a.length);
    const bLvl =
      b.length === 0
        ? 0
        : b.reduce((s, c) => s + (c.level * Math.max(1, c.importance)) / 100, 0) /
          Math.max(1, b.length);
    const importance =
      Math.max(
        ...a.map((c) => c.importance),
        ...b.map((c) => c.importance),
        0,
      ) || 0;
    const delta = aLvl - bLvl;
    perDimension[dim] = {
      ourLevel: Math.round(aLvl),
      theirLevel: Math.round(bLvl),
      importance: Math.round(importance),
      delta: Math.round(delta),
    };
    if (delta > 0) posSum += delta * (importance / 100 || 1);
    else negSum += -delta * (importance / 100 || 1);
    weightSum += Math.max(1, importance / 100);
  }
  const scale = Math.max(1, weightSum) * 100;
  return {
    ourEdge: Math.min(100, Math.round((posSum / scale) * 100)),
    theirEdge: Math.min(100, Math.round((negSum / scale) * 100)),
    perDimension,
  };
}

// ---------- applyDeltaToTopology ----------

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * applyDeltaToTopology — pure. Returns a NEW StrategicTopology with the delta
 * applied. Falls back to no-op if the target is malformed. Used to simulate
 * the post-move state for forward-looking analysis.
 */
export function applyDeltaToTopology(
  topology: StrategicTopology,
  delta: TopologyDelta,
): StrategicTopology {
  const t = cloneTopology(topology);

  const mag = clamp(delta.magnitude, 0, 100);
  const tgt = delta.target;

  if (tgt.kind === "CAPABILITY") {
    if (delta.op === "ADD") {
      t.capabilities.push({
        id: uid("cap"),
        dimension: tgt.dimension,
        label: delta.newLabel ?? "New capability",
        level: clamp(mag),
        importance: clamp(mag),
      });
    } else if (tgt.capabilityId) {
      const i = t.capabilities.findIndex((c) => c.id === tgt.capabilityId);
      if (i >= 0) {
        if (delta.op === "STRENGTHEN") {
          t.capabilities[i] = {
            ...t.capabilities[i],
            level: clamp(t.capabilities[i].level + mag * 0.5),
          };
        } else if (delta.op === "WEAKEN") {
          t.capabilities[i] = {
            ...t.capabilities[i],
            level: clamp(t.capabilities[i].level - mag * 0.5),
          };
        } else if (delta.op === "REMOVE") {
          t.capabilities.splice(i, 1);
        } else if (delta.op === "MIGRATE") {
          t.capabilities[i] = {
            ...t.capabilities[i],
            label: delta.newLabel ?? t.capabilities[i].label,
          };
        }
      }
    }
  } else if (tgt.kind === "BMC_BLOCK") {
    if (delta.op === "ADD") {
      t.bmc.blocks.push({
        id: uid("bmc"),
        kind: tgt.blockKind,
        label: delta.newLabel ?? "New block",
        strength: clamp(mag),
      });
    } else if (tgt.blockId) {
      const i = t.bmc.blocks.findIndex((b) => b.id === tgt.blockId);
      if (i >= 0) {
        if (delta.op === "STRENGTHEN") {
          t.bmc.blocks[i] = {
            ...t.bmc.blocks[i],
            strength: clamp(t.bmc.blocks[i].strength + mag * 0.5),
          };
        } else if (delta.op === "WEAKEN") {
          t.bmc.blocks[i] = {
            ...t.bmc.blocks[i],
            strength: clamp(t.bmc.blocks[i].strength - mag * 0.5),
          };
        } else if (delta.op === "REMOVE") {
          t.bmc.blocks.splice(i, 1);
        } else if (delta.op === "MIGRATE") {
          t.bmc.blocks[i] = {
            ...t.bmc.blocks[i],
            label: delta.newLabel ?? t.bmc.blocks[i].label,
          };
        }
      }
    }
  } else if (tgt.kind === "VPC_ITEM") {
    const vpc = tgt.vpcId
      ? t.vpcs.find((v) => v.id === tgt.vpcId)
      : t.vpcs[0];
    if (!vpc) return t;

    const list: VPCItem[] = (tgt.side === "CUSTOMER_PROFILE"
      ? (vpc.customerProfile as unknown as Record<string, VPCItem[]>)
      : (vpc.valueMap as unknown as Record<string, VPCItem[]>)
    )[tgt.itemKind];

    if (!list) return t;

    if (delta.op === "ADD") {
      list.push({
        id: uid("vi"),
        label: delta.newLabel ?? "New item",
        weight: clamp(mag),
      });
    } else if (tgt.itemId) {
      const i = list.findIndex((x) => x.id === tgt.itemId);
      if (i >= 0) {
        if (delta.op === "STRENGTHEN") {
          list[i] = {
            ...list[i],
            weight: clamp(list[i].weight + mag * 0.5),
          };
        } else if (delta.op === "WEAKEN") {
          list[i] = {
            ...list[i],
            weight: clamp(list[i].weight - mag * 0.5),
          };
        } else if (delta.op === "REMOVE") {
          list.splice(i, 1);
        } else if (delta.op === "MIGRATE") {
          list[i] = {
            ...list[i],
            label: delta.newLabel ?? list[i].label,
          };
        }
      }
    }
  }

  return t;
}

function cloneTopology(t: StrategicTopology): StrategicTopology {
  return {
    capabilities: t.capabilities.map((c) => ({ ...c })),
    bmc: { blocks: t.bmc.blocks.map((b) => ({ ...b })) },
    vpcs: t.vpcs.map((v) => ({
      ...v,
      customerProfile: {
        jobs: v.customerProfile.jobs.map((x) => ({ ...x })),
        pains: v.customerProfile.pains.map((x) => ({ ...x })),
        gains: v.customerProfile.gains.map((x) => ({ ...x })),
      },
      valueMap: {
        productsServices: v.valueMap.productsServices.map((x) => ({ ...x })),
        painRelievers: v.valueMap.painRelievers.map((x) => ({ ...x })),
        gainCreators: v.valueMap.gainCreators.map((x) => ({ ...x })),
      },
    })),
  };
}

// ---------- delta -> MoveCategory derivation ----------

/**
 * Derive the legacy MoveCategory tag from a delta's dominant target. Used so
 * existing per-category heatmaps and counter libraries keep working.
 */
export function deriveCategoryFromDeltas(deltas: TopologyDelta[]):
  | "PRICING" | "PRODUCT" | "M&A" | "TALENT" | "GEO" | "CHANNEL"
  | "BRAND" | "REGULATORY" | "CAPITAL" | "PARTNERSHIP" {
  if (deltas.length === 0) return "PRODUCT";
  const d = deltas[0];
  const t = d.target;

  if (t.kind === "CAPABILITY") {
    switch (t.dimension) {
      case "PEOPLE": return "TALENT";
      case "TECH": return "PRODUCT";
      case "ORG": return "CAPITAL";
      case "PROCESSES": return "REGULATORY";
    }
  }
  if (t.kind === "BMC_BLOCK") {
    switch (t.blockKind) {
      case "CUSTOMER_SEGMENTS": return "GEO";
      case "VALUE_PROPOSITIONS": return "PRODUCT";
      case "CHANNELS": return "CHANNEL";
      case "CUSTOMER_RELATIONSHIPS": return "BRAND";
      case "REVENUE_STREAMS": return "PRICING";
      case "KEY_RESOURCES":
        return d.op === "ADD" ? "M&A" : "CAPITAL";
      case "KEY_ACTIVITIES": return "PRODUCT";
      case "KEY_PARTNERS": return "PARTNERSHIP";
      case "COST_STRUCTURE": return "CAPITAL";
    }
  }
  // VPC_ITEM — collapse to PRODUCT / BRAND based on side
  return t.side === "VALUE_MAP" ? "PRODUCT" : "BRAND";
}
