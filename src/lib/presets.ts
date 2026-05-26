// WFC — default seeded topologies, profiles, and scenarios.
//
// v0.3F: capabilities are organised into CapabilitySets. Each set carries
// dimension + lifecycle + era + source, opening up the model so that new
// capability sets emerge over time (by user, standard library, or signal
// from world events). Set names that collide across both sides are the
// engine's signal for an EMERGING-CAPABILITY race.

import type {
  CompetitorProfile,
  OwnProfile,
  Scenario,
  StrategicTopology,
} from "./types";

// ---------- Shared identifiers (stable IDs across both topologies for the
// SAME customer segment let overlap math work on object identity, not only
// on label matching). ----------

const SHARED_SEGMENT_ID = "cs-shared-fin-mid";

// ---------- WFC CORP (us) — vertical-stack DACH compliance SaaS ----------

const WFC_TOPOLOGY: StrategicTopology = {
  capabilitySets: [
    {
      id: "cs-regulatory-tradecraft-wfc",
      name: "Regulatory Tradecraft",
      dimension: "PEOPLE",
      era: 2012,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "BaFin/EBA-Tiefe als persönliche Diziplin — Regulatory-Affairs als Handwerk.",
    },
    {
      id: "cs-vertical-sales-dach-wfc",
      name: "Vertical Sales Force DACH",
      dimension: "PEOPLE",
      era: 2015,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "Branchen-spezialisierte Account-Executive-Force im deutschsprachigen Raum.",
    },
    {
      id: "cs-eu-data-eng-wfc",
      name: "EU Data Engineering",
      dimension: "TECH",
      era: 2018,
      lifecycle: "GROWING",
      source: "STANDARD",
      description:
        "Schrems-II-konforme Datenplattform-Engineering — Residenz, Schlüsselverwaltung, Audit-Trail.",
    },
    {
      id: "cs-ai-native-ops-wfc",
      name: "AI-Native Operations",
      dimension: "TECH",
      era: 2024,
      lifecycle: "EMERGING",
      source: "STANDARD",
      description:
        "Aufbau einer KI-nativen Betriebs-Schicht (Agents, Inference, Eval) — Battleground.",
    },
    {
      id: "cs-vertical-org-wfc",
      name: "Vertical Org Model",
      dimension: "ORG",
      era: 2015,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "Founder-led, branchenvertikal organisierte Squads (Sales × Eng × Reg).",
    },
    {
      id: "cs-audit-release-eng-wfc",
      name: "Audit-Grade Release Engineering",
      dimension: "PROCESSES",
      era: 2014,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "SOC2 + ISO 27001 + BaFin-Attest-fähige Release-Pipelines mit Reg-Change-Sprints.",
    },
  ],
  capabilities: [
    // Regulatory Tradecraft (PEOPLE)
    { id: "hc-p1", setId: "cs-regulatory-tradecraft-wfc", label: "EU-Compliance-Engineering-Team", level: 78, importance: 85 },
    { id: "hc-p3", setId: "cs-regulatory-tradecraft-wfc", label: "Regulatory-Affairs Officer (BaFin/EBA)", level: 70, importance: 80 },
    // Vertical Sales Force DACH (PEOPLE)
    { id: "hc-p2", setId: "cs-vertical-sales-dach-wfc", label: "DACH Enterprise Account Executives", level: 65, importance: 75 },
    // EU Data Engineering (TECH)
    { id: "hc-t1", setId: "cs-eu-data-eng-wfc", label: "EU-Datenresidenz-Stack (Frankfurt+Zürich)", level: 82, importance: 90 },
    { id: "hc-t2", setId: "cs-eu-data-eng-wfc", label: "Workflow-Engine mit Audit-Trail", level: 68, importance: 70 },
    // AI-Native Operations (TECH) — EMERGING battleground
    { id: "hc-t3", setId: "cs-ai-native-ops-wfc", label: "KI-Inferenz auf privater Infra", level: 55, importance: 75 },
    { id: "hc-t4", setId: "cs-ai-native-ops-wfc", label: "Agent-Operations-Layer (intern, Pilot)", level: 35, importance: 80 },
    // Vertical Org Model (ORG)
    { id: "hc-o1", setId: "cs-vertical-org-wfc", label: "Flache, founder-led Org", level: 72, importance: 60 },
    { id: "hc-o2", setId: "cs-vertical-org-wfc", label: "Verzahnte Sales/Engineering-Squads", level: 64, importance: 65 },
    // Audit-Grade Release Engineering (PROCESSES)
    { id: "hc-pr1", setId: "cs-audit-release-eng-wfc", label: "SOC2 Type-II + ISO 27001 Audits", level: 80, importance: 85 },
    { id: "hc-pr2", setId: "cs-audit-release-eng-wfc", label: "Quartalsweise Reg-Change-Sprints", level: 70, importance: 70 },
  ],
  bmc: {
    blocks: [
      // CUSTOMER_SEGMENTS — note the SHARED ID for the contested segment
      { id: SHARED_SEGMENT_ID, kind: "CUSTOMER_SEGMENTS", label: "Regulated Finance Mid-Market", strength: 72,
        description: "DACH-Banken, Versicherer, Asset Manager mit 200–2000 MA, BaFin-reguliert." },
      { id: "hc-cs2", kind: "CUSTOMER_SEGMENTS", label: "Public Sector / Behörden DACH", strength: 55,
        description: "Bund/Länder, kommunale IT, vorrangig EU-Datenresidenz-Mandate." },

      // VALUE_PROPOSITIONS
      { id: "hc-vp1", kind: "VALUE_PROPOSITIONS", label: "Compliance-out-of-the-box für DACH-Finanz", strength: 80 },
      { id: "hc-vp2", kind: "VALUE_PROPOSITIONS", label: "Vertikal-Suite statt Generalist-Tooling", strength: 70 },
      { id: "hc-vp3", kind: "VALUE_PROPOSITIONS", label: "EU-only Datenresidenz mit BaFin-Attest", strength: 75 },

      // CHANNELS
      { id: "hc-ch1", kind: "CHANNELS", label: "Direct Sales mit Branchen-AE", strength: 65 },
      { id: "hc-ch2", kind: "CHANNELS", label: "Big-4-Consulting-Implementierungspartner", strength: 55 },

      // CUSTOMER_RELATIONSHIPS
      { id: "hc-cr1", kind: "CUSTOMER_RELATIONSHIPS", label: "Dedizierter CSM + Reg-Change-Briefings", strength: 70 },
      { id: "hc-cr2", kind: "CUSTOMER_RELATIONSHIPS", label: "Quartalsweises Customer Advisory Board", strength: 60 },

      // REVENUE_STREAMS
      { id: "hc-rs1", kind: "REVENUE_STREAMS", label: "Mehrjahres-SaaS-Abos mit Stufenpreis", strength: 75 },
      { id: "hc-rs2", kind: "REVENUE_STREAMS", label: "Professional-Services für Onboarding", strength: 50 },

      // KEY_RESOURCES
      { id: "hc-kr1", kind: "KEY_RESOURCES", label: "EU-Datenresidenz-Cluster (FRA+ZRH)", strength: 85 },
      { id: "hc-kr2", kind: "KEY_RESOURCES", label: "Regulatory-Affairs-Expertenteam", strength: 75 },
      { id: "hc-kr3", kind: "KEY_RESOURCES", label: "Vertikales Datenmodell DACH-Finanz", strength: 65 },

      // KEY_ACTIVITIES
      { id: "hc-ka1", kind: "KEY_ACTIVITIES", label: "Continuous Compliance Monitoring", strength: 70 },
      { id: "hc-ka2", kind: "KEY_ACTIVITIES", label: "Reg-Change-Übersetzung in Workflow-Logik", strength: 75 },

      // KEY_PARTNERS
      { id: "hc-kp1", kind: "KEY_PARTNERS", label: "Branchenverbände (Bitkom, DK)", strength: 55 },
      { id: "hc-kp2", kind: "KEY_PARTNERS", label: "EU-Cloud-Provider (OVH, Open Telekom)", strength: 60 },

      // COST_STRUCTURE
      { id: "hc-co1", kind: "COST_STRUCTURE", label: "EU-Infra-Overhead (höher als US-Wettbewerber)", strength: 40 },
      { id: "hc-co2", kind: "COST_STRUCTURE", label: "Compliance-Officer-Payroll", strength: 50 },
    ],
  },
  vpcs: [
    {
      id: "vpc-hc-1",
      customerSegmentBlockId: SHARED_SEGMENT_ID,
      customerProfile: {
        jobs: [
          { id: "j1", label: "BaFin-konforme Prozesse betreiben", weight: 90 },
          { id: "j2", label: "Audit-Trail jederzeit reproduzieren", weight: 80 },
          { id: "j3", label: "Reg-Changes ohne Custom-Code abbilden", weight: 75 },
        ],
        pains: [
          { id: "p1", label: "US-Cloud-Risiko nach DSGVO/Schrems", weight: 85 },
          { id: "p2", label: "Manuelle Compliance-Reports", weight: 70 },
          { id: "p3", label: "Generalist-Tools brauchen Custom-Integration", weight: 75 },
        ],
        gains: [
          { id: "g1", label: "Schneller Audit-Pass", weight: 80 },
          { id: "g2", label: "Reduzierter Reg-Officer-Workload", weight: 70 },
          { id: "g3", label: "Vorhersehbare TCO", weight: 65 },
        ],
      },
      valueMap: {
        productsServices: [
          { id: "ps1", label: "Vertikal-Compliance-Suite DACH-Finanz", weight: 85 },
          { id: "ps2", label: "Audit-Trail-Engine mit Reg-Mapping", weight: 75 },
          { id: "ps3", label: "BaFin-Attest-Service", weight: 70 },
        ],
        painRelievers: [
          { id: "pr1", label: "EU-Datenresidenz mit Schrems-II-Compliance", weight: 90 },
          { id: "pr2", label: "Automatisierte Reg-Reports", weight: 75 },
          { id: "pr3", label: "Out-of-the-box Vertikal-Integrationen", weight: 70 },
        ],
        gainCreators: [
          { id: "gc1", label: "Audit-Ready Dashboards 24/7", weight: 80 },
          { id: "gc2", label: "Reg-Officer-Effizienz +40%", weight: 75 },
          { id: "gc3", label: "Festpreis-Compliance-Subscription", weight: 65 },
        ],
      },
    },
    {
      id: "vpc-hc-2",
      customerSegmentBlockId: "hc-cs2",
      customerProfile: {
        jobs: [
          { id: "j1", label: "EU-Datenresidenz nachweisen", weight: 95 },
          { id: "j2", label: "Vergaberecht-konforme Beschaffung", weight: 75 },
        ],
        pains: [
          { id: "p1", label: "Hyperscaler-Lock-In politisch sensibel", weight: 90 },
          { id: "p2", label: "Lange Vergabezyklen", weight: 60 },
        ],
        gains: [
          { id: "g1", label: "Souveränitäts-Narrativ unterstützen", weight: 80 },
          { id: "g2", label: "Plan-/Haushaltskonforme Lizenzierung", weight: 65 },
        ],
      },
      valueMap: {
        productsServices: [
          { id: "ps1", label: "Souveräne EU-Plattform", weight: 90 },
          { id: "ps2", label: "BSI-Grundschutz-Profil", weight: 70 },
        ],
        painRelievers: [
          { id: "pr1", label: "Komplett EU-betriebener Stack", weight: 95 },
          { id: "pr2", label: "Vergabe-konforme Rahmenverträge", weight: 65 },
        ],
        gainCreators: [
          { id: "gc1", label: "Digitale Souveränität-Storyline", weight: 80 },
          { id: "gc2", label: "Haushaltsklare Abos", weight: 60 },
        ],
      },
    },
  ],
};

// ---------- MERIDIAN INDUSTRIES (them) — well-funded enterprise compliance incumbent ----------

const MERIDIAN_TOPOLOGY: StrategicTopology = {
  capabilitySets: [
    {
      id: "cs-enterprise-gtm-meridian",
      name: "Enterprise GTM",
      dimension: "PEOPLE",
      era: 2008,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "Tier-1-Banking-AE-Bench mit jahrzehntelanger Enterprise-Sales-Maschine.",
    },
    {
      id: "cs-mna-integration-meridian",
      name: "M&A Integration",
      dimension: "PEOPLE",
      era: 2012,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "Corp-Dev + Integration-Org als wiederholbares Playbook.",
    },
    {
      id: "cs-hyperscaler-native-meridian",
      name: "Hyperscaler Native",
      dimension: "TECH",
      era: 2018,
      lifecycle: "GROWING",
      source: "STANDARD",
      description:
        "Tief integriert in AWS + Azure — Marketplace, Co-Sell, Multi-Region.",
    },
    {
      id: "cs-ai-native-ops-meridian",
      name: "AI-Native Operations",
      dimension: "TECH",
      era: 2024,
      lifecycle: "EMERGING",
      source: "STANDARD",
      description:
        "Eigene Workflow-KI-Modelle + Agent-Layer im Aufbau — kollidiert direkt mit WFC-Battleground.",
    },
    {
      id: "cs-matrix-geo-meridian",
      name: "Matrix Geography",
      dimension: "ORG",
      era: 2005,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "Globale Matrix-Org mit regionalen P&Ls und globalen Funktionen.",
    },
    {
      id: "cs-lobbying-meridian",
      name: "Lobbying-as-Discipline",
      dimension: "PROCESSES",
      era: 2010,
      lifecycle: "MATURE",
      source: "STANDARD",
      description:
        "Industrieller Lobby-Apparat in Washington + Brüssel.",
    },
  ],
  capabilities: [
    // Enterprise GTM (PEOPLE)
    { id: "me-p1", setId: "cs-enterprise-gtm-meridian", label: "Global Tier-1-Banking-AE-Bench", level: 88, importance: 85 },
    { id: "me-p3", setId: "cs-enterprise-gtm-meridian", label: "EU-Compliance-Specialists", level: 55, importance: 80 },
    // M&A Integration (PEOPLE)
    { id: "me-p4", setId: "cs-mna-integration-meridian", label: "Corp-Dev / M&A-Integration-Team", level: 82, importance: 80 },
    // Hyperscaler Native (TECH)
    { id: "me-t2", setId: "cs-hyperscaler-native-meridian", label: "Multi-Cloud (AWS + Azure)", level: 78, importance: 70 },
    { id: "me-t3", setId: "cs-hyperscaler-native-meridian", label: "EU-Datenresidenz-Optionalität", level: 50, importance: 80 },
    // AI-Native Operations (TECH) — EMERGING, same name as WFC's set
    { id: "me-t1", setId: "cs-ai-native-ops-meridian", label: "Workflow-KI-Plattform (proprietär)", level: 85, importance: 85 },
    { id: "me-p2", setId: "cs-ai-native-ops-meridian", label: "AI/ML Research Org (London/SF)", level: 80, importance: 75 },
    // Matrix Geography (ORG)
    { id: "me-o1", setId: "cs-matrix-geo-meridian", label: "M&A-Maschine mit Corp-Dev-Team", level: 82, importance: 75 },
    { id: "me-o2", setId: "cs-matrix-geo-meridian", label: "Globale Matrix-Org", level: 70, importance: 60 },
    // Lobbying-as-Discipline (PROCESSES)
    { id: "me-pr1", setId: "cs-lobbying-meridian", label: "Enterprise-Procurement-Playbook", level: 85, importance: 75 },
    { id: "me-pr2", setId: "cs-lobbying-meridian", label: "EU-Reg-Change-Pipeline", level: 50, importance: 80 },
    { id: "me-pr3", setId: "cs-lobbying-meridian", label: "Brüssel + Washington Lobby-Apparat", level: 78, importance: 70 },
  ],
  bmc: {
    blocks: [
      // CUSTOMER_SEGMENTS — uses the SAME shared ID for the overlap
      { id: SHARED_SEGMENT_ID, kind: "CUSTOMER_SEGMENTS", label: "Regulated Finance Mid-Market", strength: 60,
        description: "Sekundäres Wachstumssegment für Meridian, Hauptzielgebiet für WFC." },
      { id: "me-cs2", kind: "CUSTOMER_SEGMENTS", label: "Global Enterprise (Fortune 500)", strength: 85 },
      { id: "me-cs3", kind: "CUSTOMER_SEGMENTS", label: "Tier-1 Banks (Bulge-Bracket)", strength: 80 },

      // VALUE_PROPOSITIONS
      { id: "me-vp1", kind: "VALUE_PROPOSITIONS", label: "End-to-End Enterprise Compliance Platform", strength: 82 },
      { id: "me-vp2", kind: "VALUE_PROPOSITIONS", label: "KI-gestützte Workflow-Automation", strength: 78 },
      { id: "me-vp3", kind: "VALUE_PROPOSITIONS", label: "Globale Skalierung in 40+ Jurisdiktionen", strength: 80 },

      // CHANNELS
      { id: "me-ch1", kind: "CHANNELS", label: "Field-Sales Direct mit Vertical-Spezialisten", strength: 80 },
      { id: "me-ch2", kind: "CHANNELS", label: "Hyperscaler-Marketplace-Co-Sell (AWS/Azure)", strength: 75 },
      { id: "me-ch3", kind: "CHANNELS", label: "SI-Partnerschaften (Accenture, Deloitte)", strength: 70 },

      // CUSTOMER_RELATIONSHIPS
      { id: "me-cr1", kind: "CUSTOMER_RELATIONSHIPS", label: "Strategic Account Management", strength: 80 },
      { id: "me-cr2", kind: "CUSTOMER_RELATIONSHIPS", label: "Executive Sponsorship-Programm", strength: 70 },

      // REVENUE_STREAMS
      { id: "me-rs1", kind: "REVENUE_STREAMS", label: "Multi-Year-Enterprise-Verträge", strength: 80 },
      { id: "me-rs2", kind: "REVENUE_STREAMS", label: "Professional-Services + System-Integration", strength: 70 },
      { id: "me-rs3", kind: "REVENUE_STREAMS", label: "Usage-Based AI-Inferenz", strength: 60 },

      // KEY_RESOURCES
      { id: "me-kr1", kind: "KEY_RESOURCES", label: "Globale Cloud-Infra (40+ Regionen)", strength: 80 },
      { id: "me-kr2", kind: "KEY_RESOURCES", label: "Proprietäre Workflow-KI-Modelle", strength: 85 },
      { id: "me-kr3", kind: "KEY_RESOURCES", label: "Kriegskasse $1.2B nach Series-F", strength: 90 },

      // KEY_ACTIVITIES
      { id: "me-ka1", kind: "KEY_ACTIVITIES", label: "Strategische M&A / Tuck-ins", strength: 80 },
      { id: "me-ka2", kind: "KEY_ACTIVITIES", label: "Enterprise-Vertrieb / RFP-Maschine", strength: 80 },

      // KEY_PARTNERS
      { id: "me-kp1", kind: "KEY_PARTNERS", label: "Hyperscaler (AWS, Azure, GCP)", strength: 80 },
      { id: "me-kp2", kind: "KEY_PARTNERS", label: "Big-4-Consultancies", strength: 75 },
      { id: "me-kp3", kind: "KEY_PARTNERS", label: "Investment Bank Advisors (M&A)", strength: 70 },

      // COST_STRUCTURE
      { id: "me-co1", kind: "COST_STRUCTURE", label: "Globale R&D-Last (~600 Engineers)", strength: 55 },
      { id: "me-co2", kind: "COST_STRUCTURE", label: "Enterprise-Sales-Org-Cost", strength: 60 },
    ],
  },
  vpcs: [
    {
      id: "vpc-me-1",
      customerSegmentBlockId: SHARED_SEGMENT_ID,
      customerProfile: {
        jobs: [
          { id: "j1", label: "Compliance über mehrere Jurisdiktionen orchestrieren", weight: 85 },
          { id: "j2", label: "Workflow-Automation mit AI-Augmentation", weight: 80 },
          { id: "j3", label: "BaFin-konforme Prozesse betreiben", weight: 75 },
        ],
        pains: [
          { id: "p1", label: "Fragmentierte Best-of-Breed-Tools", weight: 80 },
          { id: "p2", label: "Lange Implementierungszyklen", weight: 65 },
          { id: "p3", label: "EU-Datenresidenz schwer aus US-Stack", weight: 70 },
        ],
        gains: [
          { id: "g1", label: "Single-vendor Compliance-Backbone", weight: 80 },
          { id: "g2", label: "AI-getriebene Effizienz", weight: 75 },
          { id: "g3", label: "Schneller Audit-Pass", weight: 70 },
        ],
      },
      valueMap: {
        productsServices: [
          { id: "ps1", label: "End-to-End Compliance Platform", weight: 80 },
          { id: "ps2", label: "AI Workflow Automation Suite", weight: 80 },
        ],
        painRelievers: [
          { id: "pr1", label: "Konsolidierung in Single Vendor", weight: 75 },
          { id: "pr2", label: "EU-Region-Optionalität (im Aufbau)", weight: 50 },
        ],
        gainCreators: [
          { id: "gc1", label: "Cross-jurisdictional Reporting", weight: 80 },
          { id: "gc2", label: "AI-Assisted Audit Prep", weight: 75 },
        ],
      },
    },
    {
      id: "vpc-me-2",
      customerSegmentBlockId: "me-cs3",
      customerProfile: {
        jobs: [
          { id: "j1", label: "Globale Tier-1-Bank-Compliance betreiben", weight: 95 },
          { id: "j2", label: "Investment-Banking-Workflows automatisieren", weight: 80 },
        ],
        pains: [
          { id: "p1", label: "Multi-Jurisdiktions-Komplexität", weight: 90 },
          { id: "p2", label: "Hohe Wechselkosten von Legacy-Stacks", weight: 70 },
        ],
        gains: [
          { id: "g1", label: "Enterprise-Grade SLAs", weight: 85 },
          { id: "g2", label: "AI-Augmentation für KYC/AML", weight: 80 },
        ],
      },
      valueMap: {
        productsServices: [
          { id: "ps1", label: "Tier-1-Banking-Compliance-Stack", weight: 90 },
          { id: "ps2", label: "KYC/AML-AI-Suite", weight: 80 },
        ],
        painRelievers: [
          { id: "pr1", label: "40+ Jurisdiction Coverage", weight: 90 },
          { id: "pr2", label: "Dedicated Migration Services", weight: 75 },
        ],
        gainCreators: [
          { id: "gc1", label: "Enterprise SLA + 24/7 Support", weight: 85 },
          { id: "gc2", label: "AI-Augmented Investigators", weight: 80 },
        ],
      },
    },
  ],
};

// ---------- Public exports ----------

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
    "12 Senior Hires aus DACH-Vertikalsegment",
    "Patentanmeldung im Bereich Workflow-KI",
    "EU-Lobbying-Aktivität gestiegen",
  ],
  topology: MERIDIAN_TOPOLOGY,
};

export const DEFAULT_OWN: OwnProfile = {
  name: "WFC CORP",
  intent:
    "Marktführerschaft im DACH-Enterprise-Segment innerhalb von 18 Monaten durch differenzierte Vertikal-Stack-Strategie.",
  diagnosis:
    "Ein global skalierter US-Incumbent (MERIDIAN) versucht, das DACH-Finanz-Mid-Market-Segment als sekundäres Wachstumsfeld zu erschließen, hat aber strukturelle Lücken in EU-Datenresidenz und Reg-Change-Geschwindigkeit. Unser Vorteil ist asymmetrisch und zeitlich begrenzt.",
  guidingPolicy:
    "Vertikale Tiefe statt horizontaler Breite. Wir verteidigen den Schrems-II-Moat, monetarisieren BaFin-Tiefe und ziehen Reg-Changes als kontinuierliches Differenzierungsmerkmal nach vorne. Wir vermeiden Frontal-Konkurrenz auf AI-Generalist-Funktionen.",
  openingMove:
    "Launch Vertikal-Suite für regulierte Finanzkunden mit EU-Datenresidenz und BaFin-Attest",
  horizonRounds: 4,
  branchingFactor: 3,
  topology: WFC_TOPOLOGY,
};

// ---------- Empty / wizard-friendly templates ----------
//
// EMPTY_OWN — a minimally-seeded OwnProfile that the wizard fills as the user
// types. Topology is empty so the user starts from a blank canvas.
// EMPTY_COMPETITOR — same idea: a generic competitor with placeholder posture
// and an empty topology. Used by the Express path when the user only types
// name + industry.

const EMPTY_TOPOLOGY: StrategicTopology = {
  capabilitySets: [],
  capabilities: [],
  bmc: { blocks: [] },
  vpcs: [],
};

export const EMPTY_OWN: OwnProfile = {
  name: "OUR COMPANY",
  intent: "",
  diagnosis: "",
  guidingPolicy: "",
  openingMove: "",
  horizonRounds: 4,
  branchingFactor: 3,
  topology: EMPTY_TOPOLOGY,
};

export const EMPTY_COMPETITOR: CompetitorProfile = {
  name: "COMPETITOR",
  industry: "",
  marketShare: 0.2,
  warChest: 60,
  innovationIndex: 55,
  brandPower: 55,
  posture: "OPPORTUNISTIC",
  leadershipBias: 0,
  recentSignals: [],
  topology: EMPTY_TOPOLOGY,
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
