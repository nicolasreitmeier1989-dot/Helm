"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Stat, TopBar } from "@/components/Chrome";
import {
  OpponentSummary,
  OwnSummary,
  ScenarioPanel,
} from "@/components/Controls";
import { MoveTree } from "@/components/MoveTree";
import { NodeDetail, PathPanel, ThreatPanel } from "@/components/Inspector";
import { simulate, threatIndex } from "@/lib/engine";
import { stashBriefing } from "@/lib/briefing";
import {
  DEFAULT_COMPETITOR,
  DEFAULT_OWN,
  DEFAULT_SCENARIOS,
} from "@/lib/presets";
import { EngineToggle, type EngineMode } from "@/components/EngineToggle";
import { SensitivityPanel } from "@/components/SensitivityPanel";
import { ProjectPanel } from "@/components/ProjectPanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { TrajectoryTracker } from "@/components/TrajectoryTracker";
import { TopologyEditor } from "@/components/TopologyEditor";
import { RumeltKernel } from "@/components/RumeltKernel";
import { BMCComparison } from "@/components/BMCComparison";
import { VPCFitChart } from "@/components/VPCFitChart";
import {
  armTriggersForSimulation,
  listTriggersForSimulation,
} from "@/lib/triggers";
import type {
  CompetitorProfile,
  OwnProfile,
  Simulation,
  StrategicTopology,
  Trigger,
} from "@/lib/types";

export default function HelmPage() {
  const [competitor, setCompetitor] = useState<CompetitorProfile>(DEFAULT_COMPETITOR);
  const [own, setOwn] = useState<OwnProfile>(DEFAULT_OWN);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [seedNonce, setSeedNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("--------");
  const [engine, setEngine] = useState<EngineMode>("HEURISTIC");
  const [llmSim, setLlmSim] = useState<Simulation | null>(null);
  const [llmRunning, setLlmRunning] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [opsTab, setOpsTab] = useState<"WATCH" | "TRAJECTORY">("WATCH");
  const [topologySide, setTopologySide] = useState<"OWN" | "OPPONENT">("OWN");

  useEffect(() => {
    const id =
      Math.random().toString(36).slice(2, 8).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    setSessionId(id);
  }, []);

  const heuristicSim = useMemo(
    () =>
      simulate(competitor, own, scenarios, {
        seed: `${seedNonce}|${competitor.name}|${own.openingMove}`,
      }),
    [competitor, own, scenarios, seedNonce],
  );

  const sim = engine === "CLAUDE" && llmSim ? llmSim : heuristicSim;
  const idx = threatIndex(sim);

  useEffect(() => {
    armTriggersForSimulation(sim);
    setTriggers(listTriggersForSimulation(sim.id));
  }, [sim]);

  const refreshTriggers = () => {
    setTriggers(listTriggersForSimulation(sim.id));
  };

  const runClaude = async () => {
    setLlmRunning(true);
    setLlmError(null);
    try {
      const resp = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor, own, scenarios }),
      });
      if (!resp.ok) {
        const data = (await resp.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(data.message || data.error || `HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as { simulation: Simulation };
      setLlmSim(data.simulation);
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLlmRunning(false);
    }
  };

  useEffect(() => {
    if (engine === "CLAUDE" && !llmSim && !llmRunning && !llmError) {
      void runClaude();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const handleOpenBriefing = () => {
    stashBriefing(sim);
    window.open("/briefing", "_blank", "noopener,noreferrer");
  };

  const handleLoadProject = (p: {
    competitor: typeof competitor;
    own: typeof own;
    scenarios: typeof scenarios;
  }) => {
    setCompetitor(p.competitor);
    setOwn(p.own);
    setScenarios(p.scenarios);
    setSeedNonce((n) => n + 1);
    setLlmSim(null);
    setLlmError(null);
  };

  const updateTopology = (next: StrategicTopology) => {
    if (topologySide === "OWN") {
      setOwn({ ...own, topology: next });
    } else {
      setCompetitor({ ...competitor, topology: next });
    }
  };

  const activeTopology =
    topologySide === "OWN" ? own.topology : competitor.topology;
  const activeName = topologySide === "OWN" ? own.name : competitor.name;

  return (
    <main className="min-h-screen bg-ink-0 text-ink-900">
      <TopBar sessionId={sessionId} />

      <section className="border-b border-ink-300 bg-ink-50">
        <div className="px-6 py-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-ink-500">
              MISSION // ADVERSARIAL SIMULATION ·{" "}
              <span className="text-ink-700">
                {engine === "CLAUDE" ? "CLAUDE OPUS 4.7" : "LOCAL HEURISTIC"}
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-[28px] tracking-tight text-ink-1000 leading-tight mt-1">
              Antizipiere {own.horizonRounds} Züge gegen{" "}
              <span className="text-ink-700">{competitor.name}</span>
              <span className="text-ink-400"> //</span>{" "}
              <span className="text-ink-700">{scenarios.length} Rollouts</span>
            </h1>
            <div className="font-mono text-[11px] text-ink-700 mt-2 max-w-2xl">
              {own.intent}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[300px]">
            <Stat label="THREAT" value={`${idx}`} hint="0..100" />
            <Stat label="HORIZON" value={`${own.horizonRounds}T`} hint="Runden" />
            <Stat label="ROLLOUTS" value={scenarios.length} hint="Szenarien" />
          </div>
        </div>
        <div className="px-6 pb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (engine === "CLAUDE") {
                void runClaude();
              } else {
                setSeedNonce((n) => n + 1);
              }
            }}
            disabled={llmRunning}
            className="font-mono text-[10px] tracking-widest border border-ink-900 px-3 py-1.5 hover:bg-ink-900 hover:text-ink-0 transition-colors disabled:opacity-50"
          >
            {engine === "CLAUDE"
              ? llmRunning
                ? "⌛ CLAUDE REASONS …"
                : "↻ RE-RUN CLAUDE"
              : "↻ RE-ROLL TREE"}
          </button>
          <button
            onClick={handleOpenBriefing}
            className="font-mono text-[10px] tracking-widest border border-ink-700 px-3 py-1.5 hover:border-ink-900 hover:text-ink-1000 transition-colors"
          >
            ⎙ EXPORT BRIEFING (PDF)
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(sim, null, 2));
            }}
            className="font-mono text-[10px] tracking-widest border border-ink-400 text-ink-700 px-3 py-1.5 hover:border-ink-900 hover:text-ink-1000 transition-colors"
          >
            ⇣ COPY SIMULATION JSON
          </button>
          <span className="font-mono text-[10px] tracking-widest text-ink-500 ml-auto">
            ENGINE // {engine} · SEED // {seedNonce.toString(16).padStart(4, "0").toUpperCase()}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr_420px] gap-px bg-ink-300/60">
        {/* LEFT: kernel + topology editor + summary controls */}
        <aside className="bg-ink-0 p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto xl:sticky xl:top-12">
          <EngineToggle
            mode={engine}
            onChange={setEngine}
            isRunning={llmRunning}
            lastError={llmError}
          />
          <RumeltKernel own={own} onChange={setOwn} />

          {/* OWN / OPPONENT toggle for the topology editor */}
          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-[10px] tracking-widest text-ink-500">
              EDIT //
            </span>
            <button
              onClick={() => setTopologySide("OWN")}
              className={`flex-1 font-mono text-[10px] tracking-widest px-2 py-1.5 border transition-colors ${
                topologySide === "OWN"
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
            >
              OWN · {own.name}
            </button>
            <button
              onClick={() => setTopologySide("OPPONENT")}
              className={`flex-1 font-mono text-[10px] tracking-widest px-2 py-1.5 border transition-colors ${
                topologySide === "OPPONENT"
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
            >
              OPP · {competitor.name}
            </button>
          </div>

          <TopologyEditor
            which={topologySide}
            name={activeName}
            topology={activeTopology}
            onChange={updateTopology}
          />

          {topologySide === "OWN" ? (
            <OwnSummary own={own} onChange={setOwn} />
          ) : (
            <OpponentSummary competitor={competitor} onChange={setCompetitor} />
          )}

          <ScenarioPanel scenarios={scenarios} onChange={setScenarios} />
        </aside>

        {/* CENTER: tree + path + sensitivity + STRATEGIC OPS */}
        <section className="bg-ink-0 p-4 space-y-4">
          {llmRunning && engine === "CLAUDE" && (
            <div className="border border-ink-900 bg-ink-100 p-3 font-mono text-[11px] tracking-wider text-ink-1000">
              <span className="inline-block w-1.5 h-1.5 bg-ink-1000 pulse-soft mr-2 align-middle" />
              CLAUDE OPUS 4.7 REASONS · ADAPTIVE THINKING · STRUCTURED JSON · ~20–60s
            </div>
          )}
          {llmError && engine === "CLAUDE" && (
            <div className="border border-ink-900 bg-ink-100 p-3 font-mono text-[11px] tracking-wider text-ink-1000">
              CLAUDE FEHLER: {llmError} · Fallback auf lokale Heuristik unten.
            </div>
          )}
          <Card
            title="MOVE TREE // ROLLOUT"
            meta={`${Object.keys(sim.nodes).length} NODES · ${sim.rootIds.length} ROOTS`}
          >
            <MoveTree
              sim={sim}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <Legend />
          </Card>
          <PathPanel sim={sim} onSelect={setSelectedId} />
          <SensitivityPanel
            competitor={competitor}
            own={own}
            scenarios={scenarios}
          />

          {/* Strategic Operations Center */}
          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-[10px] tracking-widest text-ink-500">
              STRATEGIC OPS //
            </span>
            <button
              onClick={() => setOpsTab("WATCH")}
              className={`font-mono text-[10px] tracking-widest px-2.5 py-1 border transition-colors ${
                opsTab === "WATCH"
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
            >
              WATCHLIST
            </button>
            <button
              onClick={() => setOpsTab("TRAJECTORY")}
              className={`font-mono text-[10px] tracking-widest px-2.5 py-1 border transition-colors ${
                opsTab === "TRAJECTORY"
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
            >
              TRAJECTORY
            </button>
          </div>
          {opsTab === "WATCH" ? (
            <WatchlistPanel
              sim={sim}
              triggers={triggers}
              onChange={refreshTriggers}
              onSelectNode={setSelectedId}
            />
          ) : (
            <TrajectoryTracker
              sim={sim}
              triggers={triggers}
              onSelectNode={setSelectedId}
            />
          )}
        </section>

        {/* RIGHT: BMC compare + VPC fit + threat + inspector + projects */}
        <aside className="bg-ink-0 p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto xl:sticky xl:top-12">
          <BMCComparison own={own} competitor={competitor} />
          <VPCFitChart own={own} competitor={competitor} />
          <ThreatPanel sim={sim} />
          <NodeDetail
            sim={sim}
            nodeId={selectedId}
            triggers={triggers}
            onTriggerChange={refreshTriggers}
          />
          <ProjectPanel
            competitor={competitor}
            own={own}
            scenarios={scenarios}
            sim={sim}
            backend={engine}
            onLoad={handleLoadProject}
          />
        </aside>
      </div>

      <footer className="border-t border-ink-300 bg-ink-50 px-6 py-3 flex items-center justify-between text-[10px] font-mono tracking-widest text-ink-500">
        <span>HELM // ADVERSARIAL STRATEGY SIMULATION ENGINE</span>
        <span>OBSERVE · ORIENT · DECIDE · ACT</span>
        <span>© 2026 // ALL ROLLOUTS ARE HYPOTHETICAL</span>
      </footer>
    </main>
  );
}

function Legend() {
  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono tracking-wider text-ink-700">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-ink-900" />
        ⌖ OPPONENT MOVE
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 border border-ink-900" />
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
