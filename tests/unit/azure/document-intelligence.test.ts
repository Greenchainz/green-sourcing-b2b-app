/**
 * Azure Document Intelligence Integration Tests (Mock)
 * 
 * Tests for Azure Document Intelligence client for EPD processing
 */

// Mock the Azure Form Recognizer SDK
jest.mock("@azure/ai-form-recognizer", () => ({
  DocumentAnalysisClient: jest.fn().mockImplementation(() => ({
    beginAnalyzeDocument: jest.fn().mockResolvedValue({
      pollUntilDone: jest.fn().mockResolvedValue({
        content: "Sample EPD Document\nProduct: Test Product\nManufacturer: Test Corp\nGWP: 5.2 kg CO2e",
        pages: [
          {
            words: [
              { content: "Sample", confidence: 0.95 },
              { content: "EPD", confidence: 0.98 },
            ],
          },
        ],
        tables: [
          {
            rowCount: 2,
            columnCount: 2,
            cells: [
              { rowIndex: 0, columnIndex: 0, content: "Metric" },
              { rowIndex: 0, columnIndex: 1, content: "Value" },
              { rowIndex: 1, columnIndex: 0, content: "GWP" },
              { rowIndex: 1, columnIndex: 1, content: "5.2 kg CO2e" },
            ],
          },
        ],
        keyValuePairs: [
          { key: { content: "Product Name" }, value: { content: "Test Product" }, confidence: 0.9 },
          { key: { content: "Manufacturer" }, value: { content: "Test Corp" }, confidence: 0.85 },
        ],
        documents: [{ docType: "epd" }],
      }),
    }),
    beginAnalyzeDocumentFromUrl: jest.fn().mockResolvedValue({
      pollUntilDone: jest.fn().mockResolvedValue({
        content: "Sample document from URL",
        pages: [{ words: [{ content: "test", confidence: 0.9 }] }],
        tables: [],
        keyValuePairs: [],
        documents: [],
      }),
    }),
  })),
  AzureKeyCredential: jest.fn().mockImplementation((key: string) => ({ key })),
}));

describe("Azure Document Intelligence Client", () => {
  let documentIntelligence: typeof import("../../../lib/azure/document-intelligence");

  beforeAll(() => {
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "https://test.cognitiveservices.azure.com/";
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = "test-key";
  });

  beforeEach(() => {
    jest.resetModules();
    documentIntelligence = require("../../../lib/azure/document-intelligence");
  });

  afterAll(() => {
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  });

  describe("getDocumentClient", () => {
    it("should create a document analysis client", () => {
      const client = documentIntelligence.getDocumentClient();
      expect(client).toBeDefined();
    });

    it("should return the same client on subsequent calls", () => {
      const client1 = documentIntelligence.getDocumentClient();
      const client2 = documentIntelligence.getDocumentClient();
      expect(client1).toBe(client2);
    });
  });

  describe("isDocumentIntelligenceConfigured", () => {
    it("should return true when credentials are set", () => {
      expect(documentIntelligence.isDocumentIntelligenceConfigured()).toBe(true);
    });
  });

  describe("analyzeDocument", () => {
    it("should analyze a document buffer", async () => {
      const result = await documentIntelligence.analyzeDocument(
        Buffer.from("test document content")
      );

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("pageCount");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("keyValuePairs");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("metadata");
    });

    it("should extract tables from documents", async () => {
      const result = await documentIntelligence.analyzeDocument(
        Buffer.from("test")
      );

      expect(Array.isArray(result.tables)).toBe(true);
    });

    it("should extract key-value pairs", async () => {
      const result = await documentIntelligence.analyzeDocument(
        Buffer.from("test")
      );

      expect(Array.isArray(result.keyValuePairs)).toBe(true);
    });
  });

  describe("analyzeDocumentFromUrl", () => {
    it("should analyze a document from URL", async () => {
      const result = await documentIntelligence.analyzeDocumentFromUrl(
        "https://example.com/document.pdf"
      );

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("pageCount");
    });
  });

  describe("extractEPDData", () => {
    it("should extract EPD-specific data", async () => {
      const result = await documentIntelligence.extractEPDData(
        Buffer.from("EPD document")
      );

      expect(result).toHaveProperty("productName");
      expect(result).toHaveProperty("manufacturer");
      expect(result).toHaveProperty("gwp");
      expect(result).toHaveProperty("validity");
      expect(result).toHaveProperty("programOperator");
      expect(result).toHaveProperty("certifications");
      expect(result).toHaveProperty("lifeCycleStages");
      expect(result).toHaveProperty("confidence");
    });

    it("should include raw tables for manual review", async () => {
      const result = await documentIntelligence.extractEPDData(
        Buffer.from("EPD document")
      );

      expect(result).toHaveProperty("rawTables");
      expect(Array.isArray(result.rawTables)).toBe(true);
    });
  });

  describe("extractInvoiceData", () => {
    it("should extract invoice data", async () => {
      const result = await documentIntelligence.extractInvoiceData(
        Buffer.from("Invoice document")
      );

      expect(result).toHaveProperty("vendorName");
      expect(result).toHaveProperty("invoiceId");
      expect(result).toHaveProperty("totalAmount");
      expect(result).toHaveProperty("confidence");
    });
  });

  describe("module exports", () => {
    it("should export all required functions", () => {
      expect(documentIntelligence.getDocumentClient).toBeDefined();
      expect(documentIntelligence.resetDocumentClient).toBeDefined();
      expect(documentIntelligence.isDocumentIntelligenceConfigured).toBeDefined();
      expect(documentIntelligence.analyzeDocument).toBeDefined();
      expect(documentIntelligence.analyzeDocumentFromUrl).toBeDefined();
      expect(documentIntelligence.extractEPDData).toBeDefined();
      expect(documentIntelligence.extractInvoiceData).toBeDefined();
    });
  });
});
