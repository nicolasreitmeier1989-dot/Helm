"use client";

import { useEffect, useState } from "react";
import { Card, Label } from "./Chrome";

export type EngineMode = "HEURISTIC" | "CLAUDE";

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

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { claude: boolean }) => setClaudeAvailable(!!d.claude))
      .catch(() => setClaudeAvailable(false));
  }, []);

  const llmLocked = !claudeAvailable && mode === "HEURISTIC";

  return (
    <Card title="REASONING ENGINE" meta={mode}>
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
                ? "Adaptive Thinking · ~$0.10/Run"
                : "API-Key nicht gesetzt"}
          </div>
        </button>
      </div>

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
