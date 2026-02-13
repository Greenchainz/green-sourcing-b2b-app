/**
 * RFQ Supplier Matching Service
 *
 * Scores and ranks suppliers for an RFQ based on:
 *   1. Distance/location match (0-20 points)
 *   2. Certification matching (0-15 points)
 *   3. Material type preference matching (0-15 points)
 *   4. Supplier capacity factor (0-10 points)
 *   5. Premium supplier bonus (0-5 points)
 *   6. Verification bonus (0-5 points)
 *
 * Total: 0-70 raw, normalized to 0-100.
 *
 * Ported from Manus prototype. Uses PostgreSQL via lib/db.ts
 * and Azure Maps for distance calculation.
 */
import { query, queryOne, queryMany } from "../../db";
import { geocodeAddress, calculateDistance, getDistanceScore, Coordinates } from "./azure-maps";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupplierMatchResult {
  supplierId: number;
  supplierName: string;
  matchScore: number;
  distanceMiles: number | null;
  certMatches: string[];
  capacity: number | null;
  isPremium: boolean;
  isVerified: boolean;
}

// ─── Matching Engine ─────────────────────────────────────────────────────────

/**
 * Calculate match score for a single supplier against an RFQ.
 */
export async function calculateSupplierMatchScore(
  rfqId: number,
  supplierId: number,
  projectLocation: string
): Promise<number> {
  let score = 0;

  // Load supplier
  const supplier = await queryOne<any>("SELECT * FROM suppliers WHERE id = $1", [supplierId]);
  if (!supplier) return score;

  // Load supplier filters
  const supplierFilter = await queryOne<any>(
    "SELECT * FROM supplier_filters WHERE supplier_id = $1",
    [supplierId]
  );

  // Load RFQ
  const rfq = await queryOne<any>("SELECT * FROM rfqs WHERE id = $1", [rfqId]);
  if (!rfq) return score;

  // 1. Distance-based location match (+20 points)
  let rfqCoords: Coordinates | null = null;
  let supplierCoords: Coordinates | null = null;

  if (rfq.latitude && rfq.longitude) {
    rfqCoords = { latitude: Number(rfq.latitude), longitude: Number(rfq.longitude) };
  } else if (projectLocation) {
    rfqCoords = await geocodeAddress(projectLocation);
    if (rfqCoords) {
      await query(
        "UPDATE rfqs SET latitude = $1, longitude = $2 WHERE id = $3",
        [String(rfqCoords.latitude), String(rfqCoords.longitude), rfqId]
      );
    }
  }

  if (supplier.latitude && supplier.longitude) {
    supplierCoords = { latitude: Number(supplier.latitude), longitude: Number(supplier.longitude) };
  } else if (supplier.address) {
    const fullAddress = `${supplier.address}, ${supplier.city || ""}, ${supplier.state || ""} ${supplier.zip_code || ""}`;
    supplierCoords = await geocodeAddress(fullAddress);
    if (supplierCoords) {
      await query(
        "UPDATE suppliers SET latitude = $1, longitude = $2 WHERE id = $3",
        [String(supplierCoords.latitude), String(supplierCoords.longitude), supplierId]
      );
    }
  }

  if (rfqCoords && supplierCoords) {
    const distanceResult = await calculateDistance(supplierCoords, rfqCoords);
    if (distanceResult) {
      score += getDistanceScore(distanceResult.distanceMiles);
    }
  } else if (supplierFilter?.accepted_locations) {
    // Fallback to text-based location matching
    const locations = supplierFilter.accepted_locations.split(",").map((l: string) => l.trim());
    if (locations.some((loc: string) => projectLocation.toLowerCase().includes(loc.toLowerCase()))) {
      score += 10;
    }
  }

  // 2. Certification matching (+15 points)
  if (rfq.required_certifications && supplier.certifications) {
    const requiredCerts: string[] = Array.isArray(rfq.required_certifications)
      ? rfq.required_certifications
      : JSON.parse(rfq.required_certifications || "[]");
    const supplierCerts: string[] = Array.isArray(supplier.certifications)
      ? supplier.certifications
      : JSON.parse(supplier.certifications || "[]");

    const matchedCerts = requiredCerts.filter((cert) =>
      supplierCerts.some((sc) => sc.toLowerCase() === cert.toLowerCase())
    );

    if (matchedCerts.length > 0) {
      const certMatchPercentage = matchedCerts.length / requiredCerts.length;
      score += Math.round(15 * certMatchPercentage);
    }
  }

  // 3. Material type preference matching (+15 points)
  if (supplierFilter?.material_type_preferences) {
    const rfqMaterials = await queryMany<any>(
      "SELECT material_id FROM rfq_items WHERE rfq_id = $1",
      [rfqId]
    );

    if (rfqMaterials.length > 0) {
      const materialIds = rfqMaterials.map((m) => m.material_id).filter(Boolean);
      if (materialIds.length > 0) {
        const material = await queryOne<any>(
          "SELECT category FROM materials WHERE id = $1",
          [materialIds[0]]
        );

        const preferences: string[] = Array.isArray(supplierFilter.material_type_preferences)
          ? supplierFilter.material_type_preferences
          : JSON.parse(supplierFilter.material_type_preferences || "[]");

        if (material?.category) {
          const categoryMatch = preferences.some((pref) =>
            material.category.toLowerCase().includes(pref.toLowerCase())
          );
          if (categoryMatch) score += 15;
        }
      }
    }
  }

  // 4. Supplier capacity factor (+10 points)
  if (supplier.current_capacity !== null && supplier.current_capacity !== undefined) {
    if (supplier.current_capacity >= 70) score += 10;
    else if (supplier.current_capacity >= 40) score += 5;
    else if (supplier.current_capacity >= 20) score += 2;
  }

  // 5. Premium supplier bonus (+5 points)
  if (supplier.is_premium) score += 5;

  // 6. Verification bonus (+5 points)
  if (supplier.verified) score += 5;

  return Math.min(score, 100);
}

/**
 * Find and rank all matching suppliers for an RFQ.
 */
export async function findMatchingSuppliers(
  rfqId: number,
  projectLocation: string,
  limit: number = 20
): Promise<SupplierMatchResult[]> {
  // Get all active suppliers
  const suppliers = await queryMany<any>(
    "SELECT * FROM suppliers WHERE status = 'active' OR status IS NULL ORDER BY is_premium DESC"
  );

  const results: SupplierMatchResult[] = [];

  for (const supplier of suppliers) {
    const matchScore = await calculateSupplierMatchScore(rfqId, supplier.id, projectLocation);

    if (matchScore > 0) {
      results.push({
        supplierId: supplier.id,
        supplierName: supplier.company_name || supplier.name || "Unknown",
        matchScore,
        distanceMiles: null, // Could be populated from distance calc
        certMatches: [],
        capacity: supplier.current_capacity,
        isPremium: !!supplier.is_premium,
        isVerified: !!supplier.verified,
      });
    }
  }

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, limit);
}
