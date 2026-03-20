import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { rfqRequests, suppliers } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * RFQ Requests Router
 *
 * Direct-assignment model: an architect sends an RFQ to a specific supplier.
 * Suppliers receive the request and respond with accept/decline.
 *
 * Routes:
 *   rfqRequests.create        — architect creates an RFQ for a supplier
 *   rfqRequests.listMine      — architect sees their own submitted RFQs
 *   rfqRequests.listIncoming  — supplier sees RFQs directed at them
 *   rfqRequests.respond       — supplier accepts or declines an RFQ
 *   rfqRequests.listSuppliers — public: list verified suppliers for the form dropdown
 */
export const rfqRouter = router({
  // ── Architect: create an RFQ directed at one supplier ─────────────────────
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.number().int().positive(),
        materialType: z.string().min(1, "Material type is required"),
        quantity: z.number().positive("Quantity must be positive"),
        specs: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify supplier exists
      const [supplier] = await db
        .select({ id: suppliers.id, companyName: suppliers.companyName })
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId))
        .limit(1);
      if (!supplier) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });

      const [row] = await db
        .insert(rfqRequests)
        .values({
          architectId: ctx.user.id,
          supplierId: input.supplierId,
          materialType: input.materialType,
          quantity: input.quantity.toString(),
          specs: input.specs ?? null,
        })
        .returning({ id: rfqRequests.id });

      return { id: row.id, supplierName: supplier.companyName };
    }),

  // ── Architect: list their own RFQs ────────────────────────────────────────
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: rfqRequests.id,
        supplierId: rfqRequests.supplierId,
        supplierName: suppliers.companyName,
        materialType: rfqRequests.materialType,
        quantity: rfqRequests.quantity,
        specs: rfqRequests.specs,
        status: rfqRequests.status,
        createdAt: rfqRequests.createdAt,
      })
      .from(rfqRequests)
      .leftJoin(suppliers, eq(rfqRequests.supplierId, suppliers.id))
      .where(eq(rfqRequests.architectId, ctx.user.id))
      .orderBy(desc(rfqRequests.createdAt));
  }),

  // ── Supplier: list RFQs directed at them ──────────────────────────────────
  listIncoming: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const [supplierRow] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);
    if (!supplierRow) return [];

    return db
      .select({
        id: rfqRequests.id,
        architectId: rfqRequests.architectId,
        materialType: rfqRequests.materialType,
        quantity: rfqRequests.quantity,
        specs: rfqRequests.specs,
        status: rfqRequests.status,
        createdAt: rfqRequests.createdAt,
      })
      .from(rfqRequests)
      .where(eq(rfqRequests.supplierId, supplierRow.id))
      .orderBy(desc(rfqRequests.createdAt));
  }),

  // ── Supplier: respond to an RFQ ───────────────────────────────────────────
  respond: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["accepted", "declined"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Resolve the supplier record for this user
      const [supplierRow] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);
      if (!supplierRow)
        throw new TRPCError({ code: "FORBIDDEN", message: "No supplier profile for this account" });

      // Make sure the RFQ actually belongs to this supplier
      const [rfq] = await db
        .select({ id: rfqRequests.id })
        .from(rfqRequests)
        .where(and(eq(rfqRequests.id, input.id), eq(rfqRequests.supplierId, supplierRow.id)))
        .limit(1);
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });

      await db
        .update(rfqRequests)
        .set({ status: input.status })
        .where(eq(rfqRequests.id, input.id));

      return { success: true };
    }),

  // ── Public: list verified suppliers for the form dropdown ─────────────────
  listSuppliers: publicProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          id: suppliers.id,
          companyName: suppliers.companyName,
          city: suppliers.city,
          state: suppliers.state,
          certifications: suppliers.certifications,
        })
        .from(suppliers)
        .where(eq(suppliers.verified, true))
        .orderBy(suppliers.companyName)
        .limit(200);

      if (input?.search) {
        const q = input.search.toLowerCase();
        return rows.filter((s) => s.companyName.toLowerCase().includes(q));
      }

      return rows;
    }),
});
