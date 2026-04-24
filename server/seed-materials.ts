/**
 * Materials Seed Service
 *
 * Populates the materials table from EC3 (Building Transparency) for the
 * key construction material categories GreenChainz targets.
 *
 * Called from:
 *   - POST /api/admin/seed-materials  (manual trigger, admin only)
 *   - azure-functions/scraper-timer   (daily at 2 AM UTC)
 *
 * Strategy:
 *   1. Fetch EPDs from EC3 for each priority category
 *   2. Transform to GreenChainz materials schema
 *   3. Upsert (insert new, update existing by ec3Id)
 *   4. Return a summary of what was created/updated
 */

import { getDb } from "./db";
import { materials } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { fetchEC3EPDs, type EC3EPD } from "./ec3";
import { transformEC3Batch } from "./ec3-transform";

/**
 * EC3 category names — matched to EC3 API category filter values.
 * Ordered by AEC market volume. Covers ~95% of GreenChainz target materials.
 *
 * CSI MasterFormat alignment:
 *   03xxxx → Concrete, Rebar, Fly Ash/Slag
 *   05xxxx → Steel, Rebar, Aluminum
 *   06xxxx → Wood (CLT, Glulam, LVL, Dimensional)
 *   07xxxx → Insulation, Roofing, Air Barriers
 *   08xxxx → Glass, Glazing
 *   09xxxx → Gypsum Board, Flooring, Ceilings, Paint
 *   04xxxx → Masonry (CMU, Brick)
 */
const SEED_CATEGORIES: Array<{ name: string; ec3Category: string }> = [
  // High-volume structural
  { name: "Ready-Mix Concrete",        ec3Category: "ReadyMix" },
  { name: "Precast Concrete",           ec3Category: "PrecastConcrete" },
  { name: "Structural Steel",           ec3Category: "StructuralSteel" },
  { name: "Rebar",                      ec3Category: "Rebar" },
  { name: "Cold-Formed Steel",          ec3Category: "ColdFormedSteel" },
  // Wood / mass timber
  { name: "Dimensional Lumber",         ec3Category: "DimensionalLumber" },
  { name: "Cross-Laminated Timber",     ec3Category: "Clt" },
  { name: "Glulam",                     ec3Category: "Glulam" },
  { name: "LVL / Structural Composite", ec3Category: "StructuralCompositeProducts" },
  // Envelope & insulation
  { name: "Mineral Wool Insulation",    ec3Category: "MineralWool" },
  { name: "Fiberglass Insulation",      ec3Category: "FiberglassInsulation" },
  { name: "Rigid Foam Insulation",      ec3Category: "RigidFoam" },
  { name: "Roofing Membranes",          ec3Category: "RoofingMembrane" },
  // Masonry / façade
  { name: "Concrete Masonry Units",     ec3Category: "ConcreteMasonryUnits" },
  { name: "Brick",                      ec3Category: "Brick" },
  { name: "Flat Glass / Glazing",       ec3Category: "FlatGlass" },
  { name: "Aluminum Extrusions",        ec3Category: "AluminumExtrusions" },
  // Interior finishes
  { name: "Gypsum Board",               ec3Category: "GypsumBoard" },
  { name: "Flooring",                   ec3Category: "Flooring" },
  { name: "Acoustical Ceiling Tiles",   ec3Category: "AcousticalCeilingTiles" },
  // Supplementary cementitious
  { name: "Fly Ash",                    ec3Category: "FlyAsh" },
  { name: "Slag Cement",                ec3Category: "SlagCement" },
  { name: "Silica Fume",                ec3Category: "SilicaFume" },
];

const EPDS_PER_PAGE = 100;  // EC3 max page size
const MAX_PAGES     = 5;    // Cap at 500 EPDs per category to avoid runaway jobs

export interface SeedResult {
  success: boolean;
  totalFetched: number;
  created: number;
  updated: number;
  errors: string[];
  categoriesProcessed: string[];
}

/**
 * Paginate through all EPDs for a given EC3 category.
 * Stops when EC3 returns no results, returns null `next`, or we hit MAX_PAGES.
 */
async function fetchAllEPDsForCategory(ec3Category: string): Promise<EC3EPD[]> {
  const all: EC3EPD[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    // fetchEC3EPDs appends page_size + optional offset/page param
    // We pass limit per-page and use the offset approach: offset = (page-1) * EPDS_PER_PAGE
    const batch = await fetchEC3EPDs(ec3Category, EPDS_PER_PAGE, (page - 1) * EPDS_PER_PAGE);

    if (batch.length === 0) break;
    all.push(...batch);

    // If we got fewer than a full page, we've exhausted the category
    if (batch.length < EPDS_PER_PAGE) break;

    // Be a good API citizen
    await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

/**
 * Batch upsert: check which EC3 IDs already exist, then insert new + update existing.
 * One existence check per batch (not per material).
 */
async function batchUpsert(
  db: Awaited<ReturnType<typeof getDb>>,
  epds: EC3EPD[],
  result: SeedResult
): Promise<void> {
  if (!db || epds.length === 0) return;

  const transformed = transformEC3Batch(epds).filter((m) => !!m.ec3Id);
  if (transformed.length === 0) return;

  const ec3Ids = transformed.map((m) => m.ec3Id!);

  const existing = await db
    .select({ ec3Id: materials.ec3Id })
    .from(materials)
    .where(inArray(materials.ec3Id, ec3Ids));

  const existingSet = new Set(existing.map((r) => r.ec3Id));

  const toCreate = transformed.filter((m) => !existingSet.has(m.ec3Id!));
  const toUpdate = transformed.filter((m) => existingSet.has(m.ec3Id!));

  if (toCreate.length > 0) {
    try {
      await db.insert(materials).values(toCreate as any[]);
      result.created += toCreate.length;
    } catch (err) {
      const msg = `Batch insert failed: ${err}`;
      console.error(`[Seed] ${msg}`);
      result.errors.push(msg);
    }
  }

  for (const material of toUpdate) {
    try {
      await db
        .update(materials)
        .set({ ...material, updatedAt: new Date() } as any)
        .where(eq(materials.ec3Id, material.ec3Id!));
      result.updated++;
    } catch (err) {
      const msg = `Update failed for ${material.ec3Id}: ${err}`;
      console.error(`[Seed] ${msg}`);
      result.errors.push(msg);
    }
  }
}

/**
 * Seed the materials table from EC3 data.
 * Safe to run multiple times — uses upsert logic.
 *
 * @param categoryOverrides  Optional subset of SEED_CATEGORIES[].ec3Category values to run
 * @param _limit             Ignored (kept for API compat) — pagination is now handled internally
 */
export async function seedMaterialsFromEC3(
  categoryOverrides?: string[],
  _limit?: number
): Promise<SeedResult> {
  const result: SeedResult = {
    success: false,
    totalFetched: 0,
    created: 0,
    updated: 0,
    errors: [],
    categoriesProcessed: [],
  };

  const db = await getDb();
  if (!db) {
    result.errors.push("Database connection failed");
    return result;
  }

  // Resolve which categories to run
  const targets = categoryOverrides && categoryOverrides.length > 0
    ? SEED_CATEGORIES.filter((c) => categoryOverrides.includes(c.ec3Category))
    : SEED_CATEGORIES;

  console.log(`[Seed] Starting EC3 seed for ${targets.length} categories`);

  for (const { name, ec3Category } of targets) {
    try {
      console.log(`[Seed] Fetching ${name} (${ec3Category})...`);
      const epds = await fetchAllEPDsForCategory(ec3Category);

      if (epds.length === 0) {
        console.log(`[Seed] ⚠️  No EPDs found for ${name} — category key may need adjustment`);
        continue;
      }

      result.totalFetched += epds.length;
      await batchUpsert(db, epds, result);

      result.categoriesProcessed.push(name);
      console.log(`[Seed] ✅ ${name}: ${epds.length} fetched, +${result.created} new (running total)`);

      // Polite delay between categories
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = `Failed fetching "${name}" (${ec3Category}): ${err}`;
      console.error(`[Seed] ❌ ${msg}`);
      result.errors.push(msg);
    }
  }

  result.success = result.created + result.updated > 0;
  console.log(
    `[Seed] ✅ Complete — fetched: ${result.totalFetched}, created: ${result.created}, updated: ${result.updated}, errors: ${result.errors.length}`
  );
  return result;
}
