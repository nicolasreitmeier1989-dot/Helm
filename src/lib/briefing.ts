// HELM — briefing payload helpers. The /briefing page reads the active
// simulation from sessionStorage (set by the main page right before opening
// the print view).
//
// Phase 4.5: the optional WFCContext is stashed alongside the simulation so
// the briefing page can render the AI-Native Threat Assessment section.

import type { Simulation } from "./types";
import type { WFCContext } from "./store";

const KEY = "helm:briefing:v1";

export interface BriefingPayload {
  sim: Simulation;
  wfc?: WFCContext;
}

export function stashBriefing(sim: Simulation, wfc?: WFCContext): void {
  if (typeof window === "undefined") return;
  const payload: BriefingPayload = { sim, wfc };
  window.sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadBriefing(): Simulation | null {
  const p = loadBriefingPayload();
  return p ? p.sim : null;
}

export function loadBriefingPayload(): BriefingPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BriefingPayload | Simulation;
    // Back-compat: older entries stored a bare Simulation. Detect by shape.
    if ((parsed as BriefingPayload).sim) {
      return parsed as BriefingPayload;
    }
    return { sim: parsed as Simulation };
  } catch {
    return null;
  }
}
