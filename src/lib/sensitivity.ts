// HELM — sensitivity sweep. Always uses the local heuristic engine, even when
// the main simulation runs via Claude — otherwise a single slider drag would
// trigger 20+ API calls. The heuristic shares the same scoring inputs, so
// directional reads transfer.

import { simulate, threatIndex } from "./engine";
import type {
  CompetitorProfile,
  OwnProfile,
  Posture,
  Scenario,
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

export function sensitivitySweep(
  competitor: CompetitorProfile,
  own: OwnProfile,
  scenarios: Scenario[],
): SensitivityReport {
  // Use a stable seed so the baseline doesn't fluctuate between sweeps.
  const seed = `sens|${competitor.name}|${own.openingMove}`;
  const baselineSim = simulate(competitor, own, scenarios, { seed });
  const baseline = threatIndex(baselineSim);

  const variant = (mod: Partial<CompetitorProfile>) => {
    const c: CompetitorProfile = { ...competitor, ...mod };
    const sim = simulate(c, own, scenarios, { seed });
    return threatIndex(sim);
  };

  const rows: SensitivityRow[] = [];

  // Posture variations (skip current posture).
  for (const p of POSTURES) {
    if (p === competitor.posture) continue;
    const v = variant({ posture: p });
    rows.push({ label: `Posture → ${p}`, delta: v - baseline, variant: v });
  }

  // War chest swings.
  const wc = competitor.warChest;
  rows.push({
    label: `Kriegskasse −20`,
    delta: variant({ warChest: Math.max(0, wc - 20) }) - baseline,
    variant: variant({ warChest: Math.max(0, wc - 20) }),
  });
  rows.push({
    label: `Kriegskasse +20`,
    delta: variant({ warChest: Math.min(100, wc + 20) }) - baseline,
    variant: variant({ warChest: Math.min(100, wc + 20) }),
  });

  // Innovation swings.
  const ix = competitor.innovationIndex;
  rows.push({
    label: `Innovation −20`,
    delta: variant({ innovationIndex: Math.max(0, ix - 20) }) - baseline,
    variant: variant({ innovationIndex: Math.max(0, ix - 20) }),
  });
  rows.push({
    label: `Innovation +20`,
    delta: variant({ innovationIndex: Math.min(100, ix + 20) }) - baseline,
    variant: variant({ innovationIndex: Math.min(100, ix + 20) }),
  });

  // Brand swings.
  const bp = competitor.brandPower;
  rows.push({
    label: `Marke −20`,
    delta: variant({ brandPower: Math.max(0, bp - 20) }) - baseline,
    variant: variant({ brandPower: Math.max(0, bp - 20) }),
  });
  rows.push({
    label: `Marke +20`,
    delta: variant({ brandPower: Math.min(100, bp + 20) }) - baseline,
    variant: variant({ brandPower: Math.min(100, bp + 20) }),
  });

  // Sort by absolute impact, descending.
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { baseline, rows };
}
