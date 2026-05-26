"use client";

// HELM — wizard route (Phase 4 + 4.5).
//
// /start opens with a ModeChooser (WFC / Quick / Deep). Once a mode is
// picked, the WizardShell drives the user through the steps. The final
// "Next" persists an active project to localStorage and redirects to
// /dashboard.
//
// Phase 4.5: `?mode=wfc` skips the chooser and jumps straight into the
// WFC step flow (Imagine → Pattern → Exposure → Stance).

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModeChooser, type WizardMode } from "@/components/wizard/ModeChooser";
import { WizardShell, type WizardStep } from "@/components/wizard/WizardShell";
import { StepBMC } from "@/components/wizard/StepBMC";
import { StepVPC } from "@/components/wizard/StepVPC";
import { StepCapabilities } from "@/components/wizard/StepCapabilities";
import { StepCompetitor } from "@/components/wizard/StepCompetitor";
import { StepMove } from "@/components/wizard/StepMove";
import {
  StepImagine,
  type FearParagraphs,
} from "@/components/wizard/wfc/StepImagine";
import { StepPattern } from "@/components/wizard/wfc/StepPattern";
import { StepExposure } from "@/components/wizard/wfc/StepExposure";
import { StepStance } from "@/components/wizard/wfc/StepStance";
import {
  DEFAULT_SCENARIOS,
  EMPTY_COMPETITOR,
  EMPTY_OWN,
} from "@/lib/presets";
import { saveActiveProject, type WFCContext } from "@/lib/store";
import type {
  BMCBlock,
  BMCBlockKind,
  CompetitorProfile,
  OwnProfile,
  Scenario,
  StrategicTopology,
} from "@/lib/types";
import {
  AI_NATIVE_PATTERNS,
  competitorFromPattern,
  disruptionScenario,
  type AIPatternId,
} from "@/lib/aiNativePatterns";
import type { DefenderOptionId } from "@/lib/defenderOptions";

function uid(p: string): string {
  return `${p}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function StartPageWrapper() {
  // useSearchParams must be wrapped in a Suspense boundary (Next.js 14 app router).
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-0" />}>
      <StartPage />
    </Suspense>
  );
}

function StartPage() {
  const params = useSearchParams();
  const initialMode: WizardMode | null = useMemo(() => {
    const m = params.get("mode");
    if (m === "wfc") return "WFC";
    if (m === "deep") return "DEEP";
    if (m === "quick" || m === "express") return "EXPRESS";
    return null;
  }, [params]);

  const [mode, setMode] = useState<WizardMode | null>(initialMode);
  const [index, setIndex] = useState(0);
  const [own, setOwn] = useState<OwnProfile>({ ...EMPTY_OWN });
  const [competitor, setCompetitor] = useState<CompetitorProfile>({
    ...EMPTY_COMPETITOR,
  });
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);

  // WFC-only state ---------------------------------------------------------
  const [fears, setFears] = useState<FearParagraphs>({
    workflow: "",
    pricing: "",
    flywheel: "",
  });
  const [patternPicks, setPatternPicks] = useState<AIPatternId[]>([]);
  const [stanceId, setStanceId] = useState<DefenderOptionId | undefined>(
    undefined,
  );

  useEffect(() => {
    if (initialMode !== null) setMode(initialMode);
  }, [initialMode]);

  if (!mode) {
    return (
      <ModeChooser
        onPick={(m) => {
          setMode(m);
          setIndex(0);
        }}
      />
    );
  }

  const ownBusinessSummary = `${own.name}: ${own.intent || own.diagnosis || own.openingMove || ""}`;
  const primaryPattern = patternPicks[0]
    ? AI_NATIVE_PATTERNS.find((p) => p.id === patternPicks[0])
    : undefined;

  // Whenever the primary pattern changes, swap the competitor template in.
  // This is harmless if the user later refines with AI-Assist — that handler
  // overwrites the same `competitor` slot.
  const applyPrimaryPattern = (id: AIPatternId) => {
    const pattern = AI_NATIVE_PATTERNS.find((p) => p.id === id);
    if (!pattern) return;
    setCompetitor(competitorFromPattern(pattern, { name: undefined }));
  };

  const handlePatternPicks = (ids: AIPatternId[]) => {
    const prevPrimary = patternPicks[0];
    setPatternPicks(ids);
    if (ids[0] && ids[0] !== prevPrimary) {
      applyPrimaryPattern(ids[0]);
    }
  };

  // "Use defaults" on exposure step — populate OUR topology with minimal
  // placeholder BMC blocks for each block kind the pattern attacks.
  const handleUseDefaults = () => {
    if (!primaryPattern) {
      setIndex((i) => i + 1);
      return;
    }
    const missing = primaryPattern.exposedBlocks.filter(
      (k) => !own.topology.bmc.blocks.some((b) => b.kind === k),
    );
    const newBlocks: BMCBlock[] = missing.map((k: BMCBlockKind) => ({
      id: uid("bmc"),
      kind: k,
      label: `Our ${k.replace(/_/g, " ").toLowerCase()}`,
      strength: 50,
    }));
    if (newBlocks.length > 0) {
      const nextTop: StrategicTopology = {
        ...own.topology,
        bmc: { blocks: [...own.topology.bmc.blocks, ...newBlocks] },
      };
      setOwn({ ...own, topology: nextTop });
    }
    setIndex((i) => i + 1);
  };

  const wfcSteps: WizardStep[] = [
    {
      key: "imagine",
      title: "Imagine the AI-native team that would kill your business.",
      subtitle:
        "It doesn't have to exist yet. Describe the one you'd most fear.",
      render: () => (
        <StepImagine
          value={fears}
          onChange={setFears}
          onImportCompetitor={(c) => setCompetitor(c)}
        />
      ),
    },
    {
      key: "pattern",
      title: "Which attack pattern are they running?",
      subtitle:
        "Pick one or two. Each maps to a recognizable disruption playbook.",
      render: () => (
        <StepPattern
          picks={patternPicks}
          onPicks={handlePatternPicks}
          fears={fears}
          onAIRefine={(c) => setCompetitor(c)}
        />
      ),
    },
    {
      key: "exposure",
      title: "Where on your business does this land?",
      subtitle:
        "Auto-generated from your fear + pattern. Review and edit.",
      skippable: true,
      render: () => (
        <StepExposure
          patternId={patternPicks[0]}
          ownTopology={own.topology}
          onChange={(t) => setOwn({ ...own, topology: t })}
          onUseDefaults={handleUseDefaults}
        />
      ),
    },
    {
      key: "stance",
      title: "What's your defense stance?",
      subtitle:
        "Seven options. Pick one — it becomes your opening move.",
      render: () => (
        <StepStance
          patternId={patternPicks[0]}
          stanceId={stanceId}
          onStanceId={setStanceId}
          ownTopology={own.topology}
          own={own}
          onOwnChange={setOwn}
        />
      ),
    },
  ];

  const quickSteps: WizardStep[] = [
    {
      key: "bmc",
      title: "What's your business model?",
      subtitle:
        "Map who you serve, what value you deliver, how it works under the hood.",
      render: () => (
        <StepBMC
          topology={own.topology}
          onChange={(t) => setOwn({ ...own, topology: t })}
          ownName={own.name}
        />
      ),
    },
    {
      key: "competitor",
      title: "Who are you up against?",
      subtitle:
        "A name and an industry are enough to get started. You can map their topology later.",
      render: () => (
        <StepCompetitor
          competitor={competitor}
          onChange={setCompetitor}
          ourBusinessSummary={ownBusinessSummary}
          showTopology={false}
        />
      ),
    },
    {
      key: "move",
      title: "What's your move?",
      subtitle:
        "Three short questions, in the spirit of Rumelt's strategy kernel.",
      render: () => <StepMove own={own} onChange={setOwn} />,
    },
  ];

  const deepSteps: WizardStep[] = [
    {
      key: "bmc",
      title: "What's your business model?",
      subtitle:
        "Map who you serve, what value you deliver, how it works under the hood.",
      render: () => (
        <StepBMC
          topology={own.topology}
          onChange={(t) => setOwn({ ...own, topology: t })}
          ownName={own.name}
        />
      ),
    },
    {
      key: "vpc",
      title: "How do you create value for them?",
      subtitle:
        "One Value Proposition Canvas per customer segment. Skip any segment to come back to it later.",
      skippable: true,
      render: () => (
        <StepVPC
          topology={own.topology}
          onChange={(t) => setOwn({ ...own, topology: t })}
          ownName={own.name}
        />
      ),
    },
    {
      key: "capabilities",
      title: "What can you actually do?",
      subtitle:
        "Capability sets across People, Tech, Org, Processes. Skip to start with a blank slate.",
      skippable: true,
      render: () => (
        <StepCapabilities
          topology={own.topology}
          onChange={(t) => setOwn({ ...own, topology: t })}
          ownName={own.name}
        />
      ),
    },
    {
      key: "competitor",
      title: "Who are you up against?",
      subtitle:
        "Name + industry are enough. Optionally open the detailed mapping.",
      render: () => (
        <StepCompetitor
          competitor={competitor}
          onChange={setCompetitor}
          ourBusinessSummary={ownBusinessSummary}
          showTopology={true}
        />
      ),
    },
    {
      key: "move",
      title: "What's your move?",
      subtitle:
        "Three short questions, in the spirit of Rumelt's strategy kernel.",
      render: () => <StepMove own={own} onChange={setOwn} />,
    },
  ];

  const steps: WizardStep[] =
    mode === "WFC" ? wfcSteps : mode === "EXPRESS" ? quickSteps : deepSteps;
  const isLast = index === steps.length - 1;

  // ----- WFC scenario seeding helper ------------------------------------
  //
  // When the user finishes the WFC flow we seed the war-game with three
  // scenarios:
  //   - Baseline   (consensus trajectory)
  //   - Regulatory shock (slowed AI-native rollout)
  //   - AI-Native Disruption (the chosen pattern at maximum velocity)
  // The third one is generated from the pattern; the other two come from
  // DEFAULT_SCENARIOS with weights re-balanced so the disruption rollout
  // dominates the rollout pool.
  const buildWFCScenarios = (): Scenario[] => {
    if (!primaryPattern) return scenarios;
    const baseline: Scenario = {
      id: "s-baseline",
      label: "Baseline",
      description:
        "Market evolves along the consensus trajectory. No exogenous shock.",
      weight: 0.4,
      modifiers: {},
    };
    const regShock: Scenario = {
      id: "s-reg-shock",
      label: "Regulatory shock",
      description:
        "Heavier AI regulation slows the challenger; defenders win time but invest in compliance.",
      weight: 0.25,
      modifiers: { posture: "DEFENSIVE", innovationIndex: 60 },
    };
    return [baseline, regShock, disruptionScenario(primaryPattern)];
  };

  const finishAndOpen = () => {
    let scenariosToSave: Scenario[] = scenarios;
    let wfc: WFCContext | undefined = undefined;
    let projectName = `${own.name || "OUR COMPANY"} vs ${competitor.name || "COMPETITOR"}`;

    if (mode === "WFC" && primaryPattern && stanceId) {
      scenariosToSave = buildWFCScenarios();
      setScenarios(scenariosToSave);
      wfc = {
        patternId: primaryPattern.id,
        stanceId,
        fearParagraphs: fears,
        createdAt: new Date().toISOString(),
      };
      projectName = `${own.name || "OUR COMPANY"} vs ${competitor.name} (WFC · ${primaryPattern.name})`;
    }

    const now = new Date().toISOString();
    saveActiveProject({
      id: `prj_${Date.now().toString(36)}`,
      name: projectName,
      createdAt: now,
      updatedAt: now,
      competitor,
      own,
      scenarios: scenariosToSave,
      versions: [],
      wfc,
    });
    window.location.href = "/dashboard";
  };

  const handleNext = () => {
    if (isLast) {
      finishAndOpen();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleSaveExit = () => {
    const projectName =
      `${own.name || "OUR COMPANY"} vs ${competitor.name || "COMPETITOR"} (draft)`;
    const now = new Date().toISOString();
    saveActiveProject({
      id: `prj_draft_${Date.now().toString(36)}`,
      name: projectName,
      createdAt: now,
      updatedAt: now,
      competitor,
      own,
      scenarios,
      versions: [],
      wfc:
        mode === "WFC" && primaryPattern
          ? {
              patternId: primaryPattern.id,
              stanceId: stanceId ?? "HARDEN_HUMAN",
              fearParagraphs: fears,
              createdAt: now,
            }
          : undefined,
    });
    window.location.href = "/";
  };

  // Block Next on the Stance step until a stance is actually picked, since
  // the kernel needs to be filled before the engine runs.
  const nextDisabled =
    mode === "WFC" &&
    ((index === 1 && !patternPicks[0]) ||
      (index === wfcSteps.length - 1 && !stanceId));

  return (
    <WizardShell
      steps={steps}
      index={index}
      onBack={() => setIndex((i) => Math.max(0, i - 1))}
      onSkip={
        steps[index].skippable ? () => setIndex((i) => i + 1) : undefined
      }
      onNext={handleNext}
      onSaveExit={handleSaveExit}
      isLast={isLast}
      nextDisabled={nextDisabled}
    />
  );
}
