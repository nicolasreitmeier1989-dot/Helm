"use client";

import { useEffect, useState } from "react";
import { loadBriefingPayload } from "@/lib/briefing";
import { categoryHeatmap, threatIndex, topPaths } from "@/lib/engine";
import {
  bmcOverlapScore,
  findEmergingCollisions,
  labelsMatch,
} from "@/lib/topology";
import type { Simulation, TopologyDelta } from "@/lib/types";
import type { WFCContext } from "@/lib/store";
import { AI_NATIVE_PATTERNS } from "@/lib/aiNativePatterns";
import { DEFENDER_OPTIONS } from "@/lib/defenderOptions";

export default function BriefingPage() {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [wfc, setWfc] = useState<WFCContext | undefined>(undefined);

  useEffect(() => {
    const p = loadBriefingPayload();
    if (p) {
      setSim(p.sim);
      setWfc(p.wfc);
    }
  }, []);

  if (!sim) {
    return (
      <main className="min-h-screen bg-white text-black flex items-center justify-center font-mono text-sm">
        <div>
          Keine Simulation geladen. Bitte aus der Hauptansicht „EXPORT BRIEFING"
          auswählen.
        </div>
      </main>
    );
  }

  const idx = threatIndex(sim);
  const intentIdx = intentThreatIndex(sim);
  const heatmap = categoryHeatmap(sim);
  const paths = topPaths(sim, 5);
  const overlap = bmcOverlapScore(sim.own.topology.bmc, sim.competitor.topology.bmc);
  const date = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Contested customer segments — for the BMC-Overlap-Diagram
  const ourSegs = sim.own.topology.bmc.blocks.filter(
    (b) => b.kind === "CUSTOMER_SEGMENTS",
  );
  const theirSegs = sim.competitor.topology.bmc.blocks.filter(
    (b) => b.kind === "CUSTOMER_SEGMENTS",
  );
  const contested = ourSegs
    .map((a) => {
      const b = theirSegs.find((x) => labelsMatch(a.label, x.label));
      return b ? { ours: a, theirs: b } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 14mm;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
        body {
          background: white !important;
          color: black !important;
        }
      `}</style>

      <div className="no-print fixed top-3 right-3 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="font-mono text-[10px] tracking-widest bg-black text-white px-3 py-2 hover:bg-neutral-800"
        >
          ⎙ DRUCKEN / ALS PDF SPEICHERN
        </button>
        <button
          onClick={() => window.close()}
          className="font-mono text-[10px] tracking-widest border border-black text-black px-3 py-2 hover:bg-black hover:text-white"
        >
          ✕ SCHLIESSEN
        </button>
      </div>

      <main className="bg-white text-black min-h-screen">
        {/* PAGE 1 */}
        <section className="mx-auto max-w-[210mm] p-10 print:p-0">
          <header className="border-b-2 border-black pb-4 mb-6 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-widest text-neutral-500">
                HELM // ADVERSARIAL STRATEGY BRIEFING
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mt-1">
                Board Memo · {sim.competitor.name}
              </h1>
              <div className="font-mono text-[10px] tracking-wider text-neutral-700 mt-1">
                {date} · {sim.scenarios.length} ROLLOUTS ·{" "}
                {sim.own.horizonRounds} RUNDEN VORAUSSCHAU
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] tracking-widest text-neutral-500">
                THREAT INDEX
              </div>
              <div className="text-5xl font-mono leading-none">{idx}</div>
              <div className="font-mono text-[10px] text-neutral-500 mt-1">
                0..100 · EV-gewichtet
              </div>
            </div>
          </header>

          {/* Rumelt Kernel — top of memo */}
          <section className="mb-6 border border-black p-4">
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-2">
              STRATEGIC KERNEL (RUMELT)
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <KernelField label="Diagnosis" value={sim.own.diagnosis} />
              <KernelField label="Guiding Policy" value={sim.own.guidingPolicy} />
              <KernelField label="Opening Move" value={sim.own.openingMove} />
            </div>
          </section>

          <section className="mb-6">
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-1">
              EXECUTIVE SUMMARY
            </h2>
            <p className="text-[13px] leading-relaxed">
              Unser Eröffnungszug »{sim.own.openingMove}« provoziert wahrscheinlich{" "}
              {countOpponentMoves(sim)} eigenständige Reaktions-Trajektorien bei{" "}
              <strong>{sim.competitor.name}</strong> ({sim.competitor.posture},
              Marktanteil {(sim.competitor.marketShare * 100).toFixed(0)}%). Der
              gewichtete Bedrohungsindex liegt bei <strong>{idx}/100</strong>.
              Diese Zahl berücksichtigt Friction (regulatorischer Drag,
              Kapazitätsdefizite, Coalition-Risiken). Intent-Threat ohne Friction
              läge bei <strong>{intentIdx}/100</strong>. Hauptdruck entsteht in
              den Kategorien{" "}
              <strong>{heatmap.slice(0, 3).map((h) => h.category).join(" / ")}</strong>
              . BMC-Überlappung mit dem Wettbewerber beträgt{" "}
              <strong>{overlap}/100</strong> — {contested.length} Customer-Segments
              sind aktuell umkämpft. Die Top-Trajektorie unten beschreibt den
              wahrscheinlichsten Worst-Case-Pfad — wir empfehlen Pre-Empt durch
              die in Sektion 2 aufgeführten Counter-Moves.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-3 gap-4">
            <Stat
              label="Eigenes Ziel"
              value={sim.own.name}
              hint={truncate(sim.own.intent, 80)}
            />
            <Stat
              label="Gegner Posture"
              value={sim.competitor.posture}
              hint={`Kriegskasse ${sim.competitor.warChest} · Innovation ${sim.competitor.innovationIndex}`}
            />
            <Stat
              label="BMC Overlap"
              value={`${overlap} / 100`}
              hint={`${contested.length} umkämpfte Segmente`}
            />
          </section>

          {/* BMC OVERLAP DIAGRAM */}
          <section className="mb-6">
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-2">
              BMC OVERLAP · KOLLISIONS-ZONEN
            </h2>
            {contested.length === 0 ? (
              <p className="text-[11px] text-neutral-700 italic">
                Keine direkten Kollisionen auf Customer-Segments-Ebene. Wettbewerb
                läuft indirekt über benachbarte BMC-Blöcke.
              </p>
            ) : (
              <div className="space-y-2">
                {contested.map(({ ours, theirs }, i) => (
                  <div
                    key={i}
                    className="border border-black grid grid-cols-[1fr_auto_1fr] items-center"
                  >
                    <div className="p-2 text-right border-r border-neutral-300">
                      <div className="font-mono text-[9px] tracking-widest text-neutral-500">
                        OUR STRENGTH
                      </div>
                      <div className="text-[13px] font-semibold">{ours.label}</div>
                      <div className="font-mono text-[10px]">
                        S = {ours.strength}
                      </div>
                    </div>
                    <div className="px-2 py-1 text-center bg-black text-white font-mono text-[10px] tracking-widest">
                      ⌖ CONTESTED
                    </div>
                    <div className="p-2 border-l border-neutral-300">
                      <div className="font-mono text-[9px] tracking-widest text-neutral-500">
                        THEIR STRENGTH
                      </div>
                      <div className="text-[13px] font-semibold">{theirs.label}</div>
                      <div className="font-mono text-[10px]">
                        S = {theirs.strength}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI-NATIVE THREAT ASSESSMENT — only rendered for WFC projects */}
          {wfc && <AINativeThreatAssessment sim={sim} wfc={wfc} />}

          {/* EMERGING CAPABILITY COLLISIONS — set-layer race-on signals */}
          <section className="mb-6">
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-2">
              EMERGING CAPABILITY COLLISIONS
            </h2>
            {(() => {
              const collisions = findEmergingCollisions(
                sim.own.topology,
                sim.competitor.topology,
              );
              if (collisions.length === 0) {
                return (
                  <p className="text-[11px] text-neutral-700 italic">
                    Keine direkten Kollisionen auf Capability-Set-Ebene.
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {collisions.map((c, i) => (
                    <div key={i} className="border border-black p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[13px] font-semibold leading-tight">
                          {c.name}
                        </div>
                        <span className="font-mono text-[9px] tracking-widest text-neutral-600">
                          {c.dimension}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-neutral-700">
                        <div>
                          <span className="text-neutral-500">OURS: </span>
                          {c.ours.lifecycle} · era {c.ours.era}
                        </div>
                        <div>
                          <span className="text-neutral-500">THEIRS: </span>
                          {c.theirs.lifecycle} · era {c.theirs.era}
                        </div>
                      </div>
                      <div className="text-[10.5px] text-neutral-700 italic mt-1 leading-snug">
                        {collisionCaption(c.ours.lifecycle, c.theirs.lifecycle)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>

          <section className="mb-6">
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-2">
              KATEGORISCHE DRUCKKARTE
            </h2>
            <div className="space-y-1">
              {heatmap.map((h) => (
                <div key={h.category} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider w-24">
                    {h.category}
                  </span>
                  <div className="flex-1 h-2 bg-neutral-200 relative">
                    <div
                      className="h-2 bg-black"
                      style={{ width: `${h.weight * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] w-12 text-right">
                    {(h.weight * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-2">
              TOP-5 RISIKO-TRAJEKTORIEN
            </h2>
            <ol className="space-y-3">
              {paths.map((p, i) => {
                const finalOpp = [...p.ids]
                  .reverse()
                  .map((id) => sim.nodes[id])
                  .find((n) => n.actor === "OPPONENT");
                const dominant = finalOpp?.deltas?.[0];
                return (
                  <li key={i} className="border-l-2 border-black pl-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[10px] tracking-widest">
                        PATH-{(i + 1).toString().padStart(2, "0")} ·{" "}
                        {p.scenarioLabel.toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px]">
                        P={(p.cumulativeProbability * 100).toFixed(2)}% · Σ T=
                        {p.totalThreat.toFixed(1)}
                      </span>
                    </div>
                    {dominant && (
                      <div className="font-mono text-[10px] text-neutral-700 mb-0.5">
                        DOMINANT DELTA: {opGlyph(dominant)} {dominant.op} ·{" "}
                        {dominant.layer} · {humanTarget(dominant)}
                      </div>
                    )}
                    <div className="text-[11px] leading-relaxed">
                      {p.ids
                        .map((id) => {
                          const n = sim.nodes[id];
                          return `${n.actor === "OPPONENT" ? "⌖" : "◇"} ${n.title}`;
                        })
                        .join(" → ")}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="font-mono text-[9px] text-neutral-500 mt-8 pt-4 border-t border-neutral-300 tracking-widest flex justify-between">
            <span>HELM // CONFIDENTIAL — INTERNAL USE ONLY</span>
            <span>SEITE 1 / 2</span>
          </div>
        </section>

        {/* PAGE BREAK */}
        <div style={{ pageBreakAfter: "always" }} />

        {/* PAGE 2 — Counter-Playbook */}
        <section className="mx-auto max-w-[210mm] p-10 print:p-0">
          <header className="border-b-2 border-black pb-4 mb-6">
            <div className="font-mono text-[10px] tracking-widest text-neutral-500">
              HELM // BRIEFING · TEIL 2
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">
              Counter-Move Playbook
            </h1>
            <div className="font-mono text-[10px] text-neutral-700 mt-1">
              Pre-Emptive Reaktionen pro Top-Trajektorie · sortiert nach Composite
              EV × Threat.
            </div>
          </header>

          <section className="space-y-5">
            {paths.slice(0, 4).map((p, i) => {
              const lastOpp = [...p.ids]
                .reverse()
                .map((id) => sim.nodes[id])
                .find((n) => n.actor === "OPPONENT");
              if (!lastOpp) return null;
              const dominant = lastOpp.deltas?.[0];
              return (
                <article
                  key={i}
                  className="border border-neutral-400 p-4 break-inside-avoid"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] tracking-widest">
                      PATH-{(i + 1).toString().padStart(2, "0")} · {lastOpp.category}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-600">
                      Threat {lastOpp.threat} · Cost {lastOpp.cost}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold leading-tight mb-1">
                    ⌖ {lastOpp.title}
                  </h3>
                  {dominant && (
                    <div className="font-mono text-[10px] text-neutral-700 mb-1">
                      DELTA: {opGlyph(dominant)} {dominant.op} · {dominant.layer} ·{" "}
                      {humanTarget(dominant)} (MAG {dominant.magnitude})
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-700 leading-relaxed mb-2">
                    {lastOpp.rationale}
                  </p>
                  <div className="font-mono text-[10px] tracking-widest text-neutral-500 mb-1">
                    EMPFOHLENE COUNTER-MOVES
                  </div>
                  <ol className="space-y-1">
                    {(lastOpp.counters.length > 0
                      ? lastOpp.counters
                      : ["Counter-Move-Bibliothek leer für diesen Knoten."]
                    ).map((c, k) => (
                      <li
                        key={k}
                        className="flex items-start gap-2 text-[11.5px] leading-relaxed"
                      >
                        <span className="font-mono text-[10px] text-neutral-500 mt-0.5 shrink-0">
                          C{(k + 1).toString().padStart(2, "0")}
                        </span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </section>

          <section className="mt-6 border-t-2 border-black pt-4">
            <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-1">
              METHODIK
            </h2>
            <p className="text-[10.5px] text-neutral-700 leading-relaxed">
              HELM modelliert beide Seiten als drei-Schicht-Strategic-Topology
              (Capabilities · Business Model Canvas · Value Proposition Canvas).
              Gegnerische Züge werden als Topology-Deltas auf der gegnerischen
              Topologie generiert; Threat wird aus der Kollision dieser Deltas
              mit unserer Topologie berechnet (BMC-Überlappung × 0.4, VPC-Item
              auf geteiltem Segment × 0.6, asymmetrischer Angriff auf
              schwach-aber-wichtige Capability × 0.5). Conditional Probabilities
              werden per Sibling-Set normalisiert. Trajektorien werden nach
              Composite-Score (Pfad-Wahrscheinlichkeit × kumulierte Threat-Last)
              sortiert.
            </p>
          </section>

          <div className="font-mono text-[9px] text-neutral-500 mt-8 pt-4 border-t border-neutral-300 tracking-widest flex justify-between">
            <span>HELM // CONFIDENTIAL — INTERNAL USE ONLY</span>
            <span>SEITE 2 / 2</span>
          </div>
        </section>
      </main>
    </>
  );
}

function countOpponentMoves(sim: Simulation): number {
  return Object.values(sim.nodes).filter((n) => n.actor === "OPPONENT").length;
}

// Same shape as engine.threatIndex but reads `intentThreat` (pre-friction)
// where available. Used by the Executive Summary to surface the gap.
function intentThreatIndex(sim: Simulation): number {
  let s = 0;
  let n = 0;
  for (const id in sim.nodes) {
    const node = sim.nodes[id];
    if (node.actor !== "OPPONENT") continue;
    const t = node.intentThreat ?? node.threat;
    s += t * node.cumulativeProbability;
    n += node.cumulativeProbability;
  }
  if (n === 0) return 0;
  return Math.min(100, Math.round((s / n) * 1.15));
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-neutral-400 p-3">
      <div className="font-mono text-[9px] tracking-widest text-neutral-500 mb-0.5 uppercase">
        {label}
      </div>
      <div className="text-[14px] font-semibold leading-tight">{value}</div>
      {hint && (
        <div className="font-mono text-[10px] text-neutral-600 mt-1 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}

function KernelField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase mb-0.5">
        {label}
      </div>
      <div className="text-[12px] leading-relaxed">
        {value || <span className="italic text-neutral-400">— nicht definiert —</span>}
      </div>
    </div>
  );
}

function opGlyph(d: TopologyDelta): string {
  switch (d.op) {
    case "ADD": return "+";
    case "STRENGTHEN": return "↑";
    case "WEAKEN": return "↓";
    case "REMOVE": return "−";
    case "MIGRATE": return "⤴";
  }
}

function collisionCaption(ours: string, theirs: string): string {
  if (ours === "EMERGING" && theirs === "EMERGING") {
    return "Beide Seiten früh; das Rennen ist offen.";
  }
  if (ours === "EMERGING" && theirs === "GROWING") {
    return "Wir EMERGING, sie GROWING — Aufholrennen, Zeitfenster eng.";
  }
  if (ours === "GROWING" && theirs === "EMERGING") {
    return "Wir GROWING, sie EMERGING — wir haben Vorsprung, aber er ist erodierbar.";
  }
  if (ours === "GROWING" && theirs === "GROWING") {
    return "Parallel-Wachstum auf gleichem Feld — Differenzierungskampf.";
  }
  if (ours === "MATURE" && (theirs === "EMERGING" || theirs === "GROWING")) {
    return "Wir reif, sie in Frühphase — Disruptions-Risiko, Verteidigungsmodus.";
  }
  if ((ours === "EMERGING" || ours === "GROWING") && theirs === "MATURE") {
    return "Wir früh, sie reif — wir greifen die etablierte Position an.";
  }
  return "Beide Seiten halten Position im Set; das Tempo bestimmt das Spiel.";
}

function AINativeThreatAssessment({
  sim,
  wfc,
}: {
  sim: Simulation;
  wfc: WFCContext;
}) {
  const pattern = AI_NATIVE_PATTERNS.find((p) => p.id === wfc.patternId);
  const stance = DEFENDER_OPTIONS.find((o) => o.id === wfc.stanceId);
  if (!pattern || !stance) return null;

  // The disruption scenario was seeded with id "s-ai-native". Find the root
  // node for that scenario and bubble up its top trajectory probability.
  const disruptionRootId = sim.rootIds.find((id) =>
    sim.nodes[id]?.title.toLowerCase().includes("ai-native")
      ? true
      : sim.nodes[id]?.rationale?.toLowerCase().includes("ai-native"),
  );
  const allOppNodes = Object.values(sim.nodes).filter(
    (n) => n.actor === "OPPONENT",
  );
  const disruptionPaths = disruptionRootId
    ? allOppNodes.filter((n) => bubbleHasRoot(sim, n.id, disruptionRootId))
    : allOppNodes;
  const topP = disruptionPaths.reduce(
    (max, n) => Math.max(max, n.cumulativeProbability),
    0,
  );
  const pPct = Math.round(topP * 100);
  const verdict =
    pPct > 30 ? "CONFIRMED FEAR" : pPct >= 10 ? "POSSIBLE" : "PARANOID";
  const verdictTone =
    verdict === "CONFIRMED FEAR"
      ? "bg-black text-white"
      : verdict === "POSSIBLE"
        ? "bg-neutral-200 text-black"
        : "bg-white text-black border border-black";
  const topThreat = disruptionPaths.reduce(
    (max, n) => Math.max(max, n.threat),
    0,
  );
  const exposedSets = sim.own.topology.capabilitySets.filter((s) =>
    pattern.exposedDimensions.includes(s.dimension),
  );

  return (
    <section className="mb-6 border-2 border-black p-4">
      <h2 className="font-mono text-[10px] tracking-widest text-neutral-500 mb-2">
        AI-NATIVE THREAT ASSESSMENT
      </h2>

      <p className="text-[12.5px] leading-relaxed mb-3">
        Pattern: <strong>{pattern.name}</strong> — {pattern.mechanism}.
      </p>

      <div className="flex items-center gap-3 mb-3">
        <span
          className={`font-mono text-[14px] tracking-widest px-3 py-1.5 ${verdictTone}`}
        >
          ⌖ {verdict}
        </span>
        <span className="font-mono text-[11px] text-neutral-700">
          P = {pPct}% · THREAT {Math.round(topThreat)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border border-neutral-400 p-2">
          <div className="font-mono text-[9px] tracking-widest text-neutral-500 mb-1">
            TIME TO IMPACT
          </div>
          <div className="text-[12.5px] leading-snug">
            <strong>{pattern.timeToImpact}</strong> — act within the first
            third of the window to remain defensible.
          </div>
        </div>
        <div className="border border-neutral-400 p-2">
          <div className="font-mono text-[9px] tracking-widest text-neutral-500 mb-1">
            EXPOSED CAPABILITY SETS
          </div>
          {exposedSets.length === 0 ? (
            <div className="text-[12px] italic text-neutral-600">
              None mapped yet — fill in capability sets to sharpen this view.
            </div>
          ) : (
            <ul className="text-[12px] leading-snug space-y-0.5">
              {exposedSets.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>{" "}
                  <span className="font-mono text-[10px] text-neutral-600">
                    · {s.lifecycle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border border-neutral-400 p-2 mb-3">
        <div className="font-mono text-[9px] tracking-widest text-neutral-500 mb-1">
          RECOMMENDED DEFENSE
        </div>
        <div className="text-[12.5px] leading-relaxed">
          <strong>{stance.name}.</strong> {stance.whenItFits} The kernel
          opposite implements this stance.
        </div>
      </div>

      <div className="border-t border-neutral-300 pt-2">
        <div className="font-mono text-[9px] tracking-widest text-neutral-500 mb-1">
          THE FEAR, IN YOUR WORDS
        </div>
        <div className="text-[11.5px] italic leading-relaxed space-y-1.5 text-neutral-700">
          {wfc.fearParagraphs.workflow && (
            <div>
              <span className="font-mono text-[9px] not-italic tracking-widest text-neutral-500 mr-1">
                WORKFLOW:
              </span>
              {wfc.fearParagraphs.workflow}
            </div>
          )}
          {wfc.fearParagraphs.pricing && (
            <div>
              <span className="font-mono text-[9px] not-italic tracking-widest text-neutral-500 mr-1">
                PRICING:
              </span>
              {wfc.fearParagraphs.pricing}
            </div>
          )}
          {wfc.fearParagraphs.flywheel && (
            <div>
              <span className="font-mono text-[9px] not-italic tracking-widest text-neutral-500 mr-1">
                FLYWHEEL:
              </span>
              {wfc.fearParagraphs.flywheel}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Walks parent pointers; returns true if `nodeId`'s root in the sim's tree
// equals `rootId`. Used so AINativeThreatAssessment can scope its
// probability/threat aggregation to the disruption scenario subtree.
function bubbleHasRoot(
  sim: Simulation,
  nodeId: string,
  rootId: string,
): boolean {
  let cur: string | null = nodeId;
  while (cur !== null) {
    if (cur === rootId) return true;
    const here: import("@/lib/types").MoveNode | undefined = sim.nodes[cur];
    if (!here) return false;
    cur = here.parentId;
  }
  return false;
}

function humanTarget(d: TopologyDelta): string {
  const t = d.target;
  if (t.kind === "CAPABILITY") {
    return `${t.dimension}${d.newLabel ? ` "${d.newLabel}"` : ""}`;
  }
  if (t.kind === "CAPABILITY_SET") {
    return `capability set${t.dimension ? ` ${t.dimension}` : ""}${
      d.newLabel ? ` "${d.newLabel}"` : ""
    }`;
  }
  if (t.kind === "BMC_BLOCK") {
    return `${t.blockKind.replace(/_/g, " ").toLowerCase()}${d.newLabel ? ` "${d.newLabel}"` : ""}`;
  }
  return `${t.itemKind}${d.newLabel ? ` "${d.newLabel}"` : ""}`;
}
