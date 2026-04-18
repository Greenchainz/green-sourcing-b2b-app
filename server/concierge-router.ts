/**
 * Concierge Router — Admin-only warm-intro routing panel
 *
 * This is the "Ghost RFQ" concierge loop:
 *   1. Jerit sees scraped public projects + matched suppliers
 *   2. One click → architect gets a cold email that looks like GreenChainz
 *      proactively found them a verified supplier
 *   3. Every send is logged in concierge_routes for follow-up tracking
 */
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import {
  scrapedSuppliers,
  scrapedLeads,
  rfqs,
  rfqItems,
  conciergeRoutes,
} from "../drizzle/schema";
import { eq, desc, ilike, or, and, isNotNull, sql } from "drizzle-orm";
import { sendEmail } from "./email-service";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a material type string into a searchable keyword array.
 * e.g. "cast-in-place concrete" → ["concrete", "cast-in-place", "cement"]
 */
function materialKeywords(materialType: string): string[] {
  const lower = materialType.toLowerCase();
  const words = lower.split(/[\s,\-\/]+/).filter((w) => w.length > 2);
  // Add common synonyms
  const synonyms: Record<string, string[]> = {
    concrete: ["cement", "ready-mix", "precast"],
    steel: ["structural steel", "rebar", "metal framing"],
    timber: ["wood", "lumber", "mass timber", "clt"],
    glass: ["glazing", "curtain wall", "fenestration"],
    insulation: ["thermal", "rockwool", "mineral wool", "spray foam"],
    roofing: ["membrane", "tpo", "epdm", "shingles"],
    flooring: ["floor", "tile", "carpet", "hardwood", "lvt"],
    cladding: ["facade", "siding", "panel", "rainscreen"],
    drywall: ["gypsum", "wallboard", "plasterboard"],
  };
  const extras: string[] = [];
  for (const [key, vals] of Object.entries(synonyms)) {
    if (words.includes(key)) extras.push(...vals);
  }
  return [...new Set([...words, ...extras])];
}

/**
 * Score a scraped supplier against a list of material keywords.
 * Returns 0-100.
 */
function scoreSupplierMatch(
  supplierMaterials: string[],
  keywords: string[]
): number {
  if (!supplierMaterials?.length || !keywords?.length) return 0;
  const supplierText = supplierMaterials.join(" ").toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (supplierText.includes(kw)) hits++;
  }
  return Math.round((hits / keywords.length) * 100);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const conciergeRouter = router({
  /**
   * List all open RFQs (ghost + real) with their material types,
   * ready to be matched against the supplier DB.
   */
  listProjects: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: rfqs.id,
          projectName: rfqs.projectName,
          projectLocation: rfqs.projectLocation,
          projectType: rfqs.projectType,
          status: rfqs.status,
          dueDate: rfqs.dueDate,
          createdAt: rfqs.createdAt,
        })
        .from(rfqs)
        .orderBy(desc(rfqs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  /**
   * Get matched suppliers for a given project + material type string.
   * Returns top 10 suppliers sorted by match score.
   */
  matchSuppliers: adminProcedure
    .input(
      z.object({
        materialType: z.string().min(1),
        projectLocation: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const keywords = materialKeywords(input.materialType);

      // Pull all scraped suppliers that have an email (needed to send intro)
      const suppliers = await db
        .select()
        .from(scrapedSuppliers)
        .where(isNotNull(scrapedSuppliers.email))
        .limit(500);

      // Score each supplier
      const scored = suppliers
        .map((s) => ({
          ...s,
          matchScore: scoreSupplierMatch(
            (s.materialTypes as string[]) ?? [],
            keywords
          ),
        }))
        .filter((s) => s.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, input.limit);

      return scored;
    }),

  /**
   * Find architect/buyer leads that could be relevant for a project.
   * Used to populate the "send to architect" dropdown.
   */
  findArchitectLeads: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        state: z.string().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [
        isNotNull(scrapedLeads.email),
        or(
          eq(scrapedLeads.role, "architect"),
          eq(scrapedLeads.role, "gc_pm"),
          eq(scrapedLeads.role, "sustainability_director")
        ),
      ];
      if (input.search) {
        conditions.push(
          or(
            ilike(scrapedLeads.fullName, `%${input.search}%`),
            ilike(scrapedLeads.company, `%${input.search}%`),
            ilike(scrapedLeads.email, `%${input.search}%`)
          )!
        );
      }
      if (input.state) {
        conditions.push(eq(scrapedLeads.state, input.state));
      }
      const leads = await db
        .select()
        .from(scrapedLeads)
        .where(and(...conditions))
        .orderBy(desc(scrapedLeads.createdAt))
        .limit(input.limit);

      return leads;
    }),

  /**
   * Send a warm intro email from GreenChainz to an architect,
   * telling them we found verified suppliers for their project.
   * Logs the send in concierge_routes.
   */
  sendWarmIntro: adminProcedure
    .input(
      z.object({
        // Project context
        rfqId: z.number().optional(),
        projectName: z.string().min(1),
        projectLocation: z.string().optional(),
        materialType: z.string().min(1),
        // Architect recipient
        architectEmail: z.string().email(),
        architectName: z.string().optional(),
        architectCompany: z.string().optional(),
        // Matched supplier
        supplierId: z.number(),
        supplierName: z.string(),
        supplierEmail: z.string().optional(),
        // Optional admin note appended to the email
        adminNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const firstName = input.architectName?.split(" ")[0] ?? "there";
      const locationLine = input.projectLocation
        ? ` in ${input.projectLocation}`
        : "";

      const subject = `GreenChainz found a verified ${input.materialType} supplier for your project`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://greenchainz.com/logo.png" alt="GreenChainz" style="height:32px; margin-bottom:24px;" />
  <p>Hi ${firstName},</p>
  <p>
    We noticed you're working on <strong>${input.projectName}</strong>${locationLine} and may need
    <strong>${input.materialType}</strong> with verified EPD documentation.
  </p>
  <p>
    We ran the spec through our supplier network and found a strong match:
    <strong>${input.supplierName}</strong> — a verified supplier with compliant EPD data
    and active availability in your region.
  </p>
  <p>
    You can view their full compliance profile, EPD documents, and request a bid directly through GreenChainz:
  </p>
  <p style="margin: 24px 0;">
    <a href="https://greenchainz.com/rfq/new?material=${encodeURIComponent(input.materialType)}&supplier=${encodeURIComponent(input.supplierName)}"
       style="background:#16a34a; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">
      View Supplier &amp; Request Bid →
    </a>
  </p>
  ${
    input.adminNote
      ? `<p style="color:#555; font-size:14px;">${input.adminNote}</p>`
      : ""
  }
  <hr style="border:none; border-top:1px solid #e5e7eb; margin:32px 0;" />
  <p style="font-size:12px; color:#6b7280;">
    GreenChainz · Danville, VA · 
    <a href="https://greenchainz.com/unsubscribe?email=${encodeURIComponent(input.architectEmail)}" style="color:#6b7280;">Unsubscribe</a>
  </p>
</body>
</html>`;

      const text = `Hi ${firstName},

We noticed you're working on ${input.projectName}${locationLine} and may need ${input.materialType} with verified EPD documentation.

We ran the spec through our supplier network and found a strong match: ${input.supplierName} — a verified supplier with compliant EPD data and active availability in your region.

View their full profile and request a bid at:
https://greenchainz.com/rfq/new?material=${encodeURIComponent(input.materialType)}&supplier=${encodeURIComponent(input.supplierName)}

— The GreenChainz Team`;

      const sent = await sendEmail({
        to: input.architectEmail,
        subject,
        html,
        text,
      });

      // Log the send regardless of email success (so we can track in dev too)
      const [route] = await db
        .insert(conciergeRoutes)
        .values({
          rfqId: input.rfqId,
          projectName: input.projectName,
          projectLocation: input.projectLocation,
          materialTypes: [input.materialType],
          architectEmail: input.architectEmail,
          architectName: input.architectName,
          architectCompany: input.architectCompany,
          supplierId: input.supplierId,
          supplierName: input.supplierName,
          supplierEmail: input.supplierEmail,
          notes: input.adminNote,
          sentBy: "jerit",
        })
        .returning();

      return {
        success: sent,
        routeId: route.id,
        message: sent
          ? `Warm intro sent to ${input.architectEmail}`
          : `Email skipped (RESEND_API_KEY not set) — route logged as ID ${route.id}`,
      };
    }),

  /**
   * List all previously sent concierge routes (the sent log).
   */
  listSentRoutes: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const routes = await db
        .select()
        .from(conciergeRoutes)
        .orderBy(desc(conciergeRoutes.sentAt))
        .limit(input.limit)
        .offset(input.offset);

      return routes;
    }),

  /**
   * Mark an architect as having replied (manual update from Jerit).
   */
  markReplied: adminProcedure
    .input(z.object({ routeId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(conciergeRoutes)
        .set({ architectReplied: true, architectRepliedAt: new Date() })
        .where(eq(conciergeRoutes.id, input.routeId));
      return { success: true };
    }),

  /**
   * Summary stats for the concierge panel header.
   */
  stats: adminProcedure.query(async () => {
    const db = getDb();
    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conciergeRoutes);
    const [replied] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conciergeRoutes)
      .where(eq(conciergeRoutes.architectReplied, true));
    const [thisWeek] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conciergeRoutes)
      .where(
        sql`${conciergeRoutes.sentAt} >= now() - interval '7 days'`
      );

    return {
      totalSent: total?.count ?? 0,
      totalReplied: replied?.count ?? 0,
      replyRate:
        total?.count
          ? Math.round(((replied?.count ?? 0) / total.count) * 100)
          : 0,
      sentThisWeek: thisWeek?.count ?? 0,
    };
  }),
});
