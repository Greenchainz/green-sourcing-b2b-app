/**
 * Autodesk / SDA Router
 *
 * NOTE: The Autodesk SDA API was shut down April 2026.
 * These procedures return empty/stub results so existing client code
 * continues to compile and render gracefully without errors.
 *
 * Routes:
 *   autodesk.searchEpds — search EPDs via (stubbed) SDA service
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { searchEpds } from "../autodesk-sda-service";

export const autodeskRouter = router({
  searchEpds: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        category: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const results = await searchEpds(input.query, input.category, input.limit);
      return { success: true as const, results };
    }),
});
