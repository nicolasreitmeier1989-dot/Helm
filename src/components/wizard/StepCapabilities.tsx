"use client";

// HELM — wizard step: Capability sets + capabilities (Phase 4).

import type {
  Capability,
  CapabilitySet,
  StrategicTopology,
} from "@/lib/types";
import { TopologyEditor } from "@/components/TopologyEditor";
import { AIAssistButton } from "./AIAssistButton";

export function StepCapabilities({
  topology,
  onChange,
  ownName,
}: {
  topology: StrategicTopology;
  onChange: (t: StrategicTopology) => void;
  ownName: string;
}) {
  const onAI = (data: Record<string, unknown>) => {
    const sets = data.capabilitySets as CapabilitySet[];
    const caps = data.capabilities as Capability[];
    if (!Array.isArray(sets) || !Array.isArray(caps)) return;
    onChange({
      ...topology,
      capabilitySets: sets,
      capabilities: caps,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-end">
        <AIAssistButton
          kind="CAPABILITIES"
          prompt="Describe your team and tech — what you're good at, what's emerging, what's mature"
          onResult={onAI}
        />
      </div>
      <TopologyEditor
        which="OWN"
        name={ownName}
        topology={topology}
        onChange={onChange}
        initialTab="CAPABILITIES"
        showTabs={false}
      />
      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed">
        TIP // Capability-Sets are emergent buckets — name them after how
        you actually describe your advantage internally. High importance +
        low level = a strategic vulnerability the engine will flag.
      </p>
    </div>
  );
}
