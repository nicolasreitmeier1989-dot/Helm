// WFC Boss Battle — type definitions (v4 — portfolio picking + competitor-first).
// Each round: competitor strikes first, then player picks a PORTFOLIO of counter
// moves (max 1 per category, constrained by capital budget), then competitor
// follows up. Stats are computed by summing all applied effects.

export type StatKey = "hp" | "capital" | "speed" | "brand" | "ip";

export type Stats = {
  /** Market position / survival, 0-100 */
  hp: number;
  /** Runway / funding, 0-100 */
  capital: number;
  /** Execution velocity, 0-100 */
  speed: number;
  /** Customer pull, 0-100 */
  brand: number;
  /** Defensible moats / IP, 0-100 */
  ip: number;
};

export type MoveCategory =
  | "pricing"
  | "channel"
  | "ip"
  | "talent"
  | "capital"
  | "speed"
  | "brand"
  | "regulatory"
  | "product";

export const CATEGORY_ORDER: MoveCategory[] = [
  "pricing",
  "product",
  "talent",
  "capital",
  "channel",
  "brand",
  "ip",
  "regulatory",
  "speed",
];

export type Combatant = {
  name: string;
  archetype: string;
  sigil: string;     // single emoji
  color: string;     // hex
  stats: Stats;
  capabilities: string[];
};

export type Move = {
  name: string;
  category: MoveCategory;
  narrative: string;
  intensity: 1 | 2 | 3; // jab / hook / finisher
};

export type Choice = {
  /** Unique within a round */
  id: string;
  /** Short, quotable action name e.g. "Aggressive Pricing" */
  label: string;
  category: MoveCategory;
  intensity: 1 | 2 | 3;
  /** 1-2 sentence description of what the player does */
  description: string;
  /** Human-readable cost preview e.g. "Burns ~$2M and 6 weeks" */
  costPreview: string;
  /** Risk hint */
  risk: "low" | "medium" | "high";
  /** Capital units this move consumes from the round's budget */
  capitalCost: number;
  /** Move card data shown when this choice resolves */
  playerMove: Move;
  /** Stat deltas applied to the PLAYER when this choice is picked */
  selfEffect: Partial<Stats>;
  /** Stat deltas applied to the COMPETITOR when this choice is picked */
  competitorEffect: Partial<Stats>;
};

export type Round = {
  /** 1..5 */
  roundNumber: number;
  /** Human label e.g. "Months 0-6" */
  quarterLabel: string;
  /** Stage-setting line shown at round start */
  setupNarrative: string;
  /** 1-sentence hint at what the competitor is about to do */
  competitorTell: string;

  /**
   * The competitor strikes FIRST each round (Pokémon-style).
   * Player watches this hit land, takes opening damage, then picks portfolio.
   */
  competitorOpening: Move;
  openingDamageToPlayer: Partial<Stats>;
  openingCostToCompetitor: Partial<Stats>;

  /**
   * Capital budget for the round's counter-portfolio.
   * Player can pick any combination of choices whose summed capitalCost <= this.
   * Drops in later rounds to model resource depletion.
   */
  capitalBudget: number;

  /**
   * Pool of counter options. Player picks 0..N, max 1 per category.
   */
  choicePool: Choice[];

  /**
   * After player commits, competitor follows up regardless of which counters
   * were picked (their plan was already set).
   */
  competitorFollowUp: Move;
  followUpDamageToPlayer: Partial<Stats>;
  followUpCostToCompetitor: Partial<Stats>;

  /**
   * Single-sentence summary used as round-resolution caption.
   */
  resolutionLine: string;
};

export type TodayAction = {
  action: string;
  rationale: string;
  leverage: "high" | "medium" | "low";
};

export type Endgame = {
  outcome: "victory" | "defeat" | "stalemate";
  headline: string;
  summary: string;
  reasons: string[];
  todayActions: TodayAction[];
};

export type EndgameTemplates = {
  victory: Endgame;   // selected if player HP >= 60 at end
  stalemate: Endgame; // 20 <= HP < 60
  defeat: Endgame;    // HP < 20
};

export type Simulation = {
  player: Combatant;
  competitor: Combatant;
  /** Exactly 5 rounds. */
  rounds: Round[];
  endgameTemplates: EndgameTemplates;
};

export type SimulationRequest = {
  company: string;
  sector: string;
  pitch: string;
};

/* ───────────── helpers (kept in types to avoid an extra file) ───────────── */

export function clampStat(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function applyDelta(s: Stats, d: Partial<Stats>): Stats {
  return {
    hp: clampStat(s.hp + (d.hp ?? 0)),
    capital: clampStat(s.capital + (d.capital ?? 0)),
    speed: clampStat(s.speed + (d.speed ?? 0)),
    brand: clampStat(s.brand + (d.brand ?? 0)),
    ip: clampStat(s.ip + (d.ip ?? 0)),
  };
}

export function sumDeltas(...deltas: Array<Partial<Stats>>): Partial<Stats> {
  const out: Partial<Stats> = {};
  const keys: StatKey[] = ["hp", "capital", "speed", "brand", "ip"];
  for (const k of keys) {
    let v = 0;
    let any = false;
    for (const d of deltas) {
      if (d[k] != null) {
        v += d[k] as number;
        any = true;
      }
    }
    if (any) out[k] = v;
  }
  return out;
}
