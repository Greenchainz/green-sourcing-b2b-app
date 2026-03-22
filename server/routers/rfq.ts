import { router, protectedProcedure, publicProcedure, architectProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { rfqRequests, suppliers } from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { sendDirectRfqAlert } from "../email-service";

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
          sustainabilityScore: suppliers.sustainabilityScore,
          isPremium: suppliers.isPremium,
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

  // ── Architect: create rich RFQ to multiple suppliers ──────────────────────
  createMulti: architectProcedure
    .input(z.object({
      projectInfo: z.object({
        projectName: z.string().min(1),
        projectType: z.string().min(1),
        projectCity: z.string().min(1),
        projectState: z.string().min(2).max(2),
        startDate: z.string().optional(),
        projectSqFt: z.number().positive().optional(),
      }),
      materialRequest: z.object({
        category: z.string().min(1),
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.enum(["SF", "LF", "EA", "CY", "tons"]),
        certifications: z.array(z.string()).optional(),
        maxGwp: z.number().positive().optional(),
        epdRequired: z.enum(["yes", "no", "preferred"]).optional(),
        targetDeliveryDate: z.string().optional(),
      }),
      supplierIds: z.array(z.number().int().positive()).min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const supplierRows = await db
        .select({ id: suppliers.id, companyName: suppliers.companyName, email: suppliers.email })
        .from(suppliers)
        .where(inArray(suppliers.id, input.supplierIds));

      if (supplierRows.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "No valid suppliers found" });

      const materialType =
        `${input.materialRequest.category}: ${input.materialRequest.description}`.slice(0, 255);

      const specsPayload = {
        version: 2,
        projectInfo: input.projectInfo,
        materialRequest: input.materialRequest,
        batchSupplierIds: input.supplierIds,
      };
      const specs = JSON.stringify(specsPayload);

      const ids: number[] = [];
      for (const supplierId of input.supplierIds) {
        const [row] = await db
          .insert(rfqRequests)
          .values({
            architectId: ctx.user.id,
            supplierId,
            materialType,
            quantity: input.materialRequest.quantity.toString(),
            specs,
          })
          .returning({ id: rfqRequests.id });
        ids.push(row.id);
      }

      // Fire-and-forget supplier notifications
      void Promise.all(
        supplierRows.map((s, i) =>
          sendDirectRfqAlert({
            supplierEmail: s.email,
            supplierCompanyName: s.companyName,
            architectName: ctx.user.name ?? "An architect",
            projectName: input.projectInfo.projectName,
            materialCategory: input.materialRequest.category,
            rfqId: ids[i] ?? ids[0],
          })
        )
      ).catch((err: unknown) => console.error("[rfq] Email send failed:", err));

      return { ids, primaryId: ids[0] };
    }),

  // ── Get full RFQ by ID ─────────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [row] = await db
        .select({
          id: rfqRequests.id,
          architectId: rfqRequests.architectId,
          supplierId: rfqRequests.supplierId,
          supplierName: suppliers.companyName,
          supplierEmail: suppliers.email,
          supplierCity: suppliers.city,
          supplierState: suppliers.state,
          materialType: rfqRequests.materialType,
          quantity: rfqRequests.quantity,
          specs: rfqRequests.specs,
          status: rfqRequests.status,
          createdAt: rfqRequests.createdAt,
        })
        .from(rfqRequests)
        .leftJoin(suppliers, eq(rfqRequests.supplierId, suppliers.id))
        .where(eq(rfqRequests.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });

      // Auth: only the architect who created it or the receiving supplier may view
      const [supplierRow] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      const isOwner = row.architectId === ctx.user.id;
      const isRecipient = supplierRow?.id === row.supplierId;
      if (!isOwner && !isRecipient)
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      let parsedSpecs: Record<string, unknown> | null = null;
      if (row.specs) {
        try { parsedSpecs = JSON.parse(row.specs); } catch { /* not JSON — legacy */ }
      }

      return { ...row, parsedSpecs };
    }),

  // ── Architect: cancel a pending RFQ ───────────────────────────────────────
  cancel: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [row] = await db
        .select({ id: rfqRequests.id, architectId: rfqRequests.architectId, specs: rfqRequests.specs })
        .from(rfqRequests)
        .where(eq(rfqRequests.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      if (row.architectId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      let specs: Record<string, unknown> = {};
      if (row.specs) { try { specs = JSON.parse(row.specs); } catch { /* ignore */ } }
      specs.cancelledByArchitect = true;
      specs.cancelledAt = new Date().toISOString();

      await db
        .update(rfqRequests)
        .set({ specs: JSON.stringify(specs), status: "declined" })
        .where(eq(rfqRequests.id, input.id));

      return { success: true };
    }),
});
