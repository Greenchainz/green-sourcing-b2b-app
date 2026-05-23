/**
 * Architect Spec Parser
 *
 * Ingests an architect-uploaded PDF/Excel "Embodied Carbon Tables" spec
 * (the document Jerit's architect contact gave us as ground truth),
 * extracts each assembly row via Azure Document Intelligence, normalizes
 * GWP units to kgCO2e per 1000 SF façade, persists structured rows, and
 * triggers the near-match algorithm to find sustainable alternatives in
 * the GreenChainz EPD database.
 *
 * Pipeline:
 *   PDF upload → Azure Doc Intel → row classification → unit normalization
 *               → architect_uploaded_specs + architect_spec_assemblies
 *               → near-match → generated_rfqs (PDF/Excel/Revit/Intercom)
 *
 * Algorithm reference: GreenChainz Material Matching Algorithm Specification
 *   §2.3 Normalization Requirements
 *   §4.1 Near-Match Algorithm (5 steps)
 *   §6.2 Data Cleaning Pipeline (Azure Doc Intel)
 */

import { getDb } from "../db";
import {
  architectUploadedSpecs,
  architectSpecAssemblies,
  type InsertArchitectUploadedSpec,
  type InsertArchitectSpecAssembly,
} from "../../drizzle/schema-additions-mcs";
import { getDocumentTablesFromAzure, type NormalizedTable } from "../../lib/azure/document-intelligence";
import { eq } from "drizzle-orm";

// ─── Format-specific parsers ─────────────────────────────────────────────────

/**
 * Parse a flat CSV buffer into the normalized table format.
 * Row 0 = headers, rows 1-N = data.
 */
function parseCsvToTables(fileBuffer: Buffer): NormalizedTable[] {
  const lines = fileBuffer.toString("utf-8").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: { cells: { header: string; text: string }[] }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const cells = headers.map((header, idx) => ({ header, text: values[idx] ?? "" }));
    if (cells.some((c) => c.text !== "")) rows.push({ cells });
  }

  return rows.length > 0 ? [{ rows }] : [];
}

/**
 * Parse an .xlsx / .xls buffer using ExcelJS and return the same normalized
 * table structure that Azure Document Intelligence produces.
 */
async function parseExcelToTables(fileBuffer: Buffer): Promise<NormalizedTable[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  // ExcelJS accepts Buffer at runtime; this cast only bridges the current TS typing drift.
  await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

  const tables: NormalizedTable[] = [];

  workbook.eachSheet((sheet) => {
    const headers: string[] = [];
    const rows: { cells: { header: string; text: string }[] }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value ?? `col_${colNumber}`).trim();
        });
        return;
      }
      const cells: { header: string; text: string }[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1] ?? `col_${colNumber}`;
        const raw = cell.value;
        const text =
          raw instanceof Date
            ? raw.toISOString().split("T")[0]
            : String(raw ?? "").trim();
        cells.push({ header, text });
      });
      if (cells.some((c) => c.text !== "")) rows.push({ cells });
    });

    if (rows.length > 0) tables.push({ rows });
  });

  return tables;
}

function resolveParser(
  mimeType: string | undefined,
  filename: string,
): "csv" | "excel" | "azure" {
  const mime = (mimeType ?? "").toLowerCase();
  const ext  = filename.split(".").pop()?.toLowerCase() ?? "";

  if (mime === "text/csv" || ext === "csv") return "csv";
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) return "excel";
  return "azure"; // PDF and everything else → Azure Document Intelligence
}

// ─── Constants from the architect's actual spec ──────────────────────────────

/** Assembly codes recognized in the Embodied Carbon Tables. */
const ASSEMBLY_CODE_PATTERN = /\b(EWS-?\d+[A-Z]?)\b/i;

/** Map from raw text in the architect's spec → canonical assembly type. */
const ASSEMBLY_TYPE_MAP: Record<string, string> = {
  "EWS-1A": "Unitized Curtain Wall (Vision/Shadow/Spandrel)",
  "EWS-1B": "Unitized Vision Fitted",
  "EWS-2A": "Granite Panel",
  "EWS-2B": "Natural Stone (Limestone/Sandstone)",
  "EWS-3A": "Terracotta",
  "EWS-3B": "UHPC",
  "EWS-3C": "GFRC",
  "EWS-5":  "Aluminum Metal Panel",
};

/** Structural sub-options (impact embodied carbon dramatically). */
const STRUCTURAL_OPTIONS: Record<number, string> = {
  1: "CFMF Steel Studs (6\"-16\" OC)",
  2: "Mega Panel (HSS)",
  3: "Unitized Aluminum Framing",
};

/** MSF normalization factors per spec §2.3 (1000 SF facade = 92.903 m²). */
const SF_PER_M2 = 10.7639;
const SF_PER_1000 = 1000;

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParseResult {
  specId: number;
  totalAssemblies: number;
  assemblies: Array<{
    id: number;
    assemblyCode: string | null;
    assemblyType: string | null;
    structuralOption: number | null;
    gwpPer1000sf: number | null;
  }>;
  warnings: string[];
}

/**
 * Parse an architect-uploaded spec PDF/XLSX. Persists everything in
 * architect_uploaded_specs + architect_spec_assemblies. Returns the spec ID
 * and parsed rows so the caller can kick off the matcher.
 */
export async function parseArchitectSpec(opts: {
  architectId: number;
  fileBuffer: Buffer;
  originalFilename: string;
  blobUrl?: string;
  mimeType?: string;
  projectName?: string;
  projectLocation?: string;
  estimatedValue?: number;
}): Promise<ParseResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 1. Create the parent spec row in `pending` state.
  const insertSpec: InsertArchitectUploadedSpec = {
    architectId: opts.architectId,
    originalFilename: opts.originalFilename,
    blobUrl: opts.blobUrl ?? "",
    mimeType: opts.mimeType ?? "application/pdf",
    fileSizeBytes: opts.fileBuffer.length,
    parseStatus: "processing",
    parseStartedAt: new Date(),
    projectName: opts.projectName,
    projectLocation: opts.projectLocation,
    estimatedValue: opts.estimatedValue?.toString(),
  };

  const [specRow] = await db
    .insert(architectUploadedSpecs)
    .values(insertSpec)
    .returning({ id: architectUploadedSpecs.id });

  const specId = specRow.id;
  const warnings: string[] = [];

  try {
    // 2. Extract tables using the right parser for this file type.
    const parserType = resolveParser(opts.mimeType, opts.originalFilename);
    let tables: NormalizedTable[];

    if (parserType === "csv") {
      tables = parseCsvToTables(opts.fileBuffer);
    } else if (parserType === "excel") {
      tables = await parseExcelToTables(opts.fileBuffer);
    } else {
      tables = await getDocumentTablesFromAzure(opts.fileBuffer);
    }

    if (tables.length === 0) {
      const hint =
        parserType === "excel"
          ? "No data rows found in the Excel workbook — ensure the first row contains column headers."
          : parserType === "csv"
          ? "No data rows found in the CSV."
          : "Azure Document Intelligence returned no tables.";
      warnings.push(hint);
    }

    // 3. Classify + normalize every row.
    const rows: InsertArchitectSpecAssembly[] = [];
    let lineNumber = 0;

    for (const table of tables) {
      for (const row of table.rows) {
        lineNumber += 1;
        const parsed = classifyRow(row.cells, lineNumber);
        if (!parsed) continue;
        rows.push({ ...parsed, specId });
      }
    }

    if (rows.length === 0) {
      warnings.push("No assembly rows recognized — check column headers match Embodied Carbon Tables format.");
    }

    // 4. Persist in one batch; capture inserted IDs for the matcher.
    let inserted: Array<{ id: number; assemblyCode: string | null; assemblyType: string | null; structuralOption: number | null; gwpPer1000sf: string | null }> = [];
    if (rows.length > 0) {
      inserted = await db
        .insert(architectSpecAssemblies)
        .values(rows)
        .returning({
          id: architectSpecAssemblies.id,
          assemblyCode: architectSpecAssemblies.assemblyCode,
          assemblyType: architectSpecAssemblies.assemblyType,
          structuralOption: architectSpecAssemblies.structuralOption,
          gwpPer1000sf: architectSpecAssemblies.gwpPer1000sf,
        });
    }

    // 5. Mark spec ready.
    await db
      .update(architectUploadedSpecs)
      .set({
        parseStatus: "ready",
        parseCompletedAt: new Date(),
        totalAssemblies: inserted.length,
        rawExtraction: { tables, warnings } as object,
      })
      .where(eq(architectUploadedSpecs.id, specId));

    return {
      specId,
      totalAssemblies: inserted.length,
      assemblies: inserted.map((r) => ({
        id: r.id,
        assemblyCode: r.assemblyCode,
        assemblyType: r.assemblyType,
        structuralOption: r.structuralOption,
        gwpPer1000sf: r.gwpPer1000sf == null ? null : parseFloat(r.gwpPer1000sf),
      })),
      warnings,
    };
  } catch (err) {
    // Mark failed and re-throw so caller can surface to user.
    await db
      .update(architectUploadedSpecs)
      .set({
        parseStatus: "failed",
        parseCompletedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(architectUploadedSpecs.id, specId));
    throw err;
  }
}

// ─── Row classification ──────────────────────────────────────────────────────

interface ClassifiedRow extends Omit<InsertArchitectSpecAssembly, "specId"> {}

/**
 * Classify a single table row from the Embodied Carbon Tables. Returns null if
 * the row is a header, blank, or doesn't contain enough data to be usable.
 */
function classifyRow(
  cells: { header: string; text: string }[],
  lineNumber: number,
): ClassifiedRow | null {
  if (cells.length === 0) return null;

  // Build a lookup keyed by lower-cased header.
  const get = (key: string): string | undefined => {
    const c = cells.find((cell) => cell.header?.toLowerCase().includes(key.toLowerCase()));
    return c?.text?.trim() || undefined;
  };

  // Most reliable signal: an explicit "EWS-…" code in any cell.
  const allText = cells.map((c) => c.text).join(" | ");
  const codeMatch = allText.match(ASSEMBLY_CODE_PATTERN);
  const assemblyCode = codeMatch ? codeMatch[1].toUpperCase().replace(/EWS(\d)/, "EWS-$1") : null;

  if (!assemblyCode) return null;  // skip rows without a recognizable assembly code

  const assemblyType = ASSEMBLY_TYPE_MAP[assemblyCode] ?? assemblyCode;
  const structuralOption = parseStructuralOption(allText);

  // GWP extraction — try column header match, fall back to numeric heuristic.
  const gwpRaw =
    parseFloatSafe(get("gwp")) ??
    parseFloatSafe(get("kgco2")) ??
    parseFloatSafe(get("embodied carbon"));

  const gwpUnit =
    detectGwpUnit(get("unit") ?? get("declared unit") ?? allText) ?? null;

  const declaredUnit = get("declared unit") ?? null;
  const msfFactor = parseFloatSafe(get("msf"));
  const gwpPer1000sf = normalizeToPer1000Sf(gwpRaw ?? null, gwpUnit, msfFactor);

  return {
    assemblyCode,
    assemblyType,
    structuralOption,
    declaredUnit,
    gwpValue: gwpRaw == null ? undefined : gwpRaw.toString(),
    gwpUnit: gwpUnit ?? undefined,
    gwpPer1000sf: gwpPer1000sf == null ? undefined : gwpPer1000sf.toString(),
    manufacturerHint: get("manufacturer") ?? get("supplier"),
    productHint: get("product") ?? get("material"),
    pageNumber: undefined,
    lineNumber,
    rawRow: Object.fromEntries(cells.map((c) => [c.header, c.text])) as Record<string, string>,
    matchedEpdMaterialId: undefined,
    matchConfidence: undefined,
  };
}

function parseStructuralOption(text: string): number | null {
  const m = text.match(/\boption\s*(\d)\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n in STRUCTURAL_OPTIONS) return n;
  }
  if (/CFMF|steel\s+stud/i.test(text)) return 1;
  if (/mega\s*panel|HSS/i.test(text)) return 2;
  if (/unitized\s+aluminum|aluminum\s+framing/i.test(text)) return 3;
  return null;
}

function parseFloatSafe(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[,\s]/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function detectGwpUnit(text: string | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("kg") && t.includes("kg")) {
    if (/per\s*kg|\/\s*kg/.test(t)) return "kgCO2e/kg";
    if (/per\s*m2|m2|\/m\^?2/.test(t)) return "kgCO2e/m2";
    if (/per\s*m3|m3|\/m\^?3/.test(t)) return "kgCO2e/m3";
    if (/1000\s*sf/.test(t)) return "kgCO2e/1000sf";
    return "kgCO2e";
  }
  return null;
}

/**
 * Normalize GWP to kgCO2e per 1000 SF façade per spec §2.3.
 * Returns null when normalization is not possible (missing MSF factor for /kg etc.).
 */
function normalizeToPer1000Sf(
  gwp: number | null,
  unit: string | null,
  msfFactor: number | null | undefined,
): number | null {
  if (gwp == null || unit == null) return gwp;

  switch (unit) {
    case "kgCO2e/1000sf":
      return gwp;
    case "kgCO2e/m2":
      // 1000 SF = 92.903 m²
      return gwp * (SF_PER_1000 / SF_PER_M2);
    case "kgCO2e/m3":
      // Need thickness — without it we can't normalize. Return null and let
      // downstream flag for human review.
      return msfFactor != null ? gwp * msfFactor : null;
    case "kgCO2e/kg":
      // Need MSF factor (kg per 1000 SF) to convert.
      return msfFactor != null ? gwp * msfFactor : null;
    default:
      return null;
  }
}
