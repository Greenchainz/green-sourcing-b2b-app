import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { rfqs, rfqItems, rfqBids, suppliers } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const supplierRfqRouter = router({
  /**
   * Get matched RFQs for the current supplier with match scores
   */
  getMatchedRfqs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get supplier record
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (!supplier) {
      return [];
    }

    // Import matchSuppliersToRfq to get match scores
    const { getSupplierMatchedRfqs } = await import("./rfq-service");
    const matchedRfqs = await getSupplierMatchedRfqs(supplier.id);

    return matchedRfqs;
  }),

  /**
   * Get available RFQs for a supplier — only accessible by registered suppliers
   */
  getAvailableRfqs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Only registered suppliers may browse open RFQs
      const [supplier] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      const role = ctx.auth?.role;
      if (!supplier && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "A supplier account is required to view available RFQs" });
      }

      const allRfqs = await db
        .select({
          id: rfqs.id,
          projectName: rfqs.projectName,
          projectLocation: rfqs.projectLocation,
          projectType: rfqs.projectType,
          status: rfqs.status,
          createdAt: rfqs.createdAt,
        })
        .from(rfqs)
        .where(eq(rfqs.status, "submitted"))
        .limit(input.limit)
        .offset(input.offset);

      return allRfqs;
    }),

  /**
   * Get RFQ details including items for a specific RFQ
   */
  getRfqDetails: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const rfq = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.id, input.rfqId))
        .limit(1);

      if (!rfq.length) {
        throw new Error("RFQ not found");
      }

      const items = await db
        .select({
          id: rfqItems.id,
          rfqId: rfqItems.rfqId,
          materialId: rfqItems.materialId,
          quantity: rfqItems.quantity,
          quantityUnit: rfqItems.quantityUnit,
          notes: rfqItems.notes,
        })
        .from(rfqItems)
        .where(eq(rfqItems.rfqId, input.rfqId));

      return {
        ...rfq[0],
        items,
      };
    }),

  /**
   * Submit a bid for an RFQ
   */
  submitBid: protectedProcedure
    .input(
      z.object({
        rfqId: z.number(),
        bidPrice: z.number().positive(),
        leadDays: z.number().positive(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get supplier ID
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplier.length) {
        throw new Error("Supplier not found");
      }

      // Check if bid already exists
      const existingBid = await db
        .select()
        .from(rfqBids)
        .where(
          and(eq(rfqBids.rfqId, input.rfqId), eq(rfqBids.supplierId, supplier[0].id))
        )
        .limit(1);

      if (existingBid.length) {
        // Update existing bid
        await db
          .update(rfqBids)
          .set({
            bidPrice: input.bidPrice.toString(),
            leadDays: input.leadDays,
            notes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(rfqBids.id, existingBid[0].id));

        return {
          id: existingBid[0].id,
          status: "updated",
          message: "Bid updated successfully",
        };
      }

      // Insert new bid
      await db.insert(rfqBids).values({
        rfqId: input.rfqId,
        supplierId: supplier[0].id,
        bidPrice: input.bidPrice.toString(),
        leadDays: input.leadDays,
        notes: input.notes,
        status: "submitted",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        status: "created",
        message: "Bid submitted successfully",
      };
    }),

  /**
   * Get bid history for a supplier
   */
  getBidHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get supplier ID
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplier.length) {
        return [];
      }

      const bids = await db
        .select({
          id: rfqBids.id,
          rfqId: rfqBids.rfqId,
          bidPrice: rfqBids.bidPrice,
          leadDays: rfqBids.leadDays,
          status: rfqBids.status,
          notes: rfqBids.notes,
          createdAt: rfqBids.createdAt,
          projectName: rfqs.projectName,
          projectLocation: rfqs.projectLocation,
        })
        .from(rfqBids)
        .leftJoin(rfqs, eq(rfqBids.rfqId, rfqs.id))
        .where(eq(rfqBids.supplierId, supplier[0].id))
        .orderBy(desc(rfqBids.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return bids;
    }),

  /**
   * Get a specific bid
   */
  getBid: protectedProcedure
    .input(z.object({ bidId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get supplier ID
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplier.length) {
        throw new Error("Supplier not found");
      }

      const bid = await db
        .select()
        .from(rfqBids)
        .where(
          and(eq(rfqBids.id, input.bidId), eq(rfqBids.supplierId, supplier[0].id))
        )
        .limit(1);

      if (!bid.length) {
        throw new Error("Bid not found");
      }

      return bid[0];
    }),

  /**
   * Update a bid
   */
  updateBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        bidPrice: z.number().positive().optional(),
        leadDays: z.number().positive().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get supplier ID
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplier.length) {
        throw new Error("Supplier not found");
      }

      // Verify bid belongs to supplier
      const bid = await db
        .select()
        .from(rfqBids)
        .where(
          and(eq(rfqBids.id, input.bidId), eq(rfqBids.supplierId, supplier[0].id))
        )
        .limit(1);

      if (!bid.length) {
        throw new Error("Bid not found or unauthorized");
      }

      await db
        .update(rfqBids)
        .set({
          bidPrice: input.bidPrice ? input.bidPrice.toString() : bid[0].bidPrice,
          leadDays: input.leadDays || bid[0].leadDays,
          notes: input.notes !== undefined ? input.notes : bid[0].notes,
          updatedAt: new Date(),
        })
        .where(eq(rfqBids.id, input.bidId));

      return { success: true, message: "Bid updated successfully" };
    }),

  /**
   * Get aggregated stats for the supplier analytics dashboard
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (!supplier) {
      return { matchedRfqs: 0, totalBids: 0, activeBids: 0, acceptedBids: 0, winRate: 0, avgBidPrice: 0 };
    }

    const allBids = await db
      .select({ status: rfqBids.status, bidPrice: rfqBids.bidPrice })
      .from(rfqBids)
      .where(eq(rfqBids.supplierId, supplier.id));

    const totalBids = allBids.length;
    const activeBids = allBids.filter((b) => b.status === "submitted").length;
    const acceptedBids = allBids.filter((b) => b.status === "accepted").length;
    const winRate = totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;
    const avgBidPrice =
      totalBids > 0
        ? Math.round(allBids.reduce((sum, b) => sum + parseFloat(b.bidPrice ?? "0"), 0) / totalBids)
        : 0;

    const { getSupplierMatchedRfqs } = await import("./rfq-service");
    const matchedRfqs = await getSupplierMatchedRfqs(supplier.id);

    return { matchedRfqs: matchedRfqs.length, totalBids, activeBids, acceptedBids, winRate, avgBidPrice };
  }),

  /**
   * Get route from supplier to RFQ location
   */
  getRoute: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get supplier location
      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplier || !supplier.latitude || !supplier.longitude) {
        throw new Error("Supplier location not found");
      }

      // Get RFQ location
      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.id, input.rfqId))
        .limit(1);

      if (!rfq || !rfq.latitude || !rfq.longitude) {
        throw new Error("RFQ location not found");
      }

      // Calculate route
      const { calculateRoute } = await import("./azure-maps-service");
      const route = await calculateRoute(
        { latitude: Number(supplier.latitude), longitude: Number(supplier.longitude) },
        { latitude: Number(rfq.latitude), longitude: Number(rfq.longitude) }
      );

      if (!route) {
        throw new Error("Failed to calculate route");
      }

      return route;
    }),
});
