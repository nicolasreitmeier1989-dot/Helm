"use client";

import { useCallback, useState } from "react";
import type { Simulation, SimulationRequest, Stats } from "@/lib/wargame/types";
import { SetupScreen } from "./SetupScreen";
import { LoadingScreen } from "./LoadingScreen";
import { CombatScreen } from "./CombatScreen";
import { EndScreen } from "./EndScreen";
import { unlockAudio } from "./sounds";

type Phase = "setup" | "loading" | "combat" | "end";

export function WarRoom() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [sim, setSim] = useState<Simulation | null>(null);
  const [finalStats, setFinalStats] = useState<{ player: Stats; competitor: Stats } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async (req: SimulationRequest) => {
    unlockAudio();
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/wargame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Server returned ${res.status}`);
      }
      const data = (await res.json()) as Simulation;
      setSim(data);
      setPhase("combat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPhase("setup");
    }
  }, []);

  const handleCombatEnd = useCallback(
    (playerFinal: Stats, competitorFinal: Stats) => {
      setFinalStats({ player: playerFinal, competitor: competitorFinal });
      setPhase("end");
    },
    [],
  );

  const handlePlayAgain = useCallback(() => {
    setSim(null);
    setFinalStats(null);
    setError(null);
    setPhase("setup");
  }, []);

  return (
    <main className="min-h-screen w-full overflow-hidden">
      {phase === "setup" && <SetupScreen onStart={handleStart} error={error} />}
      {phase === "loading" && <LoadingScreen />}
      {phase === "combat" && sim && (
        <CombatScreen sim={sim} onComplete={handleCombatEnd} />
      )}
      {phase === "end" && sim && finalStats && (
        <EndScreen
          sim={sim}
          finalPlayerStats={finalStats.player}
          finalCompetitorStats={finalStats.competitor}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </main>
  );
}
