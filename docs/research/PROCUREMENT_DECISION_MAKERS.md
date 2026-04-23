# Procurement Decision-Makers — Who Specifies Sustainable Materials And Why

> Distilled from "Sustainable Material Decision-Makers Identified" (2026).
> Cross-references: [`DECISION_LOGIC_EXTRACTION.md`](../DECISION_LOGIC_EXTRACTION.md),
> [`PERSONA_SCRAPER_ARCHITECTURE.md`](../PERSONA_SCRAPER_ARCHITECTURE.md),
> [`HUNTER_AGENTS_ARCHITECTURE.md`](../HUNTER_AGENTS_ARCHITECTURE.md).
> Typed module: [`lib/research/decisionMakers.ts`](../../lib/research/decisionMakers.ts).

**Core premise:** sustainability is no longer a soft ethical metric — it is
a hard functionality of asset management, risk mitigation, operational
efficiency, and human capital retention. Different roles buy sustainability
for completely different reasons. **Messaging that ignores the role's actual
decision logic will be rejected.**

---

## The 8 Decision-Maker Tiers

| Tier | Bucket | What They Optimize For |
|------|--------|-----------------------|
| I | Design Authorities | Defensibility, code compliance, certification points, occupant wellness |
| II | Financial Gatekeepers | Whole-life cost, risk capital, asset liquidity, carbon budget |
| III | Execution Tier | Schedule, labor productivity, rework, defect rate |
| IV | Operational Stewards | Total Cost of Ownership, maintenance labor, utility bills |
| V | Strategic Level (C-Suite) | ESG scorecards, Scope 3, talent, brand alignment |
| VI | Sector-Specific | Sector-specific KPIs (HCAHPS, HAIs, lease velocity, campus lifecycle) |
| VII | Supply Chain | Inventory turns, payback period, margin, doc ease |
| VIII | Hidden Influencers | Code approval, resale narrative, EPP compliance |

---

## Full Role Table

Columns: **Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal**

### Tier I — Design Authorities

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Architect of Record (AOR) / Project Architect | Commercial architecture | Liability + code compliance (fire, thermal, IECC) | Litigation risk from material failure; sick-building syndrome | Low-VOC, fire-safe, non-combustible sustainable materials with testing docs attached | Building permit filings, fire code certifications, IECC compliance trails |
| Specification Writer | Gensler/HOK/AECOM/large firms | Defensibility; prevent VE substitution | VE cuts premium specs; unproven materials = risk | Data-backed specs (ASTM, ISO, LCA, EPD); "No Substitution" clauses lock the sale | CSI MasterFormat specs, EPD databases, ASTM compliance filings |
| LEED AP / Sustainability Consultant | Design + consulting | Points-system certification (LEED, BREEAM, WELL) | Missed cert target = reduced fee + reputation hit | Materials with EPD/HPD/sourcing docs; third-party verified | LEED project registrations, credit achievement data, documentation chains |
| Interior Designer (Commercial/Contract) | Corp real estate, HQs | Occupant health, productivity, 15-yr churn cycles | Talent attrition from unhealthy spaces | Antimicrobial textiles, biophilic elements, PET felt acoustics | Furniture specs, tenant fit-out cycles, replacement schedules |
| Landscape Architect | Site development | Stormwater mgmt, heat-island ordinances | Municipal stormwater fees; reflectivity codes | Permeable pavers, recycled aggregate, light-hardscape | Municipal stormwater permits, reflectivity ordinances, site plans |

### Tier II — Financial Gatekeepers

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Quantity Surveyor (QS) / Cost Consultant | UK + Commonwealth + major intl projects | Whole Life Costing (WLC), NPV, carbon budget | First-cost bias; carbon regs can exceed project carbon cap | High-perf sustainable glazing, durable roofs with 7-30yr payback | Cost models, LCA outputs, carbon budget frameworks |
| Value Engineer (VE) | GCs, design-build | Function/cost, system deletion, multifunctionality | Inefficient system redundancy; labor overhead | Sustainable materials that eliminate or combine trades (e.g., SIPs replace 3 systems) | Constructability studies, labor breakdowns, sequence schedules |
| Insurance Risk Manager / Underwriter | Insurance | Loss prevention, resilience, climate risk | Mold/fire/weather claims; carbon-heavy buildings face premium penalties | Fire-resistant mass timber, mold-resistant drywall, mineral wool | Insurance loss history, climate exposure ratings, premium models |
| Asset Manager (Real Estate) | Portfolio mgmt | Liquidity + "stranded asset" prevention (ESG mandates) | Buildings become obsolete (NYC LL97, energy regs) | Retrofit LEDs, efficient HVAC, green roofs — prevent legal lock-out | Energy audits, ESG mandates, code-compliance tracking |
| Real Estate Appraiser / Valuer | RE appraisal | Cap rate, NOI uplift from lower utilities | Developers can't justify green capex without valuation uplift | Green cert increases cap rate; higher NOI justifies premium | Comparable property valuations, NOI data, energy bill benchmarks |

### Tier III — Execution Tier

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Project Manager (GC) | GCs | Schedule, logistics, safety, waste diversion (75%+ landfill diversion mandates) | Workers' comp from toxins; waste mgmt cost | Low-VOC fast-install materials; minimal packaging; take-back programs | OSHA records, waste diversion metrics, packaging data |
| Subcontractor — Drywall/Framing | Drywall + framing | Labor productivity, ergonomics, callbacks | High labor cost/unit; callback rework is unpaid | Lightweight sustainable drywall (faster install), low-dust joint compounds | Material weight specs, productivity benchmarks, warranty claims |
| Subcontractor — Flooring | Flooring | Moisture mitigation, bond failure, adhesive-free install | Moisture-destroyed bonds; toxic fume work disruption | Breathable flooring, loose-lay LVT, polished concrete | Moisture test protocols, adhesive compatibility, failure rates |
| Subcontractor — Concrete | Concrete | Workability, cure time, labor efficiency | Pump failure, poor flow = labor cost overruns | Low-carbon mixes (fly ash, slag) with better workability | Mix designs, strength tests, carbon factors by mix |
| Procurement Specialist / Purchasing Agent | Large construction firms | Volume leverage, supply chain security, price volatility | Supply disruption, tariffs, delivery delays | Locally sourced sustainable + LEED regional credit combo | Supply chain maps, sourcing data, delivery schedules |
| Superintendent ("The Super") | Construction mgmt | Defect reduction, "make it work" execution | Material breakage, warping, punch-list rework | Sustainable composite lumber (straight, consistent) | Quality reports, defect logs, consistency metrics |

### Tier IV — Operational Stewards

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Facility Manager / Director of Facilities | FM | TCO, maintenance cycles, cleaning chemical labor | Frequent replacement (VCT wax 2x/yr); maintenance labor | Durable flooring (terrazzo, rubber), polished concrete; retro-commissioning | Maintenance cost data, utility bills, equipment lifecycle |
| Director of Workplace Experience | Tech/corp HQs | Friction reduction, retention vs. WFH competition | Top-talent turnover; loss of recruitment edge | Sustainable furniture, air purification, biophilic walls | Retention metrics, satisfaction surveys, occupancy trends |
| Energy Manager | Facilities engineering | kWh reduction, peak demand charge, ECM ROI | Peak AC loads driving demand charges; separate budget | Smart glass, insulation retrofits, LEDs, phase-change materials | Energy data, demand charges, ECM ROI models |
| Cleaning / Env Services Manager | Housekeeping | Hygiene, staff health, turnover, chemical storage risk | Respiratory injury claims; staff turnover | Green cleaning (electrolyzed water, microfiber) | Chemical inventory, worker comp injuries, housekeeping turnover |

### Tier V — Strategic (C-Suite)

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Chief Sustainability Officer (CSO) | C-suite | Corporate strategy, ESG reporting, Scope 3 | Stock threatened by poor ESG perception; GRI compliance | Mandate: "All new construction LEED Gold"; push procurement to low-carbon concrete + steel | ESG scorecards, GRI metrics, carbon accounting by scope |
| Chief People Officer / CHRO | HR | War for talent, cognitive productivity (COFX Harvard study: low VOC = higher cognition) | Gen Z/Millennial talent sensitivity; cognitive impact | Reject off-gassing materials; support sustainable upgrades | Recruitment metrics, cognitive productivity studies, satisfaction data |
| Chief Procurement Officer (CPO) | Enterprise procurement | Supply chain resilience, ethical sourcing, TCO | Forced labor/environmental disasters; reputational damage | Prefer chain-of-custody suppliers (FSC wood, etc.) | Supply chain audits, chain-of-custody certs, supplier scorecards |
| Chief Marketing Officer / Brand Director | Retail/consumer brands | Brand narrative, cognitive dissonance avoidance | Customer trust loss if brand contradicts store environment | Specify recycled materials in store design to match campaign | Brand guidelines, store design specs, campaign alignment |

### Tier VI — Sector-Specific

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Infection Control Officer (ICO) | Healthcare | Pathogen reservoirs, sterilization, HAIs | HAI penalties, patient safety liability | Seamless non-porous sustainable flooring (natural rubber, bio-based) | HAI incidence data, UV-C compatibility, porosity testing |
| Hospital Administrator | Healthcare | HCAHPS scores, Medicare reimbursement | HCAHPS directly affects reimbursement; noise = lost revenue | Acoustic sustainable ceiling tiles improve patient satisfaction | HCAHPS scores, Medicare formulas, patient complaint logs |
| University Campus Planner | Higher ed | 100-yr lifecycle, student activism, divestment pressure | Student/fossil-fuel divestment demands; legacy cost | Slate roofs, stone facades, thermal mass (durability-as-sustainability) | Campus master plans, divestment campaigns, building cycles |
| Store Planning Director | Multi-unit retail | Rollout efficiency, cost/sq-ft, circular economy | Fixture replacement every 5yrs = massive landfill cost | Modular reusable fixture systems | Rollout schedules, fixture cost data, replacement analyses |
| Visual Merchandising Director | Retail displays | Instagram aesthetic, disposal cost | Styrofoam/PVC disposal across thousands of stores | Recycled cardboard, biodegradable props (lighter shipping) | Display turnover, disposal costs, weight data |
| Affordable Housing Developer | RE development | OpEx vs. development cost; Utility Allowance | Thin margins; LIHTC utility allowance reduces rent capture | Passive House lowers utility bills → lowers UA → enables higher rents | LIHTC rent caps, UA formulas, per-unit energy data |
| Leasing Agent / Broker | Commercial RE | Time on market, lease velocity, Class A tenant mandates | Slow lease-up; Class A mandates LEED/WELL | Sustainable finishes = 6-mo faster lease, 15% premium rent | Lease-up timelines, rent premiums, corporate green mandates |
| Owner's Representative | Project mgmt | Fiduciary, protect specs from VE | Contractor cuts green specs to save money | Firewall against VE cuts; green-roof specs for stormwater/energy permits | Change orders, sustainability mandates, permit requirements |

### Tier VII — Supply Chain

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Distributor / Wholesaler — Branch Manager | Building material distribution | Inventory turns, margin, LEED doc ease | Dead stock; GC calls for missing LEED forms | Stock easy-doc sustainable materials; "Counter Guy" upsells | SKU turnover, sales-rep call data, LEED doc workflows |
| Franchisee (Small Business Owner) | Franchise QSR/retail | CapEx vs. OpEx, payback <2yr | Corporate specs, franchisee pays; ROI sensitivity | Efficient equipment with <2yr payback (fryers, LEDs) | Payback calc data, franchise capex, OpEx savings |

### Tier VIII — Hidden Influencers

| Role | Sector | Decision Logic | Pain Point | GreenChainz Hook | Scraper Data Signal |
|------|--------|----------------|-----------|------------------|---------------------|
| Municipal / Gov Procurement Officer | Gov | Compliance, lowest responsible bidder, EPP mandates | Audit risk, lowest-bidder liability, political fallout | Cooperative Purchasing Contracts (Sourcewell pre-vetted); EPP compliance box | Gov procurement mandates, co-op contracts, bid analysis |
| Green Realtor / Green RE Agent | Residential RE | Resale value storytelling, point-of-sale education | Customer price resistance; agent education gap | Educate buyer on premium; validate at sale | Comps, solar/green premiums, agent commissions |
| Fire Marshal / Code Official | Code enforcement | Public safety approval, material code compliance | Material disapproval blocks the purchase | Approve mass timber, advanced insulations (proven safe) | Code variance requests, material approval logs, fire test certs |

---

## Decision Logic Cheat Sheet

Use this when you're scoring a match or writing outreach — match the ask to
the logic, not to the material.

| Pain Driver | Roles That Hear It Loudest | Product Angle |
|-------------|----------------------------|---------------|
| **Litigation / liability** | AOR, Fire Marshal, Insurance Underwriter, ICO | "Tested, certified, documented" |
| **Defensibility of spec** | Spec Writer, Owner's Rep | "No Substitution" + EPD/LCA bundle |
| **Certification points** | LEED AP, CSO | LEED/WELL/BREEAM credit mapping |
| **Occupant health / cognition** | Interior Designer, CHRO, ICO, Hospital Admin | Low-VOC, acoustic, biophilic |
| **Whole-life cost** | QS, Asset Manager, Appraiser, FM | Payback, NPV, carbon budget |
| **Labor productivity** | VE, Subs, Super, Project Manager | "Faster install", callback reduction |
| **Utility cost / TCO** | Energy Manager, FM, Affordable Housing | kWh reduction, payback |
| **Supply chain resilience** | CPO, Procurement Specialist | Local sourcing, chain-of-custody |
| **Lease velocity / resale** | Leasing Agent, Green Realtor, Appraiser | Class A tenant mandate, premium rent |
| **Regulatory / code** | Fire Marshal, AOR, Gov Procurement | Variance approval, EPP compliance |

---

## Key Verbatim Quotes (Load-Bearing)

> "The contemporary landscape of material selection is driven by a complex
> ecosystem of decision-makers for whom sustainability is no longer a soft
> metric of ethics, but a hard functionality of asset management, risk
> mitigation, operational efficiency, and human capital retention."

> "From the specialized subcontractor who determines the brand of drywall
> adhesive based on cure times to the infection control officer who
> dictates the porosity of hospital flooring to prevent pathogen
> reservoirs, these roles are analyzed through their specific 'why'."

> "The Spec Writer determines the rigidity of the procurement process. If a
> Spec Writer includes a 'No Substitution' clause for a specific
> sustainable product, the contractor must buy it."

> "With new regulations requiring carbon reporting (such as the UK's
> Construction Playbook or EU Taxonomy), the QS now balances a 'Financial
> Budget' and a 'Carbon Budget.'"

---

## How To Use This File

- **Scraping output must tag every discovered person with a
  `DecisionMakerTier` and optionally a `Role` (use the enums in
  `lib/research/decisionMakers.ts`).**
- **Match scoring must down-weight messaging that targets the wrong pain
  driver for the role's tier.**
- **Onboarding questionnaires for architects must resolve to a tier within
  3 clicks** so the rest of the product can specialize.
