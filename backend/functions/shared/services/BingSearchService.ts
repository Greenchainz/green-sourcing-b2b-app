import axios from 'axios';
import { BingSearchResult } from '../types/GatekeeperTypes';

/**
 * BingSearchService
 * 
 * Service for interacting with Azure Bing Search API to discover
 * procurement gatekeepers and decision-makers.
 */
export class BingSearchService {
  private apiKey: string;
  private endpoint: string;
  private cache: Map<string, { results: BingSearchResult[]; timestamp: number }>;
  private cacheExpiryMs: number;

  constructor(options?: {
    apiKey?: string;
    endpoint?: string;
    cacheExpiryMs?: number;
  }) {
    this.apiKey = options?.apiKey || process.env.BING_SEARCH_API_KEY || '';
    this.endpoint = options?.endpoint || process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search';
    this.cacheExpiryMs = options?.cacheExpiryMs || 3600000; // 1 hour default
    this.cache = new Map();

    if (!this.apiKey) {
      console.warn('BING_SEARCH_API_KEY not set. Search functionality will be limited.');
    }
  }

  /**
   * Search for web results using Bing Search API
   * 
   * @param query Search query
   * @param options Search options
   * @returns Array of search results
   */
  async search(
    query: string,
    options?: {
      count?: number;
      offset?: number;
      market?: string;
      freshness?: 'Day' | 'Week' | 'Month';
      safeSearch?: 'Off' | 'Moderate' | 'Strict';
    }
  ): Promise<BingSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Bing Search API key not configured');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`Cache hit for query: ${query}`);
      return cached;
    }

    try {
      const response = await axios.get(this.endpoint, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        params: {
          q: query,
          count: options?.count || 50,
          offset: options?.offset || 0,
          mkt: options?.market || 'en-US',
          freshness: options?.freshness,
          safeSearch: options?.safeSearch || 'Moderate'
        },
        timeout: 10000
      });

      const results: BingSearchResult[] = (response.data.webPages?.value || []).map((item: any) => ({
        name: item.name,
        url: item.url,
        snippet: item.snippet,
        displayUrl: item.displayUrl,
        dateLastCrawled: item.dateLastCrawled
      }));

      // Cache results
      this.setCache(cacheKey, results);

      console.log(`Bing Search: Found ${results.length} results for "${query}"`);
      return results;

    } catch (error: any) {
      console.error('Bing Search API error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      throw new Error(`Bing Search failed: ${error.message}`);
    }
  }

  /**
   * Search with multiple queries and combine results
   * 
   * @param queries Array of search queries
   * @param options Search options
   * @returns Combined and deduplicated results
   */
  async multiSearch(
    queries: string[],
    options?: {
      count?: number;
      deduplicateByUrl?: boolean;
      rateLimitMs?: number;
    }
  ): Promise<BingSearchResult[]> {
    const allResults: BingSearchResult[] = [];
    const seenUrls = new Set<string>();
    const rateLimitMs = options?.rateLimitMs || 1000; // 1 second between queries

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      try {
        const results = await this.search(query, {
          count: options?.count
        });

        // Add results, optionally deduplicating by URL
        for (const result of results) {
          if (options?.deduplicateByUrl) {
            if (!seenUrls.has(result.url)) {
              allResults.push(result);
              seenUrls.add(result.url);
            }
          } else {
            allResults.push(result);
          }
        }

        // Rate limiting between queries
        if (i < queries.length - 1) {
          await this.wait(rateLimitMs);
        }

      } catch (error: any) {
        console.error(`Failed to search for "${query}":`, error.message);
        // Continue with next query even if one fails
      }
    }

    console.log(`Multi-search: ${queries.length} queries, ${allResults.length} total results`);
    return allResults;
  }

  /**
   * Filter results by keyword presence in snippet
   * 
   * @param results Search results to filter
   * @param keywords Keywords that must be present
   * @param matchAll If true, all keywords must match. If false, any keyword matches.
   * @returns Filtered results with relevance scores
   */
  filterByKeywords(
    results: BingSearchResult[],
    keywords: string[],
    matchAll: boolean = false
  ): Array<BingSearchResult & { relevanceScore: number; matchedKeywords: string[] }> {
    return results
      .map(result => {
        const textToSearch = `${result.name} ${result.snippet}`.toLowerCase();
        const matchedKeywords = keywords.filter(keyword =>
          textToSearch.includes(keyword.toLowerCase())
        );

        const matches = matchedKeywords.length;
        const relevanceScore = (matches / keywords.length) * 100;

        return {
          ...result,
          matchedKeywords,
          relevanceScore
        };
      })
      .filter(result => {
        if (matchAll) {
          return result.matchedKeywords.length === keywords.length;
        } else {
          return result.matchedKeywords.length > 0;
        }
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search for LinkedIn profiles
   * 
   * @param role Job title or role
   * @param keywords Additional keywords to include
   * @param location Optional location filter
   * @returns LinkedIn profile search results
   */
  async searchLinkedInProfiles(
    role: string,
    keywords: string[],
    location?: string
  ): Promise<BingSearchResult[]> {
    const keywordString = keywords.join(' OR ');
    const locationString = location ? ` ${location}` : '';
    
    const query = `site:linkedin.com/in "${role}"${locationString} (${keywordString})`;
    
    return await this.search(query, {
      count: 30
    });
  }

  /**
   * Search for company profiles
   * 
   * @param industry Industry or sector
   * @param keywords Keywords to filter by
   * @param location Optional location filter
   * @returns Company profile search results
   */
  async searchCompanyProfiles(
    industry: string,
    keywords: string[],
    location?: string
  ): Promise<BingSearchResult[]> {
    const keywordString = keywords.join(' OR ');
    const locationString = location ? ` ${location}` : '';
    
    const query = `"${industry}" company${locationString} (${keywordString})`;
    
    return await this.search(query, {
      count: 30
    });
  }

  /**
   * Invalidate cache for a specific query
   */
  invalidateCache(query: string, options?: any): void {
    const cacheKey = this.getCacheKey(query, options);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Bing Search cache cleared');
  }

  /**
   * Generate cache key from query and options
   */
  private getCacheKey(query: string, options?: any): string {
    return `${query}:${JSON.stringify(options || {})}`;
  }

  /**
   * Get results from cache if available and not expired
   */
  private getFromCache(cacheKey: string): BingSearchResult[] | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > this.cacheExpiryMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.results;
  }

  /**
   * Store results in cache
   */
  private setCache(cacheKey: string, results: BingSearchResult[]): void {
    this.cache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
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
let serviceInstance: BingSearchService | null = null;

/**
 * Get or create the singleton BingSearchService instance
 */
export function getBingSearchService(): BingSearchService {
  if (!serviceInstance) {
    serviceInstance = new BingSearchService();
  }
  return serviceInstance;
}
