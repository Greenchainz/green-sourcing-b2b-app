import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { query, queryOne, queryMany, withTransaction } from "../../lib/pg-pool";
import { getDb } from "../db";
import { auditLog, AuditAction } from "../services/audit-log";
import { rfqRequests, suppliers } from "../../drizzle/schema";
import { eq, desc, ilike, or } from "drizzle-orm";

/**
 * RFQ Marketplace Lifecycle Router
 *
 * Full lifecycle: buyers create RFQs and invite suppliers,
 * suppliers submit quotes, buyers accept a winning quote,
 * and overdue RFQs are auto-expired by the scheduler.
 *
 * Procedures:
 *   rfq.create         — buyer creates an RFQ with invited suppliers (raw SQL, rfqs table)
 *   rfq.list           — list RFQs (buyer sees own, supplier sees invited)
 *   rfq.listMine       — list RFQs for the authenticated architect (Drizzle, rfq_requests)
 *   rfq.getById        — full RFQ detail with supplier info (Drizzle, rfq_requests)
 *   rfq.respond        — supplier accepts or declines an RFQ
 *   rfq.cancel         — architect cancels an RFQ
 *   rfq.submitQuote    — supplier submits a quote on an open RFQ
 *   rfq.acceptQuote    — buyer accepts a winning quote
 *   rfq.expire         — scheduler: auto-expire overdue RFQs (no auth)
 */
export const rfqRouter = router({
  // ── Architect: create a direct RFQ request to a single supplier ─────────
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.number().int().positive("Select a supplier"),
        materialType: z.string().min(1, "Material type is required"),
        quantity: z.number().positive("Enter a positive quantity"),
        specs: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const { enforceAndTrack } = await import("../usage-tracking-service");
      await enforceAndTrack(ctx.user.id, "rfq_submission");

      const [inserted] = await db
        .insert(rfqRequests)
        .values({
          architectId: ctx.user.id,
          supplierId: input.supplierId,
          materialType: input.materialType,
          quantity: String(input.quantity),
          specs: input.specs ?? null,
          status: "pending",
        })
        .returning({ id: rfqRequests.id });

      if (!inserted) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create RFQ" });
      }

      // Fetch supplier name for the success toast
      const [supplierRow] = await db
        .select({ companyName: suppliers.companyName })
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId))
        .limit(1);

      void auditLog.record({
        action: AuditAction.RFQ_CREATED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.user.role,
        resourceType: "rfq",
        resourceId: inserted.id,
        metadata: {
          supplierId: input.supplierId,
          supplierName: supplierRow?.companyName ?? null,
          materialType: input.materialType,
        },
        req: ctx.req,
      }).catch((err) => console.error("[audit] rfq.create", err));

      return { id: inserted.id, supplierName: supplierRow?.companyName ?? null };
    }),

  // ── List RFQs (buyer sees own, supplier sees invited) — raw SQL against rfqs table ──
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;
      const userId = ctx.user.id;
      const role = ctx.user.role;

      let rows: Array<Record<string, unknown>>;

      if (role === "supplier") {
        const params: unknown[] = [userId, limit, offset];
        let where = "";
        if (input?.status) {
          where = " AND r.status = $4";
          params.push(input.status);
        }

        rows = await queryMany(
          `SELECT r.*, COUNT(q.id) AS quote_count
           FROM rfqs r
           JOIN rfq_suppliers rs ON rs.rfq_id = r.id
           LEFT JOIN rfq_quotes q ON q.rfq_id = r.id
           WHERE rs.supplier_id = $1${where}
           GROUP BY r.id
           ORDER BY r.created_at DESC
           LIMIT $2 OFFSET $3`,
          params
        );
      } else {
        const params: unknown[] = [userId, limit, offset];
        let where = "";
        if (input?.status) {
          where = " AND r.status = $4";
          params.push(input.status);
        }

        rows = await queryMany(
          `SELECT r.*, COUNT(q.id) AS quote_count
           FROM rfqs r
           LEFT JOIN rfq_quotes q ON q.rfq_id = r.id
           WHERE r."userId" = $1${where}
           GROUP BY r.id
           ORDER BY r."createdAt" DESC
           LIMIT $2 OFFSET $3`,
          params
        );
      }

      return rows.map((r) => ({
        ...r,
        quote_count: Number(r.quote_count ?? 0),
      }));
    }),

  // ── Architect: list own RFQ requests (Drizzle, rfq_requests table) ────────
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: rfqRequests.id,
        architectId: rfqRequests.architectId,
        supplierId: rfqRequests.supplierId,
        materialType: rfqRequests.materialType,
        quantity: rfqRequests.quantity,
        specs: rfqRequests.specs,
        status: rfqRequests.status,
        createdAt: rfqRequests.createdAt,
        supplierName: suppliers.companyName,
      })
      .from(rfqRequests)
      .leftJoin(suppliers, eq(rfqRequests.supplierId, suppliers.id))
      .where(eq(rfqRequests.architectId, ctx.user.id))
      .orderBy(desc(rfqRequests.createdAt));

    return rows;
  }),

  // ── Get full RFQ detail with supplier info (Drizzle, rfq_requests table) ──
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const rows = await db
        .select({
          id: rfqRequests.id,
          architectId: rfqRequests.architectId,
          supplierId: rfqRequests.supplierId,
          materialId: rfqRequests.materialId,
          materialType: rfqRequests.materialType,
          quantity: rfqRequests.quantity,
          specs: rfqRequests.specs,
          message: rfqRequests.message,
          status: rfqRequests.status,
          createdAt: rfqRequests.createdAt,
          supplierName: suppliers.companyName,
          supplierCity: suppliers.city,
          supplierState: suppliers.state,
        })
        .from(rfqRequests)
        .leftJoin(suppliers, eq(rfqRequests.supplierId, suppliers.id))
        .where(eq(rfqRequests.id, input.id))
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }

      const row = rows[0];

      // Access guard: architect must own it, or supplier must be the assigned one, or admin
      if (
        row.architectId !== ctx.user.id &&
        row.supplierId !== ctx.user.id &&
        ctx.user.role !== "admin"
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Attempt to parse specs JSON — expose as parsedSpecs (may be null if plain text)
      let parsedSpecs: unknown = null;
      if (row.specs) {
        try {
          parsedSpecs = JSON.parse(row.specs);
        } catch {
          // specs is plain text, not JSON — leave parsedSpecs as null
        }
      }

      return { ...row, parsedSpecs };
    }),

  // ── Supplier: accept or decline an RFQ request ────────────────────────────
  respond: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["accepted", "declined"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only suppliers can respond to RFQs" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const rows = await db
        .select({ supplierId: rfqRequests.supplierId, status: rfqRequests.status })
        .from(rfqRequests)
        .where(eq(rfqRequests.id, input.id))
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (rows[0].supplierId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This RFQ was not assigned to you" });
      }

      await db
        .update(rfqRequests)
        .set({ status: input.status })
        .where(eq(rfqRequests.id, input.id));

      void auditLog.record({
        action: AuditAction.RFQ_RESPONDED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.user.role,
        resourceType: "rfq",
        resourceId: input.id,
        metadata: { status: input.status },
        req: ctx.req,
      }).catch((err) => console.error("[audit] rfq.respond", err));

      return { success: true };
    }),

  // ── Architect: cancel an RFQ request ─────────────────────────────────────
  cancel: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const rows = await db
        .select({ architectId: rfqRequests.architectId })
        .from(rfqRequests)
        .where(eq(rfqRequests.id, input.id))
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (rows[0].architectId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the RFQ owner can cancel it" });
      }

      await db
        .update(rfqRequests)
        .set({ status: "declined" })
        .where(eq(rfqRequests.id, input.id));

      void auditLog.record({
        action: AuditAction.RFQ_CANCELLED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.user.role,
        resourceType: "rfq",
        resourceId: input.id,
        req: ctx.req,
      }).catch((err) => console.error("[audit] rfq.cancel", err));

      return { success: true };
    }),

  // ── Supplier: submit a quote on a raw-SQL rfqs record ────────────────────
  submitQuote: protectedProcedure
    .input(
      z.object({
        rfq_id: z.string().uuid(),
        price_per_unit: z.number().positive("Price per unit must be positive"),
        lead_time_days: z.number().int().positive("Lead time must be positive"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only suppliers can submit quotes" });
      }

      const userId = ctx.user.id;

      const rfq = await queryOne<{ id: string; status: string; quantity: number }>(
        `SELECT id, status, quantity FROM rfqs WHERE id = $1`,
        [input.rfq_id]
      );

      if (!rfq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (!["submitted", "responded"].includes(rfq.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "RFQ is no longer open for quotes" });
      }

      const invite = await queryOne(
        `SELECT id FROM rfq_suppliers WHERE rfq_id = $1 AND supplier_id = $2`,
        [input.rfq_id, userId]
      );
      if (!invite) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not invited to this RFQ" });
      }

      const existing = await queryOne(
        `SELECT id FROM rfq_quotes WHERE rfq_id = $1 AND supplier_id = $2`,
        [input.rfq_id, userId]
      );
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You have already submitted a quote for this RFQ" });
      }

      const totalPrice = input.price_per_unit * Number(rfq.quantity);

      const quoteRow = await queryOne<Record<string, unknown>>(
        `INSERT INTO rfq_quotes (rfq_id, supplier_id, price_per_unit, total_price, lead_time_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.rfq_id,
          userId,
          input.price_per_unit,
          totalPrice,
          input.lead_time_days,
          input.notes ?? null,
        ]
      );

      return quoteRow;
    }),

  // ── Buyer: accept a winning quote ─────────────────────────────────────────
  acceptQuote: protectedProcedure
    .input(
      z.object({
        rfq_id: z.string().uuid(),
        quote_id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const rfq = await queryOne<{ id: string; userId: number; status: string }>(
        `SELECT id, "userId", status FROM rfqs WHERE id = $1`,
        [input.rfq_id]
      );

      if (!rfq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (rfq.userId !== userId && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the RFQ buyer can accept quotes" });
      }
      if (!["submitted", "responded"].includes(rfq.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "RFQ is no longer open" });
      }

      const quoteCheck = await queryOne<{ id: string }>(
        `SELECT id FROM rfq_quotes WHERE id = $1 AND rfq_id = $2`,
        [input.quote_id, input.rfq_id]
      );
      if (!quoteCheck) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found for this RFQ" });
      }

      await withTransaction(async (client) => {
        await client.query(
          `UPDATE rfq_quotes SET is_accepted = true WHERE id = $1`,
          [input.quote_id]
        );
        await client.query(
          `UPDATE rfqs SET status = 'awarded', "updatedAt" = NOW() WHERE id = $1`,
          [input.rfq_id]
        );
      });

      return { success: true };
    }),

  // ── Scheduler: auto-expire overdue RFQs (no auth) ────────────────────────
  // rfq_status enum: draft | submitted | responded | awarded | closed
  expire: publicProcedure.mutation(async () => {
    const result = await query(
      `UPDATE rfqs SET status = 'closed', "updatedAt" = NOW()
       WHERE status IN ('submitted', 'responded') AND "dueDate" < NOW()`,
    );

    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`[rfq.expire] Expired ${count} overdue RFQ(s)`);
    }

    return { expired_count: count };
  }),

  // ── List verified suppliers for RFQ targeting ────────────────────────────
  listSuppliers: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const baseQuery = db
        .select({
          id: suppliers.id,
          companyName: suppliers.companyName,
          city: suppliers.city,
          state: suppliers.state,
          materialCategories: suppliers.materialCategories,
          verificationStatus: suppliers.verificationStatus,
          isPremium: suppliers.isPremium,
          sustainabilityScore: suppliers.sustainabilityScore,
        })
        .from(suppliers);

      const rows = input?.search
        ? await baseQuery.where(
            or(
              ilike(suppliers.companyName, `%${input.search}%`),
              ilike(suppliers.city, `%${input.search}%`)
            )
          )
        : await baseQuery;

      return rows;
    }),

  // ── Create RFQ requests for multiple suppliers at once ────────────────────
  createMulti: protectedProcedure
    .input(
      z.object({
        projectInfo: z.object({
          projectName: z.string().min(1),
          projectType: z.string().optional(),
          projectCity: z.string().optional(),
          projectState: z.string().optional(),
          startDate: z.string().optional(),
          projectSqFt: z.number().optional(),
        }),
        materialRequest: z.object({
          category: z.string().min(1),
          description: z.string().optional(),
          quantity: z.number().positive(),
          unit: z.string().min(1),
          certifications: z.array(z.string()).optional(),
          maxGwp: z.number().optional(),
          epdRequired: z.string().optional(),
          targetDeliveryDate: z.string().optional(),
        }),
        supplierIds: z.array(z.number().int().positive()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const { enforceAndTrack } = await import("../usage-tracking-service");
      await enforceAndTrack(ctx.user.id, "rfq_submission");

      const specsJson = JSON.stringify({
        version: 2,
        projectInfo: input.projectInfo,
        materialRequest: input.materialRequest,
      });

      let primaryId: number | null = null;

      for (const supplierId of input.supplierIds) {
        const [inserted] = await db
          .insert(rfqRequests)
          .values({
            architectId: ctx.user.id,
            supplierId,
            materialType: input.materialRequest.category,
            quantity: String(input.materialRequest.quantity),
            specs: specsJson,
            message: input.materialRequest.description ?? null,
            status: "pending",
          })
          .returning({ id: rfqRequests.id });

        if (primaryId === null && inserted) {
          primaryId = inserted.id;
        }
      }

      if (primaryId === null) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create RFQ" });
      }

      return { primaryId };
    }),

  // ── Supplier: list incoming RFQ requests assigned to me ───────────────────
  listIncoming: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const supplierRows = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (!supplierRows.length) return [];

    const supplierId = supplierRows[0].id;

    const rows = await db
      .select({
        id: rfqRequests.id,
        architectId: rfqRequests.architectId,
        supplierId: rfqRequests.supplierId,
        materialType: rfqRequests.materialType,
        quantity: rfqRequests.quantity,
        specs: rfqRequests.specs,
        message: rfqRequests.message,
        status: rfqRequests.status,
        createdAt: rfqRequests.createdAt,
      })
      .from(rfqRequests)
      .where(eq(rfqRequests.supplierId, supplierId))
      .orderBy(desc(rfqRequests.createdAt));

    return rows.map((r) => {
      let parsedSpecs: unknown = null;
      if (r.specs) {
        try { parsedSpecs = JSON.parse(r.specs); } catch { /* plain text */ }
      }
      return { ...r, parsedSpecs };
    });
  }),
});
