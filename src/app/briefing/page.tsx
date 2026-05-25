"use client";

import { useEffect, useState } from "react";
import { loadBriefing } from "@/lib/briefing";
import { categoryHeatmap, threatIndex, topPaths } from "@/lib/engine";
import type { Simulation } from "@/lib/types";

export default function BriefingPage() {
  const [sim, setSim] = useState<Simulation | null>(null);

  useEffect(() => {
    setSim(loadBriefing());
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
  const heatmap = categoryHeatmap(sim);
  const paths = topPaths(sim, 5);
  const date = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
              Hauptdruck entsteht in den Kategorien{" "}
              <strong>{heatmap.slice(0, 3).map((h) => h.category).join(" / ")}</strong>
              . Die Top-Trajektorie unten beschreibt den wahrscheinlichsten
              Worst-Case-Pfad — wir empfehlen Pre-Empt durch die in
              Sektion 2 aufgeführten Counter-Moves.
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
              label="Rollouts"
              value={`${sim.scenarios.length} Szenarien`}
              hint={sim.scenarios.map((s) => `${(s.weight * 100).toFixed(0)}%`).join(" / ")}
            />
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
              HELM erzeugt einen probabilistischen Spielbaum aus Posture,
              Kriegskasse, Innovationsindex, Markenmacht, Leadership-Bias und
              beobachteten Signalen des Wettbewerbers. Conditional Probabilities
              werden per Sibling-Set normalisiert. Threat-Index ist EV-gewichtet
              (Wahrscheinlichkeit × Schaden) über alle gegnerischen Knoten,
              skaliert auf 0..100. Trajektorien werden nach Composite-Score
              (Pfad-Wahrscheinlichkeit × kumulierte Threat-Last) sortiert.
              Counter-Move-Vorschläge sind per Kategorie kuratiert und an den
              jeweiligen Zug gebunden.
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
