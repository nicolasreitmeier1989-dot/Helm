"use client";

// HELM — wizard step: Your move (Phase 4).
//
// Three Rumelt-kernel questions in plain language, presented sequentially
// on one screen. Maps directly onto own.diagnosis / own.guidingPolicy /
// own.openingMove.

import type { OwnProfile } from "@/lib/types";

export function StepMove({
  own,
  onChange,
}: {
  own: OwnProfile;
  onChange: (o: OwnProfile) => void;
}) {
  const set = <K extends keyof OwnProfile>(k: K, v: OwnProfile[K]) =>
    onChange({ ...own, [k]: v });

  return (
    <div className="space-y-8">
      <Question
        kicker="DIAGNOSIS"
        question="What situation are you trying to address?"
        hint="The competitive reality, in plain language. What's actually going on?"
        value={own.diagnosis}
        rows={4}
        onChange={(v) => set("diagnosis", v)}
      />
      <Question
        kicker="GUIDING POLICY"
        question="What's your overall approach?"
        hint="The way you'll respond to the diagnosis — your stance, not a list of actions."
        value={own.guidingPolicy}
        rows={4}
        onChange={(v) => set("guidingPolicy", v)}
      />
      <Question
        kicker="OPENING MOVE"
        question="What's the first concrete move you'll make?"
        hint="One coherent action that implements the policy. The engine simulates competitor reactions starting from here."
        value={own.openingMove}
        rows={3}
        onChange={(v) => set("openingMove", v)}
      />

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // After Richard Rumelt's "Good Strategy / Bad Strategy" kernel.
        Sharp diagnosis · coherent guiding policy · one concrete opening
        move.
      </p>
    </div>
  );
}

function Question({
  kicker,
  question,
  hint,
  value,
  rows,
  onChange,
}: {
  kicker: string;
  question: string;
  hint: string;
  value: string;
  rows: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1.5">
        {kicker}
      </div>
      <h3 className="text-[18px] tracking-tight text-ink-1000 mb-1">
        {question}
      </h3>
      <p className="text-[13px] text-ink-600 leading-relaxed mb-3">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-ink-0 border border-ink-300 text-ink-900 px-3 py-2.5 text-[14px] outline-none focus:border-ink-900 transition-colors resize-y leading-relaxed"
      />
    </div>
  );
}
