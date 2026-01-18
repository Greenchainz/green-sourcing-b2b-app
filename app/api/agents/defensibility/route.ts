import { NextRequest, NextResponse } from 'next/server';
import {
  performDefensibilityCheck,
  compareProducts,
  generateRejectionMemo,
} from '@/lib/agents/defensibility-agent';
import type {
  DefensibilityResult,
  ProductData,
  ProductComparison,
  RejectionMemo,
  OrEqualResponse,
} from '@/lib/types/defensibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request body for defensibility check
 */
interface DefensibilityCheckRequest {
  /** Action type: 'check' for single product, 'compare' for Or-Equal evaluation */
  action: 'check' | 'compare';
  /** For 'check' action - document content to analyze */
  documentContent?: string;
  /** For 'check' action - product name */
  productName?: string;
  /** For 'check' action - manufacturer name */
  manufacturer?: string;
  /** For 'compare' action - original product data */
  original?: ProductData;
  /** For 'compare' action - substitute product data */
  substitute?: ProductData;
  /** For 'compare' action - project context for rejection memo */
  projectContext?: {
    projectName: string;
    specSection: string;
    architect: string;
  };
}

/**
 * POST /api/agents/defensibility
 *
 * Performs defensibility analysis (anti-value engineering) on products.
 *
 * Actions:
 * 1. 'check' - Analyze a single product's defensibility
 * 2. 'compare' - Compare original vs substitute for "Or Equal" evaluation
 *
 * Request body:
 * - action: 'check' | 'compare'
 * - For 'check':
 *   - documentContent: Raw document text
 *   - productName: Product name
 *   - manufacturer: Manufacturer name
 * - For 'compare':
 *   - original: ProductData object
 *   - substitute: ProductData object
 *   - projectContext: (optional) Project details for memo
 */
export async function POST(request: NextRequest) {
  try {
    const body: DefensibilityCheckRequest = await request.json();

    const { action } = body;

    if (!action || !['check', 'compare'].includes(action)) {
      return NextResponse.json(
        { error: "Missing or invalid 'action' field. Must be 'check' or 'compare'" },
        { status: 400 }
      );
    }

    if (action === 'check') {
      return handleDefensibilityCheck(body);
    } else {
      return handleProductComparison(body);
    }
  } catch (error) {
    console.error('❌ Defensibility analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage, details: 'Check server logs for details' },
      { status: 500 }
    );
  }
}

/**
 * Handle single product defensibility check
 */
async function handleDefensibilityCheck(
  body: DefensibilityCheckRequest
): Promise<NextResponse> {
  const { documentContent, productName, manufacturer } = body;

  if (!documentContent || typeof documentContent !== 'string') {
    return NextResponse.json(
      { error: "Missing required field: 'documentContent' for check action" },
      { status: 400 }
    );
  }

  if (!productName || typeof productName !== 'string') {
    return NextResponse.json(
      { error: "Missing required field: 'productName' for check action" },
      { status: 400 }
    );
  }

  if (!manufacturer || typeof manufacturer !== 'string') {
    return NextResponse.json(
      { error: "Missing required field: 'manufacturer' for check action" },
      { status: 400 }
    );
  }

  console.log(`🛡️ Performing defensibility check for ${productName} by ${manufacturer}`);

  const result: DefensibilityResult = performDefensibilityCheck(
    documentContent,
    productName,
    manufacturer
  );

  console.log(
    `✅ Defensibility check complete: ${result.isDefensible ? 'Defensible' : 'Vulnerable'} (Score: ${result.defensibilityScore})`
  );

  return NextResponse.json(result);
}

/**
 * Handle product comparison (Or-Equal evaluation)
 */
async function handleProductComparison(
  body: DefensibilityCheckRequest
): Promise<NextResponse> {
  const { original, substitute, projectContext } = body;

  if (!original) {
    return NextResponse.json(
      { error: "Missing required field: 'original' product data for compare action" },
      { status: 400 }
    );
  }

  if (!substitute) {
    return NextResponse.json(
      { error: "Missing required field: 'substitute' product data for compare action" },
      { status: 400 }
    );
  }

  // Validate product data structure
  if (!isValidProductData(original)) {
    return NextResponse.json(
      { error: "'original' product data is incomplete or invalid" },
      { status: 400 }
    );
  }

  if (!isValidProductData(substitute)) {
    return NextResponse.json(
      { error: "'substitute' product data is incomplete or invalid" },
      { status: 400 }
    );
  }

  console.log(
    `⚖️ Comparing products: ${original.productName} vs ${substitute.productName}`
  );

  const comparison: ProductComparison = compareProducts(original, substitute);

  const response: OrEqualResponse = {
    comparison,
    verdict: comparison.overallVerdict,
  };

  // Generate rejection memo if verdict is Reject
  if (comparison.overallVerdict === 'Reject') {
    const memo: RejectionMemo = generateRejectionMemo(comparison, projectContext);
    response.rejectionMemo = memo;
  } else if (comparison.overallVerdict === 'Review') {
    response.reviewNotes = comparison.reasons.join('\n');
  }

  console.log(`✅ Product comparison complete: ${response.verdict}`);

  return NextResponse.json(response);
}

/**
 * Validate ProductData structure
 */
function isValidProductData(data: unknown): data is ProductData {
  if (!data || typeof data !== 'object') return false;

  const pd = data as ProductData;

  return (
    typeof pd.productName === 'string' &&
    typeof pd.manufacturer === 'string' &&
    typeof pd.certificates === 'object' &&
    pd.certificates !== null &&
    typeof pd.epdMetrics === 'object' &&
    pd.epdMetrics !== null &&
    typeof pd.healthMetrics === 'object' &&
    pd.healthMetrics !== null
  );
}

/**
 * GET /api/agents/defensibility
 *
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agents/defensibility',
    description: 'Defensibility analysis (anti-value engineering) for products',
    methods: ['POST', 'GET'],
    actions: {
      check: {
        description: 'Analyze single product defensibility from document',
        requiredFields: ['documentContent', 'productName', 'manufacturer'],
        response: 'DefensibilityResult',
      },
      compare: {
        description: 'Compare original vs substitute for Or-Equal evaluation',
        requiredFields: ['original', 'substitute'],
        optionalFields: ['projectContext'],
        response: 'OrEqualResponse with optional RejectionMemo',
      },
    },
    productDataFormat: {
      productName: 'string',
      manufacturer: 'string',
      certificates: {
        hasCDPHv12: 'boolean',
        hasVerifiedEPD: 'boolean',
        cdphCertificateNumber: 'string (optional)',
        epdNumber: 'string (optional)',
      },
      epdMetrics: {
        globalWarmingPotential: 'number (optional) - kg CO2 eq',
        recycledContent: 'number (optional) - percentage',
      },
      healthMetrics: {
        vocEmissions: 'number (optional) - μg/m³',
        formaldehydeEmissions: 'number (optional) - μg/m³',
        compliance: "'Pass' | 'Fail' | 'Unknown' (optional)",
      },
    },
    verdicts: ['Acceptable', 'Review', 'Reject'],
  });
}
