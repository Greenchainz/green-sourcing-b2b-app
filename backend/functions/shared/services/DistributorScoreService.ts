import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  Distributor,
  ComplianceDocumentation,
  InventoryIntelligence,
  MultiFunctionalSKU,
  DistributorScore,
  DistributorIntelligence
} from '../types/DistributorTypes';

/**
 * DistributorScoreService
 * 
 * Service for analyzing distributor websites and calculating scores based on:
 * 1. Ready-to-go documentation (LEED, EPDs)
 * 2. Multi-functional SKUs
 * 3. Administrative burden reduction
 * 
 * This targets Layer VII "Hidden Influencers" in the procurement workflow.
 */
export class DistributorScoreService {
  /**
   * Analyze a distributor website and calculate intelligence score
   * 
   * @param distributor Distributor information
   * @param deepScan Whether to perform deep scan (slower but more thorough)
   * @returns Distributor intelligence with score
   */
  async analyzeDistributor(
    distributor: Distributor,
    deepScan: boolean = false
  ): Promise<DistributorIntelligence> {
    console.log(`Analyzing distributor: ${distributor.name}`);

    // Scrape the website
    const scrapedData = await this.scrapeWebsite(distributor.website, deepScan);

    // Analyze compliance documentation
    const compliance = this.analyzeCompliance(scrapedData);

    // Analyze inventory and multi-functional SKUs
    const inventory = this.analyzeInventory(scrapedData);

    // Calculate score
    const score = this.calculateScore(compliance, inventory);

    return {
      distributor,
      compliance,
      inventory,
      score,
      rawData: {
        pageContent: scrapedData.content.substring(0, 5000), // Truncate for storage
        extractedLinks: scrapedData.links.slice(0, 50),
        keywords: scrapedData.keywords
      }
    };
  }

  /**
   * Scrape distributor website
   */
  private async scrapeWebsite(
    url: string,
    _deepScan: boolean
  ): Promise<{
    content: string;
    links: string[];
    keywords: string[];
    $: cheerio.CheerioAPI;
  }> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'GreenChainz Distributor Intelligence Bot/1.0 (+https://greenchainz.com/bot)'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();

      // Extract all links
      const links: string[] = [];
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (href) {
          const absoluteUrl = new URL(href, url).href;
          links.push(absoluteUrl);
        }
      });

      // Extract keywords from meta tags and headings
      const keywords: string[] = [];
      $('meta[name="keywords"]').each((_, elem) => {
        const keywordContent = $(elem).attr('content');
        if (keywordContent) {
          keywords.push(...keywordContent.split(',').map(k => k.trim().toLowerCase()));
        }
      });

      return { content, links, keywords, $ };

    } catch (error: any) {
      console.error(`Failed to scrape ${url}:`, error.message);
      throw new Error(`Website scraping failed: ${error.message}`);
    }
  }

  /**
   * Analyze compliance documentation availability
   */
  private analyzeCompliance(scrapedData: {
    content: string;
    links: string[];
    $: cheerio.CheerioAPI;
  }): ComplianceDocumentation {
    const { content, links } = scrapedData;

    // LEED documentation analysis
    const leedKeywords = ['leed', 'leed credit', 'leed documentation', 'leed docs'];
    const leedAvailable = leedKeywords.some(kw => content.includes(kw));
    
    const leedLinks = links.filter(link => 
      /leed/i.test(link) || 
      (/\.pdf$/i.test(link) && /leed/i.test(link))
    );
    const leedDownloadable = leedLinks.length > 0;

    // Detect PDF/Excel formats
    const leedFormats: string[] = [];
    if (leedLinks.some(l => /\.pdf$/i.test(l))) leedFormats.push('PDF');
    if (leedLinks.some(l => /\.xlsx?$/i.test(l))) leedFormats.push('Excel');

    // EPD documentation analysis
    const epdKeywords = ['epd', 'environmental product declaration', 'product declaration'];
    const epdAvailable = epdKeywords.some(kw => content.includes(kw));
    
    const epdLinks = links.filter(link => 
      /epd/i.test(link) || 
      (/\.pdf$/i.test(link) && /epd|environmental.*product/i.test(link))
    );
    const epdDownloadable = epdLinks.length > 0;

    // Check for third-party verification
    const verificationKeywords = ['third-party verified', 'third party verified', 'verified by', 'certified by'];
    const thirdPartyVerified = verificationKeywords.some(kw => content.includes(kw));

    // HPD documentation analysis
    const hpdKeywords = ['hpd', 'health product declaration'];
    const hpdAvailable = hpdKeywords.some(kw => content.includes(kw));
    
    const hpdLinks = links.filter(link => /hpd/i.test(link));
    const hpdDownloadable = hpdLinks.length > 0;

    // Other certifications
    const certKeywords = [
      'fsc certified',
      'cradle to cradle',
      'green squared',
      'declare label',
      'iso 14001',
      'greenguard'
    ];

    const otherCerts = certKeywords
      .filter(cert => content.includes(cert))
      .map(cert => ({
        name: cert,
        available: true,
        url: links.find(l => new RegExp(cert.replace(/\s+/g, '.*'), 'i').test(l))
      }));

    // Calculate ease score
    let easeScore = 0;
    if (leedAvailable) easeScore += 20;
    if (leedDownloadable) easeScore += 20;
    if (epdAvailable) easeScore += 20;
    if (epdDownloadable) easeScore += 20;
    if (hpdAvailable) easeScore += 10;
    if (thirdPartyVerified) easeScore += 10;

    return {
      leedDocs: {
        available: leedAvailable,
        downloadable: leedDownloadable,
        formats: leedFormats.length > 0 ? leedFormats : undefined,
        urls: leedLinks.slice(0, 5)
      },
      epdDocs: {
        available: epdAvailable,
        downloadable: epdDownloadable,
        thirdPartyVerified,
        urls: epdLinks.slice(0, 5)
      },
      hpdDocs: {
        available: hpdAvailable,
        downloadable: hpdDownloadable,
        urls: hpdLinks.slice(0, 5)
      },
      otherCerts,
      easeScore
    };
  }

  /**
   * Analyze inventory and multi-functional SKUs
   */
  private analyzeInventory(scrapedData: {
    content: string;
    links: string[];
    $: cheerio.CheerioAPI;
  }): InventoryIntelligence {
    const { content, $ } = scrapedData;

    // Multi-functional keywords
    const multiFunctionalKeywords = [
      'multi-functional',
      'multifunctional',
      'replaces multiple trades',
      'all-in-one',
      'integrated system',
      'structural insulated panel',
      'sip panel',
      'composite panel',
      'multi-trade',
      'single-source solution'
    ];

    const multiFunctionalSKUs: MultiFunctionalSKU[] = [];

    // Look for product descriptions mentioning multi-functionality
    $('div, section, article').each((_, elem) => {
      const text = $(elem).text();
      const textLower = text.toLowerCase();

      // Check if this section mentions multi-functionality
      const hasMultiFunctionalKeyword = multiFunctionalKeywords.some(kw => 
        textLower.includes(kw)
      );

      if (hasMultiFunctionalKeyword && text.length > 50 && text.length < 1000) {
        // Try to extract product name and evidence
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const productName = lines[0]?.trim() || 'Unknown Product';

        // Extract what trades it replaces
        const tradeKeywords = ['flooring', 'insulation', 'structural', 'vapor barrier', 'acoustic', 'waterproofing'];
        const replacedTrades = tradeKeywords.filter(trade => textLower.includes(trade));

        // Extract cost/time savings if mentioned
        const savingsMatch = text.match(/(\d+%|\d+\s*percent).*?(saving|reduction|faster)/i);
        const costSavings = savingsMatch ? savingsMatch[0] : undefined;

        if (replacedTrades.length >= 2) {
          multiFunctionalSKUs.push({
            sku: `MF-${multiFunctionalSKUs.length + 1}`,
            name: productName.substring(0, 100),
            replacedTrades,
            costSavings,
            evidence: multiFunctionalKeywords.filter(kw => textLower.includes(kw))
          });
        }
      }
    });

    // Stock availability transparency
    const stockKeywords = ['in stock', 'available', 'inventory', 'stock status'];
    const stockTransparency = stockKeywords.some(kw => content.includes(kw));

    // Lead times
    const leadTimeMatch = content.match(/lead time[:\s]*(\d+-?\d*\s*(?:days?|weeks?|months?))/i);
    const leadTimes = leadTimeMatch ? {
      standard: leadTimeMatch[1]
    } : undefined;

    // Inventory turns (rarely published, but check)
    const inventoryTurns = content.match(/inventory turn[s]?[:\s]*(\d+\.?\d*)/i)?.[1];

    return {
      multiFunctionalSKUs: multiFunctionalSKUs.slice(0, 10), // Top 10
      inventoryTurns,
      stockTransparency,
      leadTimes
    };
  }

  /**
   * Calculate distributor score
   */
  private calculateScore(
    compliance: ComplianceDocumentation,
    inventory: InventoryIntelligence
  ): DistributorScore {
    // Scoring breakdown (100 points total)
    
    // 1. Ready-to-go documentation (40 points)
    let readyToGoDocumentation = 0;
    if (compliance.leedDocs.available) readyToGoDocumentation += 10;
    if (compliance.leedDocs.downloadable) readyToGoDocumentation += 10;
    if (compliance.epdDocs.available) readyToGoDocumentation += 10;
    if (compliance.epdDocs.downloadable) readyToGoDocumentation += 10;

    // 2. Downloadable assets (20 points)
    let downloadableAssets = 0;
    if (compliance.leedDocs.urls && compliance.leedDocs.urls.length > 0) downloadableAssets += 7;
    if (compliance.epdDocs.urls && compliance.epdDocs.urls.length > 0) downloadableAssets += 7;
    if (compliance.hpdDocs?.downloadable) downloadableAssets += 6;

    // 3. Multi-functional SKUs (25 points)
    let multiFunctionalScore = 0;
    const skuCount = inventory.multiFunctionalSKUs.length;
    if (skuCount > 0) multiFunctionalScore += 10;
    if (skuCount >= 3) multiFunctionalScore += 8;
    if (skuCount >= 5) multiFunctionalScore += 7;

    // 4. Inventory transparency (15 points)
    let inventoryTransparency = 0;
    if (inventory.stockTransparency) inventoryTransparency += 8;
    if (inventory.leadTimes) inventoryTransparency += 7;

    // Calculate overall score
    const overall = readyToGoDocumentation + downloadableAssets + multiFunctionalScore + inventoryTransparency;

    // Compliance score (based on documentation ease)
    const complianceScore = compliance.easeScore;

    // Administrative burden score (inverse of complexity)
    const adminBurdenScore = Math.min(
      100,
      (compliance.leedDocs.downloadable ? 40 : 0) +
      (compliance.epdDocs.downloadable ? 40 : 0) +
      (inventory.stockTransparency ? 20 : 0)
    );

    // Determine tier
    let tier: 'top' | 'good' | 'average' | 'poor';
    if (overall >= 75) tier = 'top';
    else if (overall >= 60) tier = 'good';
    else if (overall >= 40) tier = 'average';
    else tier = 'poor';

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (readyToGoDocumentation >= 30) strengths.push('Comprehensive compliance documentation');
    else if (readyToGoDocumentation < 15) weaknesses.push('Limited compliance documentation');

    if (downloadableAssets >= 15) strengths.push('Easy-to-access downloadable assets');
    else if (downloadableAssets < 7) weaknesses.push('Difficult to access documentation');

    if (multiFunctionalScore >= 20) strengths.push('Strong multi-functional product offerings');
    else if (multiFunctionalScore < 10) weaknesses.push('Few multi-functional SKUs');

    if (inventoryTransparency >= 12) strengths.push('Excellent inventory transparency');
    else if (inventoryTransparency < 5) weaknesses.push('Poor inventory visibility');

    if (compliance.epdDocs.thirdPartyVerified) strengths.push('Third-party verified data');

    return {
      overall,
      complianceScore,
      multiFunctionalScore,
      adminBurdenScore,
      breakdown: {
        readyToGoDocumentation,
        downloadableAssets,
        multiFunctionalSKUs: multiFunctionalScore,
        inventoryTransparency
      },
      tier,
      strengths,
      weaknesses,
      scoredAt: new Date().toISOString()
    };
  }

  /**
   * Batch analyze multiple distributors
   */
  async batchAnalyze(
    distributors: Distributor[],
    options?: {
      concurrency?: number;
      rateLimitMs?: number;
      deepScan?: boolean;
    }
  ): Promise<DistributorIntelligence[]> {
    const results: DistributorIntelligence[] = [];
    const concurrency = options?.concurrency || 2;
    const rateLimitMs = options?.rateLimitMs || 2000;
    const deepScan = options?.deepScan || false;

    // Process in chunks
    for (let i = 0; i < distributors.length; i += concurrency) {
      const chunk = distributors.slice(i, i + concurrency);
      
      const chunkResults = await Promise.all(
        chunk.map(distributor => 
          this.analyzeDistributor(distributor, deepScan)
            .catch(error => {
              console.error(`Failed to analyze ${distributor.name}:`, error.message);
              return null;
            })
        )
      );

      results.push(...chunkResults.filter((r): r is DistributorIntelligence => r !== null));

      // Rate limiting between chunks
      if (i + concurrency < distributors.length) {
        await this.wait(rateLimitMs);
      }
    }

    console.log(`Batch analysis complete: ${results.length}/${distributors.length} successful`);
    return results;
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
let serviceInstance: DistributorScoreService | null = null;

/**
 * Get or create the singleton DistributorScoreService instance
 */
export function getDistributorScoreService(): DistributorScoreService {
  if (!serviceInstance) {
    serviceInstance = new DistributorScoreService();
  }
  return serviceInstance;
}
