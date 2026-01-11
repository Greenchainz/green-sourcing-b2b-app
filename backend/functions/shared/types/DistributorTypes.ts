/**
 * Distributor Intelligence Types
 * 
 * Types for Layer VII "Supply Chain" agent that scores distributors
 * based on compliance documentation and multi-functional SKUs.
 */

/**
 * Distributor profile
 */
export interface Distributor {
  /**
   * Unique identifier
   */
  id?: string;

  /**
   * Distributor name
   */
  name: string;

  /**
   * Website URL
   */
  website: string;

  /**
   * Type of distributor
   */
  type: 'coop_purchasing' | 'sourcewell' | 'national_distributor' | 'regional_distributor' | 'specialty';

  /**
   * Geographic coverage
   */
  coverage?: string[];

  /**
   * Contact information
   */
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };

  /**
   * When first discovered
   */
  discoveredAt?: string;

  /**
   * Last scraped timestamp
   */
  lastScrapedAt?: string;
}

/**
 * Compliance documentation availability
 */
export interface ComplianceDocumentation {
  /**
   * LEED documentation available
   */
  leedDocs: {
    available: boolean;
    downloadable: boolean;
    formats?: string[]; // PDF, Excel, etc.
    urls?: string[];
  };

  /**
   * EPD (Environmental Product Declaration) availability
   */
  epdDocs: {
    available: boolean;
    downloadable: boolean;
    thirdPartyVerified?: boolean;
    urls?: string[];
  };

  /**
   * HPD (Health Product Declaration) availability
   */
  hpdDocs?: {
    available: boolean;
    downloadable: boolean;
    urls?: string[];
  };

  /**
   * Other certifications
   */
  otherCerts?: {
    name: string;
    available: boolean;
    url?: string;
  }[];

  /**
   * Documentation ease score (0-100)
   * Higher = easier to access
   */
  easeScore: number;
}

/**
 * Multi-functional SKU information
 */
export interface MultiFunctionalSKU {
  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Product name
   */
  name: string;

  /**
   * Trades this product replaces
   */
  replacedTrades: string[];

  /**
   * Cost savings claim
   */
  costSavings?: string;

  /**
   * Installation time savings
   */
  timeSavings?: string;

  /**
   * Product URL
   */
  url?: string;

  /**
   * Evidence of multi-functionality
   */
  evidence: string[];
}

/**
 * Inventory intelligence
 */
export interface InventoryIntelligence {
  /**
   * Multi-functional SKUs found
   */
  multiFunctionalSKUs: MultiFunctionalSKU[];

  /**
   * Total SKU count (if available)
   */
  totalSKUs?: number;

  /**
   * Inventory turns mentioned
   */
  inventoryTurns?: string;

  /**
   * Stock availability transparency
   */
  stockTransparency: boolean;

  /**
   * Lead times mentioned
   */
  leadTimes?: {
    standard?: string;
    express?: string;
  };
}

/**
 * Distributor score breakdown
 */
export interface DistributorScore {
  /**
   * Overall score (0-100)
   */
  overall: number;

  /**
   * Compliance documentation score (0-100)
   */
  complianceScore: number;

  /**
   * Multi-functional offerings score (0-100)
   */
  multiFunctionalScore: number;

  /**
   * Administrative burden reduction score (0-100)
   */
  adminBurdenScore: number;

  /**
   * Breakdown details
   */
  breakdown: {
    readyToGoDocumentation: number; // 0-40 points
    downloadableAssets: number; // 0-20 points
    multiFunctionalSKUs: number; // 0-25 points
    inventoryTransparency: number; // 0-15 points
  };

  /**
   * Ranking tier
   */
  tier: 'top' | 'good' | 'average' | 'poor';

  /**
   * Strengths identified
   */
  strengths: string[];

  /**
   * Weaknesses identified
   */
  weaknesses: string[];

  /**
   * When scored
   */
  scoredAt: string;
}

/**
 * Distributor intelligence analysis result
 */
export interface DistributorIntelligence {
  /**
   * Distributor information
   */
  distributor: Distributor;

  /**
   * Compliance documentation analysis
   */
  compliance: ComplianceDocumentation;

  /**
   * Inventory intelligence
   */
  inventory: InventoryIntelligence;

  /**
   * Calculated score
   */
  score: DistributorScore;

  /**
   * Raw scraped data (for debugging)
   */
  rawData?: {
    pageContent?: string;
    extractedLinks?: string[];
    keywords?: string[];
  };
}

/**
 * Request for distributor intelligence
 */
export interface DistributorIntelligenceRequest {
  /**
   * Distributor website URL
   */
  websiteUrl: string;

  /**
   * Distributor name (optional, will be extracted if not provided)
   */
  name?: string;

  /**
   * Distributor type (optional)
   */
  type?: Distributor['type'];

  /**
   * Whether to perform deep scan (slower, more thorough)
   */
  deepScan?: boolean;
}

/**
 * Response from distributor intelligence
 */
export interface DistributorIntelligenceResponse {
  /**
   * Success status
   */
  success: boolean;

  /**
   * Distributor intelligence data
   */
  intelligence?: DistributorIntelligence;

  /**
   * Summary
   */
  summary?: {
    overallScore: number;
    tier: string;
    topStrengths: string[];
    readyForCompliance: boolean;
  };

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Batch distributor analysis request
 */
export interface BatchDistributorAnalysisRequest {
  /**
   * List of distributor URLs to analyze
   */
  distributorUrls: string[];

  /**
   * Maximum concurrent requests
   */
  concurrency?: number;

  /**
   * Rate limit (ms between requests)
   */
  rateLimitMs?: number;
}

/**
 * Batch distributor analysis response
 */
export interface BatchDistributorAnalysisResponse {
  /**
   * Success status
   */
  success: boolean;

  /**
   * Total processed
   */
  totalProcessed: number;

  /**
   * Successful analyses
   */
  successCount: number;

  /**
   * Failed analyses
   */
  failedCount: number;

  /**
   * Results
   */
  results: DistributorIntelligenceResponse[];

  /**
   * Top distributors (sorted by score)
   */
  topDistributors?: {
    name: string;
    website: string;
    score: number;
    tier: string;
  }[];

  /**
   * Metadata
   */
  metadata: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
}
