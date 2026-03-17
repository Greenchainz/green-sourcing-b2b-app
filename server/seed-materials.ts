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
import { eq } from "drizzle-orm";
import { fetchEC3EPDs } from "./ec3";
import { transformEC3Batch } from "./ec3-transform";

// Priority categories for initial seed — covers ~80% of AEC material requests
const SEED_CATEGORIES = [
  "Concrete",
  "Steel",
  "Rebar",
  "Wood",
  "Insulation",
  "Masonry",
  "Glass",
  "Aluminum",
  "Gypsum Board",
  "Roofing",
];

const EPDS_PER_CATEGORY = 50; // Fetch 50 EPDs per category for initial seed

export interface SeedResult {
  success: boolean;
  totalFetched: number;
  created: number;
  updated: number;
  errors: string[];
  categoriesProcessed: string[];
}

/**
 * Seed the materials table from EC3 data.
 * Safe to run multiple times — uses upsert logic.
 */
export async function seedMaterialsFromEC3(
  categories: string[] = SEED_CATEGORIES,
  limit: number = EPDS_PER_CATEGORY
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

  for (const category of categories) {
    try {
      console.log(`[Seed] Fetching EC3 EPDs for category: ${category}`);
      const epds = await fetchEC3EPDs(category, limit);

      if (epds.length === 0) {
        console.log(`[Seed] No EPDs found for category: ${category}`);
        continue;
      }

      result.totalFetched += epds.length;
      const transformed = transformEC3Batch(epds);

      for (const material of transformed) {
        if (!material.ec3Id) continue;

        try {
          // Check if this EPD already exists
          const existing = await db
            .select({ id: materials.id })
            .from(materials)
            .where(eq(materials.ec3Id, material.ec3Id))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(materials).values(material as any);
            result.created++;
          } else {
            await db
              .update(materials)
              .set({ ...material, updatedAt: new Date() } as any)
              .where(eq(materials.ec3Id, material.ec3Id));
            result.updated++;
          }
        } catch (err) {
          const msg = `Failed to upsert material ${material.ec3Id}: ${err}`;
          console.error(`[Seed] ${msg}`);
          result.errors.push(msg);
        }
      }

      result.categoriesProcessed.push(category);
      console.log(
        `[Seed] ✅ ${category}: ${epds.length} fetched, ${transformed.length} processed`
      );

      // Small delay between categories to be a good API citizen
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = `Failed to fetch EC3 data for category "${category}": ${err}`;
      console.error(`[Seed] ${msg}`);
      result.errors.push(msg);
    }
  }

  result.success = result.errors.length === 0 || result.created + result.updated > 0;
  console.log(
    `[Seed] Complete — created: ${result.created}, updated: ${result.updated}, errors: ${result.errors.length}`
  );
  return result;
}
