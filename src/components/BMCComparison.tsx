"use client";

import type {
  BMCBlock,
  BMCBlockKind,
  CompetitorProfile,
  OwnProfile,
} from "@/lib/types";
import { bmcOverlapScore, labelsMatch } from "@/lib/topology";
import { BarMeter, Card, Label } from "./Chrome";

/**
 * BMCComparison — side-by-side compact view of our BMC vs theirs. Shared
 * customer-segment labels are highlighted (border between halves) so the
 * collision zones become visually obvious in the briefing context.
 */
export function BMCComparison({
  own,
  competitor,
}: {
  own: OwnProfile;
  competitor: CompetitorProfile;
}) {
  const ours = own.topology.bmc;
  const theirs = competitor.topology.bmc;
  const overlap = bmcOverlapScore(ours, theirs);

  const KINDS: { key: BMCBlockKind; label: string }[] = [
    { key: "CUSTOMER_SEGMENTS", label: "Customer Segments" },
    { key: "VALUE_PROPOSITIONS", label: "Value Propositions" },
    { key: "CHANNELS", label: "Channels" },
    { key: "KEY_RESOURCES", label: "Key Resources" },
    { key: "KEY_ACTIVITIES", label: "Key Activities" },
    { key: "KEY_PARTNERS", label: "Key Partners" },
    { key: "CUSTOMER_RELATIONSHIPS", label: "Customer Relations" },
    { key: "REVENUE_STREAMS", label: "Revenue Streams" },
    { key: "COST_STRUCTURE", label: "Cost Structure" },
  ];

  return (
    <Card title="BMC COMPARISON" meta={`OVERLAP ${overlap}/100`}>
      <div className="font-mono text-[9px] tracking-widest text-ink-500 mb-2 flex items-center justify-between">
        <span>OURS · {own.name}</span>
        <span className="text-ink-700">|</span>
        <span>THEIRS · {competitor.name}</span>
      </div>
      <ul className="space-y-2">
        {KINDS.map(({ key, label }) => {
          const aB = ours.blocks.filter((b) => b.kind === key);
          const bB = theirs.blocks.filter((b) => b.kind === key);
          return (
            <li key={key} className="border border-ink-300/60 bg-ink-100/30 p-2">
              <Label>{label}</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                <BlockColumn blocks={aB} otherBlocks={bB} />
                <div className="w-px bg-ink-300/60 self-stretch" />
                <BlockColumn blocks={bB} otherBlocks={aB} alignRight />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function BlockColumn({
  blocks,
  otherBlocks,
  alignRight = false,
}: {
  blocks: BMCBlock[];
  otherBlocks: BMCBlock[];
  alignRight?: boolean;
}) {
  if (blocks.length === 0) {
    return (
      <div className="font-mono text-[9px] text-ink-400 italic px-1">
        — leer —
      </div>
    );
  }
  return (
    <ul className={`space-y-1 ${alignRight ? "text-right" : ""}`}>
      {blocks.map((b) => {
        const matched = otherBlocks.some((o) => labelsMatch(o.label, b.label));
        return (
          <li
            key={b.id}
            className={`px-1.5 py-1 border ${
              matched ? "border-ink-900 bg-ink-200/60" : "border-transparent"
            }`}
          >
            <div className="text-[10.5px] text-ink-900 leading-tight">
              {matched && <span className="mr-1 text-ink-900">⌖</span>}
              {b.label}
            </div>
            <div
              className={`mt-1 flex items-center gap-1.5 ${
                alignRight ? "flex-row-reverse" : ""
              }`}
            >
              <span className="font-mono text-[9px] text-ink-500 w-7 shrink-0">
                {b.strength}
              </span>
              <div className="flex-1">
                <BarMeter value={b.strength} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
