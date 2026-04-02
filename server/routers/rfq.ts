import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { query, queryOne, queryMany, withTransaction } from "../pg-db";

/**
 * RFQ Marketplace Lifecycle Router
 *
 * Full lifecycle: buyers create RFQs and invite suppliers,
 * suppliers submit quotes, buyers accept a winning quote,
 * and overdue RFQs are auto-expired by the scheduler.
 *
 * Procedures:
 *   rfq.create       — buyer creates an RFQ with invited suppliers
 *   rfq.list         — list RFQs (buyer sees own, supplier sees invited)
 *   rfq.getById      — full RFQ detail with quotes
 *   rfq.submitQuote  — supplier submits a quote on an open RFQ
 *   rfq.acceptQuote  — buyer accepts a winning quote
 *   rfq.expire       — scheduler: auto-expire overdue RFQs (no auth)
 */
export const rfqRouter = router({
  // ── Buyer: create an RFQ and invite suppliers ─────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        material_category: z.string().optional(),
        quantity: z.number().positive("Quantity must be positive"),
        unit: z.string().min(1, "Unit is required"),
        delivery_location: z.string().optional(),
        deadline: z.string().refine(
          (d) => new Date(d) > new Date(),
          "Deadline must be in the future"
        ),
        supplier_ids: z.array(z.number().int().positive()).min(1, "At least one supplier required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "buyer" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only buyers can create RFQs" });
      }

      const { enforceAndTrack } = await import("../usage-tracking-service");
      await enforceAndTrack(ctx.user.id, "rfq_submission");

      const rfqRow = await queryOne<{ id: string }>(
        `INSERT INTO rfqs (buyer_id, title, description, material_category, quantity, unit, delivery_location, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          ctx.user.id,
          input.title,
          input.description ?? null,
          input.material_category ?? null,
          input.quantity,
          input.unit,
          input.delivery_location ?? null,
          new Date(input.deadline),
        ]
      );

      if (!rfqRow) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create RFQ" });
      }

      // Insert invited suppliers
      for (const supplierId of input.supplier_ids) {
        await query(
          `INSERT INTO rfq_suppliers (rfq_id, supplier_id) VALUES ($1, $2)
           ON CONFLICT (rfq_id, supplier_id) DO NOTHING`,
          [rfqRow.id, supplierId]
        );
      }

      return { rfq_id: rfqRow.id };
    }),

  // ── List RFQs (buyer sees own, supplier sees invited) ─────────────────────
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
        // Supplier sees RFQs they were invited to
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
        // Buyer / admin sees their own RFQs
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
           WHERE r.buyer_id = $1${where}
           GROUP BY r.id
           ORDER BY r.created_at DESC
           LIMIT $2 OFFSET $3`,
          params
        );
      }

      return rows.map((r) => ({
        ...r,
        quote_count: Number(r.quote_count ?? 0),
      }));
    }),

  // ── Get full RFQ detail with quotes ───────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ rfq_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rfq = await queryOne<Record<string, unknown>>(
        `SELECT * FROM rfqs WHERE id = $1`,
        [input.rfq_id]
      );

      if (!rfq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }

      const userId = ctx.user.id;
      const role = ctx.user.role;

      // Check access: buyer must own, supplier must be invited
      if (role === "supplier") {
        const invite = await queryOne(
          `SELECT id FROM rfq_suppliers WHERE rfq_id = $1 AND supplier_id = $2`,
          [input.rfq_id, userId]
        );
        if (!invite) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not invited to this RFQ" });
        }
      } else if (rfq.buyer_id !== userId && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Fetch quotes — buyer sees all, supplier sees only their own
      let quotes: Array<Record<string, unknown>>;
      if (role === "supplier") {
        quotes = await queryMany(
          `SELECT * FROM rfq_quotes WHERE rfq_id = $1 AND supplier_id = $2`,
          [input.rfq_id, userId]
        );
      } else {
        quotes = await queryMany(
          `SELECT * FROM rfq_quotes WHERE rfq_id = $1 ORDER BY submitted_at ASC`,
          [input.rfq_id]
        );
      }

      // Fetch invited suppliers
      const suppliers = await queryMany(
        `SELECT * FROM rfq_suppliers WHERE rfq_id = $1`,
        [input.rfq_id]
      );

      return { ...rfq, quotes, suppliers };
    }),

  // ── Supplier: submit a quote ──────────────────────────────────────────────
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

      // Verify RFQ is open
      const rfq = await queryOne<{ id: string; status: string; quantity: number }>(
        `SELECT id, status, quantity FROM rfqs WHERE id = $1`,
        [input.rfq_id]
      );

      if (!rfq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (rfq.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "RFQ is no longer open for quotes" });
      }

      // Verify supplier is invited
      const invite = await queryOne(
        `SELECT id FROM rfq_suppliers WHERE rfq_id = $1 AND supplier_id = $2`,
        [input.rfq_id, userId]
      );
      if (!invite) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not invited to this RFQ" });
      }

      // Check for duplicate quote
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

      // Verify RFQ ownership and status
      const rfq = await queryOne<{ id: string; buyer_id: number; status: string }>(
        `SELECT id, buyer_id, status FROM rfqs WHERE id = $1`,
        [input.rfq_id]
      );

      if (!rfq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (rfq.buyer_id !== userId && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the RFQ buyer can accept quotes" });
      }
      if (rfq.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "RFQ is no longer open" });
      }

      // Verify quote belongs to this RFQ
      const quoteCheck = await queryOne<{ id: string }>(
        `SELECT id FROM rfq_quotes WHERE id = $1 AND rfq_id = $2`,
        [input.quote_id, input.rfq_id]
      );
      if (!quoteCheck) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found for this RFQ" });
      }

      // Accept quote and award RFQ in a transaction
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE rfq_quotes SET is_accepted = true WHERE id = $1`,
          [input.quote_id]
        );
        await client.query(
          `UPDATE rfqs SET status = 'awarded', updated_at = NOW() WHERE id = $1`,
          [input.rfq_id]
        );
      });

      return { success: true };
    }),

  // ── Scheduler: auto-expire overdue RFQs (no auth) ────────────────────────
  expire: publicProcedure.mutation(async () => {
    const result = await query(
      `UPDATE rfqs SET status = 'expired', updated_at = NOW()
       WHERE status = 'open' AND deadline < NOW()`,
    );

    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`[rfq.expire] Expired ${count} overdue RFQ(s)`);
    }

    return { expired_count: count };
  }),
});
