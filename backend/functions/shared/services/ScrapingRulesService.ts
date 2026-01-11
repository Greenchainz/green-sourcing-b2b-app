import { CosmosClient, Database, Container } from '@azure/cosmos';
import { PersonaLogic } from '../types/PersonaLogic';
import { getPersonaById } from '../constants/personas';

/**
 * ScrapingRulesService
 * 
 * Service for fetching persona-specific scraping rules from Azure Cosmos DB.
 * Provides caching to reduce Cosmos DB calls and falls back to default rules
 * if a persona is not found in the database.
 */
export class ScrapingRulesService {
  private client: CosmosClient;
  private database: Database | null = null;
  private container: Container | null = null;
  private cache: Map<string, { data: PersonaLogic; timestamp: number }>;
  private cacheExpiryMs: number;

  private readonly connectionString: string;
  private readonly databaseName: string;
  private readonly containerName: string;

  /**
   * Create a new ScrapingRulesService
   * 
   * @param options Configuration options
   */
  constructor(options?: {
    connectionString?: string;
    databaseName?: string;
    containerName?: string;
    cacheExpiryMs?: number;
  }) {
    // Get configuration from environment or options
    this.connectionString = 
      options?.connectionString || 
      process.env.COSMOS_CONNECTION_STRING || 
      '';
    
    this.databaseName = 
      options?.databaseName || 
      process.env.COSMOS_DATABASE_NAME || 
      'greenchainz';
    
    this.containerName = 
      options?.containerName || 
      process.env.COSMOS_CONTAINER_NAME || 
      'ScrapingRules';
    
    this.cacheExpiryMs = options?.cacheExpiryMs || 3600000; // Default: 1 hour
    
    // Initialize cache
    this.cache = new Map();

    // Initialize Cosmos client if connection string is available
    if (this.connectionString) {
      this.client = new CosmosClient(this.connectionString);
    } else {
      console.warn('COSMOS_CONNECTION_STRING not set. Service will fall back to default rules only.');
      this.client = null as any;
    }
  }

  /**
   * Initialize database and container connections
   */
  private async initialize(): Promise<void> {
    if (!this.client) {
      throw new Error('Cosmos client not initialized. Check COSMOS_CONNECTION_STRING.');
    }

    if (!this.database) {
      this.database = this.client.database(this.databaseName);
    }

    if (!this.container) {
      this.container = this.database.container(this.containerName);
    }
  }

  /**
   * Fetch scraping rules for a specific persona
   * 
   * @param personaId The persona identifier
   * @returns PersonaLogic object or null if not found
   */
  async getPersonaRules(personaId: string): Promise<PersonaLogic | null> {
    // Check cache first
    const cached = this.getCached(personaId);
    if (cached) {
      console.log(`Cache hit for persona: ${personaId}`);
      return cached;
    }

    // Try to fetch from Cosmos DB
    if (this.client) {
      try {
        await this.initialize();

        const { resource } = await this.container!.item(personaId, personaId).read();
        
        if (resource) {
          const personaLogic: PersonaLogic = {
            personaId: resource.personaId,
            jobTitle: resource.jobTitle,
            decisionLogic: resource.decisionLogic,
            scrapeKeywords: resource.scrapeKeywords,
            ignoreKeywords: resource.ignoreKeywords,
            outputSchema: resource.outputSchema,
            createdAt: resource.createdAt,
            updatedAt: resource.updatedAt
          };

          // Cache the result
          this.setCached(personaId, personaLogic);
          console.log(`Fetched persona rules from Cosmos DB: ${personaId}`);
          
          return personaLogic;
        }
      } catch (error: any) {
        // If item not found in Cosmos, fall through to default
        if (error.code !== 404) {
          console.error(`Error fetching persona rules from Cosmos DB:`, error);
        } else {
          console.log(`Persona not found in Cosmos DB: ${personaId}, using default`);
        }
      }
    }

    // Fall back to default personas
    const defaultPersona = getPersonaById(personaId);
    if (defaultPersona) {
      console.log(`Using default persona rules: ${personaId}`);
      this.setCached(personaId, defaultPersona);
      return defaultPersona;
    }

    console.error(`Persona not found: ${personaId}`);
    return null;
  }

  /**
   * Fetch all persona rules from Cosmos DB
   * 
   * @returns Array of PersonaLogic objects
   */
  async getAllPersonaRules(): Promise<PersonaLogic[]> {
    if (!this.client) {
      console.warn('Cosmos client not initialized. Returning empty array.');
      return [];
    }

    try {
      await this.initialize();

      const { resources } = await this.container!.items
        .query('SELECT * FROM c')
        .fetchAll();

      const personas: PersonaLogic[] = resources.map((resource) => ({
        personaId: resource.personaId,
        jobTitle: resource.jobTitle,
        decisionLogic: resource.decisionLogic,
        scrapeKeywords: resource.scrapeKeywords,
        ignoreKeywords: resource.ignoreKeywords,
        outputSchema: resource.outputSchema,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt
      }));

      console.log(`Fetched ${personas.length} persona rules from Cosmos DB`);
      return personas;
    } catch (error) {
      console.error('Error fetching all persona rules from Cosmos DB:', error);
      return [];
    }
  }

  /**
   * Invalidate cache for a specific persona
   * 
   * @param personaId The persona identifier
   */
  invalidateCache(personaId: string): void {
    this.cache.delete(personaId);
    console.log(`Cache invalidated for persona: ${personaId}`);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Get cached persona rules if available and not expired
   * 
   * @param personaId The persona identifier
   * @returns PersonaLogic or null if not cached or expired
   */
  private getCached(personaId: string): PersonaLogic | null {
    const cached = this.cache.get(personaId);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > this.cacheExpiryMs) {
      // Cache expired, remove it
      this.cache.delete(personaId);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache persona rules
   * 
   * @param personaId The persona identifier
   * @param data The PersonaLogic data to cache
   */
  private setCached(personaId: string, data: PersonaLogic): void {
    this.cache.set(personaId, {
      data,
      timestamp: Date.now()
    });
  }
}

/**
 * Singleton instance for use across functions
 */
let serviceInstance: ScrapingRulesService | null = null;

/**
 * Get or create the singleton ScrapingRulesService instance
 */
export function getScrapingRulesService(): ScrapingRulesService {
  if (!serviceInstance) {
    serviceInstance = new ScrapingRulesService();
  }
  return serviceInstance;
}
