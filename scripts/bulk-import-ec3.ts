/**
 * Bulk EC3 Import
 * Pulls EPDs from Building Transparency (EC3) across all categories and upserts into materials table.
 * Run: npx tsx scripts/bulk-import-ec3.ts
 *
 * Requires EC3_API_KEY in .env.local
 */

import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
} else {
  config();
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { materials } from "../drizzle/schema";
import { inArray, eq } from "drizzle-orm";
import { fetchEC3EPDs } from "../server/ec3";
import { transformEC3Batch } from "../server/ec3-transform";

const DATABASE_URL = process.env.DATABASE_URL;
const EC3_API_KEY = process.env.EC3_API_KEY;

if (!DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }
if (!EC3_API_KEY)  { console.error("❌ EC3_API_KEY not set in .env.local"); process.exit(1); }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("azure") ? { rejectUnauthorized: false } : false,
});
const db = drizzle(pool);

// All categories the EC3 API supports
const EC3_CATEGORIES = [
  "Concrete",
  "Steel",
  "Wood",
  "Insulation",
  "Glass",
  "Aluminum",
  "Masonry",
  "Roofing",
  "Flooring",
  "Gypsum Board",
  "Cladding",
  "Acoustical Ceiling",
  "Carpet",
  "Coatings",
  "MEP",
];

const BATCH_SIZE = 100; // EC3 allows up to 500 but 100 is safe

async function importCategory(category: string): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  try {
    const epds = await fetchEC3EPDs(category, BATCH_SIZE);
    if (epds.length === 0) {
      console.log(`  ${category}: 0 EPDs returned`);
      return { created: 0, updated: 0 };
    }

    const transformed = transformEC3Batch(epds);
    const ec3Ids = epds.map((e) => e.id).filter(Boolean) as string[];

    const existing = await db
      .select({ ec3Id: materials.ec3Id })
      .from(materials)
      .where(inArray(materials.ec3Id, ec3Ids));

    const existingSet = new Set(existing.map((m) => m.ec3Id));
    const toCreate = transformed.filter((m) => m.ec3Id && !existingSet.has(m.ec3Id));
    const toUpdate = transformed.filter((m) => m.ec3Id && existingSet.has(m.ec3Id));

    if (toCreate.length > 0) {
      type InsertMaterial = typeof materials.$inferInsert;
      await db.insert(materials).values(toCreate as unknown as InsertMaterial[]);
      created = toCreate.length;
    }

    for (const m of toUpdate) {
      await db
        .update(materials)
        .set({ ...m, updatedAt: new Date() })
        .where(eq(materials.ec3Id, m.ec3Id!));
      updated++;
    }

    console.log(`  ${category}: +${created} new, ${updated} updated (${epds.length} EPDs fetched)`);
  } catch (err) {
    console.error(`  ❌ ${category}: ${err instanceof Error ? err.message : err}`);
  }

  return { created, updated };
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  GreenChainz — EC3 Bulk Import                      ║");
  console.log(`║  Categories: ${EC3_CATEGORIES.length}  |  Batch size: ${BATCH_SIZE} per category     ║`);
  console.log("╚══════════════════════════════════════════════════════╝\n");

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const category of EC3_CATEGORIES) {
    const { created, updated } = await importCategory(category);
    totalCreated += created;
    totalUpdated += updated;
  }

  // Assign images to any new materials that don't have one
  console.log("\n📸 Assigning images to new materials...");
  await import("./update-material-images.js").catch(() => null);

  console.log("\n════════════════════════════════════════════════════════");
  console.log(`  ✅ Total created: ${totalCreated}`);
  console.log(`  🔄 Total updated: ${totalUpdated}`);
  console.log(`  📦 Grand total added: ${totalCreated + totalUpdated}`);
  console.log("════════════════════════════════════════════════════════\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  pool.end();
  process.exit(1);
});
