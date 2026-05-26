"use client";

// HELM — wizard step: Business Model Canvas (Phase 4).
//
// Wraps the existing TopologyEditor's BMC tab inside a friendlier shell:
// no dense card chrome, more whitespace, optional AI-Assist button at the
// top-right that paragraph-prompts Claude to fill the canvas.

import type { BMCBlock, StrategicTopology } from "@/lib/types";
import { TopologyEditor } from "@/components/TopologyEditor";
import { AIAssistButton } from "./AIAssistButton";

export function StepBMC({
  topology,
  onChange,
  ownName,
}: {
  topology: StrategicTopology;
  onChange: (t: StrategicTopology) => void;
  ownName: string;
}) {
  const onAI = (data: Record<string, unknown>) => {
    const blocks = data.blocks as BMCBlock[];
    if (!Array.isArray(blocks)) return;
    // Replace (not merge) — the user explicitly asked Claude to fill it.
    onChange({ ...topology, bmc: { blocks } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-end">
        <AIAssistButton
          kind="BMC"
          prompt="Describe your business in a paragraph"
          onResult={onAI}
        />
      </div>
      {/* Reuse the editor as-is. Wizard wrappers don't re-implement the
          underlying editors so future improvements ship to both surfaces. */}
      <TopologyEditor
        which="OWN"
        name={ownName}
        topology={topology}
        onChange={onChange}
        initialTab="BMC"
        showTabs={false}
      />
      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed">
        TIP // Strong strengths (70+) are your moats. Weak strengths (≤40)
        are exactly where a competitor would attack.
      </p>
    </div>
  );
}
