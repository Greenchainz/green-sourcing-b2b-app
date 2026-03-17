/**
 * EC3 EPD to Materials Transformation Service
 * 
 * Maps EC3 EPD data structure to GreenChainz materials table schema.
 */

import type { EC3EPD } from "./ec3";
import type { Material } from "../drizzle/schema";
import { parseGWP } from "./ec3";

/**
 * Transform EC3 EPD to Material insert object
 * Maps EC3 fields to materials table schema
 */
export function transformEC3ToMaterial(epd: EC3EPD): Partial<Material> {
  // Parse GWP value from string (e.g., "339 kgCO2e" → 339)
  const gwpValue = parseGWP(epd.gwp);

  // Map EC3 category to GreenChainz category
  // EC3 categories: Concrete, Steel, Wood, Insulation, etc.
  const category = mapEC3Category(epd.category.name);

  // Calculate embodied carbon per 1000 SF
  // This requires knowing the declared unit and MSF factor
  const embodiedCarbonPer1000sf = calculateEmbodiedCarbonPer1000SF(
    gwpValue,
    epd.declared_unit || epd.category.declared_unit
  );

  return {
    name: epd.name || `${epd.category.display_name} - ${epd.manufacturer?.name || "Unknown"}`,
    productName: epd.name,
    manufacturerId: null, // Will need to match/create manufacturer separately
    category,
    subcategory: epd.category.display_name,
    description: epd.lca_discussion || undefined,
    epdNumber: epd.open_xpd_uuid,
    epdUrl: epd.doc,
    epdExpiry: epd.date_validity_ends ? new Date(epd.date_validity_ends) : undefined,
    epdProgramOperator: "Building Transparency (EC3)",
    gwpValue: gwpValue.toString(),
    gwpUnit: "kgCO2e",
    declaredUnit: epd.declared_unit || epd.category.declared_unit,
    embodiedCarbonPer1000sf: embodiedCarbonPer1000sf.toString(),
    hasEpd: 1,
    dataSource: "EC3",
    verified: epd.externally_verified ? 1 : 0,
    // EC3-specific tracking fields
    ec3Id: epd.id,
    ec3SyncedAt: new Date(),
    ec3Category: epd.category.name,
    ec3ConservativeEstimate: epd.conservative_estimate,
    ec3BestPractice: epd.best_practice,
    ec3IndustryMedian: epd.category.pct50_gwp,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Map EC3 category names to GreenChainz categories
 * EC3 uses specific category names, we need to normalize them
 */
function mapEC3Category(ec3Category: string): string {
  const categoryMap: Record<string, string> = {
    "Concrete": "Concrete",
    "ReadyMix": "Concrete",
    "Precast Concrete": "Concrete",
    "Steel": "Steel",
    "Structural Steel": "Steel",
    "Rebar": "Steel",
    "Wood": "Wood",
    "Lumber": "Wood",
    "CLT": "Wood",
    "Glulam": "Wood",
    "Insulation": "Insulation",
    "Mineral Wool": "Insulation",
    "Spray Foam": "Insulation",
    "XPS": "Insulation",
    "EPS": "Insulation",
    "Glass": "Glass",
    "Glazing": "Glass",
    "Gypsum": "Gypsum",
    "Drywall": "Gypsum",
    "Aluminum": "Aluminum",
    "Brick": "Masonry",
    "CMU": "Masonry",
    "Roofing": "Roofing",
    "Asphalt": "Asphalt",
  };

  return categoryMap[ec3Category] || ec3Category;
}

/**
 * Calculate embodied carbon per 1000 SF
 * This is a simplified calculation - actual implementation would need:
 * - Material thickness/coverage
 * - Density
 * - Application rate
 * 
 * For now, we'll use a rough estimate based on declared unit
 */
function calculateEmbodiedCarbonPer1000SF(
  gwpValue: number,
  declaredUnit: string
): number {
  // Rough conversion factors (these would need to be refined)
  const conversionFactors: Record<string, number> = {
    "1 m3": 0.1, // 1 m3 concrete ≈ 0.1 m3 per 1000 SF
    "1 kg": 10, // Rough estimate for various materials
    "1 ton": 0.5, // Rough estimate
    "1 m2": 100, // 1000 SF ≈ 93 m2
    "1 sf": 1000, // Direct conversion
  };

  const factor = conversionFactors[declaredUnit] || 1;
  return gwpValue * factor;
}

/**
 * Batch transform multiple EPDs to materials
 */
export function transformEC3Batch(epds: EC3EPD[]): Array<Partial<Material>> {
  return epds.map(transformEC3ToMaterial);
}

/**
 * Check if material already exists in database by EC3 ID
 * Returns true if material with this EC3 ID exists
 */
export function shouldUpdateExisting(ec3Id: string, existingMaterials: Material[]): boolean {
  return existingMaterials.some(m => m.ec3Id === ec3Id);
}
