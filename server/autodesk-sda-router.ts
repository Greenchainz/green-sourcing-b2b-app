import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { searchEpds, getEpdDetail, findBestEpd } from './autodesk-sda-service';

export const autodesksDARouter = router({
  /**
   * Search for EPDs by product name, manufacturer, or category
   */
  searchEpds: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Search query required'),
        category: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await searchEpds(input.query, input.category, input.limit);
        return {
          success: true,
          results,
          count: results.length,
        };
      } catch (error) {
        console.error('[tRPC] EPD search error:', error);
        return {
          success: false,
          results: [],
          count: 0,
          error: error instanceof Error ? error.message : 'Search failed',
        };
      }
    }),

  /**
   * Get detailed EPD data by ID
   */
  getEpdDetail: publicProcedure
    .input(z.object({ epdId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const detail = await getEpdDetail(input.epdId);
        return {
          success: detail !== null,
          data: detail,
        };
      } catch (error) {
        console.error('[tRPC] EPD detail error:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Fetch failed',
        };
      }
    }),

  /**
   * Find best matching EPD for a material
   */
  findBestEpd: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Material name required'),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const epd = await findBestEpd(input.query, input.category);
        return {
          success: epd !== null,
          data: epd,
        };
      } catch (error) {
        console.error('[tRPC] Find best EPD error:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Search failed',
        };
      }
    }),
});
