"use client";

import { useState } from "react";
import type { SimulationRequest } from "@/lib/wargame/types";

type Props = {
  onStart: (req: SimulationRequest) => void;
  error: string | null;
};

const PRESETS: Array<{ label: string; req: SimulationRequest }> = [
  {
    label: "DACH compliance SaaS",
    req: {
      company: "HELM CORP",
      sector: "Regulatory compliance SaaS (DACH)",
      pitch:
        "Mid-market SaaS for BaFin/SOC2/GDPR reporting workflows. 11 years in market, 220 employees, $34M ARR, 92% logo retention.",
    },
  },
  {
    label: "Specialty D2C marketplace",
    req: {
      company: "OAK & MUSK",
      sector: "Specialty D2C marketplace (premium home goods)",
      pitch:
        "Curated marketplace for designer-led furniture, $48M GMV, 1.1M MAUs, 23% repeat purchase. Recent margin compression.",
    },
  },
  {
    label: "Vertical AI agent startup",
    req: {
      company: "STRATA",
      sector: "Vertical AI (legal ops)",
      pitch:
        "Series A AI co-pilot for in-house legal teams. 80 enterprise pilots, $4.5M ARR. Burn high, runway 14 months.",
    },
  },
];

export function SetupScreen({ onStart, error }: Props) {
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [pitch, setPitch] = useState("");

  const canStart = company.trim() && sector.trim() && pitch.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    onStart({ company: company.trim(), sector: sector.trim(), pitch: pitch.trim() });
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Operator-matching topbar */}
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

      <div className="flex-1 flex items-start justify-center px-6 pt-14 pb-20">
        <div className="w-full max-w-2xl">
          <div className="mb-10">
            <div className="font-mono text-[10px] tracking-[0.4em] text-black/40 mb-3">
              04 · BOSS BATTLE
            </div>
            <h1 className="font-black text-5xl md:text-7xl tracking-tighter leading-[0.92]">
              WORST FEARED<br />
              COMPETITOR.<br />
              <span className="text-black/30">FIVE ROUNDS.</span>
            </h1>
            <p className="mt-5 text-black/70 text-base md:text-lg leading-relaxed max-w-xl">
              Type one paragraph about your business. We simulate the worst-feared
              AI-native competitor for you, then play it out — five turn-based
              rounds. You pick a move, they counter, the board evolves. At the
              end you see why, and what to do this week.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="COMPANY" required>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="HELM CORP"
                className="w-full bg-transparent border-b border-black/20 focus:border-black outline-none py-3 text-xl"
              />
            </Field>
            <Field label="SECTOR" required>
              <input
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Regulatory compliance SaaS (DACH)"
                className="w-full bg-transparent border-b border-black/20 focus:border-black outline-none py-3 text-base"
              />
            </Field>
            <Field label="ONE-PARAGRAPH PITCH" required>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                rows={3}
                placeholder="What do you do, who for, how big, what's your edge?"
                className="w-full bg-transparent border border-black/20 hover:border-black/50 focus:border-black outline-none p-4 text-base resize-none"
              />
            </Field>

            {error && (
              <div className="text-red-700 font-mono text-xs border border-red-200 bg-red-50 p-3">
                ERROR: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canStart}
              className="w-full mt-4 py-5 text-base font-mono tracking-[0.3em] bg-black text-white hover:bg-red-600 disabled:bg-black/20 disabled:text-white/60 transition-colors"
            >
              {canStart ? "LAUNCH BATTLE →" : "FILL ALL FIELDS"}
            </button>
          </form>

          <div className="mt-12 pt-6 border-t border-black/10">
            <div className="font-mono text-[10px] tracking-[0.3em] text-black/50 mb-3">
              OR LOAD A PRESET
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setCompany(p.req.company);
                    setSector(p.req.sector);
                    setPitch(p.req.pitch);
                  }}
                  className="text-left text-sm border border-black/15 hover:border-black hover:bg-black hover:text-white p-3 transition-colors group"
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="text-black/50 group-hover:text-white/60 font-mono text-[10px] tracking-widest mt-1 truncate">
                    {p.req.company}
                  </div>
                </button>
              ))}
            </div>
          </div>
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] tracking-[0.3em] text-black/50 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </div>
      {children}
    </label>
  );
}
