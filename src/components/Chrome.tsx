"use client";

import { useEffect, useState } from "react";

export function TopBar({ sessionId }: { sessionId: string }) {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setNow(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="border-b border-ink-300/60 bg-ink-50/80 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 h-12">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Glyph />
            <span className="font-mono text-[11px] tracking-widest text-ink-900">HELM</span>
            <span className="font-mono text-[10px] tracking-widest text-ink-500">// ADVERSARIAL STRATEGY ENGINE</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-mono tracking-wider text-ink-500">
            <span>v0.1.0</span>
            <span>·</span>
            <span>BUILD-2026.05</span>
            <span>·</span>
            <span className="text-ink-700">SESSION {sessionId}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider text-ink-600">
          <span className="hidden sm:inline">CLASSIFICATION // CONFIDENTIAL</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-ink-900 pulse-soft" />
            LIVE
          </span>
          <span>{now}</span>
        </div>
      </div>
      <Ticker />
    </header>
  );
}

function Glyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-ink-900" aria-hidden>
      <rect x="1" y="1" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M6 18 L12 6 L18 18" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Ticker() {
  const items = [
    "PROTOCOL HELM-Δ ACTIVE",
    "MULTI-SCENARIO ROLLOUT ENABLED",
    "MINIMAX-FORWARD TREE / HORIZON 3–5 ROUNDS",
    "OPPONENT MODEL // BAYES-WEIGHTED PRIORS",
    "COUNTER-MOVE LIBRARY 0.4.2",
    "DETERMINISTIC SEED ENABLED",
    "EXPECTED-VALUE × THREAT COMPOSITE SCORE",
    "OBSERVE → ORIENT → DECIDE → ACT",
  ];
  const line = items.join(" • ") + " • ";
  return (
    <div className="border-t border-ink-300/50 overflow-hidden">
      <div className="ticker whitespace-nowrap font-mono text-[10px] tracking-widest text-ink-500 py-1.5">
        <span>{line.repeat(8)}</span>
      </div>
    </div>
  );
}

export function Card({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-ink-300/60 bg-ink-50 ${className}`}>
      <header className="flex items-center justify-between px-3 h-8 border-b border-ink-300/60 bg-ink-100">
        <div className="flex items-center gap-2">
          <span className="text-ink-500 font-mono text-[10px]">[</span>
          <span className="font-mono text-[10px] tracking-widest text-ink-900">{title}</span>
          <span className="text-ink-500 font-mono text-[10px]">]</span>
        </div>
        {meta && <span className="font-mono text-[10px] tracking-wider text-ink-500">{meta}</span>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] tracking-widest text-ink-500 uppercase block mb-1">
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  large = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  large?: boolean;
}) {
  return (
    <div className="border border-ink-300/50 bg-ink-100/40 p-3">
      <Label>{label}</Label>
      <div className={`font-mono text-ink-900 ${large ? "text-2xl" : "text-base"} tracking-tight`}>{value}</div>
      {hint && <div className="font-mono text-[10px] text-ink-500 mt-1 tracking-wider">{hint}</div>}
    </div>
  );
}

export function BarMeter({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 bg-ink-200 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 bg-ink-900" style={{ width: `${pct}%` }} />
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${pct}%`,
          backgroundImage: "linear-gradient(90deg, transparent 0, transparent 3px, rgba(0,0,0,0.4) 3px, rgba(0,0,0,0.4) 4px)",
          backgroundSize: "4px 100%",
        }}
      />
    </div>
  );
}
