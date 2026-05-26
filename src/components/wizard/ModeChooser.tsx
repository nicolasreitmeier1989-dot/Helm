"use client";

// WFC — wizard mode chooser (Phase 4 + 4.5).
//
// First screen of /start. The user picks between WFC (the AI-native
// premortem path — visually emphasised on top), Quick (3 steps) or Deep
// (5 steps). Each mode terminates by writing an active project to
// localStorage and routing to /dashboard.

import { TopBar } from "@/components/Chrome";

export type WizardMode = "WFC" | "EXPRESS" | "DEEP";

export function ModeChooser({ onPick }: { onPick: (mode: WizardMode) => void }) {
  return (
    <main className="min-h-screen bg-ink-0 text-ink-900 flex flex-col">
      <TopBar variant="MINIMAL" />
      <div className="flex-1 flex items-start justify-center px-6 pt-16 pb-24">
        <div className="w-full max-w-2xl">
          <header className="mb-10">
            <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-3">
              NEW PROJECT // CHOOSE MODE
            </div>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink-1000 leading-tight mb-3">
              Which door are you walking through?
            </h1>
            <p className="text-[15px] text-ink-700 leading-relaxed">
              The premortem is WFC's distinctive path — pick it if you want to
              face the AI-native challenger that scares you most. Or map your
              own business in the Quick / Deep modes below.
            </p>
          </header>

          {/* ★ WFC — primary, visually emphasised. */}
          <button
            type="button"
            onClick={() => onPick("WFC")}
            className="block w-full text-left border-l-4 border-r border-y border-ink-900 bg-ink-1000 text-ink-0 px-6 py-5 transition-colors group hover:bg-ink-900 mb-3"
          >
            <div className="flex items-baseline justify-between mb-1.5 gap-3">
              <span className="text-[20px] tracking-tight text-ink-0 leading-tight">
                <span className="mr-1.5">★</span>
                Worst feared AI-native competitor
              </span>
              <span className="font-mono text-[9px] tracking-widest text-ink-300 whitespace-nowrap">
                PREMORTEM · ~5 MIN
              </span>
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-200 mb-3">
              Pick the disruption pattern that scares you. We'll model the
              challenger's topology and your exposure across BMC + capability
              sets.
            </p>
            <ol className="font-mono text-[10px] tracking-widest flex flex-wrap gap-x-3 gap-y-1 text-ink-300">
              {["Imagine", "Pattern", "Exposure", "Stance"].map((s, i) => (
                <li key={i}>
                  <span className="text-ink-400 mr-1">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  {s.toUpperCase()}
                </li>
              ))}
            </ol>
          </button>

          {/* Secondary — Quick + Deep side-by-side. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ModeCard
              onClick={() => onPick("EXPRESS")}
              kicker="QUICK · ~3 MIN"
              title="Quick map"
              subtitle="Your BMC, the competitor's name, your move."
              steps={["Your business", "Your competitor", "Your move"]}
            />
            <ModeCard
              onClick={() => onPick("DEEP")}
              kicker="DEEP · ~10 MIN"
              title="Deep map"
              subtitle="Full topology — VPCs per segment, capability sets, mapped competitor."
              steps={[
                "Your business",
                "Value propositions",
                "Capabilities",
                "Competitor",
                "Your move",
              ]}
            />
          </div>

          <p className="mt-10 text-[12px] text-ink-500 leading-relaxed">
            You can skip optional steps and come back later from the
            dashboard. Drafts are auto-saved to this browser.
          </p>
        </div>
      </div>
    </main>
  );
}

function ModeCard({
  onClick,
  kicker,
  title,
  subtitle,
  steps,
}: {
  onClick: () => void;
  kicker: string;
  title: string;
  subtitle: string;
  steps: string[];
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left border border-ink-300 bg-ink-0 px-4 py-4 hover:border-ink-900 transition-colors group"
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[16px] tracking-tight text-ink-1000">
          {title}
        </span>
        <span className="font-mono text-[9px] tracking-widest text-ink-500">
          {kicker}
        </span>
      </div>
      <p className="text-[12.5px] leading-snug text-ink-700 mb-3">
        {subtitle}
      </p>
      <ol className="font-mono text-[10px] tracking-widest flex flex-wrap gap-x-2 gap-y-1 text-ink-500">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="text-ink-400 mr-1">
              {(i + 1).toString().padStart(2, "0")}
            </span>
            {s.toUpperCase()}
          </li>
        ))}
      </ol>
    </button>
  );
}
