"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Stat, TopBar } from "@/components/Chrome";
import {
  CompetitorPanel,
  OwnPanel,
  ScenarioPanel,
} from "@/components/Controls";
import { MoveTree } from "@/components/MoveTree";
import { NodeDetail, PathPanel, ThreatPanel } from "@/components/Inspector";
import { simulate, threatIndex } from "@/lib/engine";
import {
  DEFAULT_COMPETITOR,
  DEFAULT_OWN,
  DEFAULT_SCENARIOS,
} from "@/lib/presets";

export default function HelmPage() {
  const [competitor, setCompetitor] = useState(DEFAULT_COMPETITOR);
  const [own, setOwn] = useState(DEFAULT_OWN);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [seedNonce, setSeedNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("--------");

  useEffect(() => {
    // Stable but per-mount session id
    const id = Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    setSessionId(id);
  }, []);

  const sim = useMemo(
    () => simulate(competitor, own, scenarios, { seed: `${seedNonce}|${competitor.name}|${own.openingMove}` }),
    [competitor, own, scenarios, seedNonce],
  );

  const idx = threatIndex(sim);

  return (
    <main className="min-h-screen bg-ink-0 text-ink-900">
      <TopBar sessionId={sessionId} />

      {/* Mission strip */}
      <section className="border-b border-ink-300/60 bg-ink-50">
        <div className="px-6 py-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-ink-500">
              MISSION // ADVERSARIAL SIMULATION
            </div>
            <h1 className="font-display text-2xl md:text-[28px] tracking-tight text-ink-950 leading-tight mt-1">
              Antizipiere {own.horizonRounds} Züge gegen{" "}
              <span className="text-ink-700">{competitor.name}</span>
              <span className="text-ink-500"> //</span>{" "}
              <span className="text-ink-700">{scenarios.length} Rollouts</span>
            </h1>
            <div className="font-mono text-[11px] text-ink-600 mt-2 max-w-2xl">{own.intent}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[300px]">
            <Stat label="THREAT" value={`${idx}`} hint="0..100" />
            <Stat label="HORIZON" value={`${own.horizonRounds}T`} hint="Runden" />
            <Stat label="ROLLOUTS" value={scenarios.length} hint="Szenarien" />
          </div>
        </div>
        <div className="px-6 pb-4 flex items-center gap-3">
          <button
            onClick={() => setSeedNonce((n) => n + 1)}
            className="font-mono text-[10px] tracking-widest border border-ink-700 px-3 py-1.5 hover:bg-ink-900 hover:text-ink-0 transition-colors"
          >
            ↻ RE-ROLL TREE
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify(sim, null, 2);
              navigator.clipboard?.writeText(data);
            }}
            className="font-mono text-[10px] tracking-widest border border-ink-300/60 text-ink-700 px-3 py-1.5 hover:border-ink-700 hover:text-ink-900 transition-colors"
          >
            ⇣ COPY SIMULATION JSON
          </button>
          <span className="font-mono text-[10px] tracking-widest text-ink-500 ml-auto">
            SEED // {seedNonce.toString(16).padStart(4, "0").toUpperCase()}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr_360px] gap-px bg-ink-300/40">
        {/* LEFT: inputs */}
        <aside className="bg-ink-0 p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto xl:sticky xl:top-12">
          <OwnPanel own={own} onChange={setOwn} />
          <CompetitorPanel competitor={competitor} onChange={setCompetitor} />
          <ScenarioPanel scenarios={scenarios} onChange={setScenarios} />
        </aside>

        {/* CENTER: tree */}
        <section className="bg-ink-0 p-4 space-y-4">
          <Card title="MOVE TREE // ROLLOUT" meta={`${Object.keys(sim.nodes).length} NODES · ${sim.rootIds.length} ROOTS`}>
            <MoveTree sim={sim} selectedId={selectedId} onSelect={setSelectedId} />
            <Legend />
          </Card>
          <PathPanel sim={sim} onSelect={setSelectedId} />
        </section>

        {/* RIGHT: analysis */}
        <aside className="bg-ink-0 p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto xl:sticky xl:top-12">
          <ThreatPanel sim={sim} />
          <NodeDetail sim={sim} nodeId={selectedId} />
        </aside>
      </div>

      <footer className="border-t border-ink-300/60 bg-ink-50 px-6 py-3 flex items-center justify-between text-[10px] font-mono tracking-widest text-ink-500">
        <span>HELM // ADVERSARIAL STRATEGY SIMULATION ENGINE</span>
        <span>OBSERVE · ORIENT · DECIDE · ACT</span>
        <span>© 2026 // ALL ROLLOUTS ARE HYPOTHETICAL</span>
      </footer>
    </main>
  );
}

function Legend() {
  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono tracking-wider text-ink-600">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-ink-900" />
        ⌖ OPPONENT MOVE
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 border border-ink-700" />
        ◇ OUR RESPONSE
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-6 h-px bg-ink-700" />
        EDGE = CONDITIONAL P
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-ink-0 border border-ink-900" />
        BAR = CUMULATIVE P
      </div>
    </div>
  );
}
