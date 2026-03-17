/**
 * Agent Response Handler
 * 
 * Generates responses from specialist AI agents based on triage routing
 */

import { invokeLLM } from "./_core/llm";
import type { AgentType } from "./agent-triage-service";

interface AgentContext {
  userId: number;
  conversationId: number;
  agentType: AgentType;
  messageHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  conversationContext?: string; // RFQ details, supplier info, etc.
  customPrompt?: string; // Custom agent prompt (for supplier agent)
}

/**
 * Generate agent response based on specialist type
 */
export async function generateAgentResponse(
  context: AgentContext
): Promise<string> {
  const { agentType, messageHistory, conversationContext, customPrompt } = context;

  const systemPrompts: Record<AgentType, string> = {
    material: `You are the Material Intelligence Agent for GreenChainz.

You help users understand sustainable building materials, including:
- Material specifications, properties, and performance data
- CCPS (Comprehensive Carbon Performance Score) breakdowns
- EPD (Environmental Product Declaration) data and embodied carbon
- Material certifications (LEED, FSC, Cradle to Cradle, etc.)
- Material comparisons and sustainable alternatives
- Fire ratings, thermal performance, VOC levels

Always provide:
- Specific data points (GWP values, CCPS scores, etc.)
- Certification details and compliance information
- Actionable recommendations for sustainable choices
- References to EPD data when available

Keep responses concise (2-3 paragraphs max). Use bullet points for lists.

${conversationContext ? `\nContext: ${conversationContext}` : ""}`,

    rfq: `You are the RFQ Assistant Agent for GreenChainz.

You help users with the quote request process:
- Guiding RFQ creation and material selection
- Explaining supplier matching and bid processes
- Answering questions about pricing, lead times, delivery
- Tracking RFQ status and timeline
- Helping compare and evaluate bids

Always provide:
- Clear next steps in the RFQ workflow
- Expected timelines and response times
- Tips for getting better bids (detailed specs, certifications, etc.)
- Supplier matching criteria explanations

Keep responses actionable and process-focused.

${conversationContext ? `\nContext: ${conversationContext}` : ""}`,

    supplier: customPrompt
      ? `${customPrompt}

${conversationContext ? `Context: ${conversationContext}` : ""}`
      : `You are a Supplier Agent for GreenChainz.

You represent a specific supplier and help buyers with:
- Product catalog and capabilities
- Certifications and compliance
- Pricing and lead time estimates
- Order capacity and availability
- Technical specifications and support

Always provide:
- Accurate supplier-specific information
- Clear product recommendations
- Transparent pricing and timeline expectations
- Next steps for placing orders or getting detailed quotes

Be professional, helpful, and sales-oriented without being pushy.

${conversationContext ? `\nContext: ${conversationContext}` : ""}`,

    support: `You are the Support Agent for GreenChainz.

You help users with:
- Platform navigation and features
- Account issues and settings
- Subscription and billing questions
- Technical troubleshooting
- General how-to guidance

Always provide:
- Clear step-by-step instructions
- Links to relevant help articles (when applicable)
- Escalation path if issue requires human intervention
- Friendly, patient, helpful tone

If you cannot resolve the issue, offer to connect the user with a human support representative.

${conversationContext ? `\nContext: ${conversationContext}` : ""}`,

    triage: `You are Otto, the triage agent for GreenChainz.

You help route users to the right specialist agent. This should rarely be used directly.

${conversationContext ? `\nContext: ${conversationContext}` : ""}`,
  };

  const systemPrompt = systemPrompts[agentType];

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        ...messageHistory,
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error(`Agent response error (${agentType}):`, error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again or request to speak with a human representative.";
  }
}

/**
 * Get agent display name and emoji
 */
export function getAgentDisplayInfo(agentType: AgentType): {
  name: string;
  emoji: string;
  badge: string;
} {
  const info: Record<
    AgentType,
    { name: string; emoji: string; badge: string }
  > = {
    material: {
      name: "Material Intelligence Agent",
      emoji: "🔬",
      badge: "Material Expert",
    },
    rfq: { name: "RFQ Assistant Agent", emoji: "📋", badge: "RFQ Assistant" },
    supplier: { name: "Supplier Agent", emoji: "🏭", badge: "Supplier Agent" },
    support: { name: "Support Agent", emoji: "💬", badge: "Support" },
    triage: { name: "Otto", emoji: "🤖", badge: "Otto" },
  };

  return info[agentType];
}
