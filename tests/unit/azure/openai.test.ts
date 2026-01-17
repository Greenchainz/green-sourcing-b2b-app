/**
 * Azure OpenAI Integration Tests (Mock)
 * 
 * Tests for Azure OpenAI SDK configuration with GPT-4o
 */

// Mock the OpenAI SDK
jest.mock("openai", () => ({
  AzureOpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: { content: "Test response from GPT-4o" },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
          model: "gpt-4o",
        }),
      },
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  })),
}));

describe("Azure OpenAI Client", () => {
  let openai: typeof import("../../../lib/azure/openai");

  beforeAll(() => {
    process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com/";
    process.env.AZURE_OPENAI_API_KEY = "test-api-key";
    process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-4o";
  });

  beforeEach(() => {
    jest.resetModules();
    openai = require("../../../lib/azure/openai");
  });

  afterAll(() => {
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_DEPLOYMENT;
  });

  describe("getOpenAIClient", () => {
    it("should create an OpenAI client", () => {
      const client = openai.getOpenAIClient();
      expect(client).toBeDefined();
    });

    it("should return the same client on subsequent calls", () => {
      const client1 = openai.getOpenAIClient();
      const client2 = openai.getOpenAIClient();
      expect(client1).toBe(client2);
    });
  });

  describe("isOpenAIConfigured", () => {
    it("should return true when credentials are set", () => {
      expect(openai.isOpenAIConfigured()).toBe(true);
    });
  });

  describe("chat", () => {
    it("should execute a chat completion", async () => {
      const response = await openai.chat([
        { role: "user", content: "Hello" },
      ]);

      expect(response).toEqual({
        content: expect.any(String),
        usage: {
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number),
        },
        finishReason: expect.any(String),
        model: expect.any(String),
      });
    });

    it("should include system message when provided", async () => {
      const response = await openai.chat(
        [{ role: "user", content: "Hello" }],
        { systemMessage: "You are a helpful assistant." }
      );

      expect(response.content).toBeDefined();
    });
  });

  describe("simpleChat", () => {
    it("should return content string directly", async () => {
      const content = await openai.simpleChat("Hello");
      expect(typeof content).toBe("string");
    });
  });

  describe("auditProductSustainability", () => {
    it("should audit a product and return structured data", async () => {
      // Override mock for JSON response
      const mockClient = openai.getOpenAIClient() as jest.Mocked<InstanceType<typeof import("openai").AzureOpenAI>>;
      (mockClient.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sustainabilityScore: 85,
                analysis: "Good sustainability profile",
                recommendations: ["Consider EPD certification"],
                certificationStatus: "partial",
              }),
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        model: "gpt-4o",
      });

      const result = await openai.auditProductSustainability({
        name: "Test Product",
        manufacturer: "Test Manufacturer",
        gwp: 10.5,
      });

      expect(result).toHaveProperty("sustainabilityScore");
      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("certificationStatus");
    });
  });

  describe("generateEmbedding", () => {
    it("should generate embeddings for text", async () => {
      const embedding = await openai.generateEmbedding("Test text");
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
    });
  });

  describe("module exports", () => {
    it("should export all required functions", () => {
      expect(openai.getOpenAIClient).toBeDefined();
      expect(openai.resetOpenAIClient).toBeDefined();
      expect(openai.isOpenAIConfigured).toBeDefined();
      expect(openai.chat).toBeDefined();
      expect(openai.simpleChat).toBeDefined();
      expect(openai.streamChat).toBeDefined();
      expect(openai.auditProductSustainability).toBeDefined();
      expect(openai.analyzeEPDDocument).toBeDefined();
      expect(openai.generateRFQResponse).toBeDefined();
      expect(openai.generateEmbedding).toBeDefined();
    });
  });
});
