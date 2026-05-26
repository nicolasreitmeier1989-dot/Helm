"use client";

// HELM — ChoiceGenerator (Phase 6).
//
// Wraps a single strategic question + a dynamic option list + LLM call
// lifecycle. Used by every wizard step to surface options the user can
// click instead of having to type free-text.
//
// LLM path: POST /api/options with {questionId, context, count, exclude}.
// Fallback path (no ANTHROPIC_API_KEY): /api/status returns claude:false,
// and we route to getStaticOptions() from src/lib/staticChoices.ts.
//
// UI affordances:
//  - "+ More options" — accumulate excluded ids, re-call the endpoint.
//  - "↻ Refine"       — re-call with refine:true to vary the angle.
//  - "○ Skip"         — only when the parent step allows skipping a question.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChoiceCard } from "./ChoiceCard";
import {
  getStaticOptions,
  type ChoiceOption,
} from "@/lib/staticChoices";

export interface ChoiceGeneratorProps {
  /** The actual question text shown above the cards. */
  question: string;
  /** Optional grey subtitle under the question. */
  hint?: string;
  /** Identifies what we're asking, e.g. "rumelt.diagnosis", "wfc.fear.workflow". */
  questionId: string;
  /** Prior answers, used to personalise the suggested options. */
  context?: Record<string, unknown>;
  /** Number of options per round (default 6). */
  count?: number;
  /** When true, multiple options can be picked. */
  multiSelect?: boolean;
  /** Max picks when multiSelect. Soft cap. */
  maxPicks?: number;
  /** Currently picked option ids. */
  selected: string[];
  /** Selection delta callback. */
  onChange: (ids: string[], options: ChoiceOption[]) => void;
  /** When true, a small "○ Skip" affordance is shown alongside ↻ / +More. */
  allowSkip?: boolean;
  /** Callback when the user clicks Skip. */
  onSkip?: () => void;
  /** Optional small kicker shown above the question (monospaced uppercase). */
  kicker?: string;
}

type ApiStatus = "unknown" | "ai" | "static";

interface OptionsResponse {
  options?: ChoiceOption[];
  error?: string;
  message?: string;
}

export function ChoiceGenerator({
  question,
  hint,
  questionId,
  context = {},
  count = 6,
  multiSelect = false,
  maxPicks,
  selected,
  onChange,
  allowSkip = false,
  onSkip,
  kicker,
}: ChoiceGeneratorProps) {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("unknown");
  const [options, setOptions] = useState<ChoiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  // Track the request id so a stale completion can't overwrite a newer one.
  const reqIdRef = useRef(0);

  // Stable signature so the effect doesn't re-fire on every render of the
  // (often inline) context object. JSON is fine for our small payloads.
  const contextSig = useMemo(() => JSON.stringify(context), [context]);

  const fetchOptions = useCallback(
    async (opts: { exclude: string[]; refine: boolean; append: boolean }) => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      setError(null);

      try {
        // ---- Step 1: figure out which path to use --------------------
        let useStatic = apiStatus === "static";
        if (apiStatus === "unknown") {
          try {
            const sResp = await fetch("/api/status");
            const sData = (await sResp.json()) as { claude?: boolean };
            useStatic = !sData.claude;
            if (myReq === reqIdRef.current) {
              setApiStatus(sData.claude ? "ai" : "static");
            }
          } catch {
            useStatic = true;
            if (myReq === reqIdRef.current) setApiStatus("static");
          }
        }

        // ---- Step 2: fetch ----------------------------------------------
        let next: ChoiceOption[] = [];
        if (useStatic) {
          next = getStaticOptions({
            questionId,
            context: JSON.parse(contextSig) as Record<string, unknown>,
            count,
            exclude: opts.exclude,
          });
        } else {
          const resp = await fetch("/api/options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId,
              context: JSON.parse(contextSig),
              count,
              exclude: opts.exclude,
              refine: opts.refine,
            }),
          });
          if (resp.status === 503) {
            // API key missing → fall back permanently for this session.
            if (myReq === reqIdRef.current) setApiStatus("static");
            next = getStaticOptions({
              questionId,
              context: JSON.parse(contextSig) as Record<string, unknown>,
              count,
              exclude: opts.exclude,
            });
          } else if (!resp.ok) {
            const data = (await resp.json().catch(() => ({}))) as OptionsResponse;
            throw new Error(data.message ?? data.error ?? `HTTP ${resp.status}`);
          } else {
            const data = (await resp.json()) as OptionsResponse;
            next = data.options ?? [];
          }
        }

        if (myReq !== reqIdRef.current) return; // stale
        setOptions((prev) => (opts.append ? [...prev, ...next] : next));
      } catch (e) {
        if (myReq !== reqIdRef.current) return;
        setError(e instanceof Error ? e.message : "unknown");
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    },
    [apiStatus, contextSig, count, questionId],
  );

  // Initial load and reload-on-questionId/context-change.
  useEffect(() => {
    setExcludedIds([]);
    setOptions([]);
    void fetchOptions({ exclude: [], refine: false, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, contextSig]);

  const handlePick = (opt: ChoiceOption) => {
    if (multiSelect) {
      const has = selected.includes(opt.id);
      let next: string[];
      if (has) {
        next = selected.filter((id) => id !== opt.id);
      } else if (maxPicks && selected.length >= maxPicks) {
        // soft-cap: drop oldest pick
        next = [...selected.slice(1), opt.id];
      } else {
        next = [...selected, opt.id];
      }
      onChange(next, options);
    } else {
      onChange([opt.id], options);
    }
  };

  const handleMore = () => {
    const ex = [...excludedIds, ...options.map((o) => o.id)];
    setExcludedIds(ex);
    void fetchOptions({ exclude: ex, refine: false, append: true });
  };

  const handleRefine = () => {
    const ex = options.map((o) => o.id);
    setExcludedIds(ex);
    void fetchOptions({ exclude: ex, refine: true, append: false });
  };

  // ---------- Render ----------------------------------------------------
  return (
    <section className="space-y-3">
      <header>
        {kicker && (
          <div className="font-mono text-[10px] tracking-widest text-ink-500 mb-1">
            {kicker}
          </div>
        )}
        <h3 className="text-[17px] tracking-tight text-ink-1000 leading-snug">
          {question}
        </h3>
        {hint && (
          <p className="text-[12.5px] text-ink-600 leading-relaxed mt-0.5">
            {hint}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            label={o.label}
            description={o.description}
            meta={o.meta}
            selected={selected.includes(o.id)}
            multiSelect={multiSelect}
            onClick={() => handlePick(o)}
          />
        ))}
        {loading && options.length === 0 && (
          <>
            {Array.from({ length: count }).map((_, i) => (
              <SkeletonCard key={`sk-${i}`} />
            ))}
          </>
        )}
        {loading && options.length > 0 && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
      </div>

      {error && (
        <div className="border border-ink-900 bg-ink-100 px-3 py-2 font-mono text-[11px] text-ink-1000">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMore}
            disabled={loading}
            className="font-mono text-[10px] tracking-widest text-ink-600 hover:text-ink-1000 disabled:text-ink-300 disabled:cursor-not-allowed"
          >
            + MORE OPTIONS
          </button>
          <button
            type="button"
            onClick={handleRefine}
            disabled={loading}
            className="font-mono text-[10px] tracking-widest text-ink-600 hover:text-ink-1000 disabled:text-ink-300 disabled:cursor-not-allowed"
          >
            ↻ REFINE
          </button>
          {allowSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="font-mono text-[10px] tracking-widest text-ink-500 hover:text-ink-1000"
            >
              ○ SKIP
            </button>
          )}
        </div>
        <span className="font-mono text-[9px] tracking-widest text-ink-400">
          {loading
            ? apiStatus === "ai"
              ? "CLAUDE THINKING…"
              : "LOADING…"
            : apiStatus === "ai"
              ? "AI-GENERATED · ~$0.02/CALL"
              : apiStatus === "static"
                ? "STATIC DEFAULTS"
                : ""}
        </span>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div
      className="border border-ink-200 bg-ink-50 px-4 py-3.5 h-full flex flex-col gap-2 animate-pulse"
      aria-hidden
    >
      <div className="h-3 bg-ink-200 w-2/3" />
      <div className="h-2.5 bg-ink-200 w-full" />
      <div className="h-2.5 bg-ink-200 w-4/5" />
    </div>
  );
}
