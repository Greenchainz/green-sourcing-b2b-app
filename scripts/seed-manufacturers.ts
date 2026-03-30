/**
 * Seed script: imports manufacturer data from greenchainz-supplier-targets.csv
 * Run with: tsx scripts/seed-manufacturers.ts
 *
 * Safe to re-run — uses upsert on name to avoid duplicates.
 */

import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
} else {
  config();
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { manufacturers } from "../drizzle/schema";

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

// Simple CSV parser that handles quoted fields with commas
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  const csvPath = resolve(__dirname, "../../greenchainz-supplier-targets.csv");
  if (!existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvContent = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);

  console.log(`Parsed ${rows.length} rows from CSV`);

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row.company_name) continue;

    const hasEpd = row.has_epd?.toLowerCase() === "yes";

    const values = {
      name: row.company_name,
      category: row.category || null,
      subcategory: row.subcategory || null,
      location: row.location || null,
      headquarters: row.location || null,
      keyProduct: row.key_product || null,
      pitchAngle: row.greenchainz_pitch_angle || null,
      hasEpd,
      readinessLevel: row.readiness_level || null,
      description: row.notes || null,
      dataSource: row.source || null,
      updatedAt: new Date(),
    };

    const result = await db
      .insert(manufacturers)
      .values(values)
      .onConflictDoUpdate({
        target: manufacturers.name,
        set: {
          category: sql`EXCLUDED.category`,
          subcategory: sql`EXCLUDED.subcategory`,
          location: sql`EXCLUDED.location`,
          headquarters: sql`EXCLUDED.headquarters`,
          keyProduct: sql`EXCLUDED."keyProduct"`,
          pitchAngle: sql`EXCLUDED."pitchAngle"`,
          hasEpd: sql`EXCLUDED."hasEpd"`,
          readinessLevel: sql`EXCLUDED."readinessLevel"`,
          description: sql`EXCLUDED.description`,
          dataSource: sql`EXCLUDED."dataSource"`,
          updatedAt: sql`EXCLUDED."updatedAt"`,
        },
      });

    // Drizzle doesn't return affected row count reliably for upserts,
    // so we count all as processed
    inserted++;
  }

  console.log(`Done. Processed ${inserted} manufacturers (insert/update).`);
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
