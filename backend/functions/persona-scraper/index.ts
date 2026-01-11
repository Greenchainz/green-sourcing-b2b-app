import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getScrapingRulesService } from '../shared/services/ScrapingRulesService';
import { 
  PersonaScraperRequest, 
  PersonaScraperResponse,
  PersonaLogic 
} from '../shared/types/PersonaLogic';

/**
 * Extract relevant content sections from HTML based on persona keywords
 */
function extractRelevantContent(
  $: cheerio.CheerioAPI,
  persona: PersonaLogic,
  customKeywords: string[] = []
): { content: string; foundKeywords: string[]; ignoredKeywords: string[] } {
  const bodyText = $('body').text().toLowerCase();
  const allKeywords = [...persona.scrapeKeywords, ...customKeywords];
  
  // Find which keywords appear in the content
  const foundKeywords: string[] = [];
  const ignoredKeywords: string[] = [];
  
  // Check for scrape keywords
  for (const keyword of allKeywords) {
    if (bodyText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }
  
  // Check for ignore keywords
  for (const keyword of persona.ignoreKeywords) {
    if (bodyText.includes(keyword.toLowerCase())) {
      ignoredKeywords.push(keyword);
    }
  }
  
  // Extract paragraphs and sections that contain relevant keywords
  const relevantSections: string[] = [];
  
  $('p, div, section, article, li, td').each((_, element) => {
    const text = $(element).text();
    const textLower = text.toLowerCase();
    
    // Check if this section contains any of our keywords
    const hasRelevantKeyword = foundKeywords.some(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    
    // Skip if it contains ignore keywords
    const hasIgnoreKeyword = ignoredKeywords.some(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    
    if (hasRelevantKeyword && !hasIgnoreKeyword && text.length > 20) {
      relevantSections.push(text.trim());
    }
  });
  
  return {
    content: relevantSections.join('\n\n'),
    foundKeywords,
    ignoredKeywords
  };
}

/**
 * Extract data based on persona's decision logic and output schema
 */
function extractPersonaData(
  content: string,
  persona: PersonaLogic,
  foundKeywords: string[]
): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Initialize data structure based on output schema
  for (const [key, fieldDef] of Object.entries(persona.outputSchema)) {
    data[key] = {
      keywords_found: [] as string[],
      extracted_text: [] as string[],
      metrics: {}
    };
  }
  
  // Process content to extract relevant data
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // For each found keyword, try to extract relevant data
    for (const keyword of foundKeywords) {
      if (lineLower.includes(keyword.toLowerCase())) {
        // Determine which output schema field this relates to
        for (const [key, fieldDef] of Object.entries(persona.outputSchema)) {
          const keyLower = key.toLowerCase();
          
          // Map keywords to output schema fields based on naming patterns
          if (
            keyLower.includes(keyword.split(' ')[0]) ||
            persona.decisionLogic.some(dl => 
              keyLower.includes(dl.toLowerCase()) && 
              lineLower.includes(dl.toLowerCase())
            )
          ) {
            if (!data[key].keywords_found.includes(keyword)) {
              data[key].keywords_found.push(keyword);
            }
            data[key].extracted_text.push(line.trim());
          }
        }
      }
    }
  }
  
  // Extract metrics if mentioned (numbers, percentages, years, etc.)
  const numberRegex = /(\d+(?:\.\d+)?)\s*(%|years?|months?|days?|hrs?|sq\.?\s*ft\.?|usd|\$|dollars?)/gi;
  
  for (const line of lines) {
    const matches = line.match(numberRegex);
    if (matches) {
      for (const [key] of Object.entries(data)) {
        if (line.toLowerCase().includes(key.split('_')[0])) {
          data[key].metrics = {
            ...data[key].metrics,
            raw_values: matches
          };
        }
      }
    }
  }
  
  return data;
}

/**
 * Persona-Scraper Azure Function
 * 
 * HTTP-triggered function that scrapes web pages based on persona-specific rules.
 * 
 * @param request HTTP request with targetUrl, personaId, and optional customKeywords
 * @param context Invocation context for logging
 */
async function personaScraperHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Persona scraper triggered');
  
  try {
    // Parse request body
    const body = await request.text();
    let requestData: PersonaScraperRequest;
    
    try {
      requestData = JSON.parse(body);
    } catch (error) {
      return {
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
    
    // Validate required fields
    if (!requestData.targetUrl) {
      return {
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: targetUrl'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
    
    if (!requestData.personaId) {
      return {
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: personaId'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
    
    context.log(`Scraping ${requestData.targetUrl} for persona: ${requestData.personaId}`);
    
    // Fetch persona rules from service
    const scrapingService = getScrapingRulesService();
    const persona = await scrapingService.getPersonaRules(requestData.personaId);
    
    if (!persona) {
      return {
        status: 404,
        body: JSON.stringify({
          success: false,
          error: `Persona not found: ${requestData.personaId}`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
    
    // Scrape the target URL
    let response;
    try {
      response = await axios.get(requestData.targetUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'GreenChainz Persona Scraper Bot/1.0 (+https://greenchainz.com/bot)'
        },
        maxRedirects: 5
      });
    } catch (error: any) {
      context.error(`Failed to fetch URL: ${error.message}`);
      return {
        status: 500,
        body: JSON.stringify({
          success: false,
          error: `Failed to fetch URL: ${error.message}`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
    
    // Parse HTML with Cheerio
    const $ = cheerio.load(response.data);
    
    // Extract relevant content based on persona keywords
    const { content, foundKeywords, ignoredKeywords } = extractRelevantContent(
      $,
      persona,
      requestData.customKeywords
    );
    
    context.log(`Found ${foundKeywords.length} relevant keywords, ignored ${ignoredKeywords.length} fluff keywords`);
    
    // Extract structured data based on persona's decision logic
    const extractedData = extractPersonaData(content, persona, foundKeywords);
    
    // Build response
    const scraperResponse: PersonaScraperResponse = {
      success: true,
      personaId: persona.personaId,
      jobTitle: persona.jobTitle,
      targetUrl: requestData.targetUrl,
      data: extractedData,
      metadata: {
        scrapedAt: new Date().toISOString(),
        keywordsFound: foundKeywords,
        keywordsIgnored: ignoredKeywords,
        contentLength: content.length
      }
    };
    
    context.log(`Scraping completed successfully for ${persona.jobTitle}`);
    
    return {
      status: 200,
      body: JSON.stringify(scraperResponse, null, 2),
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
  } catch (error: any) {
    context.error('Persona scraper error:', error);
    return {
      status: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}

// Register the function
app.http('persona-scraper', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'persona-scraper',
  handler: personaScraperHandler
});
