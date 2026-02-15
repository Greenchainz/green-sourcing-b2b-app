import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { legalAcceptances } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const legalRouter = router({
  /**
   * Get current user's legal acceptance status
   */
  getAcceptanceStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const userId = ctx.user?.id;

    if (!userId || !db) {
      return {
        termsAccepted: false,
        privacyAccepted: false,
        cookieConsentGiven: false,
      };
    }

    const rows = await db
      .select()
      .from(legalAcceptances)
      .where(eq(legalAcceptances.userId, userId));

    const acceptance = rows[0];

    return {
      termsAccepted: acceptance?.termsAccepted === 1,
      termsAcceptedAt: acceptance?.termsAcceptedAt,
      termsVersion: acceptance?.termsVersion || "1.0",
      privacyAccepted: acceptance?.privacyAccepted === 1,
      privacyAcceptedAt: acceptance?.privacyAcceptedAt,
      privacyVersion: acceptance?.privacyVersion || "1.0",
      cookieConsentGiven: acceptance?.cookieConsentGiven === 1,
      cookieConsentAt: acceptance?.cookieConsentAt,
    };
  }),

  /**
   * Accept Terms of Service
   */
  acceptTerms: protectedProcedure
    .input(
      z.object({
        version: z.string().default("1.0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user?.id;

      if (!userId || !db) {
        throw new Error("User not authenticated");
      }

      const now = new Date();
      const existing = await db
        .select()
        .from(legalAcceptances)
        .where(eq(legalAcceptances.userId, userId));

      if (existing.length > 0) {
        await db
          .update(legalAcceptances)
          .set({
            termsAccepted: 1,
            termsAcceptedAt: now,
            termsVersion: input.version,
            updatedAt: now,
          })
          .where(eq(legalAcceptances.userId, userId));
      } else {
        await db.insert(legalAcceptances).values({
          userId,
          termsAccepted: 1,
          termsAcceptedAt: now,
          termsVersion: input.version,
          privacyAccepted: 0,
          cookieConsentGiven: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { success: true };
    }),

  /**
   * Accept Privacy Policy
   */
  acceptPrivacy: protectedProcedure
    .input(
      z.object({
        version: z.string().default("1.0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user?.id;

      if (!userId || !db) {
        throw new Error("User not authenticated");
      }

      const now = new Date();
      const existing = await db
        .select()
        .from(legalAcceptances)
        .where(eq(legalAcceptances.userId, userId));

      if (existing.length > 0) {
        await db
          .update(legalAcceptances)
          .set({
            privacyAccepted: 1,
            privacyAcceptedAt: now,
            privacyVersion: input.version,
            updatedAt: now,
          })
          .where(eq(legalAcceptances.userId, userId));
      } else {
        await db.insert(legalAcceptances).values({
          userId,
          privacyAccepted: 1,
          privacyAcceptedAt: now,
          privacyVersion: input.version,
          termsAccepted: 0,
          cookieConsentGiven: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { success: true };
    }),

  /**
   * Accept Cookie Consent
   */
  acceptCookieConsent: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    const userId = ctx.user?.id;

    if (!userId || !db) {
      throw new Error("User not authenticated");
    }

    const now = new Date();
    const existing = await db
      .select()
      .from(legalAcceptances)
      .where(eq(legalAcceptances.userId, userId));

    if (existing.length > 0) {
      await db
        .update(legalAcceptances)
        .set({
          cookieConsentGiven: 1,
          cookieConsentAt: now,
          updatedAt: now,
        })
        .where(eq(legalAcceptances.userId, userId));
    } else {
      await db.insert(legalAcceptances).values({
        userId,
        cookieConsentGiven: 1,
        cookieConsentAt: now,
        termsAccepted: 0,
        privacyAccepted: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  }),

  /**
   * Accept all legal documents at once (used during signup)
   */
  acceptAll: protectedProcedure
    .input(
      z.object({
        termsVersion: z.string().default("1.0"),
        privacyVersion: z.string().default("1.0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user?.id;

      if (!userId || !db) {
        throw new Error("User not authenticated");
      }

      const now = new Date();
      const existing = await db
        .select()
        .from(legalAcceptances)
        .where(eq(legalAcceptances.userId, userId));

      if (existing.length > 0) {
        await db
          .update(legalAcceptances)
          .set({
            termsAccepted: 1,
            termsAcceptedAt: now,
            termsVersion: input.termsVersion,
            privacyAccepted: 1,
            privacyAcceptedAt: now,
            privacyVersion: input.privacyVersion,
            cookieConsentGiven: 1,
            cookieConsentAt: now,
            updatedAt: now,
          })
          .where(eq(legalAcceptances.userId, userId));
      } else {
        await db.insert(legalAcceptances).values({
          userId,
          termsAccepted: 1,
          termsAcceptedAt: now,
          termsVersion: input.termsVersion,
          privacyAccepted: 1,
          privacyAcceptedAt: now,
          privacyVersion: input.privacyVersion,
          cookieConsentGiven: 1,
          cookieConsentAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { success: true };
    }),
});
