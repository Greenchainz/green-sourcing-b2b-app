import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { suppliers, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
});
