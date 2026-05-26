"use client";

// WFC — wizard shell (Phase 4).
//
// Sticky top: progress bar + step count + small "Save & exit" link.
// Sticky bottom: Back / Skip / Next nav. Each step renders centered with
// max-w-3xl and generous py-8. Steps must NOT inherit the dense dashboard
// chrome — the user is supposed to feel they're using a calm, friendly
// onboarding flow.

import { TopBar } from "@/components/Chrome";

export interface WizardStep {
  key: string;
  title: string;
  subtitle?: string;
  skippable?: boolean;
  render: () => React.ReactNode;
}

export function WizardShell({
  steps,
  index,
  onBack,
  onSkip,
  onNext,
  onSaveExit,
  isLast,
  nextDisabled = false,
  nextLabel,
}: {
  steps: WizardStep[];
  index: number;
  onBack: () => void;
  onSkip?: () => void;
  onNext: () => void;
  onSaveExit: () => void;
  isLast: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  const step = steps[index];
  const pct = ((index + 1) / steps.length) * 100;

  return (
    <main className="min-h-screen bg-ink-0 text-ink-900 flex flex-col">
      <TopBar variant="MINIMAL" />

      {/* Progress strip */}
      <div className="border-b border-ink-200 bg-ink-0 sticky top-12 z-20">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 transition-colors ${
                    i <= index ? "bg-ink-900" : "bg-ink-200"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-ink-500">
              <span>
                STEP {index + 1} OF {steps.length} · {step.title.toUpperCase()}
              </span>
              <button
                onClick={onSaveExit}
                className="text-ink-500 hover:text-ink-900 transition-colors"
              >
                SAVE &amp; EXIT
              </button>
            </div>
          </div>
        </div>
        {/* underlay so the progress bar looks integrated */}
        <div
          className="h-px bg-ink-900 transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      {/* Step body */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-[34px] tracking-tight text-ink-1000 leading-tight">
            {step.title}
          </h1>
          {step.subtitle && (
            <p className="text-[15px] text-ink-700 leading-relaxed mt-2 max-w-2xl">
              {step.subtitle}
            </p>
          )}
        </header>
        <div>{step.render()}</div>
      </div>

      {/* Sticky bottom nav */}
      <div className="border-t border-ink-300 bg-ink-50 sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            disabled={index === 0}
            className="font-mono text-[11px] tracking-widest text-ink-600 hover:text-ink-1000 disabled:text-ink-300 disabled:cursor-not-allowed"
          >
            ← BACK
          </button>
          <div className="flex items-center gap-3">
            {step.skippable && onSkip && (
              <button
                onClick={onSkip}
                className="font-mono text-[11px] tracking-widest text-ink-600 hover:text-ink-1000 px-3 py-2"
              >
                SKIP THIS STEP
              </button>
            )}
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="font-mono text-[11px] tracking-widest border border-ink-900 bg-ink-900 text-ink-0 px-5 py-2 hover:bg-ink-1000 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nextLabel ?? (isLast ? "OPEN DASHBOARD →" : "NEXT →")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
