import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDistributorScoreService } from '../shared/services/DistributorScoreService';
import {
  DistributorIntelligenceRequest,
  DistributorIntelligenceResponse,
  Distributor
} from '../shared/types/DistributorTypes';

/**
 * Distributor Intelligence Azure Function
 * 
 * Analyzes distributor websites for Layer VII "Hidden Influencers" intelligence:
 * 1. Ready-to-go documentation (LEED, EPDs) - reduces administrative burden
 * 2. Multi-functional SKUs - replaces multiple trades
 * 3. Inventory transparency - lead times and stock visibility
 * 
 * Scores distributors on their ability to make compliance easy.
 */
async function distributorIntelligenceHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Distributor intelligence triggered');

  try {
    // Parse request body
    const body = await request.text();
    let requestData: DistributorIntelligenceRequest;

    try {
      requestData = JSON.parse(body);
    } catch (error) {
      return {
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Validate required fields
    if (!requestData.websiteUrl) {
      return {
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: websiteUrl'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    context.log(`Analyzing distributor: ${requestData.websiteUrl}`);

    // Build distributor object
    const distributor: Distributor = {
      name: requestData.name || extractNameFromUrl(requestData.websiteUrl),
      website: requestData.websiteUrl,
      type: requestData.type || 'national_distributor',
      discoveredAt: new Date().toISOString()
    };

    // Initialize service
    const scoreService = getDistributorScoreService();

    // Analyze distributor
    const intelligence = await scoreService.analyzeDistributor(
      distributor,
      requestData.deepScan || false
    );

    context.log(`Analysis complete: ${intelligence.score.tier} tier (${intelligence.score.overall}/100)`);

    // Build response
    const response: DistributorIntelligenceResponse = {
      success: true,
      intelligence,
      summary: {
        overallScore: intelligence.score.overall,
        tier: intelligence.score.tier,
        topStrengths: intelligence.score.strengths.slice(0, 3),
        readyForCompliance: intelligence.score.complianceScore >= 60
      }
    };

    return {
      status: 200,
      body: JSON.stringify(response, null, 2),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error: any) {
    context.error('Distributor intelligence error:', error);
    return {
      status: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

/**
 * Extract distributor name from URL
 */
function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const name = hostname.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown Distributor';
  }
}

// Register the function
app.http('distributor-intelligence', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'distributor-intelligence',
  handler: distributorIntelligenceHandler
});
