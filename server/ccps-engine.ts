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
 */

import type { Material, CcpsBaseline, DecisionMakerPersona } from "../drizzle/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CcpsBreakdown {
  carbonScore: number;
  complianceScore: number;
  certificationScore: number;
  costScore: number;
  supplyChainScore: number;
  healthScore: number;
  ccpsTotal: number;
  sourcingDifficulty: number;
}

export interface PersonaWeights {
  carbonWeight: number;
  complianceWeight: number;
  certificationWeight: number;
  costWeight: number;
  supplyChainWeight: number;
  healthWeight: number;
}

// Default balanced weights
const DEFAULT_WEIGHTS: PersonaWeights = {
  carbonWeight: 0.25,
  complianceWeight: 0.20,
  certificationWeight: 0.15,
  costWeight: 0.15,
  supplyChainWeight: 0.15,
  healthWeight: 0.10,
};

// ─── Individual Score Calculators (each returns 0-100) ───────────────────────

/**
 * Carbon Score: Lower GWP = higher score.
 * Uses category baseline for normalization.
 */
export function calcCarbonScore(material: Partial<Material>, baseline: Partial<CcpsBaseline>): number {
  const gwp = Number(material.gwpValue) || 0;
  const baseGwp = Number(baseline.baselineGwpPerUnit) || 1;
  if (baseGwp <= 0) return 50;
  const ratio = gwp / baseGwp;
  const score = Math.round(Math.max(0, Math.min(100, 100 * (1 - (ratio - 1) * 0.5))));
  return score;
}

/**
 * Compliance Score: Based on standards coverage.
 * +25 for fire rating, +25 for ASTM standards, +25 for Title 24, +25 for IECC
 */
export function calcComplianceScore(material: Partial<Material>): number {
  let score = 0;
  if (material.fireRating && material.fireRating !== "N/A") score += 25;
  if (material.astmStandards) {
    try {
      const standards = JSON.parse(material.astmStandards as string);
      score += Math.min(25, standards.length * 8);
    } catch {
      score += 10;
    }
  }
  if (material.meetsTitle24) score += 25;
  if (material.meetsIecc) score += 25;
  return Math.min(100, score);
}

/**
 * Certification Score: Each certification adds points.
 * EPD=20, HPD=15, FSC=15, C2C=15, GREENGUARD=15, Declare=10, RecycledContent bonus=10
 */
export function calcCertificationScore(material: Partial<Material>): number {
  let score = 0;
  if (material.hasEpd) score += 20;
  if (material.hasHpd) score += 15;
  if (material.hasFsc) score += 15;
  if (material.hasC2c) score += 15;
  if (material.hasGreenguard) score += 15;
  if (material.hasDeclare) score += 10;
  const recycled = Number(material.recycledContentPct) || 0;
  if (recycled >= 50) score += 10;
  else if (recycled >= 25) score += 5;
  return Math.min(100, score);
}

/**
 * Cost Score: Lower price relative to baseline = higher score.
 */
export function calcCostScore(material: Partial<Material>, baseline: Partial<CcpsBaseline>): number {
  const price = Number(material.pricePerUnit) || 0;
  const basePrice = Number(baseline.baselinePricePerUnit) || 1;
  if (basePrice <= 0) return 50;
  const ratio = price / basePrice;
  const score = Math.round(Math.max(0, Math.min(100, 100 * (2 - ratio))));
  return score;
}

/**
 * Supply Chain Score: Based on lead time, US manufacturing, regional availability.
 */
export function calcSupplyChainScore(material: Partial<Material>, baseline: Partial<CcpsBaseline>): number {
  let score = 0;
  const lead = material.leadTimeDays || 0;
  const baseLead = Number(baseline.baselineLeadTimeDays) || 30;
  const leadRatio = lead / baseLead;
  score += Math.round(Math.max(0, Math.min(40, 40 * (2 - leadRatio))));
  if (material.usManufactured) score += 30;
  const miles = material.regionalAvailabilityMiles || 500;
  if (miles <= 500) score += 30;
  else if (miles <= 1000) score += 15;
  return Math.min(100, score);
}

/**
 * Health Score: Based on VOC level, Red List, take-back program.
 */
export function calcHealthScore(material: Partial<Material>): number {
  let score = 0;
  const voc = (material.vocLevel || "").toLowerCase();
  if (voc === "none") score += 40;
  else if (voc === "low") score += 25;
  else if (voc === "medium") score += 10;
  if (!material.onRedList) score += 30;
  if (material.hasTakeBackProgram) score += 15;
  if (material.hasGreenguard) score += 15;
  return Math.min(100, score);
}

// ─── Sourcing Difficulty (1-5 scale) ─────────────────────────────────────────

export function calcSourcingDifficulty(material: Partial<Material>): number {
  let difficulty = 1;
  const lead = material.leadTimeDays || 0;
  if (lead > 90) difficulty += 2;
  else if (lead > 45) difficulty += 1;
  if (!material.usManufactured) difficulty += 1;
  if (!material.hasEpd) difficulty += 1;
  return Math.min(5, difficulty);
}

// ─── Composite Score ─────────────────────────────────────────────────────────

export function calculateCcps(
  material: Partial<Material>,
  baseline: Partial<CcpsBaseline>,
  weights: PersonaWeights = DEFAULT_WEIGHTS
): CcpsBreakdown {
  const carbonScore = calcCarbonScore(material, baseline);
  const complianceScore = calcComplianceScore(material);
  const certificationScore = calcCertificationScore(material);
  const costScore = calcCostScore(material, baseline);
  const supplyChainScore = calcSupplyChainScore(material, baseline);
  const healthScore = calcHealthScore(material);

  const ccpsTotal = Math.round(
    carbonScore * weights.carbonWeight +
    complianceScore * weights.complianceWeight +
    certificationScore * weights.certificationWeight +
    costScore * weights.costWeight +
    supplyChainScore * weights.supplyChainWeight +
    healthScore * weights.healthWeight
  );

  const sourcingDifficulty = calcSourcingDifficulty(material);

  return {
    carbonScore,
    complianceScore,
    certificationScore,
    costScore,
    supplyChainScore,
    healthScore,
    ccpsTotal: Math.min(100, Math.max(0, ccpsTotal)),
    sourcingDifficulty,
  };
}

/**
 * Convert a DecisionMakerPersona row to PersonaWeights.
 */
export function personaToWeights(persona: Partial<DecisionMakerPersona>): PersonaWeights {
  return {
    carbonWeight: Number(persona.carbonWeight) || 0.25,
    complianceWeight: Number(persona.complianceWeight) || 0.20,
    certificationWeight: Number(persona.certificationWeight) || 0.15,
    costWeight: Number(persona.costWeight) || 0.15,
    supplyChainWeight: Number(persona.supplyChainWeight) || 0.15,
    healthWeight: Number(persona.healthWeight) || 0.10,
  };
}

/**
 * Calculate carbon delta between two materials or a material and an assembly.
 */
export function calcCarbonDelta(
  originalEc1000: number,
  alternativeEc1000: number
): { delta: number; deltaPct: number } {
  const delta = originalEc1000 - alternativeEc1000;
  const deltaPct = originalEc1000 > 0 ? (delta / originalEc1000) * 100 : 0;
  return { delta: Math.round(delta), deltaPct: Math.round(deltaPct * 10) / 10 };
}
