"use client";

import { useId } from "react";
import type { CompetitorProfile, OwnProfile, Posture, Scenario } from "@/lib/types";
import { BarMeter, Card, Label } from "./Chrome";

const POSTURES: Posture[] = ["AGGRESSIVE", "EXPANSIVE", "DEFENSIVE", "OPPORTUNISTIC", "CONSERVATIVE"];

function Input({
  label,
  value,
  onChange,
  mono = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>
        <Label>{label}</Label>
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2.5 py-2 text-[12px] outline-none focus:border-ink-700 focus:bg-ink-50 transition-colors resize-y ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2.5 py-2 text-[12px] outline-none focus:border-ink-700 focus:bg-ink-50 transition-colors ${mono ? "font-mono" : ""}`}
        />
      )}
    </div>
  );
}

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

export function CompetitorPanel({
  competitor,
  onChange,
}: {
  competitor: CompetitorProfile;
  onChange: (c: CompetitorProfile) => void;
}) {
  const set = <K extends keyof CompetitorProfile>(k: K, v: CompetitorProfile[K]) =>
    onChange({ ...competitor, [k]: v });

  return (
    <Card title="OPPONENT PROFILE" meta="UNIT // 01">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Codename / Firma" value={competitor.name} onChange={(v) => set("name", v.toUpperCase())} mono />
        <Input label="Industrie / Segment" value={competitor.industry} onChange={(v) => set("industry", v)} />
        <Range
          label="Marktanteil"
          value={Math.round(competitor.marketShare * 100)}
          min={0}
          max={80}
          onChange={(v) => set("marketShare", v / 100)}
          suffix="%"
        />
        <Range label="Kriegskasse / Liquidität" value={competitor.warChest} min={0} max={100} onChange={(v) => set("warChest", v)} />
        <Range label="Innovationsindex" value={competitor.innovationIndex} min={0} max={100} onChange={(v) => set("innovationIndex", v)} />
        <Range label="Markenmacht" value={competitor.brandPower} min={0} max={100} onChange={(v) => set("brandPower", v)} />
      </div>

      <div className="mt-5">
        <Label>Haltung / Posture</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {POSTURES.map((p) => (
            <button
              key={p}
              onClick={() => set("posture", p)}
              className={`font-mono text-[10px] tracking-widest py-2 border transition-colors ${
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

      <div className="mt-5">
        <Range
          label="Leadership-Bias  ◀ Visionär · Optimierer ▶"
          value={competitor.leadershipBias}
          min={-100}
          max={100}
          onChange={(v) => set("leadershipBias", v)}
        />
      </div>

      <div className="mt-5">
        <Label>Beobachtete Signale ({competitor.recentSignals.length})</Label>
        <ul className="space-y-1">
          {competitor.recentSignals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] font-mono text-ink-800">
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
          className="mt-2 font-mono text-[10px] tracking-widest text-ink-600 hover:text-ink-900"
        >
          + SIGNAL HINZUFÜGEN
        </button>
      </div>
    </Card>
  );
}

export function OwnPanel({
  own,
  onChange,
}: {
  own: OwnProfile;
  onChange: (o: OwnProfile) => void;
}) {
  const set = <K extends keyof OwnProfile>(k: K, v: OwnProfile[K]) => onChange({ ...own, [k]: v });
  return (
    <Card title="OWN POSITION" meta="UNIT // 00">
      <div className="grid grid-cols-1 gap-4">
        <Input label="Unsere Organisation" value={own.name} onChange={(v) => set("name", v.toUpperCase())} mono />
        <Input label="Strategische Intent" value={own.intent} onChange={(v) => set("intent", v)} multiline />
        <Input label="Eröffnungszug (Runde 1)" value={own.openingMove} onChange={(v) => set("openingMove", v)} multiline />
        <div className="grid grid-cols-2 gap-4">
          <Range label="Vorausschau (Runden)" value={own.horizonRounds} min={2} max={5} onChange={(v) => set("horizonRounds", v)} />
          <Range label="Branching pro Knoten" value={own.branchingFactor} min={2} max={4} onChange={(v) => set("branchingFactor", v)} />
        </div>
      </div>
    </Card>
  );
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
