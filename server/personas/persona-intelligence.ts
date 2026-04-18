/**
 * GreenChainz — 7-Layer Procurement Persona Intelligence
 *
 * Source: "The Anatomy of Strategic Procurement" (internal dossier)
 * Principle: Decision-makers do NOT buy green to save the planet.
 * They buy green because the alternative is a quantifiable financial liability.
 * IDENTIFY THE FINANCIAL LEVER. SELL THE SOLUTION.
 *
 * This file is the single source of truth for persona data.
 * All outreach copy, scraping classification, and RFQ messaging
 * must be generated from these definitions — never from generic green messaging.
 */

export type PersonaId =
  | "DESIGN_AUTHORITY"
  | "FINANCIAL_GATEKEEPER"
  | "EXECUTION_TIER"
  | "OPERATIONAL_STEWARD"
  | "STRATEGIC_LEADERSHIP"
  | "SECTOR_VERTICAL"
  | "SUPPLY_CHAIN";

export type SubPersonaId =
  // Layer I
  | "ARCHITECT_OF_RECORD"
  | "SPECIFICATION_WRITER"
  | "LEED_AP_CONSULTANT"
  | "INTERIOR_DESIGNER"
  | "LANDSCAPE_ARCHITECT"
  // Layer II
  | "QUANTITY_SURVEYOR"
  | "VALUE_ENGINEER"
  | "APPRAISER"
  | "ASSET_MANAGER"
  | "INSURANCE_RISK_MANAGER"
  // Layer III
  | "PROJECT_MANAGER_GC"
  | "SUPERINTENDENT"
  | "DRYWALL_SUB"
  | "FLOORING_SUB"
  | "CONCRETE_SUB"
  // Layer IV
  | "FACILITY_MANAGER"
  | "CLEANING_MANAGER"
  | "ENERGY_MANAGER"
  // Layer V
  | "CHIEF_SUSTAINABILITY_OFFICER"
  | "CHIEF_PEOPLE_OFFICER"
  | "CHIEF_MARKETING_OFFICER"
  // Layer VI
  | "INFECTION_CONTROL_OFFICER"
  | "CAMPUS_PLANNER"
  | "RETAIL_MERCHANDISER"
  | "AFFORDABLE_HOUSING_DEVELOPER"
  | "LEASING_BROKER"
  // Layer VII
  | "DISTRIBUTOR"
  | "MUNICIPAL_PROCUREMENT"
  | "FIRE_MARSHAL";

export interface SubPersona {
  id: SubPersonaId;
  title: string;
  layer: PersonaId;
  /** The real financial/operational driver — never "saving the planet" */
  driver: string;
  /** The specific pain they are trying to eliminate */
  pain: string;
  /** The concrete solution GreenChainz delivers to this persona */
  keySolution: string;
  /** The exact language that resonates — use verbatim in copy */
  resonantLanguage: string[];
  /** Language to AVOID — will cause immediate disengagement */
  avoidLanguage: string[];
  /** Title keywords that identify this persona from scraped data */
  titleSignals: string[];
  /** Company/sector keywords that identify this persona */
  companySignals: string[];
}

export interface PersonaLayer {
  id: PersonaId;
  name: string;
  tagline: string;
  subPersonas: SubPersona[];
}

export const PERSONA_LAYERS: PersonaLayer[] = [
  {
    id: "DESIGN_AUTHORITY",
    name: "Layer I: Design Authorities",
    tagline: "Liability, Code, and Data",
    subPersonas: [
      {
        id: "ARCHITECT_OF_RECORD",
        layer: "DESIGN_AUTHORITY",
        title: "Architect of Record (AOR)",
        driver: "LIABILITY & COMPLIANCE",
        pain: "Toxic tort litigation exposure from non-compliant material specs. Urban fire codes requiring non-combustible assemblies.",
        keySolution: "Verified EPD data + fire-rated assembly specs that eliminate spec liability. Green = Legal Safety.",
        resonantLanguage: ["code-compliant", "non-combustible", "verified EPD", "defensible spec", "liability protection", "CDPH v1.2", "IBC compliant"],
        avoidLanguage: ["save the planet", "eco-friendly", "sustainable future", "green building"],
        titleSignals: ["architect", "AOR", "architect of record", "principal architect", "design architect", "licensed architect"],
        companySignals: ["architecture", "architects", "design firm", "AIA", "architectural"],
      },
      {
        id: "SPECIFICATION_WRITER",
        layer: "DESIGN_AUTHORITY",
        title: "Specification Writer",
        driver: "DEFENSIBILITY",
        pain: "Value engineering substitutions that undermine the design intent and create liability. Needs specs that cannot be easily swapped.",
        keySolution: "Proprietary-level spec language backed by verified performance data. Defensive specs that lock in compliant materials.",
        resonantLanguage: ["substitution resistance", "performance-based spec", "CDPH v1.2", "third-party verified", "no-substitution clause", "MasterSpec"],
        avoidLanguage: ["green alternative", "sustainable swap", "eco option"],
        titleSignals: ["specification writer", "specifier", "specs", "CSI", "construction specifications"],
        companySignals: ["architecture", "specification", "CSI", "design"],
      },
      {
        id: "LEED_AP_CONSULTANT",
        layer: "DESIGN_AUTHORITY",
        title: "LEED AP / Sustainability Consultant",
        driver: "THE POINT SYSTEM",
        pain: "Products without EPDs are useless for LEED/WELL credit documentation. Needs third-party verified data, not manufacturer claims.",
        keySolution: "1,500+ materials with verified EPD data, pre-mapped to LEED MRc4 and WELL credits. Instant credit documentation.",
        resonantLanguage: ["EPD verified", "LEED MRc4", "WELL credit", "EC3 compatible", "third-party verified", "credit documentation", "GWP data"],
        avoidLanguage: ["feel good", "brand story", "sustainability journey"],
        titleSignals: ["LEED AP", "sustainability consultant", "green building consultant", "WELL AP", "sustainability manager", "ESG consultant"],
        companySignals: ["sustainability", "green building", "LEED", "WELL", "consulting"],
      },
      {
        id: "INTERIOR_DESIGNER",
        layer: "DESIGN_AUTHORITY",
        title: "Interior Designer",
        driver: "OCCUPANT HEALTH & PRODUCTIVITY",
        pain: "Post-pandemic return-to-office mandates. Needs materials that demonstrably improve cognitive function and reduce VOC exposure.",
        keySolution: "Low-VOC verified materials with acoustic performance data. Locking in a sustainable spec guarantees volume purchasing for 15 years.",
        resonantLanguage: ["low-VOC", "WELL certified", "acoustic performance", "cognitive productivity", "biophilic", "occupant health", "CDPH compliant"],
        avoidLanguage: ["green", "eco", "sustainable aesthetic"],
        titleSignals: ["interior designer", "interior design", "ID", "space planner", "workplace designer", "FF&E"],
        companySignals: ["interior design", "interiors", "workplace", "commercial design"],
      },
      {
        id: "LANDSCAPE_ARCHITECT",
        layer: "DESIGN_AUTHORITY",
        title: "Landscape Architect",
        driver: "STORMWATER FEES",
        pain: "Municipal stormwater runoff fees and expensive underground retention tank requirements.",
        keySolution: "Permeable paver and high-albedo hardscape specs that satisfy Heat Island ordinances and eliminate retention tank costs.",
        resonantLanguage: ["stormwater compliance", "permeable pavers", "heat island ordinance", "runoff fee avoidance", "LEED SSc", "municipal compliance"],
        avoidLanguage: ["natural", "organic", "green space"],
        titleSignals: ["landscape architect", "landscape designer", "site designer", "ASLA"],
        companySignals: ["landscape", "site design", "land planning"],
      },
    ],
  },
  {
    id: "FINANCIAL_GATEKEEPER",
    name: "Layer II: Financial Gatekeepers",
    tagline: "Validating the Green Premium",
    subPersonas: [
      {
        id: "QUANTITY_SURVEYOR",
        layer: "FINANCIAL_GATEKEEPER",
        title: "Quantity Surveyor (QS) / Cost Manager",
        driver: "WHOLE LIFE COSTING (WLC)",
        pain: "First-cost bias from project owners. Cannot justify green premium without lifecycle cost data showing payback period.",
        keySolution: "WLC/ROI data showing that a 20% premium on glazing saves money in 7 years via reduced HVAC tonnage. Carbon accounting built in.",
        resonantLanguage: ["whole life cost", "WLC", "lifecycle ROI", "payback period", "HVAC tonnage reduction", "carbon accounting", "first cost vs. total cost"],
        avoidLanguage: ["premium materials", "invest in the future", "green premium"],
        titleSignals: ["quantity surveyor", "QS", "cost manager", "cost consultant", "estimator", "cost planner"],
        companySignals: ["cost consulting", "quantity surveying", "project management", "RICS"],
      },
      {
        id: "VALUE_ENGINEER",
        layer: "FINANCIAL_GATEKEEPER",
        title: "Value Engineer (VE)",
        driver: "SYSTEM DELETION / REDUNDANCY ELIMINATION",
        pain: "Pressure to cut costs by eliminating systems. Champions materials that replace multiple trades.",
        keySolution: "Structural Insulated Panels (SIPs) and similar multi-function assemblies that replace framing + insulation + sheathing, reducing labor and schedule.",
        resonantLanguage: ["system consolidation", "trade elimination", "SIP", "multi-function assembly", "labor reduction", "schedule compression"],
        avoidLanguage: ["premium", "upgrade", "additional cost"],
        titleSignals: ["value engineer", "VE", "value engineering", "cost reduction", "constructability"],
        companySignals: ["construction management", "CM", "general contractor", "owner's rep"],
      },
      {
        id: "APPRAISER",
        layer: "FINANCIAL_GATEKEEPER",
        title: "Real Estate Appraiser",
        driver: "VALUATION & CAP RATES",
        pain: "Cannot justify green premium in appraisal without NOI data. Lower utility bills = higher NOI = higher building valuation.",
        keySolution: "Performance data showing lower utility bills driving higher Net Operating Income, enabling developers to finance the green premium.",
        resonantLanguage: ["NOI improvement", "cap rate", "building valuation", "utility cost reduction", "asset value", "green premium financing"],
        avoidLanguage: ["sustainability", "environmental", "green"],
        titleSignals: ["appraiser", "MAI", "real estate appraiser", "valuation", "CBRE", "JLL"],
        companySignals: ["appraisal", "valuation", "real estate", "CBRE", "JLL", "Cushman"],
      },
      {
        id: "ASSET_MANAGER",
        layer: "FINANCIAL_GATEKEEPER",
        title: "Asset Manager",
        driver: "AVOIDING STRANDED ASSETS",
        pain: "Buildings becoming legally obsolete (Local Law 97, EU taxonomy) or financially obsolete to ESG investors. 5-10 year exit strategy horizon.",
        keySolution: "Materials and retrofit specs that prevent stranded asset risk. ESG compliance documentation for investor reporting.",
        resonantLanguage: ["stranded asset risk", "Local Law 97", "ESG compliance", "retrofit mandate", "asset obsolescence", "investor reporting", "decarbonization roadmap"],
        avoidLanguage: ["green", "sustainable", "eco"],
        titleSignals: ["asset manager", "portfolio manager", "real estate investment", "REIT", "fund manager"],
        companySignals: ["asset management", "real estate investment", "REIT", "private equity", "fund"],
      },
      {
        id: "INSURANCE_RISK_MANAGER",
        layer: "FINANCIAL_GATEKEEPER",
        title: "Insurance Risk Manager",
        driver: "LOSS PREVENTION",
        pain: "Premium exposure from fire, moisture, and structural risk. Mass timber chars and self-extinguishes — lower claims risk.",
        keySolution: "Fire performance data for mass timber and non-combustible assemblies. Green = Safe = Lower Premiums.",
        resonantLanguage: ["fire resistance", "loss prevention", "char layer", "non-combustible", "premium reduction", "resilience data", "UL listed"],
        avoidLanguage: ["sustainable", "eco-friendly", "green building"],
        titleSignals: ["risk manager", "insurance", "loss prevention", "underwriter", "risk analyst"],
        companySignals: ["insurance", "risk management", "underwriting", "Marsh", "Aon"],
      },
    ],
  },
  {
    id: "EXECUTION_TIER",
    name: "Layer III: Execution Tier",
    tagline: "Speed, Safety, and Logistics",
    subPersonas: [
      {
        id: "PROJECT_MANAGER_GC",
        layer: "EXECUTION_TIER",
        title: "Project Manager / General Contractor",
        driver: "SCHEDULE & LOGISTICS",
        pain: "Site shutdowns for ventilation (solvent-based products). Dumpster logistics and landfill diversion mandate fines.",
        keySolution: "Low-VOC water-based products that avoid site shutdowns. Suppliers with Take-Back Programs to solve waste logistics.",
        resonantLanguage: ["no site shutdown", "low-VOC", "take-back program", "landfill diversion", "schedule protection", "logistics hub", "waste compliance"],
        avoidLanguage: ["green", "sustainable", "eco-friendly"],
        titleSignals: ["project manager", "PM", "general contractor", "GC", "construction manager", "site manager", "superintendent"],
        companySignals: ["general contractor", "construction", "GC", "builder", "ENR 400"],
      },
      {
        id: "SUPERINTENDENT",
        layer: "EXECUTION_TIER",
        title: "Superintendent",
        driver: "DEFECT REDUCTION",
        pain: "Natural wood warping causing punch-list labor hours and callbacks. Needs consistent, predictable materials.",
        keySolution: "Composite lumber and engineered wood products with consistent performance. Fewer punch-list items = direct labor savings.",
        resonantLanguage: ["punch-list reduction", "consistent performance", "no warping", "engineered wood", "composite lumber", "callback prevention"],
        avoidLanguage: ["natural", "organic", "sustainable"],
        titleSignals: ["superintendent", "super", "field manager", "foreman"],
        companySignals: ["construction", "general contractor", "builder"],
      },
      {
        id: "DRYWALL_SUB",
        layer: "EXECUTION_TIER",
        title: "Drywall Subcontractor",
        driver: "FATIGUE REDUCTION",
        pain: "Labor is the highest cost. Heavy board = crew fatigue = fewer boards hung per day = higher labor cost.",
        keySolution: "Lightweight sustainable board that lets crews hang more per day with less fatigue. Direct labor cost reduction.",
        resonantLanguage: ["lightweight board", "crew productivity", "boards per day", "fatigue reduction", "labor savings", "installation speed"],
        avoidLanguage: ["sustainable", "green", "eco"],
        titleSignals: ["drywall", "wallboard", "gypsum", "plastering"],
        companySignals: ["drywall", "wallboard", "gypsum", "interior systems"],
      },
      {
        id: "FLOORING_SUB",
        layer: "EXECUTION_TIER",
        title: "Flooring Subcontractor",
        driver: "MOISTURE MITIGATION",
        pain: "Adhesive failure from wet concrete slabs causing callbacks and warranty claims.",
        keySolution: "Breathable or loose-lay sustainable flooring systems that tolerate moisture without adhesive failure.",
        resonantLanguage: ["moisture tolerance", "loose-lay system", "no adhesive failure", "callback prevention", "breathable flooring", "slab moisture"],
        avoidLanguage: ["eco", "sustainable", "green flooring"],
        titleSignals: ["flooring", "floor installer", "carpet", "resilient flooring", "LVT"],
        companySignals: ["flooring", "carpet", "resilient", "floor covering"],
      },
      {
        id: "CONCRETE_SUB",
        layer: "EXECUTION_TIER",
        title: "Concrete Subcontractor",
        driver: "WORKABILITY",
        pain: "Low-carbon mixes with poor flow properties causing labor slowdowns during the pour.",
        keySolution: "Low-carbon mixes with fly ash that have better flow properties, saving labor during the pour.",
        resonantLanguage: ["workability", "flow properties", "fly ash", "pour efficiency", "labor savings", "low-carbon mix"],
        avoidLanguage: ["green concrete", "sustainable mix", "eco concrete"],
        titleSignals: ["concrete", "ready-mix", "cement", "flatwork", "foundation"],
        companySignals: ["concrete", "ready-mix", "cement", "masonry"],
      },
    ],
  },
  {
    id: "OPERATIONAL_STEWARD",
    name: "Layer IV: Operational Stewards",
    tagline: "Total Cost of Ownership (TCO)",
    subPersonas: [
      {
        id: "FACILITY_MANAGER",
        layer: "OPERATIONAL_STEWARD",
        title: "Facility Manager (FM)",
        driver: "DURABILITY / OPEX REDUCTION",
        pain: "VCT flooring requiring constant waxing/stripping = overtime labor. Hates high-maintenance finishes.",
        keySolution: "Polished concrete and durable finishes requiring water-only cleaning. Green = less overtime labor.",
        resonantLanguage: ["no waxing", "no stripping", "water-only maintenance", "durability", "OpEx reduction", "maintenance-free", "polished concrete"],
        avoidLanguage: ["sustainable", "green", "eco-friendly"],
        titleSignals: ["facility manager", "FM", "facilities director", "building manager", "property manager", "IFMA"],
        companySignals: ["facilities management", "property management", "FM", "CBRE", "JLL", "Cushman"],
      },
      {
        id: "CLEANING_MANAGER",
        layer: "OPERATIONAL_STEWARD",
        title: "Cleaning / Janitorial Manager",
        driver: "STAFF HEALTH",
        pain: "Respiratory injury claims from harsh cleaning chemicals. High janitorial turnover from chemical exposure.",
        keySolution: "Green Cleaning (electrolyzed water) compatible surfaces that reduce respiratory claims and janitorial turnover.",
        resonantLanguage: ["respiratory claim reduction", "green cleaning compatible", "electrolyzed water", "staff health", "turnover reduction", "OSHA compliance"],
        avoidLanguage: ["eco-friendly cleaning", "sustainable janitorial"],
        titleSignals: ["cleaning manager", "janitorial", "housekeeping", "environmental services", "custodial"],
        companySignals: ["cleaning services", "janitorial", "facilities", "environmental services"],
      },
      {
        id: "ENERGY_MANAGER",
        layer: "OPERATIONAL_STEWARD",
        title: "Energy Manager",
        driver: "PEAK DEMAND REDUCTION",
        pain: "Peak AC load demand charges on utility bills. Needs materials that reduce peak energy consumption.",
        keySolution: "Phase Change Materials (PCM) and high-performance insulation that passively cool buildings and lower peak AC loads. ROI on kWh reductions.",
        resonantLanguage: ["peak demand reduction", "demand charge savings", "phase change materials", "passive cooling", "kWh ROI", "utility bill reduction", "ASHRAE compliance"],
        avoidLanguage: ["green energy", "sustainable", "eco"],
        titleSignals: ["energy manager", "energy engineer", "sustainability manager", "utilities manager", "MEP"],
        companySignals: ["energy management", "utilities", "MEP", "building systems"],
      },
    ],
  },
  {
    id: "STRATEGIC_LEADERSHIP",
    name: "Layer V: Strategic Leadership",
    tagline: "Brand, ESG, and the War for Talent",
    subPersonas: [
      {
        id: "CHIEF_SUSTAINABILITY_OFFICER",
        layer: "STRATEGIC_LEADERSHIP",
        title: "Chief Sustainability Officer (CSO)",
        driver: "SCOPE 3 EMISSIONS / INVESTOR REPORTING",
        pain: "Investor reporting requirements for Scope 3 supply chain emissions. Low-carbon materials needed for Annual Report.",
        keySolution: "Verified EPD data mapped to Scope 3 categories. Supply chain carbon accounting for investor-grade reporting.",
        resonantLanguage: ["Scope 3 emissions", "supply chain carbon", "investor reporting", "Annual Report", "GHG Protocol", "SBTi", "carbon accounting", "Buy Clean"],
        avoidLanguage: ["feel good", "brand story", "green washing"],
        titleSignals: ["CSO", "chief sustainability officer", "VP sustainability", "sustainability director", "ESG director", "ESG manager"],
        companySignals: ["sustainability", "ESG", "corporate responsibility", "Fortune 500"],
      },
      {
        id: "CHIEF_PEOPLE_OFFICER",
        layer: "STRATEGIC_LEADERSHIP",
        title: "Chief People Officer (CHRO)",
        driver: "COGNITIVE PRODUCTIVITY / GEN Z RECRUITMENT",
        pain: "Return-to-office resistance from Gen Z talent. Needs to demonstrate that the physical workspace supports cognitive function.",
        keySolution: "Low-VOC, biophilic, and acoustic materials with WELL certification data. Green building conditions = higher cognitive function = talent retention.",
        resonantLanguage: ["WELL certified", "cognitive productivity", "talent retention", "Gen Z recruitment", "low-VOC workspace", "occupant wellbeing", "return to office"],
        avoidLanguage: ["sustainable office", "green workplace", "eco-friendly"],
        titleSignals: ["CHRO", "chief people officer", "VP HR", "HR director", "talent acquisition", "people operations"],
        companySignals: ["HR", "human resources", "people operations", "talent"],
      },
      {
        id: "CHIEF_MARKETING_OFFICER",
        layer: "STRATEGIC_LEADERSHIP",
        title: "Chief Marketing Officer (CMO)",
        driver: "COGNITIVE DISSONANCE / BRAND ALIGNMENT",
        pain: "Cannot sell organic/sustainable products from a building made of toxic materials. Brand promise must match the physical space.",
        keySolution: "Verified sustainable material specs that eliminate the cognitive dissonance between brand promise and physical reality.",
        resonantLanguage: ["brand alignment", "cognitive dissonance", "brand promise", "verified sustainable", "authentic sustainability", "greenwash risk"],
        avoidLanguage: ["eco-friendly", "green", "sustainable"],
        titleSignals: ["CMO", "chief marketing officer", "VP marketing", "brand director", "marketing director"],
        companySignals: ["marketing", "brand", "consumer goods", "retail", "CPG"],
      },
    ],
  },
  {
    id: "SECTOR_VERTICAL",
    name: "Layer VI: Sector Verticals",
    tagline: "Niche Experts with Sector-Specific Mandates",
    subPersonas: [
      {
        id: "INFECTION_CONTROL_OFFICER",
        layer: "SECTOR_VERTICAL",
        title: "Infection Control Officer (Healthcare)",
        driver: "PATHOGEN RESERVOIRS / HAI REDUCTION",
        pain: "Hospital Acquired Infections (HAIs) from porous materials like cork that harbor pathogens. Needs seamless, bleach-resistant surfaces.",
        keySolution: "Seamless, bio-based flooring that withstands bleach and UV-C cleaning. Rejects porous 'green' materials on clinical grounds.",
        resonantLanguage: ["HAI reduction", "seamless flooring", "bleach-resistant", "UV-C compatible", "pathogen control", "infection prevention", "ICRA compliant"],
        avoidLanguage: ["natural", "organic", "cork", "porous", "eco"],
        titleSignals: ["infection control", "ICO", "infection prevention", "clinical operations", "healthcare facilities"],
        companySignals: ["hospital", "healthcare", "medical center", "health system", "clinic"],
      },
      {
        id: "CAMPUS_PLANNER",
        layer: "SECTOR_VERTICAL",
        title: "Campus Planner (Higher Education)",
        driver: "THE 100-YEAR HORIZON / LONGEVITY",
        pain: "Universities hold land forever. Commercial durability standards are insufficient. Student activism demands verified sustainability.",
        keySolution: "Slate, stone, and thermal mass materials with 100-year durability data. Durability IS sustainability for this buyer.",
        resonantLanguage: ["100-year durability", "thermal mass", "longevity", "campus stewardship", "student activism", "endowment-grade", "lifecycle durability"],
        avoidLanguage: ["trendy", "modern", "innovative"],
        titleSignals: ["campus planner", "university architect", "facilities director", "capital projects", "higher education"],
        companySignals: ["university", "college", "higher education", "campus"],
      },
      {
        id: "RETAIL_MERCHANDISER",
        layer: "SECTOR_VERTICAL",
        title: "Retail Merchandiser",
        driver: "DISPOSAL COSTS",
        pain: "Landfilling Styrofoam and single-use props across 5,000 stores is astronomically expensive.",
        keySolution: "Recycled cardboard and take-back program materials that eliminate disposal costs at scale.",
        resonantLanguage: ["disposal cost elimination", "take-back program", "recycled content", "landfill cost", "store rollout", "SKU consolidation"],
        avoidLanguage: ["sustainable retail", "eco store", "green merchandising"],
        titleSignals: ["merchandiser", "visual merchandising", "VM", "retail design", "store design"],
        companySignals: ["retail", "merchandising", "store design", "visual merchandising"],
      },
      {
        id: "AFFORDABLE_HOUSING_DEVELOPER",
        layer: "SECTOR_VERTICAL",
        title: "Affordable Housing Developer",
        driver: "UTILITY ALLOWANCES",
        pain: "HUD utility allowance caps limit rent revenue. Lower utility bills (Passive House) allow charging higher rent under the cap.",
        keySolution: "Passive House-level insulation and window specs that lower utility bills, enabling higher rents within utility allowance caps.",
        resonantLanguage: ["utility allowance optimization", "Passive House", "HUD compliance", "rent maximization", "energy cost reduction", "LIHTC"],
        avoidLanguage: ["green affordable housing", "sustainable development", "eco housing"],
        titleSignals: ["affordable housing", "LIHTC", "HUD", "housing developer", "community development"],
        companySignals: ["affordable housing", "community development", "LIHTC", "HUD", "housing authority"],
      },
      {
        id: "LEASING_BROKER",
        layer: "SECTOR_VERTICAL",
        title: "Leasing Broker (Commercial Real Estate)",
        driver: "LEASE VELOCITY",
        pain: "Time is money. LEED/WELL finishes attract Class A tenants (Tech/Law firms) 6 months faster.",
        keySolution: "LEED/WELL certified material specs that enable faster lease-up of Class A space.",
        resonantLanguage: ["lease velocity", "Class A tenants", "6 months faster", "LEED certified space", "WELL certified", "tech tenant", "law firm tenant"],
        avoidLanguage: ["sustainable", "green", "eco-friendly space"],
        titleSignals: ["leasing broker", "commercial broker", "tenant rep", "CBRE", "JLL", "Cushman", "leasing agent"],
        companySignals: ["commercial real estate", "CRE", "brokerage", "CBRE", "JLL", "Cushman", "Colliers"],
      },
    ],
  },
  {
    id: "SUPPLY_CHAIN",
    name: "Layer VII: Supply Chain & Hidden Influencers",
    tagline: "Availability and Compliance",
    subPersonas: [
      {
        id: "DISTRIBUTOR",
        layer: "SUPPLY_CHAIN",
        title: "Distributor",
        driver: "INVENTORY TURNS / DEAD STOCK AVOIDANCE",
        pain: "Dead stock from slow-moving SKUs. Administrative burden of assembling LEED documentation for each project.",
        keySolution: "Multi-functional SKUs with 'ready-to-go' LEED documentation packages that reduce dead stock and admin burden.",
        resonantLanguage: ["ready-to-go LEED docs", "multi-functional SKU", "inventory turns", "dead stock reduction", "admin burden reduction", "documentation package"],
        avoidLanguage: ["sustainable product", "green SKU", "eco line"],
        titleSignals: ["distributor", "distribution", "wholesale", "supply", "purchasing manager", "procurement manager"],
        companySignals: ["distribution", "wholesale", "supply", "building products", "materials distributor"],
      },
      {
        id: "MUNICIPAL_PROCUREMENT",
        layer: "SUPPLY_CHAIN",
        title: "Municipal Procurement Officer",
        driver: "AUDIT SAFETY / LEGAL SAFETY",
        pain: "Fear of audit exposure. Must buy from Cooperative Purchasing Contracts (Sourcewell) to ensure legal defensibility.",
        keySolution: "Materials listed on Sourcewell or other cooperative purchasing contracts. Audit-safe procurement documentation.",
        resonantLanguage: ["Sourcewell listed", "cooperative purchasing", "audit-safe", "Buy Clean compliance", "public procurement", "legal defensibility", "cooperative contract"],
        avoidLanguage: ["innovative", "new", "cutting-edge", "startup"],
        titleSignals: ["procurement officer", "purchasing agent", "municipal buyer", "government procurement", "public works"],
        companySignals: ["city", "county", "municipality", "government", "public works", "state agency"],
      },
      {
        id: "FIRE_MARSHAL",
        layer: "SUPPLY_CHAIN",
        title: "Fire Marshal / AHJ",
        driver: "PUBLIC SAFETY / PERMIT GATEWAY",
        pain: "Mass timber and novel materials require acceptance of safety data before permits are issued. The ultimate purchasing gatekeeper.",
        keySolution: "Complete fire performance data packages for mass timber and non-combustible assemblies. Pre-accepted by major AHJs.",
        resonantLanguage: ["AHJ accepted", "fire performance data", "mass timber safety", "permit-ready", "UL listed", "IBC compliant", "fire test data"],
        avoidLanguage: ["innovative material", "new technology", "novel assembly"],
        titleSignals: ["fire marshal", "AHJ", "fire inspector", "building official", "code official", "fire prevention"],
        companySignals: ["fire department", "building department", "AHJ", "code enforcement"],
      },
    ],
  },
];

/** Flat map of all sub-personas for quick lookup */
export const ALL_SUB_PERSONAS: Record<SubPersonaId, SubPersona> =
  PERSONA_LAYERS.reduce(
    (acc, layer) => {
      layer.subPersonas.forEach((sp) => {
        acc[sp.id] = sp;
      });
      return acc;
    },
    {} as Record<SubPersonaId, SubPersona>
  );
