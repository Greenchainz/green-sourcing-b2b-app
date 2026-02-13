/**
 * Agent Triage Service
 * 
 * Routes user messages to the appropriate AI agent specialist:
 * - Material Intelligence Agent: Product questions, CCPS queries, EPD data
 * - RFQ Assistant Agent: Quote requests, supplier matching, RFQ workflow
 * - Supplier Agent: Supplier-specific questions (configurable by Premium suppliers)
 * - Support: Human escalation, account issues, billing
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { conversations, messages, agentHandoffRules } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export type AgentType = "material" | "rfq" | "supplier" | "support" | "triage";

interface TriageResult {
  agentType: AgentType;
  confidence: number;
  reasoning: string;
  shouldHandoff: boolean; // True if user explicitly requests human
}

/**
 * Triage user message to determine which agent should handle it
 */
export async function triageMessage(params: {
  userId: number;
  conversationId: number;
  messageContent: string;
  conversationContext?: string; // RFQ title, supplier name, etc.
}): Promise<TriageResult> {
  const { userId, conversationId, messageContent, conversationContext } = params;

  // Check if user explicitly requests human contact
  const humanRequestKeywords = [
    "talk to a human",
    "speak to someone",
    "real person",
    "human help",
    "contact support",
    "escalate",
    "speak to representative",
  ];

  const lowerMessage = messageContent.toLowerCase();
  const requestsHuman = humanRequestKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  if (requestsHuman) {
    return {
      agentType: "support",
      confidence: 100,
      reasoning: "User explicitly requested human contact",
      shouldHandoff: true,
    };
  }

  // Use LLM to classify message intent
  const systemPrompt = `You are Otto, a triage agent for GreenChainz, a B2B sustainable materials marketplace.

Your job is to classify user messages into one of these categories:

1. **material** - Questions about:
   - Material properties, specifications, EPD data
   - CCPS scores, carbon footprint, certifications
   - Material comparisons, alternatives, recommendations
   - Embodied carbon, GWP values, sustainability metrics

2. **rfq** - Questions about:
   - Requesting quotes, pricing, lead times
   - Supplier matching, bid submissions
   - RFQ workflow, status, timeline
   - Project requirements, material quantities

3. **supplier** - Questions about:
   - Specific supplier capabilities, products
   - Supplier contact, communication
   - Supplier certifications, capacity
   - Direct supplier inquiries

4. **support** - Questions about:
   - Account issues, billing, subscriptions
   - Platform navigation, technical issues
   - General help, how-to questions
   - Complaints, feedback

${conversationContext ? `\nConversation Context: ${conversationContext}` : ""}

Respond with JSON only:
{
  "agentType": "material" | "rfq" | "supplier" | "support",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "triage_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              agentType: {
                type: "string",
                enum: ["material", "rfq", "supplier", "support"],
                description: "The agent type to route to",
              },
              confidence: {
                type: "number",
                description: "Confidence score 0-100",
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of classification",
              },
            },
            required: ["agentType", "confidence", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    return {
      agentType: result.agentType,
      confidence: result.confidence,
      reasoning: result.reasoning,
      shouldHandoff: false,
    };
  } catch (error) {
    console.error("Triage LLM error:", error);
    // Default to support on error
    return {
      agentType: "support",
      confidence: 50,
      reasoning: "Triage classification failed, routing to support",
      shouldHandoff: false,
    };
  }
}

/**
 * Check if conversation should be handed off to human based on supplier rules
 */
export async function checkHandoffRules(params: {
  conversationId: number;
  supplierId: number;
  agentMessageCount: number;
}): Promise<{ shouldHandoff: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { shouldHandoff: false };

  const { conversationId, supplierId, agentMessageCount } = params;

  // Get supplier's handoff rules (if Premium)
  const rules = await db
    .select()
    .from(agentHandoffRules)
    .where(eq(agentHandoffRules.supplierId, supplierId))
    .limit(1);

  if (rules.length === 0) {
    // No rules = default hybrid mode with 5 message threshold
    if (agentMessageCount >= 5) {
      return {
        shouldHandoff: true,
        reason: "Agent message threshold reached (default: 5 messages)",
      };
    }
    return { shouldHandoff: false };
  }

  const rule = rules[0];

  // Check handoff mode
  if (rule.handoffMode === "immediate_human") {
    return {
      shouldHandoff: true,
      reason: "Supplier configured for immediate human handoff",
    };
  }

  if (rule.handoffMode === "always_agent") {
    return { shouldHandoff: false };
  }

  // Hybrid mode - check message threshold
  if (rule.handoffMode === "hybrid") {
    if (agentMessageCount >= rule.maxAgentMessages) {
      return {
        shouldHandoff: true,
        reason: `Agent message threshold reached (${rule.maxAgentMessages} messages)`,
      };
    }

    // Check business hours if enabled
    if (rule.businessHoursEnabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.toLocaleDateString("en-US", { weekday: "short" });

      const businessDays = rule.businessDays?.split(",") || [];
      const isBusinessDay = businessDays.includes(currentDay);

      if (isBusinessDay && rule.businessHoursStart && rule.businessHoursEnd) {
        const [startHour] = rule.businessHoursStart.split(":").map(Number);
        const [endHour] = rule.businessHoursEnd.split(":").map(Number);

        const isBusinessHours = currentHour >= startHour && currentHour < endHour;

        if (isBusinessHours) {
          return {
            shouldHandoff: true,
            reason: "Within business hours - human available",
          };
        }
      }
    }
  }

  return { shouldHandoff: false };
}

/**
 * Update conversation handoff status
 */
export async function updateHandoffStatus(params: {
  conversationId: number;
  handoffStatus: "agent" | "pending_handoff" | "human";
  handoffReason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { conversationId, handoffStatus, handoffReason } = params;

  await db
    .update(conversations)
    .set({
      handoffStatus,
      handoffRequestedAt: handoffStatus === "pending_handoff" ? new Date() : undefined,
      handoffReason,
    })
    .where(eq(conversations.id, conversationId));
}

/**
 * Increment agent message count for conversation
 */
export async function incrementAgentMessageCount(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conv = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (conv.length > 0) {
    await db
      .update(conversations)
      .set({
        agentMessageCount: conv[0].agentMessageCount + 1,
      })
      .where(eq(conversations.id, conversationId));
  }
}
