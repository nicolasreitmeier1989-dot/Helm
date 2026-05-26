"use client";

// HELM — wizard step: Your move (Phase 6 click-only rewrite).
//
// Three sequential ChoiceGenerators (single-select) for Rumelt's kernel:
// diagnosis → guiding policy → opening move. Each subsequent question
// receives the prior picked payloads as context so the LLM grounds the
// next round of options in the user's choices so far.
//
// No textareas anywhere.

import { useMemo, useState } from "react";
import type { OwnProfile, CompetitorProfile } from "@/lib/types";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { ChoiceOption } from "@/lib/staticChoices";

export function StepMove({
  own,
  onChange,
  competitor,
}: {
  own: OwnProfile;
  onChange: (o: OwnProfile) => void;
  competitor?: CompetitorProfile;
}) {
  // We keep a local label cache so the prior pick still has a human label
  // to show in the kicker even after the option list changed.
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [diagId, setDiagId] = useState<string | null>(null);
  const [polId, setPolId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);

  const recordLabels = (opts: ChoiceOption[]) => {
    setLabels((prev) => {
      const next = { ...prev };
      for (const o of opts) next[o.id] = o.label;
      return next;
    });
  };

  const projectSummary = useMemo(
    () => ({
      own: own.name,
      industry: competitor?.industry ?? "",
      competitor: competitor?.name ?? "",
      intent: own.intent,
    }),
    [own.name, own.intent, competitor],
  );

  return (
    <div className="space-y-10">
      <ChoiceGenerator
        kicker="DIAGNOSIS"
        question="What situation are you trying to address?"
        hint="The competitive reality, in plain language."
        questionId="rumelt.diagnosis"
        context={projectSummary}
        count={6}
        selected={diagId ? [diagId] : []}
        onChange={(ids, opts) => {
          recordLabels(opts);
          const id = ids[0] ?? null;
          setDiagId(id);
          const picked = opts.find((o) => o.id === id);
          onChange({ ...own, diagnosis: picked?.label ?? "" });
        }}
      />

      {diagId && (
        <ChoiceGenerator
          kicker="GUIDING POLICY"
          question="What's your overall approach?"
          hint="The way you'll respond to the diagnosis — your stance, not a list of actions."
          questionId="rumelt.guidingPolicy"
          context={{ ...projectSummary, diagnosis: labels[diagId] }}
          count={6}
          selected={polId ? [polId] : []}
          onChange={(ids, opts) => {
            recordLabels(opts);
            const id = ids[0] ?? null;
            setPolId(id);
            const picked = opts.find((o) => o.id === id);
            onChange({ ...own, guidingPolicy: picked?.label ?? "" });
          }}
        />
      )}

      {polId && (
        <ChoiceGenerator
          kicker="OPENING MOVE"
          question="What's the first concrete move you'll make?"
          hint="One coherent action that implements the policy. The engine simulates competitor reactions starting from here."
          questionId="rumelt.openingMove"
          context={{
            ...projectSummary,
            diagnosis: labels[diagId ?? ""] ?? "",
            guidingPolicy: labels[polId ?? ""] ?? "",
          }}
          count={6}
          selected={moveId ? [moveId] : []}
          onChange={(ids, opts) => {
            recordLabels(opts);
            const id = ids[0] ?? null;
            setMoveId(id);
            const picked = opts.find((o) => o.id === id);
            onChange({ ...own, openingMove: picked?.label ?? "" });
          }}
        />
      )}

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // After Richard Rumelt's "Good Strategy / Bad Strategy" kernel.
        Sharp diagnosis · coherent guiding policy · one concrete opening
        move. Click ↻ REFINE on any round if none of the options fit.
      </p>
    </div>
  );
}
