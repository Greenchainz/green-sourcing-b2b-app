import { protectedProcedure, router } from "./_core/trpc";
import { runManufacturerPdfIngestion, MANUFACTURER_SPEC_SHEETS } from "./services/manufacturerPdfIngestion";
import { getDb } from "./db";
import { suppliers, users, materials, materialCertifications, buyerSubscriptions } from "../drizzle/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateComplianceReport } from "./compliance-service";

/**
 * Admin Router — Admin-only operations
 */

// Admin-only procedure (checks if user is admin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
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
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update supplier status
      await db
        .update(suppliers)
        .set({ verificationStatus: "approved", verifiedAt: new Date() })
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

      return { success: true };
    }),

  /**
   * Reject a supplier
   */
  rejectSupplier: adminProcedure
    .input(z.object({ supplierId: z.number(), notes: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update supplier status
      await db
        .update(suppliers)
        .set({ verificationStatus: "rejected" })
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
      userId: z.number(),
      role: z.enum(["user", "admin", "buyer", "supplier"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId));
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
});
