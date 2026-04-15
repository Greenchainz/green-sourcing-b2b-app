/**
 * CCPS v2 Scorer
 *
 * Composite Compliance-Performance Score: 4-factor ranking system
 * Derived from Matching Algorithm Spec §3
 *
 * Factors:
 * 1. Carbon Score (S_carbon) — Embodied carbon vs. category baseline
 * 2. Compliance Score (S_compliance) — Code + standards compliance
 * 3. Cost Score (S_cost) — Price relative to category average
 * 4. Health Score (S_health) — VOC + material health
 *
 * CCPS = (W_carbon × S_carbon) + (W_compliance × S_compliance)
 *      + (W_cost × S_cost) + (W_health × S_health)
 *
 * Weights are persona-dependent (AOR, LEED AP, GC PM, Spec Writer)
 */

import { getDb } from "../db";
import { epdMaterials } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type Persona = "aor" | "leed_ap" | "gc_pm" | "spec_writer";

interface FactorScore {
  carbon: number;
  compliance: number;
  cost: number;
  health: number;
}

interface CCPSResult {
  total: number; // 0-100
  breakdown: FactorScore;
  persona: Persona;
}

/**
 * Persona-weighted CCPS calculations
 * Derived from Decision-Makers Ecosystem Analysis
 */
const personaWeights: Record<Persona, FactorScore> = {
  aor: { carbon: 0.35, compliance: 0.3, cost: 0.15, health: 0.2 },
  leed_ap: { carbon: 0.4, compliance: 0.2, cost: 0.05, health: 0.35 },
  gc_pm: { carbon: 0.15, compliance: 0.25, cost: 0.5, health: 0.1 },
  spec_writer: { carbon: 0.3, compliance: 0.35, cost: 0.1, health: 0.25 },
};

/**
 * Carbon Score (S_carbon) — 0-100
 *
 * Measures embodied carbon relative to assembly category baseline.
 * Formula: max(0, min(100, 50 + (baseline_gwp - material_gwp) / baseline_gwp × 50))
 *
 * Baseline GWP = 50 points
 * Material 50% better = 100 points
 * Material 50% worse = 0 points
 */
async function computeCarbonScore(
  materialId: number,
  categoryBaseline: number,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const [material] = await db
    .select({ gwp: epdMaterials.gwpPer1000sf })
    .from(epdMaterials)
    .where(eq(epdMaterials.id, materialId));

  if (!material || material.gwp === null) {
    return 50; // Unknown = baseline
  }

  const materialGwp = parseFloat(material.gwp.toString());

  if (categoryBaseline === 0) {
    return 50;
  }

  const score = 50 + ((categoryBaseline - materialGwp) / categoryBaseline) * 50;
  return Math.max(0, Math.min(100, score));
}

/**
 * Compliance Score (S_compliance) — 0-100, additive
 *
 * Binary and additive points based on code requirements:
 * - Valid EPD (not expired) = 25 pts
 * - ASTM/ISO standard documented = 25 pts
 * - Title 24 compliant = 15 pts
 * - IECC compliant = 15 pts
 * - Fire rating documented = 10 pts
 * - VOC compliant = 10 pts
 * Max 100 pts
 */
async function computeComplianceScore(materialId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const [material] = await db
    .select({
      epdExpiry: epdMaterials.epdExpiry,
      astmStandards: epdMaterials.astmStandards,
      title24Compliant: epdMaterials.title24Compliant,
      ieccCompliant: epdMaterials.ieccCompliant,
      fireRating: epdMaterials.fireRating,
      vocCompliant: epdMaterials.vocCompliant,
    })
    .from(epdMaterials)
    .where(eq(epdMaterials.id, materialId));

  if (!material) return 0;

  let score = 0;

  // Valid EPD (not expired)
  if (
    material.epdExpiry &&
    new Date(material.epdExpiry) > new Date()
  ) {
    score += 25;
  }

  // ASTM/ISO standard documented
  if (
    material.astmStandards &&
    Array.isArray(material.astmStandards) &&
    material.astmStandards.length > 0
  ) {
    score += 25;
  }

  // Title 24 compliant
  if (material.title24Compliant === true) {
    score += 15;
  }

  // IECC compliant
  if (material.ieccCompliant === true) {
    score += 15;
  }

  // Fire rating documented
  if (material.fireRating && material.fireRating.length > 0) {
    score += 10;
  }

  // VOC compliant
  if (material.vocCompliant === true) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Cost Score (S_cost) — 0-100, inverse relationship
 *
 * Lower cost = higher score. Relative to category average.
 * Formula: max(0, min(100, 50 + (avg_price - material_price) / avg_price × 50))
 *
 * At category average = 50 points
 * 50% cheaper = 100 points
 * 50% more expensive = 0 points
 */
async function computeCostScore(
  materialId: number,
  categoryAvgPrice: number,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const [material] = await db
    .select({ price: epdMaterials.pricePerUnit })
    .from(epdMaterials)
    .where(eq(epdMaterials.id, materialId));

  if (!material || material.price === null || categoryAvgPrice === 0) {
    return 50; // Unknown = baseline
  }

  const materialPrice = parseFloat(material.price.toString());
  const score =
    50 + ((categoryAvgPrice - materialPrice) / categoryAvgPrice) * 50;

  return Math.max(0, Math.min(100, score));
}

/**
 * Health Score (S_health) — 0-100, additive
 *
 * Material health and indoor air quality points:
 * - VOC below CDPH v1.2 = 30 pts
 * - Not on Red List = 25 pts
 * - HPD with full disclosure = 20 pts
 * - GREENGUARD Gold certified = 15 pts
 * - Antimicrobial documented = 10 pts
 * Max 100 pts
 */
async function computeHealthScore(materialId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const [material] = await db
    .select({
      vocCompliant: epdMaterials.vocCompliant,
      notOnRedList: epdMaterials.notOnRedList,
      hpdAvailable: epdMaterials.hpdAvailable,
      greenguardGold: epdMaterials.greenguardGold,
    })
    .from(epdMaterials)
    .where(eq(epdMaterials.id, materialId));

  if (!material) return 0;

  let score = 0;

  // VOC below CDPH v1.2
  if (material.vocCompliant === true) {
    score += 30;
  }

  // Not on Red List
  if (material.notOnRedList === true) {
    score += 25;
  }

  // HPD available with full disclosure
  if (material.hpdAvailable === true) {
    score += 20;
  }

  // GREENGUARD Gold certified
  if (material.greenguardGold === true) {
    score += 15;
  }

  // Antimicrobial documented
  // Note: Would need a new column for this. For now, skip.
  // if (material.antimicrobialDocumented === true) {
  //   score += 10;
  // }

  return Math.min(100, score);
}

/**
 * Compute CCPS for a material with category baseline + average price
 *
 * @param materialId Material ID from epd_materials
 * @param categoryBaseline Median GWP for the assembly category (from category-baseline service)
 * @param categoryAvgPrice Average price for the category
 * @param persona Architect persona (AOR, LEED AP, GC PM, Spec Writer)
 * @returns CCPS result with total score (0-100) + factor breakdown
 */
export async function computeCCPS(
  materialId: number,
  categoryBaseline: number,
  categoryAvgPrice: number,
  persona: Persona = "aor",
): Promise<CCPSResult> {
  const [carbon, compliance, cost, health] = await Promise.all([
    computeCarbonScore(materialId, categoryBaseline),
    computeComplianceScore(materialId),
    computeCostScore(materialId, categoryAvgPrice),
    computeHealthScore(materialId),
  ]);

  const breakdown: FactorScore = { carbon, compliance, cost, health };
  const weights = personaWeights[persona];

  const total =
    weights.carbon * carbon +
    weights.compliance * compliance +
    weights.cost * cost +
    weights.health * health;

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown,
    persona,
  };
}

/**
 * Batch compute CCPS for multiple materials (for ranking)
 * Use this when finding alternatives for a spec row
 */
export async function computeCCPSBatch(
  materialIds: number[],
  categoryBaseline: number,
  categoryAvgPrice: number,
  persona: Persona = "aor",
): Promise<Map<number, CCPSResult>> {
  const results = new Map<number, CCPSResult>();

  await Promise.all(
    materialIds.map(async (id) => {
      const result = await computeCCPS(id, categoryBaseline, categoryAvgPrice, persona);
      results.set(id, result);
    }),
  );

  return results;
}
