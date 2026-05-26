"use client";

// HELM — WFC wizard step 2: Pattern (Phase 6 click-only rewrite).
//
// 2-column grid of attack-pattern cards. The user picks 1 or 2 patterns
// (toggle behaviour). The PRIMARY pick drives template generation; a
// SECONDARY pick is informational.
//
// The optional "AI refine" affordance is replaced by a ChoiceGenerator
// styling pick (competitor.refine) — the user clicks a styling angle and
// the topology is updated accordingly. No textareas, no URL paste.

import { useState } from "react";
import {
  AI_NATIVE_PATTERNS,
  competitorFromPattern,
  type AIPattern,
  type AIPatternId,
} from "@/lib/aiNativePatterns";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { CompetitorProfile, Posture } from "@/lib/types";

export function StepPattern({
  picks,
  onPicks,
  industry,
  onAIRefine,
  competitor,
}: {
  picks: AIPatternId[];
  onPicks: (ids: AIPatternId[]) => void;
  industry?: string;
  onAIRefine: (c: CompetitorProfile) => void;
  competitor: CompetitorProfile;
}) {
  const [refineId, setRefineId] = useState<string | null>(null);
  const primary = picks[0];
  const primaryPattern = primary
    ? AI_NATIVE_PATTERNS.find((p) => p.id === primary)
    : undefined;

  const toggle = (id: AIPatternId) => {
    const has = picks.includes(id);
    if (has) {
      onPicks(picks.filter((x) => x !== id));
    } else {
      onPicks([...picks, id].slice(0, 2));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AI_NATIVE_PATTERNS.map((p) => (
          <PatternCard
            key={p.id}
            pattern={p}
            selected={picks.includes(p.id)}
            isPrimary={primary === p.id}
            onClick={() => toggle(p.id)}
          />
        ))}
      </div>

      <div className="border-t border-ink-200 pt-5">
        {primaryPattern ? (
          <ChoiceGenerator
            kicker="REFINE THE CHALLENGER"
            question={`Sharpen the auto-generated ${primaryPattern.name} challenger`}
            hint="Pick a styling angle — adjusts posture, war-chest and innovation index."
            questionId="competitor.refine"
            context={{
              industry: industry ?? "",
              pattern: primaryPattern.name,
            }}
            count={5}
            selected={refineId ? [refineId] : []}
            onChange={(ids, opts) => {
              const id = ids[0] ?? null;
              setRefineId(id);
              const picked = opts.find((o) => o.id === id);
              if (!picked) return;
              const base = competitorFromPattern(primaryPattern, {
                name: competitor.name || undefined,
              });
              const payload = (picked.payload ?? {}) as Record<string, unknown>;
              onAIRefine({
                ...base,
                industry: industry ?? base.industry,
                posture:
                  (payload.posture as Posture | undefined) ?? base.posture,
                innovationIndex:
                  (payload.innovationIndex as number | undefined) ??
                  base.innovationIndex,
                warChest:
                  (payload.warChest as number | undefined) ?? base.warChest,
                brandPower:
                  (payload.brandPower as number | undefined) ?? base.brandPower,
              });
            }}
          />
        ) : (
          <p className="font-mono text-[10px] tracking-widest text-ink-500">
            PICK A PRIMARY PATTERN TO UNLOCK THE REFINEMENT STEP
          </p>
        )}
      </div>
    </div>
  );
}

function PatternCard({
  pattern,
  selected,
  isPrimary,
  onClick,
}: {
  pattern: AIPattern;
  selected: boolean;
  isPrimary: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border px-4 py-4 transition-colors h-full ${
        selected
          ? "border-ink-900 bg-ink-900 text-ink-0"
          : "border-ink-300 bg-ink-0 hover:border-ink-700"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span
          className={`text-[15px] tracking-tight leading-tight ${
            selected ? "text-ink-0" : "text-ink-1000"
          }`}
        >
          {pattern.name}
        </span>
        <span
          className={`font-mono text-[9px] tracking-widest whitespace-nowrap ${
            selected ? "text-ink-300" : "text-ink-500"
          }`}
        >
          {isPrimary
            ? "★ PRIMARY"
            : selected
              ? "+ ADD'L"
              : pattern.timeToImpact.toUpperCase()}
        </span>
      </div>
      <p
        className={`text-[12.5px] leading-snug mb-2 ${
          selected ? "text-ink-200" : "text-ink-700"
        }`}
      >
        {pattern.mechanism}
      </p>
      <div
        className={`font-mono text-[10px] tracking-wider flex flex-wrap gap-x-2 gap-y-0.5 ${
          selected ? "text-ink-300" : "text-ink-500"
        }`}
      >
        <span>EXAMPLES //</span>
        {pattern.examples.map((e, i) => (
          <span key={i}>
            {e}
            {i < pattern.examples.length - 1 ? " ·" : ""}
          </span>
        ))}
      </div>
    </button>
  );
}
