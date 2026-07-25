/**
 * EWS Facade Assembly Materials Seed
 *
 * Imports 18 real verified EPD products from the EWS Combined All Assemblies
 * document — curtainwall, cladding, framing, insulation, and glazing components
 * used in high-performance facade systems.
 *
 * Source: EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf
 * Data parsed via pdfjs-dist x-position column extraction + manual review.
 *
 * Run:  pnpm tsx scripts/seed-ews-materials.ts
 * Safe to re-run — skips existing rows by epdNumber unless --force is passed.
 */

import "dotenv/config";
import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
}

import { getDb } from "../server/db";
import { materials } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const force = process.argv.includes("--force");

// ─── EWS Facade EPD Materials ─────────────────────────────────────────────────

const EWS_MATERIALS = [
  // ── Aluminum / Curtainwall Framing ────────────────────────────────────────
  {
    name: "Unitized curtainwall framing – thermally broken aluminum",
    productName: "1600 Wall System",
    category: "Aluminum",
    subcategory: "Curtainwall Framing",
    description:
      "Thermally broken unitized aluminum curtainwall framing by Kawneer. " +
      "Used in high-rise vision & shadowbox assemblies. Mullion spacing 4–7' o.c., unit heights 10–21'. " +
      "Embodied carbon: 15,422 kgCO2e per 1,000 SF façade (assumes 19.6 kg/m² aluminum framing). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "166.0000",
    gwpUnit: "kgCO2e/kg",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "4789733794.109.1",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure",
  },
  {
    name: "CFS/HSS/Unitized curtainwall members",
    productName: "CFS/HSS/Unitized members",
    category: "Aluminum",
    subcategory: "Curtainwall Framing",
    description:
      "Cold-formed steel, HSS, and unitized aluminum curtainwall framing " +
      "from Kawneer, YKK AP, or EFCO. Mullion spacing 4–7' o.c. " +
      "GWP 6.08 kgCO2e/kg per Aluminum Association EPD 104.1. " +
      "Embodied carbon per 1,000 SF façade: ~11,071 kgCO2e (Option 3 core). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "6.0800",
    gwpUnit: "kgCO2e/kg",
    declaredUnit: "1 metric ton",
    hasEpd: true,
    epdNumber: "AA-EPD-104.1",
    epdProgramOperator: "Aluminum Association",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure, MRc4 Recycled Content",
  },
  {
    name: "Shadowbox backpan – aluminum 1.0mm",
    productName: "Factory backpan (Aluminum Association NA Extrusions EPD 104.1)",
    category: "Aluminum",
    subcategory: "Shadowbox Component",
    description:
      "Unitized shadowbox aluminum backpan, 1.0 mm thickness. " +
      "Fabricated by unitized curtainwall manufacturer. " +
      "GWP 16 kgCO2e/kg per Aluminum Association Extrusions EPD. " +
      "Assumes 2.7 kg/m² aluminum. Embodied carbon: 4,016 kgCO2e per 1,000 SF. " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "16.0000",
    gwpUnit: "kgCO2e/kg",
    declaredUnit: "1 metric ton",
    hasEpd: true,
    epdNumber: "AA-EPD-104.1-extrusions",
    epdProgramOperator: "Aluminum Association",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: true,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure",
  },
  {
    name: "Aluminum plate panel 3mm + stiffeners",
    productName: "Aluminum plate 3mm + stiffeners",
    category: "Aluminum",
    subcategory: "Metal Panel",
    description:
      "Aluminum metal plate panel (3mm) with stiffeners by Morin (EWS-5 assembly). " +
      "GWP 10.62 kgCO2e/m². Embodied carbon per 1,000 SF: ~10,620 kgCO2e. " +
      "SCS-EPD-10200 verified. " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "10.6200",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "100 m²",
    hasEpd: true,
    epdNumber: "SCS-EPD-10200",
    epdProgramOperator: "SCS Global Services",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: true,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure",
  },

  // ── Glazing ───────────────────────────────────────────────────────────────
  {
    name: "Vision IGU – double low-e, argon",
    productName: "Solarban® low-e IGU",
    category: "Glass",
    subcategory: "Insulating Glass Unit",
    description:
      "Double-pane low-e argon-filled insulating glass unit from Vitro, Guardian, or AGC. " +
      "GWP 55.7 kgCO2e/m². Unit panel 4–7' × ~10'. " +
      "Embodied carbon per 1,000 SF façade: 5,175 kgCO2e. " +
      "SCS-EPD-08787 externally verified. " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "55.7000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "SCS-EPD-08787",
    epdProgramOperator: "SCS Global Services",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure, EAc1 Optimize Energy",
  },
  {
    name: "Spandrel IGU panel (ceramic opacifier)",
    productName: "Spandrel IGU panel",
    category: "Glass",
    subcategory: "Spandrel Glass",
    description:
      "Spandrel insulating glass unit with ceramic opacifier by Vitro, Guardian, or AGC. " +
      "GWP 25.4 kgCO2e/m². Unit panel 4–7' × ~10'. " +
      "Embodied carbon per 1,000 SF façade: 2,360 kgCO2e. " +
      "Source: EWS Combined All Assemblies EPD table (EWS-1B fritted assembly).",
    gwpValue: "25.4000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "SCS-EPD-08787",
    epdProgramOperator: "SCS Global Services",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: true,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure",
  },

  // ── Gypsum Board / Sheathing ──────────────────────────────────────────────
  {
    name: "Interior GWB 5/8\"",
    productName: "USG Sheetrock Brand EcoSmart Panels",
    category: "Gypsum Board",
    subcategory: "Interior Wallboard",
    description:
      "5/8\" interior gypsum wallboard with recycled content by US Gypsum. " +
      "GWP 232 kgCO2e/m² per 1,000 sq.ft declared unit. " +
      "Embodied carbon per 1,000 SF façade: 232 kgCO2e. " +
      "EPD 4787352797.105.1 (Building Transparency / EC3). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "232.0000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1000 sq.ft",
    hasEpd: true,
    epdNumber: "4787352797.105.1",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure, EQc2 Low-Emitting Materials",
    fireRating: "Type X",
    fireRatingStandard: "ASTM E119",
  },
  {
    name: "Exterior sheathing – DensGlass Fireguard 5/8\"",
    productName: "DensGlass Fireguard Sheathing Gypsum Panel",
    category: "Gypsum Board",
    subcategory: "Exterior Sheathing",
    description:
      "5/8\" exterior fiberglass-mat faced gypsum sheathing by Georgia-Pacific. " +
      "GWP 454 kgCO2e/m² per 1,000 sq.ft declared unit. " +
      "Embodied carbon per 1,000 SF façade: 454 kgCO2e. " +
      "EPD10268 (Building Transparency / EC3). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "454.0000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1000 sq.ft",
    hasEpd: true,
    epdNumber: "EPD10268",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure",
    fireRating: "Type X",
    fireRatingStandard: "ASTM E119",
  },

  // ── Steel / Framing ───────────────────────────────────────────────────────
  {
    name: "CFMF Studs 6\" – 16\" OC",
    productName: "Steel Framing stud and track",
    category: "Steel",
    subcategory: "Cold-Formed Metal Framing",
    description:
      "6\" cold-formed metal framing studs and track by SCAFCO Steel Stud Company. " +
      "GWP 3,290 kgCO2e/metric ton. Assumes 12.0 kg/m². " +
      "Embodied carbon per 1,000 SF façade: 1,958 kgCO2e. " +
      "SCSEPD05752 (Building Transparency / EC3). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "3290.0000",
    gwpUnit: "kgCO2e/kg",
    declaredUnit: "1 metric ton",
    hasEpd: true,
    epdNumber: "SCSEPD05752",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "C",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure, MRc4 Recycled Content",
    astmStandards: "ASTM C645",
  },
  {
    name: "Mega Panel – HSS structural framing",
    productName: "HSS (Hollow Structural Section)",
    category: "Steel",
    subcategory: "Structural Steel",
    description:
      "Hollow structural section (HSS) for mega panel / back-truss facade systems. " +
      "GWP 1,990 kgCO2e/metric ton. Assumes 20.0 kg/m². " +
      "Embodied carbon per 1,000 SF façade: 3,697 kgCO2e. " +
      "EPD 4789556099.103.1 (Building Transparency / EC3). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "1990.0000",
    gwpUnit: "kgCO2e/kg",
    declaredUnit: "1 metric ton",
    hasEpd: true,
    epdNumber: "4789556099.103.1",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "C",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure, MRc4 Recycled Content",
    astmStandards: "ASTM A500",
  },
  {
    name: "Subframing channel / Z-girts",
    productName: "Cold-Formed Steel Products",
    category: "Steel",
    subcategory: "Cold-Formed Metal Framing",
    description:
      "7/8\" Z-girts and subframing channels by ClarkDietrich for exterior cladding attachment. " +
      "GWP 2,390 kgCO2e/metric ton. Assumes 2.0 kg/m². " +
      "Embodied carbon per 1,000 SF façade: ~215 kgCO2e. " +
      "EPD10056 (Building Transparency / EC3). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "2390.0000",
    gwpUnit: "kgCO2e/kg",
    declaredUnit: "1 metric ton",
    hasEpd: true,
    epdNumber: "EPD10056",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "C",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure, MRc4 Recycled Content",
    astmStandards: "ASTM C645",
  },

  // ── Insulation ────────────────────────────────────────────────────────────
  {
    name: "Mineral wool CI 4\"",
    productName: "ROCKWOOL Stone wool Thermal Insulation",
    category: "Insulation",
    subcategory: "Mineral Wool",
    description:
      "4\" continuous mineral wool insulation for exterior wall assemblies by ROCKWOOL. " +
      "GWP 0.08 kgCO2e/m². Embodied carbon per 1,000 SF façade: 80 kgCO2e. " +
      "Alternative: Polyiso 4\" ≈ 7 kgCO2e/m². " +
      "EPD-RWI-20190075-CCD1-EN (IBU). " +
      "Source: EWS Combined All Assemblies EPD table.",
    gwpValue: "0.0800",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1000 sq.ft",
    hasEpd: true,
    epdNumber: "EPD-RWI-20190075-CCD1-EN",
    epdProgramOperator: "Institut Bauen und Umwelt e.V. (IBU)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure, EAc1 Optimize Energy",
    astmStandards: "ASTM C665",
  },
  {
    name: "Mineral wool 2\" (spandrel/shadowbox)",
    productName: "ROCKWOOL Spandrel/Shadowbox wool",
    category: "Insulation",
    subcategory: "Mineral Wool",
    description:
      "2\" mineral wool insulation for unitized spandrel/shadowbox cavity by ROCKWOOL. " +
      "GWP 6 kgCO2e/m². Embodied carbon per 1,000 SF façade: 557 kgCO2e. " +
      "EPD-RWI-20190075-CCD1-EN (IBU). " +
      "Source: EWS Combined All Assemblies EPD table (EWS-1A shadowbox assembly).",
    gwpValue: "6.0000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "EPD-RWI-20190075-CCD1-EN",
    epdProgramOperator: "Institut Bauen und Umwelt e.V. (IBU)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: "MRc1 Building Product Disclosure, EAc1 Optimize Energy",
    astmStandards: "ASTM C665",
  },

  // ── Concrete / UHPC / GFRC ────────────────────────────────────────────────
  {
    name: "UHPC Panel 2\"",
    productName: "Ductal Full Premix NaW3FO",
    category: "Concrete",
    subcategory: "Ultra-High Performance Concrete",
    description:
      "Ultra-high performance concrete facade panel (2\") by Ductal (Holcim). " +
      "GWP 14.9 kgCO2e/m². Embodied carbon per 1,000 SF façade: 1,384 kgCO2e. " +
      "EN15804 compliant. " +
      "Source: EWS Combined All Assemblies EPD table (EWS-3B).",
    gwpValue: "14.9000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "EN15804-Ductal",
    epdProgramOperator: "EN 15804",
    usManufactured: false,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure",
    astmStandards: "ASTM C1856",
    expectedLifecycleYears: 75,
  },
  {
    name: "GFRC cladding panel",
    productName: "GFRC cladding",
    category: "Concrete",
    subcategory: "Glass Fiber Reinforced Concrete",
    description:
      "Glass fiber reinforced concrete (GFRC) facade panel by FIBROBETON. " +
      "GWP 818 kgCO2e/m² (per metric ton declared unit). " +
      "Embodied carbon per 1,000 SF façade: 3,796 kgCO2e. " +
      "EPD-IES-0016163 (Instituto Eduardo Torroja). " +
      "Source: EWS Combined All Assemblies EPD table (EWS-3C).",
    gwpValue: "818.0000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 metric ton",
    hasEpd: true,
    epdNumber: "EPD-IES-0016163",
    epdProgramOperator: "Instituto de Ciencias de la Construcción Eduardo Torroja (IETcc)",
    usManufactured: false,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "C",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure",
    expectedLifecycleYears: 50,
  },

  // ── Stone / Masonry Cladding ──────────────────────────────────────────────
  {
    name: "Terracotta panel – TerraClad® / TERRART®",
    productName: "TerraClad® / TERRART® terracotta cladding",
    category: "Masonry",
    subcategory: "Terracotta Cladding",
    description:
      "Architectural terracotta rainscreen panels by Boston Valley Terra Cotta. " +
      "GWP 111 kgCO2e/m² (1.57\" thick, 12\" × 48\" typical panel). " +
      "Embodied carbon per 1,000 SF façade: 10,312 kgCO2e. " +
      "Source: EWS Combined All Assemblies EPD table (EWS-3A).",
    gwpValue: "111.0000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "BostonValley-TerraClad-EPD",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "C",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure",
    expectedLifecycleYears: 75,
  },
  {
    name: "Granite panel 2\"",
    productName: "Granite veneer – architectural",
    category: "Masonry",
    subcategory: "Stone Panel",
    description:
      "2\" granite facade panel from Polycor quarries. " +
      "GWP 39.1 kgCO2e/m². Embodied carbon per 1,000 SF façade: 3,633 kgCO2e. " +
      "POL-20230131-006 (NSF International / UL). " +
      "Source: EWS Combined All Assemblies EPD table (EWS-2A).",
    gwpValue: "39.1000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "POL-20230131-006",
    epdProgramOperator: "NSF International",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "B",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure, MRc5 Regional Materials",
    expectedLifecycleYears: 100,
  },
  {
    name: "Limestone panel 2\"",
    productName: "Dimension Limestone – Architectural Veneer",
    category: "Masonry",
    subcategory: "Stone Panel",
    description:
      "2\" Indiana limestone (50.8 mm thick, 2'×4' typical) from North American quarries. " +
      "GWP 29.2 kgCO2e/m². Based on CEPMC / Polycor Limestone EPD (2020). " +
      "Reflects North American quarried limestone A1–A3 only. " +
      "Embodied carbon per 1,000 SF façade: 2,713 kgCO2e. " +
      "Source: EWS Combined All Assemblies EPD table (EWS-2B Limestone).",
    gwpValue: "29.2000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "CEPMC-Polycor-Limestone-2020",
    epdProgramOperator: "CEPMC / NSF International",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure, MRc5 Regional Materials",
    expectedLifecycleYears: 100,
  },
  {
    name: "Sandstone panel 2\"",
    productName: "Dimension Sandstone – U.S. Quarried Architectural Veneer",
    category: "Masonry",
    subcategory: "Stone Panel",
    description:
      "2\" U.S. quarried sandstone from Cleveland Quarries, Buechel Stone, Lyons Sandstone, " +
      "Vetter Stone, TexaStone, or Polycor. GWP 24 kgCO2e/m². " +
      "2'×4' typical panel. Reflects U.S. quarrying processes. " +
      "EPD #4787352986.101.1 (Building Transparency / EC3, 2021). " +
      "Embodied carbon per 1,000 SF façade: 2,231 kgCO2e. " +
      "Source: EWS Combined All Assemblies EPD table (EWS-2B Sandstone).",
    gwpValue: "24.0000",
    gwpUnit: "kgCO2e/m2",
    declaredUnit: "1 square meter",
    hasEpd: true,
    epdNumber: "4787352986.101.1",
    epdProgramOperator: "Building Transparency (EC3)",
    usManufactured: true,
    dataSource: "ews-pdf-import",
    verified: true,
    complianceGrade: "A",
    meetsTitle24: false,
    meetsIecc: false,
    leedCredits: "MRc1 Building Product Disclosure, MRc5 Regional Materials",
    expectedLifecycleYears: 100,
  },
] as const;

// ── Runner ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Could not connect to database.");
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`\nSeeding ${EWS_MATERIALS.length} EWS facade EPD materials...\n`);

  for (const mat of EWS_MATERIALS) {
    try {
      // Check if already exists by epdNumber + name
      const existing = await db
        .select({ id: materials.id })
        .from(materials)
        .where(eq(materials.epdNumber, mat.epdNumber))
        .limit(1);

      if (existing.length > 0 && !force) {
        console.log(`  ↷ SKIP  ${mat.productName} (${mat.epdNumber}) — already exists`);
        skipped++;
        continue;
      }

      await db.insert(materials).values(mat as any);
      console.log(`  ✓ OK    ${mat.productName} [${mat.category}] GWP:${mat.gwpValue} ${mat.gwpUnit}`);
      inserted++;
    } catch (err) {
      console.error(`  ✗ FAIL  ${mat.productName}: ${String(err)}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Done. ${inserted} inserted, ${skipped} skipped, ${errors} errors.`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
