/**
 * GreenChainz Decision-Maker Role Configuration
 *
 * All 38 buyer-side roles across 7 procurement layers.
 * Drives the lead scraper (Bing queries), CRM categorization,
 * and the 3-step buyer drip email sequences.
 *
 * Source: H:/greenchainz-decision-maker-roles.csv
 */

export type ProcurementLayer =
  | "Design Authorities"
  | "Financial Gatekeepers"
  | "Execution Tier"
  | "Operational Stewards"
  | "Strategic Leadership"
  | "Sector Verticals"
  | "Supply Chain";

export interface EmailStep {
  subject: string;      // personalized at send time with {{company}}
  headline: string;
  body: string;
  bullets: string[];
  cta: string;
}

export interface RoleConfig {
  roleTitle: string;
  procurementLayer: ProcurementLayer;
  decisionDriver: string;
  engagementHook: string;
  purchaseVolume: "high" | "medium" | "low";
  hiddenGem: boolean;
  /** stored in crm_contacts.category */
  crmCategory: string;
  /** Bing search queries — appended with state at runtime */
  bingQueries: string[];
  steps: [EmailStep, EmailStep, EmailStep];
}

// ─── DESIGN AUTHORITIES ───────────────────────────────────────────────────────

const architectOfRecord: RoleConfig = {
  roleTitle: "Architect of Record (AOR)",
  procurementLayer: "Design Authorities",
  decisionDriver: "Liability & Code Compliance",
  engagementHook: "Lead with liability elimination and code compliance proof; provide Red List-free documentation; emphasize protection from Toxic Tort litigation",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "architect_aor",
  bingQueries: [
    "architect of record firm sustainable LEED",
    "licensed architect AOR building design firm",
  ],
  steps: [
    {
      subject: "{{company}}: the liability case for EPD-verified materials",
      headline: "Code compliance isn't the ceiling. It's the floor.",
      body: "Architect of Record liability is expanding. Toxic Tort claims, Red List enforcement, and Owner mandates for verified sustainability data are changing what it means to spec responsibly. GreenChainz gives you a searchable EPD database, instant compliance scoring, and documentation packages that hold up under scrutiny — before the project starts.",
      bullets: [
        "Red List-free confirmation on 50,000+ products in seconds",
        "LEED / Buy Clean / Title 24 compliance check embedded in every search",
        "Download-ready EPD + HPD packages for submittals",
        "Audit trail on every spec decision",
      ],
      cta: "Get Bulletproof Specs Free",
    },
    {
      subject: "The material that passed CA CDPH just failed your spec check",
      headline: "CDPH compliance ≠ Red List clean.",
      body: "Architects of Record are seeing more Owner-directed spec reviews — and increasingly, the documentation trail has gaps. GreenChainz cross-checks CDPH, Red List, EPD, and HPD data simultaneously so you know exactly what you're signing off on. Your E&O policy will thank you.",
      bullets: [
        "Simultaneous cross-check: CDPH + Red List + EPD + HPD",
        "Pre-formatted spec language included with every product",
        "Compliant substitute finder when a product fails",
      ],
      cta: "Run a Free Compliance Check",
    },
    {
      subject: "One last thing on sustainable material documentation",
      headline: "Your specs. Your signature. Make it defensible.",
      body: "We'll keep this short. If you ever need to defend a material spec in litigation, the question will be: what data did you have at the time of specification? GreenChainz documents that data trail automatically. Free to start — no commitment.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const projectArchitect: RoleConfig = {
  roleTitle: "Project Architect (PA)",
  procurementLayer: "Design Authorities",
  decisionDriver: "Liability & Code Compliance",
  engagementHook: "Same as AOR — position sustainable materials as risk-reduction tools not green choices; provide code-compliant spec language",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "architect_pa",
  bingQueries: [
    "project architect sustainable building design firm",
    "architecture firm LEED project architect",
  ],
  steps: [
    {
      subject: "{{company}}: spec the sustainable material — skip the liability",
      headline: "Sustainable materials aren't a choice anymore. They're a code issue.",
      body: "Project Architects are absorbing more spec responsibility as firms scale. Buy Clean compliance, LEED Material Credit documentation, and EPD verification are now standard Owner asks — and the documentation burden lands on your desk. GreenChainz automates the data layer so you can spec with confidence and move on.",
      bullets: [
        "Instant EPD lookup on 50,000+ building products",
        "Code-compliant spec language auto-generated with every product",
        "LEED / Buy Clean / Title 24 compliance status at a glance",
        "Works inside Revit, Excel, and your browser",
      ],
      cta: "Get Bulletproof Specs Free",
    },
    {
      subject: "The spec tool your firm's Specification Writer is already using",
      headline: "Your documentation burden just got a lot lighter.",
      body: "Specification Writers at firms using GreenChainz tell us the same thing: it cut their EPD documentation time by more than half. For Project Architects managing drawings and specs simultaneously, that means fewer late nights chasing product data. Give it 10 minutes — it's free.",
      bullets: [
        "Pre-formatted LEED Materials & Resources documentation",
        "Third-party verified data — no supplier PDFs to chase",
        "Substitution-ready alternatives when products are discontinued",
      ],
      cta: "Try It Free",
    },
    {
      subject: "Last note — EPD lookup tool for {{company}}",
      headline: "Free to start. Takes 5 minutes.",
      body: "We won't keep following up. If you ever need to pull verified EPD data, check compliance, or generate submittal documentation faster than the current process — GreenChainz is there.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const specificationWriter: RoleConfig = {
  roleTitle: "Specification Writer",
  procurementLayer: "Design Authorities",
  decisionDriver: "Defensibility & Data",
  engagementHook: "Supply complete third-party verified documentation; offer pre-written spec language and 'No Substitution' clause language; make documentation turnkey",
  purchaseVolume: "high",
  hiddenGem: true,
  crmCategory: "specification_writer",
  bingQueries: [
    "specification writer architecture firm CSI",
    "building specification consultant architect",
  ],
  steps: [
    {
      subject: "Pre-written spec language. Third-party verified. Ready to drop in.",
      headline: "Every spec you write should be bulletproof before it leaves your desk.",
      body: "Specification Writers carry the documentation burden for the whole project team. GreenChainz was built with that in mind: complete third-party verified EPD and HPD data, pre-written CSI-formatted spec language, and 'No Substitution' clause copy — ready to drop into your MasterSpec or SpecLink workflow.",
      bullets: [
        "CSI-formatted spec language generated with every product",
        "'No Substitution' clause language included",
        "ASTM / ISO test report data linked per product",
        "Chain-of-custody documentation for LEED MR credits",
        "California CDPH VOC compliance status pre-checked",
      ],
      cta: "Get Your First Spec Package Free",
    },
    {
      subject: "The 'No Substitution' clause that actually holds in VE",
      headline: "Documentation is your only defense against value engineering.",
      body: "Value Engineers cut what they can't defend. Specification Writers who use GreenChainz give the AOR and Owner's Rep the third-party verification and lifecycle data to kill substitution requests before they reach the job site. The documentation package is turnkey — no chasing suppliers.",
      bullets: [
        "Third-party verified data that survives VE review",
        "LCA data to back 'No Substitution' clauses",
        "Automated substitute finder showing no equivalent exists",
      ],
      cta: "Build a Bulletproof Spec",
    },
    {
      subject: "Last note: turnkey EPD documentation for {{company}}",
      headline: "Your documentation package, done.",
      body: "Specification work is detail-intensive. GreenChainz handles the data layer — you focus on the language. Free to start, no commitment.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const leedAP: RoleConfig = {
  roleTitle: "LEED AP / Sustainability Consultant",
  procurementLayer: "Design Authorities",
  decisionDriver: "The Point System",
  engagementHook: "Lead with LEED/BREEAM/WELL credit contribution math; provide pre-formatted documentation packages; reduce their documentation workload",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "leed_ap",
  bingQueries: [
    "LEED accredited professional sustainability consultant",
    "LEED AP green building consultant firm",
    "sustainability consultant BREEAM WELL certification",
  ],
  steps: [
    {
      subject: "LEED MR credit math — done before the design meeting",
      headline: "Every material search comes pre-loaded with the LEED credit count.",
      body: "LEED APs spend hours working out Materials & Resources credit contributions from individual product data sheets. GreenChainz does that math automatically — search a product, see the LEED MR credit contribution, pull the pre-formatted documentation package. By the time you're in the OAC meeting, you already have the credit math done.",
      bullets: [
        "LEED MR credit contribution calculated per product search",
        "Pre-formatted LEED documentation packages ready to submit",
        "EPD + HPD + chain-of-custody in a single download",
        "BREEAM and WELL credit mapping included",
        "Works on EC3 and Autodesk SDA data simultaneously",
      ],
      cta: "Run Your First LEED Credit Search Free",
    },
    {
      subject: "The documentation package your LEED reviewer won't kick back",
      headline: "Fewer RFIs. Fewer documentation resubmissions.",
      body: "LEED documentation reviews fail for one reason: incomplete or non-third-party-verified data. GreenChainz pulls from EC3, EPD International, and Autodesk SDA — all verified sources — and packages it in USGBC-accepted format. Your reviewer gets what they need the first time.",
      bullets: [
        "USGBC-accepted data format, pre-packaged",
        "Third-party verification for every data point",
        "Deficiency report shows gaps before submission",
      ],
      cta: "Build Your LEED Package",
    },
    {
      subject: "One last note on LEED documentation for {{company}}",
      headline: "Certification requires documentation. We make it fast.",
      body: "We know LEED project timelines are compressed. GreenChainz is here when the documentation crunch hits. Free to start.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const interiorDesigner: RoleConfig = {
  roleTitle: "Interior Designer (Commercial/Contract)",
  procurementLayer: "Design Authorities",
  decisionDriver: "Occupant Health & Productivity",
  engagementHook: "Position as wellness and talent-retention plays; offer 'building standard' package specs; emphasize biophilic and acoustic performance",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "interior_designer",
  bingQueries: [
    "commercial interior design firm sustainable wellness",
    "contract interior designer WELL certification",
    "commercial interior designer biophilic design",
  ],
  steps: [
    {
      subject: "{{company}}: the wellness spec that wins the client presentation",
      headline: "Your clients are asking about air quality. Do you have the data?",
      body: "Corporate tenants and Owner-Occupiers are asking interior designers to prove the wellness case for material choices — not just aesthetic ones. GreenChainz gives you the occupant health data (IAQ ratings, VOC levels, antimicrobial certifications, acoustic performance) to make that case in client presentations and WELL documentation.",
      bullets: [
        "Indoor air quality and VOC data per material",
        "Antimicrobial and acoustic performance ratings",
        "WELL Material Concept credit documentation",
        "'Building standard' spec package builder for corporate accounts",
        "Recycled content certificates for sustainability reporting",
      ],
      cta: "Build Your Wellness Material Spec",
    },
    {
      subject: "The Harvard study your client just cited in the brief",
      headline: "Low-VOC environments produce 26% higher cognitive scores.",
      body: "The Harvard COGfx study is becoming a standard client brief reference. GreenChainz links every flooring, ceiling, and wall material spec to the IAQ and VOC data that supports the wellness performance claim. Arrive at your next client presentation with the data — not just the aesthetic.",
      bullets: [
        "COGfx-correlated IAQ data per product",
        "Pre-formatted WELL documentation package",
        "Acoustic NRC and STC performance data included",
      ],
      cta: "Get the Wellness Material Data",
    },
    {
      subject: "Last note: wellness material documentation for {{company}}",
      headline: "The data your clients are asking for — in seconds.",
      body: "Interior designers who spec wellness don't need to spend hours pulling VOC sheets and acoustic ratings. GreenChainz does it automatically. Free to start.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const landscapeArchitect: RoleConfig = {
  roleTitle: "Landscape Architect",
  procurementLayer: "Design Authorities",
  decisionDriver: "Site Water Management & Heat Island Compliance",
  engagementHook: "Frame as cost-saving civil engineering solution eliminating underground retention tanks; cite local stormwater fee savings and Heat Island ordinance compliance",
  purchaseVolume: "medium",
  hiddenGem: true,
  crmCategory: "landscape_architect",
  bingQueries: [
    "landscape architecture firm stormwater LEED",
    "landscape architect sustainable site design firm",
  ],
  steps: [
    {
      subject: "Skip the underground tank. Here's the EPD data that makes the case.",
      headline: "The right paving spec eliminates the civil engineering problem.",
      body: "Landscape Architects know the pitch: permeable paving and high-albedo surfaces can eliminate the need for underground stormwater retention — saving Owners six figures in civil costs. GreenChainz gives you the permeability, retention, and albedo data to build that case with verified EPD documentation, not just manufacturer spec sheets.",
      bullets: [
        "Permeability and stormwater retention ratings per product",
        "Heat Island albedo and reflectivity specs verified by EPD",
        "Municipal stormwater fee savings calculations",
        "LEED Sustainable Sites credit documentation",
        "Recycled aggregate content for LEED MR credits",
      ],
      cta: "Pull the Stormwater & Heat Island Data Free",
    },
    {
      subject: "The municipal code compliance data your civil engineer is asking for",
      headline: "Your spec, backed by third-party verified data.",
      body: "More municipalities are requiring documented compliance with stormwater ordinances and Heat Island regulations. GreenChainz packages the verified performance data — permeability, retention, albedo — in a format that satisfies both code official review and LEED documentation requirements simultaneously.",
      bullets: [
        "Code-compliant documentation for stormwater + Heat Island ordinances",
        "LEED SS Heat Island credit package included",
        "Municipal permit-ready format",
      ],
      cta: "Build Your Compliance Package",
    },
    {
      subject: "Last note: site material compliance data for {{company}}",
      headline: "The civil cost savings are in the spec data.",
      body: "When the civil engineer asks you to justify the permeable paving spec, GreenChainz gives you the answer. Free to start.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── FINANCIAL GATEKEEPERS ────────────────────────────────────────────────────

const quantitySurveyor: RoleConfig = {
  roleTitle: "Quantity Surveyor / Cost Consultant",
  procurementLayer: "Financial Gatekeepers",
  decisionDriver: "Whole Life Costing & Carbon Accounting",
  engagementHook: "Lead with ROI models and Whole Life Cost analysis; provide carbon budget data; position as the tool that wins Value Engineering battles",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "quantity_surveyor",
  bingQueries: [
    "quantity surveyor cost consultant construction firm",
    "QS whole life cost construction consultant",
  ],
  steps: [
    {
      subject: "{{company}}: the whole life cost data that wins the VE argument",
      headline: "First cost ≠ whole life cost. Here's the model that proves it.",
      body: "Quantity Surveyors are the last line of defense against Value Engineering cuts that increase long-term cost. GreenChainz provides NPV/whole life cost models for sustainable materials that show the 40-year maintenance, replacement, and operational cost delta — making the VE counterargument irrefutable.",
      bullets: [
        "40-year whole life cost models per material comparison",
        "NPV analysis with maintenance cycle and durability data",
        "Carbon budget compliance data for embodied carbon reporting",
        "GWP (Global Warming Potential) data for carbon accounting",
        "Warranty and durability ratings per product",
      ],
      cta: "Build Your Whole Life Cost Model Free",
    },
    {
      subject: "The carbon budget data your client just put in the brief",
      headline: "Embodied carbon is now a cost line. We track it.",
      body: "More Owner briefs are specifying maximum embodied carbon budgets. GreenChainz tracks GWP data per material choice and generates carbon budget compliance reports alongside cost models — so the QS team can account for carbon cost at the same time as capital cost.",
      bullets: [
        "GWP per material linked to cost data",
        "Carbon budget compliance tracker per project",
        "Comparative carbon + cost analysis across specification alternatives",
      ],
      cta: "Add Carbon to Your Cost Model",
    },
    {
      subject: "Last note: whole life cost + carbon data for {{company}}",
      headline: "The number that beats the VE argument every time.",
      body: "VE debates are won with data. GreenChainz gives QS teams the whole life cost and carbon models to defend the spec. Free to start.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const valueEngineer: RoleConfig = {
  roleTitle: "Value Engineer",
  procurementLayer: "Financial Gatekeepers",
  decisionDriver: "System Deletion & Labor Reduction",
  engagementHook: "Never pitch 'green'; pitch 'simplification' and 'labor reduction'; show how one material replaces multiple systems/trades",
  purchaseVolume: "medium",
  hiddenGem: true,
  crmCategory: "value_engineer",
  bingQueries: [
    "value engineering consultant construction firm",
    "VE construction consultant cost reduction specialist",
  ],
  steps: [
    {
      subject: "{{company}}: one material. Three trades eliminated.",
      headline: "The best VE move is the system that replaces three systems.",
      body: "Value Engineers find the cuts — but the best cuts aren't substitutions, they're eliminations. GreenChainz surfaces multifunctional materials that replace multiple systems, eliminating trade scope simultaneously. SIPs replacing framing + insulation + sheathing. Structural insulated panels that take out three line items. We show you the function-per-dollar math.",
      bullets: [
        "Multi-function SKU database — one material replacing multiple systems",
        "Function-per-dollar analysis per material comparison",
        "Trade elimination potential flagged per product",
        "Labor cost comparison data included",
        "Installation speed benchmarks per system",
      ],
      cta: "Find the System Eliminations",
    },
    {
      subject: "The SIPs spec that eliminated $340K in subcontractor scope",
      headline: "Simplification is the VE play nobody talks about.",
      body: "The GreenChainz material database includes performance data that quantifies trade elimination — not just product-to-product substitution. When you can show the Owner that one product removes three subcontractor line items and two coordination meetings, that's not green spec. That's engineering.",
      bullets: [
        "Structural + insulation + air barrier systems in one product",
        "Documented labor reduction benchmarks",
        "Trade scope elimination calculator",
      ],
      cta: "Find the Trade Eliminations",
    },
    {
      subject: "Last note: simplification data for {{company}}",
      headline: "The materials that make the schedule shorter.",
      body: "We don't pitch sustainability. We pitch function per dollar. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const insuranceRiskManager: RoleConfig = {
  roleTitle: "Insurance Risk Manager / Underwriter",
  procurementLayer: "Financial Gatekeepers",
  decisionDriver: "Loss Prevention & Resilience",
  engagementHook: "Market materials as 'Risk Reduction Assets'; provide data showing premium-reduction potential; position CLT and mineral wool as safety-correlated sustainability",
  purchaseVolume: "medium",
  hiddenGem: true,
  crmCategory: "insurance_risk_manager",
  bingQueries: [
    "construction insurance risk manager underwriter",
    "insurance risk manager building materials compliance",
  ],
  steps: [
    {
      subject: "{{company}}: the material data that maps to loss prevention",
      headline: "Sustainable materials aren't a premium risk. They're a risk reduction asset.",
      body: "Insurance Risk Managers are increasingly asked to quantify the loss prevention value of material choices — mold resistance, fire performance, extreme weather durability. GreenChainz provides the third-party verified performance data that maps material specs directly to actuarial risk categories.",
      bullets: [
        "Mold and moisture resistance ratings per product",
        "Fire resistance and UL certification data",
        "Extreme weather performance benchmarks",
        "Actuarial risk reduction metrics for CLT and mineral wool",
        "Third-party verified — not manufacturer claims",
      ],
      cta: "Pull the Risk Reduction Data Free",
    },
    {
      subject: "CLT fire performance data — the counterintuitive finding",
      headline: "Mass timber outperforms steel at elevated temperatures.",
      body: "The fire performance data on Cross-Laminated Timber is counterintuitive — and compelling for underwriters. CLT chars predictably, maintaining structural integrity longer than unprotected steel at high temperatures. GreenChainz documents this data alongside mold resistance, moisture performance, and resilience ratings — the full risk profile.",
      bullets: [
        "CLT fire resistance vs. steel benchmarks",
        "Mineral wool vs. fiberglass fire performance comparison",
        "Predictive maintenance cost data for durability ratings",
      ],
      cta: "Get the Risk Performance Data",
    },
    {
      subject: "Last note: material risk performance data for {{company}}",
      headline: "The data your actuaries are asking for.",
      body: "Material performance data is a loss prevention input, not just a spec consideration. GreenChainz makes it searchable. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const assetManager: RoleConfig = {
  roleTitle: "Asset Manager (Real Estate)",
  procurementLayer: "Financial Gatekeepers",
  decisionDriver: "Liquidity & Stranded Asset Prevention",
  engagementHook: "Frame materials as stranded-asset prevention tools; show how green retrofits maintain institutional buyer eligibility and protect exit strategy",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "asset_manager",
  bingQueries: [
    "real estate asset manager ESG sustainable buildings",
    "asset management firm green building ESG compliance",
    "commercial real estate asset manager NYC Local Law 97",
  ],
  steps: [
    {
      subject: "{{company}}: the retrofit spec that keeps your assets institutional-grade",
      headline: "Your building's next buyer is ESG-constrained. Is your asset ready?",
      body: "Institutional buyers — pension funds, REITs, sovereign wealth — are increasingly unable to acquire assets that fail ESG compliance thresholds. Asset Managers using GreenChainz get the material compliance data to plan retrofits that maintain institutional buyer eligibility and protect exit cap rates.",
      bullets: [
        "NYC Local Law 97 compliance modeling per retrofit scenario",
        "ESG documentation ready for institutional buyer due diligence",
        "Energy performance improvement data per material choice",
        "Retrofit ROI models with carbon compliance projections",
        "Stranded asset risk score per building based on current specs",
      ],
      cta: "Model Your Retrofit Compliance Free",
    },
    {
      subject: "The NYC LL97 fine you can eliminate with a single spec change",
      headline: "$268/tonne CO2 over cap. Here's the retrofit that eliminates it.",
      body: "NYC Local Law 97 penalties are now a line item in asset valuations. GreenChainz models the embodied and operational carbon impact of retrofit material choices and projects the LL97 compliance position — before you commit capital.",
      bullets: [
        "LL97 penalty avoidance calculator per retrofit option",
        "Carbon budget compliance projection by material scenario",
        "Institutional due diligence documentation package",
      ],
      cta: "Model Your LL97 Exposure",
    },
    {
      subject: "Last note: ESG retrofit data for {{company}}'s portfolio",
      headline: "Protect the exit. Start with the spec.",
      body: "The institutional buyers of your next exit are screening for ESG compliance now. GreenChainz makes the retrofit case with data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const realEstateAppraiser: RoleConfig = {
  roleTitle: "Real Estate Appraiser / Valuer",
  procurementLayer: "Financial Gatekeepers",
  decisionDriver: "Market Valuation & Cap Rates",
  engagementHook: "Position as the validation layer that unlocks developer financing; provide market data on green building valuation premiums",
  purchaseVolume: "low",
  hiddenGem: false,
  crmCategory: "real_estate_appraiser",
  bingQueries: [
    "real estate appraiser green building valuation",
    "commercial property appraiser LEED valuation premium",
  ],
  steps: [
    {
      subject: "{{company}}: green building valuation premium data — verified",
      headline: "LEED certification adds 7-16% to sale price. The data is there.",
      body: "Appraisers valuing green-certified assets need market transaction data to support the premium — not just developer claims. GreenChainz tracks LEED, WELL, and BREEAM certification status alongside material EPD data, giving appraisers a verifiable link between specification quality and certification-correlated market premiums.",
      bullets: [
        "Certification status database (LEED, WELL, BREEAM) per asset type",
        "Market transaction comparison data for green-certified assets",
        "NOI improvement projections from energy-efficient material specs",
        "Cap rate compression data for ESG-compliant assets",
      ],
      cta: "Access the Green Premium Data Free",
    },
    {
      subject: "The cap rate data for LEED Platinum vs. non-certified office",
      headline: "Cap rate compression is now a documented green building premium.",
      body: "The CoStar and CBRE data on LEED Platinum cap rate compression is there for appraisers who need it. GreenChainz aggregates certification and material quality data that supports the adjustment factor in your comparables analysis.",
      bullets: [
        "LEED/WELL certification vs. cap rate correlation data",
        "NOI per-square-foot comparison by certification tier",
        "Green premium transaction comps database",
      ],
      cta: "Pull the Comp Data",
    },
    {
      subject: "Last note: green building valuation data for {{company}}",
      headline: "The adjustment factor, backed by data.",
      body: "Green building premiums are real and documentable. GreenChainz makes the data accessible for appraisers. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── EXECUTION TIER ───────────────────────────────────────────────────────────

const projectManagerGC: RoleConfig = {
  roleTitle: "Project Manager (General Contractor)",
  procurementLayer: "Execution Tier",
  decisionDriver: "Schedule & Site Safety",
  engagementHook: "Lead with schedule acceleration and job-site safety; offer take-back programs; emphasize low-VOC and dust-free installation keeping the job moving",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "project_manager_gc",
  bingQueries: [
    "general contractor project manager sustainable construction",
    "GC construction company LEED sustainable projects",
    "general contractor construction project management firm",
  ],
  steps: [
    {
      subject: "{{company}}: cut material lead times. Keep the schedule.",
      headline: "The material delay that kills your schedule starts with the wrong supplier.",
      body: "GC Project Managers live and die by lead times and site safety. GreenChainz gives you verified supplier lead times, waste take-back program availability, and low-VOC installation data — so the material that looks right on paper actually delivers on time and keeps the site moving.",
      bullets: [
        "Verified lead time data per supplier, per material",
        "Waste take-back program availability pre-checked",
        "Low-VOC and dust-free installation specs flagged",
        "LEED construction waste diversion documentation",
        "Site safety data sheets (VOC, dust, chemical exposure) per product",
      ],
      cta: "Check Lead Times & Safety Data Free",
    },
    {
      subject: "The material swap that saved 3 weeks on a healthcare project",
      headline: "Installation speed is a spec decision.",
      body: "Sustainable composite materials often install 30-40% faster than legacy equivalents — fewer wet trades, no cure time, single-trade installation. GreenChainz surfaces installation speed data alongside environmental specs so PMs can make the case to the Owner at the same time as the scheduler.",
      bullets: [
        "Installation speed benchmarks vs. conventional alternatives",
        "Single-trade vs. multi-trade installation comparison",
        "Cure time elimination opportunities flagged",
      ],
      cta: "Find the Faster Installation",
    },
    {
      subject: "Last note: schedule and safety material data for {{company}}",
      headline: "Faster installation. Safer site. Documented.",
      body: "Material choices affect the schedule before the first delivery. GreenChainz gives PMs the data to make the right call early. Free to start.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const drywallSub: RoleConfig = {
  roleTitle: "Drywall / Framing Subcontractor",
  procurementLayer: "Execution Tier",
  decisionDriver: "Labor Productivity & Ergonomics",
  engagementHook: "Pitch labor savings and crew ergonomics; demo lighter boards and cleaner cuts; provide consistency data showing reduced callbacks",
  purchaseVolume: "high",
  hiddenGem: true,
  crmCategory: "drywall_subcontractor",
  bingQueries: [
    "drywall framing subcontractor sustainable materials",
    "drywall contractor gypsum board installation commercial",
  ],
  steps: [
    {
      subject: "{{company}}: lighter board. Cleaner cuts. Fewer callbacks.",
      headline: "Your crew productivity is a material spec decision.",
      body: "Drywall subcontractors absorb the labor cost of inconsistent product — warped boards, dusty cuts, high callback rates. GreenChainz surfaces weight specs, dust performance ratings, and score-and-snap consistency data so you can spec the board your crew can actually install faster, with fewer punch-list items.",
      bullets: [
        "Board weight specs — lighter alternatives per size and fire rating",
        "Dust rating data — reduced airborne particulate for OSHA compliance",
        "Score-and-snap consistency and defect rate data",
        "Callback rate benchmarks per product line",
        "Crew ergonomics impact data (weight × repetition)",
      ],
      cta: "Check Board Performance Data Free",
    },
    {
      subject: "The board your crew installs 20% faster — with fewer punch-list calls",
      headline: "Callback reduction is labor productivity.",
      body: "GreenChainz tracks defect rate and callback data per product line — not just environmental specs. For drywall subs, that means you can spec the board with the lowest callback rate before the bid goes in, protecting your labor budget on the back end.",
      bullets: [
        "Defect rate comparison across board manufacturers",
        "Punch-list performance data per product",
        "Labor savings estimate per 1,000 SF of installation",
      ],
      cta: "Find the Lower-Callback Board",
    },
    {
      subject: "Last note: board performance data for {{company}}",
      headline: "Better board. Faster install. Fewer callbacks.",
      body: "The material spec affects your labor cost. GreenChainz gives you the data to choose better. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const flooringSub: RoleConfig = {
  roleTitle: "Flooring Subcontractor",
  procurementLayer: "Execution Tier",
  decisionDriver: "Moisture Mitigation & Bond Failure Prevention",
  engagementHook: "Lead with bond failure risk reduction; highlight adhesive-free or low-adhesive systems; emphasize worker protection from toxic fumes",
  purchaseVolume: "high",
  hiddenGem: true,
  crmCategory: "flooring_subcontractor",
  bingQueries: [
    "flooring subcontractor commercial installation sustainable",
    "commercial flooring contractor adhesive installation",
  ],
  steps: [
    {
      subject: "{{company}}: bond failure starts with the moisture tolerance spec",
      headline: "The flooring failure that comes back on you starts before installation.",
      body: "Flooring subcontractors carry the bond failure liability — but the failure often traces to the material spec, not the installation. GreenChainz surfaces moisture tolerance ratings, adhesive compatibility data, and breathability specs so you know before the floor goes down whether the product will hold.",
      bullets: [
        "Moisture tolerance ratings per flooring system",
        "Adhesive requirement and compatibility data",
        "Breathability ratings for below-grade and slab-on-grade applications",
        "VOC levels of adhesive systems — OSHA and CDPH rated",
        "Installation speed benchmarks per system",
      ],
      cta: "Check Moisture & Bond Data Free",
    },
    {
      subject: "The adhesive-free system that eliminated your crew's VOC exposure",
      headline: "Worker protection is a product selection decision.",
      body: "Adhesive fume exposure is a recurring OSHA issue for flooring crews. GreenChainz flags adhesive-free and low-VOC installation systems — giving you the product data to protect your crew and eliminate the ventilation requirement that slows the schedule.",
      bullets: [
        "Adhesive-free and click-lock system alternatives",
        "VOC exposure data vs. conventional adhesive systems",
        "OSHA-relevant chemical exposure ratings per product",
      ],
      cta: "Find Low-VOC Flooring Systems",
    },
    {
      subject: "Last note: bond failure prevention data for {{company}}",
      headline: "The spec that holds — before and after installation.",
      body: "Bond failure comes back on the sub. GreenChainz gives you the moisture and adhesive data to spec right the first time. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const concreteSub: RoleConfig = {
  roleTitle: "Concrete Subcontractor",
  procurementLayer: "Execution Tier",
  decisionDriver: "Workability & Cure Time",
  engagementHook: "Lead with workability and pour-labor savings; position low-carbon mixes as technically superior; provide mix performance data",
  purchaseVolume: "high",
  hiddenGem: true,
  crmCategory: "concrete_subcontractor",
  bingQueries: [
    "concrete subcontractor sustainable low carbon mix",
    "concrete contractor fly ash slag mix commercial",
  ],
  steps: [
    {
      subject: "{{company}}: lower carbon mix. Better workability. Same cure time.",
      headline: "The low-carbon concrete myth: it's not slower.",
      body: "Concrete subcontractors hear 'sustainable mix' and think 'longer cure time, harder to pump.' The data says otherwise. High-SCM mixes (fly ash + slag blends) can equal or exceed workability of OPC mixes while cutting embodied carbon 30-50%. GreenChainz surfaces mix performance data — slump, pump performance, cure time, carbon content — side by side.",
      bullets: [
        "Fly ash and slag blend workability and slump data",
        "Pump performance ratings per mix design",
        "Cure time comparison: SCM blends vs. OPC",
        "Carbon content per cubic yard for LEED and carbon budget compliance",
        "Pour labor savings estimates per mix design",
      ],
      cta: "Compare Mix Performance Data Free",
    },
    {
      subject: "The mix that won the LEED project and came in under schedule",
      headline: "Low-carbon mix performance: the technical case.",
      body: "GreenChainz tracks real project performance data on low-carbon concrete mixes — not just theoretical specifications. For concrete subs bidding LEED and public projects, that means the carbon data comes with the performance proof, not instead of it.",
      bullets: [
        "Real project performance data on SCM blends",
        "LEED MR credit documentation generated automatically",
        "Buy Clean compliance data included per mix",
      ],
      cta: "Get the Mix Performance Data",
    },
    {
      subject: "Last note: mix performance data for {{company}}",
      headline: "Better workability. Lower carbon. Documented.",
      body: "Low-carbon concrete isn't a compromise. GreenChainz shows the performance data that proves it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const procurementSpecialist: RoleConfig = {
  roleTitle: "Procurement Specialist / Purchasing Agent (Construction)",
  procurementLayer: "Execution Tier",
  decisionDriver: "Supply Chain Security & Price Stability",
  engagementHook: "Lead with supply chain resilience narrative; emphasize domestic sourcing for delivery certainty; provide LEED credit documentation as bonus",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "procurement_specialist",
  bingQueries: [
    "procurement specialist purchasing agent construction materials",
    "construction purchasing agent sustainable materials sourcing",
  ],
  steps: [
    {
      subject: "{{company}}: domestic sourcing documentation — one search",
      headline: "Supply chain disruption starts with the sourcing gap you didn't see.",
      body: "Construction Procurement Specialists are dealing with volatile lead times, domestic sourcing mandates, and LEED local material credit documentation simultaneously. GreenChainz pulls domestic sourcing status, lead time data, and LEED credit documentation for materials in a single search — so supply chain risk is visible before the purchase order goes out.",
      bullets: [
        "Domestic sourcing status per material and supplier",
        "Lead time data from verified suppliers",
        "LEED local material credit documentation auto-generated",
        "Supplier reliability and alternate source data",
        "Price stability indicators per material category",
      ],
      cta: "Check Sourcing & Lead Times Free",
    },
    {
      subject: "The supplier that ships on time and has the EPD documentation",
      headline: "Delivery certainty is a specification decision.",
      body: "For Procurement Specialists, the best sustainable material is the one that arrives on schedule with the documentation attached. GreenChainz tracks supplier reliability data alongside EPD verification status — so you can buy from the supplier who will deliver both.",
      bullets: [
        "Supplier reliability rating per material category",
        "EPD verification status per supplier",
        "Alternate approved supplier list per product",
      ],
      cta: "Find the Reliable Verified Supplier",
    },
    {
      subject: "Last note: supply chain data for {{company}}",
      headline: "Domestic. On time. Documented.",
      body: "The right sustainable material is the one that shows up when you need it. GreenChainz has the supply chain data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const superintendent: RoleConfig = {
  roleTitle: "Superintendent (The Super)",
  procurementLayer: "Execution Tier",
  decisionDriver: "Defect Reduction & Constructability",
  engagementHook: "Show how sustainable composites eliminate warping and reduce punch-list repairs; lead with site-level headache elimination",
  purchaseVolume: "medium",
  hiddenGem: true,
  crmCategory: "superintendent",
  bingQueries: [
    "construction superintendent sustainable building materials",
    "site superintendent defect reduction construction materials",
  ],
  steps: [
    {
      subject: "{{company}}: the material that doesn't create punch-list items",
      headline: "Your punch list is a material spec problem.",
      body: "Superintendents close punch lists. The fastest path to a clean list is fewer defects — and defect rates vary significantly by product. GreenChainz surfaces dimensional stability, defect rate, and consistency data per product line so the Super can flag the spec that's going to create punch-list issues before it's on site.",
      bullets: [
        "Dimensional stability ratings per product (warping, cupping, bowing)",
        "Defect rate data per manufacturer and product line",
        "Consistency specs — tolerance and variance data",
        "Constructability ratings for on-site handling",
        "Punch-list performance benchmarks from comparable projects",
      ],
      cta: "Check Defect Rate Data Free",
    },
    {
      subject: "The composite product that eliminated 60% of a healthcare punch list",
      headline: "Dimensional stability is a spec decision.",
      body: "Sustainable composite materials — engineered wood, fiber cement, high-density fiber board — show measurably lower defect and callback rates than conventional alternatives. GreenChainz makes that data visible before the spec is finalized, not after installation.",
      bullets: [
        "Composite vs. conventional defect rate comparison",
        "On-site handling and damage resistance data",
        "Weather tolerance during installation window",
      ],
      cta: "Find the Lower-Defect Material",
    },
    {
      subject: "Last note: defect and constructability data for {{company}}",
      headline: "Fewer defects. Shorter punch list. Better close.",
      body: "The punch list is shorter when the spec is right. GreenChainz has the data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── OPERATIONAL STEWARDS ─────────────────────────────────────────────────────

const facilityManager: RoleConfig = {
  roleTitle: "Facility Manager / Director of Facilities",
  procurementLayer: "Operational Stewards",
  decisionDriver: "Total Cost of Ownership & Maintenance Cycles",
  engagementHook: "Lead with reduced maintenance labor and toxic chemical elimination; provide TCO models showing durable flooring vs. VCT 40-year cost",
  purchaseVolume: "high",
  hiddenGem: true,
  crmCategory: "facility_manager",
  bingQueries: [
    "facility manager director of facilities commercial building",
    "facilities management firm sustainable operations",
  ],
  steps: [
    {
      subject: "{{company}}: the TCO model that ends the VCT vs. LVT argument",
      headline: "Your maintenance budget is a material spec decision.",
      body: "Facility Managers inherit the maintenance cost of material specs made years before their tenure. GreenChainz provides 40-year TCO models per material comparison — flooring, ceiling systems, wall assemblies — showing the maintenance labor, chemical, and replacement cost differential that makes the capital investment case for durable, low-maintenance alternatives.",
      bullets: [
        "40-year TCO models per material comparison",
        "Maintenance cycle frequency per product (wax, reseal, replace)",
        "Cleaning chemical requirement and cost data",
        "Toxic chemical elimination opportunities per product line",
        "Durability ratings and warranty data per product",
      ],
      cta: "Build Your TCO Model Free",
    },
    {
      subject: "The floor finish that eliminated your strip-and-wax budget",
      headline: "Maintenance labor is the hidden cost in the spec.",
      body: "The most expensive flooring is often the cheapest capital spec. GreenChainz surfaces the maintenance cycle data that FMs need to make the TCO case to the CFO: VCT strip-and-wax vs. polished concrete or luxury vinyl tile, modeled over 20 and 40-year cycles.",
      bullets: [
        "Strip-and-wax cycle frequency vs. low-maintenance alternatives",
        "Annual maintenance labor cost comparison per 10,000 SF",
        "Chemical cost and storage liability reduction data",
      ],
      cta: "Model the Maintenance Cost Difference",
    },
    {
      subject: "Last note: TCO and maintenance data for {{company}}",
      headline: "The cheapest spec isn't always the cheapest floor.",
      body: "TCO models make the capital investment case. GreenChainz has the data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const workplaceExperienceDirector: RoleConfig = {
  roleTitle: "Director of Workplace Experience",
  procurementLayer: "Operational Stewards",
  decisionDriver: "Employee Experience & Friction Reduction",
  engagementHook: "Position as talent retention and culture tool; reference the 'hotelification of the office' trend; connect materials to HR recruitment metrics",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "workplace_experience_director",
  bingQueries: [
    "director of workplace experience corporate real estate",
    "workplace experience manager employee environment design",
  ],
  steps: [
    {
      subject: "{{company}}: the material spec your talent acquisition team needs",
      headline: "The office environment is now a talent retention metric.",
      body: "Directors of Workplace Experience are designing for the post-hybrid return — and the materials in the space are part of the talent pitch. WELL-certified air quality, acoustic performance, and biophilic material specs are becoming standard asks in occupier briefs. GreenChainz gives you the data to specify and document them.",
      bullets: [
        "WELL Material Concept credit documentation",
        "IAQ and VOC data per finish material",
        "Acoustic NRC and STC performance ratings",
        "Biophilic material certifications and sourcing data",
        "Employee wellness research citations per product",
      ],
      cta: "Spec the Wellness Environment Free",
    },
    {
      subject: "The Harvard study your CEO just sent to HR",
      headline: "26% cognitive productivity gain. The materials are the lever.",
      body: "The Harvard T.H. Chan School of Public Health COGfx study is becoming a standard corporate wellness brief reference. GreenChainz links every finish material spec to the IAQ, VOC, and ventilation data that supports the productivity performance claim — so the Workplace Experience pitch is data-backed, not just aesthetic.",
      bullets: [
        "COGfx-correlated IAQ data per material",
        "Productivity performance research links per product category",
        "WELL documentation package for occupier reporting",
      ],
      cta: "Get the Wellness Material Data",
    },
    {
      subject: "Last note: workplace wellness data for {{company}}",
      headline: "The spec that shows up in the recruitment pitch.",
      body: "The office environment is a talent metric. GreenChainz has the materials data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const energyManager: RoleConfig = {
  roleTitle: "Energy Manager",
  procurementLayer: "Operational Stewards",
  decisionDriver: "Kilowatt-hours & Peak Demand Charges",
  engagementHook: "Speak pure ROI; provide payback period calculations; target separately budgeted 'Energy Conservation Measures' funds",
  purchaseVolume: "medium",
  hiddenGem: true,
  crmCategory: "energy_manager",
  bingQueries: [
    "energy manager commercial building energy conservation",
    "building energy manager ECM energy efficiency",
  ],
  steps: [
    {
      subject: "{{company}}: the ECM spec with a sub-3-year payback",
      headline: "kWh reduction is a material spec. Here's the ROI.",
      body: "Energy Managers know that envelope and glazing decisions drive more kWh reduction than most operational measures. GreenChainz provides payback period calculations, kWh reduction projections, and peak demand impact data for high-performance envelope materials — in a format you can take straight to the capital budget approval.",
      bullets: [
        "kWh reduction projections per material vs. baseline",
        "Payback period calculations (simple and NPV)",
        "Peak demand charge reduction estimates",
        "Smart glass specs with daylight and load reduction data",
        "Phase Change Material (PCM) performance data",
      ],
      cta: "Calculate Your ECM Payback Free",
    },
    {
      subject: "The ECM that pays back in 2.4 years and qualifies for utility rebates",
      headline: "Sub-3-year payback on envelope performance.",
      body: "GreenChainz surfaces materials that qualify for utility rebate programs alongside the kWh reduction projections — giving Energy Managers the full ROI picture: capital cost minus rebate, divided by annual energy savings. The calculation your CFO needs is built in.",
      bullets: [
        "Utility rebate eligibility flags per product",
        "Net-of-rebate payback period calculation",
        "Demand response compatibility for smart building integration",
      ],
      cta: "Model the Net-of-Rebate Payback",
    },
    {
      subject: "Last note: energy performance data for {{company}}",
      headline: "The kWh reduction case — already calculated.",
      body: "ECM approval requires ROI documentation. GreenChainz builds it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const cleaningServicesManager: RoleConfig = {
  roleTitle: "Cleaning / Environmental Services Manager",
  procurementLayer: "Operational Stewards",
  decisionDriver: "Staff Health & Hygiene",
  engagementHook: "Lead with staff health and reduced chemical storage liability; show how material choice reduces janitorial turnover and injury claims",
  purchaseVolume: "low",
  hiddenGem: true,
  crmCategory: "cleaning_services_manager",
  bingQueries: [
    "environmental services manager cleaning sustainable materials",
    "janitorial services manager chemical-free cleaning",
  ],
  steps: [
    {
      subject: "{{company}}: the surface spec that reduces your chemical storage liability",
      headline: "Your chemical storage liability starts with the surface spec.",
      body: "Cleaning and Environmental Services Managers are responsible for staff health outcomes and OSHA compliance — but the chemical requirements are determined by the material specs made years before their tenure. GreenChainz surfaces cleanability ratings, chemical resistance specs, and microfiber compatibility data so facility planners and EHS managers can make material choices that reduce the downstream cleaning chemical burden.",
      bullets: [
        "Cleanability ratings per surface material",
        "Chemical resistance specs — bleach, quaternary ammonium, enzymatic",
        "Microfiber compatibility data",
        "VOC-free maintenance system alternatives",
        "Staff respiratory health impact data per cleaning protocol",
      ],
      cta: "Check Surface Cleanability Data Free",
    },
    {
      subject: "The surface that cleans with water and microfiber — no chemicals",
      headline: "Chemical storage liability is a surface spec issue.",
      body: "Non-porous, seamless surface systems can reduce janitorial chemical usage by 80% in healthcare and food service environments. GreenChainz surfaces the cleanability and chemical resistance data that EHS and Facilities teams need to make the case for the right surface spec at the design stage.",
      bullets: [
        "Non-porous seamless surface alternatives per application",
        "Chemical usage reduction estimates per surface system",
        "OSHA chemical exposure incident reduction data",
      ],
      cta: "Find the Low-Chemical Surface",
    },
    {
      subject: "Last note: cleanability and EHS data for {{company}}",
      headline: "The surface spec that protects your staff.",
      body: "The right surface reduces chemical exposure before the mop bucket is even filled. GreenChainz has the data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── STRATEGIC LEADERSHIP ─────────────────────────────────────────────────────

const cso: RoleConfig = {
  roleTitle: "Chief Sustainability Officer (CSO)",
  procurementLayer: "Strategic Leadership",
  decisionDriver: "Corporate ESG Strategy & Scope 3 Reporting",
  engagementHook: "Provide Scope 3-ready supply chain documentation; align with GRI/TCFD reporting standards; make it easy to include in the Annual Report",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "cso",
  bingQueries: [
    "chief sustainability officer CSO corporate ESG",
    "sustainability officer ESG Scope 3 reporting construction",
    "CSO sustainable procurement strategy",
  ],
  steps: [
    {
      subject: "{{company}}: Scope 3 supply chain data — ready for the Annual Report",
      headline: "Your supply chain emissions data shouldn't be a spreadsheet exercise.",
      body: "Chief Sustainability Officers are under pressure to report Scope 3 emissions with the same rigor as Scope 1 and 2. Building materials are a major Scope 3 source — and the data is fragmented across supplier portals and PDF spec sheets. GreenChainz centralizes EPD-sourced carbon data per product category, formatted for GRI and TCFD reporting.",
      bullets: [
        "Scope 3 supply chain emissions data per material category",
        "GRI-aligned carbon reporting format per product purchase",
        "TCFD-compatible data export for annual reports",
        "Chain-of-custody documentation for supply chain transparency",
        "Supplier ESG verification status per product",
      ],
      cta: "Build Your Scope 3 Data Package Free",
    },
    {
      subject: "The supply chain emissions data your ESG auditor is asking for",
      headline: "GRI alignment is now a procurement requirement.",
      body: "ESG auditors are requiring Scope 3 data with third-party verification — not just materiality estimates. GreenChainz pulls EPD-verified carbon data per material purchase and packages it in GRI-aligned format, reducing the audit documentation burden from weeks to hours.",
      bullets: [
        "Third-party verified Scope 3 data per purchase",
        "GRI-aligned export for auditor submission",
        "Supplier transparency score per vendor",
      ],
      cta: "Package Your Scope 3 Data",
    },
    {
      subject: "Last note: ESG supply chain documentation for {{company}}",
      headline: "Scope 3 data that survives auditor scrutiny.",
      body: "Scope 3 reporting is only as strong as the data behind it. GreenChainz makes the data third-party verified and audit-ready. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const chro: RoleConfig = {
  roleTitle: "Chief People Officer (CHRO) / HR Director",
  procurementLayer: "Strategic Leadership",
  decisionDriver: "Talent Retention & Cognitive Productivity",
  engagementHook: "Reference Harvard COGfx study; frame as a 5-10% productivity and recruitment tool; connect low-VOC materials to measurable cognitive output",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "chro",
  bingQueries: [
    "chief people officer CHRO workplace wellness strategy",
    "HR director employee workplace environment health",
  ],
  steps: [
    {
      subject: "{{company}}: 26% cognitive productivity gain. The material spec is the lever.",
      headline: "Your office environment is a talent retention metric.",
      body: "Harvard's COGfx study documented a 26% cognitive performance improvement in high-ventilation, low-VOC environments. The building materials driving that outcome — low-VOC finishes, acoustic ceiling systems, biophilic materials — are specifiable decisions. GreenChainz gives HR and People teams the data to advocate for the right environment spec at the design stage.",
      bullets: [
        "VOC emission levels per finish material — CDPH rated",
        "Acoustic performance ratings (NRC/STC) per ceiling and wall system",
        "Biophilic material certifications and research citations",
        "WELL Material Concept documentation for occupier reporting",
        "Harvard COGfx-correlated IAQ data per product",
      ],
      cta: "Get the Workplace Wellness Data Free",
    },
    {
      subject: "The office spec that reduced sick days by 30% in a Deloitte study",
      headline: "Material quality is a workforce productivity investment.",
      body: "Companies that document the connection between building material quality and employee productivity outcomes are winning talent conversations. GreenChainz provides the material-level wellness data — IAQ, VOC, acoustic — that People teams can use to advocate for environment quality in capital planning.",
      bullets: [
        "Sick day reduction data linked to IAQ improvements",
        "Cognitive performance correlation per environment spec",
        "WELL certification data for employer branding",
      ],
      cta: "Build the Wellness Case",
    },
    {
      subject: "Last note: workplace wellness material data for {{company}}",
      headline: "The environment spec is part of the talent strategy.",
      body: "The best talent attraction is a building that performs for the people in it. GreenChainz has the material data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const cpo: RoleConfig = {
  roleTitle: "Chief Procurement Officer (CPO)",
  procurementLayer: "Strategic Leadership",
  decisionDriver: "Supply Chain Resilience & Ethical Sourcing",
  engagementHook: "Lead with supply chain transparency and reputational risk elimination; provide chain-of-custody docs; frame as ethical sourcing enabler",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "cpo",
  bingQueries: [
    "chief procurement officer CPO sustainable supply chain",
    "CPO ethical sourcing supply chain transparency",
  ],
  steps: [
    {
      subject: "{{company}}: supply chain transparency — one search",
      headline: "Your Scope 3 and forced labor risk lives in your material specs.",
      body: "Chief Procurement Officers are under increasing pressure on supply chain transparency — forced labor compliance, chain-of-custody verification, and Scope 3 emissions data are now board-level topics. GreenChainz centralizes EPD-verified chain-of-custody documentation and supplier transparency scores for building materials, reducing the due diligence burden from months to minutes.",
      bullets: [
        "FSC and chain-of-custody certification per product",
        "Forced labor compliance flags per supplier country of origin",
        "Scope 3 carbon data per material purchase",
        "Supplier transparency score per vendor",
        "TCO data for ethical sourcing cost case",
      ],
      cta: "Check Supply Chain Transparency Free",
    },
    {
      subject: "The chain-of-custody gap your supply chain audit just flagged",
      headline: "Chain-of-custody documentation is a reputational risk issue.",
      body: "GreenChainz surfaces chain-of-custody verification status per product and supplier — so CPOs can identify documentation gaps before they become audit findings or brand liabilities. The data is third-party verified, not self-reported.",
      bullets: [
        "Third-party verified chain-of-custody per product",
        "Forced labor risk score per country of origin",
        "Board-ready supply chain transparency report",
      ],
      cta: "Audit Your Supply Chain Transparency",
    },
    {
      subject: "Last note: ethical sourcing documentation for {{company}}",
      headline: "Supply chain transparency that holds up under scrutiny.",
      body: "The reputational risk is in the supply chain data you don't have. GreenChainz makes it visible. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const cmo: RoleConfig = {
  roleTitle: "Chief Marketing Officer (CMO) / Brand Director",
  procurementLayer: "Strategic Leadership",
  decisionDriver: "Brand Narrative & Cognitive Dissonance",
  engagementHook: "Connect material specs to the brand promise; show how store environment manifests the sustainability narrative to prevent customer cognitive dissonance",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "cmo",
  bingQueries: [
    "chief marketing officer CMO brand sustainability strategy",
    "brand director sustainable retail environment",
  ],
  steps: [
    {
      subject: "{{company}}: your store says sustainable. Does the spec sheet agree?",
      headline: "Brand narrative and material reality need to match.",
      body: "CMOs and Brand Directors building sustainability narratives face a credibility risk: the customer standing in a store built with unverified materials while reading a brand sustainability pledge. GreenChainz connects the material spec to the brand promise — verified EPD data, recycled content certificates, and origin transparency for every product in the environment.",
      bullets: [
        "Recycled content certifications per material",
        "Origin transparency and chain-of-custody documentation",
        "Brand alignment case studies by material category",
        "EPD data formatted for consumer-facing sustainability reporting",
        "Certification logos (FSC, Cradle to Cradle, GREENGUARD) verified per product",
      ],
      cta: "Verify Your Brand's Material Claims Free",
    },
    {
      subject: "The material claim that triggered a greenwashing investigation",
      headline: "Unverified sustainability claims are a brand liability.",
      body: "FTC Green Guides and EU greenwashing regulations are tightening. Brand sustainability claims that reference material specs need third-party verification behind them. GreenChainz provides the EPD and certification documentation that makes material sustainability claims defensible — for both marketing copy and investor ESG reporting.",
      bullets: [
        "Third-party verified data for every sustainability claim",
        "FTC Green Guides compliance check per claim",
        "Investor-grade ESG documentation per material decision",
      ],
      cta: "Verify Your Material Claims",
    },
    {
      subject: "Last note: brand material verification for {{company}}",
      headline: "The brand promise, backed by data.",
      body: "Sustainable brand narratives need verified material data underneath them. GreenChainz has it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── SECTOR VERTICALS ─────────────────────────────────────────────────────────

const infectionControlOfficer: RoleConfig = {
  roleTitle: "Infection Control Officer",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Pathogen Reduction & HAI Prevention",
  engagementHook: "Lead with HAI reduction data; demonstrate UV-C cleaning compatibility; show non-porous seamless specs; never lead with 'green' — lead with clinical safety",
  purchaseVolume: "high",
  hiddenGem: true,
  crmCategory: "infection_control_officer",
  bingQueries: [
    "infection control officer hospital healthcare construction",
    "ICO infection prevention building materials healthcare",
  ],
  steps: [
    {
      subject: "{{company}}: HAI reduction data — the clinical safety case for the surface spec",
      headline: "The surface spec is an infection control decision.",
      body: "Infection Control Officers are increasingly involved in capital project material approvals — and for good reason. Non-porous, seamless surfaces reduce HAI incidence by eliminating the biofilm harborage points that porous and grout-jointed surfaces create. GreenChainz surfaces the clinical safety data — porosity ratings, UV-C resistance, sterilization chemical compatibility — that ICOs need to evaluate materials on their terms.",
      bullets: [
        "Non-porosity certification per surface material",
        "UV-C radiation resistance ratings",
        "HAI reduction clinical data per surface system",
        "Seamless installation specs (no grout joints, no seams)",
        "Sterilization chemical resistance (bleach, hydrogen peroxide, quaternary ammonium)",
      ],
      cta: "Pull the Clinical Safety Data Free",
    },
    {
      subject: "The floor spec that eliminated MRSA harborage in a 200-bed unit",
      headline: "Grout joints are a biofilm problem. Here's the spec that eliminates them.",
      body: "Seamless monolithic flooring systems in healthcare environments show documented HAI reductions by eliminating the grout joint biofilm harborage that conventional tile creates. GreenChainz surfaces the non-porosity and seamless installation specs that ICOs can use in capital project material reviews.",
      bullets: [
        "Seamless monolithic flooring alternatives per clinical application",
        "Biofilm resistance data per surface material",
        "UV-C cleaning compatibility certification",
      ],
      cta: "Review Clinical Surface Specs",
    },
    {
      subject: "Last note: clinical safety material data for {{company}}",
      headline: "The surface spec that reduces HAI incidence.",
      body: "HAI prevention starts at the material spec stage. GreenChainz has the clinical safety data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const hospitalAdministrator: RoleConfig = {
  roleTitle: "Hospital Administrator",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Patient Satisfaction (HCAHPS) & Medicare Reimbursement",
  engagementHook: "Connect acoustic sustainable materials to HCAHPS score improvement and direct Medicare reimbursement rate impact",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "hospital_administrator",
  bingQueries: [
    "hospital administrator HCAHPS patient satisfaction construction",
    "healthcare administrator facility renovation patient experience",
  ],
  steps: [
    {
      subject: "{{company}}: the acoustic spec that moves your HCAHPS score",
      headline: "Noise is your lowest-scoring HCAHPS domain. The spec is the fix.",
      body: "Hospital Administrators know that HCAHPS 'Quietness of Hospital Environment' is consistently the lowest-scoring domain — and that CMS reimbursement rates move with HCAHPS scores. The acoustic performance of ceiling, flooring, and wall systems is directly controllable through the capital project spec. GreenChainz surfaces NRC and STC ratings per material for administrators who need the HCAHPS connection documented.",
      bullets: [
        "NRC (Noise Reduction Coefficient) per ceiling and wall system",
        "STC (Sound Transmission Class) per partition system",
        "HCAHPS Quietness domain impact studies per acoustic improvement",
        "Medicare reimbursement delta per HCAHPS score point",
        "Acoustic performance comparison vs. conventional ceiling tile",
      ],
      cta: "Pull the Acoustic Performance Data Free",
    },
    {
      subject: "A 0.3-point HCAHPS improvement = $X in annual Medicare reimbursement",
      headline: "Acoustic materials are a revenue decision.",
      body: "The link between ceiling NRC ratings and HCAHPS Quietness scores is documented in peer-reviewed research. GreenChainz connects the acoustic performance spec to the reimbursement rate impact — giving Hospital Administrators the data to justify acoustic material upgrades in capital project budgets.",
      bullets: [
        "HCAHPS score improvement data per acoustic intervention",
        "Medicare reimbursement rate impact calculator",
        "ROI model: acoustic material upgrade cost vs. reimbursement delta",
      ],
      cta: "Model the Reimbursement Impact",
    },
    {
      subject: "Last note: acoustic material data for {{company}}",
      headline: "The ceiling spec that improves your HCAHPS score.",
      body: "HCAHPS Quietness is the most directly addressable domain through a capital project spec. GreenChainz has the acoustic data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const universityCampusPlanner: RoleConfig = {
  roleTitle: "University Campus Planner",
  procurementLayer: "Sector Verticals",
  decisionDriver: "100-Year Lifecycle & Student Activism Response",
  engagementHook: "Frame as the 'durability as sustainability' play; provide century-scale lifecycle data; align with student divestment/electrification mandates",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "university_campus_planner",
  bingQueries: [
    "university campus planner sustainable facilities",
    "campus planning director higher education sustainability",
  ],
  steps: [
    {
      subject: "{{company}}: 100-year lifecycle data for the next capital project",
      headline: "Campus buildings last 100 years. The spec should be designed for it.",
      body: "University Campus Planners are building for multi-generational use under student and Board pressure to demonstrate climate commitment. GreenChainz provides 100-year lifecycle cost projections, durability data, and carbon footprint metrics for materials — giving campus planners the data to make the 'durability as sustainability' case to trustees and student sustainability groups.",
      bullets: [
        "100-year lifecycle cost projections per material",
        "Durability and maintenance cycle data for century-scale planning",
        "Thermal mass and passive performance data",
        "Carbon footprint per material for Scope 3 campus reporting",
        "Fossil fuel divestment alignment documentation",
      ],
      cta: "Build Your 100-Year Lifecycle Model Free",
    },
    {
      subject: "The material that satisfies the student divestment committee and the board",
      headline: "Durability is the sustainability argument that wins with trustees.",
      body: "University Boards approve capital projects on lifecycle cost — not environmental narrative. GreenChainz makes the durability case with century-scale lifecycle data, while simultaneously generating the sustainability documentation that satisfies student climate mandates. Both audiences, one data package.",
      bullets: [
        "Trustee-ready lifecycle cost and durability data",
        "Student-facing sustainability documentation package",
        "Electrification compatibility specs per material system",
      ],
      cta: "Build the Dual-Audience Case",
    },
    {
      subject: "Last note: 100-year lifecycle data for {{company}}",
      headline: "The spec that holds for a century — and the data that proves it.",
      body: "University buildings outlast the people who spec them. GreenChainz makes the century-scale case. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const storePlanningDirector: RoleConfig = {
  roleTitle: "Store Planning Director",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Rollout Efficiency & Cost per Square Foot",
  engagementHook: "Lead with multi-store rollout cost savings; pitch modular/reusable systems that reduce renovation CapEx across a fleet of stores",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "store_planning_director",
  bingQueries: [
    "store planning director retail construction sustainable",
    "store planning manager multi-unit rollout construction",
  ],
  steps: [
    {
      subject: "{{company}}: the spec that scales across 500 stores",
      headline: "Retail rollout efficiency starts with the material spec.",
      body: "Store Planning Directors managing multi-unit rollouts know that a $2/SF material decision multiplies across a fleet of stores. GreenChainz surfaces modular, reusable, and circular economy material systems that reduce renovation CapEx per store — with the sustainability documentation the brand narrative requires.",
      bullets: [
        "Modular system specs with reuse documentation",
        "Circular economy take-back program availability per product",
        "Cost per SF comparison across rollout-optimized alternatives",
        "Renovation CapEx reduction calculator for multi-store fleets",
        "Brand sustainability certification for consumer-facing claims",
      ],
      cta: "Model Your Fleet Rollout Cost Free",
    },
    {
      subject: "The modular fixture system that cut renovation CapEx 30% across 200 stores",
      headline: "Reusable systems reduce the cost of the next renovation.",
      body: "Store design cycles are compressing. GreenChainz surfaces circular economy material systems that are designed for disassembly and reuse — so the next store renovation starts with recovered materials rather than demolition waste, reducing CapEx per store.",
      bullets: [
        "Disassembly and reuse documentation per system",
        "Demolition waste elimination data",
        "Next-renovation CapEx reduction model",
      ],
      cta: "Find the Reusable Fleet Material",
    },
    {
      subject: "Last note: multi-store rollout material data for {{company}}",
      headline: "The spec that scales — and the cost data that proves it.",
      body: "Retail rollout cost is a material spec decision. GreenChainz has the data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const visualMerchandisingDirector: RoleConfig = {
  roleTitle: "Visual Merchandising Director",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Brand Storytelling & Disposal Cost Reduction",
  engagementHook: "Lead with disposal cost elimination across thousands of stores; emphasize lighter weight for shipping savings and collapsibility for storage savings",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "visual_merchandising_director",
  bingQueries: [
    "visual merchandising director retail sustainability",
    "VP visual merchandising sustainable displays",
  ],
  steps: [
    {
      subject: "{{company}}: lighter displays. Lower shipping cost. No disposal bill.",
      headline: "The display material that eliminates the disposal line item.",
      body: "Visual Merchandising Directors managing seasonal display programs across thousands of stores carry a significant disposal cost — particularly for cardboard, foam, and single-use plastic display components. GreenChainz surfaces recyclable, biodegradable, and collapsible display material alternatives with the weight, shipping, and disposal cost data to make the switch financially obvious.",
      bullets: [
        "Weight specs per display material — lighter alternatives flagged",
        "Collapsibility and storage efficiency ratings",
        "Disposal cost comparison per display program lifecycle",
        "Recycled content and biodegradability certifications",
        "Shipping cost impact per weight reduction",
      ],
      cta: "Model Your Display Disposal Cost Free",
    },
    {
      subject: "The display material that cut shipping cost 40% and eliminated disposal fees",
      headline: "Display weight is a logistics cost.",
      body: "GreenChainz calculates the shipping cost impact of lighter display materials across a fleet of stores — and surfaces biodegradable alternatives that eliminate the disposal contract entirely. For VMDs managing seasonal changeovers, that's a meaningful budget line.",
      bullets: [
        "Shipping cost per unit reduction by weight alternative",
        "Disposal contract elimination potential per material",
        "Biodegradability certification per material",
      ],
      cta: "Calculate the Shipping and Disposal Savings",
    },
    {
      subject: "Last note: display material cost data for {{company}}",
      headline: "Lighter. Collapsible. No disposal bill.",
      body: "Display material decisions are logistics and disposal decisions. GreenChainz has the data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const affordableHousingDeveloper: RoleConfig = {
  roleTitle: "Affordable Housing Developer",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Utility Allowance Optimization & NOI",
  engagementHook: "Frame high-efficiency envelopes as a financing mechanism that increases allowable rent under LIHTC; provide utility allowance reduction models",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "affordable_housing_developer",
  bingQueries: [
    "affordable housing developer LIHTC sustainable construction",
    "affordable housing developer Passive House energy efficiency",
  ],
  steps: [
    {
      subject: "{{company}}: Passive House envelope = higher allowable rent under LIHTC",
      headline: "The energy envelope spec is a LIHTC financing mechanism.",
      body: "Affordable Housing Developers know that LIHTC utility allowances directly affect maximum allowable rent — and that a high-performance building envelope reduces tenant utility costs, enabling higher rent under the utility allowance formula. GreenChainz provides the energy performance data for Passive House-level envelope materials with the LIHTC utility allowance impact modeled.",
      bullets: [
        "Passive House performance specs per envelope material",
        "LIHTC utility allowance reduction model per envelope scenario",
        "HVAC efficiency data per envelope improvement",
        "Energy modeling reports for financing applications",
        "NOI improvement projection per utility allowance reduction",
      ],
      cta: "Model Your LIHTC Utility Allowance Impact Free",
    },
    {
      subject: "The envelope spec that increased allowable rent $80/unit/month under LIHTC",
      headline: "Envelope performance is a rent model input.",
      body: "High-performance envelope materials reduce tenant utility costs — and under LIHTC's utility allowance framework, that reduction allows higher gross rent. GreenChainz builds the model from the insulation and window specs to the utility allowance reduction to the NOI improvement — the complete financing case.",
      bullets: [
        "Utility allowance reduction per envelope specification",
        "Gross rent uplift calculation per LIHTC formula",
        "NOI improvement model for financing applications",
      ],
      cta: "Build the LIHTC Financing Case",
    },
    {
      subject: "Last note: LIHTC envelope financing data for {{company}}",
      headline: "The spec that pays back in the rent model.",
      body: "Affordable housing performance specs are a financing tool. GreenChainz makes the model. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const leasingAgent: RoleConfig = {
  roleTitle: "Leasing Agent / Broker",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Lease Velocity & Rental Premium",
  engagementHook: "Show how sustainable finishes attract Class A tenants faster at 15%+ premium; provide market data on LEED/WELL occupancy rates",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "leasing_agent",
  bingQueries: [
    "leasing agent commercial real estate sustainable LEED",
    "commercial real estate broker green building WELL",
  ],
  steps: [
    {
      subject: "{{company}}: LEED-certified. 15% rental premium. Faster lease-up.",
      headline: "Sustainable specs close faster and at higher rent.",
      body: "Commercial Leasing Agents know that LEED-certified and WELL-registered assets command rent premiums and shorter vacancy periods with Class A tenants. GreenChainz provides the market data — LEED/WELL occupancy comparisons, rental premium benchmarks, time-to-lease data — that makes the tenant conversation a numbers conversation, not a narrative one.",
      bullets: [
        "LEED vs. non-certified rental premium data by market",
        "WELL registration vs. conventional occupancy rate comparison",
        "Time-to-lease benchmarks for green-certified assets",
        "Class A tenant mandate documentation for sustainability specs",
        "Market transaction data for green building valuation premiums",
      ],
      cta: "Access the Lease Premium Data Free",
    },
    {
      subject: "The tenant brief that made LEED certification a lease requirement",
      headline: "Corporate tenants are mandating green specs. Here's the data.",
      body: "Fortune 500 tenant sustainability mandates are requiring LEED certification in lease negotiations. GreenChainz surfaces the tenant mandate documentation and rental premium market data that brokers can use to advise Owners on specification decisions that directly affect leasing velocity.",
      bullets: [
        "Fortune 500 tenant sustainability mandate requirements",
        "LEED certification cost vs. rental premium ROI",
        "Occupancy rate data for certified vs. non-certified comparable assets",
      ],
      cta: "Get the Tenant Mandate Data",
    },
    {
      subject: "Last note: lease premium data for {{company}}",
      headline: "The spec that fills faster — and at higher rent.",
      body: "LEED certification is a leasing tool. GreenChainz has the market data. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const ownersRep: RoleConfig = {
  roleTitle: "Owner's Representative (Owner's Rep)",
  procurementLayer: "Sector Verticals",
  decisionDriver: "Fiduciary Responsibility & Spec Protection",
  engagementHook: "Position as the firewall ally protecting green specs from contractor VE cuts; provide Owner's Rep-ready justification documentation",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "owners_rep",
  bingQueries: [
    "owner's representative construction project management",
    "owner rep construction manager sustainable projects",
  ],
  steps: [
    {
      subject: "{{company}}: the documentation that stops the VE cut",
      headline: "Value Engineering cuts sustainable specs first. Here's the firewall.",
      body: "Owner's Representatives protecting sustainable spec requirements face a recurring challenge: VE processes that target green material specs as 'optional.' GreenChainz provides the fiduciary justification documentation — whole life cost data, liability documentation, and specification compliance rationale — that Owner's Reps need to protect the spec through VE.",
      bullets: [
        "Whole life cost justification per spec decision",
        "Liability and compliance rationale documentation",
        "Third-party verified data to support 'No Substitution' defense",
        "Stormwater permit and energy goal compliance documentation",
        "VE-resistance spec package per material system",
      ],
      cta: "Build Your VE Defense Package Free",
    },
    {
      subject: "The spec that survived VE — and the documentation that saved it",
      headline: "Fiduciary justification is the VE defense.",
      body: "Sustainable material specs survive VE when the justification is documented in advance. GreenChainz builds the Owner's Rep justification package — whole life cost, liability rationale, compliance documentation — before the VE meeting, not in response to it.",
      bullets: [
        "Pre-VE justification package per specification",
        "Comparable substitution analysis showing no equivalent performance",
        "Owner-directed spec protection documentation",
      ],
      cta: "Build the VE Defense Package",
    },
    {
      subject: "Last note: spec protection documentation for {{company}}",
      headline: "The sustainable spec, defended.",
      body: "VE defense requires documentation. GreenChainz builds it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── SUPPLY CHAIN ─────────────────────────────────────────────────────────────

const distributorWholesaler: RoleConfig = {
  roleTitle: "Distributor / Wholesaler (Branch Manager)",
  procurementLayer: "Supply Chain",
  decisionDriver: "Inventory Turns & Margin",
  engagementHook: "Lead with inventory efficiency and documentation simplicity; show how one SKU replaces three; make LEED paperwork instantly accessible to stop GC callback calls",
  purchaseVolume: "high",
  hiddenGem: false,
  crmCategory: "distributor",
  bingQueries: [
    "building materials distributor wholesaler sustainable products",
    "construction materials distributor LEED products",
  ],
  steps: [
    {
      subject: "{{company}}: one SKU. Three products replaced. Documentation instant.",
      headline: "Your GC customers are calling about LEED paperwork. Stop the calls.",
      body: "Distributors and Branch Managers know that the callbacks from GC customers asking for LEED documentation are a real cost. GreenChainz makes that documentation instantly accessible per SKU — and surfaces multi-function products that replace multiple SKUs, improving inventory turns while reducing the documentation support burden.",
      bullets: [
        "LEED documentation instantly accessible per product SKU",
        "Multi-function product database — one SKU replacing three",
        "Inventory turns optimization data per product category",
        "Pre-formatted LEED paperwork to stop GC callback calls",
        "Product handling ease and damage resistance data",
      ],
      cta: "Access LEED Documentation Instantly Free",
    },
    {
      subject: "The SKU that eliminated 3 callbacks last week",
      headline: "Documentation availability is a sales support cost.",
      body: "GreenChainz makes the LEED documentation your GC customers are calling about available in seconds — EPD, HPD, chain-of-custody, LEED credit contribution math — all packaged and downloadable per product. The support call that takes 20 minutes becomes a 30-second self-serve.",
      bullets: [
        "Self-serve documentation per SKU for GC customers",
        "LEED credit contribution pre-calculated per product",
        "Chain-of-custody documentation packaged per order",
      ],
      cta: "Set Up Instant Documentation Access",
    },
    {
      subject: "Last note: documentation efficiency for {{company}}",
      headline: "The documentation that stops the callbacks.",
      body: "LEED documentation callbacks are a cost. GreenChainz eliminates them. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const franchisee: RoleConfig = {
  roleTitle: "Franchisee (Small Business Owner)",
  procurementLayer: "Supply Chain",
  decisionDriver: "CapEx vs. OpEx & Short Payback Period",
  engagementHook: "Lead with sub-2-year payback period calculations; make the ROI irrefutable; acknowledge they pay for it personally",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "franchisee",
  bingQueries: [
    "franchise owner sustainable renovation energy efficiency",
    "small business franchisee LED lighting energy savings",
  ],
  steps: [
    {
      subject: "{{company}}: sub-2-year payback. You pay for it personally — so it has to work.",
      headline: "The ROI has to be irrefutable. Here's the model.",
      body: "Franchisees and small business owners making capital renovation decisions know that the payback period is the only number that matters — because they're writing the check. GreenChainz provides sub-2-year payback calculations for energy-efficient material upgrades, with utility savings projections that give you the number your lender needs.",
      bullets: [
        "Sub-2-year payback period calculations per upgrade",
        "Annual utility savings projections per material improvement",
        "Net-of-incentive payback including utility rebates",
        "Simple ROI model for lender and lessor approval",
        "Operational cost comparison vs. conventional materials",
      ],
      cta: "Calculate Your Payback Period Free",
    },
    {
      subject: "The LED + insulation package that paid back in 18 months",
      headline: "Every dollar of CapEx needs a clear OpEx return.",
      body: "The most effective sustainable material upgrades for franchise locations combine quick-payback envelope improvements with LED lighting — packages that pay back in 18-24 months and reduce ongoing utility costs for the duration of the lease. GreenChainz models the combined payback across the renovation package.",
      bullets: [
        "Combined package payback (LED + insulation + HVAC)",
        "Monthly cash flow improvement after upgrade",
        "Utility rebate programs by state",
      ],
      cta: "Model Your Combined Upgrade Payback",
    },
    {
      subject: "Last note: payback model for {{company}}",
      headline: "Sub-2-year payback. Here's the math.",
      body: "The capital decision pays for itself or it doesn't. GreenChainz shows you when. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const municipalProcurementOfficer: RoleConfig = {
  roleTitle: "Municipal / Government Procurement Officer",
  procurementLayer: "Supply Chain",
  decisionDriver: "Audit Safety & Compliance",
  engagementHook: "Lead with Cooperative Purchasing Contract availability (Sourcewell etc.); frame as audit-safe compliance tool that avoids political fallout",
  purchaseVolume: "medium",
  hiddenGem: false,
  crmCategory: "government_procurement",
  bingQueries: [
    "municipal government procurement officer sustainable materials",
    "government purchasing agent green building materials",
    "public procurement officer Buy Clean compliance",
  ],
  steps: [
    {
      subject: "{{company}}: Buy Clean compliant. Cooperative contract eligible. Audit-safe.",
      headline: "Sustainable procurement is only defensible when the documentation is there.",
      body: "Municipal Procurement Officers buying building materials under EPP (Environmentally Preferable Purchasing) mandates need audit-proof documentation — third-party verified EPD data, cooperative contract eligibility, and Buy Clean compliance records. GreenChainz provides all three in a format that survives inspector general scrutiny.",
      bullets: [
        "Buy Clean and EPP compliance documentation per product",
        "Cooperative Purchasing Contract eligibility (Sourcewell, NASPO) verified",
        "Third-party verified EPD data — not manufacturer self-certification",
        "Audit-proof procurement record per purchase",
        "LEED and Green Globes compliance documentation",
      ],
      cta: "Verify Cooperative Contract Eligibility Free",
    },
    {
      subject: "The cooperative contract that makes the sustainable spec audit-safe",
      headline: "Procurement compliance is the risk you can't ignore.",
      body: "Municipal procurement decisions made without cooperative contract coverage or third-party documentation are audit exposure. GreenChainz flags cooperative purchasing contract availability per product and generates the audit trail that protects the procurement decision.",
      bullets: [
        "Sourcewell and NASPO cooperative contract status per vendor",
        "Audit trail generation per purchase decision",
        "Inspector general-ready documentation package",
      ],
      cta: "Check Cooperative Contract Status",
    },
    {
      subject: "Last note: audit-safe procurement data for {{company}}",
      headline: "Compliant. Documented. Defensible.",
      body: "Government procurement audit exposure is eliminated with documentation. GreenChainz provides it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const greenRealtor: RoleConfig = {
  roleTitle: "Green Realtor / Green Real Estate Agent",
  procurementLayer: "Supply Chain",
  decisionDriver: "Resale Value & Storytelling",
  engagementHook: "Provide simple ROI narratives; equip with buyer-facing talking points",
  purchaseVolume: "low",
  hiddenGem: false,
  crmCategory: "green_realtor",
  bingQueries: [
    "green realtor sustainable home real estate agent",
    "eco-friendly real estate agent green certification",
  ],
  steps: [
    {
      subject: "{{company}}: the green home valuation data your buyers are asking for",
      headline: "Green home premiums are real. Here's the data to prove it.",
      body: "Green Realtors know that sustainable home features command premiums — but buyers want data, not narrative. GreenChainz provides the material-level sustainability documentation that backs up energy performance, indoor air quality, and low-toxicity claims with third-party verified EPD data — giving agents the buyer-facing proof points that close faster.",
      bullets: [
        "EPD and HPD documentation per material for buyer disclosure",
        "Energy performance data per material for financing appraisals",
        "Indoor air quality certifications for health-conscious buyers",
        "Resale value premium data for LEED and ENERGY STAR homes",
        "Simple buyer-facing talking points per material",
      ],
      cta: "Access Green Home Data Free",
    },
    {
      subject: "The solar roof spec that added $28K to the appraisal",
      headline: "The sustainable spec, turned into a price argument.",
      body: "GreenChainz turns material sustainability data into simple buyer-facing ROI narratives — energy savings projections, indoor air quality proof, and resale value data that agents can use in listing presentations and buyer conversations.",
      bullets: [
        "Energy savings projections for buyer disclosure",
        "Indoor air quality proof for health-conscious buyer pitch",
        "Resale premium data for listing presentations",
      ],
      cta: "Build Your Green Listing Narrative",
    },
    {
      subject: "Last note: green home valuation data for {{company}}",
      headline: "The sustainable spec turned into a price argument.",
      body: "Green home premiums need data behind them. GreenChainz has it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

const fireMarshal: RoleConfig = {
  roleTitle: "Fire Marshal / Code Official",
  procurementLayer: "Supply Chain",
  decisionDriver: "Public Safety & Code Approval",
  engagementHook: "Lead with code compliance and safety proof; provide approval precedents for mass timber and advanced insulation; position approval as the ultimate purchasing permit",
  purchaseVolume: "medium",
  hiddenGem: true,
  crmCategory: "fire_marshal",
  bingQueries: [
    "fire marshal code official building materials compliance",
    "building code official mass timber fire safety approval",
  ],
  steps: [
    {
      subject: "{{company}}: mass timber fire performance data — the approval precedents",
      headline: "The code approval is the purchasing permission. Here's the data.",
      body: "Fire Marshals and Code Officials reviewing mass timber, advanced insulation, and sustainable building systems need clear, documented fire performance data and approval precedents — not manufacturer assurances. GreenChainz surfaces third-party fire safety test results, UL certifications, and code approval precedent data that makes the review process faster and the approval defensible.",
      bullets: [
        "Fire resistance ratings and UL certification per product",
        "Mass timber approval precedents (IBC 2021 Chapter 23 references)",
        "Advanced insulation fire safety test results",
        "Charring rate data for CLT vs. steel at elevated temperatures",
        "Code compliance documentation formatted for AHJ submission",
      ],
      cta: "Access Fire Safety Data Free",
    },
    {
      subject: "The CLT charring data that changed the AHJ approval process",
      headline: "Mass timber fire performance is counterintuitive — and documented.",
      body: "Cross-Laminated Timber chars predictably at a known rate, maintaining structural integrity longer than unprotected steel in many fire scenarios. GreenChainz surfaces the third-party fire test data and IBC 2021 approval precedents that Code Officials need to approve mass timber systems with confidence.",
      bullets: [
        "CLT charring rate data from FM Global and UL testing",
        "IBC 2021 Chapter 23 compliance documentation",
        "Structural integrity comparison at elevated temperatures",
      ],
      cta: "Review the Fire Performance Data",
    },
    {
      subject: "Last note: fire safety compliance data for {{company}}",
      headline: "The approval, backed by data.",
      body: "Code Officials need third-party verified fire performance data. GreenChainz has it. Free to explore.",
      bullets: [],
      cta: "Start Free →",
    },
  ],
};

// ─── MASTER EXPORT ────────────────────────────────────────────────────────────

export const ROLE_CONFIGS: RoleConfig[] = [
  // Design Authorities
  architectOfRecord,
  projectArchitect,
  specificationWriter,
  leedAP,
  interiorDesigner,
  landscapeArchitect,
  // Financial Gatekeepers
  quantitySurveyor,
  valueEngineer,
  insuranceRiskManager,
  assetManager,
  realEstateAppraiser,
  // Execution Tier
  projectManagerGC,
  drywallSub,
  flooringSub,
  concreteSub,
  procurementSpecialist,
  superintendent,
  // Operational Stewards
  facilityManager,
  workplaceExperienceDirector,
  energyManager,
  cleaningServicesManager,
  // Strategic Leadership
  cso,
  chro,
  cpo,
  cmo,
  // Sector Verticals
  infectionControlOfficer,
  hospitalAdministrator,
  universityCampusPlanner,
  storePlanningDirector,
  visualMerchandisingDirector,
  affordableHousingDeveloper,
  leasingAgent,
  ownersRep,
  // Supply Chain
  distributorWholesaler,
  franchisee,
  municipalProcurementOfficer,
  greenRealtor,
  fireMarshal,
];

/** Fast lookup by crmCategory */
export const ROLE_BY_CATEGORY = new Map<string, RoleConfig>(
  ROLE_CONFIGS.map((r) => [r.crmCategory, r])
);
