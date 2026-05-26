"use client";

// WFC — WFC wizard step 1: Imagine the fear (Phase 6 click-only rewrite).
//
// Three ChoiceGenerators (multi-select, up to 2 picks each). The user
// clicks the workflow attacks, pricing attacks, and data-flywheel
// attacks that would hurt them most. The picked option payloads are
// concatenated into the FearParagraphs shape that downstream WFC steps
// expect, so the rest of the flow stays unchanged.
//
// Context flows forward: Q2 sees Q1's picks, Q3 sees Q1+Q2 — so the
// LLM-generated options for pricing/flywheel can be grounded in the
// already-picked workflow attack.
//
// No more textareas. No more URL paste. No more AIAssistButton.

import { useMemo } from "react";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { ChoiceOption } from "@/lib/staticChoices";

export interface FearParagraphs {
  workflow: string;
  pricing: string;
  flywheel: string;
}

export interface StepImagineState {
  workflow: string[];   // picked option ids
  pricing: string[];
  flywheel: string[];
  // Cached labels so we can reconstruct the FearParagraphs even after the
  // option list refreshed away from the original entries.
  labels: Record<string, string>;
}

export const EMPTY_IMAGINE_STATE: StepImagineState = {
  workflow: [],
  pricing: [],
  flywheel: [],
  labels: {},
};

function paragraphFor(state: StepImagineState, ids: string[]): string {
  return ids
    .map((id) => state.labels[id])
    .filter((s): s is string => !!s)
    .join(" · ");
}

export function stateToFearParagraphs(s: StepImagineState): FearParagraphs {
  return {
    workflow: paragraphFor(s, s.workflow),
    pricing: paragraphFor(s, s.pricing),
    flywheel: paragraphFor(s, s.flywheel),
  };
}

export function StepImagine({
  state,
  onChange,
  industry,
}: {
  state: StepImagineState;
  onChange: (s: StepImagineState) => void;
  /** When known, lets the option-generator personalise per industry. */
  industry?: string;
}) {
  const ctxWorkflow = useMemo(
    () => ({ industry: industry ?? "generic", layer: "workflow" }),
    [industry],
  );

  const ctxPricing = useMemo(
    () => ({
      industry: industry ?? "generic",
      layer: "pricing",
      workflowFears: state.workflow.map((id) => state.labels[id]).filter(Boolean),
    }),
    [industry, state.workflow, state.labels],
  );

  const ctxFlywheel = useMemo(
    () => ({
      industry: industry ?? "generic",
      layer: "flywheel",
      workflowFears: state.workflow.map((id) => state.labels[id]).filter(Boolean),
      pricingFears: state.pricing.map((id) => state.labels[id]).filter(Boolean),
    }),
    [industry, state.workflow, state.pricing, state.labels],
  );

  const recordLabels = (opts: ChoiceOption[]) => {
    const next = { ...state.labels };
    for (const o of opts) next[o.id] = o.label;
    return next;
  };

  return (
    <div className="space-y-10">
      <ChoiceGenerator
        kicker="Q1 // WORKFLOW"
        question="Which part of your workflow do they automate first?"
        hint="Pick up to 2 — the ones that scare you most."
        questionId="wfc.fear.workflow"
        context={ctxWorkflow}
        count={8}
        multiSelect
        maxPicks={2}
        selected={state.workflow}
        onChange={(ids, opts) =>
          onChange({ ...state, workflow: ids, labels: recordLabels(opts) })
        }
      />

      <ChoiceGenerator
        kicker="Q2 // PRICING"
        question="What price do they charge — and what does that do to your margin?"
        hint="Pick up to 2 — the pricing moves that compress your unit economics."
        questionId="wfc.fear.pricing"
        context={ctxPricing}
        count={8}
        multiSelect
        maxPicks={2}
        selected={state.pricing}
        onChange={(ids, opts) =>
          onChange({ ...state, pricing: ids, labels: recordLabels(opts) })
        }
      />

      <ChoiceGenerator
        kicker="Q3 // DATA FLYWHEEL"
        question="What data flywheel are they building that you can't?"
        hint="Pick up to 2 — the compounding assets that get harder to catch every quarter."
        questionId="wfc.fear.flywheel"
        context={ctxFlywheel}
        count={8}
        multiSelect
        maxPicks={2}
        selected={state.flywheel}
        onChange={(ids, opts) =>
          onChange({ ...state, flywheel: ids, labels: recordLabels(opts) })
        }
      />

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // These three click-rounds surface your hidden moat assumptions.
        Use ↻ REFINE if none of the suggestions feel sharp enough.
      </p>
    </div>
  );
}
