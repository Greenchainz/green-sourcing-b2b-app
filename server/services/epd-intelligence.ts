/**
 * EPD Intelligence — Supplier-Side PDF Auto-Fill
 * ─────────────────────────────────────────────────
 * Accepts a supplier's EPD, product sheet, or certification PDF and extracts
 * structured data to pre-fill their GreenChainz supplier profile.
 *
 * Pipeline:
 *   1. Azure Document Intelligence (prebuilt-layout) → raw text + KV pairs
 *   2. Azure OpenAI → structured ParsedEpdFields JSON
 *   3. Regex fallback if LLM fails
 *
 * Reuses the DI credential and LLM infrastructure from document-intelligence.ts.
 */

import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { DefaultAzureCredential } from "@azure/identity";

// ── Config ─────────────────────────────────────────────────────────────────────

const DI_ENDPOINT =
  process.env.DOCUMENT_INTELLIGENCE_ENDPOINT ??
  "https://greenchainz-content-intel.cognitiveservices.azure.com/";

const FOUNDRY_ENDPOINT =
  process.env.AZURE_AI_PROJECT_ENDPOINT ??
  "https://greenchainz-resource.services.ai.azure.com/api/projects/greenchainz";

const STRUCT_MODEL = process.env.AZURE_AI_RFQ_MODEL ?? "gpt-4o";
const API_VERSION  = "2024-12-01-preview";
const TIMEOUT_MS   = 15_000;

// ── Output type ────────────────────────────────────────────────────────────────

export interface ParsedEpdFields {
  /** Product/material name */
  productName:       string | null;
  /** Manufacturer / company name */
  manufacturer:      string | null;
  /** Material category (matches supplier profile dropdown) */
  category:          string | null;
  /** GWP — kgCO₂e/kg (modules A1–A3) */
  gwpA1A3:           number | null;
  /** GWP — kgCO₂e/kg including end-of-life (A1–C4) if declared */
  gwpA1C4:           number | null;
  /** EPD program operator (EPD International, UL, etc.) */
  epdProgram:        string | null;
  /** EPD registration / document number */
  epdNumber:         string | null;
  /** ISO 14025 or other declared standard */
  declaredStandard:  string | null;
  /** Declared unit (kg, m², m³, etc.) */
  declaredUnit:      string | null;
  /** EPD valid from date (ISO string or partial) */
  validFrom:         string | null;
  /** EPD valid to / expiry date */
  validTo:           string | null;
  /** Sustainability certifications mentioned (FSC, GreenGuard, Declare, etc.) */
  certifications:    string[];
  /** Recycled content percentage (post-consumer + pre-consumer combined) */
  recycledContentPct: number | null;
  /** Plant / facility location if stated */
  facilityLocation:  string | null;
  /** Confidence in overall extraction */
  confidence:        "HIGH" | "MEDIUM" | "LOW";
  /** Which fields were actually populated */
  fieldsFound:       string[];
}

const EMPTY_EPD: ParsedEpdFields = {
  productName: null, manufacturer: null, category: null,
  gwpA1A3: null, gwpA1C4: null,
  epdProgram: null, epdNumber: null, declaredStandard: null, declaredUnit: null,
  validFrom: null, validTo: null,
  certifications: [], recycledContentPct: null, facilityLocation: null,
  confidence: "LOW", fieldsFound: [],
};

// ── Credential helpers (mirrors document-intelligence.ts) ─────────────────────

let _credential: DefaultAzureCredential | null = null;
function azCredential() {
  if (!_credential) _credential = new DefaultAzureCredential();
  return _credential;
}

async function getAzureToken(): Promise<string> {
  const tok = await azCredential().getToken("https://cognitiveservices.azure.com/.default");
  if (!tok?.token) throw new Error("[epd-intel] Could not acquire Azure AD token");
  return tok.token;
}

function getAzureBase(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return "https://greenchainz-resource.services.ai.azure.com";
  }
}

// ── Stage 1: DI text extraction ────────────────────────────────────────────────

async function extractText(buffer: Buffer): Promise<string> {
  const key = process.env.DOCUMENT_INTELLIGENCE_KEY;
  if (!key) throw new Error("[epd-intel] DOCUMENT_INTELLIGENCE_KEY not configured");

  const client = new DocumentAnalysisClient(DI_ENDPOINT, new AzureKeyCredential(key));
  const poller = await client.beginAnalyzeDocument("prebuilt-layout", buffer as unknown as NodeJS.ReadableStream);
  const result = await poller.pollUntilDone();

  if (!result.content) throw new Error("[epd-intel] Document Intelligence returned no content");

  let text = result.content;
  if (result.keyValuePairs?.length) {
    const kvLines = result.keyValuePairs
      .filter(kv => kv.key?.content && kv.value?.content)
      .map(kv => `${kv.key!.content}: ${kv.value!.content}`)
      .slice(0, 60);
    if (kvLines.length) text += "\n\n=== Extracted Fields ===\n" + kvLines.join("\n");
  }

  console.log(`[epd-intel] DI extracted ${text.length} chars`);
  return text;
}

// ── Stage 2: LLM structuring ───────────────────────────────────────────────────

const EPD_SYSTEM_PROMPT = `You are an EPD (Environmental Product Declaration) analyst for GreenChainz, a sustainable building materials marketplace. Extract structured data from the uploaded EPD, product datasheet, or sustainability certificate to pre-fill a supplier's product profile.

Return ONLY valid JSON — no markdown, no preamble:
{
  "productName": "<product/material name or null>",
  "manufacturer": "<company / manufacturer name or null>",
  "category": "<one of: Concrete & Masonry, Steel & Metal, Timber & Wood, Insulation, Roofing, Flooring, Glazing & Windows, HVAC Systems, Electrical, Plumbing, Interior Finishes, Doors & Hardware, Cladding & Facades, Other — or null>",
  "gwpA1A3": <GWP kgCO2e/kg for modules A1-A3 as number or null>,
  "gwpA1C4": <GWP kgCO2e/kg for full lifecycle A1-C4 as number or null>,
  "epdProgram": "<program operator e.g. EPD International, UL Environment, NREL, Environdec or null>",
  "epdNumber": "<EPD registration or document number or null>",
  "declaredStandard": "<e.g. ISO 14025, EN 15804, ISO 21930 or null>",
  "declaredUnit": "<e.g. 1 kg, 1 m2, 1 m3, 1 tonne or null>",
  "validFrom": "<date string e.g. 2023-01-01 or null>",
  "validTo": "<date string e.g. 2028-01-01 or null>",
  "certifications": ["<list of certifications mentioned: FSC, GreenGuard, GreenGuard Gold, Declare, HPD, Cradle to Cradle, LEED, Living Building Challenge, ISO 14001, recycled content certified, etc.>"],
  "recycledContentPct": <total recycled content percentage as number or null>,
  "facilityLocation": "<plant/facility city, state/country or null>",
  "confidence": "<HIGH if ≥6 fields found, MEDIUM if 3-5, LOW if ≤2>",
  "fieldsFound": ["<list of field names that had data>"]
}`;

async function structureWithLlm(text: string): Promise<ParsedEpdFields | null> {
  try {
    const token   = await getAzureToken();
    const base    = getAzureBase(FOUNDRY_ENDPOINT);
    const url     = `${base}/openai/deployments/${STRUCT_MODEL}/chat/completions?api-version=${API_VERSION}`;
    const truncated = text.length > 10_000 ? text.substring(0, 10_000) + "\n[...truncated]" : text;

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        messages: [
          { role: "system", content: EPD_SYSTEM_PROMPT },
          { role: "user",   content: `EPD / product sheet text:\n\n${truncated}` },
        ],
        temperature:     0,
        max_tokens:      900,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[epd-intel] OpenAI ${res.status}: ${body}`);
    }

    const json    = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw     = json.choices[0]?.message?.content ?? "";
    const parsed  = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as Partial<ParsedEpdFields>;

    const result: ParsedEpdFields = {
      productName:       typeof parsed.productName       === "string"  ? parsed.productName       : null,
      manufacturer:      typeof parsed.manufacturer      === "string"  ? parsed.manufacturer      : null,
      category:          typeof parsed.category          === "string"  ? parsed.category          : null,
      gwpA1A3:           typeof parsed.gwpA1A3           === "number"  ? parsed.gwpA1A3           : null,
      gwpA1C4:           typeof parsed.gwpA1C4           === "number"  ? parsed.gwpA1C4           : null,
      epdProgram:        typeof parsed.epdProgram        === "string"  ? parsed.epdProgram        : null,
      epdNumber:         typeof parsed.epdNumber         === "string"  ? parsed.epdNumber         : null,
      declaredStandard:  typeof parsed.declaredStandard  === "string"  ? parsed.declaredStandard  : null,
      declaredUnit:      typeof parsed.declaredUnit      === "string"  ? parsed.declaredUnit      : null,
      validFrom:         typeof parsed.validFrom         === "string"  ? parsed.validFrom         : null,
      validTo:           typeof parsed.validTo           === "string"  ? parsed.validTo           : null,
      certifications:    Array.isArray(parsed.certifications)          ? parsed.certifications    : [],
      recycledContentPct:typeof parsed.recycledContentPct === "number" ? parsed.recycledContentPct: null,
      facilityLocation:  typeof parsed.facilityLocation  === "string"  ? parsed.facilityLocation  : null,
      confidence:        (["HIGH","MEDIUM","LOW"] as const).includes(parsed.confidence as "HIGH") ? parsed.confidence as "HIGH"|"MEDIUM"|"LOW" : "LOW",
      fieldsFound:       Array.isArray(parsed.fieldsFound)             ? parsed.fieldsFound       : [],
    };

    console.log(`[epd-intel] LLM extracted ${result.fieldsFound.length} fields (${result.confidence})`);
    return result;
  } catch (err) {
    console.error("[epd-intel] LLM structuring failed:", err);
    return null;
  }
}

// ── Stage 2 fallback: regex ────────────────────────────────────────────────────

function regexFallback(text: string): Partial<ParsedEpdFields> {
  const fields: Partial<ParsedEpdFields> = { fieldsFound: [], certifications: [] };

  // GWP A1-A3
  const gwpMatch = text.match(
    /(?:A1[-–]A3|cradle[\s-]*to[\s-]*gate)[^\d]*(\d+(?:\.\d+)?)\s*(?:kg\s*CO₂e?|kgCO₂e?)/i
  );
  if (gwpMatch) { fields.gwpA1A3 = parseFloat(gwpMatch[1]); fields.fieldsFound!.push("gwpA1A3"); }

  // EPD number
  const epdNumMatch = text.match(/EPD[\s-]*(?:number|no\.?|#|registration)[:\s]*([A-Z0-9/-]{5,30})/i);
  if (epdNumMatch) { fields.epdNumber = epdNumMatch[1].trim(); fields.fieldsFound!.push("epdNumber"); }

  // Valid dates
  const dateMatches = [...text.matchAll(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/g)];
  if (dateMatches.length >= 2) {
    fields.validFrom = dateMatches[0][1]; fields.validTo = dateMatches[1][1];
    fields.fieldsFound!.push("validFrom", "validTo");
  }

  // Certifications
  const certKw = ["FSC","GreenGuard Gold","GreenGuard","Declare","HPD","Cradle to Cradle","LEED","Living Building Challenge","ISO 14001"];
  fields.certifications = certKw.filter(c => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(text));
  if (fields.certifications.length) fields.fieldsFound!.push("certifications");

  // Recycled content
  const rcMatch = text.match(/(?:recycled|post[\s-]*consumer|pre[\s-]*consumer)[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  if (rcMatch) { fields.recycledContentPct = parseFloat(rcMatch[1]); fields.fieldsFound!.push("recycledContentPct"); }

  return fields;
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Parse an EPD or product sheet PDF buffer into structured supplier profile fields.
 * Never throws — returns a low-confidence empty result on failure.
 */
export async function parseEpdPdf(buffer: Buffer): Promise<ParsedEpdFields> {
  if (!buffer || buffer.length === 0) return EMPTY_EPD;

  const pipeline = async (): Promise<ParsedEpdFields> => {
    let text: string;
    let usedDi = true;

    try {
      text = await extractText(buffer);
    } catch (err) {
      console.warn("[epd-intel] DI failed, using buffer text fallback:", err);
      usedDi = false;
      text = buffer.toString("utf-8");
    }

    if (!text || text.length < 30) return EMPTY_EPD;

    if (usedDi) {
      const llmResult = await structureWithLlm(text);
      if (llmResult && llmResult.fieldsFound.length > 0) return llmResult;
    }

    console.log("[epd-intel] Falling back to regex");
    const rx = regexFallback(text);
    return {
      ...EMPTY_EPD,
      ...rx,
      confidence: (rx.fieldsFound?.length ?? 0) >= 4 ? "MEDIUM" : "LOW",
    };
  };

  const timeout = new Promise<ParsedEpdFields>(resolve =>
    setTimeout(() => { console.warn(`[epd-intel] Timed out after ${TIMEOUT_MS}ms`); resolve(EMPTY_EPD); }, TIMEOUT_MS)
  );

  return Promise.race([pipeline(), timeout]).catch(err => {
    console.error("[epd-intel] Pipeline error:", err);
    return EMPTY_EPD;
  });
}
