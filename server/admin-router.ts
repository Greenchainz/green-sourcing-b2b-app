import { protectedProcedure, router } from "./_core/trpc";
import { runManufacturerPdfIngestion, MANUFACTURER_SPEC_SHEETS } from "./services/manufacturerPdfIngestion";
import { getDb } from "./db";
import {
  suppliers, users, materials, materialCertifications, buyerSubscriptions,
  rfqs, rfqBids, leads, conversations, messages,
  subscriptions, arcadeScores,
  manufacturers, architects,
  supplierSubscriptions, supplierProfileViews, supplierBuyerFitInputs,
  supplierSustainabilityProfiles, agentHandoffRules, supplierFilters,
  suppliersLocation, rfqSupplierInvites, epdMaterials, supplierMaterialEpds,
  crmContacts, crmEmailSequences, scraperRuns, emailCredentials,
  materialSpecs, companyOfWeekSlots, usageTracking, conciergeRoutes,
  learningEvents, scrapedSuppliers, scrapedLeads,
} from "../drizzle/schema";
import { eq, and, inArray, desc, asc, count, sql, gte, isNull, ne, like } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateComplianceReport } from "./compliance-service";
import { dbUserRoleSchema } from "../shared/types/roles";
import { auditLog, AuditAction } from "./services/audit-log";
import { publishSupplierEvent } from "./services/event-bus";
import { canAccessAdmin } from "./_core/admin-access";
import { INTELLIGENCE_SCRAPERS } from "./intelligence/intelligence-config";

/**
 * Admin Router — Admin-only operations
 */

// Admin-only procedure (checks if user is admin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canAccessAdmin(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/** Resolved (non-null) Drizzle handle — avoids `any` under strict mode. */
type AdminDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * Guardrails shared by deleteUser / purgeUser:
 *  - an admin cannot delete their own currently-logged-in account
 *  - the last remaining (non-deleted) admin cannot be removed
 * Throws TRPCError; returns void when the target is safe to delete.
 */
async function assertUserDeletable(
  db: AdminDb,
  targetUserId: number,
  actorUserId: number,
): Promise<void> {
  if (targetUserId === actorUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account." });
  }
  const target = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (target.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }
  if (target[0].role === "admin") {
    const [remaining] = await db
      .select({ c: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt), ne(users.id, targetUserId)));
    if (Number(remaining?.c ?? 0) === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the last remaining admin." });
    }
  }
}

function hasPgErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

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
        deletedAt: suppliers.deletedAt,
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
        deletedAt: users.deletedAt,
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

  listIntelligenceLeads: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db.execute(sql`
      SELECT
        c.id,
        COALESCE(NULLIF(to_jsonb(c)->>'contact_name', ''), NULLIF(to_jsonb(c)->>'name', '')) AS name,
        NULLIF(to_jsonb(c)->>'email', '') AS email,
        COALESCE(NULLIF(to_jsonb(c)->>'company_name', ''), NULLIF(to_jsonb(c)->>'company', '')) AS company,
        COALESCE(NULLIF(to_jsonb(c)->>'role', ''), NULLIF(to_jsonb(c)->>'type', '')) AS role,
        NULLIF(to_jsonb(c)->>'category', '') AS category,
        NULLIF(to_jsonb(c)->>'sf_lead_id', '') AS sf_lead_id,
        c.created_at
      FROM crm_contacts c
      ORDER BY c.created_at DESC
      LIMIT 500
    `);

    return rows.rows.map((row) => {
      const typedRow = row as {
        id: number | string;
        name: string | null;
        email: string | null;
        company: string | null;
        role: string | null;
        category: string | null;
        sf_lead_id: string | null;
        created_at: Date | string;
      };
      return {
        id: Number(typedRow.id),
        name: typedRow.name,
        email: typedRow.email,
        company: typedRow.company,
        role: typedRow.role,
        category: typedRow.category,
        sfLeadId: typedRow.sf_lead_id,
        createdAt: typedRow.created_at,
      };
    });
  }),

  listIntelligenceEmailSequences: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const tableCheck = await db.execute(
      sql`SELECT to_regclass('public.email_sequences')::text AS table_name`
    );
    const hasEmailSequencesTable = Boolean(
      (tableCheck.rows[0] as { table_name?: string | null } | undefined)?.table_name
    );

    if (hasEmailSequencesTable) {
      const rows = await db.execute(sql`
        SELECT
          e.id,
          COALESCE(NULLIF(to_jsonb(e)->>'contact_email', ''), NULLIF(to_jsonb(e)->>'email', '')) AS contact_email,
          COALESCE(NULLIF(to_jsonb(e)->>'status', ''), 'pending') AS status,
          COALESCE(NULLIF(to_jsonb(e)->>'step', ''), '1')::int AS step,
          e.sent_at,
          e.created_at
        FROM email_sequences e
        ORDER BY e.created_at DESC
        LIMIT 500
      `);

      return rows.rows.map((row) => {
        const typedRow = row as {
          id: number | string;
          contact_email: string | null;
          step: number | string;
          status: string;
          sent_at: Date | string | null;
          created_at: Date | string;
        };
        return {
          id: Number(typedRow.id),
          contactEmail: typedRow.contact_email,
          step: Number(typedRow.step),
          status: typedRow.status,
          sentAt: typedRow.sent_at,
          createdAt: typedRow.created_at,
        };
      });
    }

    const rows = await db
      .select({
        id: crmEmailSequences.id,
        contactEmail: crmContacts.email,
        step: crmEmailSequences.step,
        status: crmEmailSequences.status,
        sentAt: crmEmailSequences.sentAt,
        createdAt: crmEmailSequences.createdAt,
      })
      .from(crmEmailSequences)
      .leftJoin(crmContacts, eq(crmEmailSequences.contactId, crmContacts.id))
      .orderBy(desc(crmEmailSequences.createdAt))
      .limit(500);

    return rows;
  }),

  listIntelligenceScraperStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    try {
      const runs = await db
        .select({
          scraperName: scraperRuns.scraperName,
          status: scraperRuns.status,
          startedAt: scraperRuns.startedAt,
          completedAt: scraperRuns.completedAt,
        })
        .from(scraperRuns)
        .orderBy(desc(scraperRuns.startedAt))
        .limit(200);

      const byScraper = new Map<
        string,
        {
          scraperName: string;
          status: string;
          lastRunAt: Date | string;
          completedAt: Date | string | null;
        }
      >();
      for (const run of runs) {
        if (!byScraper.has(run.scraperName)) {
          byScraper.set(run.scraperName, {
            scraperName: run.scraperName,
            status: run.status,
            lastRunAt: run.startedAt,
            completedAt: run.completedAt,
          });
        }
      }

      const knownScrapers = new Set([
        ...INTELLIGENCE_SCRAPERS.map((scraper) => scraper.name),
        ...byScraper.keys(),
      ]);

      return Array.from(knownScrapers).map((scraperName) => {
        const known = byScraper.get(scraperName);
        const label =
          INTELLIGENCE_SCRAPERS.find((scraper) => scraper.name === scraperName)?.label ??
          scraperName;
        return {
          scraperName,
          label,
          status: known?.status ?? null,
          lastRunAt: known?.lastRunAt ?? null,
          completedAt: known?.completedAt ?? null,
        };
      });
    } catch (error) {
      if (!hasPgErrorCode(error, "42P01")) {
        throw error;
      }
      return INTELLIGENCE_SCRAPERS.map((scraper) => ({
        scraperName: scraper.name,
        label: scraper.label,
        status: null,
        lastRunAt: null,
        completedAt: null,
      }));
    }
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

    // Send in parallel batches of 5 to avoid overwhelming the email provider
    const BATCH_SIZE = 5;
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((payload) => sendEmail({ to: payload.to, subject: payload.subject, html: payload.html }))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) sent++;
        else failed++;
      }
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

    // Send in parallel batches of 5 to avoid overwhelming the email provider
    const BATCH_SIZE = 5;
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((payload) => sendEmail({ to: payload.to, subject: payload.subject, html: payload.html }))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) sent++;
        else failed++;
      }
    }

    return { total: payloads.length, sent, failed };
  }),

  // ─── Delete test users (bulk maintenance) ─────────────────────────────────
  clearTestUsers: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const deleted = await db
      .delete(users)
      .where(
        and(
          like(users.openId, "test-%-gcz-internal"),
          sql`${users.role} <> 'admin'`,
          sql`${users.id} <> ${ctx.user.id}`,
        ),
      )
      .returning({ id: users.id });

    void auditLog.record({
      action: AuditAction.ADMIN_TEST_USERS_CLEARED,
      actorUserId: ctx.user?.id,
      actorEmail: ctx.auth?.email ?? null,
      actorRole: ctx.auth?.role ?? null,
      resourceType: "user",
      metadata: { count: deleted.length },
      req: ctx.req,
    }).catch((err) => console.error("[audit] clearTestUsers", err));

    return { cleared: true, count: deleted.length };
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
   * Integration command-center status (safe metadata only, no secret values).
   */
  getIntegrationStatus: adminProcedure.query(() => {
    const hasAny = (...keys: string[]) => keys.some((key) => !!process.env[key]?.trim());
    const hasAll = (...keys: string[]) => keys.every((key) => !!process.env[key]?.trim());

    const salesforceConnected =
      hasAll("SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET") &&
      hasAny(
        "SALESFORCE_REFRESH_TOKEN",
        "SALESFORCE_ACCESS_TOKEN",
        "SALESFORCE_USERNAME"
      );

    const hubspotConnected = hasAny("HUBSPOT_ACCESS_TOKEN", "HUBSPOT_PRIVATE_APP_TOKEN", "HUBSPOT_API_KEY");
    const resendConnected = hasAll("RESEND_API_KEY", "RESEND_FROM_EMAIL");
    const dataverseConnected =
      hasAll("DATAVERSE_ENVIRONMENT_URL", "DATAVERSE_TENANT_ID") &&
      hasAny("DATAVERSE_CLIENT_ID", "MANAGED_IDENTITY_CLIENT_ID");

    const fabricConnected =
      hasAll("AZURE_FABRIC_WORKSPACE_ID", "AZURE_FABRIC_TENANT_ID") &&
      hasAny("AZURE_FABRIC_CLIENT_ID", "MANAGED_IDENTITY_CLIENT_ID");

    const integrations = [
      {
        id: "salesforce",
        name: "Salesforce",
        connected: salesforceConnected,
        requiredKeys: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET", "SALESFORCE_REFRESH_TOKEN"],
        dashboardUrl: process.env.SALESFORCE_LOGIN_URL?.trim() || "https://login.salesforce.com",
      },
      {
        id: "hubspot",
        name: "HubSpot",
        connected: hubspotConnected,
        requiredKeys: ["HUBSPOT_ACCESS_TOKEN"],
        dashboardUrl: "https://app.hubspot.com",
      },
      {
        id: "resend",
        name: "Resend",
        connected: resendConnected,
        requiredKeys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
        dashboardUrl: "https://resend.com/emails",
      },
      {
        id: "dataverse",
        name: "Microsoft Dataverse",
        connected: dataverseConnected,
        requiredKeys: ["DATAVERSE_ENVIRONMENT_URL", "DATAVERSE_TENANT_ID", "DATAVERSE_CLIENT_ID"],
        dashboardUrl: process.env.DATAVERSE_ENVIRONMENT_URL?.trim() || "https://make.powerapps.com",
      },
      {
        id: "fabric",
        name: "Microsoft Fabric",
        connected: fabricConnected,
        requiredKeys: ["AZURE_FABRIC_WORKSPACE_ID", "AZURE_FABRIC_TENANT_ID", "AZURE_FABRIC_CLIENT_ID"],
        dashboardUrl: "https://app.fabric.microsoft.com",
      },
      {
        id: "webhook",
        name: "Automation Webhook Slot",
        connected: hasAny("AUTOMATION_WEBHOOK_URL", "N8N_WEBHOOK_URL", "MAKE_WEBHOOK_URL"),
        requiredKeys: ["AUTOMATION_WEBHOOK_URL"],
        dashboardUrl: process.env.AUTOMATION_WEBHOOK_URL?.trim() || null,
      },
    ];

    return {
      connectedCount: integrations.filter((item) => item.connected).length,
      totalCount: integrations.length,
      integrations,
    };
  }),

  /**
   * Scraper + outreach pipeline status for Admin God Mode.
   */
  getScraperPipelineStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [supplierTotals, leadTotals, recentSuppliers, recentLeads] = await Promise.all([
      db
        .select({
          total: count(),
          contacted: sql<number>`COUNT(CASE WHEN ${scrapedSuppliers.outreachSentAt} IS NOT NULL THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN ${scrapedSuppliers.outreachSentAt} IS NULL THEN 1 END)`,
          invalid: sql<number>`COUNT(CASE WHEN ${scrapedSuppliers.emailStatus} IN ('invalid','unsubscribed','bounced') THEN 1 END)`,
          latestIngestedAt: sql<Date | null>`MAX(${scrapedSuppliers.createdAt})`,
          latestOutreachAt: sql<Date | null>`MAX(${scrapedSuppliers.outreachSentAt})`,
        })
        .from(scrapedSuppliers),
      db
        .select({
          total: count(),
          contacted: sql<number>`COUNT(CASE WHEN ${scrapedLeads.outreachSentAt} IS NOT NULL THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN ${scrapedLeads.outreachSentAt} IS NULL THEN 1 END)`,
          invalid: sql<number>`COUNT(CASE WHEN ${scrapedLeads.emailStatus} IN ('invalid','unsubscribed','bounced') THEN 1 END)`,
          latestIngestedAt: sql<Date | null>`MAX(${scrapedLeads.createdAt})`,
          latestOutreachAt: sql<Date | null>`MAX(${scrapedLeads.outreachSentAt})`,
        })
        .from(scrapedLeads),
      db
        .select({
          id: scrapedSuppliers.id,
          companyName: scrapedSuppliers.companyName,
          email: scrapedSuppliers.email,
          state: scrapedSuppliers.state,
          createdAt: scrapedSuppliers.createdAt,
          outreachSentAt: scrapedSuppliers.outreachSentAt,
          emailStatus: scrapedSuppliers.emailStatus,
        })
        .from(scrapedSuppliers)
        .orderBy(desc(scrapedSuppliers.createdAt))
        .limit(8),
      db
        .select({
          id: scrapedLeads.id,
          fullName: scrapedLeads.fullName,
          company: scrapedLeads.company,
          role: scrapedLeads.role,
          email: scrapedLeads.email,
          createdAt: scrapedLeads.createdAt,
          outreachSentAt: scrapedLeads.outreachSentAt,
          emailStatus: scrapedLeads.emailStatus,
        })
        .from(scrapedLeads)
        .orderBy(desc(scrapedLeads.createdAt))
        .limit(8),
    ]);

    return {
      flags: {
        supplierOutreachEnabled: process.env.OUTREACH_ENABLED === "true",
        leadOutreachEnabled: process.env.LEAD_OUTREACH_ENABLED === "true",
      },
      suppliers: {
        total: Number(supplierTotals[0]?.total ?? 0),
        contacted: Number(supplierTotals[0]?.contacted ?? 0),
        pending: Number(supplierTotals[0]?.pending ?? 0),
        invalid: Number(supplierTotals[0]?.invalid ?? 0),
        latestIngestedAt: supplierTotals[0]?.latestIngestedAt ?? null,
        latestOutreachAt: supplierTotals[0]?.latestOutreachAt ?? null,
        recent: recentSuppliers,
      },
      leads: {
        total: Number(leadTotals[0]?.total ?? 0),
        contacted: Number(leadTotals[0]?.contacted ?? 0),
        pending: Number(leadTotals[0]?.pending ?? 0),
        invalid: Number(leadTotals[0]?.invalid ?? 0),
        latestIngestedAt: leadTotals[0]?.latestIngestedAt ?? null,
        latestOutreachAt: leadTotals[0]?.latestOutreachAt ?? null,
        recent: recentLeads,
      },
    };
  }),

  runSupplierScraperNow: adminProcedure.mutation(async () => {
    const { runSupplierScraper } = await import("../lib/scrapers/supplier-scraper");
    return runSupplierScraper();
  }),

  runLeadScraperNow: adminProcedure.mutation(async () => {
    const { runLeadScraper } = await import("../lib/scrapers/lead-scraper");
    return runLeadScraper();
  }),

  runSupplierOutreachNow: adminProcedure.mutation(async () => {
    const { runScraperOutreachPipeline } = await import("./scraper-outreach-pipeline");
    return runScraperOutreachPipeline();
  }),

  runLeadOutreachNow: adminProcedure.mutation(async () => {
    const { runLeadOutreachPipeline } = await import("./lead-outreach-pipeline");
    return runLeadOutreachPipeline();
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

  /**
   * Place an outbound text-to-speech call via ACS Call Automation.
   * ACS dials `to`, waits for answer, plays the SSML using a Neural voice,
   * then hangs up automatically.
   */
  sendTtsCall: adminProcedure
    .input(
      z.object({
        to: z.string().min(7).max(20),
        text: z.string().min(1).max(800),
        voice: z.enum([
          'en-US-AriaNeural',
          'en-US-GuyNeural',
          'en-US-JennyNeural',
          'en-US-DavisNeural',
          'en-US-NancyNeural',
          'en-US-TonyNeural',
        ]).default('en-US-AriaNeural'),
        fromNumberType: z.enum(['local', 'tollFree']).default('local'),
      }),
    )
    .mutation(async ({ input }) => {
      const { sendTtsCall } = await import('./acs-tts-service');
      const result = await sendTtsCall({
        to: input.to,
        text: input.text,
        voice: input.voice,
        fromNumberType: input.fromNumberType,
      });
      if (!result.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error ?? 'TTS call failed' });
      }
      return { ok: true, callConnectionId: result.callConnectionId };
    }),

  // ── Communications (ACS SMS + multi-channel) ────────────────────────────────

  getMissedCallForwardingSettings: adminProcedure.query(async () => {
    const { getMissedCallForwardingSettings } = await import("./call-forwarding-service");
    return getMissedCallForwardingSettings();
  }),

  setMissedCallForwardingSettings: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        phone: z.string().min(7).max(20).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { setMissedCallForwardingSettings } = await import("./call-forwarding-service");
        return await setMissedCallForwardingSettings({
          enabled: input.enabled,
          phone: input.phone,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid call forwarding settings",
        });
      }
    }),

  /** Get a quick summary of communication channels and recent usage. */
  getCommsStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Arcade leads currently store email (phone capture not yet in schema).
    const smsLeadsRows = await db
      .select({ count: count() })
      .from(leads)
      .where(sql`${leads.source} LIKE 'arcade:%'`);

    // Total arcade score submissions ever
    const arcadeSubRows = await db
      .select({ count: count() })
      .from(arcadeScores);

    // Users who have an email on file
    const emailUsersRows = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.email} IS NOT NULL`);

    return {
      emailUsers: emailUsersRows[0]?.count ?? 0,
      smsLeads: smsLeadsRows[0]?.count ?? 0,
      arcadeSubmissions: arcadeSubRows[0]?.count ?? 0,
      channels: {
        email: { label: "Email", status: "active" as const },
        sms: {
          label: "SMS (ACS Toll-Free)",
          status: (process.env.ACS_TOLL_FREE_NUMBER ? "active" : "needs_setup") as "active" | "needs_setup",
          number: process.env.ACS_TOLL_FREE_NUMBER ?? null,
        },
        inApp: { label: "In-App (WebPubSub)", status: "active" as const },
        voiceVideo: { label: "Voice / Video (ACS)", status: "active" as const },
      },
    };
  }),

  /**
   * Send a single test SMS to any phone number.
   * Use to verify the toll-free number is working before a blast.
   */
  sendTestSms: adminProcedure
    .input(
      z.object({
        to: z.string().min(7).max(20),
        message: z.string().min(1).max(160),
      }),
    )
    .mutation(async ({ input }) => {
      const { sendSms } = await import("./acs-sms-service");
      const result = await sendSms(input.to, input.message);
      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "SMS failed" });
      }
      return { ok: true, messageId: result.messageId };
    }),

  /**
   * Broadcast an SMS to all arcade leads who provided an email (opted in).
   * The message is prepended with "GreenChainz: " and appended with the
   * STOP opt-out footer automatically.
   */
  broadcastArcadeSms: adminProcedure
    .input(
      z.object({
        /** Body of the message — plain text, ≤130 chars (footer will be added). */
        body: z.string().min(1).max(130),
      }),
    )
    .mutation(async () => {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "SMS blast is not available yet. Phone storage and recipient wiring are still pending.",
      });
    }),

  // ════════════════════════════════════════════════════════════════════════
  // Admin destructive data control — users / manufacturers / suppliers
  // Soft-delete + restore is the safe default; hard-purge is the irreversible
  // path (each guarded by an extra client-side confirmation). All audit-logged.
  // ════════════════════════════════════════════════════════════════════════

  // ─── Users ──────────────────────────────────────────────────────────────
  // Soft-delete sets `deletedAt`; getUserByOpenId filters it out, which revokes
  // the account's access everywhere in one place. Self-delete and last-admin
  // removal are blocked by assertUserDeletable.
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() })) // gcz-allow: admin-targeting — deleting another user, not self
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await assertUserDeletable(db, input.userId, ctx.user.id);

      await db
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(users.id, input.userId), isNull(users.deletedAt)));

      void auditLog.record({
        action: AuditAction.ADMIN_USER_DELETED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "user",
        resourceId: input.userId,
        req: ctx.req,
      }).catch((err) => console.error("[audit] deleteUser", err));

      return { success: true };
    }),

  restoreUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() })) // gcz-allow: admin-targeting
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const restored = await db
        .update(users)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id });
      if (restored.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      void auditLog.record({
        action: AuditAction.ADMIN_USER_RESTORED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "user",
        resourceId: input.userId,
        req: ctx.req,
      }).catch((err) => console.error("[audit] restoreUser", err));

      return { success: true };
    }),

  // Irreversible. Children removed first so a mid-run failure never orphans the
  // parent. The three real user FKs (submittals.createdBy, ca_documents.createdBy,
  // ca_document_messages.author_user_id) cascade at the DB level; public supplier
  // profiles are soft-deleted; billing and email credential rows are removed.
  purgeUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() })) // gcz-allow: admin-targeting
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await assertUserDeletable(db, input.userId, ctx.user.id);

      const id = input.userId;
      await db.transaction(async (tx) => {
        await tx.update(suppliers).set({ deletedAt: new Date() }).where(and(eq(suppliers.userId, id), isNull(suppliers.deletedAt)));
        await tx.delete(architects).where(eq(architects.userId, id));
        await tx.delete(buyerSubscriptions).where(eq(buyerSubscriptions.userId, id));
        await tx.delete(subscriptions).where(eq(subscriptions.userId, id));
        await tx.delete(emailCredentials).where(eq(emailCredentials.userId, id));
        await tx.delete(users).where(eq(users.id, id));
      });

      void auditLog.record({
        action: AuditAction.ADMIN_USER_PURGED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "user",
        resourceId: id,
        req: ctx.req,
      }).catch((err) => console.error("[audit] purgeUser", err));

      return { success: true };
    }),

  // ─── Manufacturers (the directory inventory — the "~81") ─────────────────
  // Admin list surfaces ALL rows incl. soft-deleted, with material counts.
  getAllManufacturersAdmin: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const materialCounts = db
      .select({
        manufacturerId: materials.manufacturerId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(materials)
      .groupBy(materials.manufacturerId)
      .as("materialCounts");

    const rows = await db
      .select({
        manufacturer: manufacturers,
        materialCount: sql<number>`COALESCE(${materialCounts.count}, 0)`,
      })
      .from(manufacturers)
      .leftJoin(materialCounts, eq(manufacturers.id, materialCounts.manufacturerId))
      .orderBy(desc(manufacturers.featured), asc(manufacturers.name));

    return rows.map((r) => ({ ...r.manufacturer, materialCount: Number(r.materialCount) }));
  }),

  updateManufacturer: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      category: z.string().max(100).nullable().optional(),
      subcategory: z.string().max(100).nullable().optional(),
      website: z.string().max(2000).nullable().optional(),
      location: z.string().max(255).nullable().optional(),
      pitchAngle: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Manufacturer not found." });
      }

      const updates: Partial<typeof manufacturers.$inferInsert> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.category !== undefined) updates.category = input.category;
      if (input.subcategory !== undefined) updates.subcategory = input.subcategory;
      if (input.website !== undefined) updates.website = input.website;
      if (input.location !== undefined) updates.location = input.location;
      if (input.pitchAngle !== undefined) updates.pitchAngle = input.pitchAngle;
      if (input.description !== undefined) updates.description = input.description;
      if (Object.keys(updates).length === 0) return { success: true, id: input.id };
      updates.updatedAt = new Date();

      await db.update(manufacturers).set(updates).where(eq(manufacturers.id, input.id));

      void auditLog.record({
        action: AuditAction.ADMIN_MANUFACTURER_UPDATED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "manufacturer",
        resourceId: input.id,
        metadata: { fields: Object.keys(updates) },
        req: ctx.req,
      }).catch((err) => console.error("[audit] updateManufacturer", err));

      return { success: true, id: input.id };
    }),

  setManufacturerVerified: adminProcedure
    .input(z.object({ id: z.number().int().positive(), verified: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Manufacturer not found." });
      }

      await db.update(manufacturers).set({ verified: input.verified, updatedAt: new Date() }).where(eq(manufacturers.id, input.id));

      void auditLog.record({
        action: AuditAction.ADMIN_MANUFACTURER_UPDATED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "manufacturer",
        resourceId: input.id,
        metadata: { verified: input.verified },
        req: ctx.req,
      }).catch((err) => console.error("[audit] setManufacturerVerified", err));

      return { success: true, id: input.id, verified: input.verified };
    }),

  deleteManufacturer: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Manufacturer not found." });
      }

      await db.update(manufacturers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(manufacturers.id, input.id), isNull(manufacturers.deletedAt)));

      void auditLog.record({
        action: AuditAction.ADMIN_MANUFACTURER_DELETED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "manufacturer",
        resourceId: input.id,
        req: ctx.req,
      }).catch((err) => console.error("[audit] deleteManufacturer", err));

      return { success: true };
    }),

  restoreManufacturer: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Manufacturer not found." });
      }

      await db.update(manufacturers).set({ deletedAt: null, updatedAt: new Date() }).where(eq(manufacturers.id, input.id));

      void auditLog.record({
        action: AuditAction.ADMIN_MANUFACTURER_RESTORED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "manufacturer",
        resourceId: input.id,
        req: ctx.req,
      }).catch((err) => console.error("[audit] restoreManufacturer", err));

      return { success: true };
    }),

  // Irreversible. materials.manufacturerId is the only reference — null it first
  // so no material is left pointing at a missing manufacturer, then delete.
  purgeManufacturer: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Manufacturer not found." });
      }

      await db.transaction(async (tx) => {
        await tx.update(materials).set({ manufacturerId: null }).where(eq(materials.manufacturerId, input.id));
        await tx.delete(manufacturers).where(eq(manufacturers.id, input.id));
      });

      void auditLog.record({
        action: AuditAction.ADMIN_MANUFACTURER_PURGED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "manufacturer",
        resourceId: input.id,
        req: ctx.req,
      }).catch((err) => console.error("[audit] purgeManufacturer", err));

      return { success: true };
    }),

  // ─── Suppliers (paid table) ──────────────────────────────────────────────
  deleteSupplier: adminProcedure
    .input(z.object({ supplierId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found." });
      }

      await db.update(suppliers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(suppliers.id, input.supplierId), isNull(suppliers.deletedAt)));

      void auditLog.record({
        action: AuditAction.ADMIN_SUPPLIER_DELETED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "supplier",
        resourceId: input.supplierId,
        req: ctx.req,
      }).catch((err) => console.error("[audit] deleteSupplier", err));

      return { success: true };
    }),

  restoreSupplier: adminProcedure
    .input(z.object({ supplierId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [target] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found." });
      }

      await db.update(suppliers).set({ deletedAt: null, updatedAt: new Date() }).where(eq(suppliers.id, input.supplierId));

      void auditLog.record({
        action: AuditAction.ADMIN_SUPPLIER_RESTORED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "supplier",
        resourceId: input.supplierId,
        req: ctx.req,
      }).catch((err) => console.error("[audit] restoreSupplier", err));

      return { success: true };
    }),

  // Irreversible. Supplier-owned operational/config rows are removed first, then
  // the supplier itself. Cross-party history (rfq_bids, conversations, messages,
  // rfq_threads, rfq_requests, crm_contacts) is retained for architect/CRM audit
  // context and may keep the historical supplier id after purge.
  purgeSupplier: adminProcedure
    .input(z.object({ supplierId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = input.supplierId;
      const [target] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found." });
      }

      await db.transaction(async (tx) => {
        await tx.delete(supplierSubscriptions).where(eq(supplierSubscriptions.supplierId, id));
        await tx.delete(supplierProfileViews).where(eq(supplierProfileViews.supplierId, id));
        await tx.delete(supplierBuyerFitInputs).where(eq(supplierBuyerFitInputs.supplierId, id));
        await tx.delete(supplierSustainabilityProfiles).where(eq(supplierSustainabilityProfiles.supplierId, id));
        await tx.delete(materialSpecs).where(eq(materialSpecs.supplierId, id));
        await tx.delete(companyOfWeekSlots).where(eq(companyOfWeekSlots.supplierId, id));
        await tx.delete(usageTracking).where(eq(usageTracking.supplierId, id));
        await tx.delete(agentHandoffRules).where(eq(agentHandoffRules.supplierId, id));
        await tx.delete(supplierFilters).where(eq(supplierFilters.supplierId, id));
        await tx.delete(suppliersLocation).where(eq(suppliersLocation.supplierId, id));
        await tx.delete(rfqSupplierInvites).where(eq(rfqSupplierInvites.supplierId, id));
        await tx.delete(epdMaterials).where(eq(epdMaterials.supplierId, id));
        await tx.delete(supplierMaterialEpds).where(eq(supplierMaterialEpds.supplierId, id));
        await tx.delete(conciergeRoutes).where(eq(conciergeRoutes.supplierId, id));
        await tx.delete(learningEvents).where(eq(learningEvents.supplierId, id));
        await tx.delete(suppliers).where(eq(suppliers.id, id));
      });

      void auditLog.record({
        action: AuditAction.ADMIN_SUPPLIER_PURGED,
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email ?? null,
        actorRole: ctx.auth?.role ?? null,
        resourceType: "supplier",
        resourceId: id,
        req: ctx.req,
      }).catch((err) => console.error("[audit] purgeSupplier", err));

      return { success: true };
    }),
});


