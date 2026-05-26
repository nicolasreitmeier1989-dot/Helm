"use client";

// HELM — wizard mode chooser (Phase 4).
//
// First screen of /start. The user picks between Express (3 steps, ~3 min)
// and Deep (5 steps, ~10 min). Both modes terminate by writing an active
// project to localStorage and routing to /dashboard.

import { TopBar } from "@/components/Chrome";

export type WizardMode = "EXPRESS" | "DEEP";

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
              How deep do you want to go?
            </h1>
            <p className="text-[15px] text-ink-700 leading-relaxed">
              Both modes end at the same dashboard. Quick is enough to see
              first results; Deep gives the engine more to chew on.
            </p>
          </header>

          <div className="space-y-3">
            <ModeCard
              onClick={() => onPick("EXPRESS")}
              kicker="QUICK MAP · ~3 MIN"
              title="Quick map"
              subtitle="Map your business and the move you're considering. Three steps: your BMC, the competitor's name, your move."
              steps={["Your business", "Your competitor", "Your move"]}
              primary
            />
            <ModeCard
              onClick={() => onPick("DEEP")}
              kicker="DEEP MAP · ~10 MIN"
              title="Deep map"
              subtitle="Full topology — value propositions per customer segment, capability sets, competitor model with mapped topology."
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
  primary = false,
}: {
  onClick: () => void;
  kicker: string;
  title: string;
  subtitle: string;
  steps: string[];
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left border px-5 py-5 transition-colors group ${
        primary
          ? "border-ink-900 bg-ink-0 hover:bg-ink-900 hover:text-ink-0"
          : "border-ink-300 bg-ink-0 hover:border-ink-900"
      }`}
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className={`text-[18px] tracking-tight ${
            primary
              ? "text-ink-1000 group-hover:text-ink-0"
              : "text-ink-1000"
          }`}
        >
          {title}
        </span>
        <span
          className={`font-mono text-[9px] tracking-widest ${
            primary
              ? "text-ink-500 group-hover:text-ink-300"
              : "text-ink-500"
          }`}
        >
          {kicker}
        </span>
      </div>
      <p
        className={`text-[13.5px] leading-relaxed mb-3 ${
          primary
            ? "text-ink-700 group-hover:text-ink-200"
            : "text-ink-700"
        }`}
      >
        {subtitle}
      </p>
      <ol
        className={`font-mono text-[10px] tracking-widest flex flex-wrap gap-x-3 gap-y-1 ${
          primary
            ? "text-ink-500 group-hover:text-ink-300"
            : "text-ink-500"
        }`}
      >
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
