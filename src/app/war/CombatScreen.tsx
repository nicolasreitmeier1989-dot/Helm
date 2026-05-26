"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Choice,
  Combatant,
  Move,
  Round,
  Simulation,
  Stats,
} from "@/lib/wargame/types";
import { playClick, playHit } from "./sounds";

type Props = {
  sim: Simulation;
  onComplete: (finalPlayerStats: Stats, finalCompetitorStats: Stats) => void;
};

type Phase =
  | "setup"          // round intro card + competitor tell (2s)
  | "choosing"       // choices visible, awaiting player
  | "playerStrike"   // player card flies in, hits competitor
  | "counterStrike"  // competitor counter flies back, hits player
  | "resolved";      // exchange narrative shown briefly (3s)

const PHASE_DUR: Partial<Record<Phase, number>> = {
  setup: 2000,
  playerStrike: 1400,
  counterStrike: 1400,
  resolved: 3000,
};

export function CombatScreen({ sim, onComplete }: Props) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<Stats>(sim.player.stats);
  const [competitorStats, setCompetitorStats] = useState<Stats>(sim.competitor.stats);
  const [hitFlash, setHitFlash] = useState<"player" | "competitor" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const round: Round | undefined = sim.rounds[roundIdx];
  const chosen: Choice | undefined = useMemo(
    () => round?.choices.find((c) => c.id === chosenId),
    [round, chosenId],
  );

  /* Auto-advance through timed phases */
  useEffect(() => {
    if (!round) return;
    if (phase === "choosing") return; // wait on player
    const dur = PHASE_DUR[phase];
    if (!dur) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (phase === "setup") {
        setPhase("choosing");
      } else if (phase === "playerStrike") {
        setHitFlash("competitor");
        if (chosen) playHit(chosen.competitorResponse.intensity);
        // apply intermediate state? we just snap to final at counter
        setPhase("counterStrike");
      } else if (phase === "counterStrike") {
        setHitFlash("player");
        if (chosen) playHit(chosen.playerMove.intensity);
        if (chosen) {
          setPlayerStats(chosen.playerStateAfter);
          setCompetitorStats(chosen.competitorStateAfter);
        }
        setPhase("resolved");
      } else if (phase === "resolved") {
        // Next round or finish
        if (roundIdx >= sim.rounds.length - 1) {
          onComplete(
            chosen?.playerStateAfter ?? playerStats,
            chosen?.competitorStateAfter ?? competitorStats,
          );
        } else {
          setRoundIdx((i) => i + 1);
          setChosenId(null);
          setPhase("setup");
        }
      }
    }, dur);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, roundIdx, chosen, sim.rounds.length, onComplete, playerStats, competitorStats]);

  /* Clear hit flash quickly */
  useEffect(() => {
    if (!hitFlash) return;
    const t = setTimeout(() => setHitFlash(null), 250);
    return () => clearTimeout(t);
  }, [hitFlash]);

  const handleChoose = useCallback(
    (id: string) => {
      if (phase !== "choosing") return;
      playClick();
      setChosenId(id);
      setPhase("playerStrike");
    },
    [phase],
  );

  if (!round) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-black text-white">
      {/* Atmospheric backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 15% 50%, rgba(255,255,255,0.08), transparent 50%), radial-gradient(ellipse at 85% 50%, rgba(220,38,38,0.18), transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* HUD top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">
          10X // WFC — WAR ROOM
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] tracking-[0.4em] text-white/40">
            ROUND {round.roundNumber} / 5 · {round.quarterLabel.toUpperCase()}
          </div>
        </div>
        <div className="flex gap-0.5">
          {sim.rounds.map((_, i) => (
            <span
              key={i}
              className={`block w-6 h-0.5 ${
                i < roundIdx ? "bg-white/50" : i === roundIdx ? "bg-white" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Fight arena */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-0">
        <CombatantPanel
          side="player"
          combatant={sim.player}
          stats={playerStats}
          flash={hitFlash === "player"}
        />
        <CombatantPanel
          side="competitor"
          combatant={sim.competitor}
          stats={competitorStats}
          flash={hitFlash === "competitor"}
        />

        {/* Center: phase-dependent overlays */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {phase === "setup" && (
            <SetupCard round={round} />
          )}
          {phase === "playerStrike" && chosen && (
            <MoveCardAnimated
              move={chosen.playerMove}
              from="left"
              isPlayer
            />
          )}
          {phase === "counterStrike" && chosen && (
            <MoveCardAnimated
              move={chosen.competitorResponse}
              from="right"
            />
          )}
          {phase === "resolved" && chosen && (
            <ExchangeNarrative narrative={chosen.exchangeNarrative} />
          )}
        </div>
      </div>

      {/* Action menu (only during choosing) */}
      {phase === "choosing" && (
        <ChoiceMenu round={round} onChoose={handleChoose} />
      )}
    </div>
  );
}

/* ───────────────────── sub-components ───────────────────── */

function CombatantPanel({
  side,
  combatant,
  stats,
  flash,
}: {
  side: "player" | "competitor";
  combatant: Combatant;
  stats: Stats;
  flash: boolean;
}) {
  const align = side === "player" ? "items-start text-left" : "items-end text-right";
  const accent = side === "player" ? "#ffffff" : "#dc2626";
  return (
    <div
      className={`relative h-full p-6 md:p-10 flex flex-col ${align} transition-colors duration-150`}
      style={{ backgroundColor: flash ? `${accent}1a` : "transparent" }}
    >
      <div className={`${side === "competitor" ? "self-end" : "self-start"}`}>
        <div
          className="text-7xl md:text-9xl mb-3 font-black leading-none transition-transform duration-200"
          style={{
            color: accent,
            transform: flash ? "scale(1.12) rotate(-1deg)" : "scale(1)",
            filter: `drop-shadow(0 0 24px ${accent}80)`,
          }}
        >
          {combatant.sigil}
        </div>
        <div className="font-mono text-[10px] tracking-[0.4em] text-white/40 mb-1">
          {side === "player" ? "YOU" : "WORST FEARED COMPETITOR"}
        </div>
        <div className="font-black text-3xl md:text-4xl tracking-tight leading-none">
          {combatant.name}
        </div>
        <div className="text-white/50 text-sm mt-1.5 max-w-xs">
          {combatant.archetype}
        </div>
      </div>

      <div className="mt-6 w-full max-w-[280px] space-y-2">
        <StatBar label="HP"      value={stats.hp}      color={accent} primary />
        <StatBar label="CAPITAL" value={stats.capital} color={accent} />
        <StatBar label="SPEED"   value={stats.speed}   color={accent} />
        <StatBar label="BRAND"   value={stats.brand}   color={accent} />
        <StatBar label="IP"      value={stats.ip}      color={accent} />
      </div>

      <div className="mt-5 w-full max-w-[280px]">
        <div className="font-mono text-[10px] tracking-[0.3em] text-white/30 mb-1.5">
          CAPABILITIES
        </div>
        <div className={`flex flex-wrap gap-1 ${side === "competitor" ? "justify-end" : ""}`}>
          {combatant.capabilities.slice(0, 4).map((c) => (
            <span
              key={c}
              className="text-[10.5px] border border-white/15 px-1.5 py-0.5 text-white/60"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  color,
  primary,
}: {
  label: string;
  value: number;
  color: string;
  primary?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] font-mono tracking-[0.25em] text-white/40 mb-0.5">
        <span>{label}</span>
        <span className={primary ? "text-white font-bold" : ""}>{Math.round(value)}</span>
      </div>
      <div className={`relative ${primary ? "h-2.5" : "h-1"} bg-white/8 overflow-hidden`}>
        <div
          className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: primary ? `0 0 14px ${color}80` : undefined,
          }}
        />
      </div>
    </div>
  );
}

function SetupCard({ round }: { round: Round }) {
  return (
    <div className="max-w-2xl text-center px-6" style={{ animation: "fadeInScale 0.5s ease-out" }}>
      <div className="font-mono text-[10px] tracking-[0.5em] text-white/40 mb-3">
        ROUND {round.roundNumber}
      </div>
      <div className="font-black text-5xl md:text-7xl tracking-tighter leading-[0.9] mb-6">
        {round.quarterLabel.toUpperCase()}
      </div>
      <div className="text-white/80 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
        {round.setupNarrative}
      </div>
      <div className="mt-5 font-mono text-[11px] tracking-[0.2em] text-red-500 uppercase">
        ◆ {round.competitorTell}
      </div>
    </div>
  );
}

function MoveCardAnimated({
  move,
  from,
  isPlayer,
}: {
  move: Move;
  from: "left" | "right";
  isPlayer?: boolean;
}) {
  const color = isPlayer ? "#ffffff" : "#dc2626";
  return (
    <div
      className="relative w-80 max-w-sm p-5 border bg-black/95 backdrop-blur"
      style={{
        borderColor: color,
        boxShadow: `0 0 60px ${color}50, inset 0 0 20px ${color}20`,
        animation: `moveCardEnter${from === "left" ? "L" : "R"} 1.4s ease-out forwards`,
      }}
    >
      <div className="font-mono text-[10px] tracking-[0.3em] mb-2" style={{ color }}>
        {isPlayer ? "YOU →" : "← COMPETITOR"} · {move.category.toUpperCase()} · INTENSITY {move.intensity}
      </div>
      <div className="font-black text-2xl tracking-tight leading-tight mb-3">
        {move.name}
      </div>
      <div className="text-white/80 text-sm leading-relaxed">{move.narrative}</div>
    </div>
  );
}

function ExchangeNarrative({ narrative }: { narrative: string }) {
  return (
    <div
      className="max-w-2xl text-center px-6"
      style={{ animation: "fadeInScale 0.5s ease-out" }}
    >
      <div className="font-mono text-[10px] tracking-[0.4em] text-white/40 mb-3">
        ▼ EXCHANGE
      </div>
      <div className="text-white text-xl md:text-2xl leading-relaxed font-light max-w-xl mx-auto italic">
        &ldquo;{narrative}&rdquo;
      </div>
    </div>
  );
}

function ChoiceMenu({
  round,
  onChoose,
}: {
  round: Round;
  onChoose: (id: string) => void;
}) {
  const count = round.choices.length;
  return (
    <div className="relative z-20 bg-black border-t border-white/15 px-4 py-4">
      <div className="flex items-center justify-between mb-3 max-w-7xl mx-auto px-2">
        <div className="font-mono text-[10px] tracking-[0.4em] text-white/60">
          ▼ YOUR MOVE — PICK ONE
        </div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-white/30">
          {count} OPTION{count === 1 ? "" : "S"} AVAILABLE
        </div>
      </div>
      <div
        className="grid gap-2 max-w-7xl mx-auto"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {round.choices.map((c, i) => (
          <ChoiceCard key={c.id} choice={c} index={i + 1} onChoose={onChoose} />
        ))}
      </div>
    </div>
  );
}

const RISK_TINT: Record<Choice["risk"], string> = {
  low: "text-emerald-400 border-emerald-500/40",
  medium: "text-amber-400 border-amber-500/40",
  high: "text-red-400 border-red-500/40",
};

const INTENSITY_LABEL: Record<Choice["intensity"], string> = {
  1: "JAB",
  2: "HOOK",
  3: "FINISHER",
};

function ChoiceCard({
  choice,
  index,
  onChoose,
}: {
  choice: Choice;
  index: number;
  onChoose: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onChoose(choice.id)}
      className="group text-left p-4 border border-white/15 bg-white/0 hover:bg-white hover:text-black hover:border-white transition-colors"
      style={{ animation: `fadeInScale ${0.3 + index * 0.07}s ease-out` }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="font-mono text-[10px] tracking-[0.3em] text-white/40 group-hover:text-black/60">
          {String(index).padStart(2, "0")}
        </span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/50 group-hover:text-black/60">
          {choice.category.toUpperCase()} · {INTENSITY_LABEL[choice.intensity]}
        </span>
      </div>
      <div className="font-black text-lg md:text-xl tracking-tight leading-tight mb-2">
        {choice.label}
      </div>
      <div className="text-[12.5px] text-white/70 group-hover:text-black/80 leading-relaxed mb-3">
        {choice.description}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-white/40 group-hover:text-black/50 truncate">
          {choice.costPreview}
        </span>
        <span className={`shrink-0 ml-2 px-1.5 py-0.5 border tracking-widest ${RISK_TINT[choice.risk]}`}>
          {choice.risk.toUpperCase()} RISK
        </span>
      </div>
    </button>
  );
}
