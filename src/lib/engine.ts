// HELM — deterministic move-tree generator.
// Pure heuristic engine: no external calls. Produces a reproducible game tree
// from a (competitor, own, scenarios) tuple. Designed to be replaced or augmented
// by an LLM-backed reasoner without changing the consuming UI.

import type {
  CompetitorProfile,
  Indicator,
  IndicatorSource,
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

// ---------- Indicator library ----------
// Each category maps to a small pool of observable leading indicators an
// analyst could realistically pick up from public/streaming intel. Two of these
// are deterministically attached to every OPPONENT node so triggers can be
// armed and the watchlist has real content out of the box.
interface IndicatorTemplate {
  label: string;
  source: IndicatorSource;
  description: string;
  weight: number; // base diagnostic weight 0..1
}

const INDICATOR_LIBRARY: Record<MoveCategory, IndicatorTemplate[]> = {
  PRICING: [
    { label: "Preisliste im Zielsegment verändert",  source: "PRICING",  description: "Öffentliche Preisliste oder SKU-Mix verschiebt sich im Top-Segment.", weight: 0.7 },
    { label: "Promotional Discounting Top-50 Accounts", source: "PRICING", description: "Discount-Welle (>15%) bei strategischen Bestandskunden.", weight: 0.6 },
    { label: "Multi-Year-Lock-In-Klauseln in RFPs",  source: "FILING",   description: "Vertragsentwürfe enthalten neue Laufzeit-/Exit-Klauseln.", weight: 0.5 },
    { label: "Bundling-Ankündigung im Earnings Call", source: "NEWS",    description: "CFO oder CRO bestätigt Bundling-Initiative öffentlich.", weight: 0.65 },
  ],
  PRODUCT: [
    { label: "Closed-Beta-Einladungen an Leuchtturm-Kunden", source: "NEWS", description: "Limited-Access-Beta wird über Vertrieb ausgerollt.", weight: 0.7 },
    { label: "Patent-Filing zu Kerntechnologie",     source: "PATENT",   description: "Neue Patentanmeldung in Workflow/AI-Bereich.", weight: 0.6 },
    { label: "Stellenausschreibungen für Plattform-Engineering", source: "HIRING", description: "Senior-Platform-Roles im LinkedIn-Hiring-Funnel.", weight: 0.55 },
    { label: "Roadmap-Leak via Analystengespräch",   source: "NEWS",     description: "Indirekt geleakte Roadmap-Slides via Gartner/Forrester.", weight: 0.5 },
  ],
  "M&A": [
    { label: "Banker-Aktivität / Bain-Mandat",       source: "NEWS",     description: "Strategic Advisor mandatiert, M&A-Pipeline-Hinweise.", weight: 0.75 },
    { label: "Antitrust-Voranfrage in Brüssel",      source: "REGULATORY", description: "Pre-notification bei EU-Kartellbehörde sichtbar.", weight: 0.8 },
    { label: "Sondierungs-Term-Sheets bei Targets",  source: "FILING",   description: "Term-Sheet-Bewegung bei wahrscheinlichem Übernahmeziel.", weight: 0.7 },
    { label: "CFO-Wechsel oder Corp-Dev VP-Hire",    source: "HIRING",   description: "Neuer Corp-Dev-Lead aus Banking-Hintergrund.", weight: 0.55 },
  ],
  TALENT: [
    { label: "Senior-Level LinkedIn-Hires in Vertikal", source: "HIRING", description: "≥3 Director+ Hires aus konkurrierenden Logos.", weight: 0.7 },
    { label: "Acqui-Hire Press Release",             source: "NEWS",     description: "PR über Team-Übernahme eines Wettbewerbers.", weight: 0.65 },
    { label: "Standort-Eröffnung in Talent-Hub",     source: "NEWS",     description: "Neues Office in Berlin/Zürich/Bangalore angekündigt.", weight: 0.5 },
    { label: "Equity-Refresher-Programm gestartet",  source: "SOCIAL",   description: "Glassdoor-Mentions zu Refresher-Grants nehmen zu.", weight: 0.45 },
  ],
  GEO: [
    { label: "Lokale Entity-Registrierung",          source: "FILING",   description: "Tochtergesellschaft im Zielmarkt registriert.", weight: 0.7 },
    { label: "Country-Manager-Job-Posting",          source: "HIRING",   description: "C-Level-Vacancy für regionalen Markteintritt.", weight: 0.65 },
    { label: "Pilot mit Anchor-Logo im Zielmarkt",   source: "NEWS",     description: "Case Study/Press Release mit lokalem Schlüsselkunden.", weight: 0.6 },
    { label: "Channel-Partner-Vertrag im Zielland",  source: "CHANNEL",  description: "Reseller-/Distributor-Vertrag öffentlich gemacht.", weight: 0.55 },
  ],
  CHANNEL: [
    { label: "Reseller-Margin-Erhöhung kommuniziert", source: "CHANNEL", description: "Partner-Briefing dokumentiert Margenanpassung.", weight: 0.6 },
    { label: "Direct-Sales-Force Hiring-Welle",      source: "HIRING",   description: "Field-Sales-Job-Postings >20 in 30 Tagen.", weight: 0.65 },
    { label: "Marketplace-Exklusiv-Listing",         source: "NEWS",     description: "AWS/Azure Marketplace-Exklusivvertrag publiziert.", weight: 0.55 },
    { label: "Channel-Policy-Update öffentlich",     source: "FILING",   description: "Partner-Code-of-Conduct verschärft.", weight: 0.5 },
  ],
  BRAND: [
    { label: "Comparative Campaign / Anti-Status-Quo-Ads", source: "NEWS", description: "Frontale Marketingkampagne gegen Marktführer.", weight: 0.7 },
    { label: "Konferenz-Keynote Slot priorisiert",   source: "NEWS",     description: "Founder/CEO-Keynote auf Tier-1-Konferenz.", weight: 0.5 },
    { label: "Long-Form-Manifest oder Whitepaper",   source: "SOCIAL",   description: "Strategie-Manifest auf Substack/HBR.", weight: 0.45 },
    { label: "Rebranding-Filing (Trademark, Domain)", source: "FILING",  description: "Neue Trademarks/Domain-Akquisen.", weight: 0.55 },
  ],
  REGULATORY: [
    { label: "EU-Lobbying-Register-Eintrag aktualisiert", source: "REGULATORY", description: "Lobbying-Budget / Themen-Eintrag in Brüssel.", weight: 0.65 },
    { label: "Antitrust-Beschwerde gegen Wettbewerber", source: "REGULATORY", description: "Eingereichte Beschwerde bei Bundeskartellamt/EU.", weight: 0.75 },
    { label: "SOC2/ISO/EU-AI-Act Zertifizierungs-PR", source: "NEWS",    description: "Compliance-Zertifikat öffentlich verkündet.", weight: 0.5 },
    { label: "Datenresidenz-Push für regulierte Branche", source: "REGULATORY", description: "Lokale Datacenter-Strategie kommuniziert.", weight: 0.55 },
  ],
  CAPITAL: [
    { label: "Term-Sheet-Leak bei Tier-1-VC",        source: "CAPITAL",  description: "Funding-Round mit Lead-Investor wird platziert.", weight: 0.8 },
    { label: "IPO-Underwriter-Mandat veröffentlicht", source: "FILING",  description: "S-1-Vorbereitung / Underwriter-Beauty-Contest.", weight: 0.7 },
    { label: "Buyback-Programm angekündigt",         source: "CAPITAL",  description: "Board genehmigt Aktienrückkaufprogramm.", weight: 0.5 },
    { label: "Cost-Reduction-Programm im Earnings Call", source: "NEWS", description: "Restructuring-Plan / Layoff-Welle kommuniziert.", weight: 0.55 },
  ],
  PARTNERSHIP: [
    { label: "Hyperscaler Co-Sell Slot gewonnen",    source: "NEWS",     description: "Strategic-Partnership-Tier mit AWS/Azure/GCP.", weight: 0.65 },
    { label: "Open-Source-Foundation gegründet",     source: "FILING",   description: "OSS-Stiftung mit eigenem Kerntech eingebracht.", weight: 0.55 },
    { label: "Exklusivvertrag mit Schlüsselzulieferer", source: "CHANNEL", description: "Long-term-Supply-Lock-in beim kritischen Component.", weight: 0.6 },
    { label: "Ecosystem-Allianz-Announcement",       source: "NEWS",     description: "Joint Statement mit Komplementäranbieter-Konsortium.", weight: 0.5 },
  ],
};

/**
 * Idempotently attach indicators to every OPPONENT node in a simulation
 * (used after assembling LLM-produced trees, where indicator generation isn't
 * part of the model contract). Deterministic given the simulation id + node id.
 */
export function attachIndicatorsToSimulation(sim: Simulation): void {
  const seedBase = hashString(sim.id);
  for (const id in sim.nodes) {
    const node = sim.nodes[id];
    if (node.actor !== "OPPONENT") continue;
    if (node.indicators && node.indicators.length > 0) continue;
    const r = rng(seedBase ^ hashString(id));
    node.indicators = buildIndicators(node, r);
  }
}

function buildIndicators(node: MoveNode, rand: () => number): Indicator[] {
  if (node.actor !== "OPPONENT") return [];
  const pool = INDICATOR_LIBRARY[node.category] ?? [];
  if (pool.length === 0) return [];
  // Deterministic shuffle, pick top-2.
  const order = pool
    .map((t, i) => ({ t, i, r: rand() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, Math.min(2, pool.length));
  return order.map(({ t, i }) => ({
    id: `${node.id}-ind${i}`,
    nodeId: node.id,
    label: t.label,
    source: t.source,
    description: t.description,
    weight: t.weight,
  }));
}

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
          if (node.actor === "OPPONENT") {
            node.indicators = buildIndicators(node, r);
          }
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
