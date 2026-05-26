"use client";

// WFC — wizard step: Value Proposition Canvases (Phase 6 click-only rewrite).
//
// Per customer-segment derived from the BMC step:
//   - 3 click-rounds for customer-profile (jobs / pains / gains)
//   - 3 click-rounds for value-map (products / pain relievers / gain creators)
//
// Multi-select up to 4 per side. The VPC-fit score is computed live as
// the simple overlap signal (number of items per side).

import { useMemo, useState } from "react";
import type {
  StrategicTopology,
  ValuePropositionCanvas,
  VPCItem,
} from "@/lib/types";
import { ChoiceGenerator } from "@/components/choice/ChoiceGenerator";
import type { ChoiceOption } from "@/lib/staticChoices";

function uid(p: string): string {
  return `${p}_${Math.random().toString(36).slice(2, 8)}`;
}

type Side =
  | "jobs"
  | "pains"
  | "gains"
  | "productsServices"
  | "painRelievers"
  | "gainCreators";

const ROUNDS: Array<{
  side: Side;
  title: string;
  question: string;
  hint: string;
  questionId: string;
  group: "PROFILE" | "MAP";
}> = [
  { side: "jobs",            title: "Jobs",            question: "What jobs is this segment trying to get done?",  hint: "Functional, emotional, social — pick up to 4.", questionId: "vpc.jobs", group: "PROFILE" },
  { side: "pains",           title: "Pains",           question: "What pains do they feel today?",                 hint: "What blocks them, slows them, costs them. Up to 4.", questionId: "vpc.pains", group: "PROFILE" },
  { side: "gains",           title: "Gains",           question: "What gains would they value?",                   hint: "Required, expected, desired, unexpected. Up to 4.", questionId: "vpc.gains", group: "PROFILE" },
  { side: "productsServices",title: "Products / services", question: "What do you actually deliver them?",         hint: "Products, services, software. Up to 4.", questionId: "vpc.productsServices", group: "MAP" },
  { side: "painRelievers",   title: "Pain relievers",  question: "What of your offer relieves their pains?",        hint: "Direct mappings to the pains above. Up to 4.", questionId: "vpc.painRelievers", group: "MAP" },
  { side: "gainCreators",    title: "Gain creators",   question: "What of your offer creates their gains?",         hint: "Direct mappings to the gains above. Up to 4.", questionId: "vpc.gainCreators", group: "MAP" },
];

interface SegmentState {
  picks: Partial<Record<Side, ChoiceOption[]>>;
  skipped: boolean;
}

const EMPTY_SEG_STATE: SegmentState = { picks: {}, skipped: false };

export function StepVPC({
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
  const segments = topology.bmc.blocks.filter(
    (b) => b.kind === "CUSTOMER_SEGMENTS",
  );
  const [activeId, setActiveId] = useState<string | null>(
    segments[0]?.id ?? null,
  );
  const [statesBySeg, setStatesBySeg] = useState<Record<string, SegmentState>>(
    {},
  );

  if (segments.length === 0) {
    return (
      <div className="border border-ink-300 bg-ink-50 px-5 py-8 text-center">
        <p className="text-[14px] text-ink-700 leading-relaxed mb-2">
          You haven't picked any customer segments yet.
        </p>
        <p className="font-mono text-[10px] tracking-widest text-ink-500">
          GO BACK ONE STEP AND PICK AT LEAST ONE CUSTOMER SEGMENT IN THE BMC.
        </p>
      </div>
    );
  }

  const activeSeg = segments.find((s) => s.id === activeId) ?? segments[0];
  const segState = statesBySeg[activeSeg.id] ?? EMPTY_SEG_STATE;
  const ctx = useMemo(
    () => ({ industry: industry ?? "", customerSegmentLabel: activeSeg.label }),
    [industry, activeSeg.label],
  );

  const setSegState = (next: SegmentState) => {
    const updated = { ...statesBySeg, [activeSeg.id]: next };
    setStatesBySeg(updated);
    commitTopology(activeSeg.id, next);
  };

  const commitTopology = (segId: string, st: SegmentState) => {
    if (st.skipped) {
      // remove any existing VPC for this segment
      const next = topology.vpcs.filter((v) => v.customerSegmentBlockId !== segId);
      onChange({ ...topology, vpcs: next });
      return;
    }
    const items = (side: Side): VPCItem[] =>
      (st.picks[side] ?? []).map((o) => ({
        id: uid("vpc"),
        label: o.label,
        weight:
          typeof (o.payload as Record<string, unknown>).weight === "number"
            ? ((o.payload as Record<string, unknown>).weight as number)
            : 65,
      }));
    const existing = topology.vpcs.find(
      (v) => v.customerSegmentBlockId === segId,
    );
    const vpc: ValuePropositionCanvas = {
      id: existing?.id ?? uid("vpc-canvas"),
      customerSegmentBlockId: segId,
      customerProfile: {
        jobs: items("jobs"),
        pains: items("pains"),
        gains: items("gains"),
      },
      valueMap: {
        productsServices: items("productsServices"),
        painRelievers: items("painRelievers"),
        gainCreators: items("gainCreators"),
      },
    };
    const others = topology.vpcs.filter(
      (v) => v.customerSegmentBlockId !== segId,
    );
    onChange({ ...topology, vpcs: [...others, vpc] });
  };

  // Lightweight fit score: overlap signal between profile and map sides.
  const fitScore = useMemo(() => {
    const profileCount =
      (segState.picks.jobs?.length ?? 0) +
      (segState.picks.pains?.length ?? 0) +
      (segState.picks.gains?.length ?? 0);
    const mapCount =
      (segState.picks.productsServices?.length ?? 0) +
      (segState.picks.painRelievers?.length ?? 0) +
      (segState.picks.gainCreators?.length ?? 0);
    if (profileCount === 0 || mapCount === 0) return 0;
    return Math.round(Math.min(100, ((profileCount + mapCount) / 24) * 100));
  }, [segState.picks]);

  return (
    <div className="space-y-6">
      {segments.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] tracking-widest text-ink-500">
            SEGMENT //
          </span>
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
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

      <div className="flex items-center justify-between border border-ink-200 bg-ink-50 px-3 py-2">
        <div className="font-mono text-[10px] tracking-widest text-ink-700">
          VPC // {activeSeg.label.toUpperCase()}
        </div>
        <div className="font-mono text-[10px] tracking-widest text-ink-900">
          FIT-SCORE // {fitScore}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-8">
          <div className="font-mono text-[10px] tracking-widest text-ink-500">
            CUSTOMER PROFILE
          </div>
          {ROUNDS.filter((r) => r.group === "PROFILE").map((r) => (
            <ChoiceGenerator
              key={r.side}
              kicker={r.title.toUpperCase()}
              question={r.question}
              hint={r.hint}
              questionId={r.questionId}
              context={ctx}
              count={6}
              multiSelect
              maxPicks={4}
              selected={(segState.picks[r.side] ?? []).map((o) => o.id)}
              onChange={(ids, opts) => {
                const picked = ids
                  .map((id) => opts.find((o) => o.id === id))
                  .filter((o): o is ChoiceOption => !!o);
                setSegState({
                  ...segState,
                  skipped: false,
                  picks: { ...segState.picks, [r.side]: picked },
                });
              }}
            />
          ))}
        </div>
        <div className="space-y-8">
          <div className="font-mono text-[10px] tracking-widest text-ink-500">
            VALUE MAP
          </div>
          {ROUNDS.filter((r) => r.group === "MAP").map((r) => (
            <ChoiceGenerator
              key={r.side}
              kicker={r.title.toUpperCase()}
              question={r.question}
              hint={r.hint}
              questionId={r.questionId}
              context={ctx}
              count={6}
              multiSelect
              maxPicks={4}
              selected={(segState.picks[r.side] ?? []).map((o) => o.id)}
              onChange={(ids, opts) => {
                const picked = ids
                  .map((id) => opts.find((o) => o.id === id))
                  .filter((o): o is ChoiceOption => !!o);
                setSegState({
                  ...segState,
                  skipped: false,
                  picks: { ...segState.picks, [r.side]: picked },
                });
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() =>
            setSegState({
              ...EMPTY_SEG_STATE,
              skipped: true,
            })
          }
          className="font-mono text-[10px] tracking-widest text-ink-500 hover:text-ink-1000"
        >
          ○ SKIP THIS SEGMENT
        </button>
      </div>

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed">
        TIP // VPC-Fit (top of the canvas) is the engine's headline measure of
        how well your offer covers what the segment actually wants.
      </p>
    </div>
  );
}
