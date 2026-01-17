import { NextRequest, NextResponse } from 'next/server';
import {
  extractDecisionLogic,
  extractDecisionCriteria,
  validateDecisionLogic,
} from '@/lib/agents/decision-logic-extractor';
import type { DecisionLogicResult, MaterialCategory } from '@/lib/types/decision-logic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request body for decision logic extraction
 */
interface DecisionLogicRequest {
  /** Raw document content to analyze */
  documentContent: string;
  /** Optional: Pre-detected material category to skip detection */
  materialCategory?: MaterialCategory;
}

/**
 * POST /api/agents/decision-logic
 *
 * Extracts material-specific decision criteria from product documentation.
 * Used to enhance search with role-based filtering and product evaluation.
 *
 * Request body:
 * - documentContent: Raw text content from document
 * - materialCategory: (optional) Pre-detected category to skip detection
 *
 * Response:
 * - materialCategory: Detected/provided category
 * - targetRoles: Stakeholder roles for this material
 * - decisionCriteria: Category-specific criteria
 * - relevanceScore: High/Medium/Low
 * - missingCriteria: List of missing criteria
 * - validationNotes: Validation summary
 */
export async function POST(request: NextRequest) {
  try {
    const body: DecisionLogicRequest = await request.json();

    const { documentContent, materialCategory: providedCategory } = body;

    if (!documentContent || typeof documentContent !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: documentContent must be a non-empty string' },
        { status: 400 }
      );
    }

    if (documentContent.length < 50) {
      return NextResponse.json(
        { error: 'Document content too short for meaningful analysis (minimum 50 characters)' },
        { status: 400 }
      );
    }

    console.log(`🔍 Extracting decision logic from ${documentContent.length} characters of content`);

    let result: DecisionLogicResult;

    if (providedCategory && providedCategory !== 'Unknown') {
      // Use provided category - skip detection
      const decisionCriteria = extractDecisionCriteria(documentContent, providedCategory);
      const { relevanceScore, missingCriteria, validationNotes } = validateDecisionLogic(
        providedCategory,
        decisionCriteria
      );

      const { TARGET_ROLES } = await import('@/lib/types/decision-logic');
      const targetRoles = TARGET_ROLES[providedCategory] || [];

      result = {
        materialCategory: providedCategory,
        targetRoles,
        decisionCriteria,
        relevanceScore,
        missingCriteria,
        validationNotes,
      };
    } else {
      // Full extraction with category detection
      result = extractDecisionLogic(documentContent);
    }

    console.log(`✅ Decision logic extracted: ${result.materialCategory} (${result.relevanceScore})`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Decision logic extraction error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage, details: 'Check server logs for details' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/decision-logic
 *
 * Returns API documentation and supported material categories
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agents/decision-logic',
    description: 'Extract material-specific decision criteria from product documentation',
    methods: ['POST', 'GET'],
    supportedCategories: ['Flooring', 'Insulation', 'Facade', 'Structure'],
    criteriaTypes: {
      Flooring: ['noStripping', 'polishOnly', 'adhesiveFree', 'cleaningProtocol', 'maintenanceCycleMonths'],
      Insulation: ['nonCombustible', 'mineralWool', 'fireResistanceRating', 'flameSpreadIndex', 'smokeDevelopedIndex'],
      Facade: ['nonCombustible', 'mineralWool', 'fireResistanceRating', 'flameSpreadIndex', 'smokeDevelopedIndex'],
      Structure: ['lightweight', 'speedOfInstall', 'weightPerSqFt', 'specialToolsRequired'],
    },
    requestBody: {
      documentContent: 'string (required) - Raw text content from document',
      materialCategory: 'string (optional) - Pre-detected material category',
    },
    responseFormat: {
      materialCategory: 'Flooring | Insulation | Facade | Structure | Unknown',
      targetRoles: 'string[] - Stakeholder roles for this material',
      decisionCriteria: 'object - Category-specific criteria',
      relevanceScore: 'High | Medium | Low',
      missingCriteria: 'string[] - Missing criteria for full relevance',
      validationNotes: 'string - Validation summary',
    },
  });
}
