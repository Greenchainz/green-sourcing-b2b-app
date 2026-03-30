import { Router } from "express";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getDb } from "./db";
import { materials, manufacturers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const specSheetRouter = Router();

specSheetRouter.get("/materials/:id/spec-sheet", async (req, res) => {
  try {
    const materialId = parseInt(req.params.id);
    if (isNaN(materialId)) {
      res.status(400).json({ error: "Invalid material ID" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database unavailable" });
      return;
    }

    const rows = await db
      .select({
        material: materials,
        manufacturerName: manufacturers.name,
        manufacturerWebsite: manufacturers.website,
        manufacturerHeadquarters: manufacturers.headquarters,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(eq(materials.id, materialId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    const mat = rows[0].material;
    const mfgName = rows[0].manufacturerName;
    const mfgWebsite = rows[0].manufacturerWebsite;

    const pdfBytes = await generateSpecSheetPdf(mat, mfgName, mfgWebsite);

    const safeName = mat.name.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 60);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="GreenChainz-SpecSheet-${safeName}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[spec-sheet] PDF generation error:", err);
    res.status(500).json({ error: "Failed to generate spec sheet" });
  }
});

// ── PDF Generation ──────────────────────────────────────────────────────────

type MaterialRow = typeof materials.$inferSelect;

const GREEN = rgb(21 / 255, 128 / 255, 61 / 255); // #15803d
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const DARK = rgb(31 / 255, 41 / 255, 55 / 255);
const MID = rgb(107 / 255, 114 / 255, 128 / 255);
const LIGHT_GREEN = rgb(240 / 255, 253 / 255, 244 / 255);
const BORDER = rgb(229 / 255, 231 / 255, 235 / 255);

async function generateSpecSheetPdf(
  mat: MaterialRow,
  manufacturerName: string | null,
  manufacturerWebsite: string | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612; // Letter width in points
  const PAGE_H = 792; // Letter height in points
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H; // current y position (top of page)

  // Helper: add a new page if running low on space
  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 40) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  }

  // ── Header Bar ──────────────────────────────────────────────────────────
  const HEADER_H = 65;
  page.drawRectangle({
    x: 0,
    y: PAGE_H - HEADER_H,
    width: PAGE_W,
    height: HEADER_H,
    color: GREEN,
  });

  page.drawText("GreenChainz", {
    x: MARGIN,
    y: PAGE_H - 28,
    size: 20,
    font: helveticaBold,
    color: WHITE,
  });

  page.drawText("Material Specification Sheet", {
    x: PAGE_W - MARGIN - helvetica.widthOfTextAtSize("Material Specification Sheet", 10),
    y: PAGE_H - 25,
    size: 10,
    font: helvetica,
    color: WHITE,
  });

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(dateStr, {
    x: PAGE_W - MARGIN - helvetica.widthOfTextAtSize(dateStr, 9),
    y: PAGE_H - 40,
    size: 9,
    font: helvetica,
    color: WHITE,
  });

  y = PAGE_H - HEADER_H - 25;

  // ── Section 1: Material Identity ────────────────────────────────────────
  drawSectionTitle(page, "Material Identity", MARGIN, y, helveticaBold);
  y -= 22;

  // Material name
  page.drawText(mat.name, {
    x: MARGIN,
    y,
    size: 18,
    font: helveticaBold,
    color: DARK,
  });
  y -= 18;

  if (mat.productName && mat.productName !== mat.name) {
    page.drawText(mat.productName, {
      x: MARGIN,
      y,
      size: 11,
      font: helvetica,
      color: MID,
    });
    y -= 16;
  }

  if (manufacturerName) {
    page.drawText(`Manufacturer: ${manufacturerName}`, {
      x: MARGIN,
      y,
      size: 11,
      font: helvetica,
      color: DARK,
    });
    y -= 16;
  }

  const catText = [mat.category, mat.subcategory].filter(Boolean).join(" / ");
  if (catText) {
    page.drawText(`Category: ${catText}`, {
      x: MARGIN,
      y,
      size: 10,
      font: helvetica,
      color: MID,
    });
    y -= 16;
  }

  if (mat.usManufactured) {
    page.drawText("US Manufactured", {
      x: MARGIN,
      y,
      size: 10,
      font: helveticaBold,
      color: GREEN,
    });
    y -= 16;
  }

  y -= 12;

  // ── Section 2: Technical Specifications ─────────────────────────────────
  const techSpecs: [string, string][] = [];
  if (mat.rValue) techSpecs.push(["R-Value", String(mat.rValue)]);
  if (mat.fireRating) {
    const fr = mat.fireRatingStandard
      ? `${mat.fireRating} (${mat.fireRatingStandard})`
      : mat.fireRating;
    techSpecs.push(["Fire Rating", fr]);
  }
  if (mat.thermalUValue) techSpecs.push(["Thermal U-Value", String(mat.thermalUValue)]);
  if (mat.vocLevel) {
    const voc = mat.vocCertification
      ? `${mat.vocLevel} (${mat.vocCertification})`
      : mat.vocLevel;
    techSpecs.push(["VOC Level", voc]);
  }
  if (mat.astmStandards) techSpecs.push(["ASTM Standards", mat.astmStandards]);
  if (mat.declaredUnit) techSpecs.push(["Declared Unit", mat.declaredUnit]);
  if (mat.expectedLifecycleYears)
    techSpecs.push(["Expected Lifecycle", `${mat.expectedLifecycleYears} years`]);
  if (mat.warrantyYears)
    techSpecs.push(["Warranty", `${mat.warrantyYears} years`]);

  if (techSpecs.length > 0) {
    ensureSpace(30 + techSpecs.length * 20);
    drawSectionTitle(page, "Technical Specifications", MARGIN, y, helveticaBold);
    y -= 6;
    y = drawTable(page, techSpecs, MARGIN, y, CONTENT_W, helvetica, helveticaBold);
    y -= 12;
  }

  // ── Section 3: Sustainability Data ──────────────────────────────────────
  const sustainSpecs: [string, string][] = [];
  if (mat.gwpValue) {
    const gwpText = `${mat.gwpValue} ${mat.gwpUnit || "kgCO₂e"}${mat.declaredUnit ? ` per ${mat.declaredUnit}` : ""}`;
    sustainSpecs.push(["GWP (Global Warming Potential)", gwpText]);
  }
  if (mat.embodiedCarbonPer1000sf)
    sustainSpecs.push(["Embodied Carbon per 1000 SF", `${mat.embodiedCarbonPer1000sf} kgCO2e`]);
  if (mat.epdNumber) sustainSpecs.push(["EPD Number", mat.epdNumber]);
  if (mat.epdProgramOperator)
    sustainSpecs.push(["EPD Program Operator", mat.epdProgramOperator]);
  if (mat.ec3IndustryMedian)
    sustainSpecs.push(["EC3 Industry Median", mat.ec3IndustryMedian]);
  if (mat.recycledContentPct)
    sustainSpecs.push(["Recycled Content", `${mat.recycledContentPct}%`]);

  if (sustainSpecs.length > 0) {
    ensureSpace(30 + sustainSpecs.length * 20);
    drawSectionTitle(page, "Sustainability Data", MARGIN, y, helveticaBold);
    y -= 6;
    y = drawTable(page, sustainSpecs, MARGIN, y, CONTENT_W, helvetica, helveticaBold);
    y -= 12;
  }

  // ── Section 4: Certifications ───────────────────────────────────────────
  const certs: [string, boolean][] = [
    ["EPD (Environmental Product Declaration)", !!mat.hasEpd],
    ["HPD (Health Product Declaration)", !!mat.hasHpd],
    ["FSC Certified", !!mat.hasFsc],
    ["Cradle to Cradle", !!mat.hasC2c],
    ["GREENGUARD", !!mat.hasGreenguard],
    ["Declare Label", !!mat.hasDeclare],
    ["Title 24 Compliant", !!mat.meetsTitle24],
    ["IECC Compliant", !!mat.meetsIecc],
    ["Red List Free", !mat.onRedList],
  ];

  ensureSpace(30 + Math.ceil(certs.length / 2) * 18 + 20);
  drawSectionTitle(page, "Certifications", MARGIN, y, helveticaBold);
  y -= 20;

  const COL_W = CONTENT_W / 2;
  certs.forEach((cert, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) y -= 18;
    ensureSpace(18);
    const x = MARGIN + col * COL_W;
    const check = cert[1] ? "\u2713" : "\u2717";
    const color = cert[1] ? GREEN : MID;
    page.drawText(check, { x, y, size: 12, font: helveticaBold, color });
    page.drawText(` ${cert[0]}`, {
      x: x + 14,
      y,
      size: 10,
      font: helvetica,
      color: DARK,
    });
  });
  // If odd number of certs, move down after last row
  y -= 22;

  // ── Section 5: Procurement ──────────────────────────────────────────────
  const procSpecs: [string, string][] = [];
  if (mat.pricePerUnit)
    procSpecs.push(["Price", `$${mat.pricePerUnit} per ${mat.priceUnit || "unit"}`]);
  if (mat.leadTimeDays)
    procSpecs.push(["Lead Time", `${mat.leadTimeDays} days`]);
  if (mat.complianceGrade)
    procSpecs.push(["Compliance Grade", mat.complianceGrade]);

  if (procSpecs.length > 0) {
    ensureSpace(30 + procSpecs.length * 20);
    drawSectionTitle(page, "Procurement", MARGIN, y, helveticaBold);
    y -= 6;
    y = drawTable(page, procSpecs, MARGIN, y, CONTENT_W, helvetica, helveticaBold);
    y -= 12;
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const FOOTER_Y = MARGIN;
  // Draw footer on all pages
  for (const p of doc.getPages()) {
    // Separator line
    p.drawLine({
      start: { x: MARGIN, y: FOOTER_Y + 30 },
      end: { x: PAGE_W - MARGIN, y: FOOTER_Y + 30 },
      thickness: 0.5,
      color: BORDER,
    });

    p.drawText("Generated by GreenChainz — greenchainz.com", {
      x: MARGIN,
      y: FOOTER_Y + 18,
      size: 8,
      font: helveticaBold,
      color: GREEN,
    });

    p.drawText(
      "This data sheet is provided for specification reference. Verify all data with manufacturer.",
      {
        x: MARGIN,
        y: FOOTER_Y + 6,
        size: 7,
        font: helvetica,
        color: MID,
      }
    );

    const footerRight = `${dateStr}  |  Material ID: ${mat.id}`;
    p.drawText(footerRight, {
      x: PAGE_W - MARGIN - helvetica.widthOfTextAtSize(footerRight, 7),
      y: FOOTER_Y + 6,
      size: 7,
      font: helvetica,
      color: MID,
    });
  }

  return doc.save();
}

// ── Drawing Helpers ───────────────────────────────────────────────────────────

function drawSectionTitle(
  page: ReturnType<typeof PDFDocument.prototype.addPage>,
  title: string,
  x: number,
  y: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
) {
  page.drawText(title, {
    x,
    y,
    size: 13,
    font,
    color: GREEN,
  });
  // Underline
  const w = font.widthOfTextAtSize(title, 13);
  page.drawLine({
    start: { x, y: y - 3 },
    end: { x: x + w, y: y - 3 },
    thickness: 1.5,
    color: GREEN,
  });
}

function drawTable(
  page: ReturnType<typeof PDFDocument.prototype.addPage>,
  rows: [string, string][],
  x: number,
  y: number,
  width: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  fontBold: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
): number {
  const ROW_H = 20;
  const LABEL_W = width * 0.45;

  for (let i = 0; i < rows.length; i++) {
    y -= ROW_H;
    const [label, value] = rows[i];

    // Alternating row background
    if (i % 2 === 0) {
      page.drawRectangle({
        x,
        y: y - 4,
        width,
        height: ROW_H,
        color: LIGHT_GREEN,
      });
    }

    page.drawText(label, {
      x: x + 8,
      y: y + 2,
      size: 9,
      font: fontBold,
      color: DARK,
    });

    // Truncate long values to fit
    let displayValue = value;
    const maxValueW = width - LABEL_W - 16;
    while (
      font.widthOfTextAtSize(displayValue, 9) > maxValueW &&
      displayValue.length > 3
    ) {
      displayValue = displayValue.slice(0, -4) + "...";
    }

    page.drawText(displayValue, {
      x: x + LABEL_W,
      y: y + 2,
      size: 9,
      font,
      color: DARK,
    });
  }

  return y - 4;
}
