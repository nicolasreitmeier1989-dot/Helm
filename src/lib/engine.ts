// HELM — deterministic move-tree generator.
// Pure heuristic engine: no external calls. Produces a reproducible game tree
// from a (competitor, own, scenarios) tuple. Designed to be replaced or augmented
// by an LLM-backed reasoner without changing the consuming UI.

import type {
  CompetitorProfile,
  MoveCategory,
  MoveNode,
  OwnProfile,
  Posture,
  Scenario,
  Simulation,
} from "./types";

// ---------- deterministic PRNG (mulberry32) ----------
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- knowledge base ----------
const POSTURE_WEIGHTS: Record<Posture, Partial<Record<MoveCategory, number>>> = {
  AGGRESSIVE:    { PRICING: 1.5, "M&A": 1.4, BRAND: 1.2, GEO: 1.3, TALENT: 1.1, PRODUCT: 1.1, CHANNEL: 1.0, REGULATORY: 0.7, CAPITAL: 1.0, PARTNERSHIP: 0.9 },
  EXPANSIVE:     { GEO: 1.6, PARTNERSHIP: 1.4, CHANNEL: 1.3, "M&A": 1.2, PRODUCT: 1.1, BRAND: 1.0, TALENT: 1.0, PRICING: 0.9, CAPITAL: 1.1, REGULATORY: 0.8 },
  DEFENSIVE:     { REGULATORY: 1.5, BRAND: 1.3, TALENT: 1.2, PRODUCT: 1.1, CAPITAL: 1.2, CHANNEL: 1.0, PARTNERSHIP: 1.0, PRICING: 0.8, GEO: 0.7, "M&A": 0.8 },
  OPPORTUNISTIC: { "M&A": 1.5, CAPITAL: 1.4, PARTNERSHIP: 1.3, TALENT: 1.2, PRODUCT: 1.0, PRICING: 1.1, BRAND: 1.0, GEO: 1.1, CHANNEL: 1.0, REGULATORY: 0.9 },
  CONSERVATIVE:  { CAPITAL: 1.4, PRODUCT: 1.2, REGULATORY: 1.2, BRAND: 1.1, CHANNEL: 1.0, TALENT: 1.0, PARTNERSHIP: 1.0, PRICING: 0.8, GEO: 0.7, "M&A": 0.6 },
};

const MOVE_LIBRARY: Record<MoveCategory, { title: string; threat: number; cost: number }[]> = {
  PRICING: [
    { title: "Aggressive Preisunterbietung im Kernsegment",                threat: 80, cost: 70 },
    { title: "Bundling-Offensive zur Margenverwässerung",                  threat: 65, cost: 50 },
    { title: "Freemium-Layer zur Marktdurchdringung",                      threat: 60, cost: 55 },
    { title: "Premium-Tier-Launch zur Margenexpansion",                    threat: 35, cost: 30 },
    { title: "Mehrjahresverträge mit Lock-in-Klauseln",                    threat: 70, cost: 25 },
  ],
  PRODUCT: [
    { title: "Plattform-Release mit offener Schnittstelle",                threat: 70, cost: 70 },
    { title: "Akquisition eines spezialisierten Tech-Stacks",              threat: 75, cost: 80 },
    { title: "KI-gestützte Workflow-Suite",                                threat: 80, cost: 75 },
    { title: "Vertikalisierte Lösung für Schlüsselkunden",                 threat: 65, cost: 60 },
    { title: "End-of-life Legacy zugunsten Next-Gen-Stack",                threat: 45, cost: 55 },
  ],
  "M&A": [
    { title: "Übernahme eines direkten Wettbewerbers",                     threat: 90, cost: 90 },
    { title: "Tuck-in eines Nischenanbieters",                             threat: 55, cost: 45 },
    { title: "Joint Venture mit Hyperscaler",                              threat: 70, cost: 50 },
    { title: "Spin-off einer Sparte zur Fokussierung",                     threat: 25, cost: 30 },
    { title: "Carve-out eines Konkurrenz-Segments",                        threat: 65, cost: 70 },
  ],
  TALENT: [
    { title: "Headhunting Schlüsselpersonen aus unserer Org",              threat: 75, cost: 30 },
    { title: "Acqui-Hire eines Founding Teams",                            threat: 65, cost: 55 },
    { title: "Aufbau Standort in Talent-Hub",                              threat: 50, cost: 60 },
    { title: "Großflächiger Restructuring-Plan",                           threat: 30, cost: 50 },
  ],
  GEO: [
    { title: "Markteintritt DACH / Direct-Sales",                          threat: 70, cost: 65 },
    { title: "APAC-Hub via lokalem Joint Venture",                         threat: 60, cost: 70 },
    { title: "US-Ostküsten-Push für Enterprise-Accounts",                  threat: 75, cost: 75 },
    { title: "Rückzug aus unprofitablen Regionen",                         threat: 20, cost: 25 },
  ],
  CHANNEL: [
    { title: "Direct-to-Customer-Pivot",                                   threat: 65, cost: 60 },
    { title: "Reseller-Programm mit Margen-Anreiz",                        threat: 55, cost: 40 },
    { title: "Marketplace-Exklusivpartnerschaft",                          threat: 70, cost: 35 },
    { title: "Field Sales Force Verdopplung",                              threat: 60, cost: 70 },
  ],
  BRAND: [
    { title: "Repositionierung als Kategorie-Definierer",                  threat: 60, cost: 55 },
    { title: "Thought-Leadership-Offensive (Konferenz, Studien)",          threat: 45, cost: 35 },
    { title: "Globale Kampagne gegen Status-quo-Player",                   threat: 70, cost: 60 },
    { title: "Stille Phase / kein PR-Output",                              threat: 20, cost: 5  },
  ],
  REGULATORY: [
    { title: "Lobbying für Standardisierung zu eigenen Gunsten",           threat: 70, cost: 40 },
    { title: "Beschwerde wegen marktbeherrschender Stellung",              threat: 65, cost: 25 },
    { title: "Zertifizierungsoffensive (SOC2, ISO, EU AI Act)",            threat: 50, cost: 45 },
    { title: "Datenresidenz-Push für regulierte Branchen",                 threat: 55, cost: 50 },
  ],
  CAPITAL: [
    { title: "Mega-Funding-Round zur Marktbeherrschung",                   threat: 80, cost: 30 },
    { title: "IPO-Vorbereitung",                                           threat: 50, cost: 40 },
    { title: "Strategic Convertible mit Mega-LP",                          threat: 60, cost: 25 },
    { title: "Aggressive Aktienrückkäufe / Signal an Markt",               threat: 30, cost: 50 },
    { title: "Kostensenkung 20 % / Cash-Konservierung",                    threat: 25, cost: 40 },
  ],
  PARTNERSHIP: [
    { title: "Exklusivpartnerschaft mit Schlüsselzulieferer",              threat: 65, cost: 30 },
    { title: "Co-Sell mit Hyperscaler",                                    threat: 70, cost: 35 },
    { title: "Ökosystem-Allianz mit Komplementäranbietern",                threat: 55, cost: 25 },
    { title: "Open-Source-Stiftung als Köder",                             threat: 50, cost: 30 },
  ],
};

const COUNTER_LIBRARY: Record<MoveCategory, string[]> = {
  PRICING: [
    "Wert-basierte Preiskommunikation an Top-50-Accounts",
    "Selektives Price-Match nur bei verteidigungswerten Logos",
    "Lock-in via Mehrjahresvertrag mit Volumenrabatt",
    "Margenstarken Premium-Tier als Anker einführen",
  ],
  PRODUCT: [
    "Roadmap-Acceleration auf differenzierende Capability",
    "Strategische Closed-Beta mit Lead-Kunden",
    "Defensive Patent-Filings auf Kernfeature",
    "Integrationspakt mit komplementärem Anbieter",
  ],
  "M&A": [
    "Vorkaufsrecht-Klausel bei Schlüssellieferanten",
    "Defensive Übernahme des wahrscheinlichsten Targets",
    "Investor-Konsortium um Bidding-War zu blocken",
    "Kartellrechtliche Hinweise an zuständige Behörde",
  ],
  TALENT: [
    "Retention-Pakete für Top-10 % High-Performer",
    "Non-Solicit-Verträge schärfen",
    "Counter-Recruiting aus deren Talentpool",
    "Equity-Refresher mit Cliff",
  ],
  GEO: [
    "Vor-Markteintritt-Übernahme lokaler Partner",
    "Exklusive Channel-Lock-ins im Ziel-Markt",
    "Frühzeitige Brand-Etablierung via Leuchtturm-Kunde",
    "Regulatorische Hürden ausnutzen (Datenresidenz)",
  ],
  CHANNEL: [
    "Reseller-Margen für Top-20-Partner anheben",
    "Direct-Sales-Force in High-LTV-Segmenten",
    "Exklusiv-Listing in zentralem Marketplace",
    "Channel-Conflict-Policy verschärfen",
  ],
  BRAND: [
    "Glaubwürdigkeitsoffensive: Case Studies + Daten",
    "Analystenrelations (Gartner/Forrester) priorisieren",
    "Founder-Visibilität (Keynotes, Long-Form Content)",
    "Stillhalten — Reaktion verleiht Legitimität",
  ],
  REGULATORY: [
    "Eigene Position bei Standardisierungsgremien",
    "Compliance-First-Marketing für regulierte Branchen",
    "Allianzen mit Branchenverbänden",
    "Frühwarnsystem für Gesetzesinitiativen",
  ],
  CAPITAL: [
    "Strategic Round mit Top-Tier-Sponsor",
    "Profitabilitätspfad öffentlich kommunizieren",
    "Schuldenfazilität für Optionalität",
    "Cash-Burn-Reduktion ohne Wachstumsverlust",
  ],
  PARTNERSHIP: [
    "Eigenen Hyperscaler-Co-Sell-Slot priorisieren",
    "Exklusivverträge mit kritischen Komplementären",
    "Open-API-Strategie zur Ökosystem-Bindung",
    "Allianz mit unabhängigem Standard",
  ],
};

const POSTURE_RATIONALE: Record<Posture, string> = {
  AGGRESSIVE:    "Maximierung des Druckpotenzials, akzeptiert hohe Risiken zur Umverteilung von Marktanteilen.",
  EXPANSIVE:     "Volumen vor Marge — Reichweite, Distribution und neue Geografien dominieren das Kalkül.",
  DEFENSIVE:     "Schutz bestehender Cash-Flows, präferiert Moats, Compliance und Talent-Retention.",
  OPPORTUNISTIC: "Liest schwache Signale aggressiv, gewichtet Optionalität und anorganische Sprünge hoch.",
  CONSERVATIVE:  "Kapitaldisziplin und operative Exzellenz priorisiert; meidet binäre Wetten.",
};

// ---------- helpers ----------
function pickWeighted<T>(items: { value: T; weight: number }[], r: number): T {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  let x = r * total;
  for (const it of items) {
    x -= Math.max(0, it.weight);
    if (x <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

function categoryWeights(p: CompetitorProfile, scenario?: Scenario): { value: MoveCategory; weight: number }[] {
  const eff: CompetitorProfile = { ...p, ...(scenario?.modifiers ?? {}) };
  const base = POSTURE_WEIGHTS[eff.posture];
  const bias = eff.leadershipBias / 100; // -1..1
  return (Object.keys(MOVE_LIBRARY) as MoveCategory[]).map((cat) => {
    let w = base[cat] ?? 1.0;
    // Founder/visionary boosts product, brand, capital, geo, m&a
    const founderTilt: MoveCategory[] = ["PRODUCT", "BRAND", "CAPITAL", "GEO", "M&A"];
    const optimizerTilt: MoveCategory[] = ["CAPITAL", "REGULATORY", "CHANNEL", "PRICING"];
    if (founderTilt.includes(cat)) w *= 1 + Math.max(0, -bias) * 0.35;
    if (optimizerTilt.includes(cat)) w *= 1 + Math.max(0, bias) * 0.35;
    // War chest gates M&A and CAPITAL
    if (cat === "M&A" || cat === "CAPITAL") w *= 0.4 + (eff.warChest / 100) * 1.2;
    // Innovation gates PRODUCT
    if (cat === "PRODUCT") w *= 0.5 + (eff.innovationIndex / 100) * 1.0;
    // Brand gates BRAND
    if (cat === "BRAND") w *= 0.5 + (eff.brandPower / 100) * 0.8;
    return { value: cat, weight: w };
  });
}

function selectMove(
  cat: MoveCategory,
  p: CompetitorProfile,
  rand: () => number,
  excludeTitles: Set<string>,
): { title: string; threat: number; cost: number } {
  const pool = MOVE_LIBRARY[cat].filter((m) => !excludeTitles.has(m.title));
  const arr = pool.length ? pool : MOVE_LIBRARY[cat];
  // Slight tilt: aggressive opponents pick higher-threat moves
  const aggressionBoost = p.posture === "AGGRESSIVE" ? 1 : p.posture === "DEFENSIVE" ? -1 : 0;
  const weighted = arr.map((m) => ({
    value: m,
    weight: 1 + (aggressionBoost * (m.threat - 50)) / 100,
  }));
  return pickWeighted(weighted, rand());
}

function rationaleFor(cat: MoveCategory, p: CompetitorProfile, own: OwnProfile): string {
  const lever =
    cat === "PRICING"    ? "Margenarchitektur und Preisanker" :
    cat === "PRODUCT"    ? "Differenzierungs-Roadmap" :
    cat === "M&A"        ? "anorganische Konsolidierung" :
    cat === "TALENT"     ? "Humankapital-Akkumulation" :
    cat === "GEO"        ? "geografische Reichweite" :
    cat === "CHANNEL"    ? "Distributionsökonomie" :
    cat === "BRAND"      ? "Wahrnehmungsdominanz" :
    cat === "REGULATORY" ? "regulatorischer Moat" :
    cat === "CAPITAL"    ? "Kapitalsignale an den Markt" :
                           "Ökosystem-Hebel";
  return `${POSTURE_RATIONALE[p.posture]} Zug zielt auf ${lever} als Antwort auf "${own.openingMove.slice(0, 80)}".`;
}

// ---------- tree generation ----------
export function simulate(
  competitor: CompetitorProfile,
  own: OwnProfile,
  scenarios: Scenario[],
  opts?: { seed?: string },
): Simulation {
  const seedStr = opts?.seed ?? `${competitor.name}|${own.name}|${own.openingMove}|${own.horizonRounds}|${own.branchingFactor}`;
  const rand = rng(hashString(seedStr));

  const nodes: Record<string, MoveNode> = {};
  const rootIds: string[] = [];

  let counter = 0;
  const nextId = () => `n${(++counter).toString(36)}`;

  for (const scen of scenarios) {
    const scenSeed = hashString(seedStr + "|" + scen.id);
    const r = rng(scenSeed);

    const rootId = nextId();
    const rootMove: MoveNode = {
      id: rootId,
      parentId: null,
      round: 0,
      actor: "SELF",
      category: "PRODUCT",
      title: own.openingMove || "Eröffnungszug",
      rationale: `Unser Eröffnungszug — Szenario: ${scen.label}`,
      probability: 1,
      cumulativeProbability: 1,
      threat: 0,
      cost: 30,
      counters: [],
      children: [],
    };
    nodes[rootId] = rootMove;
    rootIds.push(rootId);

    const growFrontier = (frontier: string[], round: number) => {
      const next: string[] = [];
      for (const parentId of frontier) {
        const parent = nodes[parentId];
        const isOpponent = parent.actor === "SELF"; // alternate
        const actor: "OPPONENT" | "SELF" = isOpponent ? "OPPONENT" : "SELF";

        // Branching factor scales down with depth to keep tree readable
        const branchAtRound = Math.max(1, Math.round(own.branchingFactor * (1 - (round - 1) / Math.max(1, own.horizonRounds * 1.6))));

        // Sample categories without replacement
        const used = new Set<MoveCategory>();
        const usedTitles = new Set<string>();
        const rawProbs: number[] = [];
        const childPayloads: { cat: MoveCategory; move: ReturnType<typeof selectMove> }[] = [];

        for (let b = 0; b < branchAtRound; b++) {
          const weights = categoryWeights(competitor, scen).filter((w) => !used.has(w.value));
          if (weights.length === 0) break;
          const cat = pickWeighted(weights, r());
          used.add(cat);
          const move = selectMove(cat, competitor, r, usedTitles);
          usedTitles.add(move.title);
          // Probability shaped by category weight + posture confidence
          const wEntry = weights.find((w) => w.value === cat)!;
          const p = Math.max(0.05, wEntry.weight);
          rawProbs.push(p);
          childPayloads.push({ cat, move });
        }
        const total = rawProbs.reduce((s, v) => s + v, 0) || 1;
        childPayloads.forEach((pl, idx) => {
          const prob = rawProbs[idx] / total;
          const id = nextId();
          const node: MoveNode = {
            id,
            parentId,
            round,
            actor,
            category: pl.cat,
            title: pl.move.title,
            rationale: actor === "OPPONENT"
              ? rationaleFor(pl.cat, competitor, own)
              : `Antwortzug. Adressiert ${pl.cat.toLowerCase()}-Druck des Gegners.`,
            probability: prob,
            cumulativeProbability: parent.cumulativeProbability * prob,
            threat: actor === "OPPONENT" ? pl.move.threat : Math.max(0, 100 - pl.move.threat),
            cost: pl.move.cost,
            counters: actor === "OPPONENT" ? COUNTER_LIBRARY[pl.cat].slice(0, 3) : [],
            children: [],
          };
          nodes[id] = node;
          parent.children.push(id);
          next.push(id);
        });
      }
      return next;
    };

    let frontier = [rootId];
    for (let round = 1; round <= own.horizonRounds; round++) {
      frontier = growFrontier(frontier, round);
      if (frontier.length === 0) break;
    }
  }

  return {
    id: `sim_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    competitor,
    own,
    scenarios,
    nodes,
    rootIds,
  };
}

// ---------- aggregate analytics ----------
export interface PathSummary {
  ids: string[];
  cumulativeProbability: number;
  totalThreat: number;
  scenarioLabel: string;
}

export function topPaths(sim: Simulation, k = 5): PathSummary[] {
  const paths: PathSummary[] = [];

  const walk = (id: string, trail: string[], threat: number, scenarioLabel: string) => {
    const n = sim.nodes[id];
    const t = trail.concat(id);
    const newThreat = threat + (n.actor === "OPPONENT" ? n.threat * n.probability : 0);
    if (n.children.length === 0) {
      paths.push({
        ids: t,
        cumulativeProbability: n.cumulativeProbability,
        totalThreat: newThreat,
        scenarioLabel,
      });
      return;
    }
    for (const c of n.children) walk(c, t, newThreat, scenarioLabel);
  };

  sim.rootIds.forEach((rid, i) => {
    const scen = sim.scenarios[i];
    walk(rid, [], 0, scen?.label ?? `Szenario ${i + 1}`);
  });

  // Composite score: probability * threat
  return paths
    .sort((a, b) => b.cumulativeProbability * b.totalThreat - a.cumulativeProbability * a.totalThreat)
    .slice(0, k);
}

export function categoryHeatmap(sim: Simulation): { category: MoveCategory; weight: number }[] {
  const acc: Record<string, number> = {};
  for (const id in sim.nodes) {
    const n = sim.nodes[id];
    if (n.actor !== "OPPONENT") continue;
    acc[n.category] = (acc[n.category] || 0) + n.cumulativeProbability * n.threat;
  }
  const total = Object.values(acc).reduce((s, v) => s + v, 0) || 1;
  return (Object.keys(acc) as MoveCategory[])
    .map((c) => ({ category: c, weight: acc[c] / total }))
    .sort((a, b) => b.weight - a.weight);
}

export function threatIndex(sim: Simulation): number {
  // 0..100 composite read: expected threat across all opponent nodes.
  let s = 0;
  let n = 0;
  for (const id in sim.nodes) {
    const node = sim.nodes[id];
    if (node.actor !== "OPPONENT") continue;
    s += node.threat * node.cumulativeProbability;
    n += node.cumulativeProbability;
  }
  if (n === 0) return 0;
  return Math.min(100, Math.round((s / n) * 1.15));
}
