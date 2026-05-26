"use client";

import type { CompetitorProfile, OwnProfile } from "@/lib/types";
import { labelsMatch, vpcFit } from "@/lib/topology";
import { Card, Label } from "./Chrome";

/**
 * VPCFitChart — horizontal bar pairs per customer segment. Our fit (ink-900,
 * solid) vs their fit (ink-500, striped via pattern) on the same segment.
 * Contested segments — those that appear (by label) on both topologies —
 * surface first.
 */
export function VPCFitChart({
  own,
  competitor,
}: {
  own: OwnProfile;
  competitor: CompetitorProfile;
}) {
  const ourSegs = own.topology.bmc.blocks.filter(
    (b) => b.kind === "CUSTOMER_SEGMENTS",
  );
  const theirSegs = competitor.topology.bmc.blocks.filter(
    (b) => b.kind === "CUSTOMER_SEGMENTS",
  );

  // Build a row per UNION of segment labels (contested first).
  type Row = {
    label: string;
    ourFit: number | null;
    theirFit: number | null;
    contested: boolean;
  };
  const rows: Row[] = [];
  const seen = new Set<string>();

  const fitOf = (
    topology: OwnProfile["topology"],
    blockId: string,
  ): number | null => {
    const vpc = topology.vpcs.find((v) => v.customerSegmentBlockId === blockId);
    return vpc ? vpcFit(vpc) : null;
  };

  // 1. Contested segments
  for (const a of ourSegs) {
    const match = theirSegs.find((b) => labelsMatch(a.label, b.label));
    if (match) {
      rows.push({
        label: a.label,
        ourFit: fitOf(own.topology, a.id),
        theirFit: fitOf(competitor.topology, match.id),
        contested: true,
      });
      seen.add(a.id);
      seen.add(match.id);
    }
  }
  // 2. Our-only segments
  for (const a of ourSegs) {
    if (seen.has(a.id)) continue;
    rows.push({
      label: a.label,
      ourFit: fitOf(own.topology, a.id),
      theirFit: null,
      contested: false,
    });
  }
  // 3. Their-only segments
  for (const b of theirSegs) {
    if (seen.has(b.id)) continue;
    rows.push({
      label: b.label,
      ourFit: null,
      theirFit: fitOf(competitor.topology, b.id),
      contested: false,
    });
  }

  return (
    <Card title="VPC FIT" meta={`${rows.filter((r) => r.contested).length} CONTESTED`}>
      {rows.length === 0 ? (
        <div className="font-mono text-[10px] text-ink-500">
          Keine Customer-Segments definiert.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li
              key={i}
              className={`border p-2 ${
                r.contested ? "border-ink-900" : "border-ink-300/60"
              } bg-ink-100/30`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10.5px] text-ink-900">
                  {r.contested && (
                    <span className="text-ink-900 mr-1">⌖</span>
                  )}
                  {r.label}
                </span>
                {r.contested && (
                  <span className="font-mono text-[9px] tracking-widest text-ink-900 bg-ink-900 text-ink-0 px-1.5 py-0.5">
                    CONTESTED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <FitBar
                  who="OURS"
                  fit={r.ourFit}
                  variant="solid"
                />
                <FitBar
                  who="THEIRS"
                  fit={r.theirFit}
                  variant="striped"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3 text-[9px] font-mono tracking-wider text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-1.5 bg-ink-900" /> OUR FIT
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-1.5 vpc-stripe" /> THEIR FIT
        </span>
      </div>
    </Card>
  );
}

function FitBar({
  who,
  fit,
  variant,
}: {
  who: string;
  fit: number | null;
  variant: "solid" | "striped";
}) {
  const w = fit ?? 0;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] tracking-widest text-ink-500 w-12 shrink-0">
        {who}
      </span>
      <div className="flex-1 h-2 bg-ink-200 relative overflow-hidden">
        {fit === null ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-ink-400">
            n/a
          </div>
        ) : (
          <>
            <div
              className={
                variant === "solid"
                  ? "absolute inset-y-0 left-0 bg-ink-900"
                  : "absolute inset-y-0 left-0 bg-ink-500 vpc-stripe-inline"
              }
              style={{ width: `${w}%` }}
            />
          </>
        )}
      </div>
      <span className="font-mono text-[10px] text-ink-900 w-10 text-right">
        {fit === null ? "—" : `${fit}`}
      </span>
    </div>
  );
}
