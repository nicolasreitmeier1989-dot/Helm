"use client";

import { useMemo, useState } from "react";
import type { Indicator, MoveNode, Simulation, Trigger, TriggerState } from "@/lib/types";
import {
  ackTrigger,
  dismissTrigger,
  fireTrigger,
  firedInLastDays,
  resetTrigger,
} from "@/lib/triggers";
import { Card, Label } from "./Chrome";

interface WatchRow {
  trigger: Trigger;
  indicator: Indicator;
  node: MoveNode;
  scenarioLabel: string;
}

const STATE_FILTERS: { key: "ALL" | TriggerState; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "ARMED", label: "ARMED" },
  { key: "FIRED", label: "FIRED" },
  { key: "ACK", label: "ACK" },
  { key: "DISMISSED", label: "DISMISSED" },
];

export function WatchlistPanel({
  sim,
  triggers,
  onChange,
  onSelectNode,
}: {
  sim: Simulation;
  triggers: Trigger[];
  onChange: () => void;
  onSelectNode?: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"ALL" | TriggerState>("ALL");
  const [pendingFireId, setPendingFireId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  // Build a fast index from indicatorId → (indicator, node, scenarioLabel).
  const indicatorIndex = useMemo(() => {
    const map: Record<
      string,
      { indicator: Indicator; node: MoveNode; scenarioLabel: string }
    > = {};
    sim.rootIds.forEach((rid, i) => {
      const scenarioLabel = sim.scenarios[i]?.label ?? `Szenario ${i + 1}`;
      const stack = [rid];
      while (stack.length) {
        const cur = stack.pop()!;
        const n = sim.nodes[cur];
        if (!n) continue;
        for (const ind of n.indicators ?? []) {
          map[ind.id] = { indicator: ind, node: n, scenarioLabel };
        }
        stack.push(...n.children);
      }
    });
    return map;
  }, [sim]);

  const rows: WatchRow[] = useMemo(() => {
    return triggers
      .filter((t) => t.simulationId === sim.id)
      .map((trigger) => {
        const lookup = indicatorIndex[trigger.indicatorId];
        if (!lookup) return null;
        return { trigger, ...lookup };
      })
      .filter((x): x is WatchRow => x !== null)
      .sort((a, b) => {
        // Fired-first, then ARMED, then ACK, DISMISSED
        const order: Record<TriggerState, number> = {
          FIRED: 0,
          FIRING: 1,
          ARMED: 2,
          ACK: 3,
          DISMISSED: 4,
        };
        const d = order[a.trigger.state] - order[b.trigger.state];
        if (d !== 0) return d;
        // Then by indicator weight desc
        return b.indicator.weight - a.indicator.weight;
      });
  }, [triggers, sim.id, indicatorIndex]);

  const visible = rows.filter(
    (r) => filter === "ALL" || r.trigger.state === filter,
  );

  const counts: Record<"ALL" | TriggerState, number> = {
    ALL: rows.length,
    ARMED: rows.filter((r) => r.trigger.state === "ARMED").length,
    FIRING: rows.filter((r) => r.trigger.state === "FIRING").length,
    FIRED: rows.filter((r) => r.trigger.state === "FIRED").length,
    ACK: rows.filter((r) => r.trigger.state === "ACK").length,
    DISMISSED: rows.filter((r) => r.trigger.state === "DISMISSED").length,
  };

  const firedRecent = firedInLastDays(
    rows.map((r) => r.trigger),
    7,
  );

  const handleFire = (id: string) => {
    fireTrigger(id, {
      url: evidenceUrl.trim() || undefined,
      note: evidenceNote.trim() || undefined,
    });
    setPendingFireId(null);
    setEvidenceUrl("");
    setEvidenceNote("");
    onChange();
  };

  return (
    <Card
      title="WATCHLIST // INDICATORS"
      meta={`${firedRecent} FIRED 7D · ${rows.length} TOTAL`}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {STATE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`font-mono text-[9.5px] tracking-widest px-2 py-1 border transition-colors ${
              filter === f.key
                ? "border-ink-900 bg-ink-900 text-ink-0"
                : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
            }`}
          >
            {f.label} · {counts[f.key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="font-mono text-[10.5px] text-ink-500 leading-relaxed border border-dashed border-ink-300/60 px-3 py-4">
          Keine Indikatoren im aktuellen Filter. Wechsel auf [ALL] um alle armierten Trigger einzusehen.
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {visible.map((row) => (
            <Row
              key={row.trigger.id}
              row={row}
              onFireClick={() => {
                setPendingFireId(row.trigger.id);
                setEvidenceUrl("");
                setEvidenceNote("");
              }}
              onAck={() => {
                ackTrigger(row.trigger.id);
                onChange();
              }}
              onDismiss={() => {
                dismissTrigger(row.trigger.id);
                onChange();
              }}
              onReset={() => {
                resetTrigger(row.trigger.id);
                onChange();
              }}
              onOpenNode={() => onSelectNode?.(row.node.id)}
            />
          ))}
        </ul>
      )}

      {pendingFireId && (
        <FireModal
          onCancel={() => setPendingFireId(null)}
          onConfirm={() => handleFire(pendingFireId)}
          url={evidenceUrl}
          setUrl={setEvidenceUrl}
          note={evidenceNote}
          setNote={setEvidenceNote}
          row={rows.find((r) => r.trigger.id === pendingFireId) ?? null}
        />
      )}
    </Card>
  );
}

function Row({
  row,
  onFireClick,
  onAck,
  onDismiss,
  onReset,
  onOpenNode,
}: {
  row: WatchRow;
  onFireClick: () => void;
  onAck: () => void;
  onDismiss: () => void;
  onReset: () => void;
  onOpenNode: () => void;
}) {
  const state = row.trigger.state;
  return (
    <li className="border border-ink-300/60 bg-ink-100/30 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StateChip state={state} />
            <span className="font-mono text-[9px] tracking-widest text-ink-500">
              {row.indicator.source} · W={(row.indicator.weight * 100).toFixed(0)}
            </span>
          </div>
          <div className="text-[12px] text-ink-950 leading-tight">
            {row.indicator.label}
          </div>
          <div className="font-mono text-[10px] text-ink-500 leading-relaxed mt-0.5">
            {row.indicator.description}
          </div>
          <button
            onClick={onOpenNode}
            className="mt-1 font-mono text-[10px] tracking-wider text-ink-700 hover:text-ink-1000 underline-offset-2 hover:underline text-left"
          >
            ⌖ {truncate(row.node.title, 60)}
            <span className="text-ink-500"> · {row.scenarioLabel}</span>
          </button>
          {(row.trigger.evidenceUrl || row.trigger.evidenceNote) && (
            <div className="mt-1.5 border-l-2 border-ink-900 pl-2 font-mono text-[10px] text-ink-700 leading-relaxed">
              {row.trigger.evidenceUrl && (
                <div className="truncate">↗ {row.trigger.evidenceUrl}</div>
              )}
              {row.trigger.evidenceNote && <div>{row.trigger.evidenceNote}</div>}
              {row.trigger.firedAt && (
                <div className="text-ink-500">
                  {new Date(row.trigger.firedAt).toLocaleString("de-DE")}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {state === "ARMED" && (
            <>
              <ActionBtn onClick={onFireClick}>FIRE</ActionBtn>
              <ActionBtn onClick={onDismiss} variant="ghost">
                DISMISS
              </ActionBtn>
            </>
          )}
          {state === "FIRED" && (
            <>
              <ActionBtn onClick={onAck}>ACK</ActionBtn>
              <ActionBtn onClick={onReset} variant="ghost">
                RESET
              </ActionBtn>
            </>
          )}
          {(state === "ACK" || state === "DISMISSED") && (
            <ActionBtn onClick={onReset} variant="ghost">
              RESET
            </ActionBtn>
          )}
        </div>
      </div>
    </li>
  );
}

function StateChip({ state }: { state: TriggerState }) {
  const map: Record<TriggerState, { bg: string; text: string; label: string }> = {
    ARMED: { bg: "bg-ink-200", text: "text-ink-800", label: "ARMED" },
    FIRING: { bg: "bg-ink-300", text: "text-ink-900", label: "FIRING" },
    FIRED: { bg: "bg-ink-900", text: "text-ink-0", label: "FIRED" },
    ACK: { bg: "bg-ink-700", text: "text-ink-0", label: "ACK" },
    DISMISSED: {
      bg: "bg-ink-100",
      text: "text-ink-500",
      label: "DISMISSED",
    },
  };
  const s = map[state];
  return (
    <span
      className={`font-mono text-[9px] tracking-widest px-1.5 py-0.5 ${s.bg} ${s.text} border border-ink-300/60`}
    >
      {s.label}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "border-ink-900 hover:bg-ink-900 hover:text-ink-0"
      : "border-ink-400 text-ink-600 hover:border-ink-700 hover:text-ink-900";
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[9.5px] tracking-widest px-2 py-1 border transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

function FireModal({
  onCancel,
  onConfirm,
  url,
  setUrl,
  note,
  setNote,
  row,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  url: string;
  setUrl: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  row: WatchRow | null;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-ink-1000/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-ink-0 border border-ink-900 shadow-2xl">
        <header className="flex items-center justify-between px-3 h-8 border-b border-ink-300/60 bg-ink-100">
          <span className="font-mono text-[10px] tracking-widest text-ink-900">
            [ FIRE TRIGGER · LOG EVIDENCE ]
          </span>
          <button
            onClick={onCancel}
            className="font-mono text-[10px] text-ink-700 hover:text-ink-1000"
            aria-label="close"
          >
            ✕
          </button>
        </header>
        <div className="p-4 space-y-3">
          {row && (
            <div className="border border-ink-300/60 bg-ink-100/40 p-2.5">
              <div className="font-mono text-[9px] tracking-widest text-ink-500 mb-0.5">
                {row.indicator.source} · {row.scenarioLabel}
              </div>
              <div className="text-[12px] text-ink-950 leading-tight">
                {row.indicator.label}
              </div>
              <div className="font-mono text-[10px] text-ink-500 mt-1">
                ⌖ {row.node.title}
              </div>
            </div>
          )}
          <div>
            <Label>Evidence URL (optional)</Label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2.5 py-2 text-[12px] outline-none focus:border-ink-700 focus:bg-ink-50 transition-colors font-mono"
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Observed via …"
              className="w-full bg-ink-100 border border-ink-300/60 text-ink-900 px-2.5 py-2 text-[12px] outline-none focus:border-ink-700 focus:bg-ink-50 transition-colors resize-y"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onCancel}
              className="font-mono text-[10px] tracking-widest border border-ink-400 text-ink-700 px-3 py-1.5 hover:border-ink-900 hover:text-ink-1000 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              className="font-mono text-[10px] tracking-widest border border-ink-900 bg-ink-900 text-ink-0 px-3 py-1.5 hover:bg-ink-1000 transition-colors"
            >
              ▶ FIRE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
