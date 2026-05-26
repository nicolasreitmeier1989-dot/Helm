"use client";

// WFC — WFC wizard step 4: Stance (Phase 6 click-only rewrite).
//
// Seven defender-option cards (single-select, radio-style). Picking a
// stance auto-prefills the Rumelt-kernel triple based on the chosen
// pattern + the exposed BMC blocks.
//
// Phase 6: the previously-editable kernel textareas are replaced by a
// read-only summary panel (no typing anywhere in the wizard). If the
// user wants to tweak the prefilled language they can do it later in
// the dashboard editors (deferred to a future phase).

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
            Generated from your picked stance + pattern. Refine later in
            the dashboard editor.
          </p>

          <div className="space-y-3">
            <KernelDisplay kicker="DIAGNOSIS" body={own.diagnosis} />
            <KernelDisplay kicker="GUIDING POLICY" body={own.guidingPolicy} />
            <KernelDisplay kicker="OPENING MOVE" body={own.openingMove} />
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

function KernelDisplay({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="border border-ink-200 bg-ink-50 px-4 py-3">
      <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
        {kicker}
      </div>
      <p className="text-[13.5px] leading-relaxed text-ink-1000">
        {body || <span className="text-ink-400 italic">— not set —</span>}
      </p>
    </div>
  );
}
