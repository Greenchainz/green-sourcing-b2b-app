/**
 * CCPS — Composite Compliance-Performance Score Engine
 *
 * Calculates a 0-100 composite score for each material based on 6 pillars:
 *   1. Carbon (GWP relative to category baseline)
 *   2. Compliance (code standards, fire rating, building code)
 *   3. Certification (EPD, HPD, FSC, C2C, GREENGUARD, Declare)
 *   4. Cost (price relative to category baseline)
 *   5. Supply Chain (lead time, US manufacturing, regional availability)
 *   6. Health (VOC level, Red List, take-back program)
 *
 * Weights are persona-specific — an Architect weights Compliance 35%,
 * while a GC PM weights Cost 35%.
 *
 * TRUST LAYER POLICY:
 *   - Every score output carries a DataConfidence level (HIGH / MEDIUM / LOW / INSUFFICIENT)
 *   - Scores derived from incomplete data are flagged and display a mandatory disclaimer
 *   - No score is ever presented as a definitive valuation — only as a comparative ranking
 *   - Carbon delta values are estimates based on EPD data and must not be used for
 *     regulatory compliance reporting without independent verification
 */

import type { Material, CcpsBaseline, DecisionMakerPersona } from "../drizzle/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DataConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export interface DataQualityFlags {
  hasEpd: boolean;
  hasVerifiedGwp: boolean;
  hasBaselineData: boolean;
  hasPriceData: boolean;
  hasLeadTimeData: boolean;
  missingFields: string[];
  confidence: DataConfidence;
  disclaimer: string;
}

export interface CcpsBreakdown {
  carbonScore: number;
  complianceScore: number;
  certificationScore: number;
  costScore: number;
  supplyChainScore: number;
  healthScore: number;
  ccpsTotal: number;
  sourcingDifficulty: number;
  dataQuality: DataQualityFlags;
}

export interface PersonaWeights {
  carbonWeight: number;
  complianceWeight: number;
  certificationWeight: number;
  costWeight: number;
  supplyChainWeight: number;
  healthWeight: number;
}

// ─── Default Weights ─────────────────────────────────────────────────────────

// Default balanced weights (used when no persona is specified)
const DEFAULT_WEIGHTS: PersonaWeights = {
  carbonWeight: 0.25,
  complianceWeight: 0.20,
  certificationWeight: 0.15,
  costWeight: 0.15,
  supplyChainWeight: 0.15,
  healthWeight: 0.10,
};

// ─── Persona Weight Presets ───────────────────────────────────────────────────
// These are tuned to reflect real-world decision-maker priorities in AEC.

export const PERSONA_WEIGHTS: Record<string, PersonaWeights> = {
  // Architect: LEED/compliance-driven, carbon-conscious, cost secondary
  architect: {
    carbonWeight: 0.30,
    complianceWeight: 0.30,
    certificationWeight: 0.20,
    costWeight: 0.08,
    supplyChainWeight: 0.07,
    healthWeight: 0.05,
  },
  // GC Project Manager: cost and schedule dominate
  gc_pm: {
    carbonWeight: 0.10,
    complianceWeight: 0.20,
    certificationWeight: 0.10,
    costWeight: 0.30,
    supplyChainWeight: 0.25,
    healthWeight: 0.05,
  },
  // Procurement Officer: cost, supply chain, and certifications
  procurement: {
    carbonWeight: 0.10,
    complianceWeight: 0.15,
    certificationWeight: 0.20,
    costWeight: 0.30,
    supplyChainWeight: 0.20,
    healthWeight: 0.05,
  },
  // Sustainability Director: carbon and certifications dominate
  sustainability: {
    carbonWeight: 0.35,
    complianceWeight: 0.15,
    certificationWeight: 0.25,
    costWeight: 0.05,
    supplyChainWeight: 0.10,
    healthWeight: 0.10,
  },
  // Owner/Developer: balanced but cost-aware
  owner: {
    carbonWeight: 0.20,
    complianceWeight: 0.20,
    certificationWeight: 0.15,
    costWeight: 0.25,
    supplyChainWeight: 0.15,
    healthWeight: 0.05,
  },
};

// ─── Data Quality Assessment ──────────────────────────────────────────────────

/**
 * Assess the data quality of a material record and generate a confidence level
 * and mandatory disclaimer. This is the trust layer's primary safeguard against
 * false precision in scoring.
 */
export function assessDataQuality(
  material: Partial<Material>,
  baseline: Partial<CcpsBaseline>
): DataQualityFlags {
  const missingFields: string[] = [];

  // Critical fields — missing any of these drops confidence significantly
  if (!material.hasEpd) missingFields.push("EPD (Environmental Product Declaration)");
  if (!material.gwpValue || Number(material.gwpValue) === 0) missingFields.push("GWP value");
  if (!baseline.baselineGwpPerUnit || Number(baseline.baselineGwpPerUnit) === 0) missingFields.push("category carbon baseline");
  if (!material.pricePerUnit || Number(material.pricePerUnit) === 0) missingFields.push("price per unit");

  // Important fields — missing these reduces confidence
  if (!material.fireRating || material.fireRating === "N/A") missingFields.push("fire rating");
  if (!material.leadTimeDays) missingFields.push("lead time");
  if (!material.category) missingFields.push("material category");

  const hasEpd = !!material.hasEpd;
  const hasVerifiedGwp = !!material.gwpValue && Number(material.gwpValue) > 0;
  const hasBaselineData = !!baseline.baselineGwpPerUnit && Number(baseline.baselineGwpPerUnit) > 0;
  const hasPriceData = !!material.pricePerUnit && Number(material.pricePerUnit) > 0;
  const hasLeadTimeData = !!material.leadTimeDays && Number(material.leadTimeDays) > 0;

  // Determine confidence level
  let confidence: DataConfidence;
  let disclaimer: string;

  if (hasEpd && hasVerifiedGwp && hasBaselineData && hasPriceData && missingFields.length <= 1) {
    confidence = "HIGH";
    disclaimer =
      "Score based on verified EPD data. Carbon values sourced from manufacturer-declared Environmental Product Declarations. " +
      "GreenChainz scores are comparative rankings only and do not constitute regulatory compliance certification. " +
      "Verify all specifications with the manufacturer before procurement.";
  } else if (hasEpd && hasVerifiedGwp && missingFields.length <= 3) {
    confidence = "MEDIUM";
    disclaimer =
      "Score based on partial data. EPD verified but some fields are estimated or missing: " +
      missingFields.join(", ") + ". " +
      "This score is an estimate. Do not use for LEED documentation, regulatory submissions, or contract specifications without independent verification.";
  } else if (hasEpd || hasVerifiedGwp) {
    confidence = "LOW";
    disclaimer =
      "⚠ LIMITED DATA — Score is an estimate based on incomplete information. Missing: " +
      missingFields.join(", ") + ". " +
      "This score should not be used for procurement decisions without obtaining complete manufacturer data. " +
      "GreenChainz does not warrant the accuracy of scores derived from incomplete records.";
  } else {
    confidence = "INSUFFICIENT";
    disclaimer =
      "⚠ INSUFFICIENT DATA — This material lacks an EPD and verified carbon data. " +
      "The CCPS score cannot be reliably calculated. Missing: " + missingFields.join(", ") + ". " +
      "Do not use this score for any procurement, compliance, or sustainability reporting purpose. " +
      "Contact the manufacturer to obtain an Environmental Product Declaration before proceeding.";
  }

  return {
    hasEpd,
    hasVerifiedGwp,
    hasBaselineData,
    hasPriceData,
    hasLeadTimeData,
    missingFields,
    confidence,
    disclaimer,
  };
}

// ─── Individual Score Calculators (each returns 0-100) ───────────────────────

/**
 * Carbon Score: Lower GWP = higher score.
 * Uses category baseline for normalization.
 *
 * Fine-tuning: Uses a sigmoid-like curve to avoid extreme scores for
 * materials that are only marginally better or worse than baseline.
 * A material at exactly baseline = 50. At 50% of baseline = ~75. At 0 = 100.
 * At 2x baseline = ~25. At 3x baseline = 0.
 */
export function calcCarbonScore(material: Partial<Material>, baseline: Partial<CcpsBaseline>): number {
  const gwp = Number(material.gwpValue) || 0;
  const baseGwp = Number(baseline.baselineGwpPerUnit) || 1;
  if (baseGwp <= 0) return 50; // No baseline = neutral score, not penalized

  const ratio = gwp / baseGwp;

  // Piecewise linear: 0 GWP = 100, baseline = 50, 2x baseline = 10, 3x+ = 0
  // This prevents a material at 1.01x baseline from scoring 49 vs 51 for 0.99x
  let score: number;
  if (ratio <= 0) {
    score = 100;
  } else if (ratio <= 1.0) {
    // 0 to baseline: linear 100 → 50
    score = 100 - (ratio * 50);
  } else if (ratio <= 2.0) {
    // baseline to 2x: linear 50 → 10
    score = 50 - ((ratio - 1.0) * 40);
  } else {
    // 2x+ baseline: linear 10 → 0
    score = Math.max(0, 10 - ((ratio - 2.0) * 10));
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Compliance Score: Based on standards coverage.
 * Fine-tuning: LEED v4.1 compliance now adds bonus points. ASTM scoring
 * is capped at 3 standards (diminishing returns beyond that).
 */
export function calcComplianceScore(material: Partial<Material>): number {
  let score = 0;

  // Fire rating (25 pts) — required for most commercial applications
  if (material.fireRating && material.fireRating !== "N/A" && material.fireRating !== "") {
    score += 25;
  }

  // ASTM standards (up to 25 pts) — cap at 3 standards, 8 pts each
  if (material.astmStandards) {
    try {
      const standards = JSON.parse(material.astmStandards as string);
      score += Math.min(25, standards.length * 8);
    } catch {
      // Non-JSON string means at least one standard is present
      if ((material.astmStandards as string).trim().length > 0) score += 10;
    }
  }

  // Energy code compliance (25 pts total, split between Title 24 and IECC)
  if (material.meetsTitle24) score += 15;
  if (material.meetsIecc) score += 10;

  // Bonus: LEED v4.1 compliance signals (not yet a field — reserved for future)
  // if (material.meetsLeedV41) score += 10;

  return Math.min(100, score);
}

/**
 * Certification Score: Each certification adds points.
 * Fine-tuning: EPD is now worth 25 (up from 20) since it's the foundational
 * trust document. Recycled content bonus is tiered more granularly.
 */
export function calcCertificationScore(material: Partial<Material>): number {
  let score = 0;

  // EPD is the foundational trust document — weighted highest
  if (material.hasEpd) score += 25;

  // Health and transparency certifications
  if (material.hasHpd) score += 15;
  if (material.hasDeclare) score += 12;
  if (material.hasGreenguard) score += 12;

  // Sustainability certifications
  if (material.hasFsc) score += 15;
  if (material.hasC2c) score += 15;

  // Recycled content — tiered bonus
  const recycled = Number(material.recycledContentPct) || 0;
  if (recycled >= 75) score += 15;
  else if (recycled >= 50) score += 10;
  else if (recycled >= 25) score += 5;
  else if (recycled >= 10) score += 2;

  return Math.min(100, score);
}

/**
 * Cost Score: Lower price relative to baseline = higher score.
 * Fine-tuning: Uses a more forgiving curve. Materials within ±10% of
 * baseline should not be heavily penalized — cost parity is acceptable.
 */
export function calcCostScore(material: Partial<Material>, baseline: Partial<CcpsBaseline>): number {
  const price = Number(material.pricePerUnit) || 0;
  const basePrice = Number(baseline.baselinePricePerUnit) || 0;

  // No price data = neutral score (50), not penalized
  if (price === 0 || basePrice <= 0) return 50;

  const ratio = price / basePrice;

  // Piecewise: at 50% of baseline = 90, at baseline = 65, at 1.1x = 50, at 2x = 10
  let score: number;
  if (ratio <= 0.5) {
    score = 90 + (0.5 - ratio) * 20; // Capped at 100
  } else if (ratio <= 1.0) {
    // 50% to baseline: 90 → 65
    score = 90 - ((ratio - 0.5) * 50);
  } else if (ratio <= 1.1) {
    // baseline to 1.1x: 65 → 50 (grace zone — cost parity is fine)
    score = 65 - ((ratio - 1.0) * 150);
  } else if (ratio <= 2.0) {
    // 1.1x to 2x: 50 → 10
    score = 50 - ((ratio - 1.1) * 44);
  } else {
    score = Math.max(0, 10 - ((ratio - 2.0) * 10));
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Supply Chain Score: Based on lead time, US manufacturing, regional availability.
 * Fine-tuning: Lead time scoring is now relative to a 30-day baseline (not
 * the category baseline lead time, which is often missing). US manufacturing
 * bonus reduced from 30 to 20 — regional availability is more operationally
 * relevant than country of origin.
 */
export function calcSupplyChainScore(material: Partial<Material>, baseline: Partial<CcpsBaseline>): number {
  let score = 0;

  // Lead time (40 pts) — relative to 30-day standard
  const lead = Number(material.leadTimeDays) || 0;
  if (lead === 0) {
    score += 20; // Unknown lead time = neutral, not penalized
  } else if (lead <= 7) {
    score += 40; // In stock / 1 week
  } else if (lead <= 14) {
    score += 35;
  } else if (lead <= 30) {
    score += 28;
  } else if (lead <= 60) {
    score += 15;
  } else if (lead <= 90) {
    score += 5;
  }
  // > 90 days = 0 pts for lead time

  // US manufacturing (20 pts)
  if (material.usManufactured) score += 20;

  // Regional availability (40 pts) — most operationally impactful
  const miles = Number(material.regionalAvailabilityMiles) || 0;
  if (miles === 0) {
    score += 15; // Unknown = neutral
  } else if (miles <= 100) {
    score += 40;
  } else if (miles <= 250) {
    score += 30;
  } else if (miles <= 500) {
    score += 20;
  } else if (miles <= 1000) {
    score += 10;
  }
  // > 1000 miles = 0 pts

  return Math.min(100, score);
}

/**
 * Health Score: Based on VOC level, Red List, take-back program.
 * Fine-tuning: Red List penalty is now a hard deduction rather than
 * an omission — being on the Red List should actively hurt the score.
 */
export function calcHealthScore(material: Partial<Material>): number {
  let score = 50; // Start at neutral

  // VOC level (±25 pts)
  const voc = (material.vocLevel || "").toLowerCase().trim();
  if (voc === "none" || voc === "zero") score += 25;
  else if (voc === "low") score += 15;
  else if (voc === "medium") score += 0; // Neutral
  else if (voc === "high") score -= 20; // Active penalty

  // Red List — active penalty for containing restricted substances
  if (material.onRedList === true) score -= 30;
  else if (material.onRedList === false) score += 15; // Confirmed clean

  // Take-back program (end-of-life responsibility)
  if (material.hasTakeBackProgram) score += 10;

  // GREENGUARD certification (independent health verification)
  if (material.hasGreenguard) score += 10;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ─── Sourcing Difficulty (1-5 scale) ─────────────────────────────────────────

export function calcSourcingDifficulty(material: Partial<Material>): number {
  let difficulty = 1;

  const lead = Number(material.leadTimeDays) || 0;
  if (lead > 90) difficulty += 2;
  else if (lead > 45) difficulty += 1;

  if (!material.usManufactured) difficulty += 1;
  if (!material.hasEpd) difficulty += 1;

  const miles = Number(material.regionalAvailabilityMiles) || 0;
  if (miles > 1000) difficulty += 1;

  return Math.min(5, difficulty);
}

// ─── Composite Score ─────────────────────────────────────────────────────────

export function calculateCcps(
  material: Partial<Material>,
  baseline: Partial<CcpsBaseline>,
  weights: PersonaWeights = DEFAULT_WEIGHTS
): CcpsBreakdown {
  // Validate weights sum to ~1.0
  const weightSum = weights.carbonWeight + weights.complianceWeight +
    weights.certificationWeight + weights.costWeight +
    weights.supplyChainWeight + weights.healthWeight;
  const normalizedWeights: PersonaWeights = weightSum > 0 ? {
    carbonWeight: weights.carbonWeight / weightSum,
    complianceWeight: weights.complianceWeight / weightSum,
    certificationWeight: weights.certificationWeight / weightSum,
    costWeight: weights.costWeight / weightSum,
    supplyChainWeight: weights.supplyChainWeight / weightSum,
    healthWeight: weights.healthWeight / weightSum,
  } : DEFAULT_WEIGHTS;

  const carbonScore = calcCarbonScore(material, baseline);
  const complianceScore = calcComplianceScore(material);
  const certificationScore = calcCertificationScore(material);
  const costScore = calcCostScore(material, baseline);
  const supplyChainScore = calcSupplyChainScore(material, baseline);
  const healthScore = calcHealthScore(material);

  const ccpsTotal = Math.round(
    carbonScore * normalizedWeights.carbonWeight +
    complianceScore * normalizedWeights.complianceWeight +
    certificationScore * normalizedWeights.certificationWeight +
    costScore * normalizedWeights.costWeight +
    supplyChainScore * normalizedWeights.supplyChainWeight +
    healthScore * normalizedWeights.healthWeight
  );

  const sourcingDifficulty = calcSourcingDifficulty(material);
  const dataQuality = assessDataQuality(material, baseline);

  // If data is INSUFFICIENT, cap the score at 40 to prevent misleading high scores
  const cappedTotal = dataQuality.confidence === "INSUFFICIENT"
    ? Math.min(40, ccpsTotal)
    : dataQuality.confidence === "LOW"
    ? Math.min(65, ccpsTotal)
    : ccpsTotal;

  return {
    carbonScore,
    complianceScore,
    certificationScore,
    costScore,
    supplyChainScore,
    healthScore,
    ccpsTotal: Math.min(100, Math.max(0, cappedTotal)),
    sourcingDifficulty,
    dataQuality,
  };
}

/**
 * Convert a DecisionMakerPersona row to PersonaWeights.
 */
export function personaToWeights(persona: Partial<DecisionMakerPersona>): PersonaWeights {
  return {
    carbonWeight: Number(persona.carbonWeight) || DEFAULT_WEIGHTS.carbonWeight,
    complianceWeight: Number(persona.complianceWeight) || DEFAULT_WEIGHTS.complianceWeight,
    certificationWeight: Number(persona.certificationWeight) || DEFAULT_WEIGHTS.certificationWeight,
    costWeight: Number(persona.costWeight) || DEFAULT_WEIGHTS.costWeight,
    supplyChainWeight: Number(persona.supplyChainWeight) || DEFAULT_WEIGHTS.supplyChainWeight,
    healthWeight: Number(persona.healthWeight) || DEFAULT_WEIGHTS.healthWeight,
  };
}

/**
 * Calculate carbon delta between two materials or a material and an assembly.
 *
 * IMPORTANT: This is an ESTIMATE based on EPD-declared values.
 * The returned object includes a disclaimer that must be surfaced to the user.
 * Do not present carbon delta as a certified or audited figure.
 */
export function calcCarbonDelta(
  originalEc1000: number,
  alternativeEc1000: number,
  originalHasEpd: boolean = false,
  alternativeHasEpd: boolean = false,
): { delta: number; deltaPct: number; disclaimer: string; isEstimate: boolean } {
  const delta = originalEc1000 - alternativeEc1000;
  const deltaPct = originalEc1000 > 0 ? (delta / originalEc1000) * 100 : 0;

  const bothHaveEpd = originalHasEpd && alternativeHasEpd;
  const isEstimate = !bothHaveEpd;

  const disclaimer = bothHaveEpd
    ? "Carbon reduction based on manufacturer-declared EPD values. Actual savings may vary based on quantity, installation, and regional grid factors. Not a certified carbon offset."
    : "⚠ ESTIMATE — One or both materials lack a verified EPD. Carbon delta is calculated from estimated values and should not be used for LEED documentation, regulatory reporting, or carbon credit claims.";

  return {
    delta: Math.round(delta),
    deltaPct: Math.round(deltaPct * 10) / 10,
    disclaimer,
    isEstimate,
  };
}

// ─── Assembly-Level Carbon Impact ────────────────────────────────────────────

export type AssemblyImpactInput = {
  assemblyId: string;
  description?: string;
  epdNumber: string;
  gwpPerFunctionalUnit: number;
  msfFactor: number;
  functionalUnitLabel?: string;
};

export type AssemblyImpactResult = {
  assemblyId: string;
  epdNumber: string;
  totalKgCO2ePer1000SF: number;
  gwpPerFunctionalUnit: number;
  msfFactor: number;
};

export function calculateAssemblyLevelImpact(
  input: AssemblyImpactInput
): AssemblyImpactResult {
  const total = input.gwpPerFunctionalUnit * input.msfFactor;

  return {
    assemblyId: input.assemblyId,
    epdNumber: input.epdNumber,
    totalKgCO2ePer1000SF: Number(total.toFixed(0)),
    gwpPerFunctionalUnit: input.gwpPerFunctionalUnit,
    msfFactor: input.msfFactor,
  };
}
