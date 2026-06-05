/**
 * RFQ PDF Generator
 *
 * Generates a professional Request for Quotation PDF for architects to send to suppliers.
 * Includes:
 * - Project header (name, architect, RFQ #)
 * - Assembly specification (original material + recommended alternative)
 * - Material sustainability metrics (GWP, carbon delta, LEED credits)
 * - Compliance summary (fire rating, ASTM, code checklist)
 * - Supplier contact info + lead time
 * - Cost estimate + volume discount structure
 *
 * Uses pdfkit for Node.js native PDF generation (no server deps).
 */

import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { getDb } from "../db";
import { epdMaterials } from "../../drizzle/schema";
import { architectSpecAssemblies, architectUploadedSpecs } from "../../drizzle/schema-additions-mcs";
import { eq } from "drizzle-orm";

export interface RFQGeneratorInput {
  specId: number;
  specAssemblyId: number;
  selectedAlternativeId: number; // epdMaterialId
  projectName?: string;
  architectName?: string;
  buildingAddress?: string;
  rfqNumber?: string; // Auto-generated if not provided
  includeSupplierInfo?: boolean;
}

/**
 * Generate RFQ PDF as Buffer
 * Returns: { buffer, filename }
 */
export async function generateRfqPdf(
  input: RFQGeneratorInput,
): Promise<{ buffer: Buffer; filename: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Fetch spec metadata
  const [spec] = await db
    .select()
    .from(architectUploadedSpecs)
    .where(eq(architectUploadedSpecs.id, input.specId));

  if (!spec) throw new Error(`Spec ${input.specId} not found`);

  // Fetch assembly row (original material info)
  const [assembly] = await db
    .select()
    .from(architectSpecAssemblies)
    .where(eq(architectSpecAssemblies.id, input.specAssemblyId));

  if (!assembly) throw new Error(`Assembly ${input.specAssemblyId} not found`);

  // Fetch selected alternative (recommended material)
  const [alternative] = await db
    .select()
    .from(epdMaterials)
    .where(eq(epdMaterials.id, input.selectedAlternativeId));

  if (!alternative) {
    throw new Error(`Alternative ${input.selectedAlternativeId} not found`);
  }

  // Generate RFQ number if not provided
  const rfqNumber =
    input.rfqNumber ||
    `RFQ-${Date.now()}-${input.specId}-${input.specAssemblyId}`;

  // Create PDF document
  const doc = new PDFDocument({ size: "letter", margin: 50 });

  // Collect output to buffer
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        filename: `RFQ_${rfqNumber}_${Date.now()}.pdf`,
      });
    });

    doc.on("error", reject);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 1: Header
    // ─────────────────────────────────────────────────────────────────────
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("REQUEST FOR QUOTATION", { align: "center" });

    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`RFQ #: ${rfqNumber}`, 50, 80);
    doc.fontSize(10).text(`Date: ${new Date().toISOString().split("T")[0]}`, {
      align: "right",
    });

    doc.moveTo(50, 110).lineTo(500, 110).stroke();
    doc.moveDown(1);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 2: Project Info
    // ─────────────────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").text("PROJECT INFORMATION");
    doc.fontSize(10).font("Helvetica");
    doc.text(
      `Project Name: ${input.projectName || spec.projectName || "Not specified"}`,
    );
    doc.text(
      `Architect: ${input.architectName || "GreenChainz Architect Workflow"}`,
    );
    if (input.buildingAddress) {
      doc.text(`Location: ${input.buildingAddress}`);
    }
    doc.moveDown(0.5);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 3: Assembly Specification (Original)
    // ─────────────────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").text("EXISTING SPECIFICATION");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Assembly Code: ${assembly.assemblyCode || "N/A"}`);
    doc.text(`Assembly Type: ${assembly.assemblyType || "N/A"}`);
    doc.text(`MasterFormat Section: ${assembly.masterformatSection || "N/A"}`);
    doc.text(
      `Current GWP: ${assembly.gwpPer1000sf ? `${assembly.gwpPer1000sf} kg CO₂e/1000 SF` : "Not specified"}`,
    );
    if (assembly.description) {
      doc.text(`Description: ${assembly.description}`, { width: 400 });
    }
    doc.moveDown(0.5);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 4: Recommended Alternative
    // ─────────────────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").text("RECOMMENDED ALTERNATIVE");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Product: ${alternative.productName}`);
    if (alternative.manufacturerName) {
      doc.text(`Manufacturer: ${alternative.manufacturerName}`);
    }

    // Carbon metrics
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica-Bold").text("SUSTAINABILITY METRICS");
    doc.fontSize(9).font("Helvetica");
    const altGwp = alternative.gwpPer1000sf
      ? parseFloat(alternative.gwpPer1000sf.toString())
      : null;
    const originalGwp = assembly.gwpPer1000sf
      ? parseFloat(assembly.gwpPer1000sf.toString())
      : null;

    if (altGwp !== null) {
      doc.text(`Embodied Carbon (GWP): ${altGwp.toFixed(2)} kg CO₂e/1000 SF`);
    }

    if (originalGwp !== null && altGwp !== null && originalGwp > 0) {
      const carbonDelta = ((altGwp - originalGwp) / originalGwp) * 100;
      const deltaText =
        carbonDelta < 0
          ? `${Math.abs(carbonDelta).toFixed(1)}% reduction`
          : `${carbonDelta.toFixed(1)}% increase`;
      doc.fillColor(carbonDelta < 0 ? "#00AA00" : "#CC0000")
         .text(`Carbon Delta: ${deltaText}`);
      doc.fillColor("#000000");
    }

    // LEED credits
    if (
      alternative.leedCredits &&
      typeof alternative.leedCredits === "object"
    ) {
      const credits = Object.entries(alternative.leedCredits)
        .map(([code, pts]) => `${code} (${pts} pt${pts > 1 ? "s" : ""})`)
        .join(", ");
      if (credits) {
        doc.text(`LEED Credits: ${credits}`);
      }
    }

    doc.moveDown(0.5);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 5: Compliance & Code
    // ─────────────────────────────────────────────────────────────────────
    doc.fontSize(10).font("Helvetica-Bold").text("COMPLIANCE & CODE");
    doc.fontSize(9).font("Helvetica");

    const complianceItems: string[] = [];
    if (alternative.fireRating && alternative.fireRating.length > 0) {
      complianceItems.push(`Fire Rating: ${alternative.fireRating}`);
    }
    if (alternative.title24Compliant === true) {
      complianceItems.push("✓ Title 24 Compliant");
    }
    if (alternative.ieccCompliant === true) {
      complianceItems.push("✓ IECC Compliant");
    }
    if (
      alternative.astmStandards &&
      Array.isArray(alternative.astmStandards) &&
      alternative.astmStandards.length > 0
    ) {
      complianceItems.push(
        `ASTM Standards: ${alternative.astmStandards.join(", ")}`,
      );
    }
    if (alternative.vocCompliant === true) {
      complianceItems.push("✓ VOC Compliant");
    }
    if (alternative.epdExpiry) {
      const expiry = new Date(alternative.epdExpiry);
      if (expiry > new Date()) {
        complianceItems.push(`✓ EPD Valid (expires ${expiry.toISOString().split("T")[0]})`);
      }
    }

    if (complianceItems.length > 0) {
      complianceItems.forEach((item) => doc.text(item));
    } else {
      doc.text("No compliance data available");
    }

    doc.moveDown(0.5);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 6: Material Properties (if available)
    // ─────────────────────────────────────────────────────────────────────
    const hasProperties =
      alternative.hardnessMohs ||
      alternative.installabilityHrsSf ||
      alternative.lifespanYears;

    if (hasProperties) {
      doc.fontSize(10).font("Helvetica-Bold").text("MATERIAL PROPERTIES");
      doc.fontSize(9).font("Helvetica");

      if (alternative.hardnessMohs) {
        doc.text(`Hardness (MOHS): ${alternative.hardnessMohs}`);
      }
      if (alternative.installabilityHrsSf) {
        doc.text(`Installability: ${alternative.installabilityHrsSf} hrs/1000 SF`);
      }
      if (alternative.lifespanYears) {
        doc.text(`Lifespan: ${alternative.lifespanYears} years`);
      }

      doc.moveDown(0.5);
    }

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 7: Price & Volume
    // ─────────────────────────────────────────────────────────────────────
    doc.fontSize(10).font("Helvetica-Bold").text("PRICING INFORMATION");
    doc.fontSize(9).font("Helvetica");

    if (alternative.pricePerUnit) {
      doc.text(
        `Unit Price: $${parseFloat(alternative.pricePerUnit.toString()).toFixed(2)}`,
      );
    }
    doc.text("Volume discounts negotiable based on order quantity");
    doc.moveDown(0.5);

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 8: Supplier Contact (if provided)
    // ─────────────────────────────────────────────────────────────────────
    if (input.includeSupplierInfo) {
      doc.fontSize(10).font("Helvetica-Bold").text("SUPPLIER INFORMATION");
      doc.fontSize(9).font("Helvetica");
      doc.text("Contact GreenChainz to connect with verified suppliers");
      doc.text("Supplier lead times and regional availability available upon request");
      doc.moveDown(0.5);
    }

    // ─────────────────────────────────────────────────────────────────────
    // SECTION 9: Footer
    // ─────────────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
    doc.fontSize(8).font("Helvetica").text(
      "Generated by GreenChainz — The OS for Sustainable Procurement",
      { align: "center" },
    );
    doc.text("https://greenchainz.com", { align: "center" });

    doc.end();
  });
}

/**
 * Stream RFQ PDF directly to HTTP response
 * Usage: res.type('application/pdf'); const stream = await streamRfqPdf(input); stream.pipe(res);
 */
export async function streamRfqPdf(input: RFQGeneratorInput): Promise<Readable> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Fetch data (same as buffer approach)
  const [spec] = await db
    .select()
    .from(architectUploadedSpecs)
    .where(eq(architectUploadedSpecs.id, input.specId));

  if (!spec) throw new Error(`Spec ${input.specId} not found`);

  const [assembly] = await db
    .select()
    .from(architectSpecAssemblies)
    .where(eq(architectSpecAssemblies.id, input.specAssemblyId));

  if (!assembly) throw new Error(`Assembly ${input.specAssemblyId} not found`);

  const [alternative] = await db
    .select()
    .from(epdMaterials)
    .where(eq(epdMaterials.id, input.selectedAlternativeId));

  if (!alternative) throw new Error(`Alternative not found`);

  const rfqNumber =
    input.rfqNumber ||
    `RFQ-${Date.now()}-${input.specId}-${input.specAssemblyId}`;

  // Create PDF and return as readable stream
  const doc = new PDFDocument({ size: "letter", margin: 50 });

  // Same content as generateRfqPdf, but return stream immediately
  (async () => {
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("REQUEST FOR QUOTATION", { align: "center" });

    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`RFQ #: ${rfqNumber}`, 50, 80);
    doc.fontSize(10).text(`Date: ${new Date().toISOString().split("T")[0]}`, {
      align: "right",
    });

    doc.moveTo(50, 110).lineTo(500, 110).stroke();
    doc.moveDown(1);

    doc.fontSize(12).font("Helvetica-Bold").text("PROJECT INFORMATION");
    doc.fontSize(10).font("Helvetica");
    doc.text(
      `Project Name: ${input.projectName || spec.projectName || "Not specified"}`,
    );
    doc.text(
      `Architect: ${input.architectName || "GreenChainz Architect Workflow"}`,
    );

    doc.fontSize(12).font("Helvetica-Bold").text("EXISTING SPECIFICATION");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Assembly Code: ${assembly.assemblyCode || "N/A"}`);
    doc.text(`Assembly Type: ${assembly.assemblyType || "N/A"}`);
    doc.text(`MasterFormat Section: ${assembly.masterformatSection || "N/A"}`);

    doc.fontSize(12).font("Helvetica-Bold").text("RECOMMENDED ALTERNATIVE");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Product: ${alternative.productName}`);
    if (alternative.manufacturerName) {
      doc.text(`Manufacturer: ${alternative.manufacturerName}`);
    }

    doc.fontSize(10).font("Helvetica-Bold").text("SUSTAINABILITY METRICS");
    doc.fontSize(9).font("Helvetica");

    if (alternative.gwpPer1000sf) {
      doc.text(
        `Embodied Carbon (GWP): ${alternative.gwpPer1000sf} kg CO₂e/1000 SF`,
      );
    }

    doc.fontSize(10).font("Helvetica-Bold").text("COMPLIANCE & CODE");
    doc.fontSize(9).font("Helvetica");
    if (alternative.fireRating) {
      doc.text(`Fire Rating: ${alternative.fireRating}`);
    }
    if (alternative.title24Compliant) {
      doc.text("✓ Title 24 Compliant");
    }
    if (alternative.ieccCompliant) {
      doc.text("✓ IECC Compliant");
    }

    doc.fontSize(8).font("Helvetica").text(
      "Generated by GreenChainz — The OS for Sustainable Procurement",
      { align: "center" },
    );

    doc.end();
  })();

  return doc as unknown as Readable;
}
