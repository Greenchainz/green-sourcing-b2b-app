import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { suppliers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { recordSupplierViews, getSupplierHits } from "../services/supplier-profile-views";
import { checkSupplierFeatureAccess } from "../subscription-service";

/**
 * Supplier Analytics Router — profile "hits" (architect views).
 *
 *   supplierAnalytics.recordView   — record a single architect → supplier view
 *   supplierAnalytics.recordViews  — record a batch (e.g. a results list)
 *   supplierAnalytics.getMyHits    — the current supplier's hit stats + viewers
 *
 * Recording is also done server-side from the architect-facing discovery
 * surfaces (location.suppliersByState, rfqRequests.matchSuppliers); these
 * mutations exist for explicit high-intent client signals.
 */
export const supplierAnalyticsRouter = router({
  recordView: protectedProcedure
    .input(
      z.object({
        supplierId: z.number().int().positive(),
        source: z.string().max(48).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await recordSupplierViews({
        supplierIds: [input.supplierId],
        viewerUserId: ctx.user.id,
        viewerRole: ctx.user.role,
        source: input.source ?? "direct",
      });
      return { ok: true };
    }),

  recordViews: protectedProcedure
    .input(
      z.object({
        supplierIds: z.array(z.number().int().positive()).max(100),
        source: z.string().max(48).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await recordSupplierViews({
        supplierIds: input.supplierIds,
        viewerUserId: ctx.user.id,
        viewerRole: ctx.user.role,
        source: input.source ?? "list",
      });
      return { ok: true };
    }),

  getMyHits: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (!supplier) return null;

    const unlocked = await checkSupplierFeatureAccess(supplier.id, "viewerIdentities");
    return getSupplierHits(supplier.id, { includeViewers: unlocked });
  }),
});
