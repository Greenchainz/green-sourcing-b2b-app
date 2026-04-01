/**
 * Material Credit Score Router
 *
 * Procedures:
 *   materialCreditScore.getForMaterial(epdId)    — score for a single EPD row
 *   materialCreditScore.getForSupplier(supplierId) — scores for all rows of a supplier
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { compute, computeForSupplier } from "../services/material-credit-score";

export const materialCreditScoreRouter = router({
  getForMaterial: publicProcedure
    .input(z.object({ epdId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return compute(input.epdId);
    }),

  getForSupplier: publicProcedure
    .input(z.object({ supplierId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return computeForSupplier(input.supplierId);
    }),
});
