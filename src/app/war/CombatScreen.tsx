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
import { applyDelta, CATEGORY_ORDER, sumDeltas } from "@/lib/wargame/types";
import { playClick, playHit } from "./sounds";

type Props = {
  sim: Simulation;
  onComplete: (finalPlayerStats: Stats, finalCompetitorStats: Stats) => void;
};

/* Pokémon-style round flow:
 *
 * setup        → round intro card (1.4s)
 * comp_open    → "VERA AI moves first!" + opening card flies in + damage (~3.5s)
 * choose       → portfolio menu, idle animations on sigils (waits on player)
 * player_play  → each picked choice plays in sequence (1.6s/each)
 * comp_follow  → competitor follow-up card (~2.5s)
 * resolved     → round resolution caption + next-round preview (~2.5s)
 */
type Phase =
  | "setup"
  | "comp_open"
  | "choose"
  | "player_play"
  | "comp_follow"
  | "resolved";

export function CombatScreen({ sim, onComplete }: Props) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [playOrderIdx, setPlayOrderIdx] = useState(0);
  const [playerStats, setPlayerStats] = useState<Stats>(sim.player.stats);
  const [competitorStats, setCompetitorStats] = useState<Stats>(sim.competitor.stats);
  const [textBox, setTextBox] = useState<string | null>(null);
  const [hitFlash, setHitFlash] = useState<"player" | "competitor" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const round: Round | undefined = sim.rounds[roundIdx];
  const pickedChoices: Choice[] = useMemo(
    () =>
      round
        ? round.choicePool.filter((c) => pickedIds.has(c.id))
        : [],
    [round, pickedIds],
  );
  const capitalSpent = useMemo(
    () => pickedChoices.reduce((s, c) => s + c.capitalCost, 0),
    [pickedChoices],
  );
  const capitalRemaining = round ? round.capitalBudget - capitalSpent : 0;
  const pickedCategories = useMemo(
    () => new Set(pickedChoices.map((c) => c.category)),
    [pickedChoices],
  );

  /* ───────────── phase machine ───────────── */

  const advance = useCallback(() => {
    if (!round) return;

    if (phase === "setup") {
      // Show opening text immediately, animate hit shortly after
      setTextBox(`${sim.competitor.name.toUpperCase()} MOVES FIRST!`);
      setPhase("comp_open");
      return;
    }

    if (phase === "comp_open") {
      // Apply opening damage to player + cost to competitor
      const newPlayer = applyDelta(playerStats, round.openingDamageToPlayer);
      const newComp = applyDelta(competitorStats, round.openingCostToCompetitor);
      setPlayerStats(newPlayer);
      setCompetitorStats(newComp);
      setHitFlash("player");
      playHit(round.competitorOpening.intensity);
      setTextBox(`${sim.player.name.toUpperCase()} took the hit. YOUR MOVE.`);
      // Move to choose after short delay
      timerRef.current = setTimeout(() => {
        setHitFlash(null);
        setTextBox(null);
        setPhase("choose");
      }, 1800);
      return;
    }

    if (phase === "player_play") {
      // Play each picked choice in sequence
      if (playOrderIdx >= pickedChoices.length) {
        // All player moves played; move to competitor follow-up
        setPhase("comp_follow");
        setTextBox(`${sim.competitor.name.toUpperCase()} RESPONDS...`);
        timerRef.current = setTimeout(() => {
          setTextBox(null);
          advance();
        }, 1400);
        return;
      }
      const ch = pickedChoices[playOrderIdx];
      // Apply effects
      setPlayerStats((s) => applyDelta(s, ch.selfEffect));
      setCompetitorStats((s) => applyDelta(s, ch.competitorEffect));
      setHitFlash("competitor");
      playHit(ch.intensity);
      setTextBox(`${sim.player.name.toUpperCase()} used ${ch.label.toUpperCase()}!`);
      timerRef.current = setTimeout(() => {
        setHitFlash(null);
        setTextBox(null);
        setPlayOrderIdx((i) => i + 1);
      }, 1700);
      return;
    }

    if (phase === "comp_follow") {
      // Apply follow-up effects
      setPlayerStats((s) => applyDelta(s, round.followUpDamageToPlayer));
      setCompetitorStats((s) => applyDelta(s, round.followUpCostToCompetitor));
      setHitFlash("player");
      playHit(round.competitorFollowUp.intensity);
      setTextBox(
        `${sim.competitor.name.toUpperCase()} used ${round.competitorFollowUp.name.toUpperCase()}!`,
      );
      timerRef.current = setTimeout(() => {
        setHitFlash(null);
        setTextBox(round.resolutionLine);
        setPhase("resolved");
      }, 1800);
      return;
    }

    if (phase === "resolved") {
      // Advance round or finish
      setTextBox(null);
      if (roundIdx >= sim.rounds.length - 1) {
        onComplete(playerStats, competitorStats);
        return;
      }
      setRoundIdx((i) => i + 1);
      setPickedIds(new Set());
      setPlayOrderIdx(0);
      setPhase("setup");
    }
  }, [
    phase,
    round,
    playerStats,
    competitorStats,
    pickedChoices,
    playOrderIdx,
    roundIdx,
    sim.competitor.name,
    sim.player.name,
    sim.rounds.length,
    onComplete,
  ]);

  /* Auto-tick timed phases */
  useEffect(() => {
    if (!round) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (phase === "setup") {
      timerRef.current = setTimeout(() => advance(), 1400);
    } else if (phase === "comp_open") {
      // Wait for "MOVES FIRST" text, then animate damage
      timerRef.current = setTimeout(() => advance(), 1500);
    } else if (phase === "player_play") {
      // First call seeds the sequence
      timerRef.current = setTimeout(() => advance(), 100);
    } else if (phase === "resolved") {
      timerRef.current = setTimeout(() => advance(), 2800);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  /* Sequence player picks one-by-one */
  useEffect(() => {
    if (phase !== "player_play") return;
    if (playOrderIdx === 0) return; // first one triggered by phase-enter
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => advance(), 100);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playOrderIdx, phase]);

  const handleToggle = useCallback(
    (choice: Choice) => {
      if (phase !== "choose") return;
      setPickedIds((prev) => {
        const next = new Set(prev);
        if (next.has(choice.id)) {
          next.delete(choice.id);
          playClick();
          return next;
        }
        // Reject if another from same category already picked
        const collision = Array.from(next).some((id) => {
          const c = round?.choicePool.find((p) => p.id === id);
          return c?.category === choice.category;
        });
        if (collision) return prev;
        // Reject if would exceed capital
        if (capitalSpent + choice.capitalCost > (round?.capitalBudget ?? 0)) {
          return prev;
        }
        next.add(choice.id);
        playClick();
        return next;
      });
    },
    [phase, round, capitalSpent],
  );

  const handleCommit = useCallback(() => {
    if (phase !== "choose") return;
    playClick();
    setPlayOrderIdx(0);
    setPhase("player_play");
  }, [phase]);

  if (!round) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-black text-white">
      {/* Backdrop */}
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

      {/* HUD */}
      <header className="relative z-10 px-4 md:px-6 py-3 md:py-4 border-b border-white/15">
        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 hidden md:block">
            10X // WFC — WAR ROOM
          </div>
          <div className="flex-1 text-center">
            <div className="font-black text-base md:text-xl tracking-tight">
              ROUND {round.roundNumber}
              <span className="text-white/40"> / 5</span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/50 mt-0.5">
              {round.quarterLabel.toUpperCase()}
            </div>
          </div>
          <div className="flex gap-1">
            {sim.rounds.map((_, i) => (
              <span
                key={i}
                className={`block w-3 md:w-4 h-2 md:h-2.5 transition-colors ${
                  i < roundIdx
                    ? "bg-white"
                    : i === roundIdx
                    ? "bg-white animate-pulse"
                    : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Arena */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-0">
        <CombatantPanel
          side="player"
          combatant={sim.player}
          stats={playerStats}
          flash={hitFlash === "player"}
          idle={phase === "choose"}
        />
        <CombatantPanel
          side="competitor"
          combatant={sim.competitor}
          stats={competitorStats}
          flash={hitFlash === "competitor"}
          idle={phase === "choose"}
        />

        {/* Center overlays */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4">
          {phase === "setup" && <SetupCard round={round} />}
          {phase === "comp_open" && (
            <MoveCardAnimated
              move={round.competitorOpening}
              from="right"
              isPlayer={false}
            />
          )}
          {phase === "player_play" &&
            pickedChoices[playOrderIdx] && (
              <MoveCardAnimated
                move={pickedChoices[playOrderIdx].playerMove}
                from="left"
                isPlayer
              />
            )}
          {phase === "comp_follow" && (
            <MoveCardAnimated
              move={round.competitorFollowUp}
              from="right"
              isPlayer={false}
            />
          )}
          {phase === "resolved" && (
            <ResolvedBanner roundNumber={round.roundNumber} />
          )}
        </div>
      </div>

      {/* Pokémon-style text box */}
      {textBox && <TextBox text={textBox} />}

      {/* Action menu — portfolio picker */}
      {phase === "choose" && (
        <ChoiceMenu
          round={round}
          pickedIds={pickedIds}
          pickedCategories={pickedCategories}
          capitalSpent={capitalSpent}
          capitalRemaining={capitalRemaining}
          onToggle={handleToggle}
          onCommit={handleCommit}
        />
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
  idle,
}: {
  side: "player" | "competitor";
  combatant: Combatant;
  stats: Stats;
  flash: boolean;
  idle: boolean;
}) {
  const align = side === "player" ? "items-start text-left" : "items-end text-right";
  const accent = side === "player" ? "#ffffff" : "#dc2626";
  const idleClass = idle
    ? side === "player"
      ? "animate-playerIdle"
      : "animate-competitorIdle"
    : "";
  return (
    <div
      className={`relative h-full p-4 md:p-10 flex flex-col ${align} transition-colors duration-150`}
      style={{ backgroundColor: flash ? `${accent}1a` : "transparent" }}
    >
      <div className={`${side === "competitor" ? "self-end" : "self-start"}`}>
        <div
          className={`text-6xl md:text-9xl mb-3 font-black leading-none transition-transform duration-200 ${idleClass}`}
          style={{
            color: accent,
            transform: flash ? "scale(1.12) rotate(-1deg)" : undefined,
            filter: `drop-shadow(0 0 24px ${accent}80)`,
          }}
        >
          {combatant.sigil}
        </div>
        <div className="font-mono text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.4em] text-white/40 mb-1">
          {side === "player" ? "YOU" : "WORST FEARED COMPETITOR"}
        </div>
        <div className="font-black text-2xl md:text-4xl tracking-tight leading-none">
          {combatant.name}
        </div>
        <div className="hidden md:block text-white/50 text-sm mt-1.5 max-w-xs">
          {combatant.archetype}
        </div>
      </div>

      <div className="mt-4 md:mt-6 w-full max-w-[280px] space-y-1.5 md:space-y-2">
        <StatBar label="HP"      value={stats.hp}      color={accent} primary />
        <StatBar label="CAPITAL" value={stats.capital} color={accent} />
        <StatBar label="SPEED"   value={stats.speed}   color={accent} />
        <StatBar label="BRAND"   value={stats.brand}   color={accent} />
        <StatBar label="IP"      value={stats.ip}      color={accent} />
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
      <div className={`relative ${primary ? "h-2.5" : "h-1"} bg-white/10 overflow-hidden`}>
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
    <div className="max-w-2xl text-center px-4" style={{ animation: "fadeInScale 0.5s ease-out" }}>
      <div className="font-mono text-[10px] tracking-[0.5em] text-white/40 mb-3">
        ROUND {round.roundNumber}
      </div>
      <div className="font-black text-4xl md:text-7xl tracking-tighter leading-[0.9] mb-6">
        {round.quarterLabel.toUpperCase()}
      </div>
      <div className="text-white/85 text-sm md:text-lg leading-relaxed max-w-xl mx-auto">
        {round.setupNarrative}
      </div>
      <div className="mt-5 font-mono text-[10px] md:text-[11px] tracking-[0.2em] text-red-500 uppercase">
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
      className="relative w-72 md:w-80 max-w-sm p-4 md:p-5 border bg-black/95 backdrop-blur"
      style={{
        borderColor: color,
        boxShadow: `0 0 60px ${color}50, inset 0 0 20px ${color}20`,
        animation: `moveCardEnter${from === "left" ? "L" : "R"} 1.4s ease-out forwards`,
      }}
    >
      <div className="font-mono text-[10px] tracking-[0.3em] mb-2" style={{ color }}>
        {isPlayer ? "YOU →" : "← COMPETITOR"} · {move.category.toUpperCase()} · INTENSITY {move.intensity}
      </div>
      <div className="font-black text-xl md:text-2xl tracking-tight leading-tight mb-3">
        {move.name}
      </div>
      <div className="text-white/85 text-sm leading-relaxed">{move.narrative}</div>
    </div>
  );
}

function ResolvedBanner({ roundNumber }: { roundNumber: number }) {
  return (
    <div className="text-center px-4" style={{ animation: "fadeInScale 0.5s ease-out" }}>
      <div className="font-mono text-[10px] tracking-[0.5em] text-white/40 mb-2">
        ROUND {roundNumber} ENDS
      </div>
      <div className="font-black text-3xl md:text-5xl tracking-tighter">
        {roundNumber < 5 ? `▶ ROUND ${roundNumber + 1}` : "▶ POSTMORTEM"}
      </div>
    </div>
  );
}

function TextBox({ text }: { text: string }) {
  // Typewriter effect: reveal text char-by-char
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [text]);
  const done = shown >= text.length;
  return (
    <div
      className="relative z-30 mx-auto w-full max-w-3xl px-4 md:px-6 pb-4 md:pb-6"
      style={{ animation: "fadeInScale 0.25s ease-out" }}
    >
      <div className="border-2 border-white bg-black/95 px-5 py-4 md:px-7 md:py-5 font-mono text-sm md:text-base tracking-wide leading-relaxed shadow-[0_0_40px_rgba(255,255,255,0.15)]">
        <span>{text.slice(0, shown)}</span>
        {done && <span className="ml-2 inline-block animate-pulse">▼</span>}
      </div>
    </div>
  );
}

/* ───────── portfolio picker ───────── */

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

const CATEGORY_HUES: Record<string, string> = {
  pricing: "190 100% 70%",
  product: "220 90% 70%",
  talent: "280 80% 75%",
  capital: "45 90% 65%",
  channel: "150 70% 65%",
  brand: "320 85% 75%",
  ip: "30 90% 70%",
  regulatory: "210 60% 65%",
  speed: "10 90% 70%",
};

function ChoiceMenu({
  round,
  pickedIds,
  pickedCategories,
  capitalSpent,
  capitalRemaining,
  onToggle,
  onCommit,
}: {
  round: Round;
  pickedIds: Set<string>;
  pickedCategories: Set<string>;
  capitalSpent: number;
  capitalRemaining: number;
  onToggle: (c: Choice) => void;
  onCommit: () => void;
}) {
  // Group choices by category for a cleaner grid
  const byCategory = useMemo(() => {
    const m = new Map<string, Choice[]>();
    for (const cat of CATEGORY_ORDER) m.set(cat, []);
    for (const c of round.choicePool) {
      if (!m.has(c.category)) m.set(c.category, []);
      m.get(c.category)!.push(c);
    }
    return Array.from(m.entries()).filter(([, arr]) => arr.length > 0);
  }, [round]);

  const pickedCount = pickedIds.size;
  const canCommit = pickedCount > 0;

  // Capital pressure: <25% remaining = red, <50% = amber, else white.
  const remainPct = round.capitalBudget > 0
    ? capitalRemaining / round.capitalBudget
    : 0;
  const capitalAccent =
    capitalRemaining < 0
      ? "#ef4444"
      : remainPct < 0.25
      ? "#dc2626"
      : remainPct < 0.5
      ? "#f59e0b"
      : "#ffffff";
  const capitalLabel =
    remainPct < 0.25 ? "CAPITAL THIN" : remainPct < 0.5 ? "CAPITAL TIGHT" : "CAPITAL";

  return (
    <div className="relative z-20 bg-black/95 backdrop-blur border-t-2 border-white/20 px-3 md:px-6 pt-3 md:pt-4 pb-4 md:pb-5">
      <div className="flex items-center justify-between gap-3 mb-3 max-w-7xl mx-auto">
        <div className="font-mono text-[10px] tracking-[0.4em] text-white/70">
          ▼ YOUR PORTFOLIO — MAX 1 PER CATEGORY
        </div>
        <div className="flex items-center gap-3 md:gap-5 font-mono text-[10px] tracking-[0.25em]">
          <span className="text-white/40">
            {capitalLabel}{" "}
            <span style={{ color: capitalAccent }} className="font-bold">
              {capitalRemaining}
            </span>
            <span className="text-white/30"> / {round.capitalBudget}</span>
          </span>
          <span className="text-white/40">
            PICKED <span className="text-white">{pickedCount}</span>
          </span>
        </div>
      </div>

      {/* Capital bar — colored by pressure */}
      <div className="relative h-1 bg-white/10 mb-3 md:mb-4 max-w-7xl mx-auto overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{
            width: `${Math.min(100, (capitalSpent / round.capitalBudget) * 100)}%`,
            backgroundColor: capitalAccent,
            boxShadow: capitalAccent !== "#ffffff" ? `0 0 12px ${capitalAccent}90` : undefined,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {round.choicePool.map((c, i) => (
          <ChoiceCard
            key={c.id}
            choice={c}
            index={i + 1}
            picked={pickedIds.has(c.id)}
            disabled={
              !pickedIds.has(c.id) &&
              (pickedCategories.has(c.category) ||
                c.capitalCost > capitalRemaining)
            }
            onToggle={onToggle}
          />
        ))}
      </div>

      <div className="mt-3 md:mt-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="text-[10px] md:text-[11px] font-mono text-white/40 tracking-wider text-center md:text-left">
          Stack moves across categories. Capital is finite. Commit when ready.
        </div>
        <button
          onClick={onCommit}
          disabled={!canCommit}
          className="px-5 md:px-8 py-3 md:py-3.5 font-mono tracking-[0.3em] text-xs md:text-sm bg-white text-black hover:bg-red-500 hover:text-white disabled:bg-white/15 disabled:text-white/40 transition-colors"
        >
          {canCommit
            ? `▶ COMMIT ${pickedCount} MOVE${pickedCount === 1 ? "" : "S"}`
            : "PICK AT LEAST ONE MOVE"}
        </button>
      </div>
    </div>
  );
}

function ChoiceCard({
  choice,
  index,
  picked,
  disabled,
  onToggle,
}: {
  choice: Choice;
  index: number;
  picked: boolean;
  disabled: boolean;
  onToggle: (c: Choice) => void;
}) {
  const hue = CATEGORY_HUES[choice.category] ?? "0 0% 80%";
  const borderClass = picked
    ? "border-white bg-white/10"
    : disabled
    ? "border-white/8 bg-white/0 opacity-40"
    : "border-white/20 bg-white/0 hover:border-white hover:bg-white/5";
  return (
    <button
      onClick={() => onToggle(choice)}
      disabled={disabled}
      className={`group relative text-left p-3 md:p-3.5 border-2 transition-all ${borderClass}`}
      style={{
        animation: `fadeInScale ${0.25 + index * 0.04}s ease-out`,
      }}
    >
      {/* Category color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: `hsl(${hue})`, opacity: picked ? 1 : 0.5 }}
      />
      <div className="flex items-baseline justify-between gap-2 mb-1.5 pt-1">
        <span
          className="font-mono text-[9px] tracking-[0.3em]"
          style={{ color: `hsl(${hue})` }}
        >
          {choice.category.toUpperCase()}
        </span>
        <span className="font-mono text-[9px] tracking-[0.25em] text-white/40">
          {INTENSITY_LABEL[choice.intensity]} · {choice.capitalCost}c
        </span>
      </div>
      <div className="font-black text-base md:text-[17px] tracking-tight leading-tight mb-1.5">
        {choice.label}
      </div>
      <div className="text-[12px] text-white/70 leading-relaxed mb-2 line-clamp-3">
        {choice.description}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-white/40 truncate">{choice.costPreview}</span>
        <span className={`shrink-0 ml-2 px-1.5 py-0.5 border tracking-widest ${RISK_TINT[choice.risk]}`}>
          {choice.risk.toUpperCase()}
        </span>
      </div>
      {picked && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-white text-black flex items-center justify-center font-black text-xs">
          ✓
        </div>
      )}
    </button>
  );
}
