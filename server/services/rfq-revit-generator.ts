/**
 * RFQ Revit CSV Generator
 *
 * Generates a CSV material schedule compatible with Autodesk Revit.
 * Revit can import this as a shared schedule or material specification table.
 *
 * Columns:
 * - Material Name (Revit standard field)
 * - Manufacturer
 * - Product Code
 * - Assembly Type (CSI MasterFormat)
 * - GWP (kg CO₂e/1000 SF)
 * - Carbon Delta (%)
 * - LEED Credits
 * - Fire Rating
 * - Cost per Unit
 * - Lead Time
 * - Supplier Contact
 *
 * Output is UTF-8 CSV with quoted fields (handles special chars).
 */

import { getDb } from "../db";
import { epdMaterials } from "../../drizzle/schema";
import { architectSpecAssemblies, architectUploadedSpecs } from "../../drizzle/schema-additions-mcs";
import { eq, inArray } from "drizzle-orm";

export interface RFQRevitInput {
  specId: number;
  specAssemblyId: number;
  selectedAlternativeId: number;
  includeMultipleAlternatives?: boolean; // If true, include top 3 alternatives as separate rows
  alternativeIds?: number[]; // Additional alternative IDs to include
}

/**
 * CSV cell escape: wrap in quotes and escape internal quotes
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generate Revit CSV schedule as Buffer
 */
export async function generateRfqRevit(
  input: RFQRevitInput,
): Promise<{ buffer: Buffer; filename: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Fetch spec and assembly
  const [spec] = await db
    .select()
    .from(architectUploadedSpecs)
    .where(eq(architectUploadedSpecs.id, input.specId));

  if (!spec) throw new Error(`Spec not found`);

  const [assembly] = await db
    .select()
    .from(architectSpecAssemblies)
    .where(eq(architectSpecAssemblies.id, input.specAssemblyId));

  if (!assembly) throw new Error(`Assembly not found`);

  // Fetch primary alternative
  const [primaryAlt] = await db
    .select()
    .from(epdMaterials)
    .where(eq(epdMaterials.id, input.selectedAlternativeId));

  if (!primaryAlt) throw new Error(`Alternative not found`);

  const alternatives = [primaryAlt];

  // Optionally fetch additional alternatives
  if (input.includeMultipleAlternatives && input.alternativeIds && input.alternativeIds.length > 0) {
    const additional = await db
      .select()
      .from(epdMaterials)
      .where(inArray(epdMaterials.id, input.alternativeIds));
    alternatives.push(...additional);
  }

  // Build CSV header
  const headers = [
    "Material Name",
    "Manufacturer",
    "Product Code",
    "Assembly Type",
    "GWP (kg CO₂e/1000 SF)",
    "Carbon Delta (%)",
    "LEED Credits",
    "Fire Rating",
    "Cost per Unit ($)",
    "Lead Time",
    "Lifespan (years)",
    "Hardness (MOHS)",
    "Installability (hrs/1000 SF)",
    "Compliance Notes",
  ];

  const csvLines: string[] = [
    // Header row
    headers.map((h) => escapeCsvCell(h)).join(","),
  ];

  // Add each alternative as a row
  const originalGwp = assembly.gwpPer1000sf
    ? parseFloat(assembly.gwpPer1000sf.toString())
    : null;

  alternatives.forEach((alt) => {
    const altGwp = alt.gwpPer1000sf ? parseFloat(alt.gwpPer1000sf.toString()) : null;

    let carbonDelta: string | null = null;
    if (altGwp !== null && originalGwp !== null && originalGwp > 0) {
      carbonDelta = (((altGwp - originalGwp) / originalGwp) * 100).toFixed(1);
    }

    // Build compliance notes
    const complianceNotes: string[] = [];
    if (alt.title24Compliant) complianceNotes.push("Title 24");
    if (alt.ieccCompliant) complianceNotes.push("IECC");
    if (alt.vocCompliant) complianceNotes.push("VOC Compliant");
    if (alt.notOnRedList) complianceNotes.push("Red List Free");
    if (alt.greenguardGold) complianceNotes.push("Greenguard Gold");

    // Build LEED credits string
    let leedCreditsStr = "";
    if (alt.leedCredits && typeof alt.leedCredits === "object") {
      leedCreditsStr = Object.entries(alt.leedCredits)
        .map(([code, pts]) => `${code}:${pts}`)
        .join("; ");
    }

    const row = [
      alt.productName,
      alt.manufacturerName || "",
      alt.id.toString(), // Use material ID as product code
      alt.assemblyType || "",
      altGwp ? altGwp.toFixed(2) : "",
      carbonDelta || "",
      leedCreditsStr,
      alt.fireRating || "",
      alt.pricePerUnit ? parseFloat(alt.pricePerUnit.toString()).toFixed(2) : "",
      "", // Lead time — contact supplier
      alt.lifespanYears?.toString() || "",
      alt.hardnessMohs?.toString() || "",
      alt.installabilityHrsSf?.toString() || "",
      complianceNotes.join("; "),
    ];

    csvLines.push(row.map((cell) => escapeCsvCell(cell)).join(","));
  });

  const csv = csvLines.join("\n");
  const buffer = Buffer.from(csv, "utf-8");

  return {
    buffer,
    filename: `RFQ_Revit_Schedule_${input.specId}_${Date.now()}.csv`,
  };
}
