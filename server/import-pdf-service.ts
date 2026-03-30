/**
 * PDF EPD Import Service
 *
 * Extracts EPD material data from uploaded PDF files using:
 * 1. pdfjs-dist  — PDF text extraction (position-aware)
 * 2. GPT-4o      — Structured material parsing via JSON mode
 * 3. Drizzle ORM — Upsert into materials table
 *
 * Endpoint: POST /api/admin/import-pdf-materials
 */

import { getDb } from "./db";
import { materials } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { chat } from "../lib/azure/openai";

// ─── PDF Text Extraction ────────────────────────────────────────────────────

export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  // pdfjs-dist legacy build (works in Node.js without canvas)
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  let allText = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Join items preserving rough layout — enough for GPT to parse
    const pageText = content.items
      .map((item: any) => item.str)
      .filter((s: string) => s.trim())
      .join(" ");
    allText += `\n\n[PAGE ${p}]\n${pageText}`;
  }
  return allText.trim();
}

// ─── GPT-4o Extraction ──────────────────────────────────────────────────────

export interface ExtractedMaterial {
  name: string;
  productName: string | null;
  manufacturer: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  epdNumber: string | null;
  epdProgramOperator: string | null;
  gwpValue: string | null;          // stored as string e.g. "166.0000"
  gwpUnit: string | null;           // e.g. "kgCO2e/kg"
  declaredUnit: string | null;
  hasEpd: boolean;
  usManufactured: boolean | null;
  dataSource: string;
  verified: boolean;
  // Extra fields we parse from the PDF
  _embodiedCarbonPer1000SF?: number | null;
  _assemblies?: string[];           // which assemblies this appears in
}

const SYSTEM_PROMPT = `You are a construction materials data extraction specialist.
You extract EPD (Environmental Product Declaration) material records from raw PDF text.

You will receive extracted text from an EPD table document. The text may be messy due to
multi-column PDF layout. Despite the messiness, the key data is present.

Return ONLY valid JSON — an array of material objects. Do not include any explanation text.
Extract every unique physical product that has an EPD number, even if the same product
appears multiple times across different assemblies (deduplicate by EPD number + product name).`;

const USER_PROMPT_TEMPLATE = (text: string, filename: string) => `
Extract all EPD material records from this PDF text. Filename: "${filename}"

PDF TEXT:
${text.slice(0, 12000)}

Return a JSON array where each object has these exact fields:
{
  "name": "short descriptive material name (e.g. 'Mineral Wool CI 4\\\"')",
  "productName": "exact product trade name from EPD (e.g. 'ROCKWOOL Stone wool Thermal Insulation')",
  "manufacturer": "manufacturer company name",
  "category": "ONE of: Concrete, Steel, Aluminum, Glass, Insulation, Gypsum Board, Masonry, Wood, Roofing, Flooring, Other",
  "subcategory": "specific subcategory (e.g. 'Curtainwall Framing', 'Mineral Wool', 'Stone Panel')",
  "description": "1-2 sentence description including key specs and EC per 1000SF if available",
  "epdNumber": "EPD ID / registration number exactly as shown",
  "epdProgramOperator": "program operator (e.g. 'Building Transparency (EC3)', 'SCS Global Services')",
  "gwpValue": "GWP number as string with 4 decimal places (e.g. '166.0000')",
  "gwpUnit": "GWP unit string (e.g. 'kgCO2e/kg', 'kgCO2e/m2')",
  "declaredUnit": "declared unit from EPD (e.g. '1 square meter', '1 metric ton')",
  "hasEpd": true,
  "usManufactured": true or false or null if unknown,
  "dataSource": "pdf-import",
  "verified": true,
  "embodiedCarbonPer1000SF": number or null (kgCO2e per 1000 SF facade, if shown in document)
}

Rules:
- Deduplicate: if the same EPD number appears in multiple assemblies, return it ONCE
- Skip header rows, total rows, and assembly name rows
- If a field is not found, use null
- gwpValue must be a string like "55.7000", not a number
- Return ONLY the JSON array, no other text
`;

export async function extractMaterialsWithAI(
  pdfText: string,
  filename: string
): Promise<ExtractedMaterial[]> {
  const response = await chat(
    [{ role: "user", content: USER_PROMPT_TEMPLATE(pdfText, filename) }],
    {
      systemMessage: SYSTEM_PROMPT,
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 8000,
    }
  );

  let parsed: any;
  try {
    parsed = JSON.parse(response.content);
  } catch {
    // Sometimes GPT wraps the array in an object
    const match = response.content.match(/\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`GPT returned invalid JSON: ${response.content.slice(0, 200)}`);
  }

  const arr: any[] = Array.isArray(parsed) ? parsed : parsed.materials || parsed.data || [];

  return arr.map((item: any) => ({
    name: item.name || item.productName || "Unknown",
    productName: item.productName || null,
    manufacturer: item.manufacturer || null,
    category: item.category || "Other",
    subcategory: item.subcategory || null,
    description: item.description || null,
    epdNumber: item.epdNumber || null,
    epdProgramOperator: item.epdProgramOperator || null,
    gwpValue: item.gwpValue ? String(item.gwpValue) : null,
    gwpUnit: item.gwpUnit || null,
    declaredUnit: item.declaredUnit || null,
    hasEpd: item.hasEpd ?? true,
    usManufactured: item.usManufactured ?? null,
    dataSource: "pdf-import",
    verified: true,
    _embodiedCarbonPer1000SF: item.embodiedCarbonPer1000SF ?? null,
    _assemblies: item.assemblies || [],
  }));
}

// ─── DB Upsert ──────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  materials: ExtractedMaterial[];
}

export async function importMaterialsToDB(
  extracted: ExtractedMaterial[],
  dryRun = false
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    materials: extracted,
  };

  if (dryRun) {
    result.success = true;
    result.created = extracted.length;
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.errors.push("Database connection failed");
    return result;
  }

  for (const mat of extracted) {
    try {
      // Build the DB row
      const row: Record<string, any> = {
        name: mat.name,
        productName: mat.productName,
        category: mat.category,
        subcategory: mat.subcategory,
        description: mat.description,
        epdNumber: mat.epdNumber,
        epdProgramOperator: mat.epdProgramOperator,
        gwpValue: mat.gwpValue,
        gwpUnit: mat.gwpUnit,
        declaredUnit: mat.declaredUnit,
        hasEpd: mat.hasEpd,
        usManufactured: mat.usManufactured,
        dataSource: mat.dataSource,
        verified: mat.verified,
        hasHpd: false,
        hasFsc: false,
        hasC2c: false,
        hasGreenguard: false,
        hasDeclare: false,
        updatedAt: new Date(),
      };

      // Check for existing by epdNumber
      if (mat.epdNumber) {
        const existing = await db
          .select({ id: materials.id })
          .from(materials)
          .where(eq(materials.epdNumber, mat.epdNumber))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(materials)
            .set(row)
            .where(eq(materials.epdNumber, mat.epdNumber));
          result.updated++;
          continue;
        }
      }

      await db.insert(materials).values(row as any);
      result.created++;
    } catch (err) {
      const msg = `Failed to import "${mat.name}": ${String(err)}`;
      console.error("[import-pdf]", msg);
      result.errors.push(msg);
    }
  }

  result.success = result.errors.length < extracted.length;
  return result;
}
