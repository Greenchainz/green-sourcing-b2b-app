import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { query, queryOne, queryMany, withTransaction } from "../../lib/pg-pool";
import { getDb } from "../db";
import { auditLog, AuditAction } from "../services/audit-log";
import { publishRfqEvent } from "../services/event-bus";
import { rfqRequests, rfqDrafts, suppliers, suppliersLocation } from "../../drizzle/schema";
import { eq, desc, ilike, or, not, inArray } from "drizzle-orm";
import { getShippingClass, isWithinServiceArea, DEFAULT_RADIUS_MILES } from "../lib/shipping-classes";

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

      void publishRfqEvent({ type: "rfq.created", rfqId: inserted.id, supplierId: input.supplierId, buyerId: ctx.user.id })
        .catch((err) => console.error("[event-bus] rfq.created", err));

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
        .where(eq(rfqRequests.id, input.id));

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      }
      if (rows.length > 1) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Duplicate RFQ records found" });
      }
      const [row] = rows;

      if (row.supplierId !== ctx.user.id && ctx.user.role !== "admin") {
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

      void publishRfqEvent({ type: "rfq.responded", rfqId: input.id, status: input.status })
        .catch((err) => console.error("[event-bus] rfq.responded", err));

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

      void publishRfqEvent({ type: "rfq.cancelled", rfqId: input.id })
        .catch((err) => console.error("[event-bus] rfq.cancelled", err));

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

  // ── Manual trigger: force-expire overdue RFQs (admin only) ─────────────
  // Auto-expiry runs every 15 min via notification-scheduler.ts expireOverdueRfqs().
  // This endpoint exists only for manual intervention — requires admin role.
  // rfq_status enum: draft | submitted | responded | awarded | closed
  expire: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      const result = await query(
        `UPDATE rfqs SET status = 'closed', "updatedAt" = NOW()
         WHERE status IN ('submitted', 'responded') AND "dueDate" < NOW()`,
      );

      const count = result.rowCount ?? 0;
      if (count > 0) {
        console.log(`[rfq.expire] Manual trigger: expired ${count} overdue RFQ(s)`);
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

  // ── Smart supplier matching for RFQ targeting ────────────────────────────
  // Scores every active supplier against the RFQ requirements and returns
  // a ranked list of ≥5 results with isHighSustainability + isLocalSupplier flags.
  matchSuppliers: protectedProcedure
    .input(
      z.object({
        category: z.string().min(1),
        certifications: z.array(z.string()).optional().default([]),
        maxGwp: z.number().optional(),
        projectState: z.string().optional(),
        projectCity: z.string().optional(),
        projectLat: z.number().optional(),
        projectLng: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Pull all non-rejected suppliers with fields needed for scoring
      const rows = await db
        .select({
          id: suppliers.id,
          companyName: suppliers.companyName,
          city: suppliers.city,
          state: suppliers.state,
          materialCategories: suppliers.materialCategories,
          certifications: suppliers.certifications,
          verificationStatus: suppliers.verificationStatus,
          isPremium: suppliers.isPremium,
          sustainabilityScore: suppliers.sustainabilityScore,
          weightedRankScore: suppliers.weightedRankScore,
          tier: suppliers.tier,
          // ── Service area fields (shipping-class routing) ──────────────────
          serviceRadiusMiles: suppliers.serviceRadiusMiles,
          statesServed: suppliers.statesServed,
          shipsNationwide: suppliers.shipsNationwide,
        })
        .from(suppliers)
        .where(not(eq(suppliers.verificationStatus, "rejected")));

      const categoryLower = input.category.toLowerCase();
      const requestedCerts = (input.certifications ?? []).map((c) => c.toLowerCase());
      const projectState = (input.projectState ?? "").toUpperCase();

      // ── Shipping class for this RFQ ────────────────────────────────────────
      const shippingClass = getShippingClass(input.category);

      // ── Haversine distance (miles) ─────────────────────────────────────────
      function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 3959;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      // Fetch supplier locations in one query for haversine scoring
      const supplierIds = rows.map((r) => r.id);
      const locationRows =
        supplierIds.length > 0
          ? await db
              .select({
                supplierId: suppliersLocation.supplierId,
                lat: suppliersLocation.latitude,
                lng: suppliersLocation.longitude,
              })
              .from(suppliersLocation)
              .where(inArray(suppliersLocation.supplierId, supplierIds))
          : [];

      const locationMap = new Map<number, { lat: number; lng: number }>();
      for (const loc of locationRows) {
        if (!locationMap.has(loc.supplierId)) {
          locationMap.set(loc.supplierId, {
            lat: parseFloat(String(loc.lat)),
            lng: parseFloat(String(loc.lng)),
          });
        }
      }

      const projectLat = input.projectLat;
      const projectLng = input.projectLng;

      // Score each supplier — with shipping-class eligibility gate
      const scored = rows.flatMap((s) => {
        let score = 0;

        // ── Category match: +40 ────────────────────────────────────────────
        const supplierCats = (s.materialCategories ?? []).map((c) => c.toLowerCase());
        const categoryMatch = supplierCats.some(
          (c) => c.includes(categoryLower) || categoryLower.includes(c)
        );
        if (categoryMatch) score += 40;

        // ── Distance & service-area eligibility gate ───────────────────────
        const supplierCoords = locationMap.get(s.id);
        let distanceMiles: number | null = null;
        if (projectLat != null && projectLng != null && supplierCoords) {
          distanceMiles = haversine(projectLat, projectLng, supplierCoords.lat, supplierCoords.lng);
        }

        const eligible = isWithinServiceArea({
          distanceMiles,
          projectState,
          supplierState: s.state ?? null,
          shipsNationwide: s.shipsNationwide ?? false,
          statesServed: (s.statesServed as string[] | null) ?? null,
          serviceRadiusMiles: s.serviceRadiusMiles ?? null,
          shippingClass,
        });

        // Hard exclude ineligible suppliers.
        //
        // local_heavy (concrete, CMU, aggregates): always hard-exclude if out of range.
        //   A concrete supplier 200mi away is effectively unreachable — freight kills the bid.
        //
        // regional (insulation, roofing, flooring, etc.): hard-exclude when we have real
        //   distance data. When coordinates are unavailable, state-match already runs inside
        //   isWithinServiceArea and decided eligibility — so !eligible with no coordinates
        //   also means hard-exclude.
        //
        // national_specialty (structural steel, CLT, curtain wall): supplier-declared
        //   statesServed restrictions are the only realistic exclusion. The defaultRadius
        //   is 2,500mi (effectively nationwide), so !eligible here means the supplier
        //   explicitly restricted to states that don't include the project. Respect that.
        //
        // Rule: never surface a supplier who cannot realistically deliver to the jobsite.
        if (!eligible) {
          if (shippingClass === "local_heavy") return [];
          if (shippingClass === "regional") return [];
          if (shippingClass === "national_specialty") return [];
          // digital_data has no distance restriction; eligible is always true
        }

        // ── Distance scoring ───────────────────────────────────────────────
        let isLocalSupplier = false;
        if (distanceMiles != null) {
          if (distanceMiles < 50)       { score += 30; isLocalSupplier = true; }
          else if (distanceMiles < 150) { score += 25; isLocalSupplier = true; }
          else if (distanceMiles < 300) { score += 15; }
          else if (distanceMiles < 500) { score += 8; }
          else if (eligible)            { score += 2; } // far but within declared service area
        } else {
          // No coordinates — fall back to state match
          isLocalSupplier = !!(
            projectState.length === 2 &&
            s.state &&
            s.state.trim().toUpperCase() === projectState
          );
          if (isLocalSupplier) score += 25;
        }

        // ── Certification overlap: +5 each, capped at +20 ─────────────────
        const supplierCerts = (s.certifications ?? []).map((c) => c.toLowerCase());
        const certificationMatches = (input.certifications ?? []).filter((rc) =>
          supplierCerts.some(
            (sc) => sc.includes(rc.toLowerCase()) || rc.toLowerCase().includes(sc)
          )
        );
        score += Math.min(certificationMatches.length * 5, 20);

        // ── Sustainability score (0–100 → up to +20) ──────────────────────
        const sustScore = s.sustainabilityScore != null ? Number(s.sustainabilityScore) : 0;
        score += (sustScore / 100) * 20;

        // ── Quality & tier signals ─────────────────────────────────────────
        if (s.isPremium) score += 5;
        if (s.verificationStatus === "approved") score += 3;
        if (s.weightedRankScore != null) score += Math.min(s.weightedRankScore * 2, 10);
        if (s.tier === "premium") score += 8;
        else if (s.tier === "standard") score += 4;
        else if (s.tier === "free") score -= 5; // free suppliers are less likely to be RFQ-ready

        return [{
          ...s,
          sustainabilityScore: s.sustainabilityScore != null ? Number(s.sustainabilityScore) : null,
          weightedRankScore: s.weightedRankScore ?? null,
          matchScore: Math.round(score),
          isLocalSupplier,
          certificationMatches,
          isHighSustainability: false, // set after sorting below
          shippingClass,
        }];
      });

      // Sort by composite score
      scored.sort((a, b) => b.matchScore - a.matchScore);

      // Guarantee ≥5 results: prefer category matches, fall back to overall top
      const categoryMatches = scored.filter((s) => s.matchScore >= 40);
      const fallbackIds = new Set<number>();

      let pool: typeof scored;
      if (categoryMatches.length >= 5) {
        pool = categoryMatches;
      } else {
        // Fill remaining slots from overall top; mark those as fallback
        const fill = scored
          .filter((s) => s.matchScore < 40)
          .slice(0, Math.max(5 - categoryMatches.length, 0));
        fill.forEach((s) => fallbackIds.add(s.id));
        pool = [...categoryMatches, ...fill];
      }

      // Cap at 15 so the UI stays manageable
      const results = pool.slice(0, 15);

      // ── RFQ-MATCHING agent: semantic re-rank + sustainability flagging ────────
      // Runs against the scored candidate pool. Falls back to score order on
      // timeout/error — transparently, with zero impact on the user experience.
      const { rankSuppliersWithAgent } = await import("../services/rfq-agent");
      const agentRanking = await rankSuppliersWithAgent(results, {
        category: input.category,
        certifications: input.certifications,
        maxGwp: input.maxGwp,
        projectState: input.projectState,
        projectCity: input.projectCity,
        projectLat: input.projectLat,
        projectLng: input.projectLng,
      });

      // Apply agent ranking order to results
      const rankMap = new Map(
        agentRanking.rankedIds.map((id, idx) => [id, idx])
      );
      results.sort(
        (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
      );

      // Use agent's high-sustainability judgement
      const highIds = new Set(agentRanking.highSustainabilityIds);
      if (highIds.size === 0 && results.length > 0) {
        highIds.add(results[0].id); // guaranteed minimum
      }

      // Return only buyer-safe fields — strip internal tier and rank score
      return results.map(({ weightedRankScore: _wr, tier: _tier, ...s }) => ({
        ...s,
        isHighSustainability: highIds.has(s.id),
        isFallback: fallbackIds.has(s.id),
        _agentSource: agentRanking.source, // dev signal — stripped by tRPC serialisation if needed
      }));
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

  // ── HITL: Save AI-proposed RFQ as a draft for human review ───────────────
  // Called immediately after the AI intake parses the user's text.
  // Runs the swap engine (enrichment + supplier ranking) and persists the
  // result as an rfq_draft row with status="draft".
  // The architect then reviews and either approves (→ approveDraft) or edits.
  saveDraft: protectedProcedure
    .input(
      z.object({
        rawText: z.string().min(5, "Describe what you need (min 5 chars)"),
        projectZip: z.string().regex(/^\d{5}$/).optional(),
        // Allow the client to pass the already-parsed intent fields (from parse-text)
        // so we don't have to re-parse. All are optional — engine fills gaps.
        parsedIntent: z.object({
          category: z.string().optional(),
          description: z.string().optional(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
          certifications: z.array(z.string()).optional(),
          maxGwp: z.number().optional(),
          epdRequired: z.boolean().optional(),
          projectName: z.string().optional(),
          projectType: z.string().optional(),
          projectCity: z.string().optional(),
          projectState: z.string().optional(),
          confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
          fieldsFound: z.array(z.string()).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const { runSwapEngine, intentFromParsed } = await import("../domain/swapEngine");
      const { parseRfqText } = await import("../services/document-intelligence");

      // Build the intent — use provided parsed fields or re-parse the raw text
      let intent;
      if (input.parsedIntent && (input.parsedIntent.fieldsFound?.length ?? 0) > 0) {
        intent = {
          rawText: input.rawText,
          category: input.parsedIntent.category,
          description: input.parsedIntent.description,
          quantity: input.parsedIntent.quantity,
          unit: input.parsedIntent.unit,
          certifications: input.parsedIntent.certifications,
          maxGwp: input.parsedIntent.maxGwp,
          epdRequired: input.parsedIntent.epdRequired,
          projectName: input.parsedIntent.projectName,
          projectType: input.parsedIntent.projectType,
          projectCity: input.parsedIntent.projectCity,
          projectState: input.parsedIntent.projectState,
          projectZip: input.projectZip,
          confidence: input.parsedIntent.confidence ?? "LOW",
          fieldsFound: input.parsedIntent.fieldsFound ?? [],
        };
      } else {
        // Re-parse (fallback if client didn't pass a parsed result)
        const parsed = await parseRfqText(input.rawText);
        intent = intentFromParsed(parsed, input.rawText, input.projectZip);
      }

      // Run the swap engine — single source of supplier reasoning
      const swapResult = await runSwapEngine(intent, {
        userId: ctx.user.id,
        role: ctx.user.role as "architect" | "admin" | "supplier",
      });

      // Persist as a draft
      // rfqDrafts already imported at top of file
      const [draft] = await db
        .insert(rfqDrafts)
        .values({
          architectId: ctx.user.id,
          rawInput: input.rawText,
          aiOutput: swapResult as unknown as Record<string, unknown>,
          humanEdits: null,
          fieldDecisions: null,
          status: "draft",
        })
        .returning({ id: rfqDrafts.id, status: rfqDrafts.status });

      if (!draft) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save draft" });
      }

      console.log(`[rfq.saveDraft] user=${ctx.user.id} draftId=${draft.id} suppliers=${swapResult.candidateSuppliers.length} agentAvailable=${swapResult.agentAvailable}`);

      return { draftId: draft.id, swapResult };
    }),

  // ── HITL: Get a draft by ID (for the review screen) ──────────────────────
  getDraft: protectedProcedure
    .input(z.object({ draftId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // rfqDrafts already imported at top of file
      const [draft] = await db
        .select()
        .from(rfqDrafts)
        .where(eq(rfqDrafts.id, input.draftId))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      if (draft.architectId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return draft;
    }),

  // ── HITL: Approve a draft → create rfq_request rows ──────────────────────
  // The human has reviewed the AI's proposal, optionally edited fields,
  // and chosen which suppliers to contact. This finalises the draft and
  // creates one rfq_request per selected supplier.
  approveDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.number().int(),
        // Final (possibly human-edited) RFQ fields
        finalFields: z.object({
          materialType: z.string().min(1),
          quantity: z.number().positive(),
          specs: z.string().optional(),
          message: z.string().optional(),
        }),
        // Which suppliers the human selected from the shortlist
        selectedSupplierIds: z.array(z.number().int()).min(1, "Select at least one supplier"),
        // Per-field decisions: which AI inferences the human accepted vs changed
        fieldDecisions: z.record(z.string(), z.enum(["accepted", "edited", "rejected"])).optional(),
        // Reason if the human is overriding significant AI suggestions
        humanNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // rfqDrafts already imported at top of file

      // Load and validate the draft
      const [draft] = await db
        .select()
        .from(rfqDrafts)
        .where(eq(rfqDrafts.id, input.draftId))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      if (draft.architectId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (draft.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Draft is already ${draft.status}` });
      }

      const { enforceAndTrack } = await import("../usage-tracking-service");

      // Create one rfq_request per selected supplier
      const createdIds: number[] = [];
      for (const supplierId of input.selectedSupplierIds) {
        await enforceAndTrack(ctx.user.id, "rfq_submission");

        const [inserted] = await db
          .insert(rfqRequests)
          .values({
            architectId: ctx.user.id,
            supplierId,
            materialType: input.finalFields.materialType,
            quantity: String(input.finalFields.quantity),
            specs: input.finalFields.specs ?? null,
            message: input.finalFields.message ?? null,
            status: "pending",
            draftId: input.draftId,
          })
          .returning({ id: rfqRequests.id });

        if (inserted) {
          createdIds.push(inserted.id);
          void auditLog.record({
            action: AuditAction.RFQ_CREATED,
            actorUserId: ctx.user.id,
            actorEmail: ctx.user.email ?? null,
            actorRole: ctx.user.role,
            resourceType: "rfq",
            resourceId: inserted.id,
            metadata: { supplierId, draftId: input.draftId, source: "hitl_approved" },
            req: ctx.req,
          }).catch((err) => console.error("[audit] approveDraft", err));

          void publishRfqEvent({ type: "rfq.created", rfqId: inserted.id, supplierId, buyerId: ctx.user.id })
            .catch((err) => console.error("[event-bus] approveDraft", err));
        }
      }

      // Mark the draft approved and record what the human chose
      await db
        .update(rfqDrafts)
        .set({
          status: "approved",
          humanEdits: input.finalFields as unknown as Record<string, unknown>,
          fieldDecisions: (input.fieldDecisions ?? {}) as unknown as Record<string, unknown>,
          approvedAt: new Date(),
          approvedByUserId: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(rfqDrafts.id, input.draftId));

      console.log(`[rfq.approveDraft] user=${ctx.user.id} draftId=${input.draftId} rfqsCreated=${createdIds.length} suppliers=[${input.selectedSupplierIds.join(",")}]`);

      return { rfqIds: createdIds, draftId: input.draftId, suppliersContacted: createdIds.length };
    }),

  // ── Carbon forecast — called at RFQ review step before submission ─────────
  // Returns projected embodied carbon (kgCO2e A1-A3) for the RFQ line items.
  // Uses EPD-backed DB averages where available, falls back to EC3 industry benchmarks.
  // No auth required — this is a calculation, not a data mutation.
  carbonForecast: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            category: z.string().min(1),
            quantity: z.number().positive(),
            unit: z.enum(["SF", "LF", "CY", "tons", "EA"]),
            materialId: z.number().int().optional(),
          })
        ).min(1).max(10),
      })
    )
    .query(async ({ input }) => {
      const { forecastRfqCarbon } = await import("../services/carbon-forecast");
      return forecastRfqCarbon(input.items);
    }),

  // ── HITL: Reject a draft ──────────────────────────────────────────────────
  rejectDraft: protectedProcedure
    .input(z.object({
      draftId: z.number().int(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPC