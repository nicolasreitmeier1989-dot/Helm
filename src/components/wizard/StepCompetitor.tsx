"use client";

// HELM — wizard step: Competitor (Phase 4).
//
// Primary affordance: name + industry. Full topology mapping is collapsed
// behind an expander so Express users aren't asked to model their
// competitor's BMC. The AI-Assist button sketches a full competitor
// profile (BMC + 1–2 VPCs + capability sets) from a paragraph.

import { useState } from "react";
import type { CompetitorProfile } from "@/lib/types";
import { TopologyEditor } from "@/components/TopologyEditor";
import { AIAssistButton } from "./AIAssistButton";

export function StepCompetitor({
  competitor,
  onChange,
  ourBusinessSummary,
  showTopology = true,
}: {
  competitor: CompetitorProfile;
  onChange: (c: CompetitorProfile) => void;
  ourBusinessSummary?: string;
  /** When true (Deep mode) the topology expander is rendered. Express mode hides it. */
  showTopology?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const onAI = (data: Record<string, unknown>) => {
    const ext = data.competitor as CompetitorProfile | undefined;
    if (!ext) return;
    onChange(ext);
    setExpanded(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-end">
        <AIAssistButton
          kind="COMPETITOR_BASIC"
          prompt="Describe their business — who they sell to, what they do well, where they're vulnerable"
          context={{ ourBusiness: ourBusinessSummary }}
          onResult={onAI}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="font-mono text-[10px] tracking-widest text-ink-500 block mb-1.5">
            COMPETITOR NAME
          </label>
          <input
            value={competitor.name}
            onChange={(e) =>
              onChange({ ...competitor, name: e.target.value.toUpperCase() })
            }
            placeholder="MERIDIAN INDUSTRIES"
            className="w-full bg-ink-0 border border-ink-300 text-ink-900 px-3 py-2.5 text-[15px] font-mono outline-none focus:border-ink-900 transition-colors"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] tracking-widest text-ink-500 block mb-1.5">
            INDUSTRY / SEGMENT
          </label>
          <input
            value={competitor.industry}
            onChange={(e) =>
              onChange({ ...competitor, industry: e.target.value })
            }
            placeholder="Enterprise SaaS / Compliance"
            className="w-full bg-ink-0 border border-ink-300 text-ink-900 px-3 py-2.5 text-[15px] outline-none focus:border-ink-900 transition-colors"
          />
        </div>
      </div>

      {showTopology && (
        <div className="border-t border-ink-200 pt-5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-left group py-2"
          >
            <span className="text-[14px] text-ink-900 group-hover:text-ink-1000">
              {expanded ? "▾ Hide detailed competitor mapping" : "▸ Open detailed competitor mapping"}
            </span>
            <span className="font-mono text-[10px] tracking-widest text-ink-500">
              OPTIONAL
            </span>
          </button>
          <p className="text-[12.5px] text-ink-600 leading-relaxed mt-1">
            Map the competitor's BMC, capability sets and value propositions
            in detail. Skip and the engine uses sensible defaults from name +
            industry.
          </p>

          {expanded && (
            <div className="mt-5">
              <TopologyEditor
                which="OPPONENT"
                name={competitor.name}
                topology={competitor.topology}
                onChange={(next) => onChange({ ...competitor, topology: next })}
              />
            </div>
          )}
        </div>
      )}

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // Name + industry are enough to get a useful first rollout.
        You can deepen the competitor model later from the dashboard.
      </p>
    </div>
  );
}
