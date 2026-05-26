"use client";

// WFC — landing (Phase 5 — War Room reframing).
//
// Primary entry point is now the WAR ROOM — the 3-year combat simulation.
// The original wizard / dashboard flow is preserved but demoted as
// "deep-dive planning tools" for power users who want to run the full
// BMC/VPC/scenario analysis manually.

import { useEffect, useState } from "react";
import { TopBar } from "@/components/Chrome";
import {
  getActiveProject,
  loadStore,
  saveActiveProject,
  setActiveProject,
  type Project,
} from "@/lib/store";
import {
  DEFAULT_COMPETITOR,
  DEFAULT_OWN,
  DEFAULT_SCENARIOS,
} from "@/lib/presets";

export function Landing() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);

  useEffect(() => {
    const s = loadStore();
    setProjects(s.projects);
    setActive(getActiveProject());
  }, []);

  const handleTryExample = () => {
    const now = new Date().toISOString();
    const demo: Project = {
      id: `prj_demo_${Date.now().toString(36)}`,
      name: `${DEFAULT_OWN.name} vs ${DEFAULT_COMPETITOR.name}`,
      createdAt: now,
      updatedAt: now,
      competitor: DEFAULT_COMPETITOR,
      own: DEFAULT_OWN,
      scenarios: DEFAULT_SCENARIOS,
      versions: [],
    };
    saveActiveProject(demo);
    window.location.href = "/dashboard";
  };

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    window.location.href = "/dashboard";
  };

  return (
    <main className="min-h-screen bg-ink-0 text-ink-900 flex flex-col">
      <TopBar variant="MINIMAL" />

      <div className="flex-1 flex items-start justify-center px-6 pt-16 pb-24">
        <div className="w-full max-w-2xl">
          {active && (
            <ContinueBanner
              project={active}
              onContinue={() => handleOpenProject(active.id)}
            />
          )}

          <header className="mb-12">
            <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-3">
              WFC // WORST FEARED COMPETITOR
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-ink-1000 leading-[1.05] mb-4">
              Anticipate the AI-native competitor that will hurt you most.
            </h1>
            <p className="text-lg text-ink-700 leading-relaxed">
              Premortem on the disruptor that doesn&apos;t exist yet.
            </p>
            <p className="text-[14px] text-ink-600 leading-relaxed mt-3">
              WFC simulates 12 quarters of competitive combat between your
              business and an AI-native challenger — then tells you what to do
              this week to shift the outcome.
            </p>
          </header>

          {/* The new primary CTA — War Room. */}
          <a
            href="/war"
            className="block w-full text-left border-2 border-ink-1000 bg-ink-1000 text-ink-0 px-6 py-7 transition-all group hover:bg-red-600 hover:border-red-600 hover:shadow-[0_0_60px_rgba(239,68,68,0.4)]"
          >
            <div className="flex items-baseline justify-between mb-2 gap-3">
              <span className="text-[22px] tracking-tight text-ink-0 leading-tight font-bold">
                ▶ Enter the War Room
              </span>
              <span className="font-mono text-[10px] tracking-widest text-ink-300 whitespace-nowrap">
                PRIMARY · ~3 MIN
              </span>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-200">
              Type one paragraph about your business. Watch your worst-feared
              AI-native competitor attack you across 12 quarters. Get 3 actions
              you can take this week to survive.
            </p>
          </a>

          {/* Secondary: open existing project. */}
          {projects.length > 0 && (
            <div className="mt-6">
              <CTACard
                onClick={() => setShowAllProjects((v) => !v)}
                title="Open existing project"
                subtitle={`${projects.length} saved project${projects.length === 1 ? "" : "s"} in this browser.`}
                kicker={`${projects.length} SAVED`}
              />
              {showAllProjects && (
                <div className="ml-6 mt-1 border-l border-ink-300 pl-4 space-y-1.5 py-2">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleOpenProject(p.id)}
                      className="w-full text-left flex items-baseline justify-between gap-4 py-1.5 hover:bg-ink-100 px-2 -mx-2 transition-colors group"
                    >
                      <span className="text-[14px] text-ink-900 group-hover:text-ink-1000 truncate">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] tracking-wider text-ink-500 shrink-0">
                        {p.versions.length} VER · {fmtDate(p.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deep-dive tools, collapsed by default. */}
          <div className="mt-10 pt-6 border-t border-ink-200">
            <button
              onClick={() => setShowDeepDive((v) => !v)}
              className="font-mono text-[10px] tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
            >
              {showDeepDive ? "▼" : "▶"} DEEP-DIVE PLANNING TOOLS
            </button>
            {showDeepDive && (
              <div className="mt-4 space-y-3">
                <p className="text-[13px] text-ink-600 leading-relaxed">
                  Power-user tools to map your business and the competitor in
                  detail across BMC, VPC, capabilities, and 3–5 rounds of moves
                  under multiple scenarios. Use these if you want full control;
                  otherwise the War Room above does it all for you.
                </p>
                <CTACard
                  href="/start?mode=wfc"
                  title="Pattern-based threat picker"
                  subtitle="Pick from a catalog of AI-native competitor archetypes and model your exposure to each."
                  kicker="DEEP DIVE"
                />
                <CTACard
                  href="/start"
                  title="Start from scratch"
                  subtitle="Map your own business and the move you're considering. Express or deep."
                  kicker="NEW PROJECT"
                />
                <CTACard
                  onClick={handleTryExample}
                  title="Open the WFC CORP demo"
                  subtitle="DACH compliance SaaS facing a well-funded incumbent — pre-populated."
                  kicker="DEMO"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-ink-200 px-6 py-4 flex items-center justify-between text-[10px] font-mono tracking-widest text-ink-500">
        <span>WFC v0.5 // COMPETITIVE STRATEGY ENGINE</span>
        <span>OBSERVE · ORIENT · DECIDE · ACT</span>
        <span>© 2026 // ALL ROLLOUTS ARE HYPOTHETICAL</span>
      </footer>
    </main>
  );
}

function ContinueBanner({
  project,
  onContinue,
}: {
  project: Project;
  onContinue: () => void;
}) {
  return (
    <button
      onClick={onContinue}
      className="w-full mb-12 flex items-center justify-between gap-4 border border-ink-900 bg-ink-900 text-ink-0 px-5 py-4 hover:bg-ink-1000 transition-colors group"
    >
      <div className="text-left">
        <div className="font-mono text-[10px] tracking-widest text-ink-400 mb-0.5">
          CONTINUE
        </div>
        <div className="text-[15px] text-ink-0 truncate">{project.name}</div>
      </div>
      <span className="font-mono text-[11px] tracking-widest text-ink-200 group-hover:text-ink-0">
        OPEN DASHBOARD →
      </span>
    </button>
  );
}

function CTACard({
  href,
  onClick,
  title,
  subtitle,
  kicker,
  primary = false,
  disabled = false,
}: {
  href?: string;
  onClick?: () => void;
  title: string;
  subtitle: string;
  kicker: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const className = `block w-full text-left border px-5 py-5 transition-colors group ${
    disabled
      ? "border-ink-200 bg-ink-50 cursor-not-allowed"
      : primary
      ? "border-ink-900 bg-ink-0 hover:bg-ink-900 hover:text-ink-0"
      : "border-ink-300 bg-ink-0 hover:border-ink-900"
  }`;
  const body = (
    <>
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className={`text-[18px] tracking-tight ${
            disabled
              ? "text-ink-400"
              : primary
              ? "text-ink-1000 group-hover:text-ink-0"
              : "text-ink-1000"
          }`}
        >
          {title}
        </span>
        <span
          className={`font-mono text-[9px] tracking-widest ${
            disabled
              ? "text-ink-400"
              : primary
              ? "text-ink-500 group-hover:text-ink-300"
              : "text-ink-500"
          }`}
        >
          {kicker}
        </span>
      </div>
      <p
        className={`text-[13.5px] leading-relaxed ${
          disabled
            ? "text-ink-400"
            : primary
            ? "text-ink-700 group-hover:text-ink-200"
            : "text-ink-700"
        }`}
      >
        {subtitle}
      </p>
    </>
  );

  if (disabled) {
    return <div className={className}>{body}</div>;
  }
  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}
