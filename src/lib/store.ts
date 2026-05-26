// WFC — client-side persistence (localStorage). Projects + version history.
//
// v0.3 bumps the store key to v2 because OwnProfile/CompetitorProfile now
// carry full StrategicTopology + Rumelt-kernel fields. Loading from a legacy
// v1 store is best-effort: project names are preserved so the user sees them,
// but topology-less projects are dropped (we cannot reconstruct a topology
// from posture/warChest alone).

import type {
  Capability,
  CapabilityDimension,
  CapabilitySet,
  CompetitorProfile,
  OwnProfile,
  Scenario,
  Simulation,
  StrategicTopology,
} from "./types";

const STORE_KEY = "wfc:projects:v2";
const LEGACY_STORE_KEY = "wfc:projects:v1";

// ---------- v0.3F migration: legacy capabilities (flat list, dimension on
// the capability) → set-based topology with Legacy sets per dimension. ----

let legacyMigrationWarned = false;

function migrateTopology(topology: unknown): StrategicTopology {
  const t = (topology ?? {}) as Partial<StrategicTopology> & {
    capabilities?: (Capability & { dimension?: CapabilityDimension })[];
  };
  const out: StrategicTopology = {
    capabilitySets: Array.isArray(t.capabilitySets) ? [...t.capabilitySets] : [],
    capabilities: Array.isArray(t.capabilities)
      ? t.capabilities.map((c) => ({ ...c }))
      : [],
    bmc: t.bmc && Array.isArray(t.bmc.blocks)
      ? { blocks: t.bmc.blocks.map((b) => ({ ...b })) }
      : { blocks: [] },
    vpcs: Array.isArray(t.vpcs) ? t.vpcs.map((v) => ({ ...v })) : [],
  };

  // Check if any capability lacks setId — these are legacy.
  const orphaned = out.capabilities.filter(
    (c) => !c.setId && (c as { dimension?: CapabilityDimension }).dimension,
  ) as (Capability & { dimension?: CapabilityDimension })[];

  if (orphaned.length === 0) return out;

  if (!legacyMigrationWarned) {
    // eslint-disable-next-line no-console
    console.warn(
      "[WFC] Legacy topology detected (capabilities without setId). Migrating to Legacy CapabilitySets.",
    );
    legacyMigrationWarned = true;
  }

  // Group by dimension and create Legacy sets where missing.
  const dims: CapabilityDimension[] = ["PEOPLE", "TECH", "ORG", "PROCESSES"];
  const legacySetByDim: Partial<Record<CapabilityDimension, CapabilitySet>> = {};
  for (const dim of dims) {
    const hasOrphans = orphaned.some((c) => c.dimension === dim);
    if (!hasOrphans) continue;
    let existing = out.capabilitySets.find(
      (s) => s.dimension === dim && s.source === "CUSTOM" && /legacy/i.test(s.name),
    );
    if (!existing) {
      existing = {
        id: `cs-legacy-${dim.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `Legacy ${dim}`,
        dimension: dim,
        era: new Date().getFullYear(),
        lifecycle: "MATURE",
        source: "CUSTOM",
        description: "Auto-migriert aus v0.3-Topologie ohne Capability-Set-Schicht.",
      };
      out.capabilitySets.push(existing);
    }
    legacySetByDim[dim] = existing;
  }
  out.capabilities = out.capabilities.map((c) => {
    const dim = (c as { dimension?: CapabilityDimension }).dimension;
    if (c.setId) return c;
    if (!dim) return c;
    const set = legacySetByDim[dim];
    if (!set) return c;
    const { dimension: _legacyDim, ...rest } = c as Capability & { dimension?: CapabilityDimension };
    void _legacyDim;
    return { ...rest, setId: set.id };
  });
  return out;
}

export interface ProjectVersion {
  id: string;
  createdAt: string;
  label: string;
  threatIndex: number;
  inputs: {
    competitor: CompetitorProfile;
    own: OwnProfile;
    scenarios: Scenario[];
  };
  backend: "HEURISTIC" | "CLAUDE";
}

// WFC = Worst Feared (AI-native) Competitor. Phase 4.5 onboarding mode.
// Stored alongside the standard project fields so the briefing page can
// detect it and render an additional "AI-Native Threat Assessment"
// section. Optional — Quick/Deep projects don't set it.
export type WFCPatternId =
  | "COGNITIVE_ARBITRAGE"
  | "WORKFLOW_COLLAPSE"
  | "SELF_SERVICE_ABSORPTION"
  | "PERSONALIZATION_UNIT_OF_ONE"
  | "VERTICAL_AGENT_STACK"
  | "COST_FLOOR_RESET"
  | "DATA_FLYWHEEL_CAPTURE";

export type WFCStanceId =
  | "HARDEN_HUMAN"
  | "ACQUIRE_DISRUPTOR"
  | "CARVE_OUT_PNL"
  | "VERTICALIZE_DOWN"
  | "PICKS_AND_SHOVELS"
  | "MARGIN_MIGRATION"
  | "GRACEFUL_HARVEST";

export interface WFCContext {
  patternId: WFCPatternId;
  stanceId: WFCStanceId;
  fearParagraphs: { workflow: string; pricing: string; flywheel: string };
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
  versions: ProjectVersion[];
  wfc?: WFCContext;
}

interface Store {
  projects: Project[];
  activeProjectId: string | null;
}

function emptyStore(): Store {
  return { projects: [], activeProjectId: null };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed && Array.isArray(parsed.projects)) {
        // v0.3F migration: ensure each project's topologies use CapabilitySets.
        const migrated: Store = {
          ...parsed,
          projects: parsed.projects.map((p) => ({
            ...p,
            competitor: {
              ...p.competitor,
              topology: migrateTopology(p.competitor?.topology),
            },
            own: {
              ...p.own,
              topology: migrateTopology(p.own?.topology),
            },
          })),
        };
        return migrated;
      }
    }
    // Best-effort migration: detect legacy v1 entries.
    const legacy = window.localStorage.getItem(LEGACY_STORE_KEY);
    if (legacy) {
      try {
        const v1 = JSON.parse(legacy) as { projects?: { id: string; name: string }[] };
        if (v1?.projects?.length) {
          // We deliberately don't materialise v1 entries (they lack topology
          // and Rumelt fields). Drop them but log to console so the user
          // knows their project names existed.
          // eslint-disable-next-line no-console
          console.warn(
            "[WFC] Detected legacy v1 store with",
            v1.projects.length,
            "projects. v0.3 schema is not auto-migratable — please re-save.",
          );
        }
      } catch {
        /* ignore */
      }
    }
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createProject(name: string, p: Project["competitor"]): Project {
  const now = new Date().toISOString();
  return {
    id: newId("prj"),
    name,
    createdAt: now,
    updatedAt: now,
    competitor: p,
    own: {
      name: "WFC CORP",
      intent: "",
      diagnosis: "",
      guidingPolicy: "",
      openingMove: "",
      horizonRounds: 4,
      branchingFactor: 3,
      topology: { capabilitySets: [], capabilities: [], bmc: { blocks: [] }, vpcs: [] },
    },
    scenarios: [],
    versions: [],
  };
}

export function upsertProject(store: Store, project: Project): Store {
  const idx = store.projects.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: new Date().toISOString() };
  if (idx === -1) {
    return {
      ...store,
      projects: [...store.projects, updated],
      activeProjectId: updated.id,
    };
  }
  const next = store.projects.slice();
  next[idx] = updated;
  return { ...store, projects: next };
}

export function deleteProject(store: Store, projectId: string): Store {
  const projects = store.projects.filter((p) => p.id !== projectId);
  const activeProjectId =
    store.activeProjectId === projectId ? null : store.activeProjectId;
  return { projects, activeProjectId };
}

export function appendVersion(
  store: Store,
  projectId: string,
  v: Omit<ProjectVersion, "id" | "createdAt">,
): Store {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return store;
  const version: ProjectVersion = {
    ...v,
    id: newId("ver"),
    createdAt: new Date().toISOString(),
  };
  const updated: Project = {
    ...project,
    versions: [version, ...project.versions].slice(0, 50),
    updatedAt: new Date().toISOString(),
  };
  return upsertProject(store, updated);
}

// ---------- Active-project helpers (wizard / landing) ----------
//
// setActiveProject — points the store at one of its existing projects and
// persists. Caller may set null to clear. Does nothing if the id doesn't
// match any project.
//
// getActiveProject — returns the currently active project or null.

export function setActiveProject(projectId: string | null): void {
  const store = loadStore();
  if (projectId !== null && !store.projects.some((p) => p.id === projectId)) {
    return;
  }
  saveStore({ ...store, activeProjectId: projectId });
}

export function getActiveProject(): Project | null {
  const store = loadStore();
  if (!store.activeProjectId) return null;
  return store.projects.find((p) => p.id === store.activeProjectId) ?? null;
}

// saveActiveProject — convenience: upsert a project AND mark it active.
// Used by the wizard's final step before redirecting to /dashboard.

export function saveActiveProject(project: Project): Project {
  const store = loadStore();
  const next = upsertProject(store, project);
  saveStore({ ...next, activeProjectId: project.id });
  return project;
}

export function projectFromSimulation(
  name: string,
  sim: Simulation,
  backend: "HEURISTIC" | "CLAUDE",
  threatIndex: number,
): Project {
  const now = new Date().toISOString();
  return {
    id: newId("prj"),
    name,
    createdAt: now,
    updatedAt: now,
    competitor: sim.competitor,
    own: sim.own,
    scenarios: sim.scenarios,
    versions: [
      {
        id: newId("ver"),
        createdAt: now,
        label: "Initial",
        threatIndex,
        inputs: {
          competitor: sim.competitor,
          own: sim.own,
          scenarios: sim.scenarios,
        },
        backend,
      },
    ],
  };
}
