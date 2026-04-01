/**
 * Material Credit Score Service
 *
 * Scores each epd_materials row on a 0-100 scale across four weighted
 * dimensions:
 *   Carbon efficiency        40 pts
 *   EPD verification         20 pts
 *   Manufacturer transparency 20 pts
 *   Assembly options coverage 20 pts
 */

import { getDb } from "../db";
import { epdMaterials, suppliers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Benchmarks ───────────────────────────────────────────────────────────────

const BENCHMARKS: Record<
  string,
  { baseline: number; bestInClass: number }
> = {
  unitized_curtain_wall: { baseline: 20597, bestInClass: 4323 },
  stone_panel: { baseline: 13000, bestInClass: 5169 },
};

/** Derive a benchmark key from an assembly type string. */
function benchmarkKey(assemblyType: string | null | undefined): string {
  const t = (assemblyType ?? "").toLowerCase();
  if (t.includes("ews") || t.includes("curtain") || t.includes("unitized")) {
    return "unitized_curtain_wall";
  }
  return "stone_panel";
}

// ─── EPD number format heuristic ─────────────────────────────────────────────

const EPD_REGISTRY_PATTERN =
  /^(EPD-[A-Z]{2,6}-\d+|[A-Z]{2,4}-\d{4,}-\w+|\d{5,}-EPD|\w+-EPD-\d+)$/i;

function verifyEpdFormat(epdNumber: string | null | undefined): "verified" | "unverified" | "none" {
  if (!epdNumber) return "none";
  return EPD_REGISTRY_PATTERN.test(epdNumber.trim()) ? "verified" : "unverified";
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  carbonEfficiency: number;
  epdVerification: number;
  manufacturerTransparency: number;
  assemblyOptionsCoverage: number;
}

export interface MaterialCreditScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
}

/**
 * Compute carbon-efficiency score (0–40) for a single gwpPer1000sf value.
 */
function scoreCarbonEfficiency(
  gwpPer1000sf: number | null | undefined,
  assemblyType: string | null | undefined
): number {
  if (gwpPer1000sf == null) return 0;
  const gwp = typeof gwpPer1000sf === "string" ? parseFloat(gwpPer1000sf) : gwpPer1000sf;
  if (isNaN(gwp)) return 0;

  const key = benchmarkKey(assemblyType);
  const { baseline, bestInClass } = BENCHMARKS[key];

  if (gwp <= bestInClass) return 40;
  if (gwp >= baseline) return 0;

  // Linear interpolation: lower GWP → higher score
  const fraction = (baseline - gwp) / (baseline - bestInClass);
  return Math.round(fraction * 40);
}

/**
 * Score EPD verification (0 | 10 | 20).
 */
function scoreEpdVerification(epdNumber: string | null | undefined): number {
  switch (verifyEpdFormat(epdNumber)) {
    case "verified":   return 20;
    case "unverified": return 10;
    case "none":       return 0;
  }
}

/**
 * Score manufacturer transparency (0 | 10 | 20) based on supplier profile
 * completeness. Requires the supplier record to be passed in.
 */
function scoreManufacturerTransparency(
  supplierRow: { companyName: string | null; website: string | null; description: string | null; contactName: string | null } | null
): number {
  if (!supplierRow) return 0;

  const filledFields = [
    supplierRow.companyName,
    supplierRow.website,
    supplierRow.description,
    supplierRow.contactName,
  ].filter(Boolean).length;

  if (filledFields >= 4) return 20;
  if (filledFields >= 2) return 10;
  return 0;
}

/**
 * Score assembly options coverage (0 | 6 | 13 | 20) based on how many of the
 * 3 core options (1, 2, 3) are represented across *all* rows for this
 * assembly type from the supplier.
 */
function scoreAssemblyOptions(coveredOptions: Set<number>): number {
  if (coveredOptions.size >= 3) return 20;
  if (coveredOptions.size === 2) return 13;
  if (coveredOptions.size === 1) return 6;
  return 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the Material Credit Score for a single epd_materials row.
 */
export async function compute(
  epdId: number
): Promise<MaterialCreditScoreResult> {
  const db = await getDb();
  if (!db) {
    return { total: 0, breakdown: { carbonEfficiency: 0, epdVerification: 0, manufacturerTransparency: 0, assemblyOptionsCoverage: 0 } };
  }

  const [row] = await db
    .select()
    .from(epdMaterials)
    .where(eq(epdMaterials.id, epdId))
    .limit(1);

  if (!row) {
    return { total: 0, breakdown: { carbonEfficiency: 0, epdVerification: 0, manufacturerTransparency: 0, assemblyOptionsCoverage: 0 } };
  }

  // Fetch supplier profile for transparency score
  const [supplierRow] = await db
    .select({
      companyName: suppliers.companyName,
      website: suppliers.website,
      description: suppliers.description,
      contactName: suppliers.contactName,
    })
    .from(suppliers)
    .where(eq(suppliers.id, row.supplierId))
    .limit(1);

  // Fetch all rows for same assembly type + supplier to compute options coverage
  let coveredOptions = new Set<number>();
  if (row.assemblyType) {
    const siblings = await db
      .select({ coreOption: epdMaterials.coreOption })
      .from(epdMaterials)
      .where(
        and(
          eq(epdMaterials.assemblyType, row.assemblyType),
          eq(epdMaterials.supplierId, row.supplierId)
        )
      );

    for (const s of siblings) {
      if (s.coreOption != null) {
        coveredOptions.add(s.coreOption);
      }
    }
  } else if (row.coreOption != null) {
    coveredOptions = new Set([row.coreOption]);
  }

  const carbonEfficiency = scoreCarbonEfficiency(
    row.gwpPer1000sf != null ? parseFloat(row.gwpPer1000sf) : null,
    row.assemblyType
  );
  const epdVerification = scoreEpdVerification(row.epdNumber);
  const manufacturerTransparency = scoreManufacturerTransparency(supplierRow ?? null);
  const assemblyOptionsCoverage = scoreAssemblyOptions(coveredOptions);

  const total = Math.min(
    100,
    carbonEfficiency + epdVerification + manufacturerTransparency + assemblyOptionsCoverage
  );

  return {
    total,
    breakdown: {
      carbonEfficiency,
      epdVerification,
      manufacturerTransparency,
      assemblyOptionsCoverage,
    },
  };
}

/**
 * Compute scores for all epd_materials rows belonging to a supplier.
 */
export async function computeForSupplier(
  supplierId: number
): Promise<Array<{ epdId: number; productName: string } & MaterialCreditScoreResult>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ id: epdMaterials.id, productName: epdMaterials.productName })
    .from(epdMaterials)
    .where(eq(epdMaterials.supplierId, supplierId));

  const results = await Promise.all(
    rows.map(async (r) => {
      const score = await compute(r.id);
      return { epdId: r.id, productName: r.productName, ...score };
    })
  );

  return results;
}
