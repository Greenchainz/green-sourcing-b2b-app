import { invokeLLM } from "./_core/llm";
import { getRegionalSwapPatterns, getClimateZoneAdjustments, getComplianceRulesForState } from "./location-service";
import { getDb } from "./db";

export interface MaterialRecommendation {
  originalMaterial: string;
  recommendedMaterial: string;
  carbonReduction: number;
  costDifference: number;
  leadTime: number;
  availability: string;
  complianceStatus: string;
  defensibilityScore: number;
  reason: string;
}

export interface ComplianceValidation {
  material: string;
  isCompliant: boolean;
  certifications: string[];
  missingCertifications: string[];
  state: string;
  buildingCode: string;
  notes: string;
}

/**
 * CARBON-OPTIMIZER Agent
 * Analyzes material swaps for carbon reduction potential
 */
export async function optimizeMaterialsForCarbon(
  rfqId: number,
  projectLocation: string,
  materials: string[]
): Promise<MaterialRecommendation[]> {
  
  // Extract state from project location
  const stateMatch = projectLocation.match(/([A-Z]{2})/);
  const state = stateMatch ? stateMatch[1] : "CA";
  
  // Get regional swap patterns and climate adjustments
  const [regionalPatterns, climateAdjustments] = await Promise.all([
    getRegionalSwapPatterns(state),
    getClimateZoneAdjustments(state, "general"),
  ]);

  const regionalContext = Array.isArray(regionalPatterns) 
    ? regionalPatterns.map((p: any) => `${p.originalMaterial} to ${p.alternativeMaterial} (${p.carbonReduction}% reduction)`).join("; ")
    : "No regional swap data available";
  
  const climateContext = Array.isArray(climateAdjustments)
    ? climateAdjustments.map((c: any) => `${c.materialType}: ${c.durabilityMultiplier}x durability`).join("; ")
    : "No climate adjustments available";

  const prompt = `You are a carbon optimization expert for sustainable building materials. Project Location: ${projectLocation}. Materials Needed: ${materials.join(", ")}. Regional Context - Typical swaps: ${regionalContext}. Climate zone adjustments: ${climateContext}. For each material, recommend ONE sustainable alternative that reduces embodied carbon by 20%+ compared to standard material, is available within 500 miles, meets local building codes, has similar or better performance, and is defensible to architects and building owners.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a carbon optimization expert. Always return valid JSON arrays.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "material_recommendations",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                originalMaterial: { type: "string" },
                recommendedMaterial: { type: "string" },
                carbonReduction: { type: "number" },
                costDifference: { type: "number" },
                leadTime: { type: "number" },
                availability: { type: "string" },
                complianceStatus: { type: "string" },
                defensibilityScore: { type: "number" },
                reason: { type: "string" },
              },
              required: [
                "originalMaterial",
                "recommendedMaterial",
                "carbonReduction",
                "costDifference",
                "leadTime",
                "availability",
                "complianceStatus",
                "defensibilityScore",
                "reason",
              ],
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.error("CARBON-OPTIMIZER error:", error);
    return [];
  }
}

/**
 * COMPLIANCE-VALIDATOR Agent
 * Validates materials against state-specific building codes
 */
export async function validateMaterialCompliance(
  materials: string[],
  state: string
): Promise<ComplianceValidation[]> {
  // Get state-specific compliance rules
  const complianceRules = await getComplianceRulesForState(state);
  
  const rulesContext = Array.isArray(complianceRules)
    ? complianceRules.map((r: any) => `${r.ruleName}: ${r.ruleDescription}`).join("; ")
    : "No state-specific rules available";

  const prompt = `You are a building code compliance expert specializing in sustainable materials. State: ${state}. Materials to Validate: ${materials.join(", ")}. State Building Code Requirements: ${rulesContext}. For each material, validate compliance with state building codes (IBC, state-specific amendments), LEED certification requirements, local sustainability standards, and fire ratings and safety standards.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a building code expert. Always return valid JSON arrays.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "compliance_validations",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                material: { type: "string" },
                isCompliant: { type: "boolean" },
                certifications: {
                  type: "array",
                  items: { type: "string" },
                },
                missingCertifications: {
                  type: "array",
                  items: { type: "string" },
                },
                state: { type: "string" },
                buildingCode: { type: "string" },
                notes: { type: "string" },
              },
              required: [
                "material",
                "isCompliant",
                "certifications",
                "missingCertifications",
                "state",
                "buildingCode",
                "notes",
              ],
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.error("COMPLIANCE-VALIDATOR error:", error);
    return [];
  }
}

/**
 * RFQ Enrichment Pipeline
 * Runs both agents on RFQ materials for complete analysis
 */
export async function enrichRfqWithAiAnalysis(
  rfqId: number,
  projectLocation: string,
  materials: string[]
): Promise<{
  recommendations: MaterialRecommendation[];
  compliance: ComplianceValidation[];
  score: number;
}> {
  const stateMatch = projectLocation.match(/([A-Z]{2})/);
  const state = stateMatch ? stateMatch[1] : "CA";

  // Run both agents in parallel
  const [recommendations, compliance] = await Promise.all([
    optimizeMaterialsForCarbon(rfqId, projectLocation, materials),
    validateMaterialCompliance(materials, state),
  ]);

  // Calculate overall sustainability score
  const avgCarbonReduction =
    recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.carbonReduction, 0) / recommendations.length
      : 0;

  const complianceRate =
    compliance.length > 0
      ? (compliance.filter((c) => c.isCompliant).length / compliance.length) * 100
      : 0;

  const score = Math.round((avgCarbonReduction * 0.6 + complianceRate * 0.4) / 2);

  return {
    recommendations,
    compliance,
    score: Math.min(100, score),
  };
}
