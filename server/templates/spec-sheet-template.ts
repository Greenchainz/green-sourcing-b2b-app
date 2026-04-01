/**
 * pdfme template for GreenChainz Material Specification Sheet.
 *
 * Coordinates are in mm. Letter size = 215.9 × 279.4 mm.
 * Green branding: #15803d
 */

import type { Template, BlankPdf, Schema } from "@pdfme/common";

type MaterialRow = {
  id: number;
  name: string;
  productName?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  rValue?: string | null;
  fireRating?: string | null;
  fireRatingStandard?: string | null;
  thermalUValue?: string | null;
  vocLevel?: string | null;
  vocCertification?: string | null;
  astmStandards?: string | null;
  declaredUnit?: string | null;
  expectedLifecycleYears?: number | null;
  warrantyYears?: number | null;
  gwpValue?: string | null;
  gwpUnit?: string | null;
  embodiedCarbonPer1000sf?: string | null;
  epdNumber?: string | null;
  epdProgramOperator?: string | null;
  ec3IndustryMedian?: string | null;
  recycledContentPct?: string | null;
  hasEpd?: boolean | null;
  hasHpd?: boolean | null;
  hasFsc?: boolean | null;
  hasC2c?: boolean | null;
  hasGreenguard?: boolean | null;
  hasDeclare?: boolean | null;
  meetsTitle24?: boolean | null;
  meetsIecc?: boolean | null;
  onRedList?: boolean | null;
  pricePerUnit?: string | null;
  priceUnit?: string | null;
  leadTimeDays?: number | null;
  complianceGrade?: string | null;
  usManufactured?: boolean | null;
};

// ── Layout Constants (mm) ────────────────────────────────────────────────────

const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 20;
const GREEN = "#15803d";
const DARK = "#1f2937";
const MID = "#6b7280";
const LIGHT_GREEN_BG = "#f0fdf4";

// ── Helper to define a text schema ───────────────────────────────────────────

function textField(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    fontSize?: number;
    fontColor?: string;
    alignment?: "left" | "center" | "right";
    verticalAlignment?: "top" | "middle" | "bottom";
    backgroundColor?: string;
    lineHeight?: number;
  } = {}
): Schema & Record<string, unknown> {
  return {
    name,
    type: "text",
    position: { x, y },
    width: w,
    height: h,
    fontSize: opts.fontSize ?? 10,
    fontColor: opts.fontColor ?? DARK,
    alignment: opts.alignment ?? "left",
    verticalAlignment: opts.verticalAlignment ?? "middle",
    backgroundColor: opts.backgroundColor ?? "",
    lineHeight: opts.lineHeight ?? 1.4,
    characterSpacing: 0,
  };
}

function rectField(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  borderWidth = 0,
  borderColor = ""
): Schema & Record<string, unknown> {
  return {
    name,
    type: "rectangle",
    position: { x, y },
    width: w,
    height: h,
    color,
    borderWidth,
    borderColor,
    content: "",
  };
}

function lineField(
  name: string,
  x: number,
  y: number,
  w: number,
  color: string
): Schema & Record<string, unknown> {
  return {
    name,
    type: "line",
    position: { x, y },
    width: w,
    height: 0.3,
    color,
    content: "",
  };
}

// ── Table row helpers ────────────────────────────────────────────────────────

const TABLE_LABEL_W = CONTENT_W * 0.42;
const TABLE_VALUE_W = CONTENT_W * 0.58;
const ROW_H = 6.5;

function tableRow(
  prefix: string,
  index: number,
  startY: number
): (Schema & Record<string, unknown>)[] {
  const y = startY + index * ROW_H;
  const bgColor = index % 2 === 0 ? LIGHT_GREEN_BG : "";
  const fields: (Schema & Record<string, unknown>)[] = [];

  if (bgColor) {
    fields.push(rectField(`${prefix}_bg_${index}`, MARGIN, y, CONTENT_W, ROW_H, bgColor));
  }
  fields.push(
    textField(`${prefix}_label_${index}`, MARGIN + 2, y, TABLE_LABEL_W - 2, ROW_H, {
      fontSize: 8,
      fontColor: DARK,
    })
  );
  fields.push(
    textField(`${prefix}_value_${index}`, MARGIN + TABLE_LABEL_W, y, TABLE_VALUE_W - 2, ROW_H, {
      fontSize: 8,
      fontColor: DARK,
    })
  );
  return fields;
}

// ── Section title helper ─────────────────────────────────────────────────────

function sectionTitle(
  name: string,
  y: number
): (Schema & Record<string, unknown>)[] {
  return [
    textField(name, MARGIN, y, CONTENT_W, 7, {
      fontSize: 11,
      fontColor: GREEN,
    }),
    lineField(`${name}_line`, MARGIN, y + 7, CONTENT_W, GREEN),
  ];
}

// ── Build the schemas array (single page) ────────────────────────────────────

function buildSchemas(): (Schema & Record<string, unknown>)[] {
  const schemas: (Schema & Record<string, unknown>)[] = [];
  let y = 0;

  // ── Header bar (static green rectangle + white text) ───────────────────
  schemas.push(rectField("headerBar", 0, 0, PAGE_W, HEADER_H, GREEN));
  schemas.push(
    textField("brandName", MARGIN, 2, 60, 8, {
      fontSize: 16,
      fontColor: "#ffffff",
    })
  );
  schemas.push(
    textField("docTitle", MARGIN + 80, 3, CONTENT_W - 80, 6, {
      fontSize: 9,
      fontColor: "#ffffff",
      alignment: "right",
    })
  );
  schemas.push(
    textField("generatedDate", MARGIN + 80, 10, CONTENT_W - 80, 6, {
      fontSize: 7.5,
      fontColor: "#ffffffcc",
      alignment: "right",
    })
  );
  y = HEADER_H + 6;

  // ── Material Identity ──────────────────────────────────────────────────
  schemas.push(...sectionTitle("sectionIdentity", y));
  y += 10;

  schemas.push(
    textField("materialName", MARGIN, y, CONTENT_W, 8, {
      fontSize: 14,
      fontColor: DARK,
    })
  );
  y += 9;

  schemas.push(
    textField("productName", MARGIN, y, CONTENT_W, 5, {
      fontSize: 9,
      fontColor: MID,
    })
  );
  y += 6;

  schemas.push(
    textField("manufacturerName", MARGIN, y, CONTENT_W * 0.6, 5, {
      fontSize: 9,
      fontColor: DARK,
    })
  );
  schemas.push(
    textField("categoryBadge", MARGIN + CONTENT_W * 0.6, y, CONTENT_W * 0.4, 5, {
      fontSize: 8,
      fontColor: GREEN,
      alignment: "right",
    })
  );
  y += 6;

  schemas.push(
    textField("usManufacturedBadge", MARGIN, y, 40, 5, {
      fontSize: 8,
      fontColor: GREEN,
    })
  );
  y += 8;

  // ── Technical Specifications ───────────────────────────────────────────
  schemas.push(...sectionTitle("sectionTech", y));
  y += 9;

  const TECH_ROWS = 8;
  for (let i = 0; i < TECH_ROWS; i++) {
    schemas.push(...tableRow("tech", i, y));
  }
  y += TECH_ROWS * ROW_H + 6;

  // ── Sustainability Data ────────────────────────────────────────────────
  schemas.push(...sectionTitle("sectionSustain", y));
  y += 9;

  const SUSTAIN_ROWS = 7;
  for (let i = 0; i < SUSTAIN_ROWS; i++) {
    schemas.push(...tableRow("sustain", i, y));
  }
  y += SUSTAIN_ROWS * ROW_H + 6;

  // ── Certifications ────────────────────────────────────────────────────
  schemas.push(...sectionTitle("sectionCerts", y));
  y += 9;

  const CERT_COL_W = CONTENT_W / 3;
  const CERT_ITEMS = 9;
  const CERT_ROWS = Math.ceil(CERT_ITEMS / 3);
  for (let i = 0; i < CERT_ITEMS; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    schemas.push(
      textField(`cert_${i}`, MARGIN + col * CERT_COL_W, y + row * 6, CERT_COL_W, 6, {
        fontSize: 7.5,
        fontColor: DARK,
      })
    );
  }
  y += CERT_ROWS * 6 + 6;

  // ── Procurement ───────────────────────────────────────────────────────
  schemas.push(...sectionTitle("sectionProcurement", y));
  y += 9;

  const PROC_ROWS = 3;
  for (let i = 0; i < PROC_ROWS; i++) {
    schemas.push(...tableRow("proc", i, y));
  }
  y += PROC_ROWS * ROW_H + 8;

  // ── Footer ────────────────────────────────────────────────────────────
  const footerY = PAGE_H - 15;
  schemas.push(lineField("footerLine", MARGIN, footerY, CONTENT_W, "#e5e7eb"));
  schemas.push(
    textField("footerBrand", MARGIN, footerY + 1, CONTENT_W * 0.6, 5, {
      fontSize: 7,
      fontColor: GREEN,
    })
  );
  schemas.push(
    textField("footerDisclaimer", MARGIN, footerY + 5.5, CONTENT_W, 4, {
      fontSize: 6,
      fontColor: MID,
    })
  );
  schemas.push(
    textField("footerMeta", MARGIN + CONTENT_W * 0.6, footerY + 1, CONTENT_W * 0.4, 5, {
      fontSize: 6,
      fontColor: MID,
      alignment: "right",
    })
  );

  return schemas;
}

// ── Template export ──────────────────────────────────────────────────────────

const basePdf: BlankPdf = {
  width: PAGE_W,
  height: PAGE_H,
  padding: [0, 0, 0, 0],
};

export const specSheetTemplate: Template = {
  basePdf,
  schemas: [buildSchemas()],
};

// ── Input builder ────────────────────────────────────────────────────────────

export function buildSpecSheetInputs(
  mat: MaterialRow,
  manufacturerName: string | null,
  _manufacturerWebsite: string | null
): Record<string, string> {
  const inputs: Record<string, string> = {};

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header
  inputs.headerBar = "";
  inputs.brandName = "GreenChainz";
  inputs.docTitle = "Material Specification Sheet";
  inputs.generatedDate = dateStr;

  // Identity
  inputs.sectionIdentity = "Material Identity";
  inputs.materialName = mat.name;
  inputs.productName =
    mat.productName && mat.productName !== mat.name ? mat.productName : "";
  inputs.manufacturerName = manufacturerName
    ? `Manufacturer: ${manufacturerName}`
    : "";
  const catText = [mat.category, mat.subcategory].filter(Boolean).join(" / ");
  inputs.categoryBadge = catText;
  inputs.usManufacturedBadge = mat.usManufactured ? "★ US Manufactured" : "";

  // Technical Specifications
  inputs.sectionTech = "Technical Specifications";
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
  if (mat.warrantyYears) techSpecs.push(["Warranty", `${mat.warrantyYears} years`]);

  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) inputs[`tech_bg_${i}`] = "";
    if (techSpecs[i]) {
      inputs[`tech_label_${i}`] = techSpecs[i][0];
      inputs[`tech_value_${i}`] = techSpecs[i][1];
    } else {
      inputs[`tech_label_${i}`] = "";
      inputs[`tech_value_${i}`] = "";
    }
  }

  // Sustainability Data
  inputs.sectionSustain = "Sustainability Data";
  const sustainSpecs: [string, string][] = [];
  if (mat.gwpValue) {
    const gwpText = `${mat.gwpValue} ${mat.gwpUnit || "kgCO₂e"}${mat.declaredUnit ? ` per ${mat.declaredUnit}` : ""}`;
    sustainSpecs.push(["GWP (Global Warming Potential)", gwpText]);
  }
  if (mat.embodiedCarbonPer1000sf)
    sustainSpecs.push(["Embodied Carbon / 1000 SF", `${mat.embodiedCarbonPer1000sf} kgCO₂e`]);
  if (mat.epdNumber) sustainSpecs.push(["EPD Number", mat.epdNumber]);
  if (mat.epdProgramOperator) sustainSpecs.push(["EPD Program Operator", mat.epdProgramOperator]);
  if (mat.ec3IndustryMedian) sustainSpecs.push(["EC3 Industry Median", mat.ec3IndustryMedian]);
  if (mat.recycledContentPct)
    sustainSpecs.push(["Recycled Content", `${mat.recycledContentPct}%`]);

  for (let i = 0; i < 7; i++) {
    if (i % 2 === 0) inputs[`sustain_bg_${i}`] = "";
    if (sustainSpecs[i]) {
      inputs[`sustain_label_${i}`] = sustainSpecs[i][0];
      inputs[`sustain_value_${i}`] = sustainSpecs[i][1];
    } else {
      inputs[`sustain_label_${i}`] = "";
      inputs[`sustain_value_${i}`] = "";
    }
  }

  // Certifications
  inputs.sectionCerts = "Certifications";
  const certItems: [string, boolean][] = [
    ["EPD (Env. Product Declaration)", !!mat.hasEpd],
    ["HPD (Health Product Decl.)", !!mat.hasHpd],
    ["FSC Certified", !!mat.hasFsc],
    ["Cradle to Cradle", !!mat.hasC2c],
    ["GREENGUARD", !!mat.hasGreenguard],
    ["Declare Label", !!mat.hasDeclare],
    ["Title 24 Compliant", !!mat.meetsTitle24],
    ["IECC Compliant", !!mat.meetsIecc],
    ["Red List Free", !mat.onRedList],
  ];
  for (let i = 0; i < 9; i++) {
    const [label, has] = certItems[i];
    const icon = has ? "✓" : "✗";
    inputs[`cert_${i}`] = `${icon}  ${label}`;
  }

  // Procurement
  inputs.sectionProcurement = "Procurement";
  const procSpecs: [string, string][] = [];
  if (mat.pricePerUnit)
    procSpecs.push(["Price", `$${mat.pricePerUnit} per ${mat.priceUnit || "unit"}`]);
  if (mat.leadTimeDays) procSpecs.push(["Lead Time", `${mat.leadTimeDays} days`]);
  if (mat.complianceGrade) procSpecs.push(["Compliance Grade", mat.complianceGrade]);

  for (let i = 0; i < 3; i++) {
    if (i % 2 === 0) inputs[`proc_bg_${i}`] = "";
    if (procSpecs[i]) {
      inputs[`proc_label_${i}`] = procSpecs[i][0];
      inputs[`proc_value_${i}`] = procSpecs[i][1];
    } else {
      inputs[`proc_label_${i}`] = "";
      inputs[`proc_value_${i}`] = "";
    }
  }

  // Footer
  inputs.footerLine = "";
  inputs.footerBrand = "Generated by GreenChainz — greenchainz.com";
  inputs.footerDisclaimer =
    "This data sheet is provided for specification reference. Verify all data with manufacturer.";
  inputs.footerMeta = `${dateStr}  |  Material ID: ${mat.id}`;

  // Section title line decorations
  inputs.sectionIdentity_line = "";
  inputs.sectionTech_line = "";
  inputs.sectionSustain_line = "";
  inputs.sectionCerts_line = "";
  inputs.sectionProcurement_line = "";

  return inputs;
}
