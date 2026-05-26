// HELM — client-side persistence (localStorage). Projects + version history.
//
// v0.3 bumps the store key to v2 because OwnProfile/CompetitorProfile now
// carry full StrategicTopology + Rumelt-kernel fields. Loading from a legacy
// v1 store is best-effort: project names are preserved so the user sees them,
// but topology-less projects are dropped (we cannot reconstruct a topology
// from posture/warChest alone).

import type {
  CompetitorProfile,
  OwnProfile,
  Scenario,
  Simulation,
} from "./types";

const STORE_KEY = "helm:projects:v2";
const LEGACY_STORE_KEY = "helm:projects:v1";

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

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
  versions: ProjectVersion[];
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
      if (parsed && Array.isArray(parsed.projects)) return parsed;
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
            "[HELM] Detected legacy v1 store with",
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
      name: "HELM CORP",
      intent: "",
      diagnosis: "",
      guidingPolicy: "",
      openingMove: "",
      horizonRounds: 4,
      branchingFactor: 3,
      topology: { capabilities: [], bmc: { blocks: [] }, vpcs: [] },
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
