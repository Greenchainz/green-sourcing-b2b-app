/**
 * SWAP Engine — Scoring Schema
 * ─────────────────────────────
 * GreenChainz's decision-grade supplier matching engine.
 *
 * The SWAP Engine is not a "sustainability recommender." It is a
 * procurement-reality resolver: given what this project actually needs,
 * what can realistically be approved, sourced, priced, delivered, and
 * defended — and which of those options are more sustainable?
 *
 * Architecture:
 *   1. Hard gates   → eligibility (fail = no rank, period)
 *   2. Dimensions   → weighted scoring across all procurement realities
 *   3. AI reasoning → explainability + nuance over already-viable candidates
 *   4. Fallback     → always deterministic; AI layer is optional enhancement
 *
 * Source of truth: docs/research/PROCUREMENT_DECISION_MAKERS.md
 * Import from: @/lib/research (re-exported via index.ts)
 */

import { DecisionMakerTier } from "./decisionMakers";

// ── Hard Gates (eligibility — one failure = not ranked) ───────────────────────

export interface SwapGates {
  /** Material category overlaps the RFQ request */
  categoryMatch: boolean;
  /** Supplier covers the project's service area */
  serviceAreaCovers: boolean;
  /** Supplier is verified (not rejected/suspended) */
  verificationClears: boolean;
  /** EPD available if explicitly required by the RFQ */
  epdAvailableIfRequired: boolean;
  /** Required certifications (LEED, FSC, GreenGuard, etc.) are present */
  requiredCertsPresent: boolean;
  /** GWP is at or below the requested threshold (null = no threshold set) */
  gwpWithinThreshold: boolean | null;
  /** Supplier can produce a CSI-formatted submittal packet */
  submittaldReady: boolean;
}

export function gatesPassed(gates: SwapGates): boolean {
  return (
    gates.categoryMatch &&
    gates.serviceAreaCovers &&
    gates.verificationClears &&
    gates.epdAvailableIfRequired &&
    gates.requiredCertsPresent &&
    (gates.gwpWithinThreshold === null || gates.gwpWithinThreshold) &&
    gates.submittaldReady
  );
}

// ── Scoring Dimensions ────────────────────────────────────────────────────────
// Each dimension is 0–100. Final score = weighted sum / total weight.
// Weights reflect procurement reality, not idealism.

export interface SwapDimensions {
  // ── Spec & Compliance ────────────────────────────────────────────────────
  /** Hard spec compliance: ASTM, fire code, IECC, dimensions — weight: 30 */
  specCompliance: number;

  // ── Documentation Completeness ───────────────────────────────────────────
  /**
   * EPD depth (plant-specific > generic industry average),
   * HPD availability, chain-of-custody certs, "No Substitution"
   * clause supportability — weight: 15
   */
  documentationScore: number;

  // ── Sustainability Dimension (one of many, not the objective) ────────────
  /**
   * Carbon intensity vs. category baseline, EPD verification depth,
   * third-party cert alignment (LEED/WELL/BREEAM credits), Buy Clean
   * compliance, Scope 3 disclosure quality — weight: 15
   */
  sustainabilityScore: number;

  // ── Cost & Procurement Reality ───────────────────────────────────────────
  /**
   * Whole-life cost signals, payback period band, TCO vs. first-cost
   * ratio, whether the material prevents stranded-asset risk — weight: 10
   */
  costRealityScore: number;

  // ── Schedule & Execution ─────────────────────────────────────────────────
  /**
   * Lead time confidence, labor productivity signal (lightweight = faster
   * install, fewer callbacks), material consistency / defect rate,
   * packaging / waste diversion compliance — weight: 10
   */
  executionScore: number;

  // ── Location & Regional Availability ────────────────────────────────────
  /**
   * Haversine distance score (miles to project), regional distribution
   * confidence, local material = potential LEED regional credit,
   * tariff/delivery disruption risk — weight: 10
   */
  locationScore: number;

  // ── Risk & Defensibility ─────────────────────────────────────────────────
  /**
   * Litigation protection (tested, certified, documented),
   * fire/code approval status, insurance signals (mold-resistant,
   * non-combustible), supplier reliability / responsiveness — weight: 5
   */
  riskScore: number;

  // ── Supply Chain Integrity ───────────────────────────────────────────────
  /**
   * Local sourcing depth, chain-of-custody certs, inventory turn
   * confidence, ethical sourcing / forced-labor exposure — weight: 5
   */
  supplyChainScore: number;
}

export const SWAP_WEIGHTS: Record<keyof SwapDimensions, number> = {
  specCompliance:      30,
  documentationScore:  15,
  sustainabilityScore: 15,
  costRealityScore:    10,
  executionScore:      10,
  locationScore:       10,
  riskScore:            5,
  supplyChainScore:     5,
};

export function computeSwapScore(dimensions: SwapDimensions): number {
  const totalWeight = Object.values(SWAP_WEIGHTS).reduce((a, b) => a + b, 0);
  const weightedSum = (Object.keys(dimensions) as (keyof SwapDimensions)[]).reduce(
    (sum, key) => sum + dimensions[key] * SWAP_WEIGHTS[key],
    0
  );
  return Math.round(weightedSum / totalWeight);
}

// ── RFQ Context (what the SWAP Engine receives) ───────────────────────────────

export interface SwapContext {
  /** Material category from the RFQ */
  category: string;
  /** Free-text spec description */
  description?: string;
  /** Required certifications */
  certifications: string[];
  /** Maximum GWP in kgCO₂e/kg — null = no threshold */
  maxGwp: number | null;
  /** Whether an EPD is explicitly required */
  epdRequired: boolean;
  /** Quantity and unit */
  quantity?: number;
  unit?: string;
  /** Project location */
  projectCity?: string;
  projectState?: string;
  projectLat?: number;
  projectLng?: number;
  /** Project type — drives sector-specific scoring */
  projectType?: string;
  /**
   * The decision-maker tier of the person submitting this RFQ.
   * Adjusts which dimensions are weighted most heavily.
   * e.g. FinancialGatekeeper → costRealityScore weight +5
   *      Execution → executionScore weight +5
   *      DesignAuthority → documentationScore weight +5
   */
  submitterTier?: DecisionMakerTier;
}

// ── Explainability Object (what the UI surfaces per supplier) ─────────────────

export interface SwapExplanation {
  /** Short human-readable reason this supplier ranked here */
  primaryReason: string;
  /** Labels shown as badges in the UI — never "Best" or "AI Recommended" */
  badges: SwapBadge[];
  /** Which dimension drove the ranking up */
  topDimension: keyof SwapDimensions;
  /** Honest tradeoff vs. the next option, if applicable */
  tradeoffNote?: string;
  /** Miles from project (null if no geocoords) */
  distanceMiles?: number;
}

export type SwapBadge =
  | "Strong Match"
  | "High Sustainability"
  | "Fast Availability"
  | "Local Supplier"
  | "Meets All Requirements"
  | "EPD Verified"
  | "Also Viable"
  | "Regional Availability"
  | "LEED Ready"
  | "Full Documentation"
  | "Buy Clean Compliant"
  | "Scope 3 Disclosed";

// ── SWAP Result (what the engine returns per candidate) ───────────────────────

export interface SwapResult {
  supplierId: number;
  /** Final composite score 0–100 */
  swapScore: number;
  /** Whether all hard gates passed */
  eligible: boolean;
  gates: SwapGates;
  dimensions: Partial<SwapDimensions>;
  explanation: SwapExplanation;
  /** Source of ranking: deterministic scoring or agent-enhanced */
  source: "deterministic" | "agent";
}

// ── Pain Driver → Dimension Map ───────────────────────────────────────────────
// Used by the AI agent to understand which dimensions matter most per tier.

export const TIER_DIMENSION_EMPHASIS: Record<DecisionMakerTier, (keyof SwapDimensions)[]> = {
  [DecisionMakerTier.DesignAuthority]:    ["specCompliance", "documentationScore", "sustainabilityScore"],
  [DecisionMakerTier.FinancialGatekeeper]:["costRealityScore", "riskScore", "sustainabilityScore"],
  [DecisionMakerTier.Execution]:          ["executionScore", "locationScore", "supplyChainScore"],
  [DecisionMakerTier.Operational]:        ["costRealityScore", "executionScore", "riskScore"],
  [DecisionMakerTier.Strategic]:          ["sustainabilityScore", "supplyChainScore", "documentationScore"],
  [DecisionMakerTier.SectorSpecific]:     ["specCompliance", "riskScore", "documentationScore"],
  [DecisionMakerTier.SupplyChain]:        ["supplyChainScore", "executionScore", "costRealityScore"],
  [DecisionMakerTier.HiddenInfluencer]:   ["specCompliance", "riskScore", "documentationScore"],
};
