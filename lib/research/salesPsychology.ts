/**
 * Supplier-side sales psychology — typed data derived from
 * docs/research/SALES_PSYCHOLOGY.md
 *
 * These four frameworks are the product strategy, not marketing copy.
 * The Interceptor grammar + Material Credit Score shape defined here is
 * load-bearing — do not parallel-invent in feature code.
 */

import type { SupplierCategory } from "./supplierCategories";

export enum GreenChainzPitchStrategy {
  TrojanHorse = "TrojanHorse",
  Interceptor = "Interceptor",
  TieredMembership = "TieredMembership",
  HardSellCounter = "HardSellCounter",
}

export enum TierStatus {
  Gatekeeper = "Gatekeeper", // Founding 50
  Verified = "Verified",
  Basic = "Basic", // Freemium
}

export enum CertificationStatus {
  FullyVerified = "FullyVerified",
  InProgress = "InProgress",
  NotStarted = "NotStarted",
  Legacy = "Legacy",
}

export interface SalesFramework {
  strategy: GreenChainzPitchStrategy;
  thesis: string;
  mechanism: string;
  whenToDeploy: string;
  greenchainzImplementation: string[];
}

export const SALES_FRAMEWORKS: SalesFramework[] = [
  {
    strategy: GreenChainzPitchStrategy.TrojanHorse,
    thesis:
      "Suppliers have superior products but lack third-party certifications (EPDs, HPDs). GreenChainz provides the technical bridge — organize their test data, guide them through EPD generators, then position them as verified on the platform.",
    mechanism:
      "Bio-cement startups, hemp manufacturers, and mycelium companies are locked out of specification workflows because architects fear unproven materials. Spec Writers demand ASTM compliance, LCA data, EPD docs. GreenChainz offers a Certification Concierge — assist data organization, route through One Click LCA / EC3 / EPD International / EPD Hub, surface Verified Badge in marketplace.",
    whenToDeploy:
      "First conversation with any supplier expressing frustration over failure to penetrate Gensler / HOK / AECOM because they lack certifications.",
    greenchainzImplementation: [
      "Founding 50 tier gets assisted EPD generation",
      "Verified Badge visible on profile + in Interceptor suggestions",
      "Interceptor flags them when Spec Writer searches verified alternatives",
      "Platform does not issue certifications itself — it brokers access to third-party programs",
    ],
  },
  {
    strategy: GreenChainzPitchStrategy.Interceptor,
    thesis:
      "Suppliers are exhausted by passive directory listings (Sweets, ThomasNet). GreenChainz injects them directly into architect workflows at the moment of specification decision (Revit or Forma), circumventing competitor default choices.",
    mechanism:
      "Traditional directories are push-based; suppliers wait for phone calls. GreenChainz is pull-based — an architect is actively choosing a material in their CAD model and the Interceptor pops up: 'Did you know you can achieve 4000 PSI with 40% less carbon using Brimstone? ASTM C150 compliance attached.' This interrupts the specifier's habit loop.",
    whenToDeploy:
      "After establishing supplier pain (long sales cycles, gatekeepers, low phone-call conversion). Show a prototype: 'When an architect on this project specifies concrete, you'll be there.'",
    greenchainzImplementation: [
      "Revit add-in and Forma extension trigger Interceptor logic",
      "When material type is selected, platform queries DB for carbon/performance alternates",
      "Supplier gets impression data — how many times were you intercepted?",
      "Data becomes sales collateral",
      "Interceptor must always cite ASTM / code compliance data when suggesting an alternate — never pitch on carbon alone",
    ],
  },
  {
    strategy: GreenChainzPitchStrategy.TieredMembership,
    thesis:
      "Segmented pricing and service levels create urgency for early adopters while protecting cash-poor startups via performance-based pricing (pay when you win specs, not upfront subscription).",
    mechanism:
      "Tier 1 (Founding 50 / Gatekeeper) — deep integration, Interceptor-preferred, direct analytics, assisted EPD, Verified Badge prominence, annual fee or revenue share. Tier 2 (Verified) — listing, algorithm can pick them if no Tier 1 competitor exists, basic analytics. Tier 3 (Basic) — profile only. Early adopters pay premium for guaranteed visibility. Scarcity + FOMO.",
    whenToDeploy:
      "Launch phase — recruit first 50 suppliers across major categories with aggressive terms (discounted Tier 1, early-mover analytics bonus).",
    greenchainzImplementation: [
      "Tiered role in Interceptor algorithm weighting",
      "Dashboard showing impression / lead data",
      "Annual renewal contingent on engagement metrics",
      "Use TierStatus enum across supplier records",
    ],
  },
  {
    strategy: GreenChainzPitchStrategy.HardSellCounter,
    thesis:
      "Reframe cost not as marketing expense but as existential survival in the age of carbon regulation. The cost of NOT being on the platform is invisibility.",
    mechanism:
      "Cash-poor startups resist another subscription. Counter: 'If you're not in the digital carbon calculator, you don't exist to the modern architect. We are your digital twin. One specification pays for the subscription for ten years.' NYC LL97, CA Title 24, LEED v5 are forcing architects to use digital tools. Those tools will integrate GreenChainz. If your product isn't in GreenChainz, it's not in their carbon models, so it doesn't get specified.",
    whenToDeploy:
      "When a high-technical-merit, low-cash supplier hesitates on pricing.",
    greenchainzImplementation: [
      "Freemium tier — basic profile, limited Interceptor impressions",
      "Revenue share on resulting specs (5-10% of material invoice or project gross margin)",
      "Route to Tier 1 once supplier has proof of revenue through the platform",
    ],
  },
];

/**
 * Interceptor trigger grammar — load-bearing shape for Revit/Forma
 * extension and the backend carbon-alternate query.
 */
export interface InterceptorTrigger {
  /** What the architect typed/selected (e.g. "Generic Concrete 4000 PSI") */
  specType: string;
  /** Resolved material category */
  category: SupplierCategory;
  /** Competitor product name if detectable */
  competitorProduct?: string;
  /** Project jurisdiction (drives code compliance data shown) */
  jurisdiction?: string;
  /** Project type (commercial, healthcare, residential, etc.) */
  projectType?: string;
  /** User id for impression tracking */
  architectUserId?: string;
}

export interface InterceptorSuggestion {
  supplierId: string;
  supplierName: string;
  /** GWP delta vs the competitor/default */
  carbonDeltaPercent: number;
  /** Code compliance doc URL (ASTM, ISO, LEED credit map) */
  complianceDocUrl: string;
  /** Why this suggestion — human-readable */
  reason: string;
  /** Tier status of the supplier — drives ranking */
  tier: TierStatus;
  /** EPD verification status */
  certificationStatus: CertificationStatus;
}

/**
 * Material Credit Score — the aggregate visible to architects.
 * Inputs locked here so scoring is consistent across features.
 */
export interface MaterialCreditScore {
  /** Supplier fully verified (EPD + testing docs + years) */
  verified: boolean;
  /** Stage of the EPD journey */
  epdStatus: CertificationStatus;
  /** How many times this material has been specified via the platform */
  specificationCount: number;
  /** Cost premium vs baseline (%, can be negative) */
  costPremium: number;
  /** Carbon reduction vs category baseline (% lower GWP) */
  carbonReductionPercent: number;
  /** Readiness band */
  readinessScore: number; // 1-3
}

/**
 * Compute a simple Material Credit Score (0-100).
 * Weightings can be tuned; do not split the inputs across files.
 */
export function computeMaterialCreditScore(s: MaterialCreditScore): number {
  const verifiedBonus = s.verified ? 20 : 0;
  const epdBonus =
    s.epdStatus === CertificationStatus.FullyVerified ? 20 :
    s.epdStatus === CertificationStatus.InProgress ? 10 :
    s.epdStatus === CertificationStatus.Legacy ? 5 : 0;
  const specBonus = Math.min(20, s.specificationCount * 0.5); // capped
  const costPenalty = Math.max(-10, -s.costPremium * 0.5); // negative premium = bonus
  const carbonBonus = Math.min(20, s.carbonReductionPercent * 0.4);
  const readinessBonus = (s.readinessScore - 1) * 10; // 0, 10, 20
  const raw = verifiedBonus + epdBonus + specBonus + costPenalty + carbonBonus + readinessBonus;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Select a sales framework for a supplier based on their profile.
 * Used by outreach agents + onboarding flow routing.
 */
export function selectStrategy(input: {
  hasEpd: boolean;
  annualRevenueUsd: number;
  yearsInMarket: number;
  cashConstrained: boolean;
}): GreenChainzPitchStrategy {
  if (!input.hasEpd) return GreenChainzPitchStrategy.TrojanHorse;
  if (input.cashConstrained || input.annualRevenueUsd < 1_000_000) {
    return GreenChainzPitchStrategy.HardSellCounter;
  }
  if (input.yearsInMarket >= 5 && input.annualRevenueUsd >= 10_000_000) {
    return GreenChainzPitchStrategy.Interceptor;
  }
  return GreenChainzPitchStrategy.TieredMembership;
}
