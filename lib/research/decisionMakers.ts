/**
 * Procurement decision-makers — typed data derived from
 * docs/research/PROCUREMENT_DECISION_MAKERS.md
 *
 * Every scraped person, every architect signup, every match-score weight
 * should resolve to one of these tiers/roles. Extend this file when new
 * research lands — do not parallel-invent types elsewhere.
 */

export enum DecisionMakerTier {
  DesignAuthority = "DesignAuthority",
  FinancialGatekeeper = "FinancialGatekeeper",
  Execution = "Execution",
  Operational = "Operational",
  Strategic = "Strategic",
  SectorSpecific = "SectorSpecific",
  SupplyChain = "SupplyChain",
  HiddenInfluencer = "HiddenInfluencer",
}

export type SustainabilityDriver =
  | "Liability"
  | "CodeCompliance"
  | "RiskMitigation"
  | "OpEx"
  | "Safety"
  | "Health"
  | "Liquidity"
  | "Scale"
  | "Schedule"
  | "SupplyChain"
  | "Certification"
  | "Resale"
  | "Brand"
  | "TalentRetention";

export enum SpecificationRigidity {
  Proprietary = "Proprietary",
  BaseBidWithAlternates = "BaseBidWithAlternates",
  PerformanceBased = "PerformanceBased",
}

export interface DecisionMakerRole {
  /** Display title, stable identifier for this role */
  title: string;
  /** Tier classification — drives messaging + filters */
  tier: DecisionMakerTier;
  /** Typical sector / firm type */
  sector: string;
  /** One-line decision logic — what they actually optimize for */
  decisionLogic: string;
  /** The pain point we relieve — surface this in outreach */
  painPoint: string;
  /** The GreenChainz hook to lead with */
  hook: string;
  /** Signals scrapers should look for to tag a person as this role */
  dataSignals: string[];
  /** Primary sustainability drivers relevant to this role */
  drivers: SustainabilityDriver[];
  /** Example job titles — use for LinkedIn / scraper title matching */
  exampleTitles?: string[];
}

export const DECISION_MAKER_ROLES: DecisionMakerRole[] = [
  // Tier I - Design Authorities
  {
    title: "Architect of Record",
    tier: DecisionMakerTier.DesignAuthority,
    sector: "Commercial Architecture",
    decisionLogic: "Liability and code compliance (fire, thermal, IECC).",
    painPoint: "Litigation risk from material failure; sick-building claims.",
    hook: "Low-VOC, fire-safe, non-combustible materials with testing docs attached.",
    dataSignals: ["building permit filings", "fire code certifications", "IECC compliance"],
    drivers: ["Liability", "CodeCompliance", "Health"],
    exampleTitles: ["Architect of Record", "Project Architect", "Principal Architect", "Licensed Architect"],
  },
  {
    title: "Specification Writer",
    tier: DecisionMakerTier.DesignAuthority,
    sector: "Large Architecture Firms (Gensler, HOK, AECOM)",
    decisionLogic: "Defensibility via rigorous data; prevent VE substitution.",
    painPoint: "Value Engineering cuts premium sustainable specs.",
    hook: "Data-backed specs (ASTM, ISO, LCA, EPD); No Substitution clauses.",
    dataSignals: ["CSI specifications", "EPD databases", "material testing standards"],
    drivers: ["Liability", "Certification"],
    exampleTitles: ["Spec Writer", "Specifications Manager", "CSI Certified Specifier", "Director of Specifications"],
  },
  {
    title: "LEED AP / Sustainability Consultant",
    tier: DecisionMakerTier.DesignAuthority,
    sector: "Design/Consulting",
    decisionLogic: "Points-system certification (LEED, BREEAM, WELL).",
    painPoint: "Missed cert target reduces fee and reputation.",
    hook: "Materials with EPD/HPD/sourcing docs; third-party verified.",
    dataSignals: ["LEED project registrations", "credit achievement tracking"],
    drivers: ["Certification", "Brand"],
    exampleTitles: ["LEED AP", "Sustainability Consultant", "WELL AP", "Green Building Advisor"],
  },
  {
    title: "Interior Designer (Commercial)",
    tier: DecisionMakerTier.DesignAuthority,
    sector: "Corporate Real Estate, HQs",
    decisionLogic: "Occupant health, productivity, 15-year churn cycles.",
    painPoint: "Talent attrition from unhealthy workplaces.",
    hook: "Antimicrobial textiles, biophilic elements, PET felt acoustics.",
    dataSignals: ["furniture specs", "tenant fit-out cycles"],
    drivers: ["Health", "TalentRetention"],
    exampleTitles: ["Interior Designer", "Senior Interior Designer", "Workplace Strategist"],
  },
  {
    title: "Landscape Architect",
    tier: DecisionMakerTier.DesignAuthority,
    sector: "Site Development",
    decisionLogic: "Stormwater management; heat-island ordinances.",
    painPoint: "Municipal stormwater fees; reflectivity codes.",
    hook: "Permeable pavers, recycled aggregate, light-colored hardscape.",
    dataSignals: ["municipal stormwater permits", "reflectivity ordinances"],
    drivers: ["CodeCompliance", "OpEx"],
    exampleTitles: ["Landscape Architect", "Site Designer"],
  },
  // Tier II - Financial Gatekeepers
  {
    title: "Quantity Surveyor / Cost Consultant",
    tier: DecisionMakerTier.FinancialGatekeeper,
    sector: "UK / Commonwealth / Major Intl",
    decisionLogic: "Whole Life Costing, NPV, and carbon budget.",
    painPoint: "First-cost bias; carbon regulation can exceed project carbon cap.",
    hook: "High-perf sustainable glazing, durable roofs with 7-30 yr payback.",
    dataSignals: ["cost models", "LCA outputs", "carbon budget frameworks"],
    drivers: ["OpEx", "CodeCompliance"],
    exampleTitles: ["Quantity Surveyor", "Cost Consultant", "Cost Manager"],
  },
  {
    title: "Value Engineer",
    tier: DecisionMakerTier.FinancialGatekeeper,
    sector: "GCs, Design-Build",
    decisionLogic: "Function/cost; system deletion; multifunctionality.",
    painPoint: "Inefficient system redundancy; labor overhead.",
    hook: "Sustainable materials that simplify install or eliminate trades.",
    dataSignals: ["constructability studies", "labor breakdowns"],
    drivers: ["OpEx", "Schedule"],
    exampleTitles: ["Value Engineer", "VE Lead", "Cost Engineer"],
  },
  {
    title: "Insurance Risk Manager / Underwriter",
    tier: DecisionMakerTier.FinancialGatekeeper,
    sector: "Insurance",
    decisionLogic: "Loss prevention, resilience, climate risk.",
    painPoint: "Mold/fire/weather claims; carbon-heavy buildings face premium penalties.",
    hook: "Fire-resistant mass timber, mold-resistant drywall, mineral wool.",
    dataSignals: ["insurance loss history", "climate exposure ratings"],
    drivers: ["RiskMitigation", "Safety"],
    exampleTitles: ["Underwriter", "Risk Manager", "Property Underwriter"],
  },
  {
    title: "Asset Manager (Real Estate)",
    tier: DecisionMakerTier.FinancialGatekeeper,
    sector: "Real Estate Portfolio Management",
    decisionLogic: "Liquidity and stranded-asset prevention.",
    painPoint: "Buildings become obsolete under NYC LL97 and similar regs.",
    hook: "Retrofits that prevent buildings from being legally locked out of sale.",
    dataSignals: ["energy audits", "ESG mandates", "code-compliance tracking"],
    drivers: ["Liquidity", "RiskMitigation"],
    exampleTitles: ["Asset Manager", "Portfolio Manager", "Director of Asset Management"],
  },
  {
    title: "Real Estate Appraiser / Valuer",
    tier: DecisionMakerTier.FinancialGatekeeper,
    sector: "RE Appraisal",
    decisionLogic: "Cap rate, NOI uplift from lower utilities.",
    painPoint: "Developer can't justify green capex without valuation uplift.",
    hook: "Green cert increases cap rate; higher NOI justifies premium.",
    dataSignals: ["comparable valuations", "NOI data", "energy bill benchmarks"],
    drivers: ["Liquidity", "OpEx"],
    exampleTitles: ["Appraiser", "MAI", "Commercial Valuer"],
  },
  // Tier III - Execution Tier
  {
    title: "Project Manager (GC)",
    tier: DecisionMakerTier.Execution,
    sector: "General Contractors",
    decisionLogic: "Schedule, logistics, safety, waste diversion.",
    painPoint: "Workers' comp from toxins; waste mgmt cost.",
    hook: "Low-VOC fast-install materials; take-back programs.",
    dataSignals: ["OSHA records", "waste diversion metrics"],
    drivers: ["Schedule", "Safety"],
    exampleTitles: ["Project Manager", "Senior PM", "Construction Manager"],
  },
  {
    title: "Subcontractor — Drywall/Framing",
    tier: DecisionMakerTier.Execution,
    sector: "Drywall + Framing",
    decisionLogic: "Labor productivity, ergonomics, callback reduction.",
    painPoint: "Callback rework is unpaid.",
    hook: "Lightweight sustainable drywall, low-dust compounds.",
    dataSignals: ["weight specs", "productivity benchmarks", "warranty claims"],
    drivers: ["Schedule", "Safety"],
    exampleTitles: ["Drywall Foreman", "Framing Lead", "Subcontractor Estimator"],
  },
  {
    title: "Subcontractor — Flooring",
    tier: DecisionMakerTier.Execution,
    sector: "Flooring",
    decisionLogic: "Moisture mitigation, bond failure, adhesive-free install.",
    painPoint: "Moisture-destroyed bonds; toxic fume disruption.",
    hook: "Breathable flooring, loose-lay LVT, polished concrete.",
    dataSignals: ["moisture protocols", "adhesive compatibility"],
    drivers: ["Safety", "OpEx"],
    exampleTitles: ["Flooring Contractor", "Flooring Installer"],
  },
  {
    title: "Subcontractor — Concrete",
    tier: DecisionMakerTier.Execution,
    sector: "Concrete",
    decisionLogic: "Workability, cure time, labor efficiency during pour.",
    painPoint: "Pump failure, poor flow = labor cost overruns.",
    hook: "Low-carbon mixes (fly ash, slag) with better workability.",
    dataSignals: ["mix designs", "strength tests", "carbon factors"],
    drivers: ["Schedule", "OpEx"],
    exampleTitles: ["Concrete Foreman", "Finisher", "Pour Supervisor"],
  },
  {
    title: "Procurement Specialist / Purchasing Agent",
    tier: DecisionMakerTier.Execution,
    sector: "Large Construction Firms",
    decisionLogic: "Volume leverage, supply chain security, price volatility resilience.",
    painPoint: "Supply chain disruption, tariffs, delivery delays.",
    hook: "Locally sourced sustainable + LEED regional credit combo.",
    dataSignals: ["supply chain maps", "sourcing data", "delivery schedules"],
    drivers: ["SupplyChain", "OpEx"],
    exampleTitles: ["Procurement Specialist", "Purchasing Agent", "Buyer"],
  },
  {
    title: "Superintendent",
    tier: DecisionMakerTier.Execution,
    sector: "Construction Management",
    decisionLogic: "Defect reduction, site execution.",
    painPoint: "Material breakage, warping, punch-list rework.",
    hook: "Sustainable composite lumber — straight and consistent.",
    dataSignals: ["quality reports", "defect logs"],
    drivers: ["Schedule", "OpEx"],
    exampleTitles: ["Superintendent", "Site Super", "General Superintendent"],
  },
  // Tier IV - Operational Stewards
  {
    title: "Facility Manager",
    tier: DecisionMakerTier.Operational,
    sector: "FM",
    decisionLogic: "TCO, maintenance cycles, cleaning chemical labor.",
    painPoint: "Frequent replacement; maintenance labor budget.",
    hook: "Durable flooring (terrazzo, rubber), polished concrete; retro-commissioning.",
    dataSignals: ["maintenance cost data", "utility bills", "equipment lifecycle"],
    drivers: ["OpEx", "RiskMitigation"],
    exampleTitles: ["Facility Manager", "Director of Facilities", "FM Director"],
  },
  {
    title: "Director of Workplace Experience",
    tier: DecisionMakerTier.Operational,
    sector: "Tech/Corp HQs",
    decisionLogic: "Friction reduction, retention vs. WFH.",
    painPoint: "Top-talent turnover.",
    hook: "Sustainable furniture, air purification, biophilic walls.",
    dataSignals: ["retention metrics", "satisfaction surveys"],
    drivers: ["TalentRetention", "Health"],
    exampleTitles: ["Workplace Experience Director", "Head of Workplace"],
  },
  {
    title: "Energy Manager",
    tier: DecisionMakerTier.Operational,
    sector: "Facilities Engineering",
    decisionLogic: "kWh reduction, peak demand, ECM ROI.",
    painPoint: "Peak AC loads drive demand charges.",
    hook: "Smart glass, insulation retrofits, LEDs, phase-change materials.",
    dataSignals: ["energy data", "demand charges", "ECM ROI"],
    drivers: ["OpEx"],
    exampleTitles: ["Energy Manager", "Energy Engineer"],
  },
  {
    title: "Cleaning / Env Services Manager",
    tier: DecisionMakerTier.Operational,
    sector: "Housekeeping",
    decisionLogic: "Hygiene, staff health, turnover, chemical storage.",
    painPoint: "Respiratory injury claims; staff turnover.",
    hook: "Green cleaning (electrolyzed water, microfiber).",
    dataSignals: ["chemical inventory", "worker comp injuries"],
    drivers: ["Health", "Safety"],
    exampleTitles: ["Environmental Services Manager", "Housekeeping Director"],
  },
  // Tier V - Strategic
  {
    title: "Chief Sustainability Officer",
    tier: DecisionMakerTier.Strategic,
    sector: "C-Suite",
    decisionLogic: "Corporate strategy, ESG reporting, Scope 3.",
    painPoint: "Stock threatened by poor ESG perception.",
    hook: "Mandate: LEED Gold; push procurement to low-carbon concrete/steel.",
    dataSignals: ["ESG scorecards", "GRI metrics", "carbon accounting"],
    drivers: ["Brand", "RiskMitigation"],
    exampleTitles: ["Chief Sustainability Officer", "CSO", "VP Sustainability"],
  },
  {
    title: "Chief People Officer / CHRO",
    tier: DecisionMakerTier.Strategic,
    sector: "HR",
    decisionLogic: "War for talent, cognitive productivity.",
    painPoint: "Gen Z / Millennial sensitivity; cognitive impact of VOCs.",
    hook: "Reject off-gassing materials; support sustainable upgrades.",
    dataSignals: ["recruitment metrics", "cognitive productivity studies"],
    drivers: ["TalentRetention", "Health"],
    exampleTitles: ["CHRO", "Chief People Officer", "VP People"],
  },
  {
    title: "Chief Procurement Officer",
    tier: DecisionMakerTier.Strategic,
    sector: "Enterprise Procurement",
    decisionLogic: "Supply chain resilience, ethical sourcing, TCO.",
    painPoint: "Forced labor / environmental disasters in supply chain.",
    hook: "Chain-of-custody suppliers (FSC wood, etc.).",
    dataSignals: ["supply chain audits", "chain-of-custody certs"],
    drivers: ["SupplyChain", "Brand"],
    exampleTitles: ["CPO", "Chief Procurement Officer", "VP Procurement"],
  },
  {
    title: "Chief Marketing Officer / Brand Director",
    tier: DecisionMakerTier.Strategic,
    sector: "Retail / Consumer Brands",
    decisionLogic: "Brand narrative, cognitive dissonance avoidance.",
    painPoint: "Customer trust loss if brand contradicts store environment.",
    hook: "Specify recycled materials in store design to match campaign.",
    dataSignals: ["brand guidelines", "store design specs"],
    drivers: ["Brand"],
    exampleTitles: ["CMO", "Brand Director", "Head of Retail Design"],
  },
  // Tier VI - Sector-Specific
  {
    title: "Infection Control Officer",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Healthcare",
    decisionLogic: "Pathogen reservoirs, sterilization, HAI prevention.",
    painPoint: "HAI penalties, patient safety liability.",
    hook: "Seamless non-porous sustainable flooring (natural rubber, bio-based).",
    dataSignals: ["HAI incidence data", "porosity testing"],
    drivers: ["Safety", "RiskMitigation"],
    exampleTitles: ["Infection Control Officer", "ICP", "Infection Preventionist"],
  },
  {
    title: "Hospital Administrator",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Healthcare",
    decisionLogic: "HCAHPS scores, Medicare reimbursement.",
    painPoint: "HCAHPS directly affects reimbursement.",
    hook: "Acoustic sustainable ceiling tiles improve patient satisfaction.",
    dataSignals: ["HCAHPS scores", "Medicare formulas"],
    drivers: ["OpEx", "Brand"],
    exampleTitles: ["Hospital Administrator", "CEO Hospital", "COO Healthcare"],
  },
  {
    title: "University Campus Planner",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Higher Ed",
    decisionLogic: "100-year campus lifecycle, student activism.",
    painPoint: "Divestment pressure; legacy cost.",
    hook: "Durability-as-sustainability; slate, stone, thermal mass.",
    dataSignals: ["campus master plans", "divestment campaigns"],
    drivers: ["Brand", "Liability"],
    exampleTitles: ["Campus Planner", "University Architect", "Director of Capital Planning"],
  },
  {
    title: "Store Planning Director",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Multi-Unit Retail",
    decisionLogic: "Rollout efficiency; circular fixture economy.",
    painPoint: "Fixture replacement every 5yrs = landfill cost.",
    hook: "Modular reusable fixture systems.",
    dataSignals: ["rollout schedules", "fixture cost data"],
    drivers: ["OpEx", "Scale"],
    exampleTitles: ["Store Planning Director", "VP Store Design"],
  },
  {
    title: "Visual Merchandising Director",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Retail Displays",
    decisionLogic: "Instagram aesthetic, disposal cost.",
    painPoint: "Styrofoam/PVC disposal across thousands of stores.",
    hook: "Recycled cardboard, biodegradable props.",
    dataSignals: ["display turnover", "disposal costs"],
    drivers: ["OpEx", "Brand"],
    exampleTitles: ["VM Director", "Visual Merchandising Lead"],
  },
  {
    title: "Affordable Housing Developer",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "RE Development",
    decisionLogic: "OpEx vs. development cost; Utility Allowance.",
    painPoint: "Thin margins; UA reduces rent capture in LIHTC.",
    hook: "Passive House lowers UA, enables higher rents.",
    dataSignals: ["LIHTC rent caps", "UA formulas"],
    drivers: ["OpEx"],
    exampleTitles: ["Affordable Housing Developer", "LIHTC Developer"],
  },
  {
    title: "Leasing Agent / Broker",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Commercial RE",
    decisionLogic: "Time on market, lease velocity, Class A mandates.",
    painPoint: "Slow lease-up; green mandates.",
    hook: "Sustainable finishes = 6-mo faster lease, 15% premium rent.",
    dataSignals: ["lease-up timelines", "rent premiums"],
    drivers: ["Liquidity", "Brand"],
    exampleTitles: ["Leasing Agent", "Commercial Broker"],
  },
  {
    title: "Owner's Representative",
    tier: DecisionMakerTier.SectorSpecific,
    sector: "Project Management",
    decisionLogic: "Fiduciary; protect specs from VE.",
    painPoint: "Contractor cuts green specs to save money.",
    hook: "Firewall against VE cuts; champion green-roof specs.",
    dataSignals: ["change orders", "sustainability mandates"],
    drivers: ["Liability", "Certification"],
    exampleTitles: ["Owner's Representative", "Owner's Rep", "Program Manager"],
  },
  // Tier VII - Supply Chain
  {
    title: "Distributor / Wholesaler — Branch Manager",
    tier: DecisionMakerTier.SupplyChain,
    sector: "Building Material Distribution",
    decisionLogic: "Inventory turns, margin, LEED doc ease.",
    painPoint: "Dead stock; GC calls for missing LEED forms.",
    hook: "Stock easy-doc sustainable materials; upsell from counter.",
    dataSignals: ["SKU turnover", "LEED doc workflows"],
    drivers: ["OpEx", "Certification"],
    exampleTitles: ["Branch Manager", "Regional Manager Distribution"],
  },
  {
    title: "Franchisee (Small Business Owner)",
    tier: DecisionMakerTier.SupplyChain,
    sector: "Franchise QSR/Retail",
    decisionLogic: "CapEx vs. OpEx; payback <2yr.",
    painPoint: "Corporate specs, franchisee pays; ROI sensitivity.",
    hook: "Efficient equipment with <2yr payback.",
    dataSignals: ["payback calc data", "franchise capex"],
    drivers: ["OpEx"],
    exampleTitles: ["Franchisee", "Franchise Owner"],
  },
  // Tier VIII - Hidden Influencers
  {
    title: "Municipal / Gov Procurement Officer",
    tier: DecisionMakerTier.HiddenInfluencer,
    sector: "Government",
    decisionLogic: "Compliance, lowest responsible bidder, EPP mandates.",
    painPoint: "Audit risk, political fallout.",
    hook: "Cooperative Purchasing Contracts; EPP compliance box.",
    dataSignals: ["gov procurement mandates", "co-op contracts"],
    drivers: ["CodeCompliance", "RiskMitigation"],
    exampleTitles: ["Procurement Officer", "Purchasing Agent Municipal"],
  },
  {
    title: "Green Realtor / Green RE Agent",
    tier: DecisionMakerTier.HiddenInfluencer,
    sector: "Residential RE",
    decisionLogic: "Resale value storytelling; point-of-sale education.",
    painPoint: "Customer price resistance; agent education gap.",
    hook: "Educate buyer on premium value; validate at sale.",
    dataSignals: ["green home comps", "solar premiums"],
    drivers: ["Resale", "Brand"],
    exampleTitles: ["Green Realtor", "EcoBroker", "NAR GREEN Designee"],
  },
  {
    title: "Fire Marshal / Code Official",
    tier: DecisionMakerTier.HiddenInfluencer,
    sector: "Code Enforcement",
    decisionLogic: "Public safety approval, code compliance.",
    painPoint: "Material disapproval blocks the purchase.",
    hook: "Approve mass timber and advanced insulations with fire test certs.",
    dataSignals: ["code variance requests", "material approval logs"],
    drivers: ["Safety", "CodeCompliance"],
    exampleTitles: ["Fire Marshal", "Building Code Official", "Plans Examiner"],
  },
];

/** Helper: find a role by title (exact match, case-insensitive). */
export function findRole(title: string): DecisionMakerRole | undefined {
  const t = title.trim().toLowerCase();
  return DECISION_MAKER_ROLES.find((r) => r.title.toLowerCase() === t);
}

/** Helper: suggest roles from a freeform scraped title string. */
export function matchRoleFromTitle(rawTitle: string): DecisionMakerRole[] {
  const t = rawTitle.toLowerCase();
  return DECISION_MAKER_ROLES.filter((r) =>
    (r.exampleTitles || []).some((ex) => t.includes(ex.toLowerCase())) ||
    t.includes(r.title.toLowerCase())
  );
}

/** Helper: filter roles by tier. */
export function rolesByTier(tier: DecisionMakerTier): DecisionMakerRole[] {
  return DECISION_MAKER_ROLES.filter((r) => r.tier === tier);
}
