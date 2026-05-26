"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Parsing your business...",
  "Calibrating threat surface...",
  "Inventing your worst-feared competitor...",
  "Branching the decision tree...",
  "Adjudicating round outcomes...",
  "Compiling postmortem templates...",
];

export function LoadingScreen() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-black text-white">
      {/* Subtle red glow building */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle at center, rgba(220,38,38,0.18), transparent 55%)",
        }}
      />

      <div className="relative text-center">
        <div className="font-mono text-[10px] tracking-[0.5em] text-red-500/80 mb-10">
          THREAT MODELING IN PROGRESS
        </div>

        <div className="relative w-28 h-28 mx-auto mb-10">
          <div className="absolute inset-0 border border-red-500/30 animate-ping" />
          <div
            className="absolute inset-3 border border-red-500/50"
            style={{ animation: "spin 4s linear infinite" }}
          />
          <div
            className="absolute inset-6 border border-red-500/80"
            style={{ animation: "spin 2s linear infinite reverse" }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-5xl text-red-500 font-black">
            ▲
          </div>
        </div>

        <div className="font-mono text-sm text-white/70 h-6">{STAGES[stage]}</div>

        <div className="mt-4 flex gap-1 justify-center">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 w-8 transition-colors duration-300 ${
                i <= stage ? "bg-red-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
