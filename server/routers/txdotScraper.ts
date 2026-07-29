/**
 * TXDOT Scraper tRPC Router
 * 
 * Provides procedures for managing TXDOT bid tab scraper operations
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { scrapeTxdotPricingData } from '../services/txdotScraper';
import { storePricingData, updateAllMaterialAveragePricing, getRegionalPricing } from '../services/pricingDataService';
import { getDb } from '../db';
import { scraperRuns, pricingData } from '../../drizzle/schema';
import { desc, eq, sql } from 'drizzle-orm';

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
      const db = await getDb();
      let runId: number | undefined;

      if (db) {
        const [run] = await db.insert(scraperRuns).values({
          scraperName: 'txdot',
          status: 'running',
          startedAt: new Date(),
          metadata: { dryRun: input.dryRun },
        }).returning({ id: scraperRuns.id });
        runId = run.id;
      }
      
      try {
        // Scrape TXDOT pricing data
        console.log('[TXDOT Scraper] Starting scraper...');
        const scrapedData = await scrapeTxdotPricingData();
        
        if (input.dryRun) {
          if (db && runId) {
            await db.update(scraperRuns)
              .set({
                status: 'success',
                recordsProcessed: scrapedData.length,
                completedAt: new Date(),
                durationMs: Date.now() - startTime,
                metadata: { dryRun: true, note: 'Dry run completed' },
              })
              .where(eq(scraperRuns.id, runId));
          }

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
        
        if (db && runId) {
          await db.update(scraperRuns)
            .set({
              status: storeResult.success ? 'success' : 'error',
              recordsProcessed: scrapedData.length,
              recordsCreated: storeResult.recordsInserted,
              completedAt: new Date(),
              durationMs: Date.now() - startTime,
              errorMessage: storeResult.errors.length > 0 ? storeResult.errors.join(', ') : null,
            })
            .where(eq(scraperRuns.id, runId));
        }

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
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[TXDOT Scraper] Error:', error);

        if (db && runId) {
          await db.update(scraperRuns)
            .set({
              status: 'error',
              errorMessage: errorMsg,
              completedAt: new Date(),
              durationMs: Date.now() - startTime,
            })
            .where(eq(scraperRuns.id, runId));
        }

        return {
          success: false,
          dryRun: input.dryRun,
          recordsScraped: 0,
          recordsInserted: 0,
          recordsSkipped: 0,
          errors: [errorMsg],
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
      const db = await getDb();
      if (!db) {
        return {
          lastRunAt: null,
          totalRecords: 0,
          status: 'idle',
        };
      }

      // Get latest run
      const latestRuns = await db.select()
        .from(scraperRuns)
        .where(eq(scraperRuns.scraperName, 'txdot'))
        .orderBy(desc(scraperRuns.startedAt))
        .limit(1);

      const latestRun = latestRuns[0];

      // Get total records in pricing_data
      const recordCountResult = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(pricingData)
      .where(eq(pricingData.isActive, true));

      const totalRecords = Number(recordCountResult[0]?.count || 0);

      return {
        lastRunAt: latestRun?.completedAt || latestRun?.startedAt || null,
        totalRecords,
        status: latestRun?.status || 'idle',
        lastRunDetails: latestRun ? {
          recordsProcessed: latestRun.recordsProcessed,
          recordsCreated: latestRun.recordsCreated,
          errorMessage: latestRun.errorMessage,
        } : null,
      };
    }),
});
