// WFC Boss Battle — type definitions (v2, interactive 5-round combat).
// Models a turn-based fight between the user's company and a worst-feared
// AI-native competitor. The player picks one of 2-5 dynamic choices each round.

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
  /** Risk hint shown on the card */
  risk: "low" | "medium" | "high";
  /** What the player effectively does when this is picked */
  playerMove: Move;
  /** How the competitor reacts */
  competitorResponse: Move;
  /** Stats AFTER this exchange (absolute, not delta) */
  playerStateAfter: Stats;
  /** Stats AFTER this exchange (absolute, not delta) */
  competitorStateAfter: Stats;
  /** Post-exchange narrative (2-3 sentences, dramatic) */
  exchangeNarrative: string;
};

export type Round = {
  /** 1..5 */
  roundNumber: number;
  /** Human label e.g. "Months 0-6" */
  quarterLabel: string;
  /** What just happened / where we are */
  setupNarrative: string;
  /** Hint to the player about what the competitor seems to be planning */
  competitorTell: string;
  /** 2-5 options. Later rounds typically have fewer. */
  choices: Choice[];
};

export type TodayAction = {
  action: string;
  rationale: string;
  leverage: "high" | "medium" | "low";
};

export type Endgame = {
  outcome: "victory" | "defeat" | "stalemate";
  /** Verdict headline, e.g. "Survived. Margins thin." */
  headline: string;
  /** 1-paragraph cinematic summary of how it played out */
  summary: string;
  /** Exactly 3 short reasons */
  reasons: string[];
  /** Exactly 3 actions for the user this week */
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
  /** Exactly 5 rounds, each with precomputed choices + outcomes */
  rounds: Round[];
  /** Three possible endgames; the client picks one based on final player HP */
  endgameTemplates: EndgameTemplates;
};

export type SimulationRequest = {
  company: string;
  sector: string;
  pitch: string;
};
