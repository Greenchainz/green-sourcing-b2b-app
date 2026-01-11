import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getBingSearchService } from '../shared/services/BingSearchService';
import { getOpenAIQualificationService } from '../shared/services/OpenAIQualificationService';
import { getGatekeeperPersona } from '../shared/constants/gatekeepers';
import {
  GatekeeperDiscoveryRequest,
  GatekeeperDiscoveryResponse,
  DiscoveredLead,
  BingSearchResult
} from '../shared/types/GatekeeperTypes';

/**
 * Extract profile information from Bing search result
 */
function extractLeadFromSearchResult(
  result: BingSearchResult & { matchedKeywords?: string[]; relevanceScore?: number },
  role: string
): DiscoveredLead {
  // Extract company name from URL or snippet (basic heuristic)
  let isLinkedIn = false;
  try {
    const parsedUrl = new URL(result.url);
    const host = parsedUrl.hostname.toLowerCase();
    isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');
  } catch {
    // If URL parsing fails, treat as non-LinkedIn
    isLinkedIn = false;
  }

  let name = result.name;
  let company: string | undefined;
  
  if (isLinkedIn) {
    // LinkedIn profile format: "Name - Title - Company | LinkedIn"
    const match = result.name.match(/^([^-|]+?)(?:\s*-\s*([^-|]+?))?(?:\s*-\s*([^|]+?))?/);
    if (match) {
      name = match[1]?.trim() || result.name;
      company = match[3]?.trim();
    }
  }

  return {
    role: role as any,
    name,
    company,
    profileUrl: result.url,
    bio: result.snippet,
    matchedKeywords: result.matchedKeywords || [],
    relevanceScore: result.relevanceScore || 0,
    source: 'bing_search',
    discoveredAt: new Date().toISOString(),
    qualificationStatus: 'pending'
  };
}

/**
 * Gatekeeper Discovery Azure Function
 * 
 * Uses Azure Bing Search API to find high-leverage procurement decision-makers
 * based on role-specific motivation keywords. Optionally qualifies leads using GPT-4o.
 */
async function gatekeeperDiscoveryHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Gatekeeper discovery triggered');

  try {
    // Parse request body
    const body = await request.text();
    let requestData: GatekeeperDiscoveryRequest;

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
    if (!requestData.role) {
      return {
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: role'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    context.log(`Discovering ${requestData.role} gatekeepers`);

    // Get persona definition
    const persona = getGatekeeperPersona(requestData.role);
    if (!persona) {
      return {
        status: 404,
        body: JSON.stringify({
          success: false,
          error: `Unknown gatekeeper role: ${requestData.role}`
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Initialize services
    const searchService = getBingSearchService();
    
    // Build search queries
    let searchQueries = [...persona.searchQueries];
    
    // Add location filter if provided
    if (requestData.location) {
      searchQueries = searchQueries.map(q => `${q} ${requestData.location}`);
    }

    // Add industry filter if provided
    if (requestData.industry) {
      searchQueries = searchQueries.map(q => `${q} ${requestData.industry}`);
    }

    context.log(`Executing ${searchQueries.length} search queries`);

    // Execute multi-search
    const searchResults = await searchService.multiSearch(searchQueries, {
      count: Math.min(requestData.maxResults || 20, 50),
      deduplicateByUrl: true,
      rateLimitMs: 1500
    });

    context.log(`Found ${searchResults.length} raw search results`);

    // Filter by motivation keywords
    const filteredResults = searchService.filterByKeywords(
      searchResults,
      persona.motivationKeywords,
      false // Any keyword match
    );

    context.log(`Filtered to ${filteredResults.length} relevant results`);

    // Convert to discovered leads
    const leads: DiscoveredLead[] = filteredResults
      .slice(0, requestData.maxResults || 20)
      .map(result => extractLeadFromSearchResult(result, requestData.role));

    // Auto-qualify with GPT-4o if requested
    let qualifiedCount = 0;
    if (requestData.autoQualify && leads.length > 0) {
      context.log('Auto-qualifying leads with GPT-4o...');
      
      try {
        const qualificationService = getOpenAIQualificationService();
        
        const qualificationRequests = leads.map(lead => ({
          lead,
          persona
        }));

        const qualifications = await qualificationService.batchQualifyLeads(
          qualificationRequests,
          3 // Concurrency
        );

        // Update leads with qualification results
        for (let i = 0; i < leads.length; i++) {
          const qualification = qualifications[i];
          if (qualification) {
            leads[i].qualificationStatus = qualification.isQualified ? 'qualified' : 'disqualified';
            leads[i].priority = qualification.priority;
            leads[i].qualificationNotes = qualification.reasoning;
            
            if (qualification.isQualified) {
              qualifiedCount++;
            }
          }
        }

        context.log(`Qualification complete: ${qualifiedCount}/${leads.length} qualified`);

      } catch (error: any) {
        context.warn(`GPT-4o qualification failed: ${error.message}`);
        // Continue without qualification
      }
    }

    // Build response
    const response: GatekeeperDiscoveryResponse = {
      success: true,
      role: requestData.role,
      totalDiscovered: leads.length,
      leads,
      metadata: {
        searchQueries,
        resultsProcessed: searchResults.length,
        qualifiedLeads: requestData.autoQualify ? qualifiedCount : undefined,
        searchedAt: new Date().toISOString()
      }
    };

    context.log(`Discovery complete: ${leads.length} leads found`);

    return {
      status: 200,
      body: JSON.stringify(response, null, 2),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error: any) {
    context.error('Gatekeeper discovery error:', error);
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

// Register the function
app.http('gatekeeper-discovery', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'gatekeeper-discovery',
  handler: gatekeeperDiscoveryHandler
});
