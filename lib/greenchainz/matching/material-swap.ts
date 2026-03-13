/**
 * Material Swap Intelligence Service
 *
 * Matches materials based on specs and suggests Good/Better/Best alternatives.
 * Uses the EWS architect reference model for swap recommendations.
 *
 * Ported from Manus prototype. This module uses the PostgreSQL query helpers
 * from lib/db.ts. All database calls go through the existing connection pool.
 */
import { queryMany, queryOne, query } from "../../db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SwapCandidate {
  materialId: number;
  materialName: string;
  manufacturerId: number | null;
  swapScore: number;
  swapTier: "good" | "better" | "best";
  swapReason: string;
  confidence: number;
  embodiedCarbonPer1000sf: number | null;
  pricePerUnit: number | null;
  leadTimeDays: number | null;
}

export interface SwapScoreResult {
  score: number;
  reason: string;
  confidence: number;
}

// ─── Swap Score Calculation ──────────────────────────────────────────────────

/**
 * Calculate swap score based on spec similarity.
 * Compares: category, embodied carbon, certifications, price.
 */
export async function calculateSwapScore(
  originalMaterialId: number,
  candidateMaterialId: number
): Promise<SwapScoreResult> {
  const [original, candidate] = await Promise.all([
    queryOne<any>("SELECT * FROM materials WHERE id = $1", [originalMaterialId]),
    queryOne<any>("SELECT * FROM materials WHERE id = $1", [candidateMaterialId]),
  ]);

  if (!original || !candidate) {
    return { score: 0, reason: "Material not found", confidence: 0 };
  }

  let score = 0;
  const reasons: string[] = [];
  let confidence = 0.5;

  // 1. Category match (required)
  if (original.category !== candidate.category) {
    return { score: 0, reason: "Different material category", confidence: 0 };
  }
  score += 20;
  reasons.push("Same category");
  confidence += 0.1;

  // 2. Embodied carbon comparison (40 points)
  if (original.embodied_carbon_per_1000sf && candidate.embodied_carbon_per_1000sf) {
    const carbonReduction =
      ((parseFloat(original.embodied_carbon_per_1000sf) -
        parseFloat(candidate.embodied_carbon_per_1000sf)) /
        parseFloat(original.embodied_carbon_per_1000sf)) *
      100;

    if (carbonReduction > 30) {
      score += 40;
      reasons.push(`${Math.round(carbonReduction)}% carbon reduction`);
      confidence += 0.2;
    } else if (carbonReduction > 15) {
      score += 25;
      reasons.push(`${Math.round(carbonReduction)}% carbon reduction`);
      confidence += 0.15;
    } else if (carbonReduction > 0) {
      score += 15;
      reasons.push(`${Math.round(carbonReduction)}% carbon reduction`);
      confidence += 0.1;
    }
  }

  // 3. Price comparison (20 points)
  if (original.price_per_unit && candidate.price_per_unit) {
    const priceDiff =
      ((parseFloat(original.price_per_unit) - parseFloat(candidate.price_per_unit)) /
        parseFloat(original.price_per_unit)) *
      100;

    if (priceDiff > 20) {
      score += 20;
      reasons.push(`${Math.round(priceDiff)}% cost savings`);
    } else if (priceDiff > 0) {
      score += 10;
      reasons.push(`${Math.round(priceDiff)}% cost savings`);
    } else if (priceDiff > -10) {
      score += 5;
      reasons.push("Similar price point");
    }
  }

  // 4. Certification comparison (20 points)
  const originalCerts = await queryMany<any>(
    "SELECT certification_name FROM material_certifications WHERE material_id = $1",
    [originalMaterialId]
  );
  const candidateCerts = await queryMany<any>(
    "SELECT certification_name FROM material_certifications WHERE material_id = $1",
    [candidateMaterialId]
  );

  const originalCertNames = new Set(originalCerts.map((c) => c.certification_name));
  const candidateCertNames = new Set(candidateCerts.map((c) => c.certification_name));
  const sharedCerts = Array.from(originalCertNames).filter((c) => candidateCertNames.has(c));

  if (sharedCerts.length > 0) {
    score += Math.min(20, sharedCerts.length * 5);
    reasons.push(`${sharedCerts.length} shared certifications`);
    confidence += 0.1;
  }

  return {
    score,
    reason: reasons.join(", "),
    confidence: Math.min(1.0, confidence),
  };
}

/**
 * Find swap candidates for a material.
 * Returns scored alternatives in the same category, ranked best-first.
 */
export async function findSwapCandidates(
  materialId: number,
  limit: number = 5
): Promise<SwapCandidate[]> {
  const original = await queryOne<any>("SELECT * FROM materials WHERE id = $1", [materialId]);
  if (!original) return [];

  // Find materials in the same category
  const candidates = await queryMany<any>(
    "SELECT * FROM materials WHERE category = $1 AND id != $2 LIMIT 20",
    [original.category, materialId]
  );

  const scoredCandidates: SwapCandidate[] = [];

  for (const candidate of candidates) {
    const { score, reason, confidence } = await calculateSwapScore(materialId, candidate.id);
    if (score >= 40) {
      scoredCandidates.push({
        materialId: candidate.id,
        materialName: candidate.name,
        manufacturerId: candidate.manufacturer_id,
        swapScore: score,
        swapTier: score >= 80 ? "best" : score >= 60 ? "better" : "good",
        swapReason: reason,
        confidence,
        embodiedCarbonPer1000sf: candidate.embodied_carbon_per_1000sf
          ? parseFloat(candidate.embodied_carbon_per_1000sf)
          : null,
        pricePerUnit: candidate.price_per_unit
          ? parseFloat(candidate.price_per_unit)
          : null,
        leadTimeDays: candidate.lead_time_days !== null ? parseInt(candidate.lead_time_days, 10) : null,
      });
    }
  }

  scoredCandidates.sort((a, b) => b.swapScore - a.swapScore);
  return scoredCandidates.slice(0, limit);
}

/**
 * Save a swap recommendation to the database.
 */
export async function saveSwapRecommendation(
  materialId: number,
  swapMaterialId: number,
  swapReason: string,
  swapScore: number,
  swapTier: "good" | "better" | "best",
  confidence: number,
  createdBy: "algorithm" | "agent" | "admin"
): Promise<number> {
  const result = await query(
    `INSERT INTO material_swaps
     (material_id, swap_material_id, swap_reason, swap_score, swap_tier, confidence, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [materialId, swapMaterialId, swapReason, swapScore, swapTier, confidence, createdBy]
  );
  return result.rows[0]?.id ?? 0;
}

/**
 * Get saved swap recommendations for a material.
 */
export async function getSavedSwaps(materialId: number): Promise<SwapCandidate[]> {
  const swaps = await queryMany<any>(
    `SELECT ms.id as swap_id, ms.swap_material_id as material_id,
            m.name as material_name, m.manufacturer_id,
            ms.swap_score, ms.swap_tier, ms.swap_reason, ms.confidence,
            m.embodied_carbon_per_1000sf, m.price_per_unit,
            m.lead_time_days, ms.usage_count, ms.created_by
     FROM material_swaps ms
     LEFT JOIN materials m ON ms.swap_material_id = m.id
     WHERE ms.material_id = $1
     ORDER BY ms.swap_score DESC`,
    [materialId]
  );

  return swaps.map((s: any) => ({
    materialId: s.material_id,
    materialName: s.material_name || "Unknown",
    manufacturerId: s.manufacturer_id,
    swapScore: parseFloat(s.swap_score || "0"),
    swapTier: s.swap_tier,
    swapReason: s.swap_reason || "",
    confidence: parseFloat(s.confidence || "0"),
    embodiedCarbonPer1000sf: s.embodied_carbon_per_1000sf
      ? parseFloat(s.embodied_carbon_per_1000sf)
      : null,
    pricePerUnit: s.price_per_unit ? parseFloat(s.price_per_unit) : null,
    leadTimeDays: s.lead_time_days !== null ? parseInt(s.lead_time_days, 10) : null,
  }));
}

/**
 * Increment usage count when a swap is used in an RFQ.
 */
export async function trackSwapUsage(
  materialId: number,
  swapMaterialId: number
): Promise<void> {
  await query(
    `UPDATE material_swaps
     SET usage_count = usage_count + 1
     WHERE material_id = $1 AND swap_material_id = $2`,
    [materialId, swapMaterialId]
  );
}
