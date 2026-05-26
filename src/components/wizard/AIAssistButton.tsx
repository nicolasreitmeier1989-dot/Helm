"use client";

// HELM — wizard AI-Assist button (Phase 4).
//
// Opt-in per step. Click opens a small overlay sheet with a textarea + a
// Generate button. Hits /api/wizard/extract and hands the typed result
// back to the parent step via onResult. Gracefully degrades when
// ANTHROPIC_API_KEY is missing: the button is disabled with a tooltip.

import { useEffect, useState } from "react";
import type { ExtractKind } from "@/lib/extractors";

interface AIAssistButtonProps {
  kind: ExtractKind;
  prompt: string; // textarea placeholder, e.g. "Describe your business in a paragraph"
  // Pass-through context for kinds that need it (VPC needs a segment id+label).
  context?: Record<string, unknown>;
  // Called with the parsed body of /api/wizard/extract on success.
  onResult: (data: Record<string, unknown>) => void;
}

export function AIAssistButton(props: AIAssistButtonProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { claude?: boolean }) => {
        if (!cancelled) setAvailable(!!d.claude);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/wizard/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: props.kind,
          description: text,
          context: props.context,
        }),
      });
      if (!resp.ok) {
        const data = (await resp.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(data.message || data.error || `HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as Record<string, unknown>;
      props.onResult(data);
      setOpen(false);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setBusy(false);
    }
  };

  const disabled = available === false;
  const tooltip =
    disabled && available !== null
      ? "Set ANTHROPIC_API_KEY in .env.local to use AI-assist"
      : undefined;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled || available === null}
        title={tooltip}
        className={`font-mono text-[10px] tracking-widest border px-3 py-1.5 transition-colors ${
          disabled
            ? "border-ink-300 text-ink-400 cursor-not-allowed"
            : "border-ink-700 text-ink-900 hover:bg-ink-900 hover:text-ink-0"
        }`}
      >
        ✨ DESCRIBE AND LET CLAUDE FILL
      </button>
      <span className="font-mono text-[9px] tracking-wider text-ink-500">
        ~$0.02 per call · uses Claude Opus 4.7
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="bg-ink-0 border border-ink-900 max-w-xl w-full shadow-2xl">
            <header className="flex items-center justify-between px-5 py-3 border-b border-ink-300/60 bg-ink-50">
              <span className="font-mono text-[10px] tracking-widest text-ink-900">
                AI-ASSIST // {props.kind.replace("_", " ")}
              </span>
              <button
                onClick={() => !busy && setOpen(false)}
                aria-label="close"
                className="font-mono text-[11px] text-ink-500 hover:text-ink-900"
                disabled={busy}
              >
                ✕
              </button>
            </header>
            <div className="p-5 space-y-4">
              <div>
                <label className="font-mono text-[10px] tracking-widest text-ink-500 block mb-1.5">
                  {props.prompt}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  placeholder="Write a few sentences. Claude will turn this into structured fields you can review and edit."
                  className="w-full bg-ink-50 border border-ink-300 text-ink-900 px-3 py-2 text-[13px] outline-none focus:border-ink-700 resize-y leading-relaxed"
                  disabled={busy}
                  autoFocus
                />
              </div>
              {error && (
                <div className="border border-ink-900 bg-ink-100 px-3 py-2 font-mono text-[11px] text-ink-1000">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] tracking-widest text-ink-500">
                  {busy ? "CLAUDE EXTRACTS · ~5-15s" : "READY"}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => !busy && setOpen(false)}
                    className="font-mono text-[10px] tracking-widest border border-ink-400 text-ink-700 px-3 py-1.5 hover:border-ink-900 hover:text-ink-1000 transition-colors disabled:opacity-50"
                    disabled={busy}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => void submit()}
                    disabled={busy || text.trim().length < 8}
                    className="font-mono text-[10px] tracking-widest border border-ink-900 bg-ink-900 text-ink-0 px-4 py-1.5 hover:bg-ink-1000 transition-colors disabled:opacity-50"
                  >
                    {busy ? "⌛ GENERATING…" : "GENERATE →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
