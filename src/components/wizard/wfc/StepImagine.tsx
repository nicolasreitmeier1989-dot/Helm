"use client";

// HELM — WFC wizard step 1: Imagine the fear (Phase 4.5, extended 5Y.2).
//
// Three textareas that surface the user's hidden moat assumptions. The
// answers seed the rest of the WFC flow: the chosen pattern + the fear
// paragraphs are passed to the optional AI-Assist on step 2 to sharpen
// the auto-generated competitor template into something specific to the
// user's industry.
//
// Phase 5Y.2: optional source-import affordance — paste a URL or any raw
// text (press release, earnings call, Wikipedia entry) and Claude turns
// it into a real CompetitorProfile that bypasses the pattern-template
// flow. Useful when the WFC competitor already exists in the market.

import { AIAssistButton } from "@/components/wizard/AIAssistButton";
import type { CompetitorProfile } from "@/lib/types";

export interface FearParagraphs {
  workflow: string;
  pricing: string;
  flywheel: string;
}

export function StepImagine({
  value,
  onChange,
  onImportCompetitor,
}: {
  value: FearParagraphs;
  onChange: (v: FearParagraphs) => void;
  /** Optional: when present, the step exposes an "import from URL / text"
   *  affordance that resolves to a full CompetitorProfile and hands it up. */
  onImportCompetitor?: (c: CompetitorProfile) => void;
}) {
  const set = <K extends keyof FearParagraphs>(k: K, v: string) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-8">
      {onImportCompetitor && (
        <div className="border border-ink-300/60 bg-ink-50 px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
              ALREADY EXISTS? // IMPORT
            </div>
            <p className="text-[12.5px] text-ink-700 leading-relaxed max-w-md">
              If your AI-native competitor is already in the market, skip the
              imagination exercise and paste their URL or any source text —
              Claude will infer the topology directly.
            </p>
          </div>
          <AIAssistButton
            kind="COMPETITOR_BASIC"
            label="✨ IMPORT FROM URL OR TEXT"
            hint="Import from URL or text"
            prompt="Paste a competitor's about page, press release, earnings transcript — anything."
            supportsSourceImport
            onResult={(data) => {
              const ext = data.competitor as CompetitorProfile | undefined;
              if (ext) onImportCompetitor(ext);
            }}
          />
        </div>
      )}

      <Fear
        kicker="Q1 // WORKFLOW"
        question="Which part of your workflow do they automate first?"
        hint="Pick the step or function that, if an AI-native team nailed it, would hurt you most."
        rows={4}
        value={value.workflow}
        onChange={(v) => set("workflow", v)}
      />
      <Fear
        kicker="Q2 // PRICING"
        question="What price do they charge — and what does that do to your margin?"
        hint="Imagine the price. Then work out what it does to your unit economics if it holds."
        rows={4}
        value={value.pricing}
        onChange={(v) => set("pricing", v)}
      />
      <Fear
        kicker="Q3 // DATA FLYWHEEL"
        question="What data flywheel are they building that you can't?"
        hint="The compounding asset that gets harder to catch every quarter."
        rows={4}
        value={value.flywheel}
        onChange={(v) => set("flywheel", v)}
      />

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // These three questions surface your hidden moat assumptions. Be
        specific — vague fear produces vague analysis.
      </p>
    </div>
  );
}

function Fear({
  kicker,
  question,
  hint,
  rows,
  value,
  onChange,
}: {
  kicker: string;
  question: string;
  hint: string;
  rows: number;
  value: string;
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
        placeholder="Write a few sentences. Specific names, numbers, and mechanisms beat abstractions."
      />
    </div>
  );
}
