/**
 * Manufacturer PDF Ingestion Pipeline
 * Uses Azure Document Intelligence (FormRecognizer) to extract technical specs
 * from manufacturer product data sheets and populate material_technical_specs.
 *
 * Endpoint: https://greenchainz-content-intel.cognitiveservices.azure.com/
 * Key: DOCUMENT_INTELLIGENCE_KEY env var (from Key Vault)
 */

import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import axios from "axios";
import { getDb } from "../db";
import { materialTechnicalSpecs, materials } from "../../drizzle/schema";
import { eq, ilike, or } from "drizzle-orm";

// ─── Manufacturer Spec Sheet Catalog ──────────────────────────────────────────
// Each entry maps a manufacturer + product category to a public PDF URL.
// These are real, publicly accessible product data sheets.

export interface ManufacturerSpecSheet {
  manufacturer: string;
  productName: string;
  category: string;
  pdfUrl: string;
  materialNameHints: string[]; // Used to match against materials.name in DB
}

export const MANUFACTURER_SPEC_SHEETS: ManufacturerSpecSheet[] = [
  // ── Owens Corning ──────────────────────────────────────────────────────────
  {
    manufacturer: "Owens Corning",
    productName: "FOAMULAR 150 XPS Insulation",
    category: "insulation",
    pdfUrl: "https://www.owenscorning.com/asset/foamular-150-xps-insulation-data-sheet.pdf",
    materialNameHints: ["foamular", "xps insulation", "extruded polystyrene"],
  },
  {
    manufacturer: "Owens Corning",
    productName: "EcoTouch PINK FIBERGLAS Insulation",
    category: "insulation",
    pdfUrl: "https://www.owenscorning.com/asset/ecotouch-pink-fiberglas-insulation-data-sheet.pdf",
    materialNameHints: ["fiberglass insulation", "batt insulation", "pink fiberglas"],
  },
  // ── USG ────────────────────────────────────────────────────────────────────
  {
    manufacturer: "USG",
    productName: "Sheetrock Brand Gypsum Panels",
    category: "gypsum",
    pdfUrl: "https://www.usg.com/content/dam/USG_Marketing_Communications/united_states/product_catalog/discontinued_products/sheetrock-brand-gypsum-panels-en-IG513.pdf",
    materialNameHints: ["gypsum board", "drywall", "sheetrock", "gypsum panel"],
  },
  {
    manufacturer: "USG",
    productName: "Durock Cement Board",
    category: "cement board",
    pdfUrl: "https://www.usg.com/content/dam/USG_Marketing_Communications/united_states/product_catalog/discontinued_products/durock-cement-board-en-IG1398.pdf",
    materialNameHints: ["cement board", "durock", "tile backer"],
  },
  // ── Armstrong ──────────────────────────────────────────────────────────────
  {
    manufacturer: "Armstrong",
    productName: "Ultima Mineral Fiber Ceiling",
    category: "ceiling tile",
    pdfUrl: "https://www.armstrongceilings.com/content/dam/armstrongceilings/technical-documents/product-data-sheets/ultima-mineral-fiber-ceiling-pds.pdf",
    materialNameHints: ["mineral fiber ceiling", "acoustic ceiling", "ceiling tile"],
  },
  // ── Georgia-Pacific ────────────────────────────────────────────────────────
  {
    manufacturer: "Georgia-Pacific",
    productName: "DensGlass Gold Exterior Sheathing",
    category: "sheathing",
    pdfUrl: "https://buildgp.com/content/dam/buildgp/en_US/documents/technical-documents/densglass-gold-exterior-sheathing-data-sheet.pdf",
    materialNameHints: ["densglass", "exterior sheathing", "glass mat sheathing"],
  },
  {
    manufacturer: "Georgia-Pacific",
    productName: "DensArmor Plus Interior Panel",
    category: "interior panel",
    pdfUrl: "https://buildgp.com/content/dam/buildgp/en_US/documents/technical-documents/densarmor-plus-interior-panel-data-sheet.pdf",
    materialNameHints: ["densarmor", "interior panel", "moisture resistant drywall"],
  },
  // ── Knauf ──────────────────────────────────────────────────────────────────
  {
    manufacturer: "Knauf",
    productName: "EcoBatt Insulation",
    category: "insulation",
    pdfUrl: "https://www.knaufinsulation.us/sites/us.knaufinsulation.com/files/2021-01/ecobatt-insulation-data-sheet.pdf",
    materialNameHints: ["ecobatt", "glass mineral wool", "knauf insulation"],
  },
  // ── Saint-Gobain / CertainTeed ─────────────────────────────────────────────
  {
    manufacturer: "CertainTeed",
    productName: "MemBrain Smart Vapor Retarder",
    category: "vapor barrier",
    pdfUrl: "https://www.certainteed.com/content/dam/certainteed/resources/datasheets/ct-membrain-smart-vapor-retarder-data-sheet.pdf",
    materialNameHints: ["vapor retarder", "vapor barrier", "membrain"],
  },
  {
    manufacturer: "CertainTeed",
    productName: "SilentFX QuickCut Gypsum Board",
    category: "acoustic gypsum",
    pdfUrl: "https://www.certainteed.com/content/dam/certainteed/resources/datasheets/ct-silentfx-quickcut-data-sheet.pdf",
    materialNameHints: ["silentfx", "acoustic gypsum", "sound dampening drywall"],
  },
];

// ─── Spec Extraction Types ─────────────────────────────────────────────────────

export interface ExtractedSpecs {
  // Fire & Life Safety
  fireRating?: string;
  fireRatingStandard?: string;
  flamespreadIndex?: number;
  smokeDevelopedIndex?: number;
  ulListed?: boolean;
  iccEsReport?: string;

  // Structural
  compressiveStrengthPsi?: number;
  tensileStrengthPsi?: number;
  flexuralStrengthPsi?: number;
  modulusOfElasticityKsi?: number;

  // Thermal & Moisture
  rValuePerInch?: number;
  lttrValue?: number;
  thermalUValue?: number;
  permRating?: number;

  // Acoustic
  stcRating?: number;
  iicRating?: number;
  nrcRating?: number;

  // Installability
  weightPerUnit?: number;
  weightUnit?: string;
  cureTimeHours?: number;
  warrantyYears?: number;
  installationDifficulty?: number;

  // Metadata
  astmStandards?: string[];
  dataConfidence: "HIGH" | "MEDIUM" | "LOW";
  rawTextSample?: string;
}

// ─── Regex Patterns for Spec Extraction ───────────────────────────────────────

const PATTERNS = {
  // Fire ratings: "1-hour", "2 hr", "Class A", "Type X"
  fireRating: /(?:fire\s*(?:rating|resistance|rated?)\s*[:\-]?\s*)(\d+[\s\-]?(?:hour|hr|min(?:ute)?s?)|Class\s*[ABC]|Type\s*[XVIC]+)/gi,
  fireRatingClass: /(?:flame\s*spread\s*class|fire\s*class)\s*[:\-]?\s*(Class\s*[ABC]|[ABC])/gi,

  // Flame spread index: "FSI: 25", "Flame Spread Index = 25", "FSI ≤ 25"
  flamespread: /(?:flame\s*spread\s*(?:index)?|FSI)\s*[:\-=≤<]?\s*(\d+)/gi,

  // Smoke developed: "SDI: 450", "Smoke Developed Index = 450"
  smokeDeveloped: /(?:smoke\s*developed\s*(?:index)?|SDI)\s*[:\-=≤<]?\s*(\d+)/gi,

  // R-value: "R-19", "R-Value: 19", "R = 19 per inch", "RSI 3.3"
  // Negative lookahead prevents matching ICC-ES report numbers (ESR-1234)
  rValue: /(?:R[\s\-]value|R[\s\-]val|^R[\s\-]?\d)\s*[:\-=]?\s*(\d+(?:\.\d+)?)(?!\d{3,})/gim,
  rValuePerInch: /(?:R[\s\-]?(?:value|val)?)\s*[:\-=]?\s*(\d+(?:\.\d+)?)\s*per\s*inch/gi,

  // Compressive strength: "Compressive Strength: 25 psi", "25 PSI min"
  compressive: /(?:compressive\s*strength)\s*[:\-]?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:psi|kPa|MPa)/gi,

  // Tensile strength
  tensile: /(?:tensile\s*strength)\s*[:\-]?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:psi|kPa|MPa)/gi,

  // Flexural strength
  flexural: /(?:flexural\s*(?:strength|modulus))\s*[:\-]?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:psi|kPa|MPa)/gi,

  // Modulus of elasticity
  modulus: /(?:modulus\s*of\s*elasticity|elastic\s*modulus|E\s*=)\s*[:\-]?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:ksi|psi|GPa|MPa)/gi,

  // Perm rating: "0.1 perm", "Permeance: 0.1"
  perm: /(?:perm(?:eance)?(?:\s*rating)?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:perm|ng\/|grain)/gi,

  // STC: "STC 52", "Sound Transmission Class: 52"
  stc: /(?:STC|sound\s*transmission\s*class)\s*[:\-]?\s*(\d+)/gi,

  // IIC: "IIC 51"
  iic: /(?:IIC|impact\s*insulation\s*class)\s*[:\-]?\s*(\d+)/gi,

  // NRC: "NRC 0.70", "Noise Reduction Coefficient: 0.70"
  nrc: /(?:NRC|noise\s*reduction\s*coefficient)\s*[:\-]?\s*(0\.\d+|\d+(?:\.\d+)?)/gi,

  // Weight: "2.5 lbs/sq ft", "Weight: 2.5 lb/ft²"
  weight: /(?:weight|mass)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg|lb)\s*(?:per|\/)\s*(?:sq(?:uare)?\s*)?(?:ft|foot|feet|m²|m2)/gi,

  // Cure time: "Cure Time: 24 hours", "Full cure: 7 days"
  cureTime: /(?:cure\s*time|curing\s*time|full\s*cure)\s*[:\-]?\s*(\d+)\s*(?:hours?|hrs?|days?)/gi,

  // Warranty: "Limited Lifetime Warranty", "25-year warranty", "Warranty: 20 years"
  warranty: /(?:(\d+)[\s\-]?(?:year|yr)s?\s*(?:limited\s*)?warranty|warranty\s*[:\-]?\s*(\d+)\s*(?:year|yr)s?|lifetime\s*warranty)/gi,

  // ASTM standards: "ASTM C578", "ASTM E84"
  astm: /ASTM\s+[A-Z]\d+(?:\/[A-Z]\d+)?/gi,

  // UL Listed
  ulListed: /UL\s*(?:listed|classified|approved|certified)/gi,

  // ICC-ES Report
  iccEs: /ICC[\s\-]?ES\s*(?:Report|ESR)[\s\-]?(?:No\.?\s*)?(\d+)/gi,
};

// ─── Text Extraction Helper ────────────────────────────────────────────────────

function extractFirstMatch(text: string, pattern: RegExp): string | null {
  pattern.lastIndex = 0;
  const match = pattern.exec(text);
  return match ? (match[1] || match[0]).trim() : null;
}

function extractAllMatches(text: string, pattern: RegExp): string[] {
  pattern.lastIndex = 0;
  const results: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    results.push((match[1] || match[0]).trim());
  }
  return [...new Set(results)]; // deduplicate
}

function parseNumber(str: string | null): number | undefined {
  if (!str) return undefined;
  const cleaned = str.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

// ─── Core Spec Extraction from Text ───────────────────────────────────────────

export function extractSpecsFromText(text: string): ExtractedSpecs {
  const specs: ExtractedSpecs = { dataConfidence: "LOW" };
  let fieldsFound = 0;

  // Fire rating
  const fireRatingMatch = extractFirstMatch(text, PATTERNS.fireRating);
  if (fireRatingMatch) { specs.fireRating = fireRatingMatch; fieldsFound++; }

  const fireClassMatch = extractFirstMatch(text, PATTERNS.fireRatingClass);
  if (fireClassMatch && !specs.fireRating) { specs.fireRating = fireClassMatch; fieldsFound++; }

  // Flame spread
  const fsiMatch = extractFirstMatch(text, PATTERNS.flamespread);
  const fsiNum = parseNumber(fsiMatch);
  if (fsiNum !== undefined) { specs.flamespreadIndex = fsiNum; fieldsFound++; }

  // Smoke developed
  const sdiMatch = extractFirstMatch(text, PATTERNS.smokeDeveloped);
  const sdiNum = parseNumber(sdiMatch);
  if (sdiNum !== undefined) { specs.smokeDevelopedIndex = sdiNum; fieldsFound++; }

  // R-value per inch (more specific first)
  const rPerInchMatch = extractFirstMatch(text, PATTERNS.rValuePerInch);
  if (rPerInchMatch) {
    specs.rValuePerInch = parseNumber(rPerInchMatch);
    fieldsFound++;
  } else {
    const rMatch = extractFirstMatch(text, PATTERNS.rValue);
    if (rMatch) { specs.rValuePerInch = parseNumber(rMatch); fieldsFound++; }
  }

  // Compressive strength
  const compMatch = extractFirstMatch(text, PATTERNS.compressive);
  if (compMatch) { specs.compressiveStrengthPsi = parseNumber(compMatch); fieldsFound++; }

  // Tensile strength
  const tensMatch = extractFirstMatch(text, PATTERNS.tensile);
  if (tensMatch) { specs.tensileStrengthPsi = parseNumber(tensMatch); fieldsFound++; }

  // Flexural strength
  const flexMatch = extractFirstMatch(text, PATTERNS.flexural);
  if (flexMatch) { specs.flexuralStrengthPsi = parseNumber(flexMatch); fieldsFound++; }

  // Modulus of elasticity
  const modMatch = extractFirstMatch(text, PATTERNS.modulus);
  if (modMatch) { specs.modulusOfElasticityKsi = parseNumber(modMatch); fieldsFound++; }

  // Perm rating
  const permMatch = extractFirstMatch(text, PATTERNS.perm);
  if (permMatch) { specs.permRating = parseNumber(permMatch); fieldsFound++; }

  // STC
  const stcMatch = extractFirstMatch(text, PATTERNS.stc);
  if (stcMatch) { specs.stcRating = parseNumber(stcMatch); fieldsFound++; }

  // IIC
  const iicMatch = extractFirstMatch(text, PATTERNS.iic);
  if (iicMatch) { specs.iicRating = parseNumber(iicMatch); fieldsFound++; }

  // NRC
  const nrcMatch = extractFirstMatch(text, PATTERNS.nrc);
  if (nrcMatch) { specs.nrcRating = parseNumber(nrcMatch); fieldsFound++; }

  // Weight
  const weightMatch = extractFirstMatch(text, PATTERNS.weight);
  if (weightMatch) {
    specs.weightPerUnit = parseNumber(weightMatch);
    specs.weightUnit = "lbs/sqft";
    fieldsFound++;
  }

  // Cure time (convert days to hours if needed)
  const cureMatch = extractFirstMatch(text, PATTERNS.cureTime);
  if (cureMatch) {
    const cureNum = parseNumber(cureMatch);
    if (cureNum !== undefined) {
      // If the match contained "day", multiply by 24
      const fullMatch = extractFirstMatch(text, /(?:cure\s*time|curing\s*time|full\s*cure)\s*[:\-]?\s*(\d+)\s*(hours?|hrs?|days?)/gi);
      specs.cureTimeHours = fullMatch?.includes("day") ? cureNum * 24 : cureNum;
      fieldsFound++;
    }
  }

  // Warranty
  const warrantyText = text.match(PATTERNS.warranty);
  if (warrantyText) {
    if (warrantyText[0].toLowerCase().includes("lifetime")) {
      specs.warrantyYears = 99;
    } else {
      const yearMatch = warrantyText[0].match(/(\d+)/);
      if (yearMatch) specs.warrantyYears = parseInt(yearMatch[1]);
    }
    fieldsFound++;
  }

  // ASTM standards
  specs.astmStandards = extractAllMatches(text, PATTERNS.astm);

  // UL Listed
  PATTERNS.ulListed.lastIndex = 0;
  specs.ulListed = PATTERNS.ulListed.test(text);
  if (specs.ulListed) fieldsFound++;

  // ICC-ES Report
  const iccEsMatch = extractFirstMatch(text, PATTERNS.iccEs);
  if (iccEsMatch) { specs.iccEsReport = `ESR-${iccEsMatch}`; fieldsFound++; }

  // Fire rating standard (infer from ASTM standards found)
  if (specs.astmStandards?.includes("ASTM E84")) {
    specs.fireRatingStandard = "ASTM E84";
  } else if (specs.astmStandards?.some(s => s.includes("E119"))) {
    specs.fireRatingStandard = "ASTM E119";
  }

  // Installation difficulty heuristic based on category keywords
  if (text.match(/spray\s*(?:applied|foam|on)|field\s*applied|requires\s*professional/i)) {
    specs.installationDifficulty = 4;
  } else if (text.match(/adhesive|mortar|mechanical\s*fastener/i)) {
    specs.installationDifficulty = 3;
  } else if (text.match(/friction\s*fit|press\s*fit|snap\s*in/i)) {
    specs.installationDifficulty = 2;
  }

  // Data confidence
  if (fieldsFound >= 6) specs.dataConfidence = "HIGH";
  else if (fieldsFound >= 3) specs.dataConfidence = "MEDIUM";
  else specs.dataConfidence = "LOW";

  // Raw text sample for debugging
  specs.rawTextSample = text.substring(0, 500);

  return specs;
}

// ─── Azure Document Intelligence PDF Analyzer ─────────────────────────────────

async function analyzePdfWithDocumentIntelligence(pdfUrl: string): Promise<string> {
  const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT ||
    "https://greenchainz-content-intel.cognitiveservices.azure.com/";
  const key = process.env.DOCUMENT_INTELLIGENCE_KEY;

  if (!key) {
    throw new Error("DOCUMENT_INTELLIGENCE_KEY not set in environment");
  }

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

  console.log(`[PDF Ingestion] Analyzing: ${pdfUrl}`);
  const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-read", pdfUrl);
  const result = await poller.pollUntilDone();

  if (!result.content) {
    throw new Error("Document Intelligence returned no content");
  }

  return result.content;
}

// ─── Fallback: Direct HTTP fetch + text extraction ────────────────────────────
// Used when PDF URL is accessible but DI quota is exhausted

async function fetchPdfTextFallback(pdfUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "GreenChainz-DataPipeline/1.0" },
    });
    // Return raw buffer as string for regex parsing (works for text-based PDFs)
    const buffer = Buffer.from(response.data);
    const text = buffer.toString("latin1");
    // Extract readable text between stream markers
    const textChunks: string[] = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null) {
      const chunk = match[1].replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
      if (chunk.length > 50) textChunks.push(chunk);
    }
    return textChunks.join("\n");
  } catch {
    return null;
  }
}

// ─── Material Matching ────────────────────────────────────────────────────────

async function findMatchingMaterialIds(
  sheet: ManufacturerSpecSheet,
  db: Awaited<ReturnType<typeof getDb>>
): Promise<number[]> {
  if (!db) return [];

  const conditions = sheet.materialNameHints.map(hint =>
    ilike(materials.name, `%${hint}%`)
  );

  const matches = await db
    .select({ id: materials.id, name: materials.name })
    .from(materials)
    .where(or(...conditions))
    .limit(20);

  return matches.map(m => m.id);
}

// ─── DB Upsert ────────────────────────────────────────────────────────────────

async function upsertTechnicalSpecs(
  materialId: number,
  specs: ExtractedSpecs,
  sheet: ManufacturerSpecSheet,
  db: Awaited<ReturnType<typeof getDb>>
): Promise<void> {
  if (!db) return;

  const existing = await db
    .select({ id: materialTechnicalSpecs.id })
    .from(materialTechnicalSpecs)
    .where(eq(materialTechnicalSpecs.materialId, materialId))
    .limit(1);

  const specData = {
    materialId,
    fireRating: specs.fireRating ?? null,
    fireRatingStandard: specs.fireRatingStandard ?? null,
    flamespreadIndex: specs.flamespreadIndex ?? null,
    smokeDevelopedIndex: specs.smokeDevelopedIndex ?? null,
    compressiveStrengthPsi: specs.compressiveStrengthPsi ?? null,
    modulusOfElasticityKsi: specs.modulusOfElasticityKsi ?? null,
    flexuralStrengthPsi: specs.flexuralStrengthPsi ?? null,
    tensileStrengthPsi: specs.tensileStrengthPsi ?? null,
    rValuePerInch: specs.rValuePerInch?.toString() ?? null,
    lttrValue: specs.lttrValue?.toString() ?? null,
    thermalUValue: specs.thermalUValue?.toString() ?? null,
    permRating: specs.permRating?.toString() ?? null,
    stcRating: specs.stcRating ?? null,
    iicRating: specs.iicRating ?? null,
    nrcRating: specs.nrcRating?.toString() ?? null,
    weightPerUnit: specs.weightPerUnit?.toString() ?? null,
    weightUnit: specs.weightUnit ?? null,
    cureTimeHours: specs.cureTimeHours ?? null,
    installationDifficulty: specs.installationDifficulty ?? null,
    warrantyYears: specs.warrantyYears ?? null,
    astmStandards: specs.astmStandards?.join(", ") ?? null,
    ulListed: specs.ulListed ?? false,
    iccEsReport: specs.iccEsReport ?? null,
    dataSource: `manufacturer-pdf:${sheet.manufacturer}`,
    dataConfidence: specs.dataConfidence,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(materialTechnicalSpecs)
      .set(specData)
      .where(eq(materialTechnicalSpecs.materialId, materialId));
  } else {
    await db.insert(materialTechnicalSpecs).values({
      ...specData,
      createdAt: new Date(),
    });
  }
}

// ─── Main Pipeline Runner ──────────────────────────────────────────────────────

export interface IngestionResult {
  sheet: string;
  manufacturer: string;
  status: "success" | "no_match" | "error" | "low_confidence";
  materialsUpdated: number;
  specsExtracted: number;
  dataConfidence: string;
  error?: string;
}

export async function runManufacturerPdfIngestion(
  options: {
    manufacturers?: string[];  // Filter to specific manufacturers
    dryRun?: boolean;          // Extract but don't write to DB
    useFallback?: boolean;     // Use HTTP fallback instead of DI
  } = {}
): Promise<IngestionResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sheets = options.manufacturers
    ? MANUFACTURER_SPEC_SHEETS.filter(s =>
        options.manufacturers!.some(m =>
          s.manufacturer.toLowerCase().includes(m.toLowerCase())
        )
      )
    : MANUFACTURER_SPEC_SHEETS;

  const results: IngestionResult[] = [];

  for (const sheet of sheets) {
    console.log(`\n[PDF Ingestion] Processing: ${sheet.manufacturer} — ${sheet.productName}`);

    try {
      // Step 1: Extract text from PDF
      let text: string | null = null;

      if (!options.useFallback) {
        try {
          text = await analyzePdfWithDocumentIntelligence(sheet.pdfUrl);
        } catch (diErr: any) {
          console.warn(`[PDF Ingestion] DI failed for ${sheet.productName}: ${diErr.message}. Trying fallback...`);
          text = await fetchPdfTextFallback(sheet.pdfUrl);
        }
      } else {
        text = await fetchPdfTextFallback(sheet.pdfUrl);
      }

      if (!text || text.length < 100) {
        results.push({
          sheet: sheet.productName,
          manufacturer: sheet.manufacturer,
          status: "error",
          materialsUpdated: 0,
          specsExtracted: 0,
          dataConfidence: "LOW",
          error: "Could not extract text from PDF",
        });
        continue;
      }

      // Step 2: Extract specs from text
      const specs = extractSpecsFromText(text);
      const specCount = Object.entries(specs).filter(
        ([k, v]) => v !== undefined && v !== null && k !== "dataConfidence" && k !== "rawTextSample"
      ).length;

      console.log(`[PDF Ingestion] Extracted ${specCount} spec fields (confidence: ${specs.dataConfidence})`);

      if (specs.dataConfidence === "LOW" && specCount < 2) {
        results.push({
          sheet: sheet.productName,
          manufacturer: sheet.manufacturer,
          status: "low_confidence",
          materialsUpdated: 0,
          specsExtracted: specCount,
          dataConfidence: specs.dataConfidence,
          error: "Insufficient spec data extracted from PDF",
        });
        continue;
      }

      // Step 3: Find matching materials in DB
      const materialIds = await findMatchingMaterialIds(sheet, db);

      if (materialIds.length === 0) {
        console.log(`[PDF Ingestion] No matching materials found for: ${sheet.productName}`);
        results.push({
          sheet: sheet.productName,
          manufacturer: sheet.manufacturer,
          status: "no_match",
          materialsUpdated: 0,
          specsExtracted: specCount,
          dataConfidence: specs.dataConfidence,
        });
        continue;
      }

      // Step 4: Upsert specs for each matched material
      if (!options.dryRun) {
        for (const materialId of materialIds) {
          await upsertTechnicalSpecs(materialId, specs, sheet, db);
        }
      }

      console.log(`[PDF Ingestion] Updated ${materialIds.length} materials for: ${sheet.productName}`);
      results.push({
        sheet: sheet.productName,
        manufacturer: sheet.manufacturer,
        status: "success",
        materialsUpdated: materialIds.length,
        specsExtracted: specCount,
        dataConfidence: specs.dataConfidence,
      });

    } catch (err: any) {
      console.error(`[PDF Ingestion] Error processing ${sheet.productName}:`, err.message);
      results.push({
        sheet: sheet.productName,
        manufacturer: sheet.manufacturer,
        status: "error",
        materialsUpdated: 0,
        specsExtracted: 0,
        dataConfidence: "LOW",
        error: err.message,
      });
    }
  }

  const successCount = results.filter(r => r.status === "success").length;
  const totalUpdated = results.reduce((sum, r) => sum + r.materialsUpdated, 0);
  console.log(`\n[PDF Ingestion] Complete: ${successCount}/${sheets.length} sheets processed, ${totalUpdated} materials updated`);

  return results;
}
