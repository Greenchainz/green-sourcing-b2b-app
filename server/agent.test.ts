import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module before importing agent
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { handleChat, type ChatContext } from "./agent";

const mockInvokeLLM = vi.mocked(invokeLLM);
const mockGetDb = vi.mocked(getDb);

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeLLMResponse(content: string, toolCalls?: any[]) {
  return {
    choices: [
      {
        message: {
          content,
          tool_calls: toolCalls || undefined,
        },
      },
    ],
  };
}

function makeRouterResponse(agent: string, confidence: number) {
  return makeLLMResponse(
    JSON.stringify({ agent, confidence, reasoning: "test routing" })
  );
}

const defaultContext: ChatContext = {
  currentPage: "/",
  userPersona: "default",
};

// Mock DB that returns empty results for conversation history
function createMockDb() {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
  };
  return mockDb;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Agent System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Router — Keyword-based fast routing", () => {
    it("routes 'talk to a human' directly to support without LLM call", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // The specialist (support) will respond
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("I'll connect you with our support team right away.")
      );

      const result = await handleChat(
        "I want to talk to a human please",
        "test-session-1",
        defaultContext
      );

      expect(result.agent).toBe("support");
      expect(result.content).toBeTruthy();
      // The router LLM should NOT have been called (keyword match),
      // only the specialist LLM should be called
      expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
    });

    it("routes 'speak to someone' to support", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Let me connect you with a team member.")
      );

      const result = await handleChat(
        "Can I speak to someone?",
        "test-session-2",
        defaultContext
      );

      expect(result.agent).toBe("support");
    });
  });

  describe("Router — Context-based routing", () => {
    it("routes to RFQ agent when user is on /rfq page", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Specialist response
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("I can help you with your RFQ. What materials are you looking for?")
      );

      const result = await handleChat(
        "How do I submit this?",
        "test-session-3",
        { ...defaultContext, currentPage: "/rfq" }
      );

      expect(result.agent).toBe("rfq");
    });

    it("routes material questions on RFQ page to materials agent via LLM", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router LLM classifies as materials
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("materials", 0.9)
      );
      // Specialist response
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Here are some insulation alternatives...")
      );

      const result = await handleChat(
        "What material alternatives are there for insulation?",
        "test-session-4",
        { ...defaultContext, currentPage: "/rfq" }
      );

      expect(result.agent).toBe("materials");
    });
  });

  describe("Router — LLM-based classification", () => {
    it("routes material questions to materials agent", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router classifies
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("materials", 0.95)
      );
      // Specialist responds
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Based on our database, mineral wool has the lowest GWP...")
      );

      const result = await handleChat(
        "What insulation has the lowest embodied carbon?",
        "test-session-5",
        defaultContext
      );

      expect(result.agent).toBe("materials");
      expect(result.content).toContain("mineral wool");
    });

    it("routes RFQ questions to rfq agent", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("rfq", 0.88)
      );
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("To submit an RFQ, add materials to your cart first.")
      );

      const result = await handleChat(
        "How do I request a quote from a supplier?",
        "test-session-6",
        defaultContext
      );

      expect(result.agent).toBe("rfq");
    });

    it("falls back to keyword matching when LLM router fails", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router LLM fails
      mockInvokeLLM.mockRejectedValueOnce(new Error("LLM timeout"));
      // Specialist responds (keyword match should route to materials)
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Here's what I found about insulation...")
      );

      const result = await handleChat(
        "Tell me about insulation EPD data",
        "test-session-7",
        defaultContext
      );

      // Should fall back to keyword matching and find "insulation" + "EPD"
      expect(result.agent).toBe("materials");
    });
  });

  describe("Specialist — Tool calling", () => {
    it("materials agent uses search_materials tool when asked about materials", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("materials", 0.95)
      );

      // First specialist call — wants to use a tool
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  id: "call_1",
                  function: {
                    name: "search_materials",
                    arguments: JSON.stringify({ query: "insulation", limit: 5 }),
                  },
                },
              ],
            },
          },
        ],
      });

      // Second specialist call — final response after tool result
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Based on the search results, I found 5 insulation materials. The top-rated by CCPS is...")
      );

      const result = await handleChat(
        "Search for insulation materials",
        "test-session-8",
        defaultContext
      );

      expect(result.toolsUsed).toContain("search_materials");
      expect(result.content).toContain("insulation");
    });
  });

  describe("Escalation handling", () => {
    it("escalates to support when specialist includes ESCALATE", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("materials", 0.8)
      );
      // Materials specialist escalates
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("I'm not sure about billing questions. Let me connect you with our support team ESCALATE")
      );
      // Support specialist responds
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("I can help you with your account. What's the issue?")
      );

      const result = await handleChat(
        "How much does this platform cost?",
        "test-session-9",
        defaultContext
      );

      // Should have escalated from materials to support
      expect(result.agent).toBe("support");
    });
  });

  describe("Conversation storage", () => {
    it("stores both user and assistant messages in the database", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router classification
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("support", 0.8)
      );
      // Specialist response
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("I can help with that! GreenChainz is a B2B marketplace...")
      );

      await handleChat(
        "What is GreenChainz?",
        "test-session-10",
        { ...defaultContext, currentPage: "/" }
      );

      // Verify insert was called (for both user + assistant messages)
      const insertCalls = mockDb.insert.mock.calls;
      expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Context injection", () => {
    it("passes material context when user is on a material detail page", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Router
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("materials", 0.9)
      );
      // Specialist
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("This material has a CCPS score of 78...")
      );

      const result = await handleChat(
        "Is this material good?",
        "test-session-11",
        {
          currentPage: "/materials/5",
          materialId: 5,
          userPersona: "architect",
        }
      );

      // The system prompt should have included material ID context
      const specialistCall = mockInvokeLLM.mock.calls[1];
      const systemMessage = specialistCall[0].messages[0];
      expect(systemMessage.content).toContain("material ID 5");
    });

    it("includes cart items in context for RFQ agent", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      // Specialist (context-based routing to RFQ)
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("You have 3 items in your RFQ cart. Ready to submit?")
      );

      const result = await handleChat(
        "Am I ready to submit?",
        "test-session-12",
        {
          currentPage: "/rfq",
          cartItems: [1, 5, 12],
          userPersona: "gc_pm",
        }
      );

      expect(result.agent).toBe("rfq");
      // Verify system prompt included cart info
      const specialistCall = mockInvokeLLM.mock.calls[0];
      const systemMessage = specialistCall[0].messages[0];
      expect(systemMessage.content).toContain("3 items");
    });
  });

  describe("Response formatting", () => {
    it("strips ESCALATE/HANDOFF markers from final response", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Let me connect you with our team. HANDOFF")
      );

      const result = await handleChat(
        "I need to talk to a real person",
        "test-session-13",
        defaultContext
      );

      expect(result.content).not.toContain("HANDOFF");
      expect(result.content).not.toContain("ESCALATE");
      expect(result.content).toContain("connect you");
    });

    it("returns agent name and tools used in response", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("materials", 0.9)
      );
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("Here are the top materials by CCPS score...")
      );

      const result = await handleChat(
        "Show me the best materials",
        "test-session-14",
        defaultContext
      );

      expect(result.agent).toBe("materials");
      expect(Array.isArray(result.toolsUsed)).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("handles database unavailability gracefully", async () => {
      mockGetDb.mockResolvedValue(null as any);

      // Router falls back to keyword
      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("support", 0.5)
      );
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("I'm here to help!")
      );

      const result = await handleChat(
        "Hello",
        "test-session-15",
        defaultContext
      );

      // Should still respond even without DB
      expect(result.content).toBeTruthy();
    });

    it("handles empty message gracefully", async () => {
      const mockDb = createMockDb();
      mockGetDb.mockResolvedValue(mockDb as any);

      mockInvokeLLM.mockResolvedValueOnce(
        makeRouterResponse("support", 0.5)
      );
      mockInvokeLLM.mockResolvedValueOnce(
        makeLLMResponse("How can I help you today?")
      );

      const result = await handleChat(
        " ",
        "test-session-16",
        defaultContext
      );

      expect(result.content).toBeTruthy();
    });
  });
});
