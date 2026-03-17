/**
 * GreenChainz ChainBot Agent System
 *
 * Handoff orchestration pattern:
 *   1. Router classifies intent → delegates to specialist
 *   2. Specialist uses tools (DB queries, CCPS engine) to answer
 *   3. Conversation stored for analytics and context
 *
 * MVP agents: materials, rfq, support
 */

import { invokeLLM } from "./_core/llm";
import type { Message } from "./_core/llm";
import { getDb } from "./db";
import {
  materials,
  manufacturers,
  assemblies,
  assemblyComponents,
  ccpsBaselines,
  decisionMakerPersonas,
  materialCertifications,
  agentConversations,
  agentAnalytics,
} from "../drizzle/schema";
import { eq, like, and, or, asc, sql, desc } from "drizzle-orm";
import { calculateCcps, personaToWeights, calcCarbonDelta } from "./ccps-engine";
import type { PersonaWeights } from "./ccps-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatContext {
  currentPage: string;
  materialId?: number;
  assemblyId?: number;
  cartItems?: number[];
  projectName?: string;
  projectLocation?: string;
  userPersona?: string;
  userName?: string;
}

interface RouterResult {
  agent: "materials" | "rfq" | "compliance" | "support";
  confidence: number;
  reasoning: string;
}

interface AgentResponse {
  content: string;
  agent: string;
  toolsUsed: string[];
  escalated: boolean;
}

// ─── Tool Implementations ───────────────────────────────────────────────────

async function toolSearchMaterials(query: string, category?: string, limit = 5): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  const conditions: any[] = [];
  if (query) {
    conditions.push(
      or(
        like(materials.name, `%${query}%`),
        like(materials.productName, `%${query}%`),
        like(materials.category, `%${query}%`)
      )
    );
  }
  if (category) conditions.push(eq(materials.category, category));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: materials.id,
      name: materials.name,
      productName: materials.productName,
      category: materials.category,
      gwpValue: materials.gwpValue,
      embodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
      pricePerUnit: materials.pricePerUnit,
      priceUnit: materials.priceUnit,
      hasEpd: materials.hasEpd,
      leadTimeDays: materials.leadTimeDays,
      manufacturerName: manufacturers.name,
    })
    .from(materials)
    .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
    .where(whereClause)
    .limit(limit);

  if (rows.length === 0) return `No materials found matching "${query}".`;

  const baselineRows = await db.select().from(ccpsBaselines);
  const baselineMap: Record<string, any> = {};
  for (const b of baselineRows) baselineMap[b.category] = b;

  const results = rows.map((r) => {
    const baseline = baselineMap[r.category] || {};
    const ccps = calculateCcps(r as any, baseline);
    return {
      id: r.id,
      name: r.name,
      product: r.productName,
      manufacturer: r.manufacturerName,
      category: r.category,
      gwp: r.gwpValue,
      ec1000sf: r.embodiedCarbonPer1000sf,
      price: `${r.pricePerUnit} ${r.priceUnit}`,
      leadTime: `${r.leadTimeDays} days`,
      ccpsScore: ccps.ccpsTotal,
      hasEPD: r.hasEpd ? "Yes" : "No",
    };
  });

  return JSON.stringify(results, null, 2);
}

async function toolGetMaterialDetail(materialId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  const rows = await db
    .select({
      material: materials,
      manufacturerName: manufacturers.name,
      manufacturerWebsite: manufacturers.website,
    })
    .from(materials)
    .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
    .where(eq(materials.id, materialId))
    .limit(1);

  if (rows.length === 0) return `Material with ID ${materialId} not found.`;

  const mat = rows[0].material;
  const certs = await db
    .select()
    .from(materialCertifications)
    .where(eq(materialCertifications.materialId, materialId));

  const baselineRows = await db
    .select()
    .from(ccpsBaselines)
    .where(eq(ccpsBaselines.category, mat.category))
    .limit(1);
  const baseline = baselineRows[0] || {};
  const ccps = calculateCcps(mat, baseline);

  return JSON.stringify({
    id: mat.id,
    name: mat.name,
    product: mat.productName,
    manufacturer: rows[0].manufacturerName,
    website: rows[0].manufacturerWebsite,
    category: mat.category,
    gwp: `${mat.gwpValue} ${mat.gwpUnit}`,
    embodiedCarbon: `${mat.embodiedCarbonPer1000sf} kgCO2e/1000SF`,
    price: `${mat.pricePerUnit} ${mat.priceUnit}`,
    leadTime: `${mat.leadTimeDays} days`,
    fireRating: mat.fireRating,
    rValue: mat.rValue,
    recycledContent: `${mat.recycledContentPct}%`,
    vocLevel: mat.vocLevel,
    usManufactured: mat.usManufactured ? "Yes" : "No",
    certifications: {
      EPD: mat.hasEpd ? "Yes" : "No",
      HPD: mat.hasHpd ? "Yes" : "No",
      FSC: mat.hasFsc ? "Yes" : "No",
      C2C: mat.hasC2c ? "Yes" : "No",
      GREENGUARD: mat.hasGreenguard ? "Yes" : "No",
      Declare: mat.hasDeclare ? "Yes" : "No",
    },
    ccps: {
      total: ccps.ccpsTotal,
      carbon: ccps.carbonScore,
      compliance: ccps.complianceScore,
      certification: ccps.certificationScore,
      cost: ccps.costScore,
      supplyChain: ccps.supplyChainScore,
      health: ccps.healthScore,
      sourcingDifficulty: ccps.sourcingDifficulty,
    },
    additionalCerts: certs.map((c) => ({
      name: c.certificationName,
      body: c.issuingBody,
      number: c.certificationNumber,
    })),
  }, null, 2);
}

async function toolFindAlternatives(materialId: number, limit = 5): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  const orig = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  if (orig.length === 0) return `Material with ID ${materialId} not found.`;

  const origMat = orig[0];
  const altRows = await db
    .select({
      material: materials,
      manufacturerName: manufacturers.name,
    })
    .from(materials)
    .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
    .where(and(eq(materials.category, origMat.category), sql`${materials.id} != ${materialId}`))
    .limit(limit);

  const baselineRows = await db
    .select()
    .from(ccpsBaselines)
    .where(eq(ccpsBaselines.category, origMat.category))
    .limit(1);
  const baseline = baselineRows[0] || {};

  const alternatives = altRows.map((r) => {
    const ccps = calculateCcps(r.material, baseline);
    const delta = calcCarbonDelta(
      Number(origMat.embodiedCarbonPer1000sf) || 0,
      Number(r.material.embodiedCarbonPer1000sf) || 0
    );
    return {
      id: r.material.id,
      name: r.material.name,
      manufacturer: r.manufacturerName,
      ccpsScore: ccps.ccpsTotal,
      carbonDelta: `${delta.deltaPct}%`,
      carbonSaved: `${delta.delta} kgCO2e/1000SF`,
      price: `${r.material.pricePerUnit} ${r.material.priceUnit}`,
      leadTime: `${r.material.leadTimeDays} days`,
    };
  });

  return JSON.stringify({
    original: {
      id: origMat.id,
      name: origMat.name,
      ec1000sf: origMat.embodiedCarbonPer1000sf,
    },
    alternatives,
  }, null, 2);
}

async function toolGetAssemblyInfo(assemblyId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  const rows = await db.select().from(assemblies).where(eq(assemblies.id, assemblyId)).limit(1);
  if (rows.length === 0) return `Assembly with ID ${assemblyId} not found.`;

  const components = await db
    .select({
      layerName: assemblyComponents.layerName,
      layerOrder: assemblyComponents.layerOrder,
      materialName: materials.name,
      productName: materials.productName,
    })
    .from(assemblyComponents)
    .leftJoin(materials, eq(assemblyComponents.materialId, materials.id))
    .where(eq(assemblyComponents.assemblyId, assemblyId))
    .orderBy(asc(assemblyComponents.layerOrder));

  const asm = rows[0];
  return JSON.stringify({
    id: asm.id,
    name: asm.name,
    code: asm.code,
    type: asm.assemblyType,
    tier: asm.sustainabilityTier,
    totalGwp: `${asm.totalGwpPer1000Sqft} kgCO2e/1000SF`,
    components: components.map((c) => ({
      layer: c.layerOrder,
      name: c.layerName,
      material: c.materialName,
      product: c.productName,
    })),
  }, null, 2);
}

async function toolListAssemblies(): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  const rows = await db
    .select()
    .from(assemblies)
    .orderBy(asc(assemblies.totalGwpPer1000Sqft));

  return JSON.stringify(
    rows.map((a) => ({
      id: a.id,
      name: a.name,
      code: a.code,
      type: a.assemblyType,
      tier: a.sustainabilityTier,
      gwp: `${a.totalGwpPer1000Sqft} kgCO2e/1000SF`,
    })),
    null,
    2
  );
}

async function toolSuggestMaterialSwaps(materialId: number, limit = 5): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  // Import material swap service
  const { findSwapCandidates, getSavedSwaps } = await import('./material-swap-service');

  try {
    // First, check for saved swap recommendations
    const savedSwaps = await getSavedSwaps(materialId);
    
    if (savedSwaps.length > 0) {
      // Use pre-computed swaps from database
      const swapsWithDetails = await Promise.all(
        savedSwaps.slice(0, limit).map(async (swap) => {
          const swapMaterial = await db
            .select({
              material: materials,
              manufacturerName: manufacturers.name,
            })
            .from(materials)
            .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
            .where(eq(materials.id, swap.materialId))
            .limit(1);

          if (swapMaterial.length === 0) return null;

          const mat = swapMaterial[0].material;
          return {
            id: mat.id,
            name: mat.name,
            manufacturer: swapMaterial[0].manufacturerName,
            tier: swap.swapTier,
            score: swap.swapScore,
            confidence: `${(Number(swap.confidence) * 100).toFixed(0)}%`,
            reason: swap.swapReason,
            embodiedCarbon: `${mat.embodiedCarbonPer1000sf} kgCO2e/1000SF`,
            price: `${mat.pricePerUnit} ${mat.priceUnit}`,
            leadTime: `${mat.leadTimeDays} days`,
            source: "saved",
          };
        })
      );

      const validSwaps = swapsWithDetails.filter((s) => s !== null);
      if (validSwaps.length > 0) {
        return JSON.stringify({
          source: "saved_recommendations",
          materialId,
          swaps: validSwaps,
        }, null, 2);
      }
    }

    // If no saved swaps, calculate on-the-fly
    const candidates = await findSwapCandidates(materialId, limit);
    
    if (candidates.length === 0) {
      return JSON.stringify({
        source: "algorithm",
        materialId,
        message: "No suitable swap candidates found. The material may already be optimal for its category.",
        swaps: [],
      }, null, 2);
    }

    const swapsWithDetails = await Promise.all(
      candidates.map(async (candidate) => {
        const swapMaterial = await db
          .select({
            material: materials,
            manufacturerName: manufacturers.name,
          })
          .from(materials)
          .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
          .where(eq(materials.id, candidate.materialId))
          .limit(1);

        if (swapMaterial.length === 0) return null;

        const mat = swapMaterial[0].material;
        return {
          id: mat.id,
          name: mat.name,
          manufacturer: swapMaterial[0].manufacturerName,
          tier: candidate.swapTier,
          score: candidate.swapScore,
          confidence: `${(candidate.confidence * 100).toFixed(0)}%`,
          reason: candidate.swapReason,
          embodiedCarbon: `${mat.embodiedCarbonPer1000sf} kgCO2e/1000SF`,
          price: `${mat.pricePerUnit} ${mat.priceUnit}`,
          leadTime: `${mat.leadTimeDays} days`,
          source: "algorithm",
        };
      })
    );

    const validSwaps = swapsWithDetails.filter((s) => s !== null);
    return JSON.stringify({
      source: "algorithm",
      materialId,
      swaps: validSwaps,
    }, null, 2);
  } catch (error: any) {
    return `Error finding material swaps: ${error.message}`;
  }
}

async function toolCompareMaterials(id1: number, id2: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable.";

  const rows = await db
    .select({ material: materials, manufacturerName: manufacturers.name })
    .from(materials)
    .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
    .where(or(eq(materials.id, id1), eq(materials.id, id2)));

  if (rows.length < 2) return "Could not find both materials for comparison.";

  const baselineRows = await db.select().from(ccpsBaselines);
  const baselineMap: Record<string, any> = {};
  for (const b of baselineRows) baselineMap[b.category] = b;

  const compared = rows.map((r) => {
    const baseline = baselineMap[r.material.category] || {};
    const ccps = calculateCcps(r.material, baseline);
    return {
      id: r.material.id,
      name: r.material.name,
      manufacturer: r.manufacturerName,
      category: r.material.category,
      gwp: r.material.gwpValue,
      ec1000sf: r.material.embodiedCarbonPer1000sf,
      price: `${r.material.pricePerUnit} ${r.material.priceUnit}`,
      ccps: ccps.ccpsTotal,
      breakdown: ccps,
    };
  });

  const delta = calcCarbonDelta(
    Number(compared[0].ec1000sf) || 0,
    Number(compared[1].ec1000sf) || 0
  );

  return JSON.stringify({ materials: compared, carbonDelta: delta }, null, 2);
}

// ─── Tool Definitions for LLM Function Calling ─────────────────────────────

const MATERIAL_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_materials",
      description: "Search the GreenChainz material database by keyword, category, or product name. Returns materials with CCPS scores.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (material name, category, or product)" },
          category: { type: "string", description: "Filter by assembly category (e.g., 'Curtain Wall', 'Insulation')" },
          limit: { type: "number", description: "Max results to return (default 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_material_detail",
      description: "Get full details for a specific material including CCPS breakdown, certifications, and manufacturer info.",
      parameters: {
        type: "object",
        properties: {
          material_id: { type: "number", description: "The material ID" },
        },
        required: ["material_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_alternatives",
      description: "Find sustainable alternatives for a given material, ranked by CCPS score with carbon delta calculations.",
      parameters: {
        type: "object",
        properties: {
          material_id: { type: "number", description: "The original material ID to find alternatives for" },
          limit: { type: "number", description: "Max alternatives to return (default 5)" },
        },
        required: ["material_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "suggest_material_swaps",
      description: "Get intelligent material swap recommendations with Good/Better/Best tier rankings. Uses pre-computed swaps from the Material Intelligence system or calculates on-the-fly. Returns swap score (0-100), confidence level, tier classification, and business-relevant data (carbon, price, lead time). Ideal for presenting architects with drop-in replacement options.",
      parameters: {
        type: "object",
        properties: {
          material_id: { type: "number", description: "The material ID to find swaps for" },
          limit: { type: "number", description: "Max swap recommendations to return (default 5)" },
        },
        required: ["material_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_materials",
      description: "Compare two materials side-by-side with CCPS scores and carbon delta.",
      parameters: {
        type: "object",
        properties: {
          material_id_1: { type: "number", description: "First material ID" },
          material_id_2: { type: "number", description: "Second material ID" },
        },
        required: ["material_id_1", "material_id_2"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_assembly_info",
      description: "Get details about a specific building assembly including components and embodied carbon.",
      parameters: {
        type: "object",
        properties: {
          assembly_id: { type: "number", description: "The assembly ID" },
        },
        required: ["assembly_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_assemblies",
      description: "List all available building assemblies ranked by embodied carbon (lowest first).",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ─── Agent System Prompts ───────────────────────────────────────────────────

function getMaterialsSystemPrompt(context: ChatContext): string {
  let contextStr = "";
  if (context.materialId) contextStr += `\nThe user is currently viewing material ID ${context.materialId}.`;
  if (context.assemblyId) contextStr += `\nThe user is currently viewing assembly ID ${context.assemblyId}.`;
  if (context.cartItems?.length) contextStr += `\nThe user has ${context.cartItems.length} items in their RFQ cart (material IDs: ${context.cartItems.join(", ")}).`;
  if (context.userPersona && context.userPersona !== "default") contextStr += `\nThe user's role is: ${context.userPersona}.`;
  if (context.userName) contextStr += `\nThe user's name is: ${context.userName}.`;
  if (context.projectName) contextStr += `\nActive project: ${context.projectName}${context.projectLocation ? ` in ${context.projectLocation}` : ""}.`;

  return `You are ChainBot, the Material Intelligence specialist for GreenChainz — the B2B sustainable building materials platform.

You help architects, LEED APs, spec writers, and procurement officers find, compare, and evaluate sustainable building materials.

KEY PRINCIPLES:
- Decision-makers don't buy green to save the planet. They buy green because the alternative (inefficiency, toxicity, non-compliance) is a quantifiable financial liability.
- Always present data in terms the user's persona cares about:
  * Architects → Carbon Delta + Code Compliance + Liability
  * LEED APs → Certification coverage + LEED credit contribution
  * GC PMs → Cost + Lead Time + Regional Availability
  * Spec Writers → EPD validity + ASTM standards + Fire Rating
- When comparing materials, always show the Carbon Delta (% savings vs baseline).
- When recommending alternatives or swaps, explain WHY in business terms, not environmental terms.
- Use suggest_material_swaps to get intelligent Good/Better/Best tier recommendations with confidence scores. These are pre-computed or algorithm-generated drop-in replacements.
- Use find_alternatives for CCPS-based alternatives when you need carbon delta calculations.
- If you don't have data for a specific material, say so and suggest the user submit an RFQ to get supplier-verified data.
- Use the tools available to look up real data from the database. Never make up material data.
- Format responses clearly with key metrics highlighted. Use tables when comparing multiple materials.
- When the user asks about a material on the current page, use the material ID from context.
- Suggest adding materials to the RFQ cart when appropriate.
- If the user asks something outside your expertise (account issues, pricing plans, bugs), say "Let me connect you with our support team" and include ESCALATE in your response.

PROACTIVE SUGGESTIONS:
- When the user is viewing a material (materialId in context), ALWAYS check its embodied carbon first using get_material_detail.
- If embodied carbon > 50 kgCO2e/1000SF, proactively suggest swaps using suggest_material_swaps WITHOUT waiting for the user to ask.
- Frame proactive suggestions in business terms: "I noticed this material has high embodied carbon (X kgCO2e/1000SF), which could impact your LEED certification and increase project liability. Would you like to see lower-carbon alternatives that meet the same specs?"
- For materials with embodied carbon 30-50 kgCO2e/1000SF, mention it's "moderate" and offer swaps if the user seems interested in optimization.
- For materials < 30 kgCO2e/1000SF, acknowledge it's already low-carbon and focus on other factors (cost, lead time, certifications).
${contextStr}`;
}

function getRfqSystemPrompt(context: ChatContext): string {
  let contextStr = "";
  if (context.cartItems?.length) contextStr += `\nThe user has ${context.cartItems.length} items in their RFQ cart (material IDs: ${context.cartItems.join(", ")}).`;
  if (context.projectName) contextStr += `\nActive project: ${context.projectName}${context.projectLocation ? ` in ${context.projectLocation}` : ""}.`;
  if (context.userName) contextStr += `\nThe user's name is: ${context.userName}.`;

  return `You are ChainBot's RFQ Assistant for GreenChainz. You help users build, validate, submit, and evaluate Requests for Quote for sustainable building materials.

KEY PRINCIPLES:
- An RFQ is not a form — it's a procurement document that represents real money and real project timelines. Treat every RFQ with the seriousness of a $500K purchase order.
- Always validate before submission: check fire ratings match, EPDs aren't expired, dimensional specs are compatible, and the assembly makes structural sense.
- When enriching an RFQ, add the Carbon Delta vs. conventional baseline — this is what makes the architect's case to the owner.
- If a supplier's response looks incomplete, suggest follow-up questions the user should ask.
- You can look up material details to validate cart items and provide enrichment data.
- Guide users through the RFQ process step by step.
- If the user asks something outside RFQ scope, say "Let me connect you with the right specialist" and include ESCALATE in your response.
${contextStr}`;
}

function getSupportSystemPrompt(context: ChatContext): string {
  return `You are ChainBot, the support assistant for GreenChainz — the B2B sustainable building materials platform.

You help users with:
- Platform navigation and how-to questions
- Account and profile settings
- Understanding CCPS scores and how the platform works
- General questions about sustainable building materials
- Connecting users with human support when needed

KEY PRINCIPLES:
- Be helpful, concise, and professional.
- If the user needs help with specific materials, comparisons, or RFQs, say "Let me connect you with our material specialist" and include ESCALATE in your response.
- If the user explicitly asks for a human, acknowledge it and say you'll connect them. Include HANDOFF in your response.
- GreenChainz is a B2B marketplace connecting architects and procurement officers with verified sustainable building materials.
- The CCPS (Composite Compliance-Performance Score) ranks materials 0-100 based on 6 factors: Carbon, Compliance, Certification, Cost, Supply Chain, and Health.
- Weights are adjusted based on the user's role (Architect, LEED AP, GC PM, Spec Writer).
${context.userName ? `\nThe user's name is: ${context.userName}.` : ""}`;
}

// ─── Router Agent ───────────────────────────────────────────────────────────

async function routeMessage(
  message: string,
  context: ChatContext,
  history: Array<{ role: string; content: string }>
): Promise<RouterResult> {
  // Fast keyword-based routing for obvious cases
  const lower = message.toLowerCase();
  if (lower.includes("talk to a human") || lower.includes("real person") || lower.includes("speak to someone")) {
    return { agent: "support", confidence: 1.0, reasoning: "User explicitly requested human support" };
  }

  // Context-based routing
  if (context.currentPage.startsWith("/rfq") || context.currentPage.startsWith("/cart")) {
    if (lower.includes("material") || lower.includes("alternative") || lower.includes("compare")) {
      // Material question on RFQ page — still route to materials
    } else {
      return { agent: "rfq", confidence: 0.85, reasoning: "User is on RFQ page" };
    }
  }

  // LLM-based classification for ambiguous cases
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a routing classifier for GreenChainz. Classify the user's message into one of these categories:
- MATERIALS: Questions about specific materials, comparisons, alternatives, carbon data, EPDs, certifications, assemblies, embodied carbon, insulation, glazing, etc.
- RFQ: Anything related to quotes, pricing, ordering, cart, suppliers, procurement, buying, requesting quotes
- SUPPORT: Account help, platform questions, bug reports, how-to, or anything that doesn't fit above

User is on page: ${context.currentPage}
${context.materialId ? `Viewing material ID: ${context.materialId}` : ""}
${context.assemblyId ? `Viewing assembly ID: ${context.assemblyId}` : ""}
${context.cartItems?.length ? `Has ${context.cartItems.length} items in cart` : ""}

Return ONLY a JSON object: {"agent": "materials|rfq|support", "confidence": 0.0-1.0, "reasoning": "..."}`,
        },
        { role: "user", content: message },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "router_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              agent: { type: "string", enum: ["materials", "rfq", "support"] },
              confidence: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["agent", "confidence", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(result.choices[0].message.content as string);
    return parsed as RouterResult;
  } catch (err) {
    // Fallback: route based on keywords
    if (lower.match(/material|carbon|epd|gwp|insulation|glazing|concrete|steel|wood|assembly|leed|certification|compare|alternative/)) {
      return { agent: "materials", confidence: 0.7, reasoning: "Keyword match: material-related terms" };
    }
    if (lower.match(/rfq|quote|price|order|cart|supplier|buy|procure/)) {
      return { agent: "rfq", confidence: 0.7, reasoning: "Keyword match: RFQ-related terms" };
    }
    return { agent: "support", confidence: 0.5, reasoning: "Default fallback" };
  }
}

// ─── Tool Execution ─────────────────────────────────────────────────────────

async function executeToolCall(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "search_materials":
      return toolSearchMaterials(args.query, args.category, args.limit);
    case "get_material_detail":
      return toolGetMaterialDetail(args.material_id);
    case "find_alternatives":
      return toolFindAlternatives(args.material_id, args.limit);
    case "suggest_material_swaps":
      return toolSuggestMaterialSwaps(args.material_id, args.limit);
    case "compare_materials":
      return toolCompareMaterials(args.material_id_1, args.material_id_2);
    case "get_assembly_info":
      return toolGetAssemblyInfo(args.assembly_id);
    case "list_assemblies":
      return toolListAssemblies();
    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Specialist Agent Execution ─────────────────────────────────────────────

async function runSpecialist(
  agentName: string,
  message: string,
  context: ChatContext,
  history: Array<{ role: string; content: string }>
): Promise<AgentResponse> {
  let systemPrompt: string;
  let tools = MATERIAL_TOOLS;

  switch (agentName) {
    case "materials":
      systemPrompt = getMaterialsSystemPrompt(context);
      break;
    case "rfq":
      systemPrompt = getRfqSystemPrompt(context);
      // RFQ agent also gets material tools for validation
      break;
    case "support":
    default:
      systemPrompt = getSupportSystemPrompt(context);
      tools = []; // Support agent doesn't need DB tools
      break;
  }

  // Build message history for LLM
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add recent conversation history (last 10 messages)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: "user", content: message });

  const toolsUsed: string[] = [];
  let maxIterations = 3; // Prevent infinite tool-calling loops

  while (maxIterations > 0) {
    const llmParams: any = { messages };
    if (tools.length > 0) {
      llmParams.tools = tools;
      llmParams.tool_choice = "auto";
    }

    const result = await invokeLLM(llmParams);
    const choice = result.choices[0];

    // Check if the model wants to call a tool
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      // Add assistant message with tool calls to history
      messages.push({
        role: "assistant",
        content: choice.message.content || "",
      });

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        toolsUsed.push(toolName);

        const toolResult = await executeToolCall(toolName, toolArgs);

        messages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: toolCall.id,
          name: toolName,
        });
      }

      maxIterations--;
      continue;
    }

    // No tool calls — we have the final response
    const content = typeof choice.message.content === "string"
      ? choice.message.content
      : Array.isArray(choice.message.content)
        ? choice.message.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join("")
        : "";

    const escalated = content.includes("ESCALATE") || content.includes("HANDOFF");

    return {
      content: content.replace(/ESCALATE|HANDOFF/g, "").trim(),
      agent: agentName,
      toolsUsed,
      escalated,
    };
  }

  // Fallback if max iterations reached
  return {
    content: "I've gathered the information but need a moment to process it. Could you rephrase your question?",
    agent: agentName,
    toolsUsed,
    escalated: false,
  };
}

// ─── Main Chat Handler ──────────────────────────────────────────────────────

export async function handleChat(
  message: string,
  sessionId: string,
  context: ChatContext,
  userId?: number
): Promise<AgentResponse> {
  const startTime = Date.now();
  const db = await getDb();

  // Load conversation history
  let history: Array<{ role: string; content: string }> = [];
  if (db) {
    const historyRows = await db
      .select({ role: agentConversations.role, content: agentConversations.content })
      .from(agentConversations)
      .where(eq(agentConversations.sessionId, sessionId))
      .orderBy(desc(agentConversations.createdAt))
      .limit(20);
    history = historyRows.reverse();
  }

  // Route the message
  const routing = await routeMessage(message, context, history);

  // Run the specialist
  let response = await runSpecialist(routing.agent, message, context, history);

  // Handle escalation — try next best agent
  if (response.escalated && routing.agent !== "support") {
    response = await runSpecialist("support", message, context, history);
  }

  // Store conversation
  if (db) {
    try {
      await db.insert(agentConversations).values([
        {
          userId: userId || null,
          sessionId,
          agent: routing.agent,
          role: "user",
          content: message,
          metadata: JSON.stringify(context),
        },
        {
          userId: userId || null,
          sessionId,
          agent: response.agent,
          role: "assistant",
          content: response.content,
          metadata: JSON.stringify({
            toolsUsed: response.toolsUsed,
            escalated: response.escalated,
            routingConfidence: routing.confidence,
          }),
        },
      ]);

      // Store analytics
      await db.insert(agentAnalytics).values({
        sessionId,
        agent: response.agent,
        intentClassified: routing.agent,
        confidence: String(routing.confidence) as any,
        toolsUsed: JSON.stringify(response.toolsUsed),
        responseTimeMs: Date.now() - startTime,
        escalated: response.escalated ? 1 : 0,
        handedOffToHuman: response.content.includes("connect you with") ? 1 : 0,
      });
    } catch (err) {
      console.error("Failed to store agent conversation:", err);
    }
  }

  return response;
}
