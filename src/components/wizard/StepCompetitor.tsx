"use client";

// WFC — wizard step: Competitor (Phase 6 click-only rewrite).
//
// Two sequential ChoiceGenerators:
//   1. Industry — single-select from `industry.pick`
//   2. Competitor — single-select from `competitor.pick`, scoped to the
//      picked industry
//
// Optional third round: `competitor.refine` — five styling angles
// (Well-funded but slow, Founder-led aggressive, etc.) that adjust the
// competitor topology summary fields. No text inputs, no URL paste.
//
// The detailed-topology expander is preserved as a placeholder note —
// the actual editor lives in TopologyEditor (deferred to a later phase).

import { useMemo, useState } from "react";
import type { CompetitorProfile, Posture } from "@/lib/types";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { ChoiceOption } from "@/lib/staticChoices";

export function StepCompetitor({
  competitor,
  onChange,
  ourBusinessSummary,
  showTopology = true,
  industry,
  onIndustry,
}: {
  competitor: CompetitorProfile;
  onChange: (c: CompetitorProfile) => void;
  ourBusinessSummary?: string;
  /** When true (Deep mode) a placeholder expander reminds the user the
   *  detailed topology editor will arrive in a follow-up phase. */
  showTopology?: boolean;
  /** Optional: when set, the industry step is skipped and the picked
   *  industry is reused (e.g. WFC mode asks industry up-front). */
  industry?: string;
  /** Bubbled callback whenever the user picks/changes the industry here. */
  onIndustry?: (industry: string) => void;
}) {
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [competitorId, setCompetitorId] = useState<string | null>(null);
  const [refineId, setRefineId] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [showTopoNote, setShowTopoNote] = useState(false);

  const recordLabels = (opts: ChoiceOption[]) => {
    setLabels((prev) => {
      const next = { ...prev };
      for (const o of opts) next[o.id] = o.label;
      return next;
    });
  };

  // Industry may be provided from outside (WFC mode asks it up-front);
  // we still let the user re-pick it here unless we have an external one.
  const effectiveIndustry = industry ?? (industryId ? labels[industryId] : "");

  const ctxCompetitor = useMemo(
    () => ({
      industry: effectiveIndustry,
      ourBusiness: ourBusinessSummary ?? "",
    }),
    [effectiveIndustry, ourBusinessSummary],
  );

  const ctxRefine = useMemo(
    () => ({
      industry: effectiveIndustry,
      competitor: competitorId ? labels[competitorId] : "",
    }),
    [effectiveIndustry, competitorId, labels],
  );

  return (
    <div className="space-y-10">
      {!industry && (
        <ChoiceGenerator
          kicker="INDUSTRY"
          question="What industry are you in?"
          hint="Picks here scope all subsequent suggestions."
          questionId="industry.pick"
          context={{}}
          count={8}
          selected={industryId ? [industryId] : []}
          onChange={(ids, opts) => {
            recordLabels(opts);
            const id = ids[0] ?? null;
            setIndustryId(id);
            const picked = opts.find((o) => o.id === id);
            if (picked) {
              onChange({ ...competitor, industry: picked.label });
              onIndustry?.(picked.label);
            }
            // reset downstream picks when industry changes
            setCompetitorId(null);
            setRefineId(null);
          }}
        />
      )}

      {(industry || industryId) && (
        <ChoiceGenerator
          kicker="COMPETITOR"
          question="Who are you up against?"
          hint="Click a typical incumbent or a challenger archetype."
          questionId="competitor.pick"
          context={ctxCompetitor}
          count={8}
          selected={competitorId ? [competitorId] : []}
          onChange={(ids, opts) => {
            recordLabels(opts);
            const id = ids[0] ?? null;
            setCompetitorId(id);
            const picked = opts.find((o) => o.id === id);
            if (picked) {
              const payload = picked.payload ?? {};
              onChange({
                ...competitor,
                name: picked.label.toUpperCase(),
                industry: effectiveIndustry || competitor.industry,
                posture: (payload.posture as Posture | undefined) ?? competitor.posture,
                innovationIndex:
                  (payload.innovationIndex as number | undefined) ?? competitor.innovationIndex,
                warChest:
                  (payload.warChest as number | undefined) ?? competitor.warChest,
                brandPower:
                  (payload.brandPower as number | undefined) ?? competitor.brandPower,
              });
            }
            setRefineId(null);
          }}
        />
      )}

      {competitorId && (
        <ChoiceGenerator
          kicker="REFINE"
          question="Refine the picked competitor's profile?"
          hint="Pick a styling angle — adjusts posture, war-chest and innovation index."
          questionId="competitor.refine"
          context={ctxRefine}
          count={5}
          selected={refineId ? [refineId] : []}
          onChange={(ids, opts) => {
            recordLabels(opts);
            const id = ids[0] ?? null;
            setRefineId(id);
            const picked = opts.find((o) => o.id === id);
            if (picked) {
              const payload = picked.payload ?? {};
              onChange({
                ...competitor,
                posture: (payload.posture as Posture | undefined) ?? competitor.posture,
                innovationIndex:
                  (payload.innovationIndex as number | undefined) ?? competitor.innovationIndex,
                warChest:
                  (payload.warChest as number | undefined) ?? competitor.warChest,
                brandPower:
                  (payload.brandPower as number | undefined) ?? competitor.brandPower,
              });
            }
          }}
        />
      )}

      {showTopology && (
        <div className="border-t border-ink-200 pt-5">
          <button
            type="button"
            onClick={() => setShowTopoNote((v) => !v)}
            className="w-full flex items-center justify-between text-left group py-2"
          >
            <span className="text-[14px] text-ink-900 group-hover:text-ink-1000">
              {showTopoNote
                ? "▾ Hide detailed competitor mapping"
                : "▸ Open detailed competitor mapping"}
            </span>
            <span className="font-mono text-[10px] tracking-widest text-ink-500">
              COMING SOON
            </span>
          </button>
          {showTopoNote && (
            <div className="mt-3 border border-ink-300 bg-ink-50 px-4 py-4">
              <p className="text-[12.5px] text-ink-700 leading-relaxed">
                Detailed topology editor coming in the next phase. For now,
                your picked competitor profile will use sensible defaults
                derived from the chosen archetype and the refinement angle
                above.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // Don't see the right competitor? Click + MORE OPTIONS to load a
        fresh set, or ↻ REFINE for a different angle.
      </p>
    </div>
  );
}
