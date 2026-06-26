/**
 * lib/greenchainz/carbon-audit.ts
 *
 * Carbon audit pipeline — takes a model URN, extracts material assignments
 * via APS Model Derivative API, maps Revit material names to EC3 categories,
 * calculates volumes from bounding boxes (feet→meters), looks up GWP from the
 * local Materials DB, and returns structured MaterialBreakdown[] with totals.
 */

import { getModelProperties, getModelGeometry } from '../autodesk-interceptor';
import { query } from '../pg-pool';

// ── Types ──────────────────────────────────────────────────────────────

export interface ModelElement {
  objectId: number;
  name: string;
  materialName: string;
  boundingBox?: { min: number[]; max: number[] };
  properties?: Record<string, any>;
}

export interface MaterialBreakdown {
  materialName: string;
  ec3Category: string;
  volumeM3: number;
  massKg: number;
  gwpKgCo2e: number;
  gwpPerUnit: number;
  elementCount: number;
  elements: number[];
}

export interface CarbonAuditResult {
  modelUrn: string;
  totalGwpKgCo2e: number;
  materialBreakdowns: MaterialBreakdown[];
  unmappedMaterials: string[];
  auditedAt: string;
}

// ── Revit material name → EC3 category mapping ─────────────────────────

const MATERIAL_CATEGORY_MAP: Record<string, string> = {
  // Concrete
  concrete: 'ReadyMix',
  'cast-in-place concrete': 'ReadyMix',
  'precast concrete': 'Precast',
  'lightweight concrete': 'ReadyMix',
  // Steel
  steel: 'Steel',
  'structural steel': 'Steel',
  'steel - astm a992': 'Steel',
  'metal - steel': 'Steel',
  rebar: 'Rebar',
  'reinforcing steel': 'Rebar',
  // Wood
  wood: 'SoftwoodLumber',
  lumber: 'SoftwoodLumber',
  'wood - birch': 'HardwoodLumber',
  'wood - cherry': 'HardwoodLumber',
  'wood - oak': 'HardwoodLumber',
  clt: 'CLT',
  'cross-laminated timber': 'CLT',
  glulam: 'Glulam',
  plywood: 'Plywood',
  // Masonry
  brick: 'Brick',
  masonry: 'CMU',
  'concrete masonry': 'CMU',
  cmu: 'CMU',
  // Glass
  glass: 'FlatGlass',
  'glass - clear': 'FlatGlass',
  'glass - low-e': 'FlatGlass',
  glazing: 'FlatGlass',
  // Insulation
  insulation: 'Insulation',
  'mineral wool': 'MineralWool',
  'fiberglass insulation': 'Insulation',
  'spray foam': 'Insulation',
  'rigid insulation': 'Insulation',
  xps: 'Insulation',
  eps: 'Insulation',
  // Gypsum
  gypsum: 'Gypsum',
  'gypsum board': 'Gypsum',
  drywall: 'Gypsum',
  // Aluminum
  aluminum: 'Aluminum',
  aluminium: 'Aluminum',
  'aluminum - anodized': 'Aluminum',
  // Asphalt
  asphalt: 'Asphalt',
  'asphalt shingle': 'Asphalt',
};

/** Density lookup (kg/m³) for mass estimation from volume. */
const DENSITY_MAP: Record<string, number> = {
  ReadyMix: 2400,
  Precast: 2400,
  Steel: 7850,
  Rebar: 7850,
  SoftwoodLumber: 500,
  HardwoodLumber: 700,
  CLT: 500,
  Glulam: 500,
  Plywood: 550,
  Brick: 1900,
  CMU: 2000,
  FlatGlass: 2500,
  Insulation: 30,
  MineralWool: 100,
  Gypsum: 700,
  Aluminum: 2700,
  Asphalt: 2300,
};

// ── Core function ──────────────────────────────────────────────────────

/**
 * Runs a full carbon audit on an Autodesk model.
 *
 * Pipeline:
 *  1. Fetch element properties and geometry from APS Model Derivative API
 *  2. Extract material names and calculate volumes from bounding boxes
 *  3. Map Revit material names to EC3 categories
 *  4. Look up GWP factors from the local materials DB
 *  5. Return structured MaterialBreakdown[] with totals
 */
export async function runCarbonAudit(modelUrn: string): Promise<CarbonAuditResult> {
  // 1. Fetch model data from APS
  const [properties, geometryMap] = await Promise.all([
    getModelProperties(modelUrn),
    getModelGeometry(modelUrn),
  ]);

  // 2. Extract elements with material assignments
  const elements: ModelElement[] = properties
    .filter((obj) => {
      const matProps =
        obj.properties?.['Autodesk Material'] ||
        obj.properties?.['Materials and Finishes'] ||
        obj.properties?.['Structural Material'] ||
        {};
      return Object.keys(matProps).length > 0;
    })
    .map((obj) => {
      const matProps =
        obj.properties?.['Autodesk Material'] ||
        obj.properties?.['Materials and Finishes'] ||
        obj.properties?.['Structural Material'] ||
        {};

      const materialName = (Object.values(matProps)[0] as string) || 'Unknown';

      return {
        objectId: obj.objectid,
        name: obj.name,
        materialName,
        boundingBox: geometryMap.get(obj.objectid),
        properties: obj.properties,
      };
    });

  // 3. Group by material and calculate volumes
  const materialGroups = new Map<string, { elements: ModelElement[]; totalVolumeM3: number }>();

  for (const el of elements) {
    const key = el.materialName.toLowerCase().trim();
    const existing = materialGroups.get(key) || { elements: [], totalVolumeM3: 0 };

    existing.elements.push(el);
    if (el.boundingBox) {
      existing.totalVolumeM3 += calcBoundingBoxVolume(el.boundingBox);
    }

    materialGroups.set(key, existing);
  }

  // 4. Map to EC3 categories and look up GWP
  const breakdowns: MaterialBreakdown[] = [];
  const unmappedMaterials: string[] = [];

  for (const [matKey, group] of materialGroups) {
    const ec3Category = mapToEc3Category(matKey);

    if (!ec3Category) {
      unmappedMaterials.push(group.elements[0]?.materialName || matKey);
      continue;
    }

    const density = DENSITY_MAP[ec3Category] || 2000;
    const massKg = group.totalVolumeM3 * density;
    const gwpPerUnit = await getGwpForCategory(ec3Category);

    breakdowns.push({
      materialName: group.elements[0]?.materialName || matKey,
      ec3Category,
      volumeM3: round(group.totalVolumeM3, 4),
      massKg: round(massKg, 2),
      gwpKgCo2e: round(massKg * gwpPerUnit, 2),
      gwpPerUnit: round(gwpPerUnit, 4),
      elementCount: group.elements.length,
      elements: group.elements.map((e) => e.objectId),
    });
  }

  // Sort by GWP descending (highest-impact first)
  breakdowns.sort((a, b) => b.gwpKgCo2e - a.gwpKgCo2e);

  const totalGwpKgCo2e = breakdowns.reduce((sum, b) => sum + b.gwpKgCo2e, 0);

  return {
    modelUrn,
    totalGwpKgCo2e: round(totalGwpKgCo2e, 2),
    materialBreakdowns: breakdowns,
    unmappedMaterials,
    auditedAt: new Date().toISOString(),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Calculates bounding-box volume in cubic meters (APS coordinates are in feet). */
function calcBoundingBoxVolume(bb: { min: number[]; max: number[] }): number {
  const FEET_TO_M = 0.3048;
  const dx = Math.abs(bb.max[0] - bb.min[0]) * FEET_TO_M;
  const dy = Math.abs(bb.max[1] - bb.min[1]) * FEET_TO_M;
  const dz = Math.abs(bb.max[2] - bb.min[2]) * FEET_TO_M;
  return dx * dy * dz;
}

/** Maps a Revit material name (lowercase) to an EC3 category slug. */
function mapToEc3Category(materialNameLower: string): string | null {
  if (MATERIAL_CATEGORY_MAP[materialNameLower]) {
    return MATERIAL_CATEGORY_MAP[materialNameLower];
  }

  // Substring fallback
  for (const [key, category] of Object.entries(MATERIAL_CATEGORY_MAP)) {
    if (materialNameLower.includes(key)) {
      return category;
    }
  }

  return null;
}

/**
 * Looks up average GWP (A1–A3, kgCO2e per kg) for an EC3 category
 * from the local materials table. Falls back to conservative estimates.
 */
async function getGwpForCategory(ec3Category: string): Promise<number> {
  try {
    const result = await query(
      `SELECT AVG(a1a2a3_mean) AS avg_gwp
       FROM materials m
       JOIN categories c ON c.id = m.category_id
       WHERE c.short_name = $1
         AND m.a1a2a3_mean IS NOT NULL`,
      [ec3Category]
    );

    if (result.rows[0]?.avg_gwp) {
      return Number(result.rows[0].avg_gwp);
    }
  } catch (err) {
    console.error(`[carbon-audit] Failed to look up GWP for ${ec3Category}:`, err);
  }

  // Conservative fallback GWP estimates (kgCO2e per kg)
  const FALLBACK_GWP: Record<string, number> = {
    ReadyMix: 0.13,
    Precast: 0.16,
    Steel: 1.37,
    Rebar: 0.98,
    SoftwoodLumber: 0.12,
    HardwoodLumber: 0.15,
    CLT: 0.12,
    Glulam: 0.15,
    Plywood: 0.45,
    Brick: 0.24,
    CMU: 0.19,
    FlatGlass: 1.44,
    Insulation: 3.0,
    MineralWool: 1.1,
    Gypsum: 0.12,
    Aluminum: 8.24,
    Asphalt: 0.05,
  };

  return FALLBACK_GWP[ec3Category] ?? 0.5;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
