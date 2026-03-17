/**
 * TXDOT Scraper tRPC Router
 * 
 * Provides procedures for managing TXDOT bid tab scraper operations
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { scrapeTxdotPricingData } from '../services/txdotScraper';
import { storePricingData, updateAllMaterialAveragePricing, getRegionalPricing } from '../services/pricingDataService';

export const txdotScraperRouter = router({
  /**
   * Trigger TXDOT bid tab scraper
   * Admin-only operation to scrape all 36 pages of bid tabulations
   */
  runScraper: protectedProcedure
    .input(z.object({
      dryRun: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      try {
        // Scrape TXDOT pricing data
        console.log('[TXDOT Scraper] Starting scraper...');
        const scrapedData = await scrapeTxdotPricingData();
        
        if (input.dryRun) {
          return {
            success: true,
            dryRun: true,
            recordsScraped: scrapedData.length,
            recordsInserted: 0,
            recordsSkipped: 0,
            errors: [],
            durationMs: Date.now() - startTime,
            sampleData: scrapedData.slice(0, 5), // Return first 5 records as sample
          };
        }
        
        // Store pricing data in database
        console.log('[TXDOT Scraper] Storing pricing data...');
        const storeResult = await storePricingData(scrapedData);
        
        // Update material average pricing
        console.log('[TXDOT Scraper] Updating material average pricing...');
        await updateAllMaterialAveragePricing();
        
        return {
          success: storeResult.success,
          dryRun: false,
          recordsScraped: scrapedData.length,
          recordsInserted: storeResult.recordsInserted,
          recordsSkipped: storeResult.recordsSkipped,
          errors: storeResult.errors,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        console.error('[TXDOT Scraper] Error:', error);
        return {
          success: false,
          dryRun: input.dryRun,
          recordsScraped: 0,
          recordsInserted: 0,
          recordsSkipped: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          durationMs: Date.now() - startTime,
        };
      }
    }),
  
  /**
   * Get regional pricing data
   * Public procedure to query pricing by state/county
   */
  getRegionalPricing: publicProcedure
    .input(z.object({
      state: z.string().length(2),
      county: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const pricing = await getRegionalPricing(input.state, input.county);
      return pricing;
    }),
  
  /**
   * Get scraper status
   * Returns last run timestamp and record counts
   */
  getScraperStatus: protectedProcedure
    .query(async () => {
      // TODO: Implement scraper run history tracking
      return {
        lastRunAt: null,
        totalRecords: 0,
        status: 'idle',
      };
    }),
});
