"use client";

// HELM — wizard route (Phase 4).
//
// /start opens with a mode chooser (Express / Deep). Once a mode is
// picked, the WizardShell drives the user through the steps. The final
// "Next" persists an active project to localStorage and redirects to
// /dashboard.

import { useState } from "react";
import { ModeChooser, type WizardMode } from "@/components/wizard/ModeChooser";
import { WizardShell, type WizardStep } from "@/components/wizard/WizardShell";
import { StepBMC } from "@/components/wizard/StepBMC";
import { StepVPC } from "@/components/wizard/StepVPC";
import { StepCapabilities } from "@/components/wizard/StepCapabilities";
import { StepCompetitor } from "@/components/wizard/StepCompetitor";
import { StepMove } from "@/components/wizard/StepMove";
import {
  DEFAULT_SCENARIOS,
  EMPTY_COMPETITOR,
  EMPTY_OWN,
} from "@/lib/presets";
import { saveActiveProject } from "@/lib/store";
import type { CompetitorProfile, OwnProfile, Scenario } from "@/lib/types";

export default function StartPage() {
  const [mode, setMode] = useState<WizardMode | null>(null);
  const [index, setIndex] = useState(0);
  const [own, setOwn] = useState<OwnProfile>({ ...EMPTY_OWN });
  const [competitor, setCompetitor] = useState<CompetitorProfile>({
    ...EMPTY_COMPETITOR,
  });
  const [scenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);

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

  const steps: WizardStep[] =
    mode === "EXPRESS"
      ? [
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
        ]
      : [
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

  const isLast = index === steps.length - 1;

  const finishAndOpen = () => {
    const projectName =
      `${own.name || "OUR COMPANY"} vs ${competitor.name || "COMPETITOR"}`;
    const now = new Date().toISOString();
    saveActiveProject({
      id: `prj_${Date.now().toString(36)}`,
      name: projectName,
      createdAt: now,
      updatedAt: now,
      competitor,
      own,
      scenarios,
      versions: [],
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
    // Persist the in-progress state as a draft project, then return home.
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
    });
    window.location.href = "/";
  };

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
    />
  );
}
