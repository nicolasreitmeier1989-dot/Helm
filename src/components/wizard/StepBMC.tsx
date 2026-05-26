"use client";

// HELM — wizard step: Business Model Canvas (Phase 6 click-only rewrite).
//
// One ChoiceGenerator per Osterwalder block, multi-select up to 3. The
// picks become BMCBlock entries on the OWN topology with auto-assigned
// strength (taken from the picked option's payload, or a 65 default if
// the option has no opinion).
//
// Layout intentionally mirrors the Osterwalder grid:
//   row 1: KP | KA | VP | CR | CS
//   row 2:      KR |    | CH |
//   row 3: COST                | REV
//
// On wide screens we render 5 columns and stack the vertically-related
// blocks underneath; below md we collapse to a single column.

import { useMemo, useState } from "react";
import type {
  BMCBlock,
  BMCBlockKind,
  StrategicTopology,
} from "@/lib/types";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { ChoiceOption } from "@/lib/staticChoices";

interface BlockSpec {
  kind: BMCBlockKind;
  title: string;
  questionId: string;
  /** Tailwind grid column placement for the md+ Osterwalder layout. */
  col: string;
}

const SPECS: BlockSpec[] = [
  { kind: "KEY_PARTNERS", title: "Key partners", questionId: "bmc.keyPartners", col: "md:col-span-1 md:row-span-2" },
  { kind: "KEY_ACTIVITIES", title: "Key activities", questionId: "bmc.keyActivities", col: "md:col-span-1 md:row-span-1" },
  { kind: "VALUE_PROPOSITIONS", title: "Value propositions", questionId: "bmc.valuePropositions", col: "md:col-span-1 md:row-span-2" },
  { kind: "CUSTOMER_RELATIONSHIPS", title: "Customer relationships", questionId: "bmc.customerRelationships", col: "md:col-span-1 md:row-span-1" },
  { kind: "CUSTOMER_SEGMENTS", title: "Customer segments", questionId: "bmc.customerSegments", col: "md:col-span-1 md:row-span-2" },
  { kind: "KEY_RESOURCES", title: "Key resources", questionId: "bmc.keyResources", col: "md:col-span-1 md:row-span-1" },
  { kind: "CHANNELS", title: "Channels", questionId: "bmc.channels", col: "md:col-span-1 md:row-span-1" },
  { kind: "COST_STRUCTURE", title: "Cost structure", questionId: "bmc.costStructure", col: "md:col-span-3" },
  { kind: "REVENUE_STREAMS", title: "Revenue streams", questionId: "bmc.revenueStreams", col: "md:col-span-2" },
];

function uid(p: string): string {
  return `${p}_${Math.random().toString(36).slice(2, 8)}`;
}

export function StepBMC({
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
  const ctx = useMemo(
    () => ({ industry: industry ?? "" }),
    [industry],
  );

  // Per-kind picked option ids (session-only — the source of truth lives
  // in the topology). We commit each pick straight to topology via
  // commitBlocks() so the wizard data model stays in sync.
  const [picksByKind, setPicksByKind] = useState<Partial<Record<BMCBlockKind, string[]>>>({});

  const commitBlocks = (kind: BMCBlockKind, picks: ChoiceOption[]) => {
    const others = topology.bmc.blocks.filter((b) => b.kind !== kind);
    const newBlocks: BMCBlock[] = picks.map((o) => {
      const payload = (o.payload ?? {}) as Record<string, unknown>;
      const strength =
        typeof payload.strength === "number" ? (payload.strength as number) : 65;
      return {
        id: uid("bmc"),
        kind,
        label: o.label,
        description: o.description,
        strength,
      };
    });
    onChange({
      ...topology,
      bmc: { blocks: [...others, ...newBlocks] },
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {SPECS.map((spec) => (
          <div key={spec.kind} className={`${spec.col}`}>
            <div className="border border-ink-200 bg-ink-50/30 p-3 h-full">
              <ChoiceGenerator
                kicker={spec.title.toUpperCase()}
                question={`Your ${spec.title.toLowerCase()}`}
                questionId={spec.questionId}
                context={ctx}
                count={6}
                multiSelect
                maxPicks={3}
                selected={picksByKind[spec.kind] ?? []}
                onChange={(ids, opts) => {
                  setPicksByKind((prev) => ({ ...prev, [spec.kind]: ids }));
                  const picked = ids
                    .map((id) => opts.find((o) => o.id === id))
                    .filter((o): o is ChoiceOption => !!o);
                  commitBlocks(spec.kind, picked);
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed">
        TIP // Strong picks (70+) are your moats. Weak picks (≤40) are exactly
        where a competitor would attack. Click + MORE OPTIONS in any block to
        see more candidates.
      </p>
    </div>
  );
}
