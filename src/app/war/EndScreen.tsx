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

/** Operator-site contact / "AI Competitor" call-to-action target. */
const OPERATOR_CTA_URL = "https://operator-site-gilt.vercel.app/#contact";

export function EndScreen({ sim, finalPlayerStats, finalCompetitorStats, onPlayAgain }: Props) {
  const endgame = pickEndgame(sim, finalPlayerStats);

  useEffect(() => {
    const t = setTimeout(() => playSting(endgame.outcome), 400);
    return () => clearTimeout(t);
  }, [endgame.outcome]);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="border-b border-black/10 px-4 md:px-6 py-4 md:py-5 flex items-center justify-between">
        <a href="/" className="font-black text-xl tracking-tight">
          10X
          <span className="ml-2 font-mono text-[10px] tracking-[0.3em] text-black/40 align-middle">
            / WFC
          </span>
        </a>
        <a
          href="https://operator-site-gilt.vercel.app/"
          className="font-mono text-[11px] tracking-[0.25em] text-black/60 hover:text-black"
        >
          ← BACK TO OPERATOR
        </a>
      </header>

      <div className="flex-1 max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16 w-full">
        {/* Verdict */}
        <div className="mb-12" style={{ animation: "fadeInScale 0.6s ease-out" }}>
          <div className="font-mono text-[10px] tracking-[0.4em] text-black/40 mb-3">
            05 · POSTMORTEM
          </div>
          <div className="grid md:grid-cols-[1fr,auto] gap-4 md:gap-6 items-end">
            <h1 className="font-black text-5xl md:text-8xl tracking-tighter leading-[0.9]">
              {endgame.outcome === "victory"
                ? "VICTORY."
                : endgame.outcome === "defeat"
                ? "DEFEAT."
                : "STALEMATE."}
            </h1>
            <div className="text-left md:text-right space-y-1 font-mono text-[11px] tracking-[0.25em] text-black/50">
              <div>YOU · HP {Math.round(finalPlayerStats.hp)}/100</div>
              <div>COMPETITOR · HP {Math.round(finalCompetitorStats.hp)}/100</div>
              <div>30 MONTHS SIMULATED</div>
            </div>
          </div>
          <div className="mt-5 text-base md:text-xl text-black/80 leading-relaxed max-w-3xl border-l-2 border-black pl-4 md:pl-5 italic">
            {endgame.summary}
          </div>
        </div>

        {/* Reasons */}
        <Section number="01" title="WHY">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {endgame.reasons.map((r, i) => (
              <div key={i} className="border border-black/15 p-4 md:p-5 hover:border-black transition-colors">
                <div className="font-mono text-[10px] tracking-[0.3em] text-black/40 mb-2">
                  REASON {String(i + 1).padStart(2, "0")}
                </div>
                <div className="text-black/90 leading-relaxed text-sm md:text-base">{r}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Today's actions — THE KEY VALUE */}
        <Section number="02" title="THIS WEEK" emphasis>
          <div className="space-y-3">
            {endgame.todayActions.map((a, i) => (
              <div
                key={i}
                className="border border-black p-4 md:p-6 hover:bg-black hover:text-white transition-colors group"
              >
                <div className="flex flex-col md:flex-row items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1">
                    <div className="font-mono text-[10px] tracking-[0.3em] text-black/40 group-hover:text-white/50 mb-2">
                      ACTION {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="font-black text-xl md:text-3xl tracking-tight leading-tight mb-2 md:mb-3">
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

        {/* Primary CTA: convert to operator contact — the killer ask */}
        <div className="mt-16 mb-8 border-2 border-black bg-black text-white p-6 md:p-10">
          <div className="font-mono text-[10px] tracking-[0.4em] text-white/50 mb-3">
            ◆ NEXT STEP
          </div>
          <h2 className="font-black text-3xl md:text-5xl tracking-tighter leading-[0.95] mb-4">
            RUN THIS AS A REAL<br />WAR ROOM WITH NICOLAS.
          </h2>
          <p className="text-white/70 text-base md:text-lg leading-relaxed mb-6 max-w-2xl">
            The simulation gives you the shape. A 90-minute working session
            with Nicolas turns it into a board-ready cash model — and the
            three plays you actually run next quarter.
          </p>
          <a
            href={OPERATOR_CTA_URL}
            className="inline-block px-6 md:px-8 py-3 md:py-4 bg-white text-black font-mono tracking-[0.3em] text-sm hover:bg-red-500 hover:text-white transition-colors"
          >
            BOOK THE SESSION →
          </a>
        </div>

        {/* Secondary: replay */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-black/10 pt-8">
          <div className="text-black/50 text-xs md:text-sm font-mono tracking-wider text-center md:text-left">
            Want to stress-test another strategy? Run a new battle with different inputs.
          </div>
          <button
            onClick={onPlayAgain}
            className="px-6 py-2.5 border border-black/30 hover:border-black font-mono tracking-[0.3em] text-xs hover:bg-black hover:text-white transition-colors"
          >
            ↻ NEW BATTLE
          </button>
        </div>
      </div>

      <footer className="border-t border-black/10 px-4 md:px-6 py-4 flex flex-col md:flex-row gap-2 items-center justify-between text-[10px] font-mono tracking-[0.3em] text-black/40">
        <span>10X // WFC v0.5</span>
        <span className="hidden md:inline">OBSERVE · ORIENT · DECIDE · ACT</span>
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
    <section className="mb-10 md:mb-12">
      <div className="flex items-baseline gap-3 md:gap-4 mb-4 md:mb-5 border-b border-black/10 pb-3 flex-wrap">
        <span className="font-mono text-[10px] tracking-[0.3em] text-black/40">
          {number}
        </span>
        <h2
          className={`font-black tracking-tight ${
            emphasis ? "text-2xl md:text-4xl" : "text-xl md:text-3xl"
          }`}
        >
          {title}
        </h2>
        {emphasis && (
          <span className="font-mono text-[10px] tracking-[0.3em] text-red-600 md:ml-auto">
            ◆ THE WHOLE POINT
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
