// HELM — briefing payload helpers. The /briefing page reads the active
// simulation from sessionStorage (set by the main page right before opening
// the print view).

import type { Simulation } from "./types";

const KEY = "helm:briefing:v1";

export function stashBriefing(sim: Simulation): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(sim));
}

export function loadBriefing(): Simulation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Simulation;
  } catch {
    return null;
  }
}
