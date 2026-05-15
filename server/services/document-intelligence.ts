/**
 * Document Intelligence — RFQ Spec Parser
 * ─────────────────────────────────────────
 * Two-stage pipeline for converting an uploaded spec section PDF into
 * structured RFQ form fields:
 *
 *   Stage 1 — Azure Document Intelligence extracts raw text + key-value pairs
 *             from the PDF buffer (architect spec sections, CSI divisions, etc.)
 *
 *   Stage 2 — Azure OpenAI (via AI Foundry) reads that text and returns a
 *             clean JSON object matching ParsedRfqFields, ready to pre-fill
 *             the RFQ form in the browser.
 *
 * Fallback: if DI fails, tries regex-only extraction. If LLM fails, returns
 * whatever the regex pass found with confidence "LOW".
 *
 * Auth: DI uses AzureKeyCredential (DOCUMENT_INTELLIGENCE_KEY env var).
 *       OpenAI call uses DefaultAzureCredential (managed identity / az login).
 *
 * Env vars:
 *   DOCUMENT_INTELLIGENCE_ENDPOINT  default: https://greenchainz-content-intel.cognitiveservices.azure.com/
 *   DOCUMENT_INTELLIGENCE_KEY       required for DI
 *   AZURE_AI_PROJECT_ENDPOINT       for the OpenAI structuring call
 *   AZURE_AI_RFQ_MODEL              model deployment name (default: gpt-4o)
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

// Use gpt-4o for structuring — more reliable instruction-following than 5.4 for JSON extraction
const STRUCT_MODEL = process.env.AZURE_AI_RFQ_MODEL ?? "gpt-4o";
const API_VERSION = "2024-12-01-preview";
const TIMEOUT_MS = 12_000; // DI + LLM combined; user sees progress spinner

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedRfqFields {
  /** Material category (matches RFQ form dropdown values) */
  category: string;
  /** Free-text description of what the spec requires */
  description: string;
  /** Sustainability certifications required/preferred (LEED, FSC, GreenGuard, etc.) */
  certifications: string[];
  /** Maximum Global Warming Potential in kgCO₂e/kg, null if not specified */
  maxGwp: number | null;
  /** Requested quantity, null if not specified */
  quantity: number | null;
  /** Unit of measure (SF, LF, CY, EA, TON, etc.), null if not specified */
  unit: string | null;
  /** Whether an Environmental Product Declaration is explicitly required */
  epdRequired: boolean;
  /** Overall confidence in the extraction */
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Which fields were actually found (for greying out unfilled fields in UI) */
  fieldsFound: string[];
}

// ── Credential singleton ────────────────────────────────────────────────────────

let _credential: DefaultAzureCredential | null = null;
function credential(): DefaultAzureCredential {
  if (!_credential) _credential = new DefaultAzureCredential();
  return _credential;
}

async function getAzureToken(): Promise<string> {
  const tok = await credential().getToken("https://cognitiveservices.azure.com/.default");
  if (!tok?.token) throw new Error("[doc-intel] Could not acquire Azure AD token");
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

// ── Stage 1: Document Intelligence text extraction ─────────────────────────────

async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const key = process.env.DOCUMENT_INTELLIGENCE_KEY;
  if (!key) {
    throw new Error("[doc-intel] DOCUMENT_INTELLIGENCE_KEY not configured");
  }

  const client = new DocumentAnalysisClient(DI_ENDPOINT, new AzureKeyCredential(key));

  console.log(`[doc-intel] Analyzing PDF (${Math.round(buffer.length / 1024)}KB) with Document Intelligence`);

  // prebuilt-layout gives us text + tables + key-value pairs from spec sheets
  const poller = await client.beginAnalyzeDocument("prebuilt-layout", buffer as unknown as NodeJS.ReadableStream);
  const result = await poller.pollUntilDone();

  if (!result.content) {
    throw new Error("[doc-intel] Document Intelligence returned no content");
  }

  // Merge page text + any key-value pairs for richer context
  let text = result.content;

  if (result.keyValuePairs && result.keyValuePairs.length > 0) {
    const kvLines = result.keyValuePairs
      .filter(kv => kv.key?.content && kv.value?.content)
      .map(kv => `${kv.key!.content}: ${kv.value!.content}`)
      .slice(0, 50); // cap to avoid token blowout
    if (kvLines.length > 0) {
      text += "\n\n=== Key-Value Pairs Extracted ===\n" + kvLines.join("\n");
    }
  }

  console.log(`[doc-intel] Extracted ${text.length} chars, ${result.keyValuePairs?.length ?? 0} KV pairs`);
  return text;
}

// ── Stage 1 fallback: regex-only extraction ────────────────────────────────────

const CERT_KEYWORDS = [
  "LEED", "FSC", "GreenGuard", "GreenGuard Gold", "Cradle to Cradle", "C2C",
  "Declare", "EPD", "HPD", "Red List Free", "LBC", "Living Building Challenge",
  "ISO 14025", "ISO 14044", "BIFMA", "FloorScore", "SCS", "UL ECOLOGO",
];

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  Concrete: /\b(concrete|cement|precast|ready[\s-]?mix|fly[\s-]?ash)\b/i,
  Steel: /\b(steel|rebar|structural\s*steel|HSS|W[\s-]?section|wide[\s-]?flange)\b/i,
  "Timber / Mass Timber": /\b(timber|lumber|CLT|cross[\s-]?laminated|glulam|LVL|mass[\s-]?timber|wood\s*framing)\b/i,
  Glass: /\b(glass|glazing|curtain[\s-]?wall|vision\s*glass|spandrel)\b/i,
  Insulation: /\b(insulation|batt|spray\s*foam|mineral\s*wool|XPS|EPS|polyiso)\b/i,
  Roofing: /\b(roofing|membrane|TPO|EPDM|PVC\s*roofing|built[\s-]?up|modified\s*bitumen)\b/i,
  Flooring: /\b(flooring|carpet|tile|LVT|LVP|terrazzo|resilient\s*floor)\b/i,
  Cladding: /\b(cladding|facade|curtain\s*wall|rainscreen|ACM|metal\s*panel|brick\s*veneer)\b/i,
  "MEP": /\b(MEP|mechanical|electrical|plumbing|HVAC|ductwork|piping|conduit)\b/i,
  "Gypsum / Drywall": /\b(gypsum|drywall|sheetrock|wallboard|plasterboard)\b/i,
};

function regexFallbackExtract(text: string): Partial<ParsedRfqFields> {
  const fields: Partial<ParsedRfqFields> = { fieldsFound: [] };

  // Category
  for (const [cat, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (pattern.test(text)) {
      fields.category = cat;
      fields.fieldsFound!.push("category");
      break;
    }
  }

  // Certifications
  const foundCerts = CERT_KEYWORDS.filter(cert =>
    new RegExp(`\\b${cert.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
  );
  if (foundCerts.length > 0) {
    fields.certifications = foundCerts;
    fields.fieldsFound!.push("certifications");
  }

  // EPD required
  if (/\b(EPD|environmental\s*product\s*declaration)\b/i.test(text)) {
    fields.epdRequired = true;
    fields.fieldsFound!.push("epdRequired");
  }

  // GWP / carbon
  const gwpMatch = text.match(/(?:GWP|global\s*warming\s*potential|carbon|CO₂e?)\s*[:\-≤<]?\s*(\d+(?:\.\d+)?)\s*(?:kg\s*CO₂e?|kgCO₂e?|CO₂e?\/kg)/i);
  if (gwpMatch) {
    fields.maxGwp = parseFloat(gwpMatch[1]);
    fields.fieldsFound!.push("maxGwp");
  }

  // Quantity + unit
  const qtyMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s+(SF|SY|LF|CY|EA|TON|LB|MBF|MSF|CSF|GAL|CF)\b/i);
  if (qtyMatch) {
    fields.quantity = parseFloat(qtyMatch[1].replace(/,/g, ""));
    fields.unit = qtyMatch[2].toUpperCase();
    fields.fieldsFound!.push("quantity", "unit");
  }

  return fields;
}

// ── Stage 2: LLM structuring ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a construction specification analyst for GreenChainz, a sustainable building materials marketplace. Your job is to read an extracted spec section and return a structured JSON object that can pre-fill an RFQ (Request for Quote) form.

Extract the following fields from the spec text. Use only information explicitly stated — do not infer or guess.

Return ONLY valid JSON — no markdown, no extra text:
{
  "category": "<one of: Concrete, Steel, Timber / Mass Timber, Glass, Insulation, Roofing, Flooring, Cladding, MEP, Gypsum / Drywall, Other>",
  "description": "<2-3 sentence summary of what is being specified, including key performance requirements>",
  "certifications": ["<list of required or preferred sustainability certifications found, e.g. LEED, FSC, GreenGuard, EPD, HPD, Cradle to Cradle, Declare, Red List Free, LBC, BIFMA, ISO 14025>"],
  "maxGwp": <number in kgCO2e/kg or null if not found>,
  "quantity": <number or null>,
  "unit": "<SF|LF|CY|EA|TON|LF|SY|CSF|GAL|CF or null>",
  "epdRequired": <true if EPD is explicitly required, false otherwise>,
  "confidence": "<HIGH if ≥4 fields found, MEDIUM if 2-3, LOW if ≤1>",
  "fieldsFound": ["<list of field names that had data: category, description, certifications, maxGwp, quantity, unit, epdRequired>"]
}`;

async function structureWithLlm(text: string): Promise<ParsedRfqFields | null> {
  try {
    const token = await getAzureToken();
    const azureBase = getAzureBase(FOUNDRY_ENDPOINT);
    const url = `${azureBase}/openai/deployments/${STRUCT_MODEL}/chat/completions?api-version=${API_VERSION}`;

    // Cap the text at ~8000 chars to stay within token budget for the structuring call
    const truncated = text.length > 8000 ? text.substring(0, 8000) + "\n\n[...truncated for length]" : text;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Spec section text:\n\n${truncated}` },
        ],
        temperature: 0,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[doc-intel] OpenAI API ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = json.choices[0]?.message?.content ?? "";
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(clean) as Partial<ParsedRfqFields>;

    // Validate required shape
    if (!parsed.category || typeof parsed.category !== "string") {
      throw new Error("[doc-intel] LLM response missing category");
    }

    return {
      category: parsed.category,
      description: parsed.description ?? "",
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      maxGwp: typeof parsed.maxGwp === "number" ? parsed.maxGwp : null,
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : null,
      unit: typeof parsed.unit === "string" ? parsed.unit : null,
      epdRequired: parsed.epdRequired === true,
      confidence: parsed.confidence ?? "LOW",
      fieldsFound: Array.isArray(parsed.fieldsFound) ? parsed.fieldsFound : [],
    };
  } catch (err) {
    console.error("[doc-intel] LLM structuring failed:", err);
    return null;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Parses a spec section PDF buffer into structured RFQ form fields.
 * Never throws — always returns a ParsedRfqFields (may be low-confidence fallback).
 */
export async function parseSpecPdf(buffer: Buffer): Promise<ParsedRfqFields> {
  const EMPTY: ParsedRfqFields = {
    category: "",
    description: "",
    certifications: [],
    maxGwp: null,
    quantity: null,
    unit: null,
    epdRequired: false,
    confidence: "LOW",
    fieldsFound: [],
  };

  if (!buffer || buffer.length === 0) {
    return EMPTY;
  }

  // Race the entire pipeline against TIMEOUT_MS
  const pipeline = (async (): Promise<ParsedRfqFields> => {
    // Stage 1: extract text via DI
    let text: string;
    let usedDi = true;

    try {
      text = await extractTextFromBuffer(buffer);
    } catch (diErr) {
      console.warn("[doc-intel] DI extraction failed, using regex-only fallback:", diErr);
      usedDi = false;
      // Attempt raw buffer string decode as last resort
      text = buffer.toString("utf-8");
    }

    if (!text || text.length < 50) {
      console.warn("[doc-intel] Extracted text too short to parse");
      return EMPTY;
    }

    // Stage 2: attempt LLM structuring
    if (usedDi) {
      const llmResult = await structureWithLlm(text);
      if (llmResult && llmResult.fieldsFound.length > 0) {
        console.log(
          `[doc-intel] ✓ LLM structured ${llmResult.fieldsFound.length} fields ` +
          `(confidence: ${llmResult.confidence}): ${llmResult.fieldsFound.join(", ")}`
        );
        return llmResult;
      }
    }

    // Stage 2 fallback: regex extraction
    console.log("[doc-intel] Falling back to regex extraction");
    const regexResult = regexFallbackExtract(text);
    return {
      category: regexResult.category ?? "",
      description: regexResult.description ?? "",
      certifications: regexResult.certifications ?? [],
      maxGwp: regexResult.maxGwp ?? null,
      quantity: regexResult.quantity ?? null,
      unit: regexResult.unit ?? null,
      epdRequired: regexResult.epdRequired ?? false,
      confidence: (regexResult.fieldsFound?.length ?? 0) >= 3 ? "MEDIUM" : "LOW",
      fieldsFound: regexResult.fieldsFound ?? [],
    };
  })();

  const timer = new Promise<ParsedRfqFields>(resolve =>
    setTimeout(() => {
      console.warn(`[doc-intel] Pipeline timed out after ${TIMEOUT_MS}ms`);
      resolve(EMPTY);
    }, TIMEOUT_MS)
  );

  return Promise.race([pipeline, timer]).catch(err => {
    console.error("[doc-intel] Unexpected pipeline error:", err);
    return EMPTY;
  });
}
