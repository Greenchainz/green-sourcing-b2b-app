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
      termsAccepted: !!acceptance?.termsAccepted,
      termsAcceptedAt: acceptance?.termsAcceptedAt,
      termsVersion: acceptance?.termsVersion || "1.0",
      privacyAccepted: !!acceptance?.privacyAccepted,
      privacyAcceptedAt: acceptance?.privacyAcceptedAt,
      privacyVersion: acceptance?.privacyVersion || "1.0",
      cookieConsentGiven: !!acceptance?.cookieConsentGiven,
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
      await db
        .insert(legalAcceptances)
        .values({
          userId,
          termsAccepted: true,
          termsAcceptedAt: now,
          termsVersion: input.version,
          privacyAccepted: false,
          cookieConsentGiven: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            legalAcceptances.userId,
            legalAcceptances.termsVersion,
            legalAcceptances.privacyVersion,
          ],
          set: {
            termsAccepted: true,
            termsAcceptedAt: now,
            termsVersion: input.version,
            updatedAt: now,
          },
        });

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
      await db
        .insert(legalAcceptances)
        .values({
          userId,
          privacyAccepted: true,
          privacyAcceptedAt: now,
          privacyVersion: input.version,
          termsAccepted: false,
          cookieConsentGiven: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            legalAcceptances.userId,
            legalAcceptances.termsVersion,
            legalAcceptances.privacyVersion,
          ],
          set: {
            privacyAccepted: true,
            privacyAcceptedAt: now,
            privacyVersion: input.version,
            updatedAt: now,
          },
        });

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
    await db
      .insert(legalAcceptances)
      .values({
        userId,
        cookieConsentGiven: true,
        cookieConsentAt: now,
        termsAccepted: false,
        privacyAccepted: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          legalAcceptances.userId,
          legalAcceptances.termsVersion,
          legalAcceptances.privacyVersion,
        ],
        set: {
          cookieConsentGiven: true,
          cookieConsentAt: now,
          updatedAt: now,
        },
      });

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
      await db
        .insert(legalAcceptances)
        .values({
          userId,
          termsAccepted: true,
          termsAcceptedAt: now,
          termsVersion: input.termsVersion,
          privacyAccepted: true,
          privacyAcceptedAt: now,
          privacyVersion: input.privacyVersion,
          cookieConsentGiven: true,
          cookieConsentAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            legalAcceptances.userId,
            legalAcceptances.termsVersion,
            legalAcceptances.privacyVersion,
          ],
          set: {
            termsAccepted: true,
            termsAcceptedAt: now,
            privacyAccepted: true,
            privacyAcceptedAt: now,
            cookieConsentGiven: true,
            cookieConsentAt: now,
            updatedAt: now,
          },
        });

      return { success: true };
    }),
});
