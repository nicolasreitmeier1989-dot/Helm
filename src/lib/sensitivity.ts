// HELM — sensitivity sweep. Always uses the local heuristic engine, even when
// the main simulation runs via Claude — otherwise a single slider drag would
// trigger 20+ API calls. The heuristic shares the same scoring inputs so
// directional reads transfer.
//
// v0.3: expanded to sweep over topology variables as well. The new dimensions
// are:
//   - one capability LEVEL ±20 across our top-3 capabilities by importance
//   - one of opponent's key BMC block strengths ±20 (top-3 by current
//     strength × kind-weight)

import { simulate, threatIndex } from "./engine";
import type {
  BMCBlock,
  Capability,
  CompetitorProfile,
  OwnProfile,
  Posture,
  Scenario,
  StrategicTopology,
} from "./types";

export interface SensitivityRow {
  label: string;
  delta: number; // baseline → variant threat index delta
  variant: number; // absolute variant threat index
}

export interface SensitivityReport {
  baseline: number;
  rows: SensitivityRow[];
}

const POSTURES: Posture[] = [
  "AGGRESSIVE",
  "EXPANSIVE",
  "DEFENSIVE",
  "OPPORTUNISTIC",
  "CONSERVATIVE",
];

function clampNum(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
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

export function sensitivitySweep(
  competitor: CompetitorProfile,
  own: OwnProfile,
  scenarios: Scenario[],
): SensitivityReport {
  const seed = `sens|${competitor.name}|${own.openingMove}`;
  const baselineSim = simulate(competitor, own, scenarios, { seed });
  const baseline = threatIndex(baselineSim);

  const variantWithComp = (mod: Partial<CompetitorProfile>) => {
    const c: CompetitorProfile = { ...competitor, ...mod };
    const sim = simulate(c, own, scenarios, { seed });
    return threatIndex(sim);
  };

  const variantWithTopology = (
    side: "OWN" | "OPP",
    next: StrategicTopology,
  ) => {
    if (side === "OWN") {
      const sim = simulate(
        competitor,
        { ...own, topology: next },
        scenarios,
        { seed },
      );
      return threatIndex(sim);
    }
    const sim = simulate(
      { ...competitor, topology: next },
      own,
      scenarios,
      { seed },
    );
    return threatIndex(sim);
  };

  const rows: SensitivityRow[] = [];

  // ---- Posture variations (skip current) ----
  for (const p of POSTURES) {
    if (p === competitor.posture) continue;
    const v = variantWithComp({ posture: p });
    rows.push({ label: `Posture → ${p}`, delta: v - baseline, variant: v });
  }

  // ---- Legacy summary signals ----
  const wc = competitor.warChest;
  const vmWcMinus = variantWithComp({ warChest: Math.max(0, wc - 20) });
  const vmWcPlus = variantWithComp({ warChest: Math.min(100, wc + 20) });
  rows.push({ label: `Kriegskasse −20`, delta: vmWcMinus - baseline, variant: vmWcMinus });
  rows.push({ label: `Kriegskasse +20`, delta: vmWcPlus - baseline, variant: vmWcPlus });

  const ix = competitor.innovationIndex;
  const vmIxMinus = variantWithComp({ innovationIndex: Math.max(0, ix - 20) });
  const vmIxPlus = variantWithComp({ innovationIndex: Math.min(100, ix + 20) });
  rows.push({ label: `Innovation −20`, delta: vmIxMinus - baseline, variant: vmIxMinus });
  rows.push({ label: `Innovation +20`, delta: vmIxPlus - baseline, variant: vmIxPlus });

  const bp = competitor.brandPower;
  const vmBpMinus = variantWithComp({ brandPower: Math.max(0, bp - 20) });
  const vmBpPlus = variantWithComp({ brandPower: Math.min(100, bp + 20) });
  rows.push({ label: `Marke −20`, delta: vmBpMinus - baseline, variant: vmBpMinus });
  rows.push({ label: `Marke +20`, delta: vmBpPlus - baseline, variant: vmBpPlus });

  // ---- Topology: vary OUR top-3 capabilities by importance, level ±20 ----
  const ourTopCaps: Capability[] = [...own.topology.capabilities]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);
  for (const cap of ourTopCaps) {
    const upTop = cloneTopology(own.topology);
    const downTop = cloneTopology(own.topology);
    const upCap = upTop.capabilities.find((c) => c.id === cap.id);
    const dnCap = downTop.capabilities.find((c) => c.id === cap.id);
    if (upCap) upCap.level = clampNum(upCap.level + 20);
    if (dnCap) dnCap.level = clampNum(dnCap.level - 20);
    const vUp = variantWithTopology("OWN", upTop);
    const vDn = variantWithTopology("OWN", downTop);
    rows.push({
      label: `Cap «${shortLabel(cap.label)}» +20`,
      delta: vUp - baseline,
      variant: vUp,
    });
    rows.push({
      label: `Cap «${shortLabel(cap.label)}» −20`,
      delta: vDn - baseline,
      variant: vDn,
    });
  }

  // ---- Topology: vary OPP top-3 BMC block strengths ±20 ----
  // We weight customer segments and value propositions higher when picking.
  const kindWeight: Partial<Record<BMCBlock["kind"], number>> = {
    CUSTOMER_SEGMENTS: 3.0,
    VALUE_PROPOSITIONS: 2.0,
    KEY_RESOURCES: 1.8,
    CHANNELS: 1.5,
    KEY_PARTNERS: 1.2,
  };
  const oppTopBlocks: BMCBlock[] = [...competitor.topology.bmc.blocks]
    .sort(
      (a, b) =>
        b.strength * (kindWeight[b.kind] ?? 1.0) -
        a.strength * (kindWeight[a.kind] ?? 1.0),
    )
    .slice(0, 3);
  for (const blk of oppTopBlocks) {
    const upTop = cloneTopology(competitor.topology);
    const dnTop = cloneTopology(competitor.topology);
    const upBlk = upTop.bmc.blocks.find((b) => b.id === blk.id);
    const dnBlk = dnTop.bmc.blocks.find((b) => b.id === blk.id);
    if (upBlk) upBlk.strength = clampNum(upBlk.strength + 20);
    if (dnBlk) dnBlk.strength = clampNum(dnBlk.strength - 20);
    const vUp = variantWithTopology("OPP", upTop);
    const vDn = variantWithTopology("OPP", dnTop);
    rows.push({
      label: `BMC «${shortLabel(blk.label)}» +20`,
      delta: vUp - baseline,
      variant: vUp,
    });
    rows.push({
      label: `BMC «${shortLabel(blk.label)}» −20`,
      delta: vDn - baseline,
      variant: vDn,
    });
  }

  // Sort by absolute impact, descending.
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { baseline, rows };
}

function shortLabel(s: string): string {
  return s.length > 24 ? s.slice(0, 22) + "…" : s;
}
