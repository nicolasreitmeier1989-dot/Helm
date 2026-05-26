"use client";

// HELM — WFC wizard step 2: Pattern (Phase 4.5).
//
// 2-column grid of 7 attack-pattern cards. The user picks 1 or 2 patterns
// (toggle behaviour). The PRIMARY pick (first selected) drives template
// generation; a SECONDARY pick is recorded but currently informational
// only. Optional AI-Assist (after a primary is picked) refines the
// auto-template into something specific to the user's stated fears.

import { useState } from "react";
import { AI_NATIVE_PATTERNS, type AIPattern, type AIPatternId } from "@/lib/aiNativePatterns";
import { AIAssistButton } from "@/components/wizard/AIAssistButton";
import type { CompetitorProfile } from "@/lib/types";
import type { FearParagraphs } from "./StepImagine";

export function StepPattern({
  picks,
  onPicks,
  fears,
  onAIRefine,
}: {
  picks: AIPatternId[];
  onPicks: (ids: AIPatternId[]) => void;
  fears: FearParagraphs;
  onAIRefine: (c: CompetitorProfile) => void;
}) {
  const [refined, setRefined] = useState(false);
  const primary = picks[0];
  const primaryPattern = primary
    ? AI_NATIVE_PATTERNS.find((p) => p.id === primary)
    : undefined;

  const toggle = (id: AIPatternId) => {
    const has = picks.includes(id);
    if (has) {
      onPicks(picks.filter((x) => x !== id));
    } else {
      // cap at 2
      onPicks([...picks, id].slice(0, 2));
    }
  };

  const onAI = (data: Record<string, unknown>) => {
    const c = data.competitor as CompetitorProfile | undefined;
    if (!c) return;
    onAIRefine(c);
    setRefined(true);
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
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
                AI-ASSIST // OPTIONAL
              </div>
              <p className="text-[13px] text-ink-700 leading-relaxed mb-2">
                Sharpen the auto-generated <strong>{primaryPattern.name}</strong>{" "}
                challenger using your three fear-paragraphs — Claude will infer
                your industry and refine the name, posture, capability sets and
                BMC sketch.
              </p>
            </div>
            <div className="flex justify-end">
              <AIAssistButton
                kind="AI_NATIVE_COMPETITOR"
                prompt="Refining the AI-native challenger based on your fears + the pattern you picked."
                context={{
                  patternName: primaryPattern.name,
                  fearWorkflow: fears.workflow,
                  fearPricing: fears.pricing,
                  fearFlywheel: fears.flywheel,
                }}
                onResult={onAI}
              />
            </div>
            {refined && (
              <div className="border border-ink-900 bg-ink-50 px-3 py-2 font-mono text-[10px] tracking-widest text-ink-900">
                ✓ TEMPLATE REFINED · ADVANCE TO REVIEW EXPOSURE
              </div>
            )}
          </div>
        ) : (
          <p className="font-mono text-[10px] tracking-widest text-ink-500">
            PICK A PRIMARY PATTERN TO UNLOCK AI-ASSIST
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
