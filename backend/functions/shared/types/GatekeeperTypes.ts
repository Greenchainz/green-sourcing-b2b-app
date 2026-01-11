/**
 * Gatekeeper Discovery Types
 * 
 * Types for the "Hunter" agents that discover and qualify high-leverage
 * procurement decision-makers (Financial Gatekeepers, Operational Stewards).
 */

/**
 * Gatekeeper role types
 */
export type GatekeeperRole = 
  | 'quantity_surveyor'
  | 'infection_control_officer'
  | 'insurance_risk_manager'
  | 'facility_director'
  | 'procurement_director';

/**
 * Priority level for discovered leads
 */
export type LeadPriority = 'high' | 'medium' | 'low';

/**
 * Gatekeeper persona definition with motivation keywords
 */
export interface GatekeeperPersona {
  /**
   * Role identifier
   */
  role: GatekeeperRole;

  /**
   * Human-readable title
   */
  title: string;

  /**
   * Vertical/industry focus
   */
  vertical?: string;

  /**
   * Motivation keywords that signal this role's priorities
   * These are used to filter Bing Search results
   */
  motivationKeywords: string[];

  /**
   * Required skills or certifications
   */
  requiredSkills?: string[];

  /**
   * Decision logic this role cares about (from Phase 1 personas)
   */
  decisionLogic: string[];

  /**
   * Search queries to find this role
   */
  searchQueries: string[];
}

/**
 * Search result from Bing Search API
 */
export interface BingSearchResult {
  /**
   * Result title
   */
  name: string;

  /**
   * Result URL
   */
  url: string;

  /**
   * Snippet/description
   */
  snippet: string;

  /**
   * Display URL
   */
  displayUrl?: string;

  /**
   * Date last crawled
   */
  dateLastCrawled?: string;
}

/**
 * Discovered lead profile
 */
export interface DiscoveredLead {
  /**
   * Unique identifier
   */
  id?: string;

  /**
   * Gatekeeper role
   */
  role: GatekeeperRole;

  /**
   * Person or firm name
   */
  name: string;

  /**
   * Company/organization
   */
  company?: string;

  /**
   * Profile URL (LinkedIn, company website, etc.)
   */
  profileUrl: string;

  /**
   * Bio or description
   */
  bio: string;

  /**
   * Contact information
   */
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };

  /**
   * Motivation keywords found in profile
   */
  matchedKeywords: string[];

  /**
   * Relevance score (0-100)
   */
  relevanceScore: number;

  /**
   * Source of discovery
   */
  source: 'bing_search' | 'linkedin' | 'company_website' | 'manual';

  /**
   * When discovered
   */
  discoveredAt: string;

  /**
   * Qualification status
   */
  qualificationStatus?: 'pending' | 'qualified' | 'disqualified';

  /**
   * Priority level (set by GPT-4o qualification)
   */
  priority?: LeadPriority;

  /**
   * GPT-4o qualification notes
   */
  qualificationNotes?: string;
}

/**
 * Request for gatekeeper discovery
 */
export interface GatekeeperDiscoveryRequest {
  /**
   * Gatekeeper role to search for
   */
  role: GatekeeperRole;

  /**
   * Optional location filter
   */
  location?: string;

  /**
   * Optional industry filter
   */
  industry?: string;

  /**
   * Maximum number of results
   */
  maxResults?: number;

  /**
   * Whether to auto-qualify with GPT-4o
   */
  autoQualify?: boolean;
}

/**
 * Response from gatekeeper discovery
 */
export interface GatekeeperDiscoveryResponse {
  /**
   * Success status
   */
  success: boolean;

  /**
   * Gatekeeper role searched
   */
  role: GatekeeperRole;

  /**
   * Number of leads discovered
   */
  totalDiscovered: number;

  /**
   * Discovered leads
   */
  leads: DiscoveredLead[];

  /**
   * Search metadata
   */
  metadata: {
    searchQueries: string[];
    resultsProcessed: number;
    qualifiedLeads?: number;
    searchedAt: string;
  };

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * GPT-4o qualification request
 */
export interface QualificationRequest {
  /**
   * Lead to qualify
   */
  lead: DiscoveredLead;

  /**
   * Gatekeeper persona for context
   */
  persona: GatekeeperPersona;
}

/**
 * GPT-4o qualification response
 */
export interface QualificationResponse {
  /**
   * Whether lead is qualified
   */
  isQualified: boolean;

  /**
   * Priority level
   */
  priority: LeadPriority;

  /**
   * Confidence score (0-100)
   */
  confidence: number;

  /**
   * Reasoning from GPT-4o
   */
  reasoning: string;

  /**
   * Extracted insights
   */
  insights: {
    focusAreas: string[];
    alignsWithDecisionLogic: boolean;
    strategicProcurementFit: boolean;
  };

  /**
   * Recommended next actions
   */
  nextActions?: string[];
}
