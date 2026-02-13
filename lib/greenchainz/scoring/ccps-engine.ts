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
 * Ported from Manus prototype. This module is framework-agnostic —
 * it takes plain objects and returns plain objects. Wire it to your
 * database layer (PostgreSQL via lib/db.ts) in the API routes.
 */

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

/**
 * Material fields consumed by the CCPS engine.
 * Map your database rows to this shape before calling calculateCcps().
 */
export interface CcpsMaterial {
  gwpValue?: number | string | null;
  embodiedCarbonPer1000sf?: number | string | null;
  fireRating?: string | null;
  astmStandards?: string | null;
  meetsTitle24?: boolean | number | null;
  meetsIecc?: boolean | number | null;
  hasEpd?: boolean | number | null;
  hasHpd?: boolean | number | null;
  hasFsc?: boolean | number | null;
  hasC2c?: boolean | number | null;
  hasGreenguard?: boolean | number | null;
  hasDeclare?: boolean | number | null;
  recycledContentPct?: number | string | null;
  pricePerUnit?: number | string | null;
  leadTimeDays?: number | null;
  usManufactured?: boolean | number | null;
  regionalAvailabilityMiles?: number | null;
  vocLevel?: string | null;
  onRedList?: boolean | number | null;
  hasTakeBackProgram?: boolean | number | null;
}

/**
 * Baseline fields for a material category.
 * Typically stored in a ccps_baselines table keyed by category.
 */
export interface CcpsBaseline {
  baselineGwp?: number | string | null;
  baselineEcPer1000sf?: number | string | null;
  baselinePricePerUnit?: number | string | null;
  baselineLeadTimeDays?: number | string | null;
}

// ─── Default Weights ─────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: PersonaWeights = {
  carbonWeight: 0.25,
  complianceWeight: 0.20,
  certificationWeight: 0.15,
  costWeight: 0.15,
  supplyChainWeight: 0.15,
  healthWeight: 0.10,
};

/**
 * Persona-specific weight presets.
 * Keys match the decision_maker_personas.persona_key column.
 */
export const PERSONA_WEIGHT_PRESETS: Record<string, PersonaWeights> = {
  architect: {
    carbonWeight: 0.20,
    complianceWeight: 0.35,
    certificationWeight: 0.15,
    costWeight: 0.10,
    supplyChainWeight: 0.10,
    healthWeight: 0.10,
  },
  leed_ap: {
    carbonWeight: 0.30,
    complianceWeight: 0.15,
    certificationWeight: 0.25,
    costWeight: 0.10,
    supplyChainWeight: 0.10,
    healthWeight: 0.10,
  },
  gc_pm: {
    carbonWeight: 0.10,
    complianceWeight: 0.15,
    certificationWeight: 0.10,
    costWeight: 0.35,
    supplyChainWeight: 0.20,
    healthWeight: 0.10,
  },
  spec_writer: {
    carbonWeight: 0.15,
    complianceWeight: 0.30,
    certificationWeight: 0.20,
    costWeight: 0.10,
    supplyChainWeight: 0.15,
    healthWeight: 0.10,
  },
  owner: {
    carbonWeight: 0.15,
    complianceWeight: 0.15,
    certificationWeight: 0.15,
    costWeight: 0.25,
    supplyChainWeight: 0.15,
    healthWeight: 0.15,
  },
  facility_manager: {
    carbonWeight: 0.10,
    complianceWeight: 0.20,
    certificationWeight: 0.10,
    costWeight: 0.25,
    supplyChainWeight: 0.20,
    healthWeight: 0.15,
  },
};

// ─── Individual Score Calculators (each returns 0-100) ───────────────────────

/**
 * Carbon Score: Lower GWP relative to baseline = higher score.
 */
export function calcCarbonScore(material: CcpsMaterial, baseline: CcpsBaseline): number {
  const gwp = Number(material.gwpValue) || 0;
  const baseGwp = Number(baseline.baselineGwp) || 1;
  if (baseGwp <= 0) return 50;
  const ratio = gwp / baseGwp;
  return Math.round(Math.max(0, Math.min(100, 100 * (2 - ratio))));
}

/**
 * Compliance Score: Fire rating + ASTM standards + building codes.
 */
export function calcComplianceScore(material: CcpsMaterial): number {
  let score = 0;
  const fire = (material.fireRating || "").toUpperCase();
  if (fire.includes("A") || fire.includes("CLASS A")) score += 30;
  else if (fire.includes("B") || fire.includes("CLASS B")) score += 20;
  else if (fire.includes("C") || fire.includes("CLASS C")) score += 10;

  if (material.astmStandards) {
    try {
      const standards = typeof material.astmStandards === "string"
        ? JSON.parse(material.astmStandards)
        : material.astmStandards;
      score += Math.min(20, (Array.isArray(standards) ? standards.length : 0) * 8);
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
export function calcCertificationScore(material: CcpsMaterial): number {
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
export function calcCostScore(material: CcpsMaterial, baseline: CcpsBaseline): number {
  const price = Number(material.pricePerUnit) || 0;
  const basePrice = Number(baseline.baselinePricePerUnit) || 1;
  if (basePrice <= 0) return 50;
  const ratio = price / basePrice;
  return Math.round(Math.max(0, Math.min(100, 100 * (2 - ratio))));
}

/**
 * Supply Chain Score: Based on lead time, US manufacturing, regional availability.
 */
export function calcSupplyChainScore(material: CcpsMaterial, baseline: CcpsBaseline): number {
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
export function calcHealthScore(material: CcpsMaterial): number {
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

export function calcSourcingDifficulty(material: CcpsMaterial): number {
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
  material: CcpsMaterial,
  baseline: CcpsBaseline,
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
 * Convert a database persona row to PersonaWeights.
 * Accepts any object with the weight fields.
 */
export function personaToWeights(persona: Record<string, unknown>): PersonaWeights {
  return {
    carbonWeight: Number(persona.carbonWeight ?? persona.carbon_weight) || 0.25,
    complianceWeight: Number(persona.complianceWeight ?? persona.compliance_weight) || 0.20,
    certificationWeight: Number(persona.certificationWeight ?? persona.certification_weight) || 0.15,
    costWeight: Number(persona.costWeight ?? persona.cost_weight) || 0.15,
    supplyChainWeight: Number(persona.supplyChainWeight ?? persona.supply_chain_weight) || 0.15,
    healthWeight: Number(persona.healthWeight ?? persona.health_weight) || 0.10,
  };
}

/**
 * Calculate carbon delta between two materials.
 */
export function calcCarbonDelta(
  originalEc1000: number,
  alternativeEc1000: number
): { delta: number; deltaPct: number } {
  const delta = originalEc1000 - alternativeEc1000;
  const deltaPct = originalEc1000 > 0 ? (delta / originalEc1000) * 100 : 0;
  return { delta: Math.round(delta), deltaPct: Math.round(deltaPct * 10) / 10 };
}
