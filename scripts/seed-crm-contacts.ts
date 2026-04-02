/**
 * Seed CRM contacts from supplier targets CSV + target firms CSV.
 *
 * Sources:
 *   H:/greenchainz-supplier-targets.csv   → 134 suppliers
 *   H:/greenchainz-target-firms.csv       → 14 architecture firms
 *
 * Idempotent — skips rows where companyName already exists.
 * Run: pnpm tsx scripts/seed-crm-contacts.ts
 * Force re-seed: pnpm tsx scripts/seed-crm-contacts.ts --force
 */

import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import path from "path";

if (existsSync(".env.local")) config({ path: ".env.local", override: true });
else config();

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { crmContacts } from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

const FORCE = process.argv.includes("--force");

// ─── CSV parser (no deps) ─────────────────────────────────────────────────────

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r/g, "").trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { values.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

// ─── Lead time seed data (from revenue strategy doc) ──────────────────────────

const LEAD_TIMES = [
  { category: "Steel / Structural",       product: "Structural Steel",        weeksMin: 14, weeksMax: 18, source: "Skanska Q4 2025 Supply Chain Report" },
  { category: "Insulation",               product: "Mineral Wool Insulation",  weeksMin: 18, weeksMax: 22, source: "AGC Supply Chain Update Q1 2026" },
  { category: "Concrete / Cement",        product: "Ready-Mix Concrete",       weeksMin: 1,  weeksMax: 2,  source: "Standard market estimate" },
  { category: "Mass Timber",              product: "CLT Panels",               weeksMin: 16, weeksMax: 24, source: "WoodWorks Q4 2025" },
  { category: "Mass Timber",              product: "Glulam Beams",             weeksMin: 8,  weeksMax: 14, source: "WoodWorks Q4 2025" },
  { category: "Glazing / Curtain Wall",   product: "Curtain Wall Systems",     weeksMin: 16, weeksMax: 26, source: "Weitz Supply Chain Q4 2025" },
  { category: "Glazing / Windows",        product: "High-Performance Windows", weeksMin: 10, weeksMax: 16, source: "Standard market estimate" },
  { category: "Cladding / Facades",       product: "Metal Panels",             weeksMin: 10, weeksMax: 16, source: "AGC Supply Chain Update" },
  { category: "Gypsum / Interior",        product: "Gypsum Board",             weeksMin: 1,  weeksMax: 3,  source: "Standard market estimate" },
  { category: "Gypsum / Sheathing",       product: "Exterior Sheathing",       weeksMin: 2,  weeksMax: 4,  source: "Standard market estimate" },
  { category: "Insulation / Bio-Based",   product: "Cellulose Insulation",     weeksMin: 2,  weeksMax: 4,  source: "Standard market estimate" },
  { category: "Steel / Structural",       product: "Large Generators",         weeksMin: 34, weeksMax: 52, source: "AGC Supply Chain Update Q1 2026" },
  { category: "Acoustic / Lighting",      product: "Acoustic Ceiling Systems", weeksMin: 6,  weeksMax: 12, source: "Standard market estimate" },
  { category: "Mycelium / Bio-Fabrication", product: "Mycelium Panels",        weeksMin: 8,  weeksMax: 16, source: "Ecovative estimate" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== GreenChainz CRM Contact Seeder ===\n");

  if (FORCE) {
    await db.delete(crmContacts);
    console.log("⚠️  Force mode: wiped existing CRM contacts\n");
  }

  // ── 1. Supplier targets ──────────────────────────────────────────────────────

  const supplierCsvPath = "H:/greenchainz-supplier-targets.csv";
  let supplierRows: Record<string, string>[] = [];
  try {
    supplierRows = parseCsv(readFileSync(supplierCsvPath, "utf8"));
    console.log(`📦 Loaded ${supplierRows.length} suppliers from CSV`);
  } catch {
    console.warn(`⚠️  Could not read ${supplierCsvPath} — skipping supplier seed`);
  }

  let supplierCreated = 0;
  let supplierSkipped = 0;

  for (const row of supplierRows) {
    const companyName = row.company_name?.trim();
    if (!companyName) continue;

    const existing = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .where(eq(crmContacts.companyName, companyName))
      .limit(1);

    if (existing.length > 0) { supplierSkipped++; continue; }

    await db.insert(crmContacts).values({
      type: "supplier",
      companyName,
      category: row.category?.trim() || null,
      subcategory: row.subcategory?.trim() || null,
      location: row.location?.trim() || null,
      keyProduct: row.key_product?.trim() || null,
      pitchAngle: row.greenchainz_pitch_angle?.trim() || null,
      hasEpd: row.has_epd?.toLowerCase() === "yes",
      readinessLevel: (["high", "medium", "low"].includes(row.readiness_level?.toLowerCase()))
        ? row.readiness_level.toLowerCase() as "high" | "medium" | "low"
        : null,
      internalNotes: row.notes?.trim() || null,
      source: row.source?.trim() || "Ecosystem Analysis PDF",
      stage: "prospect",
    });
    supplierCreated++;
  }

  console.log(`✅ Suppliers: ${supplierCreated} created, ${supplierSkipped} skipped\n`);

  // ── 2. Target firms (architect firms) ─────────────────────────────────────────

  const firmCsvPath = "H:/greenchainz-target-firms.csv";
  let firmRows: Record<string, string>[] = [];
  try {
    firmRows = parseCsv(readFileSync(firmCsvPath, "utf8"));
    console.log(`🏢 Loaded ${firmRows.length} target firms from CSV`);
  } catch {
    console.warn(`⚠️  Could not read ${firmCsvPath} — skipping firm seed`);
  }

  let firmCreated = 0;
  let firmSkipped = 0;

  for (const row of firmRows) {
    const companyName = row.firm_name?.trim();
    if (!companyName) continue;

    const existing = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .where(eq(crmContacts.companyName, companyName))
      .limit(1);

    if (existing.length > 0) { firmSkipped++; continue; }

    await db.insert(crmContacts).values({
      type: "architect_firm",
      companyName,
      category: row.firm_type?.trim() || "architecture",
      internalNotes: row.notes?.trim() || null,
      source: "Target Firms CSV",
      stage: "prospect",
    });
    firmCreated++;
  }

  console.log(`✅ Firms: ${firmCreated} created, ${firmSkipped} skipped\n`);

  // ── 3. Lead time catalog ───────────────────────────────────────────────────────

  const { leadTimeCatalog } = await import("../drizzle/schema");
  const existing = await db.select({ cnt: sql<number>`count(*)` }).from(leadTimeCatalog);
  const count = Number(existing[0]?.cnt ?? 0);

  if (count === 0 || FORCE) {
    if (FORCE) await db.delete(leadTimeCatalog);
    for (const lt of LEAD_TIMES) {
      await db.insert(leadTimeCatalog).values({
        category: lt.category,
        product: lt.product,
        weeksMin: lt.weeksMin,
        weeksMax: lt.weeksMax,
        source: lt.source,
        notes: `${lt.weeksMin}–${lt.weeksMax} weeks as of Q1 2026`,
        asOf: new Date("2026-01-01"),
      });
    }
    console.log(`✅ Lead times: ${LEAD_TIMES.length} entries seeded`);
  } else {
    console.log(`⏭  Lead times: ${count} already exist, skipping (use --force to reset)`);
  }

  console.log("\n=== Done ===");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
