import type { CompetitorProfile, OwnProfile, Scenario } from "./types";

export const DEFAULT_COMPETITOR: CompetitorProfile = {
  name: "MERIDIAN INDUSTRIES",
  industry: "Enterprise SaaS / Compliance",
  marketShare: 0.28,
  warChest: 78,
  innovationIndex: 62,
  brandPower: 71,
  posture: "AGGRESSIVE",
  leadershipBias: -35,
  recentSignals: [
    "CFO-Wechsel zu Ex-Goldman Operator",
    "12 Senior Hires aus Vertikalsegment",
    "Patentanmeldung im Bereich Workflow-KI",
    "EU-Lobbying-Aktivität gestiegen",
  ],
};

export const DEFAULT_OWN: OwnProfile = {
  name: "HELM CORP",
  intent:
    "Marktführerschaft im DACH-Enterprise-Segment innerhalb von 18 Monaten durch differenzierte Vertikal-Stack-Strategie.",
  openingMove: "Launch Vertikal-Suite für regulierte Finanzkunden mit EU-Datenresidenz",
  horizonRounds: 4,
  branchingFactor: 3,
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "s1",
    label: "Basis-Szenario",
    description: "Markt entwickelt sich entlang Konsens-Trajektorie. Kein exogener Schock.",
    weight: 0.55,
    modifiers: {},
  },
  {
    id: "s2",
    label: "Regulatorischer Schock",
    description: "EU AI Act-Verschärfung zwingt Compliance-Investitionen. Gegner pivotiert defensiv.",
    weight: 0.25,
    modifiers: { posture: "DEFENSIVE", innovationIndex: 50 },
  },
  {
    id: "s3",
    label: "Kapital-Überfluss",
    description: "Erfolgreicher Mega-Round. Gegner aggressiv mit M&A und Talentakquise.",
    weight: 0.2,
    modifiers: { posture: "OPPORTUNISTIC", warChest: 95 },
  },
];
