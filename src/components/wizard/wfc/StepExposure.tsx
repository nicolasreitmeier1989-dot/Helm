"use client";

// WFC — WFC wizard step 3: Exposure (Phase 4.5).
//
// Reviews and edits the auto-generated exposure derived from the chosen
// pattern. Two columns: left lists OUR BMC blocks the pattern attacks
// (with strength sliders so the user can quickly fill the OWN topology);
// right lists OUR capability sets exposed by lifecycle (DECLINING /
// MATURE in the pattern's dimension are highlighted as high exposure).
//
// "Skip with defaults" is offered as a quick exit: it materialises a
// minimal OWN topology straight from the pattern's exposedBlocks list so
// the engine has SOMETHING to chew on at simulation time.

import { AI_NATIVE_PATTERNS, type AIPatternId } from "@/lib/aiNativePatterns";
import type {
  BMCBlock,
  BMCBlockKind,
  CapabilitySet,
  CapabilitySetLifecycle,
  StrategicTopology,
} from "@/lib/types";

function uid(p: string): string {
  return `${p}_${Math.random().toString(36).slice(2, 8)}`;
}

const BMC_LABEL: Record<BMCBlockKind, string> = {
  CUSTOMER_SEGMENTS: "Customer segments",
  VALUE_PROPOSITIONS: "Value propositions",
  CHANNELS: "Channels",
  CUSTOMER_RELATIONSHIPS: "Customer relationships",
  REVENUE_STREAMS: "Revenue streams",
  KEY_RESOURCES: "Key resources",
  KEY_ACTIVITIES: "Key activities",
  KEY_PARTNERS: "Key partners",
  COST_STRUCTURE: "Cost structure",
};

// Lifecycle → exposure score for the picker's "high / medium / low" tag.
function lifecycleExposureTag(lc: CapabilitySetLifecycle): {
  label: string;
  tone: "high" | "med" | "low";
} {
  switch (lc) {
    case "DECLINING":
    case "OBSOLETE":
      return { label: "HIGH", tone: "high" };
    case "MATURE":
      return { label: "MED", tone: "med" };
    default:
      return { label: "LOW", tone: "low" };
  }
}

export function StepExposure({
  patternId,
  ownTopology,
  onChange,
  onUseDefaults,
}: {
  patternId: AIPatternId | undefined;
  ownTopology: StrategicTopology;
  onChange: (next: StrategicTopology) => void;
  onUseDefaults: () => void;
}) {
  const pattern = patternId
    ? AI_NATIVE_PATTERNS.find((p) => p.id === patternId)
    : undefined;

  if (!pattern) {
    return (
      <div className="font-mono text-[11px] tracking-wider text-ink-700">
        Pick a pattern first.
      </div>
    );
  }

  // Filter OUR topology by what the pattern targets — those are the rows we render.
  const exposedBlocks = ownTopology.bmc.blocks.filter((b) =>
    pattern.exposedBlocks.includes(b.kind),
  );
  const exposedSets = ownTopology.capabilitySets.filter((s) =>
    pattern.exposedDimensions.includes(s.dimension),
  );

  const updateBlockStrength = (id: string, strength: number) => {
    onChange({
      ...ownTopology,
      bmc: {
        blocks: ownTopology.bmc.blocks.map((b) =>
          b.id === id ? { ...b, strength } : b,
        ),
      },
    });
  };

  const updateSetLifecycle = (id: string, lifecycle: CapabilitySetLifecycle) => {
    onChange({
      ...ownTopology,
      capabilitySets: ownTopology.capabilitySets.map((s) =>
        s.id === id ? { ...s, lifecycle } : s,
      ),
    });
  };

  const addMissingBlock = (kind: BMCBlockKind) => {
    const block: BMCBlock = {
      id: uid("bmc"),
      kind,
      label: `Our ${BMC_LABEL[kind].toLowerCase()}`,
      strength: 50,
    };
    onChange({
      ...ownTopology,
      bmc: { blocks: [...ownTopology.bmc.blocks, block] },
    });
  };

  const missingKinds = pattern.exposedBlocks.filter(
    (k) => !ownTopology.bmc.blocks.some((b) => b.kind === k),
  );

  return (
    <div className="space-y-6">
      <div className="border border-ink-300 bg-ink-50 px-4 py-3 flex items-start justify-between gap-4">
        <div className="text-[13px] text-ink-700 leading-relaxed">
          The <strong className="text-ink-1000">{pattern.name}</strong> pattern
          lands hardest on these parts of your business. Review the
          auto-detected exposure, edit the strength sliders, and adjust
          lifecycles if needed.
        </div>
        <button
          type="button"
          onClick={onUseDefaults}
          className="font-mono text-[10px] tracking-widest whitespace-nowrap border border-ink-700 px-3 py-1.5 hover:bg-ink-900 hover:text-ink-0 transition-colors"
        >
          USE DEFAULTS →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT — BMC blocks */}
        <section>
          <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-2">
            EXPOSED BMC BLOCKS
          </div>
          {exposedBlocks.length === 0 ? (
            <p className="text-[12px] text-ink-600 italic mb-3">
              No matching BMC blocks yet. Add the relevant kinds below.
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {exposedBlocks.map((b) => (
                <div key={b.id} className="border border-ink-900 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-[13px] text-ink-1000 leading-tight">
                      {b.label}
                    </span>
                    <span className="font-mono text-[9px] tracking-widest text-ink-500">
                      {BMC_LABEL[b.kind].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={b.strength}
                      onChange={(e) =>
                        updateBlockStrength(b.id, parseInt(e.target.value, 10))
                      }
                      className="flex-1"
                    />
                    <span className="font-mono text-[10px] text-ink-700 w-8 text-right">
                      {b.strength}
                    </span>
                  </div>
                  <div className="font-mono text-[9px] tracking-wider text-ink-500 mt-0.5">
                    STRENGTH · HIGH = MORE DEFENSIBLE
                  </div>
                </div>
              ))}
            </div>
          )}
          {missingKinds.length > 0 && (
            <div className="border border-dashed border-ink-300 p-3">
              <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1.5">
                MISSING BLOCKS THIS PATTERN ATTACKS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingKinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => addMissingBlock(k)}
                    className="font-mono text-[10px] tracking-widest border border-ink-400 px-2 py-1 hover:border-ink-900 hover:text-ink-1000"
                  >
                    + {BMC_LABEL[k].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT — capability sets */}
        <section>
          <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-2">
            EXPOSED CAPABILITY SETS
          </div>
          {exposedSets.length === 0 ? (
            <p className="text-[12px] text-ink-600 italic">
              No capability sets in the targeted dimensions yet. You can fill
              these in detail from the dashboard later — defaults below will
              still let the engine simulate the attack.
            </p>
          ) : (
            <div className="space-y-2">
              {exposedSets.map((s) => (
                <SetRow
                  key={s.id}
                  set={s}
                  onLifecycleChange={(lc) => updateSetLifecycle(s.id, lc)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="font-mono text-[10px] tracking-widest text-ink-500 leading-relaxed pt-2">
        TIP // Low strength (≤40) on an exposed block is where the attack
        lands first. DECLINING/MATURE sets in an attacked dimension are the
        ones most at risk.
      </p>
    </div>
  );
}

function SetRow({
  set,
  onLifecycleChange,
}: {
  set: CapabilitySet;
  onLifecycleChange: (lc: CapabilitySetLifecycle) => void;
}) {
  const tag = lifecycleExposureTag(set.lifecycle);
  const lifecycles: CapabilitySetLifecycle[] = [
    "EMERGING",
    "GROWING",
    "MATURE",
    "DECLINING",
    "OBSOLETE",
  ];
  return (
    <div className="border border-ink-900 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-[13px] text-ink-1000 leading-tight">
          {set.name}
        </span>
        <span
          className={`font-mono text-[9px] tracking-widest ${
            tag.tone === "high"
              ? "text-ink-1000 bg-ink-900 text-ink-0 px-1.5"
              : tag.tone === "med"
                ? "text-ink-900"
                : "text-ink-500"
          }`}
        >
          {tag.label}
        </span>
      </div>
      <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1.5">
        {set.dimension} · ERA {set.era}
      </div>
      <div className="flex flex-wrap gap-1">
        {lifecycles.map((lc) => (
          <button
            key={lc}
            type="button"
            onClick={() => onLifecycleChange(lc)}
            className={`font-mono text-[9px] tracking-widest px-2 py-1 border transition-colors ${
              set.lifecycle === lc
                ? "border-ink-900 bg-ink-900 text-ink-0"
                : "border-ink-300 text-ink-700 hover:border-ink-700"
            }`}
          >
            {lc}
          </button>
        ))}
      </div>
    </div>
  );
}
