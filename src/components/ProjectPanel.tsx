"use client";

import { useEffect, useState } from "react";
import {
  appendVersion,
  deleteProject,
  loadStore,
  type Project,
  saveStore,
  upsertProject,
} from "@/lib/store";
import type {
  CompetitorProfile,
  OwnProfile,
  Scenario,
  Simulation,
} from "@/lib/types";
import { Card, Label } from "./Chrome";
import { threatIndex } from "@/lib/engine";

export function ProjectPanel({
  competitor,
  own,
  scenarios,
  sim,
  backend,
  onLoad,
}: {
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
  sim: Simulation;
  backend: "HEURISTIC" | "CLAUDE";
  onLoad: (p: {
    competitor: CompetitorProfile;
    own: OwnProfile;
    scenarios: Scenario[];
  }) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const s = loadStore();
    setProjects(s.projects);
    setActiveId(s.activeProjectId);
  }, []);

  const refresh = () => {
    const s = loadStore();
    setProjects(s.projects);
    setActiveId(s.activeProjectId);
  };

  const handleSave = () => {
    const name = prompt(
      "Projektname:",
      `${competitor.name} vs ${own.name}`,
    );
    if (!name) return;
    const store = loadStore();
    const idx = projects.findIndex((p) => p.name === name);
    const tIdx = threatIndex(sim);
    if (idx >= 0) {
      const next = appendVersion(store, projects[idx].id, {
        label: new Date().toLocaleString("de-DE"),
        threatIndex: tIdx,
        inputs: { competitor, own, scenarios },
        backend,
      });
      saveStore(next);
    } else {
      const now = new Date().toISOString();
      const project: Project = {
        id: `prj_${Date.now().toString(36)}`,
        name,
        createdAt: now,
        updatedAt: now,
        competitor,
        own,
        scenarios,
        versions: [
          {
            id: `ver_${Date.now().toString(36)}`,
            createdAt: now,
            label: "Initial",
            threatIndex: tIdx,
            inputs: { competitor, own, scenarios },
            backend,
          },
        ],
      };
      const next = upsertProject(store, project);
      saveStore({ ...next, activeProjectId: project.id });
    }
    refresh();
  };

  const handleLoadVersion = (p: Project, vId: string) => {
    const v = p.versions.find((x) => x.id === vId);
    if (!v) return;
    onLoad(v.inputs);
    const store = loadStore();
    saveStore({ ...store, activeProjectId: p.id });
    setActiveId(p.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Projekt wirklich löschen?")) return;
    const store = loadStore();
    saveStore(deleteProject(store, id));
    refresh();
  };

  return (
    <Card title="PROJECTS // HISTORY" meta={`${projects.length} GESPEICHERT`}>
      <button
        onClick={handleSave}
        className="w-full font-mono text-[10px] tracking-widest border border-ink-900 px-3 py-2 mb-3 hover:bg-ink-900 hover:text-ink-0 transition-colors"
      >
        ⤓ AKTUELLE KONFIG ALS VERSION SPEICHERN
      </button>

      {projects.length === 0 ? (
        <div className="font-mono text-[10px] text-ink-500 leading-relaxed">
          Noch keine gespeicherten Projekte. Konfigurationen können hier mit
          Versionshistorie persistiert werden.
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className={`border ${activeId === p.id ? "border-ink-900" : "border-ink-400"} p-2`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-ink-900 truncate">
                  {p.name}
                </span>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="font-mono text-[10px] text-ink-500 hover:text-ink-1000"
                  aria-label="delete project"
                >
                  ✕
                </button>
              </div>
              <div className="font-mono text-[9px] text-ink-500 mt-0.5 tracking-wider">
                {p.versions.length} VERSIONEN ·{" "}
                {new Date(p.updatedAt).toLocaleDateString("de-DE")}
              </div>
              <div className="mt-1.5 space-y-0.5 max-h-24 overflow-y-auto">
                {p.versions.slice(0, 6).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleLoadVersion(p, v.id)}
                    className="w-full text-left font-mono text-[10px] tracking-wider text-ink-700 hover:text-ink-1000 hover:bg-ink-200/60 px-1 py-0.5 flex items-center justify-between"
                  >
                    <span className="truncate">
                      › {v.label}
                    </span>
                    <span className="text-ink-500">
                      {v.backend === "CLAUDE" ? "C" : "H"} · T={v.threatIndex}
                    </span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
