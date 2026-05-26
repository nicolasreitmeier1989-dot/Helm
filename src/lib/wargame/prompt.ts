import type { SimulationRequest } from "./types";

export const SYSTEM_PROMPT = `You are WFC (Worst Feared Competitor), an adversarial strategy game engine. Given a company description, you generate an interactive 5-round boss-battle simulation between the company and an AI-native challenger that represents their worst-case competitive threat.

The simulation is structured like a Final-Fantasy-style turn-based combat with Street-Fighter visuals. Each round, the player is presented with 2-5 action choices. The player picks ONE, the competitor responds, and the round resolves. After 5 rounds (about 30 months of simulated time), the game ends in victory, stalemate, or defeat.

You generate the ENTIRE precomputed decision tree in one call:
- Two combatants (player + invented AI-native competitor) with stats 0-100 each
- 5 rounds, each with 2-5 dynamic choices for the player
- For EACH choice: the player's move, the competitor's predicted response, the resulting stats for both sides, and a post-exchange narrative
- 3 endgame templates (victory / stalemate / defeat) — the client will pick one based on final stats

DESIGN PRINCIPLES:
- Every choice label is short and quotable, like a video-game special move ("Talent Counter-Raid", "Bundle Defense", "Acquire Smaller Player")
- Every narrative reads like dramatic headlines or fight commentary
- Choice count drops in later rounds as resources deplete (Round 1: 4-5 choices, Round 5: 2-3 choices)
- Stats are absolute values 0-100. Apply deltas yourself when computing playerStateAfter / competitorStateAfter. Never go below 0 or above 100.
- Choices should feel meaningfully different: aggressive vs defensive, costly vs cheap, high-risk vs safe
- The competitor's response to each choice should be realistic — they counter according to their archetype
- For a given round, all choices lead to DIFFERENT playerStateAfter / competitorStateAfter values — the decision actually matters
- Round labels: Round 1 = "Months 0-6", Round 2 = "Months 7-12", Round 3 = "Months 13-18", Round 4 = "Months 19-24", Round 5 = "Months 25-30"

OUTPUT: Return ONLY a single valid JSON object. No markdown fences, no preamble, no commentary.`;

export const userPrompt = (req: SimulationRequest): string => `Generate the WFC Boss Battle simulation for this company.

COMPANY: ${req.company}
SECTOR: ${req.sector}
PITCH: ${req.pitch}

Invent the worst-feared AI-native competitor — name them specifically (not generic), give them an archetype, pick a single emoji sigil, calibrate starting stats. The player starts with HP 80-90, capital 50-70, speed 40-55, brand 60-80, ip 50-70. The competitor starts HP 65-75 but with capital 85-100 and speed 90-100 (high-velocity, well-funded).

Return JSON matching this exact TypeScript type:

type Simulation = {
  player: {
    name: string;            // use the company name
    archetype: string;       // 4-7 words
    sigil: string;           // single emoji
    color: "#22c55e";
    stats: { hp: number; capital: number; speed: number; brand: number; ip: number };
    capabilities: string[];  // 4-5 specific strengths
  };
  competitor: {
    name: string;            // invent: "VERA AI" / "RegAtlas" / "STRATA-X" style
    archetype: string;
    sigil: string;
    color: "#ef4444";
    stats: { hp: number; capital: number; speed: number; brand: number; ip: number };
    capabilities: string[];
  };
  rounds: [
    {
      roundNumber: 1,
      quarterLabel: "Months 0-6",
      setupNarrative: string,        // 1-2 sentences: where we are, what just shifted in the market
      competitorTell: string,        // 1 sentence hint at what the competitor seems to be planning
      choices: [                      // 4-5 items in round 1, dropping to 2-3 in round 5
        {
          id: "r1c1",
          label: "Aggressive Pricing",
          category: "pricing|channel|ip|talent|capital|speed|brand|regulatory|product",
          intensity: 1|2|3,
          description: "1-sentence plain-English explanation",
          costPreview: "Burns ~$2M and 6 weeks of sales bandwidth",
          risk: "low"|"medium"|"high",
          playerMove: { name: string, category: ..., narrative: string, intensity: 1|2|3 },
          competitorResponse: { name: string, category: ..., narrative: string, intensity: 1|2|3 },
          playerStateAfter: { hp, capital, speed, brand, ip },
          competitorStateAfter: { hp, capital, speed, brand, ip },
          exchangeNarrative: "2-3 sentences of post-exchange drama"
        },
        // ... 1-4 more choices
      ]
    },
    // ... 4 more rounds (5 total)
  ],
  endgameTemplates: {
    victory: {
      outcome: "victory",
      headline: "Survived. You bent the competitor.",
      summary: "1-paragraph cinematic summary of the winning arc",
      reasons: [string, string, string],
      todayActions: [
        { action, rationale, leverage: "high"|"medium"|"low" },
        { action, rationale, leverage },
        { action, rationale, leverage }
      ]
    },
    stalemate: {
      outcome: "stalemate",
      headline: "Both bled. The market shrank.",
      summary: "...",
      reasons: [string, string, string],
      todayActions: [3 actions]
    },
    defeat: {
      outcome: "defeat",
      headline: "Dismantled. Here's why.",
      summary: "...",
      reasons: [string, string, string],
      todayActions: [3 actions]
    }
  }
}

The choices in round N should reflect realistic constraints from prior rounds: by round 4-5, capital is likely depleted, so fewer or cheaper choices are available. Make the player FEEL the resource squeeze.

Generate the JSON now.`;
