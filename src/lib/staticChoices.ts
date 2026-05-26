// HELM — static choice library (Phase 6).
//
// Hand-curated option lists per questionId. Used by ChoiceGenerator as the
// no-API-key fallback path. Each entry mirrors the ChoiceOption shape used
// by the /api/options endpoint, so the wizard can transparently swap
// LLM-generated suggestions for these defaults without any UI changes.
//
// Where a questionId is industry-aware, we look up `context.industry` and
// return a matching subset; otherwise we return a generic list.

export interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  payload: Record<string, unknown>;
}

// ---------- Helpers --------------------------------------------------------

function opt(
  id: string,
  label: string,
  description?: string,
  payload: Record<string, unknown> = {},
  meta?: string,
): ChoiceOption {
  return { id, label, description, meta, payload: { ...payload, label } };
}

// Normalise an industry hint into one of our canonical keys.
function indKey(input: unknown): string {
  const s = String(input ?? "").toLowerCase();
  if (s.includes("saas") || s.includes("software")) return "saas";
  if (s.includes("fintech") || s.includes("finance") || s.includes("bank"))
    return "fintech";
  if (s.includes("health") || s.includes("med") || s.includes("pharma"))
    return "healthcare";
  if (s.includes("manuf") || s.includes("industr")) return "manufacturing";
  if (s.includes("retail") || s.includes("ecom")) return "retail";
  if (s.includes("consult") || s.includes("advisory")) return "consulting";
  if (s.includes("legal") || s.includes("law")) return "legal";
  if (s.includes("media") || s.includes("publish")) return "media";
  if (s.includes("logist") || s.includes("supply")) return "logistics";
  if (s.includes("real estate") || s.includes("proptech")) return "realestate";
  if (s.includes("insur")) return "insurance";
  if (s.includes("educ") || s.includes("edtech")) return "education";
  if (s.includes("travel") || s.includes("hospital")) return "travel";
  if (s.includes("energy") || s.includes("util")) return "energy";
  return "generic";
}

// ---------- industry.pick --------------------------------------------------

const INDUSTRIES: ChoiceOption[] = [
  opt("ind-saas", "Enterprise SaaS", "Subscription software for businesses.", { key: "saas" }),
  opt("ind-fintech", "Fintech / Financial services", "Payments, lending, wealth, banking.", { key: "fintech" }),
  opt("ind-healthcare", "Healthcare / Life sciences", "Providers, payers, pharma, devices.", { key: "healthcare" }),
  opt("ind-manufacturing", "Manufacturing / Industrial", "Discrete or process manufacturing.", { key: "manufacturing" }),
  opt("ind-retail", "Retail / E-commerce", "Direct-to-consumer or marketplace.", { key: "retail" }),
  opt("ind-consulting", "Consulting / Professional services", "Strategy, advisory, integration.", { key: "consulting" }),
  opt("ind-legal", "Legal services", "Law firms, legal tech.", { key: "legal" }),
  opt("ind-media", "Media / Publishing", "Content, advertising, subscriptions.", { key: "media" }),
  opt("ind-logistics", "Logistics / Supply chain", "Freight, warehousing, last-mile.", { key: "logistics" }),
  opt("ind-realestate", "Real estate / PropTech", "Brokerage, listings, property ops.", { key: "realestate" }),
  opt("ind-insurance", "Insurance / Risk", "Underwriting, claims, brokerage.", { key: "insurance" }),
  opt("ind-education", "Education / EdTech", "K-12, higher-ed, corporate learning.", { key: "education" }),
  opt("ind-travel", "Travel / Hospitality", "OTAs, bookings, operations.", { key: "travel" }),
  opt("ind-energy", "Energy / Utilities", "Generation, distribution, retail.", { key: "energy" }),
  opt("ind-telco", "Telecom", "Carriers, MVNOs, infra.", { key: "telco" }),
  opt("ind-gov", "Public sector / GovTech", "Federal, state, municipal.", { key: "gov" }),
  opt("ind-defense", "Defense / Aerospace", "Primes, sub-system suppliers.", { key: "defense" }),
  opt("ind-construction", "Construction / Built environment", "GCs, developers, ConTech.", { key: "construction" }),
  opt("ind-agtech", "Agriculture / AgTech", "Farming, food supply, biotech.", { key: "agtech" }),
  opt("ind-marketing", "Marketing / AdTech", "Agencies, platforms, measurement.", { key: "marketing" }),
];

// ---------- competitor.pick (per industry) ---------------------------------

const COMPETITORS: Record<string, ChoiceOption[]> = {
  saas: [
    opt("cmp-saas-1", "Salesforce", "Mature horizontal CRM platform.", { posture: "DEFENSIVE", innovationIndex: 70 }, "MATURE"),
    opt("cmp-saas-2", "Microsoft", "Bundle leverage across the stack.", { posture: "EXPANSIVE", innovationIndex: 80 }, "MATURE"),
    opt("cmp-saas-3", "HubSpot", "SMB-friendly all-in-one.", { posture: "EXPANSIVE", innovationIndex: 70 }),
    opt("cmp-saas-4", "Notion", "Generalist productivity, AI-forward.", { posture: "AGGRESSIVE", innovationIndex: 85 }, "AI-NATIVE"),
    opt("cmp-saas-5", "Atlassian", "Dev-tooling incumbent.", { posture: "CONSERVATIVE", innovationIndex: 65 }, "MATURE"),
    opt("cmp-saas-6", "Linear", "Modern, design-led challenger.", { posture: "AGGRESSIVE", innovationIndex: 90 }, "AI-NATIVE"),
    opt("cmp-saas-7", "Asana / Monday", "Workflow-suite competitors.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-saas-8", "Well-funded AI-native upstart", "No legacy footprint, all-AI tooling.", { posture: "AGGRESSIVE", innovationIndex: 95 }, "AI-NATIVE"),
    opt("cmp-saas-9", "In-house build (build-vs-buy)", "The customer's own engineering team.", { posture: "DEFENSIVE" }),
    opt("cmp-saas-10", "Open-source self-hosted challenger", "Community-led, low-cost alternative.", { posture: "OPPORTUNISTIC" }),
  ],
  fintech: [
    opt("cmp-fin-1", "Stripe", "Developer-first payments platform.", { posture: "EXPANSIVE", innovationIndex: 90 }, "MATURE"),
    opt("cmp-fin-2", "Adyen", "Enterprise-grade omnichannel payments.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-fin-3", "JPMorgan Chase", "Bulge-bracket bank with deep tech investments.", { posture: "CONSERVATIVE" }, "MATURE"),
    opt("cmp-fin-4", "Revolut / N26", "Neobank with consumer-loyalty moat.", { posture: "AGGRESSIVE" }),
    opt("cmp-fin-5", "Plaid", "Open-banking data plumbing.", { posture: "EXPANSIVE" }),
    opt("cmp-fin-6", "Block / Square", "SMB + crypto + payroll bundle.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-fin-7", "AI-native underwriter", "ML-driven credit decisioning challenger.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-fin-8", "Wise / TransferWise", "Cross-border specialist.", { posture: "EXPANSIVE" }),
    opt("cmp-fin-9", "Well-funded AI-native upstart", "Yet-to-launch AI-first competitor.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-fin-10", "Regional bank coalition", "Consortium standardising on shared rails.", { posture: "DEFENSIVE" }),
  ],
  healthcare: [
    opt("cmp-hc-1", "Epic", "EHR fortress, deep clinical workflows.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-hc-2", "Cerner / Oracle Health", "Hospital IT incumbent.", { posture: "CONSERVATIVE" }, "MATURE"),
    opt("cmp-hc-3", "UnitedHealth / Optum", "Vertically-integrated payer-provider.", { posture: "EXPANSIVE" }, "MATURE"),
    opt("cmp-hc-4", "Teladoc / Amwell", "Telehealth platform.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-hc-5", "Hinge Health / Omada", "Digital therapeutic vertical.", { posture: "AGGRESSIVE" }),
    opt("cmp-hc-6", "AI-native clinical co-pilot", "LLM-driven documentation + decision-support.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-hc-7", "Amazon Health / One Medical", "Big-tech vertical entrant.", { posture: "EXPANSIVE" }),
    opt("cmp-hc-8", "CVS / Walgreens", "Retail-pharma footprint.", { posture: "DEFENSIVE" }),
    opt("cmp-hc-9", "Well-funded AI-native upstart", "Stealth biotech with foundation-model edge.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-hc-10", "Academic medical center spinout", "Research-backed clinical AI start-up.", { posture: "OPPORTUNISTIC" }),
  ],
  manufacturing: [
    opt("cmp-mfg-1", "Siemens", "Industrial automation incumbent.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-mfg-2", "Rockwell Automation", "PLC + factory floor standard.", { posture: "CONSERVATIVE" }, "MATURE"),
    opt("cmp-mfg-3", "GE Vernova", "Energy & industrial software pivot.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-mfg-4", "Honeywell", "Diversified industrial control.", { posture: "CONSERVATIVE" }, "MATURE"),
    opt("cmp-mfg-5", "PTC / Autodesk", "PLM and CAD entrenched suites.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-mfg-6", "AI-native MES challenger", "Reasoning-LLM driven shop-floor optimiser.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-mfg-7", "Hyperscaler (AWS / Azure IoT)", "Cloud vendor going up the stack.", { posture: "EXPANSIVE" }),
    opt("cmp-mfg-8", "Foundry vertical (Palantir)", "Operations-OS for industrial primes.", { posture: "AGGRESSIVE" }),
    opt("cmp-mfg-9", "Well-funded AI-native upstart", "Greenfield factory-OS contender.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-mfg-10", "Open-source MES community", "Vendor-neutral coalition.", { posture: "OPPORTUNISTIC" }),
  ],
  retail: [
    opt("cmp-ret-1", "Amazon", "Marketplace + logistics + AWS leverage.", { posture: "AGGRESSIVE" }, "MATURE"),
    opt("cmp-ret-2", "Shopify", "Merchant tooling platform.", { posture: "EXPANSIVE" }),
    opt("cmp-ret-3", "Walmart", "Omnichannel scale leader.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-ret-4", "Target", "Curated mid-market chain.", { posture: "CONSERVATIVE" }),
    opt("cmp-ret-5", "TikTok Shop", "Social-commerce challenger.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-ret-6", "AI-native DTC brand", "GenAI design + ML-driven supply chain.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-ret-7", "Marketplace aggregator", "Roll-up of category leaders.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-ret-8", "Vertical specialty retailer", "Niche category killer.", { posture: "DEFENSIVE" }),
    opt("cmp-ret-9", "Well-funded AI-native upstart", "Foundation-model-driven personalization.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-ret-10", "Hard-discount entrant", "Aldi-style price destroyer.", { posture: "OPPORTUNISTIC" }),
  ],
  consulting: [
    opt("cmp-con-1", "McKinsey / BCG / Bain", "MBB strategy incumbent.", { posture: "CONSERVATIVE" }, "MATURE"),
    opt("cmp-con-2", "Big-4 consulting arm", "Audit-linked advisory powerhouse.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-con-3", "Accenture", "Implementation-led behemoth.", { posture: "EXPANSIVE" }, "MATURE"),
    opt("cmp-con-4", "AI-native boutique", "10-person team + Claude/GPT agents replacing 100 analysts.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-con-5", "Specialist boutique", "Vertical or function expert.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-con-6", "Fractional executive marketplace", "On-demand senior talent network.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-con-7", "Well-funded AI-native upstart", "Productised consulting via agents.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-con-8", "In-house strategy team", "Client's own corp-dev / strategy office.", { posture: "DEFENSIVE" }),
    opt("cmp-con-9", "Implementation-led system integrator", "Build-and-operate offer.", { posture: "EXPANSIVE" }),
    opt("cmp-con-10", "Tier-2 generalist", "Cost-optimised mid-market alternative.", { posture: "OPPORTUNISTIC" }),
  ],
  generic: [
    opt("cmp-gen-1", "Well-funded AI-native upstart", "No legacy, AI-first stack.", { posture: "AGGRESSIVE" }, "AI-NATIVE"),
    opt("cmp-gen-2", "Hyperscaler going up the stack", "AWS/Azure/GCP encroaching.", { posture: "EXPANSIVE" }),
    opt("cmp-gen-3", "Established incumbent", "Mature footprint, slow to adapt.", { posture: "DEFENSIVE" }, "MATURE"),
    opt("cmp-gen-4", "Vertical specialist", "Deep on one industry slice.", { posture: "CONSERVATIVE" }),
    opt("cmp-gen-5", "Distressed incumbent pivoting", "Forced restructuring + new strategy.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-gen-6", "Open-source heavy challenger", "Community-first GTM.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-gen-7", "Founder-led aggressive scaler", "Charismatic founder, aggressive moves.", { posture: "AGGRESSIVE" }),
    opt("cmp-gen-8", "Coalition / alliance", "Multiple players joining forces.", { posture: "DEFENSIVE" }),
    opt("cmp-gen-9", "Geography-specific entrant", "Strong in one region, expanding.", { posture: "OPPORTUNISTIC" }),
    opt("cmp-gen-10", "Adjacent-industry crossover", "Player from neighbouring vertical.", { posture: "OPPORTUNISTIC" }),
  ],
};

// ---------- BMC blocks (per industry-aware where it matters) ---------------

const BMC_CUSTOMER_SEGMENTS: Record<string, ChoiceOption[]> = {
  saas: [
    opt("cs-saas-1", "SMB founders", "10-100 employees, founder-led.", { strength: 65 }),
    opt("cs-saas-2", "Mid-market RevOps", "200-1000 employees, ops team owns tooling.", { strength: 70 }),
    opt("cs-saas-3", "Enterprise IT", "10k+ employees, formal procurement.", { strength: 60 }),
    opt("cs-saas-4", "Developer teams", "Self-serve, bottoms-up adoption.", { strength: 70 }),
    opt("cs-saas-5", "Product managers", "Cross-functional buyer.", { strength: 60 }),
    opt("cs-saas-6", "Marketing teams", "Campaign + analytics owners.", { strength: 60 }),
    opt("cs-saas-7", "Customer success", "Retention-focused users.", { strength: 55 }),
    opt("cs-saas-8", "Finance / FP&A", "Forecasting + reporting use-cases.", { strength: 55 }),
    opt("cs-saas-9", "HR / People ops", "Talent acquisition & engagement.", { strength: 55 }),
    opt("cs-saas-10", "Compliance & risk", "Highly regulated buyers.", { strength: 60 }),
  ],
  fintech: [
    opt("cs-fin-1", "Retail consumers", "Mass-market individuals.", { strength: 60 }),
    opt("cs-fin-2", "Mass-affluent investors", "$100k-$5M household assets.", { strength: 65 }),
    opt("cs-fin-3", "SMB merchants", "Brick-and-mortar + online sellers.", { strength: 70 }),
    opt("cs-fin-4", "Mid-market CFOs", "Treasury + working capital.", { strength: 65 }),
    opt("cs-fin-5", "Enterprise treasury", "Multinationals.", { strength: 55 }),
    opt("cs-fin-6", "Crypto-native users", "Self-custody, on-chain natives.", { strength: 50 }),
    opt("cs-fin-7", "Underbanked / new-to-credit", "First-time financial-product users.", { strength: 55 }),
    opt("cs-fin-8", "Independent advisors", "RIAs and broker-dealers.", { strength: 60 }),
    opt("cs-fin-9", "Compliance teams", "AML/KYC owners.", { strength: 60 }),
    opt("cs-fin-10", "Embedded-finance platforms", "Other fintechs as customers.", { strength: 65 }),
  ],
  healthcare: [
    opt("cs-hc-1", "Hospital systems", "Multi-site IDNs.", { strength: 60 }),
    opt("cs-hc-2", "Specialty clinics", "Single-specialty providers.", { strength: 65 }),
    opt("cs-hc-3", "Payers / insurers", "Health plans.", { strength: 55 }),
    opt("cs-hc-4", "Employers (self-insured)", "Benefits buyers.", { strength: 60 }),
    opt("cs-hc-5", "Pharmacies", "Retail + specialty.", { strength: 55 }),
    opt("cs-hc-6", "Pharma manufacturers", "Drug + device makers.", { strength: 60 }),
    opt("cs-hc-7", "Patients (DTC)", "Direct-to-consumer.", { strength: 50 }),
    opt("cs-hc-8", "Caregivers / family", "Decision influencers.", { strength: 45 }),
    opt("cs-hc-9", "Public-health agencies", "Government buyers.", { strength: 50 }),
    opt("cs-hc-10", "Clinical researchers", "Trials + life-sciences.", { strength: 55 }),
  ],
  generic: [
    opt("cs-gen-1", "SMBs", "Small/mid-size businesses.", { strength: 60 }),
    opt("cs-gen-2", "Mid-market", "200-2000 employees.", { strength: 65 }),
    opt("cs-gen-3", "Enterprise", "Large multinational customers.", { strength: 60 }),
    opt("cs-gen-4", "Consumers", "Direct-to-consumer.", { strength: 55 }),
    opt("cs-gen-5", "Public sector", "Government and adjacent.", { strength: 50 }),
    opt("cs-gen-6", "Channel partners", "Resellers and integrators.", { strength: 55 }),
    opt("cs-gen-7", "Vertical specialists", "One-industry-deep buyers.", { strength: 60 }),
    opt("cs-gen-8", "Regulated buyers", "Highly compliance-driven.", { strength: 60 }),
    opt("cs-gen-9", "Early adopters", "Innovators and tinkerers.", { strength: 55 }),
    opt("cs-gen-10", "Late-stage / cost-driven", "Optimisers + budget buyers.", { strength: 55 }),
  ],
};

const BMC_VALUE_PROPOSITIONS: Record<string, ChoiceOption[]> = {
  saas: [
    opt("vp-saas-1", "Time saved per workflow", "Automate the boring stuff.", { strength: 70 }),
    opt("vp-saas-2", "Single source of truth", "Unify data across teams.", { strength: 65 }),
    opt("vp-saas-3", "AI-driven insights", "Surface what humans miss.", { strength: 65 }),
    opt("vp-saas-4", "Compliance & audit-readiness", "Pass audits without overhead.", { strength: 70 }),
    opt("vp-saas-5", "Embedded analytics", "Decisions inside the workflow.", { strength: 60 }),
    opt("vp-saas-6", "Open ecosystem / API-first", "Integrate with everything.", { strength: 65 }),
    opt("vp-saas-7", "Predictable cost / SaaS pricing", "No surprise bills.", { strength: 60 }),
    opt("vp-saas-8", "Best-in-class UX", "Polished, design-led product.", { strength: 65 }),
    opt("vp-saas-9", "White-glove onboarding", "Hands-on setup + adoption.", { strength: 55 }),
    opt("vp-saas-10", "Enterprise security & SSO", "SOC2, ISO, SAML/SCIM.", { strength: 65 }),
  ],
  generic: [
    opt("vp-gen-1", "Lower total cost", "Cheaper than the incumbent.", { strength: 60 }),
    opt("vp-gen-2", "Better outcome quality", "More accurate / higher fidelity.", { strength: 65 }),
    opt("vp-gen-3", "Speed-to-value", "Days, not months, to go live.", { strength: 65 }),
    opt("vp-gen-4", "Specialist expertise", "Deep on one vertical.", { strength: 60 }),
    opt("vp-gen-5", "Trust & reputation", "Brand + customer references.", { strength: 60 }),
    opt("vp-gen-6", "Network effects", "Each user makes it better.", { strength: 65 }),
    opt("vp-gen-7", "End-to-end coverage", "One-vendor full stack.", { strength: 60 }),
    opt("vp-gen-8", "Local presence + support", "On-the-ground service.", { strength: 55 }),
    opt("vp-gen-9", "Regulatory alignment", "Built for your compliance regime.", { strength: 65 }),
    opt("vp-gen-10", "Switching simplicity", "Easy to migrate to.", { strength: 60 }),
  ],
};

const BMC_REVENUE_STREAMS: ChoiceOption[] = [
  opt("rs-1", "SaaS subscription (annual)", "Yearly contracts, predictable ARR.", { strength: 70 }),
  opt("rs-2", "Per-seat / per-user pricing", "Scales with team size.", { strength: 65 }),
  opt("rs-3", "Usage-based / consumption", "Pay-as-you-go metering.", { strength: 65 }),
  opt("rs-4", "Transaction fees (% take rate)", "Marketplace economics.", { strength: 60 }),
  opt("rs-5", "Licence + support fees", "Perpetual + annual maintenance.", { strength: 55 }),
  opt("rs-6", "Services / implementation", "Project-based revenue.", { strength: 55 }),
  opt("rs-7", "Advertising / sponsorship", "Revenue from third-party advertisers.", { strength: 50 }),
  opt("rs-8", "Hardware + recurring software", "Razor-and-blade model.", { strength: 60 }),
];

const BMC_KEY_RESOURCES: ChoiceOption[] = [
  opt("kr-1", "Proprietary data set", "Unique training/operational data.", { strength: 75 }),
  opt("kr-2", "Engineering talent", "Hard-to-replace builders.", { strength: 70 }),
  opt("kr-3", "Brand / customer trust", "Hard-won reputation.", { strength: 65 }),
  opt("kr-4", "Regulatory licences / certifications", "Permission to operate.", { strength: 70 }),
  opt("kr-5", "Patent portfolio", "Defended IP.", { strength: 60 }),
  opt("kr-6", "Physical footprint", "Stores, warehouses, plants.", { strength: 55 }),
  opt("kr-7", "Distribution / channel relationships", "Hard-to-rebuild partnerships.", { strength: 65 }),
  opt("kr-8", "Strong balance sheet", "Capital for moves.", { strength: 65 }),
  opt("kr-9", "Founder / founding-team reputation", "Personal credibility.", { strength: 60 }),
  opt("kr-10", "Foundation-model access / GPU capacity", "AI infrastructure.", { strength: 65 }),
];

const BMC_KEY_ACTIVITIES: ChoiceOption[] = [
  opt("ka-1", "Product engineering", "Building and shipping the core product.", { strength: 70 }),
  opt("ka-2", "Sales & marketing", "Pipeline generation and conversion.", { strength: 65 }),
  opt("ka-3", "Customer success / support", "Retention and expansion.", { strength: 60 }),
  opt("ka-4", "Compliance + risk operations", "Maintaining licenses and audits.", { strength: 65 }),
  opt("ka-5", "Data labelling + model evaluation", "Feeding the AI flywheel.", { strength: 60 }),
  opt("ka-6", "R&D / discovery", "Pre-product science.", { strength: 60 }),
  opt("ka-7", "Manufacturing / fulfilment", "Physical production / shipping.", { strength: 55 }),
  opt("ka-8", "Content production", "Editorial / programming.", { strength: 55 }),
  opt("ka-9", "Partner enablement", "Channel + ISV ecosystem.", { strength: 55 }),
  opt("ka-10", "Platform operations", "Reliability, security, scale.", { strength: 65 }),
];

const BMC_KEY_PARTNERS: ChoiceOption[] = [
  opt("kp-1", "Cloud / infrastructure providers", "AWS, Azure, GCP.", { strength: 60 }),
  opt("kp-2", "Systems integrators / consultancies", "Implementation muscle.", { strength: 55 }),
  opt("kp-3", "ISV / app-store ecosystem", "Adjacent product integrators.", { strength: 60 }),
  opt("kp-4", "Reseller channel", "Geographic / vertical reach.", { strength: 55 }),
  opt("kp-5", "Foundation-model labs", "Anthropic / OpenAI / Mistral / etc.", { strength: 65 }),
  opt("kp-6", "Data providers", "Licensed datasets, signal vendors.", { strength: 55 }),
  opt("kp-7", "Regulators / standards bodies", "Compliance posture.", { strength: 55 }),
  opt("kp-8", "Academic / research collaborators", "Early IP and talent pipeline.", { strength: 50 }),
  opt("kp-9", "Distribution OEMs", "Pre-installed footprint.", { strength: 50 }),
  opt("kp-10", "Strategic capital partners", "Long-horizon investors.", { strength: 55 }),
];

const BMC_CHANNELS: ChoiceOption[] = [
  opt("ch-1", "Direct field sales", "Enterprise reps + AEs.", { strength: 65 }),
  opt("ch-2", "Product-led / self-serve", "Sign up and use without sales.", { strength: 70 }),
  opt("ch-3", "Inside sales / SDR-led", "Mid-market motion.", { strength: 60 }),
  opt("ch-4", "Channel partners / VARs", "Indirect via resellers.", { strength: 55 }),
  opt("ch-5", "Marketplace listing", "AWS / Azure / app stores.", { strength: 60 }),
  opt("ch-6", "Community / open-source", "Bottom-up adoption.", { strength: 60 }),
  opt("ch-7", "Content marketing / SEO", "Inbound demand-gen.", { strength: 60 }),
  opt("ch-8", "Events & conferences", "In-person pipeline.", { strength: 55 }),
  opt("ch-9", "Embedded / OEM", "Inside another product.", { strength: 55 }),
  opt("ch-10", "Retail / physical", "In-store presence.", { strength: 50 }),
];

const BMC_CUSTOMER_RELATIONSHIPS: ChoiceOption[] = [
  opt("cr-1", "High-touch CSM", "Named account manager.", { strength: 65 }),
  opt("cr-2", "Self-serve + community", "Forum + docs.", { strength: 60 }),
  opt("cr-3", "Tiered support (Basic/Pro/Enterprise)", "SLA-graded.", { strength: 60 }),
  opt("cr-4", "Account-based partnership", "Joint roadmap with key accounts.", { strength: 65 }),
  opt("cr-5", "Transactional / pay-and-go", "Minimal relationship.", { strength: 50 }),
  opt("cr-6", "User community / advocacy", "Champions + power users.", { strength: 60 }),
  opt("cr-7", "Professional services attached", "Implementation + advisory.", { strength: 55 }),
  opt("cr-8", "Training & certification", "Skills + credentials program.", { strength: 55 }),
];

const BMC_COST_STRUCTURE: ChoiceOption[] = [
  opt("co-1", "Engineering payroll", "R&D headcount.", { strength: 60 }),
  opt("co-2", "Sales & marketing spend", "CAC-heavy GTM.", { strength: 55 }),
  opt("co-3", "Cloud + GPU compute", "Infrastructure usage.", { strength: 60 }),
  opt("co-4", "Foundation-model inference fees", "External AI APIs.", { strength: 55 }),
  opt("co-5", "Compliance + legal", "Regulated-industry overhead.", { strength: 55 }),
  opt("co-6", "Partnerships + rev-share", "Channel costs.", { strength: 50 }),
  opt("co-7", "Customer success / support", "Retention costs.", { strength: 55 }),
  opt("co-8", "Physical operations", "Plants, stores, warehouses.", { strength: 55 }),
];

// ---------- VPC items ------------------------------------------------------

const VPC_JOBS: ChoiceOption[] = [
  opt("vj-1", "Hit a quarterly target", "Performance pressure.", { weight: 70 }),
  opt("vj-2", "Demonstrate ROI to my boss", "Justify the investment.", { weight: 65 }),
  opt("vj-3", "Stay compliant with regulation", "Avoid fines and audit findings.", { weight: 70 }),
  opt("vj-4", "Save my team time", "Reduce manual toil.", { weight: 70 }),
  opt("vj-5", "Make a confident decision", "Reduce decision risk.", { weight: 60 }),
  opt("vj-6", "Win against competitors", "Defend / grow share.", { weight: 60 }),
  opt("vj-7", "Onboard a new hire faster", "Reduce ramp time.", { weight: 55 }),
  opt("vj-8", "Avoid being blamed when something fails", "Career protection.", { weight: 55 }),
  opt("vj-9", "Get a board / exec briefing right", "Look good upward.", { weight: 55 }),
  opt("vj-10", "Personal mastery / learn a craft", "Develop expertise.", { weight: 50 }),
];

const VPC_PAINS: ChoiceOption[] = [
  opt("vp-pa-1", "Tools don't talk to each other", "Integration pain.", { weight: 65 }),
  opt("vp-pa-2", "Manual data entry / copy-paste", "Repetitive work.", { weight: 70 }),
  opt("vp-pa-3", "Slow vendor support", "Tickets sit for days.", { weight: 60 }),
  opt("vp-pa-4", "Inflexible contracts / lock-in", "Hard to exit.", { weight: 55 }),
  opt("vp-pa-5", "Inscrutable pricing", "Surprise invoices.", { weight: 55 }),
  opt("vp-pa-6", "Steep learning curve", "Hard to roll out internally.", { weight: 60 }),
  opt("vp-pa-7", "Black-box outputs", "Can't explain decisions.", { weight: 55 }),
  opt("vp-pa-8", "Security / compliance risk", "Procurement blocker.", { weight: 65 }),
  opt("vp-pa-9", "Performance / reliability gaps", "Outages, slowness.", { weight: 60 }),
  opt("vp-pa-10", "Hidden migration cost", "Lift to switch is painful.", { weight: 60 }),
];

const VPC_GAINS: ChoiceOption[] = [
  opt("vp-ga-1", "Hours back per week", "Tangible time savings.", { weight: 70 }),
  opt("vp-ga-2", "Higher win-rate / conversion", "Outcome metrics.", { weight: 65 }),
  opt("vp-ga-3", "Headcount avoidance", "Don't have to hire.", { weight: 65 }),
  opt("vp-ga-4", "Audit-ready evidence trail", "Reg posture.", { weight: 60 }),
  opt("vp-ga-5", "Clear, explainable outputs", "Defensible decisions.", { weight: 60 }),
  opt("vp-ga-6", "Peace of mind / lower stress", "Soft but real.", { weight: 55 }),
  opt("vp-ga-7", "Career-making outcome", "Promotion-grade win.", { weight: 55 }),
  opt("vp-ga-8", "Faster ramp for new hires", "Reduce knowledge silos.", { weight: 55 }),
  opt("vp-ga-9", "Insightful analytics", "Spot trends earlier.", { weight: 60 }),
  opt("vp-ga-10", "Network effects with peers", "Community + benchmarks.", { weight: 55 }),
];

const VPC_PRODUCTS: ChoiceOption[] = [
  opt("vp-ps-1", "Web app / dashboard", "Browser-based product.", { weight: 70 }),
  opt("vp-ps-2", "API / SDK", "Embed in their stack.", { weight: 65 }),
  opt("vp-ps-3", "AI agent / co-pilot", "Conversational + tool-using.", { weight: 65 }),
  opt("vp-ps-4", "Onboarding service", "Hands-on setup.", { weight: 55 }),
  opt("vp-ps-5", "Marketplace / app gallery", "Templates + add-ons.", { weight: 55 }),
  opt("vp-ps-6", "Reporting + analytics module", "Insights layer.", { weight: 60 }),
  opt("vp-ps-7", "Admin console", "IT controls.", { weight: 55 }),
  opt("vp-ps-8", "Mobile app", "On-the-go usage.", { weight: 55 }),
  opt("vp-ps-9", "Embedded widget", "In-product surface.", { weight: 55 }),
  opt("vp-ps-10", "Community + content", "Forums, docs, courses.", { weight: 50 }),
];

const VPC_PAIN_RELIEVERS: ChoiceOption[] = [
  opt("vp-pr-1", "One-click integrations", "Pre-built connectors.", { weight: 70 }),
  opt("vp-pr-2", "Auto-generated docs / outputs", "No more manual writing.", { weight: 65 }),
  opt("vp-pr-3", "24/7 support SLA", "Always-available help.", { weight: 60 }),
  opt("vp-pr-4", "Transparent flat-rate pricing", "No surprises.", { weight: 60 }),
  opt("vp-pr-5", "In-product guided setup", "Steers users through.", { weight: 60 }),
  opt("vp-pr-6", "Audit log + explainability", "Show your work.", { weight: 60 }),
  opt("vp-pr-7", "SOC2 + ISO + HIPAA bundle", "Compliance-ready out of the box.", { weight: 65 }),
  opt("vp-pr-8", "99.9% uptime + multi-region", "Reliability stake.", { weight: 60 }),
  opt("vp-pr-9", "Free migration service", "We move you for free.", { weight: 55 }),
  opt("vp-pr-10", "No-vendor-lock-in data export", "Open formats.", { weight: 55 }),
];

const VPC_GAIN_CREATORS: ChoiceOption[] = [
  opt("vp-gc-1", "Time-savings dashboard", "Show hours saved per week.", { weight: 65 }),
  opt("vp-gc-2", "Outcome benchmarking", "Compare to peer accounts.", { weight: 60 }),
  opt("vp-gc-3", "AI suggestions next to every action", "Augmented decisioning.", { weight: 65 }),
  opt("vp-gc-4", "Audit-ready PDF export", "Click → compliance doc.", { weight: 60 }),
  opt("vp-gc-5", "ROI calculator built-in", "Auto-quantify value.", { weight: 55 }),
  opt("vp-gc-6", "Self-service career insights", "Promotion-grade reports.", { weight: 55 }),
  opt("vp-gc-7", "Onboarding playbook", "Repeatable new-hire ramp.", { weight: 55 }),
  opt("vp-gc-8", "Embedded learning path", "Skill-building in-app.", { weight: 50 }),
  opt("vp-gc-9", "Community leaderboards", "Peer benchmarks.", { weight: 55 }),
  opt("vp-gc-10", "Predictive trend feed", "Spot inflection points early.", { weight: 60 }),
];

// ---------- Capabilities (per dimension) -----------------------------------

const CAPABILITY_SETS: Record<string, ChoiceOption[]> = {
  PEOPLE: [
    opt("cs-pp-1", "Senior product engineering bench", "10+ years average tenure.", { dimension: "PEOPLE", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-pp-2", "Domain-deep sales force", "Vertical specialists, multi-year wins.", { dimension: "PEOPLE", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-pp-3", "AI / ML research team", "Foundation-model fluency.", { dimension: "PEOPLE", lifecycle: "GROWING" }, "GROWING"),
    opt("cs-pp-4", "Regulatory tradecraft", "Lawyers + ex-regulators in-house.", { dimension: "PEOPLE", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-pp-5", "Customer success / CSM force", "Account ownership + retention motion.", { dimension: "PEOPLE", lifecycle: "GROWING" }),
    opt("cs-pp-6", "Founder bench", "Multi-time founders / operators.", { dimension: "PEOPLE", lifecycle: "EMERGING" }, "EMERGING"),
    opt("cs-pp-7", "Design / UX studio", "Award-winning design leadership.", { dimension: "PEOPLE", lifecycle: "GROWING" }),
    opt("cs-pp-8", "Field engineering / FAE", "Hands-on technical pre/post-sales.", { dimension: "PEOPLE", lifecycle: "MATURE" }),
  ],
  TECH: [
    opt("cs-tk-1", "Multi-region cloud platform", "Scaled, resilient infra.", { dimension: "TECH", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-tk-2", "Foundation-model evals + finetuning", "AI engineering stack.", { dimension: "TECH", lifecycle: "EMERGING" }, "EMERGING"),
    opt("cs-tk-3", "Proprietary dataset + labelling pipeline", "Data flywheel.", { dimension: "TECH", lifecycle: "GROWING" }),
    opt("cs-tk-4", "Edge / on-prem deployment", "Customer-data-stays-put posture.", { dimension: "TECH", lifecycle: "GROWING" }),
    opt("cs-tk-5", "Real-time event pipeline", "Streaming + observability.", { dimension: "TECH", lifecycle: "GROWING" }),
    opt("cs-tk-6", "Secure-by-default platform", "Zero-trust, FIPS, FedRAMP.", { dimension: "TECH", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-tk-7", "Open-source core + commercial wrap", "Community + commercial duality.", { dimension: "TECH", lifecycle: "GROWING" }),
    opt("cs-tk-8", "GPU capacity contracts", "Reserved compute.", { dimension: "TECH", lifecycle: "EMERGING" }, "EMERGING"),
  ],
  ORG: [
    opt("cs-or-1", "Founder-led operating cadence", "Weekly metrics-driven reviews.", { dimension: "ORG", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-or-2", "Vertical-squad model", "Industry-aligned cross-functional teams.", { dimension: "ORG", lifecycle: "GROWING" }),
    opt("cs-or-3", "Async-first remote org", "Documented decisions, low-meeting culture.", { dimension: "ORG", lifecycle: "GROWING" }),
    opt("cs-or-4", "Distributed P&L ownership", "BU-level autonomy.", { dimension: "ORG", lifecycle: "MATURE" }),
    opt("cs-or-5", "Strong product council / triage", "Tight prioritisation forum.", { dimension: "ORG", lifecycle: "MATURE" }),
    opt("cs-or-6", "Talent density (top-decile bar)", "High-bar hiring funnel.", { dimension: "ORG", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-or-7", "Internal AI-tooling adoption", "Agents inside every workflow.", { dimension: "ORG", lifecycle: "EMERGING" }, "EMERGING"),
    opt("cs-or-8", "Performance + comp transparency", "Bands published internally.", { dimension: "ORG", lifecycle: "GROWING" }),
  ],
  PROCESSES: [
    opt("cs-pr-1", "Audit-grade release engineering", "Change-control, evidence trail.", { dimension: "PROCESSES", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-pr-2", "Trunk-based / continuous deploy", "Multiple shipments per day.", { dimension: "PROCESSES", lifecycle: "GROWING" }),
    opt("cs-pr-3", "Closed-loop customer feedback", "PMs in customer calls weekly.", { dimension: "PROCESSES", lifecycle: "MATURE" }),
    opt("cs-pr-4", "Quarterly business-review cadence", "QBR + planning rhythm.", { dimension: "PROCESSES", lifecycle: "MATURE" }),
    opt("cs-pr-5", "Eval-driven AI development", "Test-first model engineering.", { dimension: "PROCESSES", lifecycle: "EMERGING" }, "EMERGING"),
    opt("cs-pr-6", "Compliance evidence pipeline", "Continuous SOC2 / ISO automation.", { dimension: "PROCESSES", lifecycle: "GROWING" }),
    opt("cs-pr-7", "Standard incident-response runbook", "Practised, well-documented.", { dimension: "PROCESSES", lifecycle: "MATURE" }, "MATURE"),
    opt("cs-pr-8", "Productised onboarding flow", "Time-to-value < 1 week.", { dimension: "PROCESSES", lifecycle: "GROWING" }),
  ],
};

// ---------- WFC fears ------------------------------------------------------

const WFC_FEAR_WORKFLOW: ChoiceOption[] = [
  opt("wf-1", "Replace our SDR layer with AI outbound", "Personalised at scale, 24/7.", {}),
  opt("wf-2", "Eat the human implementation services", "Agents do what consultants used to.", {}),
  opt("wf-3", "Auto-generate our compliance evidence", "Audit work done in minutes.", {}),
  opt("wf-4", "Automate our reporting layer", "Drop-in dashboards become obsolete.", {}),
  opt("wf-5", "Compress our customer-success motion", "Self-healing accounts, no CSMs.", {}),
  opt("wf-6", "Auto-author RFP responses", "Sales-engineering hours collapse.", {}),
  opt("wf-7", "Auto-produce our marketing content", "Brand work goes generative.", {}),
  opt("wf-8", "Eat our data-entry / labelling layer", "Human-in-the-loop dropped to 5%.", {}),
  opt("wf-9", "Replace our integration consultants", "Agents wire up customer systems.", {}),
  opt("wf-10", "Generate our analyst reports end-to-end", "Research desk disrupted.", {}),
];

const WFC_FEAR_PRICING: ChoiceOption[] = [
  opt("wp-1", "1/10 of our list price", "Loss-leader entry pricing.", {}),
  opt("wp-2", "Free tier with unlimited usage", "Eat the floor.", {}),
  opt("wp-3", "Outcome-based pricing only", "Pay-for-results vs our seat fees.", {}),
  opt("wp-4", "Usage-meter pricing 90% lower", "Cents per call.", {}),
  opt("wp-5", "Bundled into hyperscaler subscription", "Effectively zero marginal.", {}),
  opt("wp-6", "Marketplace take-rate vs subscription", "Pure transactional.", {}),
  opt("wp-7", "Open-source + paid support", "Free product, paid services.", {}),
  opt("wp-8", "Land at price floor, expand via add-ons", "Trojan-horse pricing.", {}),
];

const WFC_FEAR_FLYWHEEL: ChoiceOption[] = [
  opt("wfly-1", "Customer-interaction data we can't get", "Logs from end-customer apps.", {}),
  opt("wfly-2", "Workflow trace data from agents", "Every step instrumented.", {}),
  opt("wfly-3", "Public-data scraping at scale", "Whole-web context.", {}),
  opt("wfly-4", "Cross-customer benchmarking dataset", "Aggregated peer signal.", {}),
  opt("wfly-5", "Open-source community contributions", "Free engineering labor.", {}),
  opt("wfly-6", "Proprietary eval suite + feedback loops", "Quality compounding.", {}),
  opt("wfly-7", "Patent / IP filings around the dataset", "Defensible regulatory moat.", {}),
  opt("wfly-8", "Foundation-model partnership privileges", "First access to frontier models.", {}),
];

// ---------- Rumelt kernel --------------------------------------------------

const RUMELT_DIAGNOSIS: ChoiceOption[] = [
  opt("rd-1", "AI-native challenger compressing our core workflow", "Our service-revenue base is exposed.", {}),
  opt("rd-2", "Pricing floor collapsing under us", "Cheaper substitutes redefine willingness-to-pay.", {}),
  opt("rd-3", "Distribution monopolised by a platform owner", "Channel power concentrating elsewhere.", {}),
  opt("rd-4", "Regulatory headwind eating our agility", "Compliance overhead grows faster than revenue.", {}),
  opt("rd-5", "Our flywheel never compounded the way we thought", "The 'data moat' is shallow.", {}),
  opt("rd-6", "Customer expectations reset by a peer category", "We benchmark against last decade.", {}),
  opt("rd-7", "Talent leaking to greenfield competitors", "Best engineers chase frontier work.", {}),
  opt("rd-8", "Capital cycle turning against us", "Free money era over; we burn too much.", {}),
];

const RUMELT_POLICY: ChoiceOption[] = [
  opt("rp-1", "Concentrate on the defensible vertical", "Stop trying to be horizontal.", {}),
  opt("rp-2", "Re-platform on AI-native foundations", "Rebuild from inference outward.", {}),
  opt("rp-3", "Eat our own pricing model", "Cannibalise before they do.", {}),
  opt("rp-4", "Acquire a critical capability gap", "M&A the AI-native team you fear.", {}),
  opt("rp-5", "Open-source the commodity layer", "Trade product moat for distribution.", {}),
  opt("rp-6", "Double down on regulated complexity", "Where compliance is a moat, dig deeper.", {}),
  opt("rp-7", "Partner with a hyperscaler", "Lean on platform leverage.", {}),
  opt("rp-8", "Exit non-core lines and re-fund the core", "Concentrate capital + attention.", {}),
];

const RUMELT_OPENING_MOVE: ChoiceOption[] = [
  opt("rom-1", "Ship a flagship AI co-pilot inside our product", "First 90-day visible move.", {}),
  opt("rom-2", "Acquire a 5-15 person AI-native team", "Reverse-acqui-hire.", {}),
  opt("rom-3", "Launch a usage-based pricing tier", "Defend the pricing floor.", {}),
  opt("rom-4", "Open-source our data-ingestion layer", "Trade product moat for distribution.", {}),
  opt("rom-5", "Sign a hyperscaler bundle deal", "Distribution leverage.", {}),
  opt("rom-6", "Spin up an AI-native skunkworks", "Insulated 10-person internal team.", {}),
  opt("rom-7", "Re-org around 3 vertical squads", "Match the org to the market.", {}),
  opt("rom-8", "Publish a category-defining standard", "Set the rules of the new game.", {}),
];

// ---------- Lookup ---------------------------------------------------------

export interface StaticQuery {
  questionId: string;
  context: Record<string, unknown>;
  count?: number;
  exclude?: string[];
}

function pickContextual(
  bank: Record<string, ChoiceOption[]>,
  context: Record<string, unknown>,
): ChoiceOption[] {
  const key = indKey(context.industry ?? context.industryKey);
  if (bank[key]) return bank[key];
  return bank.generic ?? Object.values(bank)[0] ?? [];
}

export function getStaticOptions(q: StaticQuery): ChoiceOption[] {
  const id = q.questionId;
  let base: ChoiceOption[] = [];

  if (id === "industry.pick") base = INDUSTRIES;
  else if (id === "competitor.pick") base = pickContextual(COMPETITORS, q.context);
  else if (id === "bmc.customerSegments") base = pickContextual(BMC_CUSTOMER_SEGMENTS, q.context);
  else if (id === "bmc.valuePropositions") base = pickContextual(BMC_VALUE_PROPOSITIONS, q.context);
  else if (id === "bmc.revenueStreams") base = BMC_REVENUE_STREAMS;
  else if (id === "bmc.keyResources") base = BMC_KEY_RESOURCES;
  else if (id === "bmc.keyActivities") base = BMC_KEY_ACTIVITIES;
  else if (id === "bmc.keyPartners") base = BMC_KEY_PARTNERS;
  else if (id === "bmc.channels") base = BMC_CHANNELS;
  else if (id === "bmc.customerRelationships") base = BMC_CUSTOMER_RELATIONSHIPS;
  else if (id === "bmc.costStructure") base = BMC_COST_STRUCTURE;
  else if (id === "vpc.jobs") base = VPC_JOBS;
  else if (id === "vpc.pains") base = VPC_PAINS;
  else if (id === "vpc.gains") base = VPC_GAINS;
  else if (id === "vpc.productsServices") base = VPC_PRODUCTS;
  else if (id === "vpc.painRelievers") base = VPC_PAIN_RELIEVERS;
  else if (id === "vpc.gainCreators") base = VPC_GAIN_CREATORS;
  else if (id === "capability.set.pick") {
    const dim = String(q.context.dimension ?? "PEOPLE").toUpperCase();
    base = CAPABILITY_SETS[dim] ?? CAPABILITY_SETS.PEOPLE;
  } else if (id === "wfc.fear.workflow") base = WFC_FEAR_WORKFLOW;
  else if (id === "wfc.fear.pricing") base = WFC_FEAR_PRICING;
  else if (id === "wfc.fear.flywheel") base = WFC_FEAR_FLYWHEEL;
  else if (id === "rumelt.diagnosis") base = RUMELT_DIAGNOSIS;
  else if (id === "rumelt.guidingPolicy") base = RUMELT_POLICY;
  else if (id === "rumelt.openingMove") base = RUMELT_OPENING_MOVE;
  else if (id === "competitor.refine") {
    base = [
      opt("cref-1", "Well-funded but slow", "Lots of capital, organisational drag.", { posture: "DEFENSIVE", warChest: 90, innovationIndex: 50 }),
      opt("cref-2", "Founder-led aggressive", "High-conviction operator, fast moves.", { posture: "AGGRESSIVE", innovationIndex: 80 }),
      opt("cref-3", "Distressed incumbent pivoting", "Forced restructuring + new strategy.", { posture: "OPPORTUNISTIC", warChest: 40 }),
      opt("cref-4", "Open-source heavy", "Community-led GTM, slim sales.", { posture: "EXPANSIVE", innovationIndex: 75 }),
      opt("cref-5", "Pure-play AI-native", "No legacy, all-LLM stack.", { posture: "AGGRESSIVE", innovationIndex: 95 }),
    ];
  } else {
    base = [];
  }

  const excluded = new Set(q.exclude ?? []);
  const out = base.filter((o) => !excluded.has(o.id));
  const count = q.count ?? 6;
  return out.slice(0, count);
}

export const STATIC_QUESTION_IDS: string[] = [
  "industry.pick",
  "competitor.pick",
  "competitor.refine",
  "bmc.customerSegments",
  "bmc.valuePropositions",
  "bmc.revenueStreams",
  "bmc.keyResources",
  "bmc.keyActivities",
  "bmc.keyPartners",
  "bmc.channels",
  "bmc.customerRelationships",
  "bmc.costStructure",
  "vpc.jobs",
  "vpc.pains",
  "vpc.gains",
  "vpc.productsServices",
  "vpc.painRelievers",
  "vpc.gainCreators",
  "capability.set.pick",
  "wfc.fear.workflow",
  "wfc.fear.pricing",
  "wfc.fear.flywheel",
  "rumelt.diagnosis",
  "rumelt.guidingPolicy",
  "rumelt.openingMove",
];

// Count of total static options across all banks. Pure book-keeping helper
// for the wizard's report; reflects what the demo path can serve without an
// API key.
export function totalStaticOptionCount(): number {
  let n = INDUSTRIES.length;
  for (const v of Object.values(COMPETITORS)) n += v.length;
  for (const v of Object.values(BMC_CUSTOMER_SEGMENTS)) n += v.length;
  for (const v of Object.values(BMC_VALUE_PROPOSITIONS)) n += v.length;
  n += BMC_REVENUE_STREAMS.length;
  n += BMC_KEY_RESOURCES.length;
  n += BMC_KEY_ACTIVITIES.length;
  n += BMC_KEY_PARTNERS.length;
  n += BMC_CHANNELS.length;
  n += BMC_CUSTOMER_RELATIONSHIPS.length;
  n += BMC_COST_STRUCTURE.length;
  n += VPC_JOBS.length;
  n += VPC_PAINS.length;
  n += VPC_GAINS.length;
  n += VPC_PRODUCTS.length;
  n += VPC_PAIN_RELIEVERS.length;
  n += VPC_GAIN_CREATORS.length;
  for (const v of Object.values(CAPABILITY_SETS)) n += v.length;
  n += WFC_FEAR_WORKFLOW.length;
  n += WFC_FEAR_PRICING.length;
  n += WFC_FEAR_FLYWHEEL.length;
  n += RUMELT_DIAGNOSIS.length;
  n += RUMELT_POLICY.length;
  n += RUMELT_OPENING_MOVE.length;
  n += 5; // competitor.refine
  return n;
}
