"use client";

import { useMemo } from "react";
import type { CompetitorProfile, OwnProfile, Scenario } from "@/lib/types";
import { sensitivitySweep } from "@/lib/sensitivity";
import { Card, Label } from "./Chrome";

export function SensitivityPanel({
  competitor,
  own,
  scenarios,
}: {
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
}) {
  const report = useMemo(
    () => sensitivitySweep(competitor, own, scenarios),
    [competitor, own, scenarios],
  );

  const maxAbs = Math.max(1, ...report.rows.map((r) => Math.abs(r.delta)));

  return (
    <Card title="SENSITIVITY SWEEP" meta={`BASELINE T=${report.baseline}`}>
      <div className="mb-3">
        <Label>Welche Treiber bewegen den Threat Index?</Label>
        <div className="text-[11px] text-ink-500 leading-relaxed">
          Δ relativ zur aktuellen Konfiguration. Größere Balken = höhere Hebelwirkung.
        </div>
      </div>

      <div className="space-y-1.5">
        {report.rows.map((r, i) => {
          const pct = (Math.abs(r.delta) / maxAbs) * 100;
          const isPositive = r.delta > 0;
          const isNeutral = r.delta === 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-wider text-ink-700 w-36 truncate">
                {r.label}
              </span>
              <div className="flex-1 flex items-center">
                <div className="flex-1 flex justify-end">
                  {!isPositive && !isNeutral && (
                    <div
                      className="h-3 bg-ink-500"
                      style={{ width: `${pct / 2}%` }}
                    />
                  )}
                </div>
                <div className="w-px h-3 bg-ink-700" />
                <div className="flex-1">
                  {isPositive && (
                    <div
                      className="h-3 bg-ink-1000"
                      style={{ width: `${pct / 2}%` }}
                    />
                  )}
                </div>
              </div>
              <span
                className={`font-mono text-[10px] w-14 text-right ${
                  isPositive
                    ? "text-ink-1000"
                    : isNeutral
                      ? "text-ink-500"
                      : "text-ink-700"
                }`}
              >
                {r.delta > 0 ? "+" : ""}
                {r.delta} → {r.variant}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
