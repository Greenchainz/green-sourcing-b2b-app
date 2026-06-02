import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { suppliers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendSupplierWelcomeEmail, sendFounderNewSupplierAlert } from "../email-service";
import { parseEpdPdf } from "../services/epd-intelligence";
import { getSupplierVerificationSnapshot } from "../services/supplier-verification";

/**
 * Supplier Onboarding Router
 *
 * Routes:
 *   supplierOnboarding.submitOnboarding — create or update supplier profile
 *   supplierOnboarding.getMyProfile     — get the current user's supplier profile
 *   supplierOnboarding.updateProfile    — update an existing supplier profile
 */

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY",
] as const;

const onboardingInput = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  website: z.string().url("Valid URL required").optional().or(z.literal("")),
  description: z.string().optional(),
  materialCategories: z.array(z.string()).min(1, "Select at least one material category"),
  certifications: z.array(z.string()).optional(),
  epdUrl: z.string().url("Valid EPD URL required").optional().or(z.literal("")),
  epdProgramOperator: z.string().max(150).optional(),
  // ── Supplier location — required for distance-based RFQ routing ──────────
  // Without state, isWithinServiceArea() can't do a state-match fallback and
  // the supplier becomes invisible to all radius-based routing.
  city: z.string().optional(),
  state: z.enum(US_STATES).optional(),   // 2-char state code — drives routing fallback
  zipCode: z.string().optional(),
  // ── Service area & shipping capability ──────────────────────────────────
  serviceRadiusMiles: z.number().int().positive().nullable().optional(),
  statesServed: z.array(z.enum(US_STATES)).nullable().optional(),
  shipsNationwide: z.boolean().optional(),
  minOrderQuantity: z.number().positive().nullable().optional(),
  maxOrderQuantity: z.number().positive().nullable().optional(),
});

export const supplierOnboardingRouter = router({
  // ── Create or upsert supplier profile ────────────────────────────────────
  submitOnboarding: protectedProcedure
    .input(onboardingInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if a profile already exists for this user
      const [existing] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        // Update existing profile
        await db
          .update(suppliers)
          .set({
            companyName: input.companyName,
            contactName: input.contactName,
            email: input.email,
            phone: input.phone ?? null,
            website: input.website || null,
            description: input.description ?? null,
            materialCategories: input.materialCategories,
            certifications: input.certifications ?? [],
            epdUrl: input.epdUrl || null,
            epdProgramOperator: input.epdProgramOperator ?? null,
            city: input.city ?? null,
            state: input.state ?? null,
            zipCode: input.zipCode ?? null,
            serviceRadiusMiles: input.serviceRadiusMiles ?? null,
            statesServed: input.statesServed ?? null,
            shipsNationwide: input.shipsNationwide ?? false,
            minOrderQuantity: input.minOrderQuantity != null ? String(input.minOrderQuantity) : null,
            maxOrderQuantity: input.maxOrderQuantity != null ? String(input.maxOrderQuantity) : null,
            updatedAt: new Date(),
          })
          .where(eq(suppliers.id, existing.id));

        return { id: existing.id, created: false };
      }

      // Insert new profile
      const [row] = await db
        .insert(suppliers)
        .values({
          userId: ctx.user.id,
          companyName: input.companyName,
          contactName: input.contactName,
          email: input.email,
          phone: input.phone ?? null,
          website: input.website || null,
          description: input.description ?? null,
          materialCategories: input.materialCategories,
          certifications: input.certifications ?? [],
          epdUrl: input.epdUrl || null,
          epdProgramOperator: input.epdProgramOperator ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          zipCode: input.zipCode ?? null,
          serviceRadiusMiles: input.serviceRadiusMiles ?? null,
          statesServed: input.statesServed ?? null,
          shipsNationwide: input.shipsNationwide ?? false,
          minOrderQuantity: input.minOrderQuantity != null ? String(input.minOrderQuantity) : null,
          maxOrderQuantity: input.maxOrderQuantity != null ? String(input.maxOrderQuantity) : null,
          verificationStatus: "pending",
        })
        .returning({ id: suppliers.id });

      // Fire-and-forget: welcome email to supplier + alert to founder
      void Promise.all([
        sendSupplierWelcomeEmail({
          supplierEmail: input.email,
          contactName: input.contactName,
          companyName: input.companyName,
          supplierId: row.id,
        }),
        sendFounderNewSupplierAlert({
          companyName: input.companyName,
          contactName: input.contactName,
          supplierEmail: input.email,
          materialCategories: input.materialCategories,
          supplierId: row.id,
        }),
      ]).catch((err: unknown) =>
        console.error("[onboarding] Email send failed:", err)
      );

      return { id: row.id, created: true };
    }),

  // ── Get current user's supplier profile ──────────────────────────────────
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [profile] = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        contactName: suppliers.contactName,
        email: suppliers.email,
        phone: suppliers.phone,
        website: suppliers.website,
        description: suppliers.description,
        materialCategories: suppliers.materialCategories,
        certifications: suppliers.certifications,
        epdUrl: suppliers.epdUrl,
        epdProgramOperator: suppliers.epdProgramOperator,
        verificationStatus: suppliers.verificationStatus,
        verified: suppliers.verified,
        verifiedSupplierStatus: suppliers.verifiedSupplierStatus,
        verifiedSupplierReasons: suppliers.verifiedSupplierReasons,
        verifiedSupplierComputedAt: suppliers.verifiedSupplierComputedAt,
        verifiedSupplierExpiresAt: suppliers.verifiedSupplierExpiresAt,
        address: suppliers.address,
        city: suppliers.city,
        state: suppliers.state,
        zipCode: suppliers.zipCode,
        country: suppliers.country,
        location: suppliers.location,
        isPremium: suppliers.isPremium,
        sustainabilityScore: suppliers.sustainabilityScore,
        serviceRadiusMiles: suppliers.serviceRadiusMiles,
        statesServed: suppliers.statesServed,
        shipsNationwide: suppliers.shipsNationwide,
        minOrderQuantity: suppliers.minOrderQuantity,
        maxOrderQuantity: suppliers.maxOrderQuantity,
        otifPercentage: suppliers.otifPercentage,
        avgLeadTimeDays: suppliers.avgLeadTimeDays,
        leadTimeVarianceDays: suppliers.leadTimeVarianceDays,
        supplierZScore: suppliers.supplierZScore,
        inventoryVisibility: suppliers.inventoryVisibility,
        vetLastUpdatedAt: suppliers.vetLastUpdatedAt,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    return profile ?? null;
  }),

  // ── Read-only computed supplier verification badge snapshot ───────────────
  getVerificationBadge: publicProcedure
    .input(
      z.object({
        supplierId: z.number().int().positive(),
        forceRefresh: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return getSupplierVerificationSnapshot(input.supplierId, {
        forceRefresh: input.forceRefresh ?? false,
      });
    }),

  // ── Update an existing supplier profile ──────────────────────────────────
  updateProfile: protectedProcedure
    .input(onboardingInput.partial())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [existing] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "No supplier profile found" });

      await db
        .update(suppliers)
        .set({
          ...input,
          website: input.website || null,
          epdUrl: input.epdUrl || null,
          epdProgramOperator: input.epdProgramOperator ?? null,
          // decimal columns must be coerced to string for Drizzle
          minOrderQuantity: input.minOrderQuantity != null ? String(input.minOrderQuantity) : null,
          maxOrderQuantity: input.maxOrderQuantity != null ? String(input.maxOrderQuantity) : null,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, existing.id));

      return { success: true };
    }),

  // ── Parse EPD / product sheet PDF → pre-fill profile fields ─────────────
  // Accepts a base64-encoded PDF, runs it through Azure Document Intelligence
  // + GPT-4o, and returns structured fields ready to hydrate the onboarding form.
  parseEpdDocument: protectedProcedure
    .input(
      z.object({
        /** Base64-encoded PDF bytes */
        fileBase64: z.string().min(100, "File content too short"),
        /** Original filename — for logging only */
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");

      if (buffer.length > 20 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large — maximum 20 MB",
        });
      }

      console.log(
        `[epd-upload] Parsing ${input.fileName ?? "document"} (${Math.round(buffer.length / 1024)}KB)`
      );

      const result = await parseEpdPdf(buffer);

      return result;
    }),
});
