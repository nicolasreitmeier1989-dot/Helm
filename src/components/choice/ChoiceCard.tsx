"use client";

// HELM — ChoiceCard primitive (Phase 6).
//
// A single clickable option card used by ChoiceGenerator and by any
// click-only wizard step. Monochrome ink-* palette, sharp corners,
// monospaced kicker, optional meta badge in the top-right corner.

import type { ReactNode } from "react";

export interface ChoiceCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  /** When true the card is part of a multi-select group (shown as a checkbox-ish indicator). */
  multiSelect?: boolean;
  /** Small badge in the top-right (e.g. "MATURE", "AI-NATIVE"). */
  meta?: string;
  /** Optional kicker shown above the label (e.g. "Q1 // WORKFLOW"). */
  kicker?: string;
  /** Optional footer slot (e.g. a small inline sub-choice row). */
  footer?: ReactNode;
  disabled?: boolean;
}

export function ChoiceCard({
  label,
  description,
  selected,
  onClick,
  multiSelect = false,
  meta,
  kicker,
  footer,
  disabled = false,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`text-left border px-4 py-3.5 transition-all h-full w-full flex flex-col gap-1.5 ${
        selected
          ? "border-ink-900 bg-ink-900 text-ink-0 shadow-[2px_2px_0_0_rgba(20,20,20,1)]"
          : "border-ink-300 bg-ink-0 text-ink-1000 hover:border-ink-700 hover:-translate-y-px"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {kicker && (
            <div
              className={`font-mono text-[9px] tracking-widest mb-1 ${
                selected ? "text-ink-300" : "text-ink-500"
              }`}
            >
              {kicker}
            </div>
          )}
          <div className="flex items-start gap-2">
            <span
              aria-hidden
              className={`mt-[3px] inline-block ${
                multiSelect ? "w-3 h-3" : "w-3 h-3 rounded-full"
              } border ${
                selected
                  ? "bg-ink-0 border-ink-0"
                  : "bg-ink-0 border-ink-400"
              }`}
            />
            <span
              className={`text-[13.5px] leading-snug tracking-tight ${
                selected ? "text-ink-0" : "text-ink-1000"
              }`}
            >
              {label}
            </span>
          </div>
        </div>
        {meta && (
          <span
            className={`font-mono text-[9px] tracking-widest whitespace-nowrap pt-0.5 ${
              selected ? "text-ink-300" : "text-ink-500"
            }`}
          >
            {meta}
          </span>
        )}
      </div>
      {description && (
        <p
          className={`text-[12px] leading-snug pl-5 ${
            selected ? "text-ink-200" : "text-ink-600"
          }`}
        >
          {description}
        </p>
      )}
      {footer && <div className="pl-5 pt-1">{footer}</div>}
    </button>
  );
}
