// WFC — trigger state machine + Bayesian trajectory inference.
//
// A Trigger is a watchpoint over an Indicator attached to an OPPONENT MoveNode.
// When an analyst observes evidence in the wild (a press release, a filing,
// a hire), they "fire" the trigger. Fired triggers reweight the posterior
// probability of each scenario-root path in the move tree, surfacing the
// trajectories the world has actually started executing.

import type {
  Indicator,
  MoveNode,
  Simulation,
  Trigger,
  TriggerState,
} from "./types";

const STORE_KEY = "wfc:triggers:v1";

interface TriggerStore {
  triggers: Record<string, Trigger>; // id → trigger
}

function emptyStore(): TriggerStore {
  return { triggers: {} };
}

export function loadTriggerStore(): TriggerStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as TriggerStore;
    if (parsed && parsed.triggers && typeof parsed.triggers === "object") {
      return parsed;
    }
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveTriggerStore(store: TriggerStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ---------- CRUD ----------

function nextId(): string {
  return `trg_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function listTriggers(): Trigger[] {
  return Object.values(loadTriggerStore().triggers);
}

export function listTriggersForSimulation(simulationId: string): Trigger[] {
  return listTriggers().filter((t) => t.simulationId === simulationId);
}

export function getTrigger(id: string): Trigger | undefined {
  return loadTriggerStore().triggers[id];
}

export function upsertTrigger(t: Trigger): void {
  const store = loadTriggerStore();
  store.triggers[t.id] = t;
  saveTriggerStore(store);
}

export function deleteTrigger(id: string): void {
  const store = loadTriggerStore();
  delete store.triggers[id];
  saveTriggerStore(store);
}

/**
 * Arm one trigger per (opponent-node × indicator) for the given simulation,
 * unless a trigger for that pair already exists. Idempotent.
 */
export function armTriggersForSimulation(sim: Simulation): Trigger[] {
  const store = loadTriggerStore();
  const existing = Object.values(store.triggers).filter(
    (t) => t.simulationId === sim.id,
  );
  const seen = new Set(existing.map((t) => `${t.nodeId}|${t.indicatorId}`));

  for (const id in sim.nodes) {
    const node = sim.nodes[id];
    if (node.actor !== "OPPONENT") continue;
    for (const ind of node.indicators ?? []) {
      const key = `${node.id}|${ind.id}`;
      if (seen.has(key)) continue;
      const trg: Trigger = {
        id: nextId(),
        indicatorId: ind.id,
        nodeId: node.id,
        simulationId: sim.id,
        state: "ARMED",
      };
      store.triggers[trg.id] = trg;
      seen.add(key);
    }
  }
  saveTriggerStore(store);
  return Object.values(store.triggers).filter((t) => t.simulationId === sim.id);
}

export function fireTrigger(
  id: string,
  evidence?: { url?: string; note?: string },
): Trigger | null {
  const store = loadTriggerStore();
  const t = store.triggers[id];
  if (!t) return null;
  t.state = "FIRED";
  t.firedAt = new Date().toISOString();
  if (evidence?.url) t.evidenceUrl = evidence.url;
  if (evidence?.note) t.evidenceNote = evidence.note;
  store.triggers[id] = t;
  saveTriggerStore(store);
  return t;
}

export function ackTrigger(id: string): Trigger | null {
  const store = loadTriggerStore();
  const t = store.triggers[id];
  if (!t) return null;
  t.state = "ACK";
  t.acknowledgedAt = new Date().toISOString();
  store.triggers[id] = t;
  saveTriggerStore(store);
  return t;
}

export function dismissTrigger(id: string): Trigger | null {
  const store = loadTriggerStore();
  const t = store.triggers[id];
  if (!t) return null;
  t.state = "DISMISSED";
  store.triggers[id] = t;
  saveTriggerStore(store);
  return t;
}

export function resetTrigger(id: string): Trigger | null {
  const store = loadTriggerStore();
  const t = store.triggers[id];
  if (!t) return null;
  t.state = "ARMED";
  delete t.firedAt;
  delete t.acknowledgedAt;
  delete t.evidenceUrl;
  delete t.evidenceNote;
  store.triggers[id] = t;
  saveTriggerStore(store);
  return t;
}

// ---------- Trajectory inference ----------

export interface TrajectoryPath {
  ids: string[]; // node ids from root to leaf
  prior: number; // baseline product of conditional probabilities
  posterior: number; // normalized over the sim's paths
  scenarioLabel: string;
  scenarioIdx: number;
  endingTitle: string;
  fired: number; // count of fired triggers on this path
  dormant: number; // count of armed triggers on this path
}

export interface TrajectoryInference {
  paths: TrajectoryPath[];        // sorted desc by posterior
  totalFired: number;
  confidence: "LOW" | "MED" | "HIGH";
}

interface TriggerLookup {
  byNode: Record<string, Trigger[]>; // nodeId → triggers
  byIndicator: Record<string, Trigger>; // indicatorId → trigger
}

function indexTriggers(triggers: Trigger[]): TriggerLookup {
  const byNode: Record<string, Trigger[]> = {};
  const byIndicator: Record<string, Trigger> = {};
  for (const t of triggers) {
    (byNode[t.nodeId] ||= []).push(t);
    byIndicator[t.indicatorId] = t;
  }
  return { byNode, byIndicator };
}

function enumeratePaths(sim: Simulation): {
  ids: string[];
  prior: number;
  scenarioIdx: number;
  scenarioLabel: string;
}[] {
  const out: {
    ids: string[];
    prior: number;
    scenarioIdx: number;
    scenarioLabel: string;
  }[] = [];

  const walk = (
    id: string,
    trail: string[],
    scenarioIdx: number,
    scenarioLabel: string,
  ) => {
    const n = sim.nodes[id];
    const t = trail.concat(id);
    if (n.children.length === 0) {
      out.push({
        ids: t,
        prior: n.cumulativeProbability,
        scenarioIdx,
        scenarioLabel,
      });
      return;
    }
    for (const c of n.children) walk(c, t, scenarioIdx, scenarioLabel);
  };

  sim.rootIds.forEach((rid, i) => {
    const scen = sim.scenarios[i];
    walk(rid, [], i, scen?.label ?? `Szenario ${i + 1}`);
  });

  return out;
}

/**
 * Bayesian-style update of path posteriors given fired triggers.
 *
 * For each path:
 *   posterior ∝ prior × ∏ over opponent-node indicators on the path:
 *     - if its trigger is FIRED or ACK: × (1 + indicator.weight × 3)
 *     - if its trigger is ARMED (dormant evidence): × (1 - indicator.weight × 0.15)
 *     - if its trigger is DISMISSED:               × (1 - indicator.weight × 0.5)
 *     - if no trigger exists or FIRING transient:  no change
 *
 * Normalized so posteriors sum to 1 across all enumerated paths. This is a
 * simple, transparent rule — not a full graphical model — but it gives the
 * desired behavior: fired triggers lift their paths, dismissed ones depress
 * them, and unrealized expected signals slightly dampen their parent path.
 */
export function inferCurrentTrajectory(
  sim: Simulation,
  triggers: Trigger[],
): TrajectoryInference {
  const lookup = indexTriggers(
    triggers.filter((t) => t.simulationId === sim.id),
  );
  const paths = enumeratePaths(sim);

  let totalFired = 0;
  const scored = paths.map((p) => {
    let mult = 1;
    let fired = 0;
    let dormant = 0;

    for (const nodeId of p.ids) {
      const node: MoveNode = sim.nodes[nodeId];
      if (node.actor !== "OPPONENT") continue;
      const indicators: Indicator[] = node.indicators ?? [];
      for (const ind of indicators) {
        const trg = lookup.byIndicator[ind.id];
        if (!trg) continue;
        if (trg.state === "FIRED" || trg.state === "ACK") {
          mult *= 1 + ind.weight * 3;
          fired++;
        } else if (trg.state === "ARMED") {
          mult *= 1 - ind.weight * 0.15;
          dormant++;
        } else if (trg.state === "DISMISSED") {
          mult *= 1 - ind.weight * 0.5;
        }
        // FIRING is transient; ignore.
      }
    }
    return {
      ...p,
      raw: Math.max(1e-9, p.prior * mult),
      fired,
      dormant,
    };
  });

  totalFired = scored.reduce((s, x) => s + x.fired, 0);
  const norm = scored.reduce((s, x) => s + x.raw, 0) || 1;

  const out: TrajectoryPath[] = scored
    .map((s) => ({
      ids: s.ids,
      prior: s.prior,
      posterior: s.raw / norm,
      scenarioIdx: s.scenarioIdx,
      scenarioLabel: s.scenarioLabel,
      endingTitle: sim.nodes[s.ids[s.ids.length - 1]]?.title ?? "—",
      fired: s.fired,
      dormant: s.dormant,
    }))
    .sort((a, b) => b.posterior - a.posterior);

  // Confidence: how concentrated is the posterior?
  // We use a simple Herfindahl-style concentration index.
  const hhi = out.reduce((s, p) => s + p.posterior * p.posterior, 0);
  const confidence: "LOW" | "MED" | "HIGH" =
    totalFired === 0 ? "LOW" : hhi > 0.35 ? "HIGH" : hhi > 0.15 ? "MED" : "LOW";

  return { paths: out, totalFired, confidence };
}

// ---------- Aggregate stats ----------

export function countTriggersByState(
  triggers: Trigger[],
): Record<TriggerState, number> {
  const acc: Record<TriggerState, number> = {
    ARMED: 0,
    FIRING: 0,
    FIRED: 0,
    ACK: 0,
    DISMISSED: 0,
  };
  for (const t of triggers) acc[t.state]++;
  return acc;
}

export function firedInLastDays(triggers: Trigger[], days: number): number {
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  return triggers.filter((t) => {
    if (t.state !== "FIRED" && t.state !== "ACK") return false;
    if (!t.firedAt) return false;
    return new Date(t.firedAt).getTime() >= cutoff;
  }).length;
}
