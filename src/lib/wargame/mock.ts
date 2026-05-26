import type { Simulation, SimulationRequest } from "./types";

/**
 * Fallback simulation used when no ANTHROPIC_API_KEY is configured
 * or the LLM call fails. Lets the demo run end-to-end without keys.
 *
 * Boss Battle v2: 5 rounds, dynamic choices per round (5 -> 3 as resources thin).
 */
export const mockSimulation = (req: SimulationRequest): Simulation => ({
  player: {
    name: req.company || "Your Company",
    archetype: req.sector ? `Incumbent ${req.sector} operator` : "Incumbent operator",
    sigil: "◆",
    color: "#0a0a0a",
    stats: { hp: 85, capital: 60, speed: 45, brand: 75, ip: 65 },
    capabilities: [
      "Existing customer relationships",
      "Regulatory & compliance know-how",
      "Established sales channel",
      "Domain expertise",
    ],
  },
  competitor: {
    name: "VERA AI",
    archetype: "AI-Native Workflow Disruptor",
    sigil: "▲",
    color: "#dc2626",
    stats: { hp: 70, capital: 95, speed: 95, brand: 25, ip: 30 },
    capabilities: [
      "Sub-zero pricing runway (24-36 months)",
      "Zero-marginal-cost automation",
      "Founder-led GTM with sharp narrative",
      "AI-native UX from day one",
      "Recruits 10x talent at premium",
    ],
  },
  rounds: [
    /* ─────────────── ROUND 1 — Months 0-6 ─────────────── */
    {
      roundNumber: 1,
      quarterLabel: "Months 0-6",
      setupNarrative:
        "VERA AI launches with a viral demo. Three of your enterprise prospects mention them in this week's discovery calls. The market is suddenly aware they exist.",
      competitorTell: "They're about to test pricing. Hard.",
      choices: [
        {
          id: "r1c1",
          label: "Bundle Defense",
          category: "pricing",
          intensity: 1,
          description:
            "Add managed-service hours into existing contracts at no extra cost. Same price, more value.",
          costPreview: "Burns ~$0.5M in services bandwidth",
          risk: "low",
          playerMove: {
            name: "Bundle Defense",
            category: "pricing",
            narrative:
              "You quietly upgrade every active contract with 20 hours of managed-service per quarter. Sales saves two wobbly deals on Friday.",
            intensity: 1,
          },
          competitorResponse: {
            name: "Stealth Land-Grab",
            category: "pricing",
            narrative:
              "VERA AI signs two of your warmest prospects with a 60%-off intro year. They post the case studies within 30 days.",
            intensity: 2,
          },
          playerStateAfter: { hp: 78, capital: 56, speed: 45, brand: 73, ip: 65 },
          competitorStateAfter: { hp: 68, capital: 88, speed: 95, brand: 30, ip: 30 },
          exchangeNarrative:
            "You held the line on price. They took the easy logos. The narrative tilts slightly toward 'two viable options' instead of one — not great.",
        },
        {
          id: "r1c2",
          label: "Aggressive Reprice",
          category: "pricing",
          intensity: 2,
          description:
            "Slash list price 25% across the mid-market. Buy the next two quarters of new logos.",
          costPreview: "Burns ~$2M margin over 12 months",
          risk: "medium",
          playerMove: {
            name: "Aggressive Reprice",
            category: "pricing",
            narrative:
              "You publish a new price card. Three of your AEs hit quota in three weeks. Your CFO sends a one-line Slack: 'we need to talk.'",
            intensity: 2,
          },
          competitorResponse: {
            name: "Burn-the-Boats Match",
            category: "pricing",
            narrative:
              "VERA AI matches your price and adds a free 90-day pilot. Their investors absorb the burn — yours can't.",
            intensity: 3,
          },
          playerStateAfter: { hp: 80, capital: 48, speed: 45, brand: 72, ip: 65 },
          competitorStateAfter: { hp: 70, capital: 82, speed: 95, brand: 28, ip: 30 },
          exchangeNarrative:
            "You bought market share. They burned twice as much to match you. You're now in a price war you can't win on capital alone.",
        },
        {
          id: "r1c3",
          label: "Trust Pulse",
          category: "brand",
          intensity: 1,
          description:
            "Blast every enterprise contact with case studies, certifications, decade-long audit history.",
          costPreview: "~$0.2M marketing spend",
          risk: "low",
          playerMove: {
            name: "Trust Pulse",
            category: "brand",
            narrative:
              "You publish 5 ROI-numbered case studies in a week. Procurement teams forward them up the chain. Boring works.",
            intensity: 1,
          },
          competitorResponse: {
            name: "Founder Hot-Take",
            category: "brand",
            narrative:
              "Their CEO drops a viral thread: 'why incumbents publish case studies and we publish demos.' 1.2M views in 48 hours.",
            intensity: 2,
          },
          playerStateAfter: { hp: 83, capital: 59, speed: 45, brand: 78, ip: 65 },
          competitorStateAfter: { hp: 68, capital: 93, speed: 95, brand: 35, ip: 30 },
          exchangeNarrative:
            "You moved the procurement layer. They moved the narrative layer. Both real. Theirs compounds faster.",
        },
        {
          id: "r1c4",
          label: "Talent Lock",
          category: "talent",
          intensity: 2,
          description:
            "Pre-empt the inevitable raid: retention grants for your top 10, immediate.",
          costPreview: "~$1.5M in equity refresh",
          risk: "low",
          playerMove: {
            name: "Talent Lock",
            category: "talent",
            narrative:
              "You hand out unsolicited equity refreshes to the top 10 ICs and 3 VPs. Two of them were already taking VERA AI's calls. Now they aren't.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Reverse-Recruit",
            category: "talent",
            narrative:
              "VERA AI shifts from your roster to mid-career hires from FAANG. They post 'no talent moats anymore' on their careers page. Sting intended.",
            intensity: 1,
          },
          playerStateAfter: { hp: 84, capital: 52, speed: 47, brand: 73, ip: 67 },
          competitorStateAfter: { hp: 70, capital: 90, speed: 92, brand: 22, ip: 30 },
          exchangeNarrative:
            "You stopped the bleed before it started. Your VP of Product now owes you 18 months. Capital tighter but the org is intact.",
        },
        {
          id: "r1c5",
          label: "Quiet AI Wedge",
          category: "product",
          intensity: 2,
          description:
            "Ship an LLM copilot inside your existing product within 90 days. Trust-first, not autonomous.",
          costPreview: "~$1M, 90-day push, 4 engineers",
          risk: "medium",
          playerMove: {
            name: "Quiet AI Wedge",
            category: "product",
            narrative:
              "You ship a guarded AI-Assist inside your existing UX. Audit-friendly, opt-in, no autonomous actions. Three customers ask if they can pay extra.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Open-Source Counter",
            category: "ip",
            narrative:
              "VERA AI open-sources their core agents. The community fork is at 1.4k stars in a week. Your wedge looks small by comparison.",
            intensity: 3,
          },
          playerStateAfter: { hp: 82, capital: 50, speed: 44, brand: 75, ip: 70 },
          competitorStateAfter: { hp: 70, capital: 87, speed: 96, brand: 28, ip: 25 },
          exchangeNarrative:
            "You shipped trust. They shipped narrative. Both real wins. The next round will tell which compounds.",
        },
      ],
    },

    /* ─────────────── ROUND 2 — Months 7-12 ─────────────── */
    {
      roundNumber: 2,
      quarterLabel: "Months 7-12",
      setupNarrative:
        "VERA AI just closed their Series B at $480M valuation. The trade press calls them 'category-defining.' Two of your reseller partners are quietly testing them.",
      competitorTell: "Channel-collapse incoming.",
      choices: [
        {
          id: "r2c1",
          label: "Reseller Lock-In",
          category: "channel",
          intensity: 2,
          description:
            "3-year exclusive contracts with your top 5 resellers. Margin shared more generously.",
          costPreview: "~3% margin haircut for 36mo",
          risk: "medium",
          playerMove: {
            name: "Reseller Lock-In",
            category: "channel",
            narrative:
              "You restructure reseller economics: bigger cut, longer contract, MDF money. Four of five sign. The fifth is already gone.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Direct-to-CFO Outreach",
            category: "channel",
            narrative:
              "VERA AI skips the reseller layer and runs CFO ABM on your install base. Their inbound spikes; your renewal calls get weird.",
            intensity: 2,
          },
          playerStateAfter: { hp: 78, capital: 44, speed: 44, brand: 73, ip: 67 },
          competitorStateAfter: { hp: 70, capital: 84, speed: 94, brand: 36, ip: 28 },
          exchangeNarrative:
            "You secured the pipe but lost two CFO conversations. The board hears about it on Monday.",
        },
        {
          id: "r2c2",
          label: "Acquire Smaller AI Player",
          category: "capital",
          intensity: 3,
          description:
            "Buy an early-stage AI-native specialist for $15-25M. Bolt their team into your roadmap.",
          costPreview: "~$20M cash + 18mo integration risk",
          risk: "high",
          playerMove: {
            name: "Acquihire Counter",
            category: "capital",
            narrative:
              "You wire $22M for an 18-person AI-native startup with two strong agents. Press release lands at 8am. By noon, your AEs have a new story.",
            intensity: 3,
          },
          competitorResponse: {
            name: "FUD-the-Integration",
            category: "brand",
            narrative:
              "VERA AI seeds 'integration risk' content. Three industry analysts publish caution notes. Two of your renewals pause for a quarter.",
            intensity: 2,
          },
          playerStateAfter: { hp: 75, capital: 22, speed: 38, brand: 72, ip: 78 },
          competitorStateAfter: { hp: 68, capital: 82, speed: 94, brand: 36, ip: 25 },
          exchangeNarrative:
            "You bought IP and a story. You also bought 18 months of integration drag and a near-empty capital bar. Risky but real.",
        },
        {
          id: "r2c3",
          label: "Lighthouse Lockup",
          category: "channel",
          intensity: 2,
          description:
            "3-year renewals with your top 10 enterprise accounts at 15% discount. Predictable revenue.",
          costPreview: "~$5M of margin given back",
          risk: "low",
          playerMove: {
            name: "Lighthouse Lockup",
            category: "channel",
            narrative:
              "You sign multi-year locks with your 10 reference customers. Two are former prospects of VERA AI. Their press release pipeline stalls.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Mid-Market Push",
            category: "pricing",
            narrative:
              "Locked out of enterprise, VERA AI floods the mid-market with sub-cost pricing. They sign 80 logos in 60 days.",
            intensity: 3,
          },
          playerStateAfter: { hp: 76, capital: 40, speed: 44, brand: 76, ip: 67 },
          competitorStateAfter: { hp: 71, capital: 72, speed: 95, brand: 42, ip: 28 },
          exchangeNarrative:
            "You secured the top of the market. They own the bottom now. The middle is a knife fight.",
        },
        {
          id: "r2c4",
          label: "Compliance Moat",
          category: "regulatory",
          intensity: 2,
          description:
            "Triple-down on SOC 2 Type II, EU AI Act readiness, sector-specific certifications.",
          costPreview: "~$1M and 4 quarters of comms",
          risk: "low",
          playerMove: {
            name: "Compliance Moat",
            category: "regulatory",
            narrative:
              "You publish a 6-page compliance whitepaper and ship audit-trail telemetry. Three F500 procurement teams say 'finally.' Two RFPs are now binary in your favor.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Regulatory Bypass",
            category: "regulatory",
            narrative:
              "VERA AI markets directly to lines-of-business who don't read whitepapers. Sales velocity stays high. The CIO finds out at the renewal.",
            intensity: 1,
          },
          playerStateAfter: { hp: 82, capital: 46, speed: 43, brand: 76, ip: 72 },
          competitorStateAfter: { hp: 70, capital: 92, speed: 95, brand: 30, ip: 28 },
          exchangeNarrative:
            "You built a real moat. It only matters at the enterprise gate — but that's where the big money is. Compounding play.",
        },
      ],
    },

    /* ─────────────── ROUND 3 — Months 13-18 ─────────────── */
    {
      roundNumber: 3,
      quarterLabel: "Months 13-18",
      setupNarrative:
        "Mid-game. Capital is tight. VERA AI just shipped an autonomous agent that does in 4 minutes what your tool needs a 90-minute analyst session for. Your AEs are getting questions.",
      competitorTell: "Product gap is being weaponized.",
      choices: [
        {
          id: "r3c1",
          label: "Ship Competing Agent (Fast)",
          category: "product",
          intensity: 3,
          description:
            "All-hands on an autonomous-agent v1. Cut other roadmap items, push in 90 days.",
          costPreview: "Stops 80% of other product work for 1 quarter",
          risk: "high",
          playerMove: {
            name: "Ship Competing Agent",
            category: "product",
            narrative:
              "You re-org around shipping an autonomous agent in 90 days. The result is good-enough — not as flashy as theirs, but trusted. Two big customers reaffirm.",
            intensity: 3,
          },
          competitorResponse: {
            name: "Demo-War Escalation",
            category: "product",
            narrative:
              "VERA AI publishes a side-by-side benchmark. Theirs wins on speed; yours wins on auditability. Twitter calls it a tie. Press calls it a win for them.",
            intensity: 2,
          },
          playerStateAfter: { hp: 70, capital: 30, speed: 36, brand: 75, ip: 75 },
          competitorStateAfter: { hp: 68, capital: 78, speed: 94, brand: 40, ip: 28 },
          exchangeNarrative:
            "You closed the product gap. You opened a roadmap gap. The next round will test whether trust beats velocity.",
        },
        {
          id: "r3c2",
          label: "Vertical Retreat",
          category: "product",
          intensity: 2,
          description:
            "Pull out of the horizontal market. Own one vertical absolutely. Smaller TAM, defensible.",
          costPreview: "Lose ~30% of pipeline, gain category leadership in one vertical",
          risk: "medium",
          playerMove: {
            name: "Vertical Retreat",
            category: "product",
            narrative:
              "You announce focus on FinSrv/Compliance only. Two horizontal logos churn. Three FinSrv leads close in two weeks.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Crown the Generalist",
            category: "brand",
            narrative:
              "VERA AI absorbs the rest of your TAM and re-pitches as 'the everything platform.' Gartner notices.",
            intensity: 2,
          },
          playerStateAfter: { hp: 72, capital: 36, speed: 44, brand: 70, ip: 72 },
          competitorStateAfter: { hp: 72, capital: 82, speed: 96, brand: 48, ip: 28 },
          exchangeNarrative:
            "Smaller pond, you're the biggest fish. You ceded the wider market. Sometimes that's the right trade.",
        },
        {
          id: "r3c3",
          label: "Defensive AI-Assist Polish",
          category: "product",
          intensity: 1,
          description:
            "Refine the existing copilot — better UX, no scope expansion. Cheap, stable.",
          costPreview: "~$0.5M, 2 engineers, 60 days",
          risk: "low",
          playerMove: {
            name: "Polish Pass",
            category: "product",
            narrative:
              "You ship 14 quality-of-life improvements and a redesigned dashboard. Existing customers love it. Prospects don't notice.",
            intensity: 1,
          },
          competitorResponse: {
            name: "Category Definition Play",
            category: "brand",
            narrative:
              "VERA AI publishes the 'AI-Native Operating System' framework. Three analysts adopt the term. The category map redraws around them.",
            intensity: 3,
          },
          playerStateAfter: { hp: 68, capital: 44, speed: 44, brand: 73, ip: 67 },
          competitorStateAfter: { hp: 70, capital: 90, speed: 95, brand: 50, ip: 28 },
          exchangeNarrative:
            "You bought time. They bought the category. Time runs out faster than category leadership.",
        },
      ],
    },

    /* ─────────────── ROUND 4 — Months 19-24 ─────────────── */
    {
      roundNumber: 4,
      quarterLabel: "Months 19-24",
      setupNarrative:
        "Capital is thin. The board is asking questions. VERA AI just signed your former largest reference customer. The press release lands at 9am.",
      competitorTell: "They smell blood. They'll go for narrative kill.",
      choices: [
        {
          id: "r4c1",
          label: "Founder Letter",
          category: "brand",
          intensity: 2,
          description:
            "CEO publishes a clear letter: roadmap, customer outcomes, why we're not for sale.",
          costPreview: "Free, takes 1 day",
          risk: "low",
          playerMove: {
            name: "Founder Letter",
            category: "brand",
            narrative:
              "Your CEO publishes a 600-word letter at 7am. It quotes three named customers. Twitter is divided; LinkedIn loves it; your sales team forwards it 300x.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Counter-Narrative Op",
            category: "brand",
            narrative:
              "VERA AI seeds 'why letters are the new layoffs' takes. Two journalists bite. The story is now 'incumbent defends, challenger ignores.'",
            intensity: 2,
          },
          playerStateAfter: { hp: 64, capital: 42, speed: 42, brand: 72, ip: 67 },
          competitorStateAfter: { hp: 72, capital: 90, speed: 95, brand: 48, ip: 28 },
          exchangeNarrative:
            "You held the room you had. You didn't grow it. In a narrative war, holding is losing slower.",
        },
        {
          id: "r4c2",
          label: "Bridge Round",
          category: "capital",
          intensity: 2,
          description:
            "Raise a defensive bridge at flat valuation. $15M. Cuts the burn-out fear.",
          costPreview: "Flat round, modest dilution, signal of weakness or strength",
          risk: "medium",
          playerMove: {
            name: "Bridge & Hold",
            category: "capital",
            narrative:
              "You close $15M at flat from your existing investors in 14 days. Press release frames it as 'extended runway to ship AI roadmap.' Most read it that way.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Series C Bombshell",
            category: "capital",
            narrative:
              "VERA AI closes $180M Series C at $1.4B. Their war chest is now 12x yours. The asymmetry is now industry knowledge.",
            intensity: 3,
          },
          playerStateAfter: { hp: 68, capital: 62, speed: 42, brand: 68, ip: 67 },
          competitorStateAfter: { hp: 72, capital: 98, speed: 96, brand: 55, ip: 28 },
          exchangeNarrative:
            "You bought 12 months of survival. They bought 5 years of attack power. Capital asymmetry is now the dominant fact.",
        },
        {
          id: "r4c3",
          label: "Cost Cut + Focus",
          category: "capital",
          intensity: 2,
          description:
            "15% headcount reduction, eliminate two product lines, return cash to runway.",
          costPreview: "Painful, public, signals discipline",
          risk: "high",
          playerMove: {
            name: "Cut & Refocus",
            category: "capital",
            narrative:
              "You cut 15% of headcount and kill two side products in a single Friday. Brutal but the burn drops 40%. Your remaining team is sharper.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Talent Vulture Wave",
            category: "talent",
            narrative:
              "VERA AI puts up a 'we're hiring' page that lists 8 of your now-ex employees by role. Your retained team notices.",
            intensity: 2,
          },
          playerStateAfter: { hp: 66, capital: 56, speed: 32, brand: 64, ip: 65 },
          competitorStateAfter: { hp: 72, capital: 88, speed: 97, brand: 48, ip: 30 },
          exchangeNarrative:
            "You bought 18 months of survival in cash. You lost 25% of speed and a noticeable chunk of morale. Survival yes, growth no.",
        },
      ],
    },

    /* ─────────────── ROUND 5 — Months 25-30 ─────────────── */
    {
      roundNumber: 5,
      quarterLabel: "Months 25-30",
      setupNarrative:
        "Endgame. Six months left in the simulation. The market has crystallized into 'them or you' in the eyes of buyers. Your move.",
      competitorTell: "They're going for category coronation.",
      choices: [
        {
          id: "r5c1",
          label: "Niche Domination",
          category: "product",
          intensity: 2,
          description:
            "Retreat to your single strongest vertical. Own it absolutely. Sell to the rest never.",
          costPreview: "Locks long-term TAM at ~30% of original ambition",
          risk: "low",
          playerMove: {
            name: "Niche Coronation",
            category: "product",
            narrative:
              "You declare yourself the FinSrv-only WFC vendor. Top 3 banks renew with longer terms. Press is mixed — 'pivot or retreat?' — but cash flow is positive again.",
            intensity: 2,
          },
          competitorResponse: {
            name: "Win the Rest",
            category: "brand",
            narrative:
              "VERA AI publishes a 'we serve everyone except FinSrv' positioning. Gartner gives them the magic quadrant top-right. You get the niche callout box.",
            intensity: 2,
          },
          playerStateAfter: { hp: 62, capital: 50, speed: 38, brand: 64, ip: 70 },
          competitorStateAfter: { hp: 75, capital: 88, speed: 96, brand: 60, ip: 30 },
          exchangeNarrative:
            "You won a vertical. They won the category. Both can be true. Whether that's defeat or victory depends on who's measuring.",
        },
        {
          id: "r5c2",
          label: "Strategic Sale Exploration",
          category: "capital",
          intensity: 3,
          description:
            "Open quiet talks with three strategic acquirers. Run a process. See what the market says you're worth.",
          costPreview: "Banker fees + risk of leak (which is itself a risk)",
          risk: "high",
          playerMove: {
            name: "Banker Engagement",
            category: "capital",
            narrative:
              "Goldman picks up the mandate. Three private-equity firms and one strategic show preliminary interest. The numbers are 0.4x the valuation you had 18 months ago.",
            intensity: 3,
          },
          competitorResponse: {
            name: "Press the Asymmetry",
            category: "brand",
            narrative:
              "VERA AI leaks they're 'exploring an acquisition of [you] for talent and customer book.' Your team's Glassdoor takes a hit.",
            intensity: 2,
          },
          playerStateAfter: { hp: 48, capital: 44, speed: 30, brand: 50, ip: 65 },
          competitorStateAfter: { hp: 75, capital: 86, speed: 95, brand: 58, ip: 30 },
          exchangeNarrative:
            "You opened optionality. You also gave the competitor a narrative weapon. Sale at this valuation feels like defeat to your team.",
        },
        {
          id: "r5c3",
          label: "All-In Vertical Agent",
          category: "product",
          intensity: 3,
          description:
            "Last $30M of capital into shipping a fully-autonomous vertical agent in 6 months. Hail Mary.",
          costPreview: "Burns most of remaining cash. If it works, you reset the game.",
          risk: "high",
          playerMove: {
            name: "Hail Mary Build",
            category: "product",
            narrative:
              "You commit all engineering resources to shipping a vertical-specialist autonomous agent. The team is energized. The board is terrified. Six months from now you'll know.",
            intensity: 3,
          },
          competitorResponse: {
            name: "Cash-Cushion Cruise",
            category: "capital",
            narrative:
              "VERA AI doesn't need to react. They keep shipping, keep marketing, keep hiring. Their valuation doesn't depend on stopping you anymore.",
            intensity: 1,
          },
          playerStateAfter: { hp: 56, capital: 18, speed: 42, brand: 68, ip: 80 },
          competitorStateAfter: { hp: 73, capital: 90, speed: 96, brand: 55, ip: 30 },
          exchangeNarrative:
            "You bet the company on a single vertical agent. If it ships, you're the only credible alternative in your niche. If it doesn't, this was the last quarter you had agency.",
        },
      ],
    },
  ],
  endgameTemplates: {
    victory: {
      outcome: "victory",
      headline: "You bent the competitor.",
      summary:
        "You read the asymmetry early, traded growth for defensibility at the right moments, and shipped enough AI-credibility to keep enterprise procurement on your side. The competitor is still bigger, still louder — but in your room, you're the safe answer.",
      reasons: [
        "Early talent lock prevented the Y1 product velocity collapse most incumbents suffer.",
        "AI-Assist wedge gave you a credible AI story without betting the company on autonomous agents.",
        "Compliance moat made enterprise procurement binary in your favor — the highest-margin pool stayed yours.",
      ],
      todayActions: [
        {
          action: "Lock retention with grants for your top 10 ICs and 3 VPs within 30 days.",
          rationale:
            "In the simulation, the talent raid in months 7-12 is the single highest-leverage moment. Pre-empt it now while it costs $1.5M, not $15M.",
          leverage: "high",
        },
        {
          action: "Ship an AI-Assist wedge in 90 days, not a full agent in 12 months.",
          rationale:
            "Trust-first AI inside your existing UX beats autonomous agents on speed-to-credibility. You don't need to win the demo war; you need to win procurement.",
          leverage: "high",
        },
        {
          action: "Sign 3-year locks with your top 10 customers this quarter, even at 15% discount.",
          rationale:
            "Predictable revenue = optionality. In the simulation, lighthouse lockups in months 7-12 were the foundation everything else stood on.",
          leverage: "medium",
        },
      ],
    },
    stalemate: {
      outcome: "stalemate",
      headline: "Both bled. The market split.",
      summary:
        "Neither side won outright. You defended the enterprise. They took the mid-market. The category is now bifurcated and the analysts can't decide who's category-defining. Survival is real but growth is gone.",
      reasons: [
        "Reactive moves in the early rounds let the competitor define the narrative — you spent the rest of the game responding.",
        "Capital asymmetry by Y2 forced you into defensive plays you couldn't fully fund.",
        "Channel defense worked, product wedge worked, but neither was big enough to reset the game.",
      ],
      todayActions: [
        {
          action: "Pick ONE move from rounds 1-2 above and run it this quarter, not all of them.",
          rationale:
            "The stalemate happened because you tried to defend on every axis at once. Pick the highest-leverage single play and commit.",
          leverage: "high",
        },
        {
          action: "Run a 'who's our worst-feared competitor' workshop with your board within 30 days.",
          rationale:
            "Naming the threat specifically (not 'AI in general') unlocks specific moves. Vagueness is the killer.",
          leverage: "high",
        },
        {
          action: "Define your defensible vertical NOW, before the market does it for you.",
          rationale:
            "In stalemate scenarios, the vendor who self-declares their niche keeps margin. The one who doesn't gets defined as 'the legacy option.'",
          leverage: "medium",
        },
      ],
    },
    defeat: {
      outcome: "defeat",
      headline: "Dismantled. Here's how.",
      summary:
        "By month 30 your enterprise reference accounts were churning, your talent had moved on, and your runway forced a strategic sale at a fraction of your prior valuation. The competitor became the category. You became a footnote.",
      reasons: [
        "Lost the AI-native narrative by month 12 — never recovered the brand premium.",
        "Talent drain in Y1 cost 8-12 months of product velocity at the worst possible moment.",
        "Channel collapse in months 13-18 should have triggered an aggressive partnership pivot, not a direct-sales push.",
      ],
      todayActions: [
        {
          action: "Audit your top 20 customer relationships THIS WEEK. Identify who's likely to churn first.",
          rationale:
            "In the simulation, defeat starts when a single reference customer flips. Knowing which one — and intervening pre-emptively — buys 6-12 months of optionality.",
          leverage: "high",
        },
        {
          action: "Ship the smallest credible AI feature inside your product within 6 weeks.",
          rationale:
            "Even a small ship signals you're alive. In the simulation, the gap between 'no AI story' and 'small AI story' was the entire difference between stalemate and defeat.",
          leverage: "high",
        },
        {
          action: "Have the 'do we sell now' conversation with your board within 60 days.",
          rationale:
            "The simulation shows that strategic sale optionality drops 30% every six months once the narrative tips. Either commit to fight or commit to sell — but don't drift.",
          leverage: "medium",
        },
      ],
    },
  },
});
