/**
 * Import script: fetches open-material-data from GitHub and imports into
 * the GreenChainz materials table.
 *
 * Data source: https://github.com/opensource-construction/open-material-data
 *   - materials/index.json  — KBOB (Swiss) lifecycle data, ~247 materials
 *   - MyProject_Products/   — Simpler product records with GWP values
 *
 * Run with:  tsx scripts/import-open-material-data.ts
 * Idempotent: upserts based on dataSource + name to avoid duplicates.
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
import { and, eq } from "drizzle-orm";
import { materials } from "../drizzle/schema";

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

const GITHUB_RAW =
  "https://raw.githubusercontent.com/opensource-construction/open-material-data/main";

const DATA_SOURCE_KBOB = "open-material-data/KBOB";
const DATA_SOURCE_OMD = "open-material-data/products";

// ── KBOB category mapping (German → English) ─────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  Beton: "Concrete",
  "Mörtel und Verputz": "Concrete",
  Backstein: "Masonry",
  "Kalksandstein und Naturstein": "Masonry",
  "Stahl und Eisen": "Steel",
  Nichteisenmetalle: "Aluminum",
  "Kunststoffe und Dichtungsbahnen": "Plastics",
  Glas: "Glass",
  Holz: "Wood",
  "Holzwerkstoffe": "Wood",
  Dämmstoffe: "Insulation",
  "Dämmstoffe organisch": "Insulation",
  "Dämmstoffe mineralisch": "Insulation",
  "Dämmstoffe synthetisch": "Insulation",
  "Bodenbeläge und Plattenmaterialien": "Flooring",
  "Farben und Grundierungen": "Coatings",
  Gebäudetechnik: "MEP",
};

function mapKbobCategory(de: string): string {
  for (const [key, en] of Object.entries(CATEGORY_MAP)) {
    if (de.toLowerCase().includes(key.toLowerCase())) return en;
  }
  return de; // fall back to original
}

// ── Unit reference mapping ────────────────────────────────────────────────────

function mapDeclaredUnit(bezug: string): string {
  const map: Record<string, string> = {
    kg: "1 kg",
    m2: "1 m²",
    m3: "1 m³",
    m: "1 m",
    Stk: "1 piece",
  };
  return map[bezug] || `1 ${bezug}`;
}

// ── Fetch JSON from GitHub ───────────────────────────────────────────────────

async function fetchJSON<T>(path: string): Promise<T | null> {
  const url = `${GITHUB_RAW}/${path}`;
  console.log(`  Fetching ${url} ...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`  ⚠ Failed to fetch ${path}:`, err);
    return null;
  }
}

// ── KBOB material shape ──────────────────────────────────────────────────────

interface KBOBMaterial {
  material_ID: string;
  Materialkategorie: string;
  material_name: string;
  "UUID-Nummer"?: string;
  "Rohdichte (kg/m3)"?: string;
  Bezug?: string;
  "Treibhausgasemissionen Total (kg CO2-eq)"?: string;
  "Treibhausgasemissionen Herstellung (kg CO2-eq)"?: string;
  "Treibhausgasemissionen Entsorgung (kg CO2-eq)"?: string;
  Kommentar?: string;
}

// ── MyProject_Products shape ─────────────────────────────────────────────────

interface OMDProduct {
  OMDID?: string;
  record_name?: string;
  manufacturer_name?: string;
  record_subtype?: string;
  "GWP_value_A1-A3"?: number;
  GWP_unit?: string;
  density?: number;
  Density_unit?: string;
  declaration_num?: string;
  EPD_source?: string;
}

// ── Upsert helper ────────────────────────────────────────────────────────────

async function upsertMaterial(
  name: string,
  category: string,
  dataSource: string,
  values: Record<string, unknown>,
): Promise<"created" | "updated" | "skipped"> {
  // Check for existing record by dataSource + name
  const existing = await db
    .select({ id: materials.id })
    .from(materials)
    .where(and(eq(materials.dataSource, dataSource), eq(materials.name, name)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(materials)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(materials.id, existing[0].id));
    return "updated";
  }

  await db.insert(materials).values({
    name,
    category,
    dataSource,
    ...values,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
  return "created";
}

// ── Import KBOB data ─────────────────────────────────────────────────────────

async function importKBOB(): Promise<{ created: number; updated: number }> {
  console.log("\n▶ Importing KBOB materials (materials/index.json)...");
  const data = await fetchJSON<KBOBMaterial[]>("materials/index.json");
  if (!data || !Array.isArray(data)) {
    console.warn("  ⚠ Could not fetch KBOB index — skipping");
    return { created: 0, updated: 0 };
  }

  console.log(`  Found ${data.length} KBOB materials`);
  let created = 0;
  let updated = 0;

  for (const m of data) {
    if (!m.material_name) continue;

    const category = mapKbobCategory(m.Materialkategorie || "");
    const ghgTotal = m["Treibhausgasemissionen Total (kg CO2-eq)"];
    const gwp = ghgTotal ? parseFloat(ghgTotal.replace(/'/g, "")) : undefined;

    const result = await upsertMaterial(m.material_name, category, DATA_SOURCE_KBOB, {
      subcategory: m.Materialkategorie || undefined,
      gwpValue: gwp && !isNaN(gwp) ? gwp.toString() : undefined,
      gwpUnit: gwp && !isNaN(gwp) ? "kgCO2e" : undefined,
      declaredUnit: m.Bezug ? mapDeclaredUnit(m.Bezug) : undefined,
      description: m.Kommentar || undefined,
      hasEpd: true,
      verified: false,
    });

    if (result === "created") created++;
    if (result === "updated") updated++;
  }

  console.log(`  ✓ KBOB: ${created} created, ${updated} updated`);
  return { created, updated };
}

// ── Import MyProject_Products ────────────────────────────────────────────────

const PRODUCT_FILES = [
  "Concrete.json",
  "Steel.json",
  "Glass.json",
  "Wood.json",
  "CLT_100mm.json",
  "CLT_120mm.json",
  "CLT_140mm.json",
  "CLT_160mm.json",
  "CLT_180mm.json",
  "CLT_200mm.json",
  "Mineral_wool_insulation_panel.json",
  "Mineral_wool_insulation_roll.json",
  "Rigid_PIR_insulation.json",
  "Rigid_XPS_insulation.json",
];

async function importProducts(): Promise<{ created: number; updated: number }> {
  console.log("\n▶ Importing MyProject_Products...");
  let created = 0;
  let updated = 0;

  for (const file of PRODUCT_FILES) {
    const data = await fetchJSON<OMDProduct>(`MyProject_Products/${file}`);
    if (!data) continue;

    const name = data.record_name || file.replace(".json", "").replace(/_/g, " ");
    const gwp = data["GWP_value_A1-A3"];

    // Derive category from filename or record_name
    let category = "Other";
    const lower = name.toLowerCase();
    if (lower.includes("concrete")) category = "Concrete";
    else if (lower.includes("steel")) category = "Steel";
    else if (lower.includes("glass")) category = "Glass";
    else if (lower.includes("wood") || lower.includes("clt")) category = "Wood";
    else if (lower.includes("insulation") || lower.includes("pir") || lower.includes("xps"))
      category = "Insulation";
    else if (lower.includes("mineral wool")) category = "Insulation";

    const result = await upsertMaterial(name, category, DATA_SOURCE_OMD, {
      subcategory: data.record_subtype || undefined,
      gwpValue: gwp != null ? gwp.toString() : undefined,
      gwpUnit: data.GWP_unit || "kgCO2e",
      declaredUnit: "1 kg",
      epdNumber: data.declaration_num || data.OMDID || undefined,
      epdUrl: data.EPD_source || undefined,
      hasEpd: !!data.declaration_num,
      verified: false,
    });

    if (result === "created") created++;
    if (result === "updated") updated++;
  }

  console.log(`  ✓ Products: ${created} created, ${updated} updated`);
  return { created, updated };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  open-material-data Import                                  ║");
  console.log("║  Source: github.com/opensource-construction/open-material-data║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const kbob = await importKBOB();
  const products = await importProducts();

  const totalCreated = kbob.created + products.created;
  const totalUpdated = kbob.updated + products.updated;

  console.log("\n════════════════════════════════════════════════");
  console.log(`  Total: ${totalCreated} created, ${totalUpdated} updated`);
  console.log("════════════════════════════════════════════════\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  pool.end();
  process.exit(1);
});
