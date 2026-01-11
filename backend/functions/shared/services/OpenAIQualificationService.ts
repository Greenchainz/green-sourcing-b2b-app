import axios from 'axios';
import {
  DiscoveredLead,
  GatekeeperPersona,
  QualificationRequest,
  QualificationResponse,
  LeadPriority
} from '../types/GatekeeperTypes';

/**
 * OpenAIQualificationService
 * 
 * Service for using Azure OpenAI GPT-4o to qualify discovered leads
 * based on Strategic Procurement alignment and decision logic fit.
 */
export class OpenAIQualificationService {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;
  private apiVersion: string;

  constructor(options?: {
    endpoint?: string;
    apiKey?: string;
    deployment?: string;
    apiVersion?: string;
  }) {
    this.endpoint = options?.endpoint || process.env.AZURE_OPENAI_ENDPOINT || '';
    this.apiKey = options?.apiKey || process.env.AZURE_OPENAI_API_KEY || '';
    this.deployment = options?.deployment || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    this.apiVersion = options?.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

    if (!this.endpoint || !this.apiKey) {
      console.warn('Azure OpenAI credentials not set. Qualification service will not function.');
    }
  }

  /**
   * Qualify a discovered lead using GPT-4o
   * 
   * @param request Qualification request with lead and persona
   * @returns Qualification response with priority and reasoning
   */
  async qualifyLead(request: QualificationRequest): Promise<QualificationResponse> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.');
    }

    const { lead, persona } = request;

    // Build the qualification prompt
    const prompt = this.buildQualificationPrompt(lead, persona);

    try {
      const response = await axios.post(
        `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`,
        {
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent evaluation
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const completion = response.data.choices[0]?.message?.content;
      
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const parsedResponse = JSON.parse(completion);

      const qualificationResponse: QualificationResponse = {
        isQualified: parsedResponse.is_qualified || false,
        priority: this.normalizePriority(parsedResponse.priority),
        confidence: parsedResponse.confidence || 0,
        reasoning: parsedResponse.reasoning || '',
        insights: {
          focusAreas: parsedResponse.insights?.focus_areas || [],
          alignsWithDecisionLogic: parsedResponse.insights?.aligns_with_decision_logic || false,
          strategicProcurementFit: parsedResponse.insights?.strategic_procurement_fit || false
        },
        nextActions: parsedResponse.next_actions || []
      };

      console.log(`Qualified lead: ${lead.name} - ${qualificationResponse.isQualified ? 'QUALIFIED' : 'DISQUALIFIED'} (${qualificationResponse.priority} priority)`);

      return qualificationResponse;

    } catch (error: any) {
      console.error('OpenAI qualification error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }

      throw new Error(`Lead qualification failed: ${error.message}`);
    }
  }

  /**
   * Batch qualify multiple leads
   * 
   * @param requests Array of qualification requests
   * @param concurrency Maximum concurrent requests
   * @returns Array of qualification responses
   */
  async batchQualifyLeads(
    requests: QualificationRequest[],
    concurrency: number = 3
  ): Promise<QualificationResponse[]> {
    const results: QualificationResponse[] = [];
    const chunks: QualificationRequest[][] = [];

    // Split into chunks based on concurrency
    for (let i = 0; i < requests.length; i += concurrency) {
      chunks.push(requests.slice(i, i + concurrency));
    }

    // Process chunks sequentially, requests within chunk in parallel
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(request => 
          this.qualifyLead(request)
            .catch(error => {
              console.error(`Failed to qualify ${request.lead.name}:`, error.message);
              return this.createFailedResponse();
            })
        )
      );
      results.push(...chunkResults);

      // Small delay between chunks
      await this.wait(500);
    }

    const qualified = results.filter(r => r.isQualified).length;
    console.log(`Batch qualification: ${qualified}/${results.length} qualified`);

    return results;
  }

  /**
   * Build the qualification prompt for GPT-4o
   */
  private buildQualificationPrompt(lead: DiscoveredLead, persona: GatekeeperPersona): string {
    return `Analyze this professional profile to determine if they are a high-priority lead for strategic procurement outreach.

**Profile Information:**
- Name: ${lead.name}
- Company: ${lead.company || 'Unknown'}
- Role: ${persona.title}
- Bio/Description: ${lead.bio}
- Profile URL: ${lead.profileUrl}
- Keywords Found: ${lead.matchedKeywords.join(', ')}

**Target Persona:**
- Role: ${persona.title}
- Vertical: ${persona.vertical || 'General'}
- Decision Logic: ${persona.decisionLogic.join(', ')}
- Motivation Keywords: ${persona.motivationKeywords.slice(0, 10).join(', ')}

**Evaluation Criteria:**

1. **Strategic Procurement Fit**: Does this person's role focus on strategic sourcing, financial analysis, risk mitigation, or operational excellence (NOT just "buying green")?

2. **Decision Logic Alignment**: Does their work align with the decision logic for this persona (${persona.decisionLogic.join(', ')})?

3. **Motivation Keyword Presence**: Do they mention specific technical or financial concerns (${persona.motivationKeywords.slice(0, 5).join(', ')}) rather than generic sustainability marketing?

4. **Authority Level**: Do they appear to have budget authority or strong influence in procurement decisions?

**Your Task:**
Respond with a JSON object containing:
{
  "is_qualified": boolean,
  "priority": "high" | "medium" | "low",
  "confidence": number (0-100),
  "reasoning": "Brief explanation of your assessment",
  "insights": {
    "focus_areas": ["area1", "area2"],
    "aligns_with_decision_logic": boolean,
    "strategic_procurement_fit": boolean
  },
  "next_actions": ["suggested action 1", "suggested action 2"]
}

**Important**: Prioritize leads who show evidence of:
- Financial decision-making (ROI, TCO, NPV analysis)
- Risk management focus
- Technical specifications expertise
- Supply chain strategy

Deprioritize leads who only talk about:
- Generic sustainability messaging
- Environmental goals without financial metrics
- Marketing fluff ("save the planet")`;
  }

  /**
   * Get system prompt for GPT-4o
   */
  private getSystemPrompt(): string {
    return `You are an expert at qualifying B2B sales leads in the construction and building materials industry. You specialize in identifying Financial Gatekeepers and Operational Stewards who make strategic procurement decisions based on Total Cost of Ownership (TCO), Return on Investment (ROI), risk mitigation, and operational efficiency - NOT generic "sustainability" concerns.

Your evaluation is rigorous and focuses on finding decision-makers who care about the bottom line, not marketing fluff. You respond only with valid JSON.`;
  }

  /**
   * Normalize priority string to LeadPriority type
   */
  private normalizePriority(priority: string): LeadPriority {
    const normalized = priority?.toLowerCase();
    if (normalized === 'high') return 'high';
    if (normalized === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Create a failed/disqualified response
   */
  private createFailedResponse(): QualificationResponse {
    return {
      isQualified: false,
      priority: 'low',
      confidence: 0,
      reasoning: 'Qualification failed due to error',
      insights: {
        focusAreas: [],
        alignsWithDecisionLogic: false,
        strategicProcurementFit: false
      }
    };
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let serviceInstance: OpenAIQualificationService | null = null;

/**
 * Get or create the singleton OpenAIQualificationService instance
 */
export function getOpenAIQualificationService(): OpenAIQualificationService {
  if (!serviceInstance) {
    serviceInstance = new OpenAIQualificationService();
  }
  return serviceInstance;
}
