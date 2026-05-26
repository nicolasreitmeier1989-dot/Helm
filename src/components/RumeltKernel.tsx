"use client";

import { useId } from "react";
import type { OwnProfile } from "@/lib/types";
import { Card, Label } from "./Chrome";

/**
 * Rumelt's kernel of strategy: Diagnosis, Guiding Policy, Coherent Action.
 * Three textareas; load-bearing for the briefing memo. Kept compact so it
 * sits at the very top of the left column without dominating.
 */
export function RumeltKernel({
  own,
  onChange,
}: {
  own: OwnProfile;
  onChange: (o: OwnProfile) => void;
}) {
  const idDiag = useId();
  const idPol = useId();
  const idMove = useId();
  const set = <K extends keyof OwnProfile>(k: K, v: OwnProfile[K]) =>
    onChange({ ...own, [k]: v });

  return (
    <Card title="RUMELT KERNEL" meta="DIAGNOSIS · POLICY · ACTION">
      <div className="space-y-2.5">
        <Field
          id={idDiag}
          label="Diagnosis — Was ist die Lage?"
          value={own.diagnosis}
          onChange={(v) => set("diagnosis", v)}
          placeholder="Welches strategische Problem versuchen wir zu lösen? In einem Absatz, schmucklos."
        />
        <Field
          id={idPol}
          label="Guiding Policy — Wie gehen wir es an?"
          value={own.guidingPolicy}
          onChange={(v) => set("guidingPolicy", v)}
          placeholder="Der gewählte Ansatz, um die Diagnose zu überwinden."
        />
        <Field
          id={idMove}
          label="Opening Move — Erste kohärente Handlung"
          value={own.openingMove}
          onChange={(v) => set("openingMove", v)}
          placeholder="Die erste konkrete Aktion, die die Policy umsetzt."
        />
      </div>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id}>
        <Label>{label}</Label>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2 py-1.5 text-[11.5px] outline-none focus:border-ink-700 focus:bg-ink-50 transition-colors resize-y font-mono leading-snug"
      />
    </div>
  );
}
