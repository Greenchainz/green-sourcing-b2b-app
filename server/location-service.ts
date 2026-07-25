import { getDb } from "./db";
import { complianceRules, regionalSwapPatterns, shippingCosts, climateZoneAdjustments, locationPricingAdjustments, suppliers } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Location Service — Handles location-aware queries for swap engine
 * Calculates distances, compliance rules, and regional patterns
 */

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get suppliers within a specified distance and matching criteria
 */
export async function getNearbySuppliers(latitude: number, longitude: number, radiusMiles: number = 100, options?: { certifications?: string[]; materialTypes?: string[] }) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get all suppliers with location data
    const allSuppliers = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        latitude: suppliers.latitude,
        longitude: suppliers.longitude,
        certifications: suppliers.certifications,
        sustainabilityScore: suppliers.sustainabilityScore,
        isPremium: suppliers.isPremium,
        currentCapacity: suppliers.currentCapacity,
      })
      .from(suppliers)
      .where(eq(suppliers.verified, true));

    // Filter by distance and criteria, attach computed distance
    const nearby = allSuppliers
      .filter((supplier) => {
        if (!supplier.latitude || !supplier.longitude) return false;
        const distance = calculateDistance(latitude, longitude, Number(supplier.latitude), Number(supplier.longitude));
        return distance <= radiusMiles;
      })
      .filter((supplier) => {
        if (!options?.certifications || options.certifications.length === 0) return true;
        const supplierCerts = supplier.certifications ? JSON.parse(String(supplier.certifications)) : [];
        return options.certifications.some((cert) => supplierCerts.includes(cert));
      })
      .map((supplier) => ({
        ...supplier,
        distanceMiles: Math.round(
          calculateDistance(latitude, longitude, Number(supplier.latitude), Number(supplier.longitude)) * 10
        ) / 10,
      }))
      .sort((a, b) => {
        // Sort by distance (ascending), break ties by sustainability score
        if (a.distanceMiles !== b.distanceMiles) return a.distanceMiles - b.distanceMiles;
        return (Number(b.sustainabilityScore) || 0) - (Number(a.sustainabilityScore) || 0);
      });

    return nearby;
  } catch (error) {
    console.error("Error getting nearby suppliers:", error);
    return [];
  }
}

/**
 * Get compliance rules for a specific state
 */
export async function getComplianceRulesForState(state: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [rules] = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.state, state));

    return rules || null;
  } catch (error) {
    console.error("Error getting compliance rules:", error);
    return null;
  }
}

/**
 * Get regional swap patterns for a location
 */
export async function getRegionalSwapPatterns(state: string, materialType?: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [eq(regionalSwapPatterns.state, state)];
    if (materialType) {
      conditions.push(eq(regionalSwapPatterns.originalMaterial, materialType));
    }

    const patterns = await db
      .select()
      .from(regionalSwapPatterns)
      .where(and(...conditions))
      .orderBy(regionalSwapPatterns.usageCount);

    return patterns;
  } catch (error) {
    console.error("Error getting regional swap patterns:", error);
    return [];
  }
}

/**
 * Calculate shipping cost between two locations
 */
export async function calculateShippingCost(originState: string, destinationState: string, materialType: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const [shippingRate] = await db
      .select()
      .from(shippingCosts)
      .where(
        and(
          eq(shippingCosts.originState, originState),
          eq(shippingCosts.destinationState, destinationState),
          eq(shippingCosts.materialType, materialType)
        )
      );

    if (!shippingRate) return 0;

    // Return cost per unit
    return Number(shippingRate.costPerUnit) || 0;
  } catch (error) {
    console.error("Error calculating shipping cost:", error);
    return 0;
  }
}

/**
 * Get climate zone adjustments for a material type
 */
export async function getClimateZoneAdjustments(climateZone: string, materialType: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [adjustment] = await db
      .select()
      .from(climateZoneAdjustments)
      .where(and(eq(climateZoneAdjustments.climateZone, climateZone), eq(climateZoneAdjustments.materialType, materialType)));

    return adjustment || null;
  } catch (error) {
    console.error("Error getting climate zone adjustments:", error);
    return null;
  }
}

/**
 * Get location-based pricing adjustments
 */
export async function getLocationPricingAdjustments(state: string, materialType: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [adjustment] = await db
      .select()
      .from(locationPricingAdjustments)
      .where(and(eq(locationPricingAdjustments.state, state), eq(locationPricingAdjustments.materialType, materialType)));

    return adjustment || null;
  } catch (error) {
    console.error("Error getting location pricing adjustments:", error);
    return null;
  }
}

/**
 * Get all suppliers in a specific state
 */
export async function getSuppliersByState(state: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const stateSuppliers = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        email: suppliers.email,
        phone: suppliers.phone,
        latitude: suppliers.latitude,
        longitude: suppliers.longitude,
        sustainabilityScore: suppliers.sustainabilityScore,
        isPremium: suppliers.isPremium,
        currentCapacity: suppliers.currentCapacity,
      })
      .from(suppliers)
      .where(and(eq(suppliers.state, state), eq(suppliers.verified, true)));

    return stateSuppliers;
  } catch (error) {
    console.error("Error getting suppliers by state:", error);
    return [];
  }
}

/**
 * Check if a swap is typical for a region
 */
export async function isSwapTypicalForRegion(state: string, fromMaterialType: string, toMaterialType: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const [pattern] = await db
      .select()
      .from(regionalSwapPatterns)
      .where(
        and(
          eq(regionalSwapPatterns.state, state),
          eq(regionalSwapPatterns.originalMaterial, fromMaterialType),
          eq(regionalSwapPatterns.alternativeMaterial, toMaterialType)
        )
      );

    // Consider it typical if approval rate > 10% (0.1)
    return pattern && Number(pattern.approvalRate) > 0.1;
  } catch (error) {
    console.error("Error checking regional swap pattern:", error);
    return false;
  }
}

/**
 * Get all verified suppliers with their distance from a given point, sorted nearest-first.
 * Unlike getNearbySuppliers, this has no radius cutoff — returns all suppliers.
 */
export async function getSuppliersWithDistance(latitude: number, longitude: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const allSuppliers = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        city: suppliers.city,
        state: suppliers.state,
        zipCode: suppliers.zipCode,
        latitude: suppliers.latitude,
        longitude: suppliers.longitude,
        certifications: suppliers.certifications,
        materialCategories: suppliers.materialCategories,
        sustainabilityScore: suppliers.sustainabilityScore,
        isPremium: suppliers.isPremium,
        currentCapacity: suppliers.currentCapacity,
        email: suppliers.email,
        phone: suppliers.phone,
      })
      .from(suppliers)
      .where(eq(suppliers.verified, true));

    return allSuppliers
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        ...s,
        distanceMiles:
          Math.round(
            calculateDistance(latitude, longitude, Number(s.latitude), Number(s.longitude)) * 10
          ) / 10,
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  } catch (error) {
    console.error("Error getting suppliers with distance:", error);
    return [];
  }
}

/**
 * Get average carbon reduction for a swap in a region
 */
export async function getRegionalSwapCarbonReduction(state: string, fromMaterialType: string, toMaterialType: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const [pattern] = await db
      .select()
      .from(regionalSwapPatterns)
      .where(
        and(
          eq(regionalSwapPatterns.state, state),
          eq(regionalSwapPatterns.originalMaterial, fromMaterialType),
          eq(regionalSwapPatterns.alternativeMaterial, toMaterialType)
        )
      );

    return pattern ? Number(pattern.avgCarbonReduction) : 0;
  } catch (error) {
    console.error("Error getting regional swap carbon reduction:", error);
    return 0;
  }
}
