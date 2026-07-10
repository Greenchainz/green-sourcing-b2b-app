import { protectedProcedure, router } from "./_core/trpc";
import { runManufacturerPdfIngestion, MANUFACTURER_SPEC_SHEETS } from "./services/manufacturerPdfIngestion";
import { getDb } from "./db";
import {
  suppliers, users, materials, materialCertifications, buyerSubscriptions,
  rfqs, rfqBids, leads, conversations, messages,
  subscriptions,
} from "../drizzle/schema";
import { eq, and, inArray, desc, count, sql, gte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateComplianceReport } from "./compliance-service";
import { dbUserRoleSchema } from "../shared/types/roles";
import { auditLog, AuditAction } from "./services/audit-log";
import { publishSupplierEvent } from "./services/event-bus";

/**
 * Admin Router — Admin-only operations
 */

// Admin-only procedure (checks if user is admin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.auth?.role;
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /**
   * Get all pending suppliers awaiting verification
   */
  getPendingSuppliers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const pendingSuppliers = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        email: suppliers.email,
        phone: suppliers.phone,
        location: suppliers.location,
        website: suppliers.website,
        description: suppliers.description,
        createdAt: suppliers.createdAt,
      })
      .from(suppliers)
      .where(eq(suppliers.verificationStatus, "pending"))
      .orderBy(suppliers.createdAt);

    return pendingSuppliers;
  }),

  /**
   * Approve a supplier
   */
  approveSupplier: adminProcedure
    .input(z.object({ supplierId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update supplier status
      await db
        .update(suppliers)
        .set({ verified: true, verificationStatus: "approved", verifiedAt: new Date() })
        .where(eq(suppliers.id, input.supplierId));

      // Get supplier info for email
      const [supplier] = await db
        .select({ email: suppliers.email, companyName: suppliers.companyName })
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));

      // Send approval email
      if (supplier && supplier.email) {
        const { sendEmail } = await import("./email-service");
        await sendEmail({
          to: supplier.email,
          subject: "Welcome to GreenChainz - Your Account is Approved!",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Welcome to GreenChainz!</h1>
                </div>
                <div class="content">
                  <p>Hi ${supplier.companyName},</p>
                  <p>Great news! Your supplier account has been approved and you now have full access to the GreenChainz platform.</p>
                  ${input.notes ? `<p><strong>Message from our team:</strong><br/>${input.notes}</p>` : ""}
                  <p>You can now:</p>
                  <ul>
                    <li>Receive RFQ matches from buyers</li>
                    <li>Submit bids and quotes</li>
                    <li>Message buyers directly</li>
                    <li>Showcase your sustainable materials</li>
                  </ul>
                  <center><a href="${process.env.FRONTEND_URL}/supplier/dashboard" class="button">Go to Dashboard</a></center>
                  <p>If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div class="footer">
                  <p>GreenChainz - Sustainable Building Materials Marketplace</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }

      void auditLog.record({
        action: AuditAction.SUPPLIER_VERIFICATION_APPROVED,
        actorUserId: ctx.user?.id,
        actorEmail: ctx.auth?.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "supplier",
        resourceId: input.supplierId,
        metadata: {
          companyName: supplier?.companyName ?? null,
          notes: input.notes ?? null,
        },
        req: ctx.req,
      }).catch((err) => console.error("[audit] approveSupplier", err));

      void publishSupplierEvent({ type: "supplier.approved", supplierId: input.supplierId })
        .catch((err) => console.error("[event-bus] supplier.approved", err));

      return { success: true };
    }),

  /**
   * Reject a supplier
   */
  rejectSupplier: adminProcedure
    .input(z.object({ supplierId: z.number(), notes: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update supplier status
      await db
        .update(suppliers)
        .set({ verified: false, verificationStatus: "rejected" })
        .where(eq(suppliers.id, input.supplierId));

      // Get supplier info for email
      const [supplier] = await db
        .select({ email: suppliers.email, companyName: suppliers.companyName })
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));

      // Send rejection email
      if (supplier && supplier.email) {
        const { sendEmail } = await import("./email-service");
        await sendEmail({
          to: supplier.email,
          subject: "GreenChainz Supplier Application Update",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Application Update</h1>
                </div>
                <div class="content">
                  <p>Hi ${supplier.companyName},</p>
                  <p>Thank you for your interest in joining GreenChainz as a supplier.</p>
                  <p>After reviewing your application, we are unable to approve your account at this time.</p>
                  <p><strong>Reason:</strong><br/>${input.notes}</p>
                  <p>If you believe this was an error or would like to reapply in the future, please contact our support team.</p>
                </div>
                <div class="footer">
                  <p>GreenChainz - Sustainable Building Materials Marketplace</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }

      void auditLog.record({
        action: AuditAction.SUPPLIER_VERIFICATION_REJECTED,
        actorUserId: ctx.user?.id,
        actorEmail: ctx.auth?.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "supplier",
        resourceId: input.supplierId,
        metadata: {
          companyName: supplier?.companyName ?? null,
          reason: input.notes,
        },
        req: ctx.req,
      }).catch((err) => console.error("[audit] rejectSupplier", err));

      void publishSupplierEvent({ type: "supplier.rejected", supplierId: input.supplierId })
        .catch((err) => console.error("[event-bus] supplier.rejected", err));

      return { success: true };
    }),

  /**
   * Get all suppliers with verification status breakdown
   */
  getAllSuppliers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allSuppliers = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        email: suppliers.email,
        phone: suppliers.phone,
        location: suppliers.location,
        website: suppliers.website,
        description: suppliers.description,
        verificationStatus: suppliers.verificationStatus,
        certifications: suppliers.certifications,
        sustainabilityScore: suppliers.sustainabilityScore,
        createdAt: suppliers.createdAt,
        verifiedAt: suppliers.verifiedAt,
      })
      .from(suppliers)
      .orderBy(suppliers.createdAt);

    return allSuppliers;
  }),

  /**
   * Get supplier detail with full information
   */
  getSupplierDetail: adminProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));

      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      }

      return supplier;
    }),

  /**
   * Get statistics for admin dashboard
   */
  getSupplierStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allSuppliers = await db.select().from(suppliers);

    const stats = {
      total: allSuppliers.length,
      pending: allSuppliers.filter(s => s.verificationStatus === "pending").length,
      approved: allSuppliers.filter(s => s.verificationStatus === "approved").length,
      rejected: allSuppliers.filter(s => s.verificationStatus === "rejected").length,
      premium: allSuppliers.filter(s => s.isPremium).length,
      avgSustainabilityScore: allSuppliers.length > 0
        ? (allSuppliers.reduce((sum, s) => sum + (parseFloat(s.sustainabilityScore?.toString() || "0")), 0) / allSuppliers.length).toFixed(2)
        : "0",
    };

    return stats;
  }),

  // ─── User Management ────────────────────────────────────────────────────────

  /**
   * List all users with their subscription tiers
   */
  getAllUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const subs = await db.select().from(buyerSubscriptions);
    const subMap = new Map(subs.map(s => [s.userId, s]));

    return allUsers.map(u => ({
      ...u,
      tier: subMap.get(u.id)?.tier ?? "free",
      subscriptionStatus: subMap.get(u.id)?.status ?? "none",
    }));
  }),

  /**
   * Set a user's subscription tier (admin override — bypasses Microsoft Marketplace)
   */
  setUserTier: adminProcedure
    .input(z.object({
      userId: z.number(),
      tier: z.enum(["free", "standard", "premium"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const existing = await db
        .select({ id: buyerSubscriptions.id })
        .from(buyerSubscriptions)
        .where(eq(buyerSubscriptions.userId, input.userId));

      if (existing.length > 0) {
        await db
          .update(buyerSubscriptions)
          .set({ tier: input.tier, status: "active", updatedAt: new Date() })
          .where(eq(buyerSubscriptions.userId, input.userId));
      } else {
        await db.insert(buyerSubscriptions).values({
          userId: input.userId,
          tier: input.tier,
          msSubscriptionId: `admin-override-${input.userId}`,
          msPlanId: `greenchainz-${input.tier}`,
          status: "active",
          isBeta: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return { success: true, userId: input.userId, tier: input.tier };
    }),

  /**
   * Change a user's role
   */
  setUserRole: adminProcedure
    .input(z.object({
      userId: z.number(), // gcz-allow: admin-targeting — changing another user's role, not self-identity
      role: dbUserRoleSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId));

      void auditLog.record({
        action: AuditAction.ADMIN_USER_ROLE_CHANGED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "user",
        resourceId: input.userId,
        metadata: { newRole: input.role },
        req: ctx.req,
      }).catch((err) => console.error("[audit] setUserRole", err));

      return { success: true };
    }),

  /**
   * Get compliance report for a supplier
   */
  getSupplierCompliance: adminProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));

      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      }

      const supplierMaterials = await db
        .select({
          id: materials.id,
          name: materials.name,
          epdExpiry: materials.epdExpiry,
        })
        .from(materials)
        .limit(10);

      const certs = await db
        .select()
        .from(materialCertifications)
        .where(
          inArray(
            materialCertifications.materialId,
            supplierMaterials.map((m) => m.id)
          )
        );

      const report = generateComplianceReport(supplier, supplierMaterials, certs);

      return report;
    }),

  // ─── PDF Ingestion Pipeline ─────────────────────────────────────────────────

  /**
   * Trigger the manufacturer PDF ingestion pipeline.
   * Fetches spec sheets, extracts specs via Azure Document Intelligence,
   * and populates material_technical_specs.
   */
  triggerPdfIngestion: adminProcedure
    .input(
      z.object({
        manufacturers: z.array(z.string()).optional(),
        dryRun: z.boolean().default(false),
        useFallback: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[Admin] PDF ingestion triggered", input);
      const results = await runManufacturerPdfIngestion({
        manufacturers: input.manufacturers,
        dryRun: input.dryRun,
        useFallback: input.useFallback,
      });
      const successCount = results.filter(r => r.status === "success").length;
      const totalUpdated = results.reduce((sum, r) => sum + r.materialsUpdated, 0);
      return {
        summary: {
          sheetsProcessed: results.length,
          sheetsSucceeded: successCount,
          materialsUpdated: totalUpdated,
        },
        results,
      };
    }),

  /**
   * List all manufacturer spec sheets in the catalog.
   */
  listSpecSheets: adminProcedure.query(() => {
    return MANUFACTURER_SPEC_SHEETS.map(s => ({
      manufacturer: s.manufacturer,
      productName: s.productName,
      category: s.category,
      pdfUrl: s.pdfUrl,
    }));
  }),

  /**
   * Get material_technical_specs coverage stats.
   */
  getTechSpecsCoverage: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const { materialTechnicalSpecs } = await import("../drizzle/schema");
    const { count, isNotNull } = await import("drizzle-orm");
    const [totalMaterials] = await db.select({ count: count() }).from(materials);
    const [specsCount] = await db.select({ count: count() }).from(materialTechnicalSpecs);
    const [withFireRating] = await db
      .select({ count: count() })
      .from(materialTechnicalSpecs)
      .where(isNotNull(materialTechnicalSpecs.fireRating));
    return {
      totalMaterials: Number(totalMaterials.count),
      materialsWithSpecs: Number(specsCount.count),
      materialsWithFireRating: Number(withFireRating.count),
      coveragePercent: Number(totalMaterials.count) > 0
        ? Math.round((Number(specsCount.count) / Number(totalMaterials.count)) * 100)
        : 0,
    };
  }),

  // ─── God-mode: Platform overview ─────────────────────────────────────────
  platformStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalSuppliers] = await db.select({ count: count() }).from(suppliers);
    const [totalRfqs] = await db.select({ count: count() }).from(rfqs);
    const [totalBids] = await db.select({ count: count() }).from(rfqBids);
    const [totalLeads] = await db.select({ count: count() }).from(leads);
    const [totalMaterials] = await db.select({ count: count() }).from(materials);
    const [totalConversations] = await db.select({ count: count() }).from(conversations);
    const [totalMessages] = await db.select({ count: count() }).from(messages);

    // Activity in last 24h
    const [usersToday] = await db.select({ count: count() }).from(users).where(gte(users.lastSignedIn, oneDayAgo));
    const [rfqsThisWeek] = await db.select({ count: count() }).from(rfqs).where(gte(rfqs.createdAt, sevenDaysAgo));
    const [leadsThisWeek] = await db.select({ count: count() }).from(leads).where(gte(leads.createdAt, sevenDaysAgo));

    return {
      totals: {
        users: Number(totalUsers.count),
        suppliers: Number(totalSuppliers.count),
        rfqs: Number(totalRfqs.count),
        bids: Number(totalBids.count),
        leads: Number(totalLeads.count),
        materials: Number(totalMaterials.count),
        conversations: Number(totalConversations.count),
        messages: Number(totalMessages.count),
      },
      activity: {
        activeUsersToday: Number(usersToday.count),
        rfqsThisWeek: Number(rfqsThisWeek.count),
        leadsThisWeek: Number(leadsThisWeek.count),
      },
    };
  }),

  // ─── God-mode: All RFQs ──────────────────────────────────────────────
  getAllRfqs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: rfqs.id,
        projectName: rfqs.projectName,
        projectLocation: rfqs.projectLocation,
        status: rfqs.status,
        createdAt: rfqs.createdAt,
        userId: rfqs.userId,
      })
      .from(rfqs)
      .orderBy(desc(rfqs.createdAt))
      .limit(100);
    return rows;
  }),

  // ─── God-mode: All leads ─────────────────────────────────────────────
  getAllLeads: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);
  }),

  // ─── God-mode: Recent conversations (no message content, just metadata) ───
  getConversationOverview: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: conversations.id,
        buyerId: conversations.buyerId,
        supplierId: conversations.supplierId,
        rfqId: conversations.rfqId,
        lastMessageAt: conversations.lastMessageAt,
        agentMode: conversations.agentMode,
        handoffStatus: conversations.handoffStatus,
        isArchived: conversations.isArchived,
      })
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(50);
  }),

  // ─── God-mode: Recent activity feed ──────────────────────────────────
  getActivityFeed: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Pull recent events from multiple tables, merge into a timeline
    const recentUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    const recentRfqs = await db
      .select({ id: rfqs.id, projectName: rfqs.projectName, status: rfqs.status, createdAt: rfqs.createdAt })
      .from(rfqs)
      .orderBy(desc(rfqs.createdAt))
      .limit(10);

    const recentLeads = await db
      .select({ id: leads.id, email: leads.email, company: leads.company, createdAt: leads.createdAt })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(10);

    // Merge into a single feed sorted by time
    type FeedItem = { type: string; timestamp: Date; data: Record<string, unknown> };
    const feed: FeedItem[] = [
      ...recentUsers.map((u) => ({ type: "user_signup" as const, timestamp: u.createdAt, data: { name: u.name, email: u.email, role: u.role } })),
      ...recentRfqs.map((r) => ({ type: "rfq_created" as const, timestamp: r.createdAt, data: { projectName: r.projectName, status: r.status } })),
      ...recentLeads.map((l) => ({ type: "lead_captured" as const, timestamp: l.createdAt, data: { email: l.email, company: l.company } })),
    ];

    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return feed.slice(0, 20);
  }),

  /**
   * Send weekly digest emails to all engaged users
   */
  sendWeeklyDigests: adminProcedure.mutation(async () => {
    const { generateWeeklyDigests } = await import("./services/notification-scheduler");
    const { sendEmail } = await import("./email-service");

    const payloads = await generateWeeklyDigests();
    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const ok = await sendEmail({ to: payload.to, subject: payload.subject, html: payload.html });
      if (ok) sent++;
      else failed++;
    }

    return { total: payloads.length, sent, failed };
  }),

  /**
   * Send streak reminder emails to users at risk of losing their streak
   */
  sendStreakReminders: adminProcedure.mutation(async () => {
    const { findAtRiskStreaks } = await import("./services/notification-scheduler");
    const { sendEmail } = await import("./email-service");

    const payloads = await findAtRiskStreaks();
    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const ok = await sendEmail({ to: payload.to, subject: payload.subject, html: payload.html });
      if (ok) sent++;
      else failed++;
    }

    return { total: payloads.length, sent, failed };
  }),

  // ─── Delete test users ────────────────────────────────────────────────────
  clearTestUsers: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { users } = await import("../drizzle/schema");
    const { like } = await import("drizzle-orm");
    await db.delete(users).where(like(users.openId, "test-%-gcz-internal"));
    return { cleared: true };
  }),

  // ─── Catalog Stats ───────────────────────────────────────────────────────
  getCatalogStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [totalMaterials] = await db.select({ count: count() }).from(materials);
    const [withEpd] = await db
      .select({ count: count() })
      .from(materials)
      .where(eq(materials.hasEpd, true));
    const [withGwp] = await db
      .select({ count: count() })
      .from(materials)
      .where(sql`${materials.gwpValue} IS NOT NULL`);
    const [verified] = await db
      .select({ count: count() })
      .from(materials)
      .where(eq(materials.verified, true));

    const categoryRows = await db
      .select({
        category: materials.category,
        total: count(),
        epd: sql<number>`COUNT(*) FILTER (WHERE ${materials.hasEpd} = true)`,
      })
      .from(materials)
      .groupBy(materials.category)
      .orderBy(desc(count()));

    return {
      total: Number(totalMaterials.count),
      withEpd: Number(withEpd.count),
      withGwp: Number(withGwp.count),
      verified: Number(verified.count),
      byCategory: categoryRows.map((r) => ({
        category: r.category,
        total: Number(r.total),
        epd: Number(r.epd),
      })),
    };
  }),

  // ─── EC3 Bulk Import ──────────────────────────────────────────────────────
  triggerEC3Import: adminProcedure
    .input(z.object({ category: z.string(), limit: z.number().min(10).max(500).default(100) }))
    .mutation(async ({ input }) => {
      const { importEC3Materials } = await import("./services/ec3-service");
      const created = await importEC3Materials(input.category, input.limit);
      return { created, category: input.category };
    }),

  // ─── Delete material ──────────────────────────────────────────────────────
  deleteMaterial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(materials).where(eq(materials.id, input.id));
      return { success: true };
    }),

  // ─── Toggle material verified flag ────────────────────────────────────────
  setMaterialVerified: adminProcedure
    .input(z.object({ id: z.number(), verified: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(materials)
        .set({ verified: input.verified, updatedAt: new Date() })
        .where(eq(materials.id, input.id));
      return { success: true };
    }),

  // ─── Search materials (admin) ─────────────────────────────────────────────
  searchMaterials: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const { like, or } = await import("drizzle-orm");
      const conditions: SQL<unknown>[] = [];
      if (input.search) {
        conditions.push(
          or(
            like(materials.name, `%${input.search}%`),
            like(materials.category, `%${input.search}%`),
          )!
        );
      }
      if (input.category) conditions.push(eq(materials.category, input.category));

      const { and: drizzleAnd } = await import("drizzle-orm");
      const where = conditions.length ? drizzleAnd(...conditions) : undefined;

      const rows = await db
        .select({
          id: materials.id,
          name: materials.name,
          category: materials.category,
          hasEpd: materials.hasEpd,
          gwpValue: materials.gwpValue,
          verified: materials.verified,
          createdAt: materials.createdAt,
          dataSource: materials.dataSource,
        })
        .from(materials)
        .where(where)
        .orderBy(desc(materials.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await db.select({ count: count() }).from(materials).where(where);

      return { items: rows, total: Number(total.count) };
    }),

  /**
   * Preview a layer-specific outreach email before it fires.
   * Returns subject + HTML for admin review.
   */
  previewOutreachEmail: adminProcedure
    .input(
      z.object({
        step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        layer: z.enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"]),
        companyName: z.string().min(1),
        category: z.string().min(1),
        keyProduct: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { previewLayerEmail } = await import("./services/outreach-email-service");
      return previewLayerEmail(input.step, input.layer, {
        companyName: input.companyName,
        category: input.category,
        keyProduct: input.keyProduct,
      });
    }),

  /**
   * Re-detect procurement layer for all CRM contacts that don't have one set.
   */
  backfillOutreachLayers: adminProcedure.mutation(async () => {
    const { detectLayer } = await import("./services/outreach-email-service");
    const { crmContacts } = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const contacts = await db.select().from(crmContacts);
    let updated = 0;
    for (const c of contacts) {
      if (c.pitchAngle) continue; // already set
      const layer = detectLayer(c.category ?? "", c.subcategory, c.keyProduct);
      await db
        .update(crmContacts)
        .set({ pitchAngle: `Layer ${layer}: ${layer === "L1" ? "Liability & Code Compliance" : layer === "L2" ? "ROI & Whole Life Cost" : layer === "L3" ? "Schedule & Labor Productivity" : layer === "L4" ? "Total Cost of Ownership" : layer === "L5" ? "Scope 3 & ESG Reporting" : layer === "L6" ? "Infection Control & Durability" : "LEED Docs & Cooperative Purchasing"}`, updatedAt: new Date() })
        .where(eq(crmContacts.id, c.id));
      updated++;
    }
    return { updated, total: contacts.length };
  }),

  // ── Promo Grants ──────────────────────────────────────────────────────────

  /**
   * Grant a user a free premium (or standard) subscription.
   * Looks up by email, inserts a synthetic subscription row.
   * No Microsoft billing — purely internal override.
   */
  grantPromo: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        tier: z.enum(["standard", "premium"]).default("premium"),
        note: z.string().optional(),
        expiresAt: z.string().datetime().optional(), // ISO string; omit = never expires
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: `No user found with email ${input.email}` });
      }

      // Cancel any existing promo for this user so tier upgrades are clean
      await db
        .update(subscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(subscriptions.userId, user.id),
            sql`${subscriptions.microsoftSubscriptionId} LIKE 'promo-%'`
          )
        );

      const promoId = `promo-${user.id}-${Date.now()}`;
      const now = new Date();
      const endDate = input.expiresAt ? new Date(input.expiresAt) : null;

      await db.insert(subscriptions).values({
        userId: user.id,
        microsoftSubscriptionId: promoId,
        tier: input.tier,
        status: "active",
        startDate: now,
        endDate,
        lastRenewalDate: now,
      });

      return { ok: true, promoId, userId: user.id, tier: input.tier };
    }),

  /**
   * Revoke a promo grant by email.
   */
  revokePromo: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: `No user found with email ${input.email}` });

      await db
        .update(subscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(subscriptions.userId, user.id),
            sql`${subscriptions.microsoftSubscriptionId} LIKE 'promo-%'`
          )
        );

      return { ok: true };
    }),

  /**
   * List all active promo grants.
   */
  listPromos: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        email: users.email,
        name: users.name,
        tier: subscriptions.tier,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        promoId: subscriptions.microsoftSubscriptionId,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(sql`${subscriptions.microsoftSubscriptionId} LIKE 'promo-%'`)
      .orderBy(desc(subscriptions.startDate));

    return rows;
  }),
});
