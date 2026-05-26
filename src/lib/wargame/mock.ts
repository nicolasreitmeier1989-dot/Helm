import type { Simulation, SimulationRequest } from "./types";

/**
 * Fallback simulation (used when no ANTHROPIC_API_KEY is set or LLM fails).
 *
 * v4 — Portfolio mechanics:
 * - Competitor opens with one move per round (Pokémon-style first strike)
 * - Player picks a portfolio of counters (max 1 per category, constrained by capital budget)
 * - Competitor follows up after player commits
 * - Stats are summed deterministically client-side
 */
export const mockSimulation = (req: SimulationRequest): Simulation => ({
  player: {
    name: req.company || "Your Company",
    archetype: req.sector ? `Incumbent ${req.sector} operator` : "Incumbent operator",
    sigil: "◆",
    color: "#ffffff",
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
        "VERA AI emerges from stealth with a viral demo. Three of your enterprise prospects mention them in this week's discovery calls.",
      competitorTell: "They're about to test the market with sub-zero pricing.",
      competitorOpening: {
        name: "Stealth Land-Grab",
        category: "pricing",
        narrative:
          "VERA AI signs two of your warmest prospects with a 60%-off intro year. The case studies hit TechCrunch by Friday.",
        intensity: 2,
      },
      openingDamageToPlayer: { hp: -5, brand: -2 },
      openingCostToCompetitor: { capital: -7 },
      capitalBudget: 30,
      choicePool: [
        {
          id: "r1-pricing-bundle",
          label: "Bundle Defense",
          category: "pricing",
          intensity: 1,
          description:
            "Add managed-service hours into existing contracts at no extra cost. Same price, more value.",
          costPreview: "~$0.5M services bandwidth",
          risk: "low",
          capitalCost: 4,
          playerMove: {
            name: "Bundle Defense",
            category: "pricing",
            narrative:
              "You quietly upgrade every active contract with 20 hours of managed-service per quarter. Two wobbly deals saved.",
            intensity: 1,
          },
          selfEffect: { capital: -4 },
          competitorEffect: { brand: -1 },
        },
        {
          id: "r1-pricing-reprice",
          label: "Aggressive Reprice",
          category: "pricing",
          intensity: 2,
          description:
            "Slash list price 25% across the mid-market. Buy the next two quarters of new logos.",
          costPreview: "~$2M margin over 12mo",
          risk: "medium",
          capitalCost: 10,
          playerMove: {
            name: "Aggressive Reprice",
            category: "pricing",
            narrative:
              "You publish a new price card. Three AEs hit quota in three weeks. Your CFO sends a one-line Slack: 'we need to talk.'",
            intensity: 2,
          },
          selfEffect: { capital: -10, hp: 4 },
          competitorEffect: { hp: -4, capital: -3 },
        },
        {
          id: "r1-brand-trust",
          label: "Trust Pulse",
          category: "brand",
          intensity: 1,
          description:
            "Blast every enterprise contact with case studies, certifications, decade-long audit history.",
          costPreview: "~$0.2M marketing",
          risk: "low",
          capitalCost: 3,
          playerMove: {
            name: "Trust Pulse",
            category: "brand",
            narrative:
              "You publish 5 ROI-numbered case studies in a week. Procurement teams forward them up the chain. Boring works.",
            intensity: 1,
          },
          selfEffect: { capital: -3, brand: 4 },
          competitorEffect: {},
        },
        {
          id: "r1-talent-lock",
          label: "Talent Lock",
          category: "talent",
          intensity: 2,
          description:
            "Pre-empt the inevitable raid: retention grants for your top 10 ICs and 3 VPs.",
          costPreview: "~$1.5M equity refresh",
          risk: "low",
          capitalCost: 8,
          playerMove: {
            name: "Talent Lock",
            category: "talent",
            narrative:
              "You hand out unsolicited equity refreshes. Two ICs were already taking VERA AI's calls — now they aren't.",
            intensity: 2,
          },
          selfEffect: { capital: -8, speed: 3, ip: 2 },
          competitorEffect: { speed: -2 },
        },
        {
          id: "r1-product-wedge",
          label: "Quiet AI Wedge",
          category: "product",
          intensity: 2,
          description:
            "Ship an LLM copilot inside your existing product within 90 days. Trust-first, not autonomous.",
          costPreview: "~$1M, 4 engineers, 90d",
          risk: "medium",
          capitalCost: 9,
          playerMove: {
            name: "Quiet AI Wedge",
            category: "product",
            narrative:
              "You ship a guarded AI-Assist inside your existing UX. Audit-friendly, opt-in, no autonomous actions. Customers ask if they can pay extra.",
            intensity: 2,
          },
          selfEffect: { capital: -9, ip: 5, brand: 2 },
          competitorEffect: { brand: -2 },
        },
        {
          id: "r1-channel-resellers",
          label: "Reseller Briefing",
          category: "channel",
          intensity: 1,
          description:
            "Run a one-day partner enablement summit with your top resellers. Cement loyalty.",
          costPreview: "~$0.3M event + travel",
          risk: "low",
          capitalCost: 4,
          playerMove: {
            name: "Reseller Briefing",
            category: "channel",
            narrative:
              "200 reseller reps fly in. Free lunch, deep product training, new MDF tier announced. Goodwill banked.",
            intensity: 1,
          },
          selfEffect: { capital: -4, hp: 2 },
          competitorEffect: { brand: -1 },
        },
      ],
      competitorFollowUp: {
        name: "Founder Hot-Take",
        category: "brand",
        narrative:
          "Their CEO drops a viral thread: 'why incumbents publish case studies and we publish demos.' 1.2M views in 48 hours.",
        intensity: 2,
      },
      followUpDamageToPlayer: { brand: -3 },
      followUpCostToCompetitor: { capital: -2 },
      resolutionLine:
        "VERA AI ends Round 1 with momentum on narrative but the procurement gate is still yours to lose.",
    },

    /* ─────────────── ROUND 2 — Months 7-12 ─────────────── */
    {
      roundNumber: 2,
      quarterLabel: "Months 7-12",
      setupNarrative:
        "VERA AI just closed Series B at $480M. The trade press calls them 'category-defining.' Two of your reseller partners are quietly testing them.",
      competitorTell: "Channel collapse is coming. They want your install base.",
      competitorOpening: {
        name: "Channel-Collapse Sniper",
        category: "channel",
        narrative:
          "VERA AI signs an exclusive with your largest reseller. 14% of your pipeline evaporates over the quarter.",
        intensity: 3,
      },
      openingDamageToPlayer: { hp: -10, brand: -2 },
      openingCostToCompetitor: { capital: -9 },
      capitalBudget: 26,
      choicePool: [
        {
          id: "r2-channel-lockup",
          label: "Lighthouse Lockup",
          category: "channel",
          intensity: 2,
          description:
            "3-year renewals with your top 10 enterprise accounts at 15% discount. Predictable revenue.",
          costPreview: "~$5M margin given back",
          risk: "low",
          capitalCost: 9,
          playerMove: {
            name: "Lighthouse Lockup",
            category: "channel",
            narrative:
              "You sign multi-year locks with your 10 reference customers. Two were former VERA AI prospects. Their pipeline stalls.",
            intensity: 2,
          },
          selfEffect: { capital: -9, hp: 5, brand: 2 },
          competitorEffect: { hp: -3, brand: -2 },
        },
        {
          id: "r2-capital-acquire",
          label: "Acquire Smaller AI Player",
          category: "capital",
          intensity: 3,
          description:
            "Buy an early-stage AI-native specialist for $15-25M. Bolt their team into your roadmap.",
          costPreview: "~$20M cash + 18mo integration",
          risk: "high",
          capitalCost: 18,
          playerMove: {
            name: "Acquihire Counter",
            category: "capital",
            narrative:
              "You wire $22M for an 18-person AI-native startup. Press release lands at 8am. By noon your AEs have a new story.",
            intensity: 3,
          },
          selfEffect: { capital: -18, ip: 8, speed: -2 },
          competitorEffect: { brand: -4 },
        },
        {
          id: "r2-regulatory-moat",
          label: "Compliance Moat",
          category: "regulatory",
          intensity: 2,
          description:
            "Triple down on SOC 2 Type II, EU AI Act readiness, sector-specific certifications.",
          costPreview: "~$1M + 4 quarters comms",
          risk: "low",
          capitalCost: 6,
          playerMove: {
            name: "Compliance Moat",
            category: "regulatory",
            narrative:
              "Audit-trail telemetry shipped, 6-page whitepaper published. Three F500 procurement teams flag this as 'finally.'",
            intensity: 2,
          },
          selfEffect: { capital: -6, ip: 5, brand: 2 },
          competitorEffect: { brand: -3 },
        },
        {
          id: "r2-product-polish",
          label: "Roadmap Sprint",
          category: "product",
          intensity: 2,
          description:
            "Ship 14 prospect-asked features in 60 days. Close the demo gap.",
          costPreview: "~$1.2M, 6 engineers",
          risk: "medium",
          capitalCost: 8,
          playerMove: {
            name: "Roadmap Sprint",
            category: "product",
            narrative:
              "Engineering goes heads-down. New release notes drop weekly. Two stalled deals reactivate.",
            intensity: 2,
          },
          selfEffect: { capital: -8, hp: 3, brand: 2 },
          competitorEffect: { hp: -2 },
        },
        {
          id: "r2-talent-vp",
          label: "Hire Star VP of AI",
          category: "talent",
          intensity: 2,
          description:
            "Recruit a credible AI VP from FAANG. Sends a signal to your team and to the market.",
          costPreview: "~$2M package + equity",
          risk: "medium",
          capitalCost: 7,
          playerMove: {
            name: "Star Hire",
            category: "talent",
            narrative:
              "Announcement hits the wires. Two of your engineers stop interviewing externally. Your AI story has a face now.",
            intensity: 2,
          },
          selfEffect: { capital: -7, speed: 4, brand: 3 },
          competitorEffect: { speed: -2 },
        },
        {
          id: "r2-brand-pr",
          label: "Customer-Win Storytelling",
          category: "brand",
          intensity: 1,
          description:
            "Publish 5 named customer outcomes per month — hard ROI numbers. Boring but compounds.",
          costPreview: "~$0.2M content + paid amplification",
          risk: "low",
          capitalCost: 3,
          playerMove: {
            name: "Customer Stories",
            category: "brand",
            narrative:
              "Five named, numbered case studies per month. LinkedIn loves it. Sales team forwards each one 300x.",
            intensity: 1,
          },
          selfEffect: { capital: -3, brand: 3 },
          competitorEffect: {},
        },
      ],
      competitorFollowUp: {
        name: "Direct-to-CFO Outreach",
        category: "channel",
        narrative:
          "Locked out at the reseller layer, VERA AI runs CFO ABM on your install base. Their inbound spikes; your renewal calls get weird.",
        intensity: 2,
      },
      followUpDamageToPlayer: { hp: -5 },
      followUpCostToCompetitor: { capital: -4 },
      resolutionLine:
        "Mid-game. Both sides bleeding capital. The next round will tell who can pay for finishers.",
    },

    /* ─────────────── ROUND 3 — Months 13-18 ─────────────── */
    {
      roundNumber: 3,
      quarterLabel: "Months 13-18",
      setupNarrative:
        "Capital is tight. VERA AI just shipped an autonomous agent that does in 4 minutes what your tool needs a 90-minute analyst session for.",
      competitorTell: "Product gap is being weaponized. Buyers will start asking.",
      competitorOpening: {
        name: "Vertical AI Agent",
        category: "product",
        narrative:
          "VERA AI ships an autonomous workflow agent and runs a side-by-side benchmark video. Twitter calls it a tie. Press calls it a win for them.",
        intensity: 3,
      },
      openingDamageToPlayer: { hp: -12, brand: -4 },
      openingCostToCompetitor: { capital: -10 },
      capitalBudget: 20,
      choicePool: [
        {
          id: "r3-product-agent",
          label: "Ship Competing Agent (Fast)",
          category: "product",
          intensity: 3,
          description:
            "All-hands on an autonomous-agent v1. Cut other roadmap items. Ship in 90 days.",
          costPreview: "Stops 80% of other dev work",
          risk: "high",
          capitalCost: 14,
          playerMove: {
            name: "Ship Competing Agent",
            category: "product",
            narrative:
              "You re-org around shipping an autonomous agent. Result is good-enough — not as flashy as theirs, but trusted. Two big customers reaffirm.",
            intensity: 3,
          },
          selfEffect: { capital: -14, ip: 6, hp: 4 },
          competitorEffect: { hp: -5, brand: -3 },
        },
        {
          id: "r3-product-vertical",
          label: "Vertical Retreat",
          category: "product",
          intensity: 2,
          description:
            "Pull out of the horizontal market. Own one vertical absolutely. Smaller TAM, defensible.",
          costPreview: "Lose ~30% pipeline, gain category leadership",
          risk: "medium",
          capitalCost: 5,
          playerMove: {
            name: "Vertical Retreat",
            category: "product",
            narrative:
              "You announce focus on FinSrv/Compliance only. Two horizontal logos churn. Three FinSrv leads close in two weeks.",
            intensity: 2,
          },
          selfEffect: { capital: -5, hp: -3, brand: 4, ip: 3 },
          competitorEffect: {},
        },
        {
          id: "r3-talent-poach",
          label: "Poach Their Engineer",
          category: "talent",
          intensity: 3,
          description:
            "Make a public offer to one of VERA AI's senior ICs. Even if they decline, you slow their roadmap.",
          costPreview: "~$3M offer + drama",
          risk: "high",
          capitalCost: 10,
          playerMove: {
            name: "Reverse Talent Strike",
            category: "talent",
            narrative:
              "You publish a job listing that names their tech stack and offers 1.5x. Two of their seniors take the call. None accept, but their CEO loses a week.",
            intensity: 3,
          },
          selfEffect: { capital: -10, brand: 2 },
          competitorEffect: { speed: -5, capital: -2 },
        },
        {
          id: "r3-pricing-undercut",
          label: "Race-to-Bottom Pricing",
          category: "pricing",
          intensity: 3,
          description:
            "Cut list price by 40% across the board. Win the next two quarters on price.",
          costPreview: "~$5M margin burn over 6mo",
          risk: "high",
          capitalCost: 12,
          playerMove: {
            name: "Price Floor",
            category: "pricing",
            narrative:
              "You drop 40% across the board. Three of their wins get re-evaluated by procurement. Your CFO is quietly furious.",
            intensity: 3,
          },
          selfEffect: { capital: -12, hp: 6 },
          competitorEffect: { hp: -6, capital: -3 },
        },
        {
          id: "r3-channel-direct",
          label: "Direct-Sales Boost",
          category: "channel",
          intensity: 2,
          description:
            "Spin up an outbound SDR team. Bypass the reseller layer where VERA AI just won.",
          costPreview: "~$1.5M, 10 reps, 90d ramp",
          risk: "medium",
          capitalCost: 7,
          playerMove: {
            name: "Direct-Sales Push",
            category: "channel",
            narrative:
              "Ten new SDRs onboard in 30 days. Pipeline doesn't move for 60 days, then a wave of late-stage deals appears.",
            intensity: 2,
          },
          selfEffect: { capital: -7, speed: -2, hp: 5 },
          competitorEffect: { brand: -2 },
        },
      ],
      competitorFollowUp: {
        name: "Open-Source Bombshell",
        category: "ip",
        narrative:
          "VERA AI open-sources their core agents. 1.4k stars in a week. Your IP moat is now a commodity.",
        intensity: 3,
      },
      followUpDamageToPlayer: { ip: -8, brand: -3 },
      followUpCostToCompetitor: { ip: -3 },
      resolutionLine:
        "The market reframes itself: this is no longer 'incumbent vs startup,' it's 'whoever ships AI fastest, wins.'",
    },

    /* ─────────────── ROUND 4 — Months 19-24 ─────────────── */
    {
      roundNumber: 4,
      quarterLabel: "Months 19-24",
      setupNarrative:
        "Capital is thin. The board is asking questions. VERA AI just signed your former largest reference customer. The press release lands at 9am.",
      competitorTell: "They smell blood. Narrative kill incoming.",
      competitorOpening: {
        name: "Reference Account Defection",
        category: "channel",
        narrative:
          "Your three-year reference customer publicly migrates to VERA AI. The case study quotes their CIO: 'we should have done this two years ago.'",
        intensity: 3,
      },
      openingDamageToPlayer: { hp: -10, brand: -6 },
      openingCostToCompetitor: { capital: -6 },
      capitalBudget: 16,
      choicePool: [
        {
          id: "r4-brand-letter",
          label: "Founder Letter",
          category: "brand",
          intensity: 2,
          description:
            "CEO publishes a clear letter: roadmap, customer outcomes, why we're not for sale.",
          costPreview: "Free, takes one day",
          risk: "low",
          capitalCost: 1,
          playerMove: {
            name: "Founder Letter",
            category: "brand",
            narrative:
              "Your CEO publishes a 600-word letter at 7am quoting three named customers. LinkedIn loves it; sales forwards it 300x.",
            intensity: 2,
          },
          selfEffect: { capital: -1, brand: 4, hp: 2 },
          competitorEffect: {},
        },
        {
          id: "r4-capital-bridge",
          label: "Bridge Round",
          category: "capital",
          intensity: 2,
          description:
            "Raise a defensive bridge at flat valuation. $15M from existing investors.",
          costPreview: "Flat round, dilution, runway extension",
          risk: "medium",
          capitalCost: 0,
          playerMove: {
            name: "Bridge & Hold",
            category: "capital",
            narrative:
              "$15M closes in 14 days. Press frames it as 'extended runway to ship AI roadmap.' Most read it that way.",
            intensity: 2,
          },
          selfEffect: { capital: 18, brand: -2 },
          competitorEffect: {},
        },
        {
          id: "r4-capital-cut",
          label: "Cost Cut + Focus",
          category: "capital",
          intensity: 2,
          description:
            "15% headcount reduction. Eliminate two product lines. Return cash to runway.",
          costPreview: "Painful, public, signals discipline",
          risk: "high",
          capitalCost: 0,
          playerMove: {
            name: "Cut & Refocus",
            category: "capital",
            narrative:
              "Brutal Friday. Burn drops 40%. Your remaining team is sharper. Glassdoor takes a hit.",
            intensity: 2,
          },
          selfEffect: { capital: 12, speed: -4, brand: -2 },
          competitorEffect: {},
        },
        {
          id: "r4-product-ai-assist",
          label: "AI-Assist Polish",
          category: "product",
          intensity: 1,
          description:
            "Ship 14 QoL improvements to existing AI-Assist. Cheap and stable.",
          costPreview: "~$0.5M, 2 engineers, 60d",
          risk: "low",
          capitalCost: 3,
          playerMove: {
            name: "Polish Pass",
            category: "product",
            narrative:
              "Existing customers love the redesigned dashboard. Prospects don't notice. Renewals tick up.",
            intensity: 1,
          },
          selfEffect: { capital: -3, hp: 3 },
          competitorEffect: {},
        },
        {
          id: "r4-channel-lock",
          label: "Top-Customer Lockdown",
          category: "channel",
          intensity: 2,
          description:
            "Personally call your top 5 reference customers. CEO-to-CEO. Re-sign multi-year.",
          costPreview: "Time, mostly. ~$0.5M discount",
          risk: "low",
          capitalCost: 4,
          playerMove: {
            name: "Top-Customer Lockdown",
            category: "channel",
            narrative:
              "CEO does 5 white-glove visits in 10 days. Three sign 3-year extensions. One walks. Net positive.",
            intensity: 2,
          },
          selfEffect: { capital: -4, hp: 6, brand: 3 },
          competitorEffect: { hp: -3 },
        },
      ],
      competitorFollowUp: {
        name: "Series C Bombshell",
        category: "capital",
        narrative:
          "VERA AI closes $180M Series C at $1.4B. Their war chest is now 12x yours. Asymmetry is now industry knowledge.",
        intensity: 3,
      },
      followUpDamageToPlayer: { brand: -4, hp: -3 },
      followUpCostToCompetitor: {},
      resolutionLine:
        "Capital asymmetry is now the dominant fact. The next round is your last chance to write a different ending.",
    },

    /* ─────────────── ROUND 5 — Months 25-30 ─────────────── */
    {
      roundNumber: 5,
      quarterLabel: "Months 25-30",
      setupNarrative:
        "Endgame. Six months left. The market has crystallized into 'them or you.' Your move set is what your capital allows.",
      competitorTell: "They're going for category coronation. Gartner is in the room.",
      competitorOpening: {
        name: "Category Coronation Push",
        category: "brand",
        narrative:
          "VERA AI lobbies Gartner hard. The new magic quadrant draft puts them top-right with you as 'niche callout.' Word leaks within a week.",
        intensity: 3,
      },
      openingDamageToPlayer: { brand: -8, hp: -6 },
      openingCostToCompetitor: { capital: -5 },
      capitalBudget: 12,
      choicePool: [
        {
          id: "r5-product-niche",
          label: "Niche Domination",
          category: "product",
          intensity: 2,
          description:
            "Retreat to your single strongest vertical. Own it absolutely. Sell to the rest never.",
          costPreview: "Locks long-term TAM at ~30%",
          risk: "low",
          capitalCost: 3,
          playerMove: {
            name: "Niche Coronation",
            category: "product",
            narrative:
              "You declare yourself the FinSrv-only WFC vendor. Top 3 banks renew with longer terms. Cash flow is positive again.",
            intensity: 2,
          },
          selfEffect: { capital: -3, hp: 5, brand: 3, ip: 3 },
          competitorEffect: {},
        },
        {
          id: "r5-capital-sale",
          label: "Strategic Sale Exploration",
          category: "capital",
          intensity: 3,
          description:
            "Open quiet talks with three strategic acquirers. See what the market says you're worth.",
          costPreview: "Banker fees + leak risk",
          risk: "high",
          capitalCost: 4,
          playerMove: {
            name: "Banker Engagement",
            category: "capital",
            narrative:
              "Goldman picks up the mandate. Three PE firms and one strategic show preliminary interest. Numbers are 0.4x your prior valuation.",
            intensity: 3,
          },
          selfEffect: { capital: -4, hp: -8, brand: -4 },
          competitorEffect: {},
        },
        {
          id: "r5-product-hail-mary",
          label: "All-In Vertical Agent",
          category: "product",
          intensity: 3,
          description:
            "Last $30M into a fully-autonomous vertical agent in 6 months. Hail Mary.",
          costPreview: "Burns most of remaining cash",
          risk: "high",
          capitalCost: 10,
          playerMove: {
            name: "Hail Mary Build",
            category: "product",
            narrative:
              "All engineering on a vertical-specialist autonomous agent. Team energized. Board terrified. Six months from now you'll know.",
            intensity: 3,
          },
          selfEffect: { capital: -10, ip: 10, brand: 4, speed: 5 },
          competitorEffect: { hp: -3, brand: -2 },
        },
        {
          id: "r5-brand-truth",
          label: "Truth Campaign",
          category: "brand",
          intensity: 2,
          description:
            "Publish hard numbers comparing your reliability to theirs over 18 months.",
          costPreview: "~$0.6M paid + earned",
          risk: "medium",
          capitalCost: 4,
          playerMove: {
            name: "Truth Campaign",
            category: "brand",
            narrative:
              "Side-by-side reliability charts go live. Two analysts re-evaluate. The narrative tilts back two degrees.",
            intensity: 2,
          },
          selfEffect: { capital: -4, brand: 5, hp: 3 },
          competitorEffect: { brand: -3 },
        },
        {
          id: "r5-talent-retain",
          label: "Retention Bonus Wave",
          category: "talent",
          intensity: 1,
          description:
            "One last retention grant to your top 20 ICs. Keep the team intact through the endgame.",
          costPreview: "~$1M equity refresh",
          risk: "low",
          capitalCost: 5,
          playerMove: {
            name: "Retention Wave",
            category: "talent",
            narrative:
              "Top 20 get re-vested grants. Three were taking calls. Now they aren't. Glassdoor recovers.",
            intensity: 1,
          },
          selfEffect: { capital: -5, speed: 3, hp: 2 },
          competitorEffect: { speed: -2 },
        },
      ],
      competitorFollowUp: {
        name: "Cash-Cushion Cruise",
        category: "capital",
        narrative:
          "VERA AI doesn't need to react. They keep shipping, marketing, hiring. Their valuation doesn't depend on stopping you anymore.",
        intensity: 1,
      },
      followUpDamageToPlayer: { hp: -4 },
      followUpCostToCompetitor: { capital: -3 },
      resolutionLine:
        "The simulation ends. What you did in the last 30 minutes is what your real next 30 months will look like — unless you decide otherwise.",
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
