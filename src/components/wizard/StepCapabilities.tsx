"use client";

// HELM — wizard step: Capabilities (Phase 6 click-only rewrite).
//
// One ChoiceGenerator per dimension (PEOPLE / TECH / ORG / PROCESSES),
// multi-select up to 4. The picked option payloads become CapabilitySet
// entries on the topology. After picking, each set surfaces a small
// "Refine lifecycle" row of 4 pills (EMERGING / GROWING / MATURE /
// DECLINING) for the user to nudge the lifecycle if the default feels off.

import { useMemo, useState } from "react";
import type {
  CapabilityDimension,
  CapabilitySet,
  CapabilitySetLifecycle,
  StrategicTopology,
} from "@/lib/types";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { ChoiceOption } from "@/lib/staticChoices";

function uid(p: string): string {
  return `${p}_${Math.random().toString(36).slice(2, 8)}`;
}

const DIMENSIONS: { key: CapabilityDimension; title: string }[] = [
  { key: "PEOPLE", title: "People" },
  { key: "TECH", title: "Tech" },
  { key: "ORG", title: "Org" },
  { key: "PROCESSES", title: "Processes" },
];

const LIFECYCLES: CapabilitySetLifecycle[] = [
  "EMERGING",
  "GROWING",
  "MATURE",
  "DECLINING",
];

interface PickedSet {
  optionId: string;
  set: CapabilitySet;
}

export function StepCapabilities({
  topology,
  onChange,
  ownName: _ownName,
  industry,
}: {
  topology: StrategicTopology;
  onChange: (t: StrategicTopology) => void;
  ownName: string;
  industry?: string;
}) {
  const [picksByDim, setPicksByDim] = useState<
    Partial<Record<CapabilityDimension, PickedSet[]>>
  >({});

  const commitTopology = (
    dim: CapabilityDimension,
    sets: PickedSet[],
  ) => {
    // Keep capabilitySets from OTHER dimensions, replace this dim's.
    const others = topology.capabilitySets.filter((s) => s.dimension !== dim);
    onChange({
      ...topology,
      capabilitySets: [...others, ...sets.map((p) => p.set)],
    });
  };

  return (
    <div className="space-y-10">
      {DIMENSIONS.map((d) => (
        <DimensionPanel
          key={d.key}
          dim={d.key}
          title={d.title}
          industry={industry}
          picked={picksByDim[d.key] ?? []}
          onChange={(next) => {
            setPicksByDim((prev) => ({ ...prev, [d.key]: next }));
            commitTopology(d.key, next);
          }}
        />
      ))}
      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed">
        TIP // Capability-Sets are emergent buckets — pick the ones that fit
        how you describe your advantage internally. Lifecycle pills below
        each pick let you nudge from the default (e.g. "this is actually
        DECLINING for us").
      </p>
    </div>
  );
}

function DimensionPanel({
  dim,
  title,
  industry,
  picked,
  onChange,
}: {
  dim: CapabilityDimension;
  title: string;
  industry?: string;
  picked: PickedSet[];
  onChange: (next: PickedSet[]) => void;
}) {
  const ctx = useMemo(
    () => ({ industry: industry ?? "", dimension: dim }),
    [industry, dim],
  );

  const setLifecycle = (optionId: string, lc: CapabilitySetLifecycle) => {
    const next = picked.map((p) =>
      p.optionId === optionId ? { ...p, set: { ...p.set, lifecycle: lc } } : p,
    );
    onChange(next);
  };

  return (
    <div>
      <ChoiceGenerator
        kicker={title.toUpperCase()}
        question={`Your ${title} capability sets`}
        hint="Pick up to 4. Each becomes an emergent capability-set on your topology."
        questionId="capability.set.pick"
        context={ctx}
        count={6}
        multiSelect
        maxPicks={4}
        selected={picked.map((p) => p.optionId)}
        onChange={(ids, opts) => {
          // Build PickedSet for each id. Reuse the existing CapabilitySet
          // (preserves the user's lifecycle pill choice) when the option was
          // already picked.
          const next: PickedSet[] = ids.map((id) => {
            const opt = opts.find((o) => o.id === id);
            const prev = picked.find((p) => p.optionId === id);
            if (prev) return prev;
            const payload = (opt?.payload ?? {}) as Record<string, unknown>;
            const lifecycle =
              (payload.lifecycle as CapabilitySetLifecycle | undefined) ??
              "GROWING";
            return {
              optionId: id,
              set: {
                id: uid("set"),
                name: opt?.label ?? "Unnamed set",
                dimension: dim,
                era: 2020,
                lifecycle,
                source: "STANDARD",
                description: opt?.description,
              },
            };
          });
          onChange(next);
        }}
      />
      {picked.length > 0 && (
        <div className="mt-3 space-y-2">
          {picked.map((p) => (
            <div
              key={p.optionId}
              className="flex items-center justify-between gap-3 border border-ink-200 bg-ink-50 px-3 py-2"
            >
              <span className="font-mono text-[10px] tracking-widest text-ink-700 truncate">
                {p.set.name.toUpperCase()}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[9px] tracking-widest text-ink-500 mr-1">
                  LIFECYCLE //
                </span>
                {LIFECYCLES.map((lc) => (
                  <button
                    key={lc}
                    type="button"
                    onClick={() => setLifecycle(p.optionId, lc)}
                    className={`font-mono text-[9px] tracking-widest px-2 py-0.5 border transition-colors ${
                      p.set.lifecycle === lc
                        ? "border-ink-900 bg-ink-900 text-ink-0"
                        : "border-ink-300 text-ink-600 hover:border-ink-700 hover:text-ink-900"
                    }`}
                  >
                    {lc}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
