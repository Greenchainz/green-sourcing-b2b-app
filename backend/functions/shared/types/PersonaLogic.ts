/**
 * PersonaLogic Interface
 * 
 * Defines the structure for persona-specific scraping rules.
 * Each persona represents a procurement decision-maker with unique
 * concerns, keywords, and data requirements.
 */

/**
 * Output schema field definition
 */
export interface OutputSchemaField {
  type: 'object' | 'string' | 'number' | 'array' | 'boolean';
  description?: string;
  required?: boolean;
}

/**
 * Output schema structure for persona-specific data
 */
export interface OutputSchema {
  [key: string]: OutputSchemaField;
}

/**
 * Main PersonaLogic interface
 */
export interface PersonaLogic {
  /**
   * Unique identifier for the persona (e.g., "facility_manager")
   */
  personaId: string;

  /**
   * Human-readable job title (e.g., "Facility Manager")
   */
  jobTitle: string;

  /**
   * Array of decision factors this persona cares about
   * Examples: ["TCO", "Maintenance", "Lifecycle", "Durability"]
   */
  decisionLogic: string[];

  /**
   * Array of specific keywords/phrases to search for during scraping
   * These should be specific, measurable terms, not generic marketing
   * Examples: ["total cost of ownership", "maintenance schedule", "warranty years"]
   */
  scrapeKeywords: string[];

  /**
   * Array of "marketing fluff" keywords to skip/ignore
   * Examples: ["save the planet", "eco-friendly", "green choice"]
   */
  ignoreKeywords: string[];

  /**
   * Structure of JSON to return for this persona
   * Defines the expected output format with field types
   */
  outputSchema: OutputSchema;

  /**
   * ISO 8601 timestamp when the persona logic was created
   */
  createdAt?: string;

  /**
   * ISO 8601 timestamp when the persona logic was last updated
   */
  updatedAt?: string;
}

/**
 * Request payload for persona-scraper function
 */
export interface PersonaScraperRequest {
  /**
   * Target URL to scrape (product page or company profile)
   */
  targetUrl: string;

  /**
   * Persona ID to use for scraping rules
   */
  personaId: string;

  /**
   * Optional additional keywords to search for
   */
  customKeywords?: string[];
}

/**
 * Response from persona-scraper function
 */
export interface PersonaScraperResponse {
  /**
   * Whether the scraping was successful
   */
  success: boolean;

  /**
   * The persona ID that was used
   */
  personaId: string;

  /**
   * The job title of the persona
   */
  jobTitle: string;

  /**
   * The URL that was scraped
   */
  targetUrl: string;

  /**
   * Extracted data matching the persona's output schema
   */
  data: Record<string, any>;

  /**
   * Metadata about the scraping operation
   */
  metadata: {
    scrapedAt: string;
    keywordsFound: string[];
    keywordsIgnored: string[];
    contentLength: number;
  };

  /**
   * Error message if scraping failed
   */
  error?: string;
}
