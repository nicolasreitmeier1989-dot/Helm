"use client";

import { useEffect, useState } from "react";
import { Card, Label } from "./Chrome";
import {
  computeOpus47Cost,
  getClaudeSubMode,
  setClaudeSubMode,
  setLastRunUsage,
  subscribeClaudeSubMode,
  getLastRunUsage,
  subscribeLastRunUsage,
  type ClaudeSubMode,
  type LastRunUsage,
} from "@/lib/adjudication";

export type EngineMode = "HEURISTIC" | "CLAUDE";

// ---------- fetch interceptor (Phase 5X.2) ----------
//
// The dashboard route owns the POST to /api/simulate; we are not allowed to
// modify it. To wire the EngineToggle's sub-mode and the LAST RUN cost
// line, we install a one-time interceptor on window.fetch that:
//   1. injects `mode: getClaudeSubMode()` into matching POST bodies, and
//   2. parses the response usage on success to publish LastRunUsage.

let _fetchInstalled = false;
function installSimulateFetchInterceptor(): void {
  if (_fetchInstalled) return;
  _fetchInstalled = true;
  const orig = window.fetch.bind(window);
  window.fetch = async function patched(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const method = (init?.method ?? "GET").toUpperCase();

    if (url.endsWith("/api/simulate") && method === "POST" && init?.body) {
      const mode = getClaudeSubMode();
      try {
        const original = typeof init.body === "string" ? init.body : null;
        if (original) {
          const parsed = JSON.parse(original) as Record<string, unknown>;
          if (!parsed.mode) parsed.mode = mode;
          init = { ...init, body: JSON.stringify(parsed) };
        }
      } catch {
        // leave body untouched on parse failure
      }
      const resp = await orig(input, init);
      // Tee response body to extract usage without disturbing callers.
      try {
        const cloned = resp.clone();
        cloned
          .json()
          .then((data: { simulation?: { usage?: unknown } }) => {
            const usageRaw = (data?.simulation as { usage?: unknown } | undefined)
              ?.usage as Record<string, number> | undefined;
            if (!usageRaw) return;
            const inputTokens = Number(usageRaw.inputTokens ?? 0);
            const outputTokens = Number(usageRaw.outputTokens ?? 0);
            const cacheReadTokens = Number(usageRaw.cacheRead ?? 0);
            const costUsd = computeOpus47Cost({
              inputTokens,
              outputTokens,
              cacheReadTokens,
            });
            setLastRunUsage({
              mode,
              costUsd,
              inputTokens,
              outputTokens,
              cacheReadTokens,
              at: new Date().toISOString(),
            });
          })
          .catch(() => {
            /* ignore */
          });
      } catch {
        /* ignore clone failures */
      }
      return resp;
    }

    return orig(input, init);
  } as typeof window.fetch;
}

export function EngineToggle({
  mode,
  onChange,
  isRunning,
  lastError,
}: {
  mode: EngineMode;
  onChange: (m: EngineMode) => void;
  isRunning: boolean;
  lastError: string | null;
}) {
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null);
  const [subMode, setSubMode] = useState<ClaudeSubMode>(getClaudeSubMode());
  const [lastRun, setLastRun] = useState<LastRunUsage | null>(getLastRunUsage());

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { claude: boolean }) => setClaudeAvailable(!!d.claude))
      .catch(() => setClaudeAvailable(false));
  }, []);

  useEffect(() => {
    const unsub = subscribeClaudeSubMode((m) => setSubMode(m));
    const unsub2 = subscribeLastRunUsage((u) => setLastRun(u));
    return () => {
      unsub();
      unsub2();
    };
  }, []);

  // Phase 5X.2 — the dashboard owns the `runClaude` fetch and we are not
  // allowed to modify it. So we install a tiny fetch interceptor here that
  // injects the selected sub-mode into POSTs to /api/simulate and, on
  // success, extracts usage to compute the last-run cost line.
  useEffect(() => {
    if (typeof window === "undefined") return;
    installSimulateFetchInterceptor();
    return undefined;
  }, []);

  const llmLocked = !claudeAvailable && mode === "HEURISTIC";

  const claudeCostHint =
    subMode === "ADJUDICATED"
      ? "Red/White/Blue · ~$0.80–$1.50/Run"
      : "Adaptive Thinking · ~$0.10/Run";

  return (
    <Card title="REASONING ENGINE" meta={`${mode}${mode === "CLAUDE" ? ` · ${subMode}` : ""}`}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => onChange("HEURISTIC")}
          className={`text-left p-2.5 border transition-colors ${
            mode === "HEURISTIC"
              ? "border-ink-900 bg-ink-900 text-ink-0"
              : "border-ink-400 text-ink-700 hover:border-ink-900 hover:text-ink-1000"
          }`}
        >
          <div className="font-mono text-[10px] tracking-widest mb-1">
            LOCAL · HEURISTIC
          </div>
          <div className="text-[11px] leading-tight">
            Deterministisch · 0 Latenz · 0 Kosten
          </div>
        </button>
        <button
          onClick={() => claudeAvailable && onChange("CLAUDE")}
          disabled={!claudeAvailable}
          className={`text-left p-2.5 border transition-colors ${
            mode === "CLAUDE"
              ? "border-ink-0 bg-ink-0 text-ink-1000"
              : claudeAvailable
                ? "border-ink-700/40 text-ink-200 hover:border-ink-400 hover:text-ink-0"
                : "border-ink-700/30 text-ink-500 cursor-not-allowed"
          }`}
        >
          <div className="font-mono text-[10px] tracking-widest mb-1">
            CLAUDE · OPUS 4.7
          </div>
          <div className="text-[11px] leading-tight">
            {claudeAvailable === null
              ? "Prüfe Verfügbarkeit …"
              : claudeAvailable
                ? claudeCostHint
                : "API-Key nicht gesetzt"}
          </div>
        </button>
      </div>

      {/* Sub-mode pills — only when CLAUDE is selected */}
      {mode === "CLAUDE" && claudeAvailable && (
        <div className="mb-3 border border-ink-300/60 bg-ink-100/40 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] tracking-widest text-ink-500">
              MODE
            </span>
            <span className="font-mono text-[9px] tracking-widest text-ink-500">
              SEALED CONTEXTS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setClaudeSubMode("DIRECT")}
              className={`text-left px-2 py-1.5 border transition-colors ${
                subMode === "DIRECT"
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
              title="Single Claude call generates the full tree"
            >
              <div className="font-mono text-[10px] tracking-widest">
                DIRECT
              </div>
              <div className="font-mono text-[9px] tracking-wider opacity-80">
                1 call · ~$0.10
              </div>
            </button>
            <button
              onClick={() => setClaudeSubMode("ADJUDICATED")}
              className={`text-left px-2 py-1.5 border transition-colors ${
                subMode === "ADJUDICATED"
                  ? "border-ink-900 bg-ink-900 text-ink-0"
                  : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
              }`}
              title="Red proposes / White adjudicates / Blue responds — sealed contexts"
            >
              <div className="font-mono text-[10px] tracking-widest">
                ADJUDICATED
              </div>
              <div className="font-mono text-[9px] tracking-wider opacity-80">
                R/W/B · ~$0.80–$1.50
              </div>
            </button>
          </div>
          <div className="font-mono text-[10px] text-ink-600 leading-relaxed mt-1.5">
            {subMode === "ADJUDICATED" ? (
              <>
                Three sealed Claude calls per round per scenario: RED proposes
                opponent moves without seeing our plans, WHITE adjudicates
                friction, BLUE counters seeing only realized effects.
              </>
            ) : (
              <>
                One Claude call drafts the full tree. Faster and cheaper, but
                Red and Blue share one context.
              </>
            )}
          </div>
        </div>
      )}

      {mode === "CLAUDE" && (
        <div className="font-mono text-[10px] tracking-wider text-ink-600 leading-relaxed">
          {isRunning ? (
            <span className="text-ink-1000">
              <span className="inline-block w-1.5 h-1.5 bg-ink-1000 pulse-soft mr-2 align-middle" />
              CLAUDE REASONS … kann 20–60s dauern
            </span>
          ) : lastError ? (
            <span className="text-ink-1000">FEHLER: {lastError}</span>
          ) : (
            <>
              Strukturierter JSON-Output · Prompt-Cache aktiv · Sensitivity nutzt
              trotzdem den lokalen Engine.
            </>
          )}
        </div>
      )}

      {/* Last-run cost line — surfaced for ADJUDICATED runs (DIRECT cost too small to bother). */}
      {lastRun && lastRun.mode === "ADJUDICATED" && (
        <div className="mt-2 border-t border-ink-300/40 pt-1.5 font-mono text-[10px] tracking-wider text-ink-700 flex items-center justify-between">
          <span>
            LAST RUN: ${lastRun.costUsd.toFixed(2)} ({lastRun.mode.toLowerCase()})
          </span>
          <span className="text-ink-500">
            {lastRun.inputTokens.toLocaleString()} in · {lastRun.outputTokens.toLocaleString()} out
          </span>
        </div>
      )}

      {llmLocked && (
        <div className="mt-2 font-mono text-[10px] tracking-wider text-ink-500">
          LLM-Mode benötigt <code className="text-ink-800">ANTHROPIC_API_KEY</code>{" "}
          als ENV-Variable.
        </div>
      )}

      {mode === "HEURISTIC" && !isRunning && !lastError && (
        <div className="mt-1">
          <Label>Hinweis</Label>
          <div className="text-[11px] text-ink-700 leading-relaxed">
            Heuristik liefert sofort eine plausible Baseline. Für echtes
            game-theoretisches Reasoning wechsle zu Claude.
          </div>
        </div>
      )}
    </Card>
  );
}
