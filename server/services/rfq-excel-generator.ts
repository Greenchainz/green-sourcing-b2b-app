/**
 * RFQ Excel Generator
 *
 * Generates a multi-sheet Excel RFQ workbook for architects to send to suppliers.
 * Sheets:
 * 1. Cover — Project metadata, RFQ number, date
 * 2. Specification — Original assembly details
 * 3. Recommended Material — Alternative product info
 * 4. Sustainability — GWP, carbon delta, LEED credits, properties
 * 5. Compliance — Fire, ASTM, code compliance checklist
 * 6. Pricing — Unit cost, volume structure
 *
 * Uses exceljs for Node.js native Excel generation.
 */

import ExcelJS from "exceljs";
import { getDb } from "../db";
import { epdMaterials } from "../../drizzle/schema";
import { architectSpecAssemblies, architectUploadedSpecs } from "../../drizzle/schema-additions-mcs";
import { eq } from "drizzle-orm";

export interface RFQExcelInput {
  specId: number;
  specAssemblyId: number;
  selectedAlternativeId: number;
  projectName?: string;
  architectName?: string;
  buildingAddress?: string;
  rfqNumber?: string;
}

/**
 * Generate RFQ Excel workbook as Buffer
 */
export async function generateRfqExcel(
  input: RFQExcelInput,
): Promise<{ buffer: Buffer; filename: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Fetch data
  const spec = await db
    .select()
    .from(architectUploadedSpecs)
    .where(eq(architectUploadedSpecs.id, input.specId))
    .then((rows) => rows[0]);

  if (!spec) throw new Error(`Spec not found`);

  const assembly = await db
    .select()
    .from(architectSpecAssemblies)
    .where(eq(architectSpecAssemblies.id, input.specAssemblyId))
    .then((rows) => rows[0]);

  if (!assembly) throw new Error(`Assembly not found`);

  const alternative = await db
    .select()
    .from(epdMaterials)
    .where(eq(epdMaterials.id, input.selectedAlternativeId))
    .then((rows) => rows[0]);

  if (!alternative) throw new Error(`Alternative not found`);

  const rfqNumber =
    input.rfqNumber || `RFQ-${Date.now()}-${input.specId}-${input.specAssemblyId}`;

  // Create workbook
  const workbook = new ExcelJS.Workbook();

  // ─────────────────────────────────────────────────────────────────────
  // SHEET 1: Cover
  // ─────────────────────────────────────────────────────────────────────
  const coverSheet = workbook.addWorksheet("Cover");
  coverSheet.columns = [{ width: 40 }, { width: 40 }];

  coverSheet.getCell("A1").value = "REQUEST FOR QUOTATION";
  coverSheet.getCell("A1").font = { bold: true, size: 18 };
  coverSheet.mergeCells("A1:B1");

  coverSheet.getCell("A3").value = "RFQ Number:";
  coverSheet.getCell("B3").value = rfqNumber;
  coverSheet.getCell("B3").font = { bold: true };

  coverSheet.getCell("A4").value = "Date:";
  coverSheet.getCell("B4").value = new Date().toISOString().split("T")[0];

  coverSheet.getCell("A6").value = "PROJECT INFORMATION";
  coverSheet.getCell("A6").font = { bold: true, size: 12 };

  coverSheet.getCell("A7").value = "Project Name:";
  coverSheet.getCell("B7").value = input.projectName || spec.projectName || "Not specified";

  coverSheet.getCell("A8").value = "Architect:";
  coverSheet.getCell("B8").value = input.architectName || "GreenChainz Architect";

  if (input.buildingAddress) {
    coverSheet.getCell("A9").value = "Location:";
    coverSheet.getCell("B9").value = input.buildingAddress;
  }

  // ─────────────────────────────────────────────────────────────────────
  // SHEET 2: Specification
  // ─────────────────────────────────────────────────────────────────────
  const specSheet = workbook.addWorksheet("Specification");
  specSheet.columns = [
    { header: "Field", width: 30 },
    { header: "Value", width: 50 },
  ];

  specSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  specSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF366092" },
  };

  let specRow = 2;
  const specData = [
    ["Assembly Code", assembly.assemblyCode || "N/A"],
    ["Assembly Type", assembly.assemblyType || "N/A"],
    [
      "Current GWP",
      assembly.gwpPer1000sf
        ? `${assembly.gwpPer1000sf} kg CO₂e/1000 SF`
        : "Not specified",
    ],
    ["Description", assembly.description || "N/A"],
  ];

  specData.forEach((row) => {
    specSheet.getCell(`A${specRow}`).value = row[0];
    specSheet.getCell(`B${specRow}`).value = row[1];
    specRow++;
  });

  // ─────────────────────────────────────────────────────────────────────
  // SHEET 3: Recommended Material
  // ─────────────────────────────────────────────────────────────────────
  const materialSheet = workbook.addWorksheet("Recommended Material");
  materialSheet.columns = [
    { header: "Field", width: 30 },
    { header: "Value", width: 50 },
  ];

  materialSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  materialSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B5345" },
  };

  let matRow = 2;
  const matData = [
    ["Product Name", alternative.productName],
    ["Manufacturer", alternative.manufacturerName || "N/A"],
    ["Assembly Type", alternative.assemblyType || "N/A"],
    [
      "Embodied Carbon",
      alternative.gwpPer1000sf
        ? `${alternative.gwpPer1000sf} kg CO₂e/1000 SF`
        : "N/A",
    ],
  ];

  matData.forEach((row) => {
    materialSheet.getCell(`A${matRow}`).value = row[0];
    materialSheet.getCell(`B${matRow}`).value = row[1];
    matRow++;
  });

  // ─────────────────────────────────────────────────────────────────────
  // SHEET 4: Sustainability
  // ─────────────────────────────────────────────────────────────────────
  const sustainSheet = workbook.addWorksheet("Sustainability");
  sustainSheet.columns = [
    { header: "Metric", width: 30 },
    { header: "Value", width: 50 },
  ];

  sustainSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sustainSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2D6A4F" },
  };

  let susRow = 2;
  const altGwp = alternative.gwpPer1000sf
    ? parseFloat(alternative.gwpPer1000sf.toString())
    : null;
  const originalGwp = assembly.gwpPer1000sf
    ? parseFloat(assembly.gwpPer1000sf.toString())
    : null;

  const sustainData = [
    [
      "Embodied Carbon (GWP)",
      altGwp ? `${altGwp.toFixed(2)} kg CO₂e/1000 SF` : "N/A",
    ],
  ];

  if (originalGwp && altGwp && originalGwp > 0) {
    const carbonDelta = ((altGwp - originalGwp) / originalGwp) * 100;
    sustainData.push([
      "Carbon Delta",
      `${carbonDelta.toFixed(1)}% ${carbonDelta < 0 ? "(reduction)" : "(increase)"}`,
    ]);
  }

  if (
    alternative.leedCredits &&
    typeof alternative.leedCredits === "object"
  ) {
    const credits = Object.entries(alternative.leedCredits)
      .map(([code, pts]) => `${code} (${pts} pt${(pts as number) > 1 ? "s" : ""})`)
      .join("; ");
    if (credits) {
      sustainData.push(["LEED Credits", credits]);
    }
  }

  if (alternative.hardnessMohs) {
    sustainData.push(["Hardness (MOHS)", alternative.hardnessMohs.toString()]);
  }

  if (alternative.installabilityHrsSf) {
    sustainData.push([
      "Installability",
      `${alternative.installabilityHrsSf} hrs/1000 SF`,
    ]);
  }

  if (alternative.lifespanYears) {
    sustainData.push(["Lifespan", `${alternative.lifespanYears} years`]);
  }

  sustainData.forEach((row) => {
    sustainSheet.getCell(`A${susRow}`).value = row[0];
    sustainSheet.getCell(`B${susRow}`).value = row[1];
    susRow++;
  });

  // ─────────────────────────────────────────────────────────────────────
  // SHEET 5: Compliance
  // ─────────────────────────────────────────────────────────────────────
  const compSheet = workbook.addWorksheet("Compliance");
  compSheet.columns = [
    { header: "Requirement", width: 30 },
    { header: "Status", width: 20 },
  ];

  compSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  compSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF8B0000" },
  };

  let compRow = 2;

  const complianceData: Array<[string, string]> = [];

  if (alternative.fireRating && alternative.fireRating.length > 0) {
    complianceData.push(["Fire Rating", alternative.fireRating]);
  } else {
    complianceData.push(["Fire Rating", "Not documented"]);
  }

  complianceData.push([
    "Title 24 Compliant",
    alternative.title24Compliant === true ? "✓ Yes" : "Not compliant",
  ]);

  complianceData.push([
    "IECC Compliant",
    alternative.ieccCompliant === true ? "✓ Yes" : "Not compliant",
  ]);

  if (
    alternative.astmStandards &&
    Array.isArray(alternative.astmStandards) &&
    alternative.astmStandards.length > 0
  ) {
    complianceData.push([
      "ASTM Standards",
      alternative.astmStandards.join(", "),
    ]);
  }

  complianceData.push([
    "VOC Compliant",
    alternative.vocCompliant === true ? "✓ Yes" : "Not compliant",
  ]);

  if (alternative.epdExpiry) {
    const expiry = new Date(alternative.epdExpiry);
    const isValid = expiry > new Date();
    complianceData.push([
      "EPD Status",
      `${isValid ? "✓ Valid" : "Expired"} (${expiry.toISOString().split("T")[0]})`,
    ]);
  }

  complianceData.push([
    "Red List Free",
    alternative.notOnRedList === true ? "✓ Yes" : "Not verified",
  ]);

  complianceData.push([
    "Greenguard Gold",
    alternative.greenguardGold === true ? "✓ Certified" : "Not certified",
  ]);

  complianceData.forEach((row) => {
    compSheet.getCell(`A${compRow}`).value = row[0];
    compSheet.getCell(`B${compRow}`).value = row[1];
    compRow++;
  });

  // ─────────────────────────────────────────────────────────────────────
  // SHEET 6: Pricing
  // ─────────────────────────────────────────────────────────────────────
  const priceSheet = workbook.addWorksheet("Pricing");
  priceSheet.columns = [
    { header: "Item", width: 30 },
    { header: "Details", width: 50 },
  ];

  priceSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  priceSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4D3D" },
  };

  let priceRow = 2;

  if (alternative.pricePerUnit) {
    priceSheet.getCell(`A${priceRow}`).value = "Unit Price";
    priceSheet.getCell(`B${priceRow}`).value = `$${parseFloat(alternative.pricePerUnit.toString()).toFixed(2)}`;
    priceRow++;
  }

  priceSheet.getCell(`A${priceRow}`).value = "Volume Discounts";
  priceSheet.getCell(`B${priceRow}`).value = "Available upon request";
  priceRow++;

  priceSheet.getCell(`A${priceRow}`).value = "Lead Time";
  priceSheet.getCell(`B${priceRow}`).value = "Contact supplier for details";
  priceRow++;

  priceSheet.getCell(`A${priceRow}`).value = "Payment Terms";
  priceSheet.getCell(`B${priceRow}`).value = "Negotiable based on order";

  // Convert to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    filename: `RFQ_${rfqNumber}_${Date.now()}.xlsx`,
  };
}
