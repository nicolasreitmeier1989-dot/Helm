// WFC — delta-driven move-tree generator (v0.3).
//
// Replaces the static MOVE_LIBRARY heuristic with a topology-aware generator.
// For each OPPONENT move it identifies a strategic target on the opponent's
// own topology (a weak BMC block they'd reinforce, a high-importance
// capability they'd leverage, a contested customer segment) and emits a
// TopologyDelta describing the shift. Threat is then COMPUTED from how that
// delta collides with OUR topology — VPC overlap on a shared segment is
// hottest; capability asymmetry on our weak/important areas is also hot.
//
// SELF moves at even rounds invert: deltas operate on OUR topology and threat
// is 100 - parent.threat (the move's effectiveness at reducing the threat).

import type {
  BMCBlockKind,
  Capability,
  CapabilityDimension,
  CompetitorProfile,
  Indicator,
  IndicatorSource,
  MoveCategory,
  MoveNode,
  OwnProfile,
  Posture,
  Scenario,
  Simulation,
  StrategicTopology,
  TopologyDelta,
} from "./types";
import {
  deriveCategoryFromDeltas,
  sharedBlocks,
} from "./topology";
import { adjudicate } from "./adjudication";
import type { AIPatternId } from "./aiNativePatterns";

// Helper: derive a capability's dimension via its set membership.
function dimOfCap(cap: Capability, topology: StrategicTopology): CapabilityDimension | null {
  const set = topology.capabilitySets.find((s) => s.id === cap.setId);
  return set ? set.dimension : null;
}

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

// ---------- shared rationale & posture descriptors ----------

const POSTURE_RATIONALE: Record<Posture, string> = {
  AGGRESSIVE:    "Maximierung des Druckpotenzials, akzeptiert hohe Risiken zur Umverteilung von Marktanteilen.",
  EXPANSIVE:     "Volumen vor Marge — Reichweite, Distribution und neue Geografien dominieren das Kalkül.",
  DEFENSIVE:     "Schutz bestehender Cash-Flows, präferiert Moats, Compliance und Talent-Retention.",
  OPPORTUNISTIC: "Liest schwache Signale aggressiv, gewichtet Optionalität und anorganische Sprünge hoch.",
  CONSERVATIVE:  "Kapitaldisziplin und operative Exzellenz priorisiert; meidet binäre Wetten.",
};

// ---------- Counter library (category-tagged, kept from v0.2) ----------

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
    "Retention-Pakete für Top-10% High-Performer",
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

// ---------- Indicator library (kept for trigger system) ----------

interface IndicatorTemplate {
  label: string;
  source: IndicatorSource;
  description: string;
  weight: number;
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

// ---------- Emerging-Capability seed library (used by opponent move generator) ----------

const EMERGING_CAPABILITY_LIBRARY: { name: string; dimension: CapabilityDimension }[] = [
  { name: "Agent Operations", dimension: "TECH" },
  { name: "Synthetic Data Engineering", dimension: "TECH" },
  { name: "AI Governance Office", dimension: "PROCESSES" },
  { name: "Hybrid-Work Ops", dimension: "ORG" },
  { name: "Sovereign-Cloud Tradecraft", dimension: "PEOPLE" },
];

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

// ---------- delta plan ----------

interface DeltaPlan {
  delta: TopologyDelta;
  title: string;
  rationale: string;
  cost: number;
}

function pickWeighted<T>(items: { value: T; weight: number }[], r: number): T {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  let x = r * total;
  for (const it of items) {
    x -= Math.max(0, it.weight);
    if (x <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

// ---------- target selection on opponent's topology ----------

interface CandidateTarget {
  description: string;
  delta: TopologyDelta;
  cost: number;
  title: string;
  weight: number;
}

function opponentMoveCandidates(
  comp: CompetitorProfile,
  own: OwnProfile,
  scen: Scenario,
): CandidateTarget[] {
  const opp = effectiveCompetitor(comp, scen);
  const oppTop = opp.topology;
  const ourTop = own.topology;
  const candidates: CandidateTarget[] = [];

  const postureBoost = (cat: MoveCategory): number => {
    const w = POSTURE_WEIGHTS[opp.posture][cat] ?? 1.0;
    return w;
  };
  const bias = opp.leadershipBias / 100; // -1..1
  const visionary = Math.max(0, -bias);  // 0..1
  const optimizer = Math.max(0, bias);   // 0..1

  // ---- 1. STRENGTHEN existing high-strength BMC blocks (defensive plays) ----
  for (const blk of oppTop.bmc.blocks) {
    if (blk.strength < 60) continue; // only fortify what's already a moat
    const mag = clamp(40 + (100 - blk.strength) * 0.3 + visionary * 10, 30, 90);
    const cat = catFromBlock(blk.kind, "STRENGTHEN");
    const w = postureBoost(cat) * (opp.posture === "DEFENSIVE" ? 1.5 : 1.0);
    candidates.push({
      title: `Verstärkung "${blk.label}" als Moat-Ausbau`,
      description: `${opp.name} verteidigt ${blk.kind} "${blk.label}".`,
      cost: clamp(35 + blk.strength * 0.2, 20, 70),
      weight: w,
      delta: {
        layer: "BMC",
        op: "STRENGTHEN",
        target: { kind: "BMC_BLOCK", blockKind: blk.kind, blockId: blk.id },
        magnitude: mag,
        description: `Verstärkt ${humanBlockKind(blk.kind)} "${blk.label}" (+${Math.round(
          mag * 0.5,
        )} Punkte Stärke).`,
      },
    });
  }

  // ---- 2. STRENGTHEN weak BMC blocks (reinforce gaps) ----
  for (const blk of oppTop.bmc.blocks) {
    if (blk.strength >= 60) continue;
    const mag = clamp(50 + (60 - blk.strength) * 0.6, 40, 95);
    const cat = catFromBlock(blk.kind, "STRENGTHEN");
    let w = postureBoost(cat) * 1.1;
    // Gap-filling is more attractive for OPPORTUNISTIC and DEFENSIVE postures
    if (opp.posture === "OPPORTUNISTIC") w *= 1.3;
    if (opp.posture === "DEFENSIVE") w *= 1.2;
    candidates.push({
      title: `Schließung Schwachstelle "${blk.label}"`,
      description: `${opp.name} schließt Lücke in ${blk.kind}.`,
      cost: clamp(45 + (60 - blk.strength) * 0.4, 35, 85),
      weight: w,
      delta: {
        layer: "BMC",
        op: "STRENGTHEN",
        target: { kind: "BMC_BLOCK", blockKind: blk.kind, blockId: blk.id },
        magnitude: mag,
        description: `Schließt Lücke in ${humanBlockKind(blk.kind)} "${blk.label}" (+${Math.round(
          mag * 0.5,
        )} Punkte Stärke).`,
      },
    });
  }

  // ---- 3. ADD new BMC blocks (expansion / aggressive moves) ----
  // Most interesting: contested customer segments + new channels
  const expansionPlans: { kind: BMCBlockKind; label: string; cat: MoveCategory }[] = [
    { kind: "CUSTOMER_SEGMENTS", label: "Adjazentes Vertikalsegment (Insurance Mid-Market)", cat: "GEO" },
    { kind: "VALUE_PROPOSITIONS", label: "AI-Native Workflow-Augmentation", cat: "PRODUCT" },
    { kind: "CHANNELS", label: "Hyperscaler-Marketplace-Direct-Listing", cat: "CHANNEL" },
    { kind: "KEY_RESOURCES", label: "EU-Datenresidenz-Cluster (Frankfurt)", cat: "M&A" },
    { kind: "KEY_PARTNERS", label: "DACH-Branchenverband Allianz", cat: "PARTNERSHIP" },
    { kind: "REVENUE_STREAMS", label: "Usage-based AI-Inferenz-Pricing", cat: "PRICING" },
  ];
  for (const plan of expansionPlans) {
    const mag = clamp(50 + visionary * 30 + (opp.warChest / 100) * 20, 40, 95);
    let w = postureBoost(plan.cat);
    if (opp.posture === "AGGRESSIVE" || opp.posture === "EXPANSIVE") w *= 1.4;
    if (opp.posture === "OPPORTUNISTIC") w *= 1.25;
    // War-chest gating for expensive ADDs
    if (plan.cat === "M&A" || plan.cat === "GEO") {
      w *= 0.4 + (opp.warChest / 100) * 1.3;
    }
    candidates.push({
      title: `Eintritt: "${plan.label}"`,
      description: `${opp.name} öffnet neuen ${humanBlockKind(plan.kind)}.`,
      cost: clamp(50 + (mag - 50) * 0.6, 40, 90),
      weight: w,
      delta: {
        layer: "BMC",
        op: "ADD",
        target: { kind: "BMC_BLOCK", blockKind: plan.kind },
        newLabel: plan.label,
        magnitude: mag,
        description: `Neuer ${humanBlockKind(plan.kind)}: "${plan.label}".`,
      },
    });
  }

  // ---- 4. CAPABILITY moves ----
  // Leverage their high-importance, high-level capabilities
  for (const cap of oppTop.capabilities) {
    const dim = dimOfCap(cap, oppTop);
    if (!dim) continue;
    if (cap.level >= 70 && cap.importance >= 70) {
      const mag = clamp(40 + (cap.importance - 70) * 1.5, 35, 80);
      const cat = catFromCapability(dim, "STRENGTHEN");
      let w = postureBoost(cat) * 1.2;
      if (dim === "TECH" && opp.innovationIndex > 60) w *= 1.3;
      candidates.push({
        title: `Hebel auf "${cap.label}" — Doppel-Investition`,
        description: `Verstärkt vorhandene ${dim}-Stärke.`,
        cost: clamp(40 + cap.level * 0.2, 30, 70),
        weight: w,
        delta: {
          layer: "CAPABILITIES",
          op: "STRENGTHEN",
          target: {
            kind: "CAPABILITY",
            dimension: dim,
            capabilityId: cap.id,
            setId: cap.setId,
          },
          magnitude: mag,
          description: `Verstärkt ${dim}-Capability "${cap.label}" (+${Math.round(
            mag * 0.5,
          )} Level).`,
        },
      });
    }
  }

  // Close low-level but high-importance capability gaps (asymmetric attack on our edge)
  for (const cap of oppTop.capabilities) {
    const dim = dimOfCap(cap, oppTop);
    if (!dim) continue;
    if (cap.level < 65 && cap.importance >= 70) {
      const mag = clamp(50 + cap.importance * 0.3, 45, 90);
      const cat = catFromCapability(dim, "STRENGTHEN");
      let w = postureBoost(cat) * 1.35;
      // Optimizers love closing process / ORG gaps
      if (dim === "PROCESSES" || dim === "ORG") w *= 1 + optimizer * 0.5;
      // Visionaries push TECH gaps
      if (dim === "TECH") w *= 1 + visionary * 0.5;
      candidates.push({
        title: `Aufbau "${cap.label}" um Lücke zu schließen`,
        description: `Adressiert gefährliche ${dim}-Lücke.`,
        cost: clamp(55 + (90 - cap.level) * 0.3, 45, 85),
        weight: w,
        delta: {
          layer: "CAPABILITIES",
          op: "STRENGTHEN",
          target: {
            kind: "CAPABILITY",
            dimension: dim,
            capabilityId: cap.id,
            setId: cap.setId,
          },
          magnitude: mag,
          description: `Schließt ${dim}-Lücke "${cap.label}" (+${Math.round(
            mag * 0.5,
          )} Level).`,
        },
      });
    }
  }

  // ---- 5. ADD capabilities (especially in TECH for high-innovation) ----
  if (opp.innovationIndex > 60) {
    const mag = clamp(45 + opp.innovationIndex * 0.4, 50, 90);
    candidates.push({
      title: "Aufbau neuer TECH-Capability: ML-Inferenz-Pipeline",
      description: "Anorganischer TECH-Ausbau, getrieben von Innovationsindex.",
      cost: clamp(60 + visionary * 20, 55, 85),
      weight: 1.0 + visionary * 0.6 + (opp.innovationIndex / 100) * 0.5,
      delta: {
        layer: "CAPABILITIES",
        op: "ADD",
        target: { kind: "CAPABILITY", dimension: "TECH" },
        newLabel: "Proprietäre AI-Inferenz-Pipeline",
        magnitude: mag,
        description: "Neue TECH-Capability: Proprietäre AI-Inferenz-Pipeline.",
      },
    });
  }

  // ---- 6. VPC plays — collision on shared customer segments ----
  // For each opponent VPC whose customerSegmentBlockId is shared with one of ours
  // (or whose segment label matches), generate a VPC-item ADD targeting their
  // gain-creators / pain-relievers (this is the HOTTEST attack on us).
  const collisionSegments = sharedBlocks(oppTop.bmc, ourTop.bmc, "CUSTOMER_SEGMENTS");
  for (const { theirs: theirSeg } of collisionSegments) {
    const oppVpc = oppTop.vpcs.find((v) => v.customerSegmentBlockId === theirSeg.id);
    if (!oppVpc) continue;
    const mag = clamp(55 + visionary * 25, 50, 90);
    let w = 1.6; // VPC attacks on shared segments are highly weighted
    if (opp.posture === "AGGRESSIVE") w *= 1.4;
    candidates.push({
      title: `Pain-Reliever-Match auf "${theirSeg.label}"`,
      description: `Neutralisiert unseren Edge im umkämpften Segment.`,
      cost: clamp(50 + mag * 0.3, 45, 85),
      weight: w,
      delta: {
        layer: "VPC",
        op: "ADD",
        target: {
          kind: "VPC_ITEM",
          vpcId: oppVpc.id,
          side: "VALUE_MAP",
          itemKind: "painRelievers",
        },
        newLabel: "EU-Datenresidenz mit Schrems-II-Compliance",
        magnitude: mag,
        description: `Fügt direkten Pain-Reliever in ihrem VPC für "${theirSeg.label}" hinzu — neutralisiert unseren Schrems-Vorteil.`,
      },
    });
    candidates.push({
      title: `Gain-Creator auf "${theirSeg.label}" — AI-Augmentation`,
      description: `Erhöht Wechselattraktivität im Collision-Segment.`,
      cost: clamp(45 + mag * 0.3, 40, 80),
      weight: w * 0.9,
      delta: {
        layer: "VPC",
        op: "ADD",
        target: {
          kind: "VPC_ITEM",
          vpcId: oppVpc.id,
          side: "VALUE_MAP",
          itemKind: "gainCreators",
        },
        newLabel: "AI-Augmented Reg-Officer-Workflows",
        magnitude: mag,
        description: `Neuer Gain-Creator: AI-Augmentation für Compliance-Officer-Effizienz.`,
      },
    });
  }

  // ---- 6b. ADD a NEW CAPABILITY SET ("emerging area") ---------------------
  // Only for AGGRESSIVE / OPPORTUNISTIC postures; low probability per round.
  // Picks a name from EMERGING_CAPABILITY_LIBRARY that the opponent doesn't
  // already have. The set dimension defaults to TECH (most emerging areas).
  if (opp.posture === "AGGRESSIVE" || opp.posture === "OPPORTUNISTIC") {
    const have = new Set(
      oppTop.capabilitySets.map((s) => s.name.trim().toLowerCase()),
    );
    const fresh = EMERGING_CAPABILITY_LIBRARY.filter(
      (e) => !have.has(e.name.trim().toLowerCase()),
    );
    for (const e of fresh) {
      const mag = clamp(45 + visionary * 25 + (opp.innovationIndex / 100) * 15, 40, 85);
      // Base weight ~0.45 — small probability per spec (~10–15%)
      let w = 0.45 + visionary * 0.3 + (opp.innovationIndex / 100) * 0.2;
      if (opp.posture === "AGGRESSIVE") w *= 1.05;
      if (opp.posture === "OPPORTUNISTIC") w *= 1.15;
      candidates.push({
        title: `Aufbau neuer Capability-Area: "${e.name}"`,
        description: `${opp.name} eröffnet eine neue Capability-Domäne — Signal-getrieben.`,
        cost: clamp(60 + visionary * 15, 55, 90),
        weight: w,
        delta: {
          layer: "CAPABILITIES",
          op: "ADD",
          target: {
            kind: "CAPABILITY_SET",
            dimension: e.dimension,
          },
          newLabel: e.name,
          magnitude: mag,
          description: `Neues Capability-Set "${e.name}" (EMERGING, ${e.dimension}).`,
        },
      });
    }
  }

  // ---- 7. M&A plays — gated by war chest, derived from KEY_RESOURCES ----
  if (opp.warChest >= 50) {
    const mag = clamp(60 + (opp.warChest / 100) * 30, 55, 95);
    let w = postureBoost("M&A") * (0.4 + (opp.warChest / 100) * 1.2);
    if (opp.posture === "OPPORTUNISTIC") w *= 1.5;
    candidates.push({
      title: "Tuck-in: Akquisition eines DACH-Nischenanbieters",
      description: "Anorganische Konsolidierung im Zielsegment.",
      cost: clamp(75 + (opp.warChest - 50) * 0.3, 60, 95),
      weight: w,
      delta: {
        layer: "BMC",
        op: "ADD",
        target: { kind: "BMC_BLOCK", blockKind: "KEY_RESOURCES" },
        newLabel: "Akquirierter DACH-Compliance-Spezialist",
        magnitude: mag,
        description:
          "M&A: neuer Key-Resource-Block via Akquisition eines DACH-Spezialisten.",
      },
    });
  }

  return candidates;
}

// ---------- self response generator ----------

function selfMoveCandidates(
  opponentDelta: TopologyDelta,
  own: OwnProfile,
): CandidateTarget[] {
  const ourTop = own.topology;
  const candidates: CandidateTarget[] = [];
  const tgt = opponentDelta.target;

  // 1. If they hit BMC_BLOCK kind X — we STRENGTHEN our own block of same kind
  if (tgt.kind === "BMC_BLOCK") {
    const ourBlock = ourTop.bmc.blocks.find((b) => b.kind === tgt.blockKind);
    if (ourBlock) {
      candidates.push({
        title: `Verteidigung unseres ${humanBlockKind(tgt.blockKind)}`,
        description: `Direkte Verteidigung des korrespondierenden BMC-Blocks.`,
        cost: 50,
        weight: 1.5,
        delta: {
          layer: "BMC",
          op: "STRENGTHEN",
          target: { kind: "BMC_BLOCK", blockKind: tgt.blockKind, blockId: ourBlock.id },
          magnitude: 60,
          description: `Verstärkt unseren ${humanBlockKind(tgt.blockKind)}-Block "${ourBlock.label}".`,
        },
      });
    }
    // Also: complementary — ADD new VPC items to shore up
    if (tgt.blockKind === "CUSTOMER_SEGMENTS" && ourTop.vpcs[0]) {
      candidates.push({
        title: "Vertical Lock-in Programm",
        description: "Tiefer in unsere existierende Vertikale rein.",
        cost: 40,
        weight: 1.2,
        delta: {
          layer: "VPC",
          op: "ADD",
          target: {
            kind: "VPC_ITEM",
            vpcId: ourTop.vpcs[0].id,
            side: "VALUE_MAP",
            itemKind: "gainCreators",
          },
          newLabel: "Branchen-spezifische Compliance-Vorlagen",
          magnitude: 65,
          description: "Neuer Gain-Creator zur Vertiefung der Kundenbindung.",
        },
      });
    }
  }

  // 2. If they hit CAPABILITY dimension D — we STRENGTHEN our capability in D
  if (tgt.kind === "CAPABILITY") {
    const ourCap = ourTop.capabilities.find(
      (c) => dimOfCap(c, ourTop) === tgt.dimension,
    );
    if (ourCap) {
      candidates.push({
        title: `Doppel-Down auf ${tgt.dimension}-Capability`,
        description: `Behält Asymmetrie auf der ${tgt.dimension}-Achse.`,
        cost: 55,
        weight: 1.4,
        delta: {
          layer: "CAPABILITIES",
          op: "STRENGTHEN",
          target: {
            kind: "CAPABILITY",
            dimension: tgt.dimension,
            capabilityId: ourCap.id,
            setId: ourCap.setId,
          },
          magnitude: 60,
          description: `Verstärkt unsere ${tgt.dimension}-Capability "${ourCap.label}".`,
        },
      });
    }
  }

  // 2b. If they ADD a CAPABILITY_SET — we respond by either ADDing an
  // equivalent set or strengthening our adjacent set.
  if (tgt.kind === "CAPABILITY_SET" && tgt.dimension) {
    const adjacent = ourTop.capabilitySets.find((s) => s.dimension === tgt.dimension);
    if (adjacent) {
      candidates.push({
        title: `Verteidigung "${adjacent.name}" gegen neue Capability-Area`,
        description: `Asymmetrische Verteidigung gegen neue ${tgt.dimension}-Domäne.`,
        cost: 50,
        weight: 1.2,
        delta: {
          layer: "CAPABILITIES",
          op: "STRENGTHEN",
          target: {
            kind: "CAPABILITY_SET",
            setId: adjacent.id,
            dimension: adjacent.dimension,
          },
          magnitude: 60,
          description: `Verstärkt unsere "${adjacent.name}"-Sphäre als Antwort.`,
        },
      });
    }
  }

  // 3. If they hit VPC — we ADD a counter VPC item
  if (tgt.kind === "VPC_ITEM" && ourTop.vpcs[0]) {
    candidates.push({
      title: "Counter-Differenzierung im VPC",
      description: "Neuer Differenzierungs-Hebel im umkämpften Segment.",
      cost: 45,
      weight: 1.3,
      delta: {
        layer: "VPC",
        op: "ADD",
        target: {
          kind: "VPC_ITEM",
          vpcId: ourTop.vpcs[0].id,
          side: "VALUE_MAP",
          itemKind: "painRelievers",
        },
        newLabel: "BaFin-Attest-Service auf Knopfdruck",
        magnitude: 70,
        description: "Neuer Pain-Reliever, der unseren regulatorischen Edge unterstreicht.",
      },
    });
  }

  // Generic always-available defensive moves
  candidates.push({
    title: "Retention-Pakete für Top-50-Accounts",
    description: "Schützt Bestandsumsatz vor Konkurrenz-Druck.",
    cost: 35,
    weight: 0.9,
    delta: {
      layer: "BMC",
      op: "STRENGTHEN",
      target: { kind: "BMC_BLOCK", blockKind: "CUSTOMER_RELATIONSHIPS" },
      magnitude: 55,
      description: "Verstärkt Customer-Relationships durch dedizierte Retention-Investments.",
    },
  });

  candidates.push({
    title: "Roadmap-Acceleration auf Differenzierungs-Capability",
    description: "Beschleunigt unsere asymmetrische Stärke.",
    cost: 50,
    weight: 1.0,
    delta: {
      layer: "CAPABILITIES",
      op: "STRENGTHEN",
      target: { kind: "CAPABILITY", dimension: "TECH" },
      magnitude: 55,
      description: "Beschleunigung der TECH-Roadmap auf der differenzierenden Capability.",
    },
  });

  return candidates;
}

// ---------- threat computation from deltas ----------

/**
 * Compute opponent-move threat (0..100) from the delta(s) against OUR topology.
 * Rules (per spec):
 *   - delta on a BMC block kind WE also have:                            mag * 0.4
 *   - delta on a VPC item where the parent segment is shared with us:    mag * 0.6
 *   - delta on a capability dimension where our level is LOW + importance HIGH: mag * 0.5
 *
 * Plus v0.3F additions for the capability-set layer:
 *   - opponent ADDs a CapabilitySet whose name we DO NOT have AND its
 *     dimension is one where our top capability importance ≥ 70:        mag * 0.7
 *   - both sides hold a same-name set BOTH at EMERGING lifecycle AND
 *     opponent STRENGTHENs theirs:                                       mag * 0.5
 *   - opponent STRENGTHENs a same-name set where ours is DECLINING/
 *     OBSOLETE (quiet-investment threat):                                mag * 0.2
 */
function threatFromDeltas(
  deltas: TopologyDelta[],
  own: OwnProfile,
  opponentTop?: StrategicTopology,
): number {
  const ourTop = own.topology;
  let t = 0;
  for (const d of deltas) {
    const mag = clamp(d.magnitude, 0, 100);
    const tgt = d.target;

    if (tgt.kind === "BMC_BLOCK") {
      const haveSameKind = ourTop.bmc.blocks.some((b) => b.kind === tgt.blockKind);
      if (haveSameKind) t += mag * 0.4;
    }

    if (tgt.kind === "VPC_ITEM") {
      // VPC items: hot if we share that customer segment.
      t += mag * 0.6;
    }

    if (tgt.kind === "CAPABILITY") {
      // Asymmetric attack on our weak spot?
      const ourCaps = ourTop.capabilities.filter(
        (c) => dimOfCap(c, ourTop) === tgt.dimension,
      );
      const avgLevel =
        ourCaps.length === 0
          ? 30
          : ourCaps.reduce((s, c) => s + c.level, 0) / ourCaps.length;
      const maxImp =
        ourCaps.length === 0
          ? 50
          : Math.max(...ourCaps.map((c) => c.importance));
      if (avgLevel < 65 && maxImp >= 65) t += mag * 0.5;
      else t += mag * 0.25;
    }

    if (tgt.kind === "CAPABILITY_SET") {
      // We need to look up the opponent's set name from the move's newLabel
      // (for ADD) or from opponentTop via setId (for STRENGTHEN).
      const oppSet = tgt.setId
        ? opponentTop?.capabilitySets.find((s) => s.id === tgt.setId)
        : undefined;
      const name = d.newLabel ?? oppSet?.name ?? "";
      const dim = tgt.dimension ?? oppSet?.dimension;
      const sameName = name
        ? ourTop.capabilitySets.find(
            (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
          )
        : undefined;

      if (d.op === "ADD") {
        if (!sameName && dim) {
          // Asymmetric: new domain we don't hold
          const ourDimCaps = ourTop.capabilities.filter(
            (c) => dimOfCap(c, ourTop) === dim,
          );
          const topImp =
            ourDimCaps.length === 0
              ? 0
              : Math.max(...ourDimCaps.map((c) => c.importance));
          if (topImp >= 70) {
            t += mag * 0.7;
          } else {
            t += mag * 0.35;
          }
        } else {
          t += mag * 0.3;
        }
      } else if (d.op === "STRENGTHEN") {
        // Race condition? both EMERGING?
        if (
          sameName &&
          oppSet &&
          oppSet.lifecycle === "EMERGING" &&
          sameName.lifecycle === "EMERGING"
        ) {
          t += mag * 0.5;
        } else if (
          sameName &&
          (sameName.lifecycle === "DECLINING" || sameName.lifecycle === "OBSOLETE")
        ) {
          // Quiet investment in an area we're abandoning
          t += mag * 0.2;
        } else {
          t += mag * 0.25;
        }
      }
    }
  }
  return Math.round(clamp(t, 0, 100));
}

// ---------- helpers ----------

const POSTURE_WEIGHTS: Record<Posture, Partial<Record<MoveCategory, number>>> = {
  AGGRESSIVE:    { PRICING: 1.5, "M&A": 1.4, BRAND: 1.2, GEO: 1.3, TALENT: 1.1, PRODUCT: 1.1, CHANNEL: 1.0, REGULATORY: 0.7, CAPITAL: 1.0, PARTNERSHIP: 0.9 },
  EXPANSIVE:     { GEO: 1.6, PARTNERSHIP: 1.4, CHANNEL: 1.3, "M&A": 1.2, PRODUCT: 1.1, BRAND: 1.0, TALENT: 1.0, PRICING: 0.9, CAPITAL: 1.1, REGULATORY: 0.8 },
  DEFENSIVE:     { REGULATORY: 1.5, BRAND: 1.3, TALENT: 1.2, PRODUCT: 1.1, CAPITAL: 1.2, CHANNEL: 1.0, PARTNERSHIP: 1.0, PRICING: 0.8, GEO: 0.7, "M&A": 0.8 },
  OPPORTUNISTIC: { "M&A": 1.5, CAPITAL: 1.4, PARTNERSHIP: 1.3, TALENT: 1.2, PRODUCT: 1.0, PRICING: 1.1, BRAND: 1.0, GEO: 1.1, CHANNEL: 1.0, REGULATORY: 0.9 },
  CONSERVATIVE:  { CAPITAL: 1.4, PRODUCT: 1.2, REGULATORY: 1.2, BRAND: 1.1, CHANNEL: 1.0, TALENT: 1.0, PARTNERSHIP: 1.0, PRICING: 0.8, GEO: 0.7, "M&A": 0.6 },
};

function catFromBlock(kind: BMCBlockKind, _op: string): MoveCategory {
  switch (kind) {
    case "CUSTOMER_SEGMENTS": return "GEO";
    case "VALUE_PROPOSITIONS": return "PRODUCT";
    case "CHANNELS": return "CHANNEL";
    case "CUSTOMER_RELATIONSHIPS": return "BRAND";
    case "REVENUE_STREAMS": return "PRICING";
    case "KEY_RESOURCES": return "M&A";
    case "KEY_ACTIVITIES": return "PRODUCT";
    case "KEY_PARTNERS": return "PARTNERSHIP";
    case "COST_STRUCTURE": return "CAPITAL";
  }
}

function catFromCapability(dim: CapabilityDimension, _op: string): MoveCategory {
  switch (dim) {
    case "PEOPLE": return "TALENT";
    case "TECH": return "PRODUCT";
    case "ORG": return "CAPITAL";
    case "PROCESSES": return "REGULATORY";
  }
}

function humanBlockKind(k: BMCBlockKind): string {
  return k.replace(/_/g, " ").toLowerCase();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function effectiveCompetitor(c: CompetitorProfile, s?: Scenario): CompetitorProfile {
  if (!s?.modifiers) return c;
  return { ...c, ...s.modifiers };
}

// ---------- tree generation ----------

export function simulate(
  competitor: CompetitorProfile,
  own: OwnProfile,
  scenarios: Scenario[],
  opts?: { seed?: string; aiPattern?: AIPatternId },
): Simulation {
  const seedStr = opts?.seed ?? `${competitor.name}|${own.name}|${own.openingMove}|${own.horizonRounds}|${own.branchingFactor}`;
  const rand = rng(hashString(seedStr));
  // PRNG-handle reserved for future use (probabilistic shaping outside the
  // scenario seed). Currently each scenario builds its own deterministic
  // sub-stream from the seed string + scenario id.
  void rand;

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
      deltas: [],
      counters: [],
      children: [],
    };
    nodes[rootId] = rootMove;
    rootIds.push(rootId);

    const growFrontier = (frontier: string[], round: number) => {
      const next: string[] = [];
      for (const parentId of frontier) {
        const parent = nodes[parentId];
        const actor: "OPPONENT" | "SELF" =
          parent.actor === "SELF" ? "OPPONENT" : "SELF";

        const branchAtRound = Math.max(
          1,
          Math.round(
            own.branchingFactor *
              (1 - (round - 1) / Math.max(1, own.horizonRounds * 1.6)),
          ),
        );

        // Pool of plans for this actor
        let pool: CandidateTarget[];
        if (actor === "OPPONENT") {
          pool = opponentMoveCandidates(competitor, own, scen);
        } else {
          // SELF: respond to the PARENT's (opponent) delta.
          const oppDelta = parent.deltas[0];
          if (oppDelta) {
            pool = selfMoveCandidates(oppDelta, own);
          } else {
            pool = selfMoveCandidates(
              {
                layer: "BMC",
                op: "STRENGTHEN",
                target: { kind: "BMC_BLOCK", blockKind: "VALUE_PROPOSITIONS" },
                magnitude: 50,
                description: "fallback",
              },
              own,
            );
          }
        }

        // Sample without replacement (by title) up to branchAtRound
        const used = new Set<string>();
        const chosen: CandidateTarget[] = [];
        const rawProbs: number[] = [];
        for (let b = 0; b < branchAtRound; b++) {
          const available = pool.filter((p) => !used.has(p.title));
          if (available.length === 0) break;
          const pick = pickWeighted(
            available.map((p) => ({ value: p, weight: p.weight })),
            r(),
          );
          used.add(pick.title);
          chosen.push(pick);
          rawProbs.push(Math.max(0.05, pick.weight));
        }

        const total = rawProbs.reduce((s, v) => s + v, 0) || 1;
        chosen.forEach((pl, idx) => {
          const prob = rawProbs[idx] / total;
          const id = nextId();
          const deltas: TopologyDelta[] = [pl.delta];
          const category = deriveCategoryFromDeltas(deltas);
          const effComp = effectiveCompetitor(competitor, scen);
          // Phase 5X: intent first, then adjudicate to a realized threat.
          const intentThreat =
            actor === "OPPONENT"
              ? threatFromDeltas(deltas, own, effComp.topology)
              : 0;
          // SELF threat = how much we reduce parent opponent-threat — we model
          // this as (100 - parent.threat) per spec.
          const selfThreat =
            actor === "SELF" ? Math.max(0, 100 - parent.threat) : 0;

          let adjudication;
          let realizedThreat = intentThreat;
          if (actor === "OPPONENT") {
            adjudication = adjudicate(
              {
                deltas,
                intentThreat,
                category,
                cost: pl.cost,
              },
              effComp,
              own.topology,
              { round, aiPattern: opts?.aiPattern },
            );
            realizedThreat = adjudication.realizedThreat;
          }

          const node: MoveNode = {
            id,
            parentId,
            round,
            actor,
            category,
            title: pl.title,
            rationale:
              actor === "OPPONENT"
                ? `${POSTURE_RATIONALE[effComp.posture]} ${pl.description}`
                : `Antwortzug. ${pl.description}`,
            probability: prob,
            cumulativeProbability: parent.cumulativeProbability * prob,
            threat: actor === "OPPONENT" ? realizedThreat : selfThreat,
            intentThreat: actor === "OPPONENT" ? intentThreat : undefined,
            adjudication: actor === "OPPONENT" ? adjudication : undefined,
            cost: pl.cost,
            deltas,
            counters:
              actor === "OPPONENT" ? COUNTER_LIBRARY[category].slice(0, 3) : [],
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
