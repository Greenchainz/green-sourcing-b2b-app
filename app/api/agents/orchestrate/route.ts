import { NextRequest, NextResponse } from 'next/server';
import { extractDecisionLogic } from '@/lib/agents/decision-logic-extractor';
import {
  performDefensibilityCheck,
  extractCertificates,
  extractEPDMetrics,
  extractHealthMetrics,
} from '@/lib/agents/defensibility-agent';
import type { DecisionLogicResult } from '@/lib/types/decision-logic';
import type { DefensibilityResult, CertificateVerification, EPDMetrics, HealthMetrics } from '@/lib/types/defensibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Agent orchestration request
 */
interface OrchestrationRequest {
  /** Raw document content to analyze */
  documentContent: string;
  /** Product name */
  productName: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Agents to run (default: all) */
  agents?: ('decision-logic' | 'defensibility' | 'extraction')[];
}

/**
 * Orchestration result
 */
interface OrchestrationResult {
  /** Product identification */
  product: {
    name: string;
    manufacturer: string;
  };
  /** Decision logic extraction result (if requested) */
  decisionLogic?: DecisionLogicResult;
  /** Defensibility analysis result (if requested) */
  defensibility?: DefensibilityResult;
  /** Raw extraction results (if requested) */
  extraction?: {
    certificates: CertificateVerification;
    epdMetrics: EPDMetrics;
    healthMetrics: HealthMetrics;
  };
  /** Processing metadata */
  metadata: {
    agentsRequested: string[];
    agentsSucceeded: string[];
    agentsFailed: string[];
    agentsRun: string[];
    processingTimeMs: number;
    documentLengthChars: number;
  };
  /** Combined recommendations from all agents */
  recommendations: string[];
  /** Overall assessment */
  overallAssessment: {
    isDefensible: boolean;
    relevanceScore: string;
    strengths: string[];
    vulnerabilities: string[];
  };
}

/**
 * POST /api/agents/orchestrate
 *
 * Orchestrates multiple AI agents to analyze product documentation.
 * Runs decision logic extraction and defensibility analysis in parallel.
 *
 * Request body:
 * - documentContent: Raw text content from document
 * - productName: Product name
 * - manufacturer: Manufacturer name
 * - agents: (optional) Array of agents to run ['decision-logic', 'defensibility', 'extraction']
 *
 * Response:
 * - product: Product identification
 * - decisionLogic: Decision logic extraction result
 * - defensibility: Defensibility analysis result
 * - extraction: Raw extraction results
 * - metadata: Processing metadata
 * - recommendations: Combined recommendations
 * - overallAssessment: Unified assessment
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body: OrchestrationRequest = await request.json();

    const { documentContent, productName, manufacturer, agents } = body;

    // Validate required fields
    if (!documentContent || typeof documentContent !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: documentContent must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: productName must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!manufacturer || typeof manufacturer !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: manufacturer must be a non-empty string' },
        { status: 400 }
      );
    }

    // Determine which agents to run
    const agentsToRun = agents || ['decision-logic', 'defensibility', 'extraction'];
    const runDecisionLogic = agentsToRun.includes('decision-logic');
    const runDefensibility = agentsToRun.includes('defensibility');
    const runExtraction = agentsToRun.includes('extraction');

    console.log(`🤖 Orchestrating agents for ${productName}: ${agentsToRun.join(', ')}`);

    // Run agents in parallel where possible
    const results: Partial<OrchestrationResult> = {
      product: { name: productName, manufacturer },
    };

    // Track agent execution status
    const agentStatus: Record<string, 'success' | 'failed'> = {};
    const agentPromises: Promise<void>[] = [];

    // Decision Logic Agent
    if (runDecisionLogic) {
      agentPromises.push(
        (async () => {
          try {
            results.decisionLogic = await extractDecisionLogic(documentContent);
            agentStatus['decision-logic'] = 'success';
            console.log(`✅ Decision logic: ${results.decisionLogic.materialCategory}`);
          } catch (error) {
            agentStatus['decision-logic'] = 'failed';
            console.error('❌ Decision logic agent failed:', error);
          }
        })()
      );
    }

    // Defensibility Agent
    if (runDefensibility) {
      agentPromises.push(
        (async () => {
          try {
            results.defensibility = performDefensibilityCheck(
              documentContent,
              productName,
              manufacturer
            );
            agentStatus['defensibility'] = 'success';
            console.log(`✅ Defensibility: ${results.defensibility.defensibilityScore}/100`);
          } catch (error) {
            agentStatus['defensibility'] = 'failed';
            console.error('❌ Defensibility agent failed:', error);
          }
        })()
      );
    }

    // Extraction Agent (raw data extraction)
    if (runExtraction) {
      agentPromises.push(
        (async () => {
          try {
            results.extraction = {
              certificates: extractCertificates(documentContent),
              epdMetrics: extractEPDMetrics(documentContent),
              healthMetrics: extractHealthMetrics(documentContent),
            };
            agentStatus['extraction'] = 'success';
            console.log(`✅ Extraction complete`);
          } catch (error) {
            agentStatus['extraction'] = 'failed';
            console.error('❌ Extraction agent failed:', error);
          }
        })()
      );
    }

    // Wait for all agents to complete
    await Promise.all(agentPromises);

    // Combine recommendations from all agents
    const recommendations: string[] = [];
    if (results.defensibility?.recommendations) {
      recommendations.push(...results.defensibility.recommendations);
    }
    if (results.decisionLogic?.missingCriteria) {
      recommendations.push(
        ...results.decisionLogic.missingCriteria.map(
          (c) => `Consider documenting: ${c}`
        )
      );
    }

    // Build overall assessment
    const overallAssessment = {
      isDefensible: results.defensibility?.isDefensible ?? false,
      relevanceScore: results.decisionLogic?.relevanceScore ?? 'Unknown',
      strengths: results.defensibility?.strengths ?? [],
      vulnerabilities: results.defensibility?.vulnerabilities ?? [],
    };

    // Build metadata with explicit tracking
    const metadata = {
      agentsRequested: agentsToRun,
      agentsSucceeded: agentsToRun.filter((a) => agentStatus[a] === 'success'),
      agentsFailed: agentsToRun.filter((a) => agentStatus[a] === 'failed'),
      // Backward-compatible alias
      agentsRun: agentsToRun.filter((a) => agentStatus[a] === 'success'),
      processingTimeMs: Date.now() - startTime,
      documentLengthChars: documentContent.length,
    };

    const response: OrchestrationResult = {
      product: results.product!,
      decisionLogic: results.decisionLogic,
      defensibility: results.defensibility,
      extraction: results.extraction,
      metadata,
      recommendations,
      overallAssessment,
    };

    console.log(
      `✅ Orchestration complete in ${metadata.processingTimeMs}ms`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Agent orchestration error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: errorMessage, details: 'Check server logs for details' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/orchestrate
 *
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agents/orchestrate',
    description: 'Orchestrate multiple AI agents to analyze product documentation',
    methods: ['POST', 'GET'],
    availableAgents: {
      'decision-logic': 'Extracts material-specific decision criteria for role-based filtering',
      defensibility: 'Analyzes product defensibility against value engineering',
      extraction: 'Extracts raw certificate, EPD, and health metrics from document',
    },
    requestBody: {
      documentContent: 'string (required) - Raw text content from document',
      productName: 'string (required) - Product name',
      manufacturer: 'string (required) - Manufacturer name',
      agents: "string[] (optional) - Agents to run (default: all)",
    },
    responseFormat: {
      product: 'Product identification',
      decisionLogic: 'Decision logic extraction result',
      defensibility: 'Defensibility analysis result',
      extraction: 'Raw extraction results',
      metadata: 'Processing metadata (agents run, timing)',
      recommendations: 'Combined recommendations from all agents',
      overallAssessment: 'Unified assessment (defensible, relevance, strengths, vulnerabilities)',
    },
    example: {
      request: {
        documentContent: 'Product datasheet content...',
        productName: 'EcoFloor LVT',
        manufacturer: 'GreenBuild Inc',
        agents: ['decision-logic', 'defensibility'],
      },
    },
  });
}
