"use client";

import { useId } from "react";
import type { CompetitorProfile, OwnProfile, Posture, Scenario } from "@/lib/types";
import { BarMeter, Card, Label } from "./Chrome";

const POSTURES: Posture[] = ["AGGRESSIVE", "EXPANSIVE", "DEFENSIVE", "OPPORTUNISTIC", "CONSERVATIVE"];

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id}>
          <Label>{label}</Label>
        </label>
        <span className="font-mono text-[11px] text-ink-900">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink-900 cursor-pointer"
      />
      <BarMeter value={((value - min) / (max - min)) * 100} />
    </div>
  );
}

/**
 * OpponentSummary — the legacy posture / warChest / innovation / brand /
 * leadership-bias / signals controls. These remain on the competitor profile
 * as summary signals derived/maintained alongside the full topology.
 */
export function OpponentSummary({
  competitor,
  onChange,
}: {
  competitor: CompetitorProfile;
  onChange: (c: CompetitorProfile) => void;
}) {
  const set = <K extends keyof CompetitorProfile>(k: K, v: CompetitorProfile[K]) =>
    onChange({ ...competitor, [k]: v });

  return (
    <Card title="OPPONENT SUMMARY" meta="LEGACY SIGNALS">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>Codename / Firma</Label>
          <input
            value={competitor.name}
            onChange={(e) => set("name", e.target.value.toUpperCase())}
            className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2 py-1.5 text-[12px] font-mono outline-none focus:border-ink-700"
          />
        </div>
        <div>
          <Label>Industrie / Segment</Label>
          <input
            value={competitor.industry}
            onChange={(e) => set("industry", e.target.value)}
            className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2 py-1.5 text-[12px] outline-none focus:border-ink-700"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Range
            label="Marktanteil"
            value={Math.round(competitor.marketShare * 100)}
            min={0}
            max={80}
            onChange={(v) => set("marketShare", v / 100)}
            suffix="%"
          />
          <Range label="Kriegskasse" value={competitor.warChest} min={0} max={100} onChange={(v) => set("warChest", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Range label="Innovation" value={competitor.innovationIndex} min={0} max={100} onChange={(v) => set("innovationIndex", v)} />
          <Range label="Marke" value={competitor.brandPower} min={0} max={100} onChange={(v) => set("brandPower", v)} />
        </div>
      </div>

      <div className="mt-4">
        <Label>Posture</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {POSTURES.map((p) => (
            <button
              key={p}
              onClick={() => set("posture", p)}
              className={`font-mono text-[9px] tracking-widest py-1.5 border transition-colors ${
                competitor.posture === p
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Range
          label="Leadership-Bias  ◀ Visionär · Optimierer ▶"
          value={competitor.leadershipBias}
          min={-100}
          max={100}
          onChange={(v) => set("leadershipBias", v)}
        />
      </div>

      <div className="mt-4">
        <Label>Beobachtete Signale ({competitor.recentSignals.length})</Label>
        <ul className="space-y-1">
          {competitor.recentSignals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[11.5px] font-mono text-ink-800">
              <span className="text-ink-500 mt-0.5">›</span>
              <input
                value={s}
                onChange={(e) => {
                  const next = [...competitor.recentSignals];
                  next[i] = e.target.value;
                  set("recentSignals", next);
                }}
                className="flex-1 bg-transparent border-b border-dashed border-ink-300 focus:border-ink-700 outline-none py-0.5"
              />
              <button
                onClick={() => set("recentSignals", competitor.recentSignals.filter((_, j) => j !== i))}
                className="text-ink-500 hover:text-ink-900 text-[10px]"
                aria-label="remove signal"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => set("recentSignals", [...competitor.recentSignals, "Neues Signal …"])}
          className="mt-1.5 font-mono text-[10px] tracking-widest text-ink-600 hover:text-ink-900"
        >
          + SIGNAL HINZUFÜGEN
        </button>
      </div>
    </Card>
  );
}

/**
 * OwnSummary — minimal name/intent/horizon controls that pair with the
 * RumeltKernel + TopologyEditor.
 */
export function OwnSummary({
  own,
  onChange,
}: {
  own: OwnProfile;
  onChange: (o: OwnProfile) => void;
}) {
  const set = <K extends keyof OwnProfile>(k: K, v: OwnProfile[K]) => onChange({ ...own, [k]: v });
  return (
    <Card title="OWN SUMMARY" meta="META">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>Unsere Organisation</Label>
          <input
            value={own.name}
            onChange={(e) => set("name", e.target.value.toUpperCase())}
            className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2 py-1.5 text-[12px] font-mono outline-none focus:border-ink-700"
          />
        </div>
        <div>
          <Label>Strategische Intent</Label>
          <textarea
            value={own.intent}
            onChange={(e) => set("intent", e.target.value)}
            rows={2}
            className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2 py-1.5 text-[12px] outline-none focus:border-ink-700 resize-y"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Range label="Horizon (Runden)" value={own.horizonRounds} min={2} max={5} onChange={(v) => set("horizonRounds", v)} />
          <Range label="Branching" value={own.branchingFactor} min={2} max={4} onChange={(v) => set("branchingFactor", v)} />
        </div>
      </div>
    </Card>
  );
}

// ---------- Legacy panels (kept for backward compatibility, no longer
// rendered from page.tsx). External code or tests may still reference them.

export function CompetitorPanel(props: { competitor: CompetitorProfile; onChange: (c: CompetitorProfile) => void }) {
  return <OpponentSummary {...props} />;
}

export function OwnPanel(props: { own: OwnProfile; onChange: (o: OwnProfile) => void }) {
  return <OwnSummary {...props} />;
}

export function ScenarioPanel({
  scenarios,
  onChange,
}: {
  scenarios: Scenario[];
  onChange: (s: Scenario[]) => void;
}) {
  const update = (idx: number, patch: Partial<Scenario>) => {
    const next = scenarios.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  return (
    <Card title="SCENARIO MATRIX" meta={`${scenarios.length} ROLLOUTS`}>
      <div className="space-y-3">
        {scenarios.map((s, i) => (
          <div key={s.id} className="border border-ink-300/60 bg-ink-100/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] tracking-widest text-ink-500">S{i + 1}</span>
              <input
                value={s.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="bg-transparent flex-1 font-mono text-[12px] text-ink-900 border-b border-dashed border-ink-300 focus:border-ink-700 outline-none py-0.5"
              />
              <span className="font-mono text-[10px] text-ink-500">w =</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={s.weight}
                onChange={(e) => update(i, { weight: Math.max(0, Math.min(1, Number(e.target.value))) })}
                className="w-16 bg-ink-100 border border-ink-300/60 text-ink-900 px-1.5 py-0.5 font-mono text-[11px] outline-none"
              />
            </div>
            <textarea
              value={s.description}
              onChange={(e) => update(i, { description: e.target.value })}
              rows={2}
              className="w-full bg-ink-100 border border-ink-300/60 text-ink-800 px-2 py-1.5 text-[11px] outline-none focus:border-ink-700 resize-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POSTURES.map((p) => (
                <button
                  key={p}
                  onClick={() =>
                    update(i, {
                      modifiers: { ...s.modifiers, posture: s.modifiers?.posture === p ? undefined : p },
                    })
                  }
                  className={`font-mono text-[9px] tracking-widest px-1.5 py-1 border transition-colors ${
                    s.modifiers?.posture === p
                      ? "border-ink-900 bg-ink-900 text-ink-0"
                      : "border-ink-300/60 text-ink-600 hover:text-ink-900 hover:border-ink-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
