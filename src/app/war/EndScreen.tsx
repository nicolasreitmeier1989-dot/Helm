"use client";

import { useEffect } from "react";
import type { Endgame, Simulation, Stats } from "@/lib/wargame/types";
import { playSting } from "./sounds";

type Props = {
  sim: Simulation;
  finalPlayerStats: Stats;
  finalCompetitorStats: Stats;
  onPlayAgain: () => void;
};

function pickEndgame(sim: Simulation, p: Stats): Endgame {
  if (p.hp >= 60) return sim.endgameTemplates.victory;
  if (p.hp < 20) return sim.endgameTemplates.defeat;
  return sim.endgameTemplates.stalemate;
}

const LEVERAGE_BG: Record<"high" | "medium" | "low", string> = {
  high: "bg-black text-white",
  medium: "bg-black/70 text-white",
  low: "bg-black/30 text-white",
};

export function EndScreen({ sim, finalPlayerStats, finalCompetitorStats, onPlayAgain }: Props) {
  const endgame = pickEndgame(sim, finalPlayerStats);

  useEffect(() => {
    const t = setTimeout(() => playSting(endgame.outcome), 400);
    return () => clearTimeout(t);
  }, [endgame.outcome]);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="border-b border-black/10 px-6 py-5 flex items-center justify-between">
        <a href="/" className="font-black text-xl tracking-tight">
          10X
          <span className="ml-2 font-mono text-[10px] tracking-[0.3em] text-black/40 align-middle">
            / WFC
          </span>
        </a>
        <nav className="font-mono text-[11px] tracking-[0.25em] text-black/60">
          ← BACK TO OPERATOR
        </nav>
      </header>

      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* Verdict */}
        <div className="mb-12" style={{ animation: "fadeInScale 0.6s ease-out" }}>
          <div className="font-mono text-[10px] tracking-[0.4em] text-black/40 mb-3">
            05 · POSTMORTEM
          </div>
          <div className="grid md:grid-cols-[1fr,auto] gap-6 items-end">
            <h1 className="font-black text-6xl md:text-8xl tracking-tighter leading-[0.9]">
              {endgame.outcome === "victory"
                ? <>VICTORY.<br /><span className="text-black/40">SCARCE.</span></>
                : endgame.outcome === "defeat"
                ? <>DEFEAT.<br /><span className="text-red-600">INSTRUCTIVE.</span></>
                : <>STALEMATE.<br /><span className="text-black/40">STILL VALUABLE.</span></>}
            </h1>
            <div className="text-right space-y-1 font-mono text-[11px] tracking-[0.25em] text-black/50">
              <div>YOU · HP {Math.round(finalPlayerStats.hp)}/100</div>
              <div>COMPETITOR · HP {Math.round(finalCompetitorStats.hp)}/100</div>
              <div>30 MONTHS SIMULATED</div>
            </div>
          </div>
          <div className="mt-6 text-lg md:text-xl text-black/80 leading-relaxed max-w-3xl border-l-2 border-black pl-5 italic">
            {endgame.summary}
          </div>
        </div>

        {/* Reasons */}
        <Section number="01" title="WHY">
          <div className="grid md:grid-cols-3 gap-4">
            {endgame.reasons.map((r, i) => (
              <div key={i} className="border border-black/15 p-5 hover:border-black transition-colors">
                <div className="font-mono text-[10px] tracking-[0.3em] text-black/40 mb-2">
                  REASON {String(i + 1).padStart(2, "0")}
                </div>
                <div className="text-black/90 leading-relaxed">{r}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Today's actions */}
        <Section number="02" title="THIS WEEK" emphasis>
          <div className="space-y-3">
            {endgame.todayActions.map((a, i) => (
              <div
                key={i}
                className="border border-black p-5 md:p-6 hover:bg-black hover:text-white transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-mono text-[10px] tracking-[0.3em] text-black/40 group-hover:text-white/50 mb-2">
                      ACTION {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="font-black text-2xl md:text-3xl tracking-tight leading-tight mb-3">
                      {a.action}
                    </div>
                    <div className="text-black/70 group-hover:text-white/70 text-sm md:text-base leading-relaxed">
                      {a.rationale}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[10px] tracking-[0.3em] px-2 py-1 group-hover:bg-white group-hover:text-black ${LEVERAGE_BG[a.leverage]}`}
                  >
                    {a.leverage.toUpperCase()} LEVERAGE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-16 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-black/10 pt-8">
          <div className="text-black/50 text-sm font-mono tracking-wider">
            RUN ANOTHER WITH DIFFERENT INPUTS TO STRESS-TEST YOUR STRATEGY.
          </div>
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 bg-black text-white font-mono tracking-[0.3em] text-sm hover:bg-red-600 transition-colors"
          >
            ▶ NEW BATTLE
          </button>
        </div>
      </div>

      <footer className="border-t border-black/10 px-6 py-4 flex items-center justify-between text-[10px] font-mono tracking-[0.3em] text-black/40">
        <span>10X // WFC v0.5</span>
        <span>OBSERVE · ORIENT · DECIDE · ACT</span>
        <span>ALL ROLLOUTS HYPOTHETICAL</span>
      </footer>
    </div>
  );
}

function Section({
  number,
  title,
  emphasis,
  children,
}: {
  number: string;
  title: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-baseline gap-4 mb-5 border-b border-black/10 pb-3">
        <span className="font-mono text-[10px] tracking-[0.3em] text-black/40">
          {number}
        </span>
        <h2
          className={`font-black tracking-tight ${
            emphasis ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
          }`}
        >
          {title}
        </h2>
        {emphasis && (
          <span className="font-mono text-[10px] tracking-[0.3em] text-red-600 ml-auto">
            ◆ THE WHOLE POINT
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
