/**
 * Seed script: populates leadTimeDays for materials based on category.
 * Run with: tsx scripts/seed-lead-times.ts
 *
 * Safe to re-run — only updates materials where leadTimeDays IS NULL.
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
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("azure") || DATABASE_URL.includes("postgres.database.azure.com")
    ? { rejectUnauthorized: false }
    : false,
});
const db = drizzle(pool);

// Industry-standard lead time estimates by category (in days)
const LEAD_TIMES: Record<string, number> = {
  "Concrete": 7,
  "Concrete / Cement": 7,
  "Cement": 7,
  "PrecastConcrete": 42,
  "Steel": 98,
  "RebarSteel": 56,
  "HotRolledSections": 112,
  "ColdFormedFraming": 42,
  "Insulation": 28,
  "BoardInsulation": 28,
  "BlanketInsulation": 21,
  "InsulatedWallPanels": 56,
  "Gypsum": 14,
  "Gypsum Board": 14,
  "Glass": 56,
  "CurtainWalls": 112,
  "Windows": 84,
  "Aluminium": 84,
  "Aluminum": 84,
  "Masonry": 21,
  "CeramicTile": 28,
  "NonStructuralWood": 21,
  "WoodFlooring": 28,
  "MembraneRoofing": 21,
  "StoneCladding": 56,
  "Mass Timber": 56,
};

async function main() {
  let totalUpdated = 0;

  for (const [category, leadDays] of Object.entries(LEAD_TIMES)) {
    // Use ILIKE for case-insensitive matching and partial matches
    const result = await db.execute(
      sql`UPDATE materials
          SET "leadTimeDays" = ${leadDays}
          WHERE "leadTimeDays" IS NULL
            AND (category = ${category} OR category ILIKE ${'%' + category + '%'})`
    );

    const rowCount = (result as any).rowCount ?? 0;
    if (rowCount > 0) {
      console.log(`  ${category}: updated ${rowCount} materials → ${leadDays} days`);
      totalUpdated += rowCount;
    }
  }

  console.log(`\nDone. Updated ${totalUpdated} materials with lead time estimates.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
