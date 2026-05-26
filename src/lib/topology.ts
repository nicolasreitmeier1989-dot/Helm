// WFC — topology math. Pure functions over StrategicTopology.
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
  CapabilitySet,
  CapabilitySetLifecycle,
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
    .replace(/[^a-z0-9äöüß\s]/g, " ")
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

// ---------- Capability asymmetry (set-aware, v0.3F) ----------

export interface CapabilityAsymmetry {
  ourEdge: number;    // 0..100 — aggregated advantage strength
  theirEdge: number;  // 0..100 — aggregated disadvantage / their advantage
  perDimension: Record<
    CapabilityDimension,
    { ourLevel: number; theirLevel: number; importance: number; delta: number }
  >;
}

// Lifecycle multipliers: EMERGING and GROWING sets get more weight than mature
// ones because the strategic race is decided in the formative period; DECLINING
// and OBSOLETE sets carry almost no weight.
const LIFECYCLE_MULT: Record<CapabilitySetLifecycle, number> = {
  EMERGING: 1.4,
  GROWING: 1.2,
  MATURE: 1.0,
  DECLINING: 0.5,
  OBSOLETE: 0.1,
};

/**
 * capabilityAsymmetry — walks both sides' capabilitySets, joins them by name
 * (case-insensitive). For each unique set name that exists on either side it
 * computes a weighted score: avg level × max importance × lifecycle multiplier
 * (per side), then takes ours - theirs. Aggregates positive deltas into
 * ourEdge and negative deltas into theirEdge. Also surfaces a per-dimension
 * roll-up for the existing UI.
 */
export function capabilityAsymmetry(
  ourTop: StrategicTopology,
  theirTop: StrategicTopology,
): CapabilityAsymmetry {
  const dims: CapabilityDimension[] = ["PEOPLE", "TECH", "ORG", "PROCESSES"];
  const perDimension = {} as CapabilityAsymmetry["perDimension"];
  for (const d of dims) {
    perDimension[d] = { ourLevel: 0, theirLevel: 0, importance: 0, delta: 0 };
  }
  // collect unique set names, case-insensitive
  const nameKey = (n: string) => n.trim().toLowerCase();
  const ourByName = new Map<string, CapabilitySet>();
  for (const s of ourTop.capabilitySets) ourByName.set(nameKey(s.name), s);
  const theirByName = new Map<string, CapabilitySet>();
  for (const s of theirTop.capabilitySets) theirByName.set(nameKey(s.name), s);
  const allNames = new Set<string>([...ourByName.keys(), ...theirByName.keys()]);

  let posSum = 0;
  let negSum = 0;
  let weightSum = 0;

  const dimAcc: Record<CapabilityDimension, {
    our: number; their: number; importance: number; n: number;
  }> = {
    PEOPLE: { our: 0, their: 0, importance: 0, n: 0 },
    TECH: { our: 0, their: 0, importance: 0, n: 0 },
    ORG: { our: 0, their: 0, importance: 0, n: 0 },
    PROCESSES: { our: 0, their: 0, importance: 0, n: 0 },
  };

  const setScore = (
    set: CapabilitySet | undefined,
    caps: Capability[],
  ): { score: number; maxImp: number; avgLvl: number } => {
    if (!set) return { score: 0, maxImp: 0, avgLvl: 0 };
    if (caps.length === 0) return { score: 0, maxImp: 0, avgLvl: 0 };
    const avgLvl =
      caps.reduce((s, c) => s + c.level, 0) / Math.max(1, caps.length);
    const maxImp = Math.max(...caps.map((c) => c.importance));
    const mult = LIFECYCLE_MULT[set.lifecycle];
    // 0..~140 — avgLvl × (importance/100) × lifecycle multiplier
    return {
      score: avgLvl * (maxImp / 100) * mult,
      maxImp,
      avgLvl,
    };
  };

  for (const k of allNames) {
    const ourSet = ourByName.get(k);
    const theirSet = theirByName.get(k);
    const ourCaps = ourSet
      ? ourTop.capabilities.filter((c) => c.setId === ourSet.id)
      : [];
    const theirCaps = theirSet
      ? theirTop.capabilities.filter((c) => c.setId === theirSet.id)
      : [];
    const ours = setScore(ourSet, ourCaps);
    const theirs = setScore(theirSet, theirCaps);
    const delta = ours.score - theirs.score;
    const importance = Math.max(ours.maxImp, theirs.maxImp);
    const dim = (ourSet?.dimension ?? theirSet?.dimension) as CapabilityDimension;
    if (delta > 0) posSum += delta * (importance / 100 || 1);
    else negSum += -delta * (importance / 100 || 1);
    weightSum += Math.max(1, importance / 100);
    if (dim) {
      const a = dimAcc[dim];
      a.our += ours.avgLvl;
      a.their += theirs.avgLvl;
      a.importance = Math.max(a.importance, importance);
      a.n += 1;
    }
  }

  for (const d of dims) {
    const a = dimAcc[d];
    const ourLevel = a.n === 0 ? 0 : a.our / a.n;
    const theirLevel = a.n === 0 ? 0 : a.their / a.n;
    perDimension[d] = {
      ourLevel: Math.round(ourLevel),
      theirLevel: Math.round(theirLevel),
      importance: Math.round(a.importance),
      delta: Math.round(ourLevel - theirLevel),
    };
  }

  const scale = Math.max(1, weightSum) * 100;
  return {
    ourEdge: Math.min(100, Math.round((posSum / scale) * 100)),
    theirEdge: Math.min(100, Math.round((negSum / scale) * 100)),
    perDimension,
  };
}

/**
 * findEmergingCollisions — returns sets where BOTH sides have a set of the
 * same name (case-insensitive) AND either side's lifecycle is EMERGING or
 * GROWING. These are the "race-on" sets where the strategic outcome is open.
 */
export function findEmergingCollisions(
  a: StrategicTopology,
  b: StrategicTopology,
): {
  name: string;
  dimension: CapabilityDimension;
  ours: CapabilitySet;
  theirs: CapabilitySet;
}[] {
  const out: {
    name: string;
    dimension: CapabilityDimension;
    ours: CapabilitySet;
    theirs: CapabilitySet;
  }[] = [];
  for (const s of a.capabilitySets) {
    const k = s.name.trim().toLowerCase();
    const match = b.capabilitySets.find(
      (t) => t.name.trim().toLowerCase() === k,
    );
    if (!match) continue;
    if (
      s.lifecycle === "EMERGING" ||
      s.lifecycle === "GROWING" ||
      match.lifecycle === "EMERGING" ||
      match.lifecycle === "GROWING"
    ) {
      out.push({
        name: s.name,
        dimension: s.dimension,
        ours: s,
        theirs: match,
      });
    }
  }
  return out;
}

/**
 * addCapabilitySetToTopology — pure return. Appends a new CapabilitySet to a
 * topology, returning a new StrategicTopology. Used by the engine to emit
 * "new emerging capability" deltas without mutation.
 */
export function addCapabilitySetToTopology(
  t: StrategicTopology,
  set: CapabilitySet,
): StrategicTopology {
  return {
    ...t,
    capabilitySets: [...t.capabilitySets, { ...set }],
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
      // resolve setId: explicit, then first matching-dimension set, then a
      // newly-minted Legacy set fallback.
      let setId = tgt.setId;
      if (!setId) {
        const candidate = t.capabilitySets.find((s) => s.dimension === tgt.dimension);
        if (candidate) setId = candidate.id;
      }
      if (!setId) {
        const legacy = {
          id: uid("cs"),
          name: `Legacy ${tgt.dimension}`,
          dimension: tgt.dimension,
          era: new Date().getFullYear(),
          lifecycle: "MATURE" as const,
          source: "CUSTOM" as const,
        };
        t.capabilitySets.push(legacy);
        setId = legacy.id;
      }
      t.capabilities.push({
        id: uid("cap"),
        setId,
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
  } else if (tgt.kind === "CAPABILITY_SET") {
    if (delta.op === "ADD") {
      t.capabilitySets.push({
        id: tgt.setId ?? uid("cs"),
        name: delta.newLabel ?? "New Capability Set",
        dimension: (tgt.dimension ?? "TECH"),
        era: new Date().getFullYear(),
        lifecycle: "EMERGING",
        source: "SIGNAL_DERIVED",
      });
    } else if (tgt.setId) {
      const i = t.capabilitySets.findIndex((s) => s.id === tgt.setId);
      if (i >= 0) {
        if (delta.op === "REMOVE") {
          t.capabilitySets.splice(i, 1);
          // also drop capabilities referencing this set
          t.capabilities = t.capabilities.filter((c) => c.setId !== tgt.setId);
        } else if (delta.op === "MIGRATE") {
          t.capabilitySets[i] = {
            ...t.capabilitySets[i],
            name: delta.newLabel ?? t.capabilitySets[i].name,
          };
        }
        // STRENGTHEN / WEAKEN on a set are interpreted by the engine as
        // shifts in lifecycle, but we don't auto-mutate lifecycle here.
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
    capabilitySets: t.capabilitySets.map((s) => ({ ...s })),
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
  if (t.kind === "CAPABILITY_SET") {
    // Treat a new set as a PRODUCT/TALENT move depending on dimension; default
    // to PRODUCT (it reads naturally as "new capability area").
    switch (t.dimension) {
      case "PEOPLE": return "TALENT";
      case "ORG": return "CAPITAL";
      case "PROCESSES": return "REGULATORY";
      case "TECH":
      default:
        return "PRODUCT";
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
