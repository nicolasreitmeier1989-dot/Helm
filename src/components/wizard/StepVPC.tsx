"use client";

// HELM — wizard step: Value Proposition Canvases (Phase 4).
//
// One VPC per customer segment defined in the BMC. The AI-Assist button
// extracts a single VPC for a chosen segment from a paragraph.

import { useState } from "react";
import type {
  StrategicTopology,
  ValuePropositionCanvas,
} from "@/lib/types";
import { TopologyEditor } from "@/components/TopologyEditor";
import { AIAssistButton } from "./AIAssistButton";

export function StepVPC({
  topology,
  onChange,
  ownName,
}: {
  topology: StrategicTopology;
  onChange: (t: StrategicTopology) => void;
  ownName: string;
}) {
  const segments = topology.bmc.blocks.filter(
    (b) => b.kind === "CUSTOMER_SEGMENTS",
  );
  const [activeSegId, setActiveSegId] = useState<string | null>(
    segments[0]?.id ?? null,
  );

  if (segments.length === 0) {
    return (
      <div className="border border-ink-300 bg-ink-50 px-5 py-8 text-center">
        <p className="text-[14px] text-ink-700 leading-relaxed mb-2">
          You haven't defined any customer segments yet.
        </p>
        <p className="font-mono text-[10px] tracking-widest text-ink-500">
          GO BACK ONE STEP AND ADD AT LEAST ONE CUSTOMER SEGMENT TO THE BMC.
        </p>
      </div>
    );
  }

  const activeSeg = segments.find((s) => s.id === activeSegId) ?? segments[0];

  const onAI = (data: Record<string, unknown>) => {
    const vpc = data.vpc as ValuePropositionCanvas | undefined;
    if (!vpc) return;
    // Replace VPC for this segment (or add if missing).
    const existing = topology.vpcs.find(
      (v) => v.customerSegmentBlockId === activeSeg.id,
    );
    const next = existing
      ? topology.vpcs.map((v) =>
          v.customerSegmentBlockId === activeSeg.id
            ? { ...vpc, id: existing.id, customerSegmentBlockId: activeSeg.id }
            : v,
        )
      : [
          ...topology.vpcs,
          { ...vpc, customerSegmentBlockId: activeSeg.id },
        ];
    onChange({ ...topology, vpcs: next });
  };

  return (
    <div className="space-y-5">
      {/* Segment selector — only shown when there are multiple segments */}
      {segments.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] tracking-widest text-ink-500">
            SEGMENT //
          </span>
          {segments.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSegId(s.id)}
              className={`font-mono text-[10px] tracking-widest px-2.5 py-1 border transition-colors ${
                activeSeg.id === s.id
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-start justify-end">
        <AIAssistButton
          kind="VPC"
          prompt={`Describe how you serve "${activeSeg.label}" — what jobs they have, their pains, your offer`}
          context={{
            customerSegmentBlockId: activeSeg.id,
            customerSegmentLabel: activeSeg.label,
          }}
          onResult={onAI}
        />
      </div>

      <TopologyEditor
        which="OWN"
        name={ownName}
        topology={topology}
        onChange={onChange}
        initialTab="VPC"
        showTabs={false}
      />
      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed">
        TIP // VPC-Fit (top-right per canvas) is the engine's headline
        measure of how well your offer addresses what the segment actually
        wants.
      </p>
    </div>
  );
}
