import { getDb } from "./db";
import { materials, materialSwaps, materialCertifications } from "../drizzle/schema";
import { eq, and, or, sql } from "drizzle-orm";

/**
 * Material Swap Intelligence Service
 * 
 * Matches materials based on specs and suggests Good/Better/Best alternatives.
 * Uses the EWS architect reference model for swap recommendations.
 */

interface SwapCandidate {
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

/**
 * Calculate swap score based on spec similarity
 * Compares: category, embodied carbon, certifications, price
 */
export async function calculateSwapScore(
  originalMaterialId: number,
  candidateMaterialId: number
): Promise<{ score: number; reason: string; confidence: number }> {
  const db = await getDb();
  if (!db) return { score: 0, reason: "Database unavailable", confidence: 0 };

  const [original, candidate] = await Promise.all([
    db.select().from(materials).where(eq(materials.id, originalMaterialId)).then((r: any) => r[0]),
    db.select().from(materials).where(eq(materials.id, candidateMaterialId)).then((r: any) => r[0]),
  ]);

  if (!original || !candidate) {
    return { score: 0, reason: "Material not found", confidence: 0 };
  }

  let score = 0;
  const reasons: string[] = [];
  let confidence = 0.5; // Base confidence

  // 1. Category match (required)
  if (original.category !== candidate.category) {
    return { score: 0, reason: "Different material category", confidence: 0 };
  }
  score += 20;
  reasons.push("Same category");
  confidence += 0.1;

  // 2. Embodied carbon comparison (40 points)
  if (original.embodiedCarbonPer1000sf && candidate.embodiedCarbonPer1000sf) {
    const carbonReduction = ((parseFloat(original.embodiedCarbonPer1000sf) - parseFloat(candidate.embodiedCarbonPer1000sf)) / parseFloat(original.embodiedCarbonPer1000sf)) * 100;
    
    if (carbonReduction > 30) {
      score += 40;
      reasons.push(`${Math.round(carbonReduction)}% lower embodied carbon`);
      confidence += 0.2;
    } else if (carbonReduction > 15) {
      score += 30;
      reasons.push(`${Math.round(carbonReduction)}% lower embodied carbon`);
      confidence += 0.15;
    } else if (carbonReduction > 0) {
      score += 20;
      reasons.push(`${Math.round(carbonReduction)}% lower embodied carbon`);
      confidence += 0.1;
    } else if (carbonReduction >= -10) {
      score += 10;
      reasons.push("Similar embodied carbon");
    }
  }

  // 3. Price comparison (20 points)
  if (original.pricePerUnit && candidate.pricePerUnit) {
    const priceDiff = ((parseFloat(candidate.pricePerUnit) - parseFloat(original.pricePerUnit)) / parseFloat(original.pricePerUnit)) * 100;
    
    if (priceDiff < -20) {
      score += 20;
      reasons.push(`${Math.abs(Math.round(priceDiff))}% cheaper`);
      confidence += 0.1;
    } else if (priceDiff < 0) {
      score += 15;
      reasons.push(`${Math.abs(Math.round(priceDiff))}% cheaper`);
    } else if (priceDiff < 10) {
      score += 10;
      reasons.push("Similar price");
    }
  }

  // 4. Certification match (20 points)
  const [originalCerts, candidateCerts] = await Promise.all([
    db.select().from(materialCertifications).where(eq(materialCertifications.materialId, originalMaterialId)),
    db.select().from(materialCertifications).where(eq(materialCertifications.materialId, candidateMaterialId)),
  ]);

  const originalCertNames = new Set(originalCerts.map((c) => c.certificationName));
  const candidateCertNames = new Set(candidateCerts.map((c) => c.certificationName));
  const sharedCerts = Array.from(originalCertNames).filter((c) => candidateCertNames.has(c));

  if (sharedCerts.length > 0) {
    score += Math.min(20, sharedCerts.length * 5);
    reasons.push(`${sharedCerts.length} shared certifications`);
    confidence += 0.1;
  }

  // Determine tier based on score
  const tier = score >= 80 ? "best" : score >= 60 ? "better" : "good";

  return {
    score,
    reason: reasons.join(", "),
    confidence: Math.min(1.0, confidence),
  };
}

/**
 * Find swap candidates for a material
 */
export async function findSwapCandidates(
  materialId: number,
  limit: number = 5
): Promise<SwapCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  const original = await db.select().from(materials).where(eq(materials.id, materialId)).then((r: any) => r[0]);

  if (!original) {
    return [];
  }

  // Find materials in the same category
  const candidates = await db
    .select()
    .from(materials)
    .where(and(eq(materials.category, original.category), sql`${materials.id} != ${materialId}`))
    .limit(20); // Get more candidates to filter

  const scoredCandidates: SwapCandidate[] = [];

  for (const candidate of candidates) {
    const { score, reason, confidence } = await calculateSwapScore(materialId, candidate.id);

    if (score >= 40) {
      // Only include decent swaps
      scoredCandidates.push({
        materialId: candidate.id,
        materialName: candidate.name,
        manufacturerId: candidate.manufacturerId,
        swapScore: score,
        swapTier: score >= 80 ? "best" : score >= 60 ? "better" : "good",
        swapReason: reason,
        confidence,
        embodiedCarbonPer1000sf: candidate.embodiedCarbonPer1000sf != null ? parseFloat(candidate.embodiedCarbonPer1000sf) : null,
        pricePerUnit: candidate.pricePerUnit != null ? parseFloat(candidate.pricePerUnit) : null,
        leadTimeDays: candidate.leadTimeDays != null ? parseInt(candidate.leadTimeDays, 10) : null,
      });
    }
  }

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.swapScore - a.swapScore);

  return scoredCandidates.slice(0, limit);
}

/**
 * Save a swap recommendation to the database
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
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db.insert(materialSwaps).values({
    materialId,
    swapMaterialId,
    swapReason,
    swapScore,
    swapTier,
    confidence: confidence.toString(),
    createdBy,
  });

  return result.insertId;
}

/**
 * Get saved swap recommendations for a material
 */
export async function getSavedSwaps(materialId: number): Promise<SwapCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  const swaps = await db
    .select({
      swapId: materialSwaps.id,
      materialId: materialSwaps.swapMaterialId,
      materialName: materials.name,
      manufacturerId: materials.manufacturerId,
      swapScore: materialSwaps.swapScore,
      swapTier: materialSwaps.swapTier,
      swapReason: materialSwaps.swapReason,
      confidence: materialSwaps.confidence,
      embodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
      pricePerUnit: materials.pricePerUnit,
      leadTimeDays: materials.leadTimeDays,
      usageCount: materialSwaps.usageCount,
      createdBy: materialSwaps.createdBy,
    })
    .from(materialSwaps)
    .leftJoin(materials, eq(materialSwaps.swapMaterialId, materials.id))
    .where(eq(materialSwaps.materialId, materialId))
    .orderBy(sql`${materialSwaps.swapScore} DESC`);

  return swaps.map((s: any) => ({
    swapId: s.swapId,
    materialId: s.materialId,
    materialName: s.materialName || "Unknown",
    manufacturerId: s.manufacturerId,
    swapScore: parseFloat(s.swapScore || "0"),
    swapTier: s.swapTier,
    swapReason: s.swapReason || "",
    confidence: parseFloat(s.confidence || "0"),
    embodiedCarbonPer1000sf: s.embodiedCarbonPer1000sf,
    pricePerUnit: s.pricePerUnit,
    leadTimeDays: s.leadTimeDays,
    createdBy: s.createdBy,
  }));
}

/**
 * Increment usage count when a swap is used in an RFQ
 */
export async function trackSwapUsage(materialId: number, swapMaterialId: number): Promise<void> {
  const db = getDb();
  const dbInstance = await db;
  if (!dbInstance) return;

  await dbInstance
    .update(materialSwaps)
    .set({ usageCount: sql`${materialSwaps.usageCount} + 1` })
    .where(and(eq(materialSwaps.materialId, materialId), eq(materialSwaps.swapMaterialId, swapMaterialId)));
}
