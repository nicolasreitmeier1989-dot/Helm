"use client";

// HELM — WFC wizard step 4: Stance (Phase 4.5).
//
// Seven defender-option cards (single-select, radio-style). Picking a
// stance auto-prefills three Rumelt-kernel textareas based on the chosen
// pattern + the exposed BMC blocks. The user can edit any of the three
// before finishing — they become own.diagnosis / own.guidingPolicy /
// own.openingMove on the final project.

import { useEffect } from "react";
import { AI_NATIVE_PATTERNS, type AIPatternId } from "@/lib/aiNativePatterns";
import {
  DEFENDER_OPTIONS,
  rumeltFromStance,
  type DefenderOption,
  type DefenderOptionId,
} from "@/lib/defenderOptions";
import type { OwnProfile, StrategicTopology } from "@/lib/types";

export function StepStance({
  patternId,
  stanceId,
  onStanceId,
  ownTopology,
  own,
  onOwnChange,
}: {
  patternId: AIPatternId | undefined;
  stanceId: DefenderOptionId | undefined;
  onStanceId: (id: DefenderOptionId) => void;
  ownTopology: StrategicTopology;
  own: OwnProfile;
  onOwnChange: (o: OwnProfile) => void;
}) {
  const pattern = patternId
    ? AI_NATIVE_PATTERNS.find((p) => p.id === patternId)
    : undefined;
  const stance = stanceId
    ? DEFENDER_OPTIONS.find((o) => o.id === stanceId)
    : undefined;

  // Labels of OUR exposed BMC blocks — used to fill the diagnosis sentence.
  const exposedBlockLabels = pattern
    ? ownTopology.bmc.blocks
        .filter((b) => pattern.exposedBlocks.includes(b.kind))
        .map((b) => b.label)
    : [];

  // Auto-prefill the Rumelt-kernel triple when the user changes stance.
  useEffect(() => {
    if (!pattern || !stance) return;
    const triple = rumeltFromStance(stance, pattern, exposedBlockLabels);
    onOwnChange({
      ...own,
      diagnosis: triple.diagnosis,
      guidingPolicy: triple.guidingPolicy,
      openingMove: triple.openingMove,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stanceId]);

  const handlePick = (id: DefenderOptionId) => {
    onStanceId(id);
  };

  const setKernel = <K extends "diagnosis" | "guidingPolicy" | "openingMove">(
    k: K,
    v: string,
  ) => onOwnChange({ ...own, [k]: v });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEFENDER_OPTIONS.map((o) => (
          <StanceCard
            key={o.id}
            option={o}
            selected={stanceId === o.id}
            onClick={() => handlePick(o.id)}
          />
        ))}
      </div>

      {stance && (
        <div className="border-t border-ink-200 pt-6">
          <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
            STANCE // {stance.name.toUpperCase()}
          </div>
          <h2 className="text-[20px] tracking-tight text-ink-1000 leading-tight mb-1">
            Your opening move, prefilled
          </h2>
          <p className="text-[13px] text-ink-600 leading-relaxed mb-5">
            Edit any of the three fields. They become the strategic kernel the
            simulation rolls out from.
          </p>

          <div className="space-y-6">
            <Kernel
              kicker="DIAGNOSIS"
              question="What situation are you trying to address?"
              value={own.diagnosis}
              rows={4}
              onChange={(v) => setKernel("diagnosis", v)}
            />
            <Kernel
              kicker="GUIDING POLICY"
              question="What's your overall approach?"
              value={own.guidingPolicy}
              rows={4}
              onChange={(v) => setKernel("guidingPolicy", v)}
            />
            <Kernel
              kicker="OPENING MOVE"
              question="What's the first concrete move you'll make?"
              value={own.openingMove}
              rows={3}
              onChange={(v) => setKernel("openingMove", v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StanceCard({
  option,
  selected,
  onClick,
}: {
  option: DefenderOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border px-4 py-3 transition-colors h-full ${
        selected
          ? "border-ink-900 bg-ink-900 text-ink-0"
          : "border-ink-300 bg-ink-0 hover:border-ink-700"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span
          className={`text-[14px] tracking-tight leading-tight ${
            selected ? "text-ink-0" : "text-ink-1000"
          }`}
        >
          {option.name}
        </span>
        <span
          className={`font-mono text-[9px] tracking-widest whitespace-nowrap ${
            selected ? "text-ink-300" : "text-ink-500"
          }`}
        >
          {selected ? "● PICKED" : "○ SELECT"}
        </span>
      </div>
      <p
        className={`text-[12px] leading-snug ${
          selected ? "text-ink-200" : "text-ink-700"
        }`}
      >
        {option.whenItFits}
      </p>
    </button>
  );
}

function Kernel({
  kicker,
  question,
  value,
  rows,
  onChange,
}: {
  kicker: string;
  question: string;
  value: string;
  rows: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
        {kicker}
      </div>
      <h3 className="text-[16px] tracking-tight text-ink-1000 mb-2">
        {question}
      </h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-ink-0 border border-ink-300 text-ink-900 px-3 py-2.5 text-[14px] outline-none focus:border-ink-900 transition-colors resize-y leading-relaxed"
      />
    </div>
  );
}
