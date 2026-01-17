/**
 * Azure Document Intelligence Client
 * 
 * Client for Azure AI Document Intelligence (formerly Form Recognizer)
 * for EPD document processing in the GreenChainz B2B platform.
 * 
 * Features:
 * - Pre-built document models (invoices, receipts, general documents)
 * - Custom model support for EPD extraction
 * - Batch processing support
 * - Automatic retries with exponential backoff
 * 
 * Used for:
 * - EPD (Environmental Product Declaration) parsing
 * - Invoice processing for procurement
 * - General document text extraction
 */

import {
  DocumentAnalysisClient,
  AzureKeyCredential,
  AnalyzeResult,
  AnalyzedDocument,
  DocumentTable,
  DocumentKeyValuePair,
} from "@azure/ai-form-recognizer";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DocumentIntelligenceConfig {
  /** Azure Document Intelligence endpoint */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
}

export interface DocumentAnalysisOptions {
  /** Model ID to use for analysis */
  modelId?: string;
  /** Locale hint for OCR */
  locale?: string;
  /** Pages to analyze (e.g., "1-3", "1,2,3") */
  pages?: string;
}

export interface ExtractedDocument {
  /** Full extracted text content */
  content: string;
  /** Number of pages */
  pageCount: number;
  /** Extracted tables */
  tables: ExtractedTable[];
  /** Key-value pairs found in document */
  keyValuePairs: ExtractedKeyValue[];
  /** Document type (if detected) */
  documentType: string | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Analysis metadata */
  metadata: {
    modelId: string;
    analyzedAt: Date;
    apiVersion: string;
  };
}

export interface ExtractedTable {
  /** Table index */
  index: number;
  /** Number of rows */
  rowCount: number;
  /** Number of columns */
  columnCount: number;
  /** Table cells as 2D array */
  cells: string[][];
}

export interface ExtractedKeyValue {
  /** Key name */
  key: string;
  /** Extracted value */
  value: string;
  /** Confidence score */
  confidence: number;
}

export interface EPDExtraction {
  /** Product name */
  productName: string | null;
  /** Manufacturer name */
  manufacturer: string | null;
  /** Global Warming Potential */
  gwp: {
    value: number | null;
    unit: string;
    functionalUnit: string | null;
  };
  /** EPD validity period */
  validity: {
    issueDate: string | null;
    expiryDate: string | null;
  };
  /** Program operator (e.g., IBU, UL Environment) */
  programOperator: string | null;
  /** EPD registration number */
  registrationNumber: string | null;
  /** Certifications mentioned */
  certifications: string[];
  /** Life cycle stages covered */
  lifeCycleStages: string[];
  /** Raw extracted tables (for manual review) */
  rawTables: ExtractedTable[];
  /** Extraction confidence (0-1) */
  confidence: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Retry configuration */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/** Known EPD keywords for extraction */
const EPD_KEYWORDS = {
  gwp: ['global warming potential', 'gwp', 'carbon footprint', 'kg co2', 'kgco2e', 'kg co2-eq'],
  manufacturer: ['manufacturer', 'produced by', 'company', 'manufacturer name'],
  product: ['product name', 'product', 'material', 'product description'],
  validity: ['valid until', 'expiry', 'expiration', 'validity', 'valid from', 'issue date'],
  certifications: ['certification', 'certified', 'iso 14025', 'en 15804', 'leed', 'breeam'],
  lifeCycle: ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'd'],
};

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

let documentClient: DocumentAnalysisClient | null = null;
let currentEndpoint: string | null = null;

/**
 * Get configuration from environment variables
 */
function getConfigFromEnv(): DocumentIntelligenceConfig {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT 
    || process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY 
    || process.env.AZURE_FORM_RECOGNIZER_KEY;

  if (!endpoint) {
    throw new Error(
      "Missing AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT environment variable. " +
      "Please configure Azure Document Intelligence credentials."
    );
  }

  if (!apiKey) {
    throw new Error(
      "Missing AZURE_DOCUMENT_INTELLIGENCE_KEY environment variable. " +
      "Please configure Azure Document Intelligence credentials."
    );
  }

  return { endpoint, apiKey };
}

/**
 * Get or create the singleton DocumentAnalysisClient
 * 
 * @returns Configured DocumentAnalysisClient instance
 * @throws Error if Azure Document Intelligence credentials are not configured
 */
export function getDocumentClient(): DocumentAnalysisClient {
  const config = getConfigFromEnv();

  if (documentClient && currentEndpoint === config.endpoint) {
    return documentClient;
  }

  currentEndpoint = config.endpoint;
  documentClient = new DocumentAnalysisClient(
    config.endpoint,
    new AzureKeyCredential(config.apiKey)
  );

  console.log("✅ Azure Document Intelligence client initialized");
  return documentClient;
}

/**
 * Check if Azure Document Intelligence is configured
 */
export function isDocumentIntelligenceConfigured(): boolean {
  try {
    getConfigFromEnv();
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract tables from analysis result
 */
function extractTables(tables: DocumentTable[] | undefined): ExtractedTable[] {
  if (!tables) return [];

  return tables.map((table, index) => {
    const cells: string[][] = Array(table.rowCount)
      .fill(null)
      .map(() => Array(table.columnCount).fill(""));

    for (const cell of table.cells) {
      if (cell.rowIndex < table.rowCount && cell.columnIndex < table.columnCount) {
        cells[cell.rowIndex][cell.columnIndex] = cell.content || "";
      }
    }

    return {
      index,
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      cells,
    };
  });
}

/**
 * Extract key-value pairs from analysis result
 */
function extractKeyValuePairs(
  keyValuePairs: DocumentKeyValuePair[] | undefined
): ExtractedKeyValue[] {
  if (!keyValuePairs) return [];

  return keyValuePairs
    .filter((pair) => pair.key?.content && pair.value?.content)
    .map((pair) => ({
      key: pair.key?.content || "",
      value: pair.value?.content || "",
      confidence: pair.confidence || 0,
    }));
}

/**
 * Search for value by keywords in key-value pairs
 */
function findValueByKeywords(
  keyValuePairs: ExtractedKeyValue[],
  keywords: string[]
): string | null {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const pair of keyValuePairs) {
    const lowerKey = pair.key.toLowerCase();
    if (lowerKeywords.some((keyword) => lowerKey.includes(keyword))) {
      return pair.value;
    }
  }

  return null;
}

/**
 * Extract GWP value from text
 */
function extractGWPValue(text: string): { value: number | null; unit: string } {
  // Pattern: number followed by unit (kg CO2, kgCO2e, kg CO2-eq)
  const pattern = /(\d+(?:\.\d+)?)\s*(kg\s*co2(?:-eq|e)?)/i;
  const match = text.match(pattern);

  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2].replace(/\s+/g, " ").trim(),
    };
  }

  return { value: null, unit: "kg CO2e" };
}

// ============================================================================
// DOCUMENT ANALYSIS
// ============================================================================

/**
 * Analyze a document (generic)
 * 
 * @param documentBuffer - Document as Buffer
 * @param options - Analysis options
 * @returns Extracted document data
 */
export async function analyzeDocument(
  documentBuffer: Buffer,
  options: DocumentAnalysisOptions = {}
): Promise<ExtractedDocument> {
  const client = getDocumentClient();
  const modelId = options.modelId || "prebuilt-document";

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const poller = await client.beginAnalyzeDocument(modelId, documentBuffer, {
        locale: options.locale,
        pages: options.pages,
      });

      const result: AnalyzeResult<AnalyzedDocument> = await poller.pollUntilDone();

      // Calculate average confidence
      const confidences = result.pages?.map((p) => p.words?.map((w) => w.confidence || 0) || []).flat() || [];
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

      console.log(`✅ Document analyzed successfully (model: ${modelId})`);

      return {
        content: result.content || "",
        pageCount: result.pages?.length || 0,
        tables: extractTables(result.tables),
        keyValuePairs: extractKeyValuePairs(result.keyValuePairs),
        documentType: result.documents?.[0]?.docType || null,
        confidence: avgConfidence,
        metadata: {
          modelId,
          analyzedAt: new Date(),
          apiVersion: "2023-07-31",
        },
      };
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Document analysis failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Document analysis failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

/**
 * Analyze a document from URL
 * 
 * @param documentUrl - URL to the document
 * @param options - Analysis options
 * @returns Extracted document data
 */
export async function analyzeDocumentFromUrl(
  documentUrl: string,
  options: DocumentAnalysisOptions = {}
): Promise<ExtractedDocument> {
  const client = getDocumentClient();
  const modelId = options.modelId || "prebuilt-document";

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const poller = await client.beginAnalyzeDocumentFromUrl(modelId, documentUrl, {
        locale: options.locale,
        pages: options.pages,
      });

      const result: AnalyzeResult<AnalyzedDocument> = await poller.pollUntilDone();

      // Calculate average confidence
      const confidences = result.pages?.map((p) => p.words?.map((w) => w.confidence || 0) || []).flat() || [];
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

      console.log(`✅ Document analyzed from URL (model: ${modelId})`);

      return {
        content: result.content || "",
        pageCount: result.pages?.length || 0,
        tables: extractTables(result.tables),
        keyValuePairs: extractKeyValuePairs(result.keyValuePairs),
        documentType: result.documents?.[0]?.docType || null,
        confidence: avgConfidence,
        metadata: {
          modelId,
          analyzedAt: new Date(),
          apiVersion: "2023-07-31",
        },
      };
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Document URL analysis failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Document URL analysis failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

// ============================================================================
// EPD-SPECIFIC EXTRACTION
// ============================================================================

/**
 * Extract EPD (Environmental Product Declaration) data from a document
 * 
 * @param documentBuffer - EPD document as Buffer
 * @returns Extracted EPD data
 */
export async function extractEPDData(documentBuffer: Buffer): Promise<EPDExtraction> {
  // First, get general document analysis
  const analysis = await analyzeDocument(documentBuffer, {
    modelId: "prebuilt-document",
  });

  const { content, keyValuePairs, tables } = analysis;
  const contentLower = content.toLowerCase();

  // Extract product name
  const productName = findValueByKeywords(keyValuePairs, EPD_KEYWORDS.product);

  // Extract manufacturer
  const manufacturer = findValueByKeywords(keyValuePairs, EPD_KEYWORDS.manufacturer);

  // Extract GWP
  let gwp = { value: null as number | null, unit: "kg CO2e", functionalUnit: null as string | null };
  
  // Try key-value pairs first
  const gwpValue = findValueByKeywords(keyValuePairs, EPD_KEYWORDS.gwp);
  if (gwpValue) {
    const extracted = extractGWPValue(gwpValue);
    gwp.value = extracted.value;
    gwp.unit = extracted.unit;
  }

  // Search in tables if not found
  if (gwp.value === null) {
    for (const table of tables) {
      for (const row of table.cells) {
        const rowText = row.join(" ").toLowerCase();
        if (EPD_KEYWORDS.gwp.some((k) => rowText.includes(k))) {
          // Look for numeric values in the row
          for (const cell of row) {
            const extracted = extractGWPValue(cell);
            if (extracted.value !== null) {
              gwp.value = extracted.value;
              gwp.unit = extracted.unit;
              break;
            }
          }
        }
      }
    }
  }

  // Search in content as last resort
  if (gwp.value === null) {
    const extracted = extractGWPValue(content);
    gwp.value = extracted.value;
    gwp.unit = extracted.unit;
  }

  // Extract validity dates
  const validity = {
    issueDate: null as string | null,
    expiryDate: null as string | null,
  };

  const validityValue = findValueByKeywords(keyValuePairs, ['valid until', 'expiry date', 'expires']);
  if (validityValue) {
    validity.expiryDate = validityValue;
  }

  const issueDateValue = findValueByKeywords(keyValuePairs, ['issue date', 'issued', 'valid from']);
  if (issueDateValue) {
    validity.issueDate = issueDateValue;
  }

  // Extract program operator
  const programOperator = findValueByKeywords(keyValuePairs, ['program operator', 'epd operator', 'operator']);

  // Extract registration number
  const registrationNumber = findValueByKeywords(keyValuePairs, ['registration number', 'epd number', 'declaration number']);

  // Extract certifications
  const certifications: string[] = [];
  for (const cert of EPD_KEYWORDS.certifications) {
    if (contentLower.includes(cert.toLowerCase())) {
      certifications.push(cert.toUpperCase());
    }
  }

  // Extract life cycle stages
  const lifeCycleStages: string[] = [];
  for (const stage of EPD_KEYWORDS.lifeCycle) {
    // Look for stages in format "A1-A3" or individual stages
    const stagePattern = new RegExp(`\\b${stage}\\b`, 'i');
    if (stagePattern.test(content)) {
      lifeCycleStages.push(stage.toUpperCase());
    }
  }

  // Calculate confidence based on how many fields were extracted
  const fieldsExtracted = [
    productName,
    manufacturer,
    gwp.value,
    validity.issueDate || validity.expiryDate,
    programOperator,
    registrationNumber,
  ].filter(Boolean).length;

  const confidence = Math.min((fieldsExtracted / 6) * analysis.confidence, 1);

  console.log(`✅ EPD extraction complete (confidence: ${(confidence * 100).toFixed(1)}%)`);

  return {
    productName,
    manufacturer,
    gwp,
    validity,
    programOperator,
    registrationNumber,
    certifications: [...new Set(certifications)],
    lifeCycleStages: [...new Set(lifeCycleStages)].sort(),
    rawTables: tables,
    confidence,
  };
}

// ============================================================================
// INVOICE PROCESSING
// ============================================================================

/**
 * Extract invoice data from a document
 * 
 * @param documentBuffer - Invoice document as Buffer
 * @returns Extracted invoice data
 */
export async function extractInvoiceData(documentBuffer: Buffer): Promise<{
  vendorName: string | null;
  vendorAddress: string | null;
  customerName: string | null;
  invoiceId: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  subtotal: number | null;
  totalTax: number | null;
  totalAmount: number | null;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    amount: number | null;
  }>;
  confidence: number;
}> {
  const analysis = await analyzeDocument(documentBuffer, {
    modelId: "prebuilt-invoice",
  });

  const { keyValuePairs } = analysis;

  // Helper to find numeric value
  const findNumericValue = (keywords: string[]): number | null => {
    const value = findValueByKeywords(keyValuePairs, keywords);
    if (!value) return null;
    const match = value.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, "")) : null;
  };

  console.log("✅ Invoice extraction complete");

  return {
    vendorName: findValueByKeywords(keyValuePairs, ['vendor', 'seller', 'from']),
    vendorAddress: findValueByKeywords(keyValuePairs, ['vendor address', 'seller address', 'from address']),
    customerName: findValueByKeywords(keyValuePairs, ['customer', 'buyer', 'bill to', 'to']),
    invoiceId: findValueByKeywords(keyValuePairs, ['invoice number', 'invoice id', 'invoice #']),
    invoiceDate: findValueByKeywords(keyValuePairs, ['invoice date', 'date']),
    dueDate: findValueByKeywords(keyValuePairs, ['due date', 'payment due']),
    subtotal: findNumericValue(['subtotal', 'sub-total']),
    totalTax: findNumericValue(['tax', 'vat', 'gst']),
    totalAmount: findNumericValue(['total', 'amount due', 'total amount']),
    currency: findValueByKeywords(keyValuePairs, ['currency']) || 'USD',
    lineItems: [], // Would need more complex extraction logic
    confidence: analysis.confidence,
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Reset the Document Intelligence client (useful for testing)
 */
export function resetDocumentClient(): void {
  documentClient = null;
  currentEndpoint = null;
  console.log("✅ Azure Document Intelligence client reset");
}
