import { randomInt } from "node:crypto";
import { router, protectedProcedure, architectProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  architects,
  architectReferrals,
  architectDownloadEvents,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  sendArchitectWelcomeEmail,
  sendFounderNewArchitectAlert,
} from "../email-service";

/**
 * Architect Router
 *
 * Onboarding:
 *   architect.getMyProfile       — null = not done; profile = done
 *   architect.submitOnboarding   — upsert, fire welcome emails on first insert
 *   architect.updateProfile      — patch any field; auto-applies profile credits
 *
 * PDF download gate:
 *   architect.getDownloadCredits    — current credit balance + referral code
 *   architect.generateReferralCode  — create unique code, return share URL
 *   architect.consumeDownloadCredit — decrement 1 credit, log event
 *   architect.claimLinkedInShare    — honor-system +1 credit (idempotent per material)
 *   architect.claimReferral         — new signup presents a referral code → referrer gets +3
 *   architect.applyProfileCredits   — check completeness, grant un-credited profile bonuses
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const FIRM_TYPE_VALUES = [
  "architecture_firm",
  "engineering_firm",
  "owner_developer",
  "contractor",
  "consultant",
] as const;

const VOLUME_VALUES = ["under_1m", "1m_10m", "10m_50m", "over_50m"] as const;

const PROFILE_CREDIT_KEYS = {
  firmName: { credits: 1, label: "Firm name" },
  license: { credits: 1, label: "License number" },
  autodesk: { credits: 2, label: "Autodesk account" },
} as const;

type ProfileCreditKey = keyof typeof PROFILE_CREDIT_KEYS;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateReferralCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[randomInt(chars.length)];
  }
  return code;
}

/** Compute which profile credit keys are eligible but not yet granted. */
function unclaimedProfileCredits(
  row: {
    firmName: string | null;
    licenseNumber: string | null;
    autodeskConnected: boolean | null;
  },
  granted: string[]
): ProfileCreditKey[] {
  const unclaimed: ProfileCreditKey[] = [];
  if (row.firmName && !granted.includes("firmName")) unclaimed.push("firmName");
  if (row.licenseNumber && !granted.includes("license"))
    unclaimed.push("license");
  if (row.autodeskConnected && !granted.includes("autodesk"))
    unclaimed.push("autodesk");
  return unclaimed;
}

// ── Onboarding input schema ────────────────────────────────────────────────────

const onboardingInput = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  firmName: z.string().min(1, "Firm name is required"),
  firmType: z.enum(FIRM_TYPE_VALUES),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  annualProjectVolume: z.enum(VOLUME_VALUES).optional(),
  projectTypes: z.array(z.string()).min(1, "Select at least one project type"),
  sustainabilityGoals: z
    .array(z.string())
    .min(1, "Select at least one sustainability goal"),
  preferredCertifications: z.array(z.string()).optional(),
  location: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().optional(),
  primaryProjectRegion: z.string().min(1, "Primary region is required"),
  leedAccredited: z.boolean().optional(),
  /** Referral code from URL param — optional, applied on first insert */
  referralCode: z.string().optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const architectRouter = router({
  // ── Onboarding ──────────────────────────────────────────────────────────────

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(architects)
      .where(eq(architects.userId, ctx.user.id))
      .limit(1);
    return row ?? null;
  }),

  submitOnboarding: architectProcedure
    .input(onboardingInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [existing] = await db
        .select({
          id: architects.id,
          profileCreditsGranted: architects.profileCreditsGranted,
        })
        .from(architects)
        .where(eq(architects.userId, ctx.user.id))
        .limit(1);

      const values = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        firmName: input.firmName,
        firmType: input.firmType,
        licenseNumber: input.licenseNumber ?? null,
        licenseState: input.licenseState ?? null,
        annualProjectVolume: input.annualProjectVolume ?? null,
        projectTypes: input.projectTypes,
        sustainabilityGoals: input.sustainabilityGoals,
        preferredCertifications: input.preferredCertifications ?? [],
        location: input.location,
        state: input.state,
        zipCode: input.zipCode ?? null,
        primaryProjectRegion: input.primaryProjectRegion,
        leedAccredited: input.leedAccredited ?? false,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(architects)
          .set(values)
          .where(eq(architects.id, existing.id));
        // Auto-apply any newly-eligible profile credits
        await _applyProfileCreditsInternal(
          db,
          existing.id,
          {
            firmName: input.firmName,
            licenseNumber: input.licenseNumber ?? null,
            autodeskConnected: false,
          },
          existing.profileCreditsGranted ?? []
        );
        return { id: existing.id, created: false };
      }

      const [row] = await db
        .insert(architects)
        .values({
          userId: ctx.user.id,
          status: "pending",
          downloadCredits: 2,
          ...values,
        })
        .returning({ id: architects.id });

      // Auto-apply profile credits for fields filled during onboarding
      await _applyProfileCreditsInternal(
        db,
        row.id,
        {
          firmName: input.firmName,
          licenseNumber: input.licenseNumber ?? null,
          autodeskConnected: false,
        },
        []
      );

      // Honor referral code if supplied
      if (input.referralCode) {
        await _creditReferrer(db, input.referralCode, row.id, input.email);
      }

      void Promise.all([
        sendArchitectWelcomeEmail({
          architectEmail: input.email,
          firstName: input.firstName,
          firmName: input.firmName,
          architectId: row.id,
        }),
        sendFounderNewArchitectAlert({
          firmName: input.firmName,
          firstName: input.firstName,
          lastName: input.lastName,
          architectEmail: input.email,
          state: input.state,
          projectTypes: input.projectTypes,
          architectId: row.id,
        }),
      ]).catch((err: unknown) =>
        console.error("[architect-onboarding] Email send failed:", err)
      );

      return { id: row.id, created: true };
    }),

  updateProfile: architectProcedure
    .input(onboardingInput.partial())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [existing] = await db
        .select({
          id: architects.id,
          firmName: architects.firmName,
          licenseNumber: architects.licenseNumber,
          autodeskConnected: architects.autodeskConnected,
          profileCreditsGranted: architects.profileCreditsGranted,
        })
        .from(architects)
        .where(eq(architects.userId, ctx.user.id))
        .limit(1);

      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No architect profile found",
        });

      await db
        .update(architects)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(architects.id, existing.id));

      // Re-evaluate profile credits with merged state
      const merged = {
        firmName: input.firmName ?? existing.firmName ?? null,
        licenseNumber: input.licenseNumber ?? existing.licenseNumber ?? null,
        autodeskConnected: existing.autodeskConnected ?? false,
      };
      const creditsAdded = await _applyProfileCreditsInternal(
        db,
        existing.id,
        merged,
        existing.profileCreditsGranted ?? []
      );

      return { success: true, profileCreditsAdded: creditsAdded };
    }),

  // ── PDF Download Gate ───────────────────────────────────────────────────────

  /** Returns credit balance and referral code (or null if not yet generated). */
  getDownloadCredits: architectProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const [row] = await db
      .select({
        id: architects.id,
        downloadCredits: architects.downloadCredits,
        referralCode: architects.referralCode,
        firmName: architects.firmName,
        licenseNumber: architects.licenseNumber,
        autodeskConnected: architects.autodeskConnected,
        profileCreditsGranted: architects.profileCreditsGranted,
      })
      .from(architects)
      .where(eq(architects.userId, ctx.user.id))
      .limit(1);

    if (!row)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No architect profile",
      });

    // Surface which profile credit fields are still unclaimed so the UI can show them
    const unclaimed = unclaimedProfileCredits(
      {
        firmName: row.firmName,
        licenseNumber: row.licenseNumber,
        autodeskConnected: row.autodeskConnected,
      },
      row.profileCreditsGranted ?? []
    );

    return {
      credits: row.downloadCredits,
      referralCode: row.referralCode ?? null,
      referralUrl: row.referralCode
        ? `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/register?ref=${row.referralCode}`
        : null,
      profileCreditsAvailable: unclaimed.map(k => ({
        key: k,
        label: PROFILE_CREDIT_KEYS[k].label,
        credits: PROFILE_CREDIT_KEYS[k].credits,
      })),
    };
  }),

  /**
   * Create or retrieve the architect's referral code.
   * Returns the shareable URL.
   */
  generateReferralCode: architectProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const [row] = await db
      .select({ id: architects.id, referralCode: architects.referralCode })
      .from(architects)
      .where(eq(architects.userId, ctx.user.id))
      .limit(1);

    if (!row)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No architect profile",
      });

    if (row.referralCode) {
      return {
        referralCode: row.referralCode,
        referralUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/register?ref=${row.referralCode}`,
      };
    }

    // Generate unique code (retry on collision — extremely rare for 8-char codes)
    let code = generateReferralCodeString();
    let attempts = 0;
    while (attempts < 5) {
      const [collision] = await db
        .select({ id: architects.id })
        .from(architects)
        .where(eq(architects.referralCode, code))
        .limit(1);
      if (!collision) break;
      code = generateReferralCodeString();
      attempts++;
    }

    await db
      .update(architects)
      .set({ referralCode: code })
      .where(eq(architects.id, row.id));

    return {
      referralCode: code,
      referralUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/register?ref=${code}`,
    };
  }),

  /**
   * Decrement 1 download credit and log the event.
   * Throws FORBIDDEN if credit balance is zero.
   */
  consumeDownloadCredit: architectProcedure
    .input(z.object({ materialId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [row] = await db
        .select({
          id: architects.id,
          downloadCredits: architects.downloadCredits,
        })
        .from(architects)
        .where(eq(architects.userId, ctx.user.id))
        .limit(1);

      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No architect profile",
        });

      if (row.downloadCredits <= 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No download credits remaining",
        });
      }

      await db
        .update(architects)
        .set({ downloadCredits: row.downloadCredits - 1 })
        .where(eq(architects.id, row.id));

      await db.insert(architectDownloadEvents).values({
        architectId: row.id,
        materialId: input.materialId,
        bypassMethod: null,
      });

      return { remainingCredits: row.downloadCredits - 1 };
    }),

  /**
   * Honor-system LinkedIn share credit: +1 download, idempotent per architect+material.
   * Also records a LinkedIn bypass event so we can review abuse patterns.
   */
  claimLinkedInShare: architectProcedure
    .input(z.object({ materialId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [row] = await db
        .select({
          id: architects.id,
          downloadCredits: architects.downloadCredits,
        })
        .from(architects)
        .where(eq(architects.userId, ctx.user.id))
        .limit(1);

      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No architect profile",
        });

      // Idempotency check: already claimed for this material?
      const [existing] = await db
        .select({ id: architectDownloadEvents.id })
        .from(architectDownloadEvents)
        .where(
          and(
            eq(architectDownloadEvents.architectId, row.id),
            eq(architectDownloadEvents.materialId, input.materialId),
            eq(architectDownloadEvents.bypassMethod, "linkedin")
          )
        )
        .limit(1);

      if (existing) {
        // Already claimed — just return current balance without error
        return {
          creditsAdded: 0,
          totalCredits: row.downloadCredits,
          alreadyClaimed: true,
        };
      }

      await db
        .update(architects)
        .set({ downloadCredits: row.downloadCredits + 1 })
        .where(eq(architects.id, row.id));

      await db.insert(architectDownloadEvents).values({
        architectId: row.id,
        materialId: input.materialId,
        bypassMethod: "linkedin",
      });

      return {
        creditsAdded: 1,
        totalCredits: row.downloadCredits + 1,
        alreadyClaimed: false,
      };
    }),

  /**
   * Process a referral code entered at signup.
   * Finds the referrer, credits them +3, marks the referral as credited.
   * Safe to call multiple times — idempotent via creditedAt check.
   */
  claimReferral: protectedProcedure
    .input(z.object({ referralCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const [myProfile] = await db
        .select({ id: architects.id })
        .from(architects)
        .where(eq(architects.userId, ctx.user.id))
        .limit(1);

      if (!myProfile)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No architect profile",
        });

      await _creditReferrer(
        db,
        input.referralCode,
        myProfile.id,
        ctx.user.email ?? ""
      );
      return { success: true };
    }),

  /**
   * Check profile completeness and grant unclaimed credits.
   * Call this any time the architect visits their profile or dashboard.
   */
  applyProfileCredits: architectProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const [row] = await db
      .select({
        id: architects.id,
        firmName: architects.firmName,
        licenseNumber: architects.licenseNumber,
        autodeskConnected: architects.autodeskConnected,
        profileCreditsGranted: architects.profileCreditsGranted,
        downloadCredits: architects.downloadCredits,
      })
      .from(architects)
      .where(eq(architects.userId, ctx.user.id))
      .limit(1);

    if (!row)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No architect profile",
      });

    const creditsAdded = await _applyProfileCreditsInternal(
      db,
      row.id,
      {
        firmName: row.firmName,
        licenseNumber: row.licenseNumber,
        autodeskConnected: row.autodeskConnected,
      },
      row.profileCreditsGranted ?? []
    );

    return { creditsAdded, totalCredits: row.downloadCredits + creditsAdded };
  }),
});

// ── Internal helpers ──────────────────────────────────────────────────────────

type DbType = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function _applyProfileCreditsInternal(
  db: DbType,
  architectId: number,
  profile: {
    firmName: string | null;
    licenseNumber: string | null;
    autodeskConnected: boolean | null;
  },
  alreadyGranted: string[]
): Promise<number> {
  const unclaimed = unclaimedProfileCredits(profile, alreadyGranted);
  if (unclaimed.length === 0) return 0;

  const totalNew = unclaimed.reduce(
    (sum, k) => sum + PROFILE_CREDIT_KEYS[k].credits,
    0
  );
  const newGranted = [...alreadyGranted, ...unclaimed];

  // Fetch current credits and add
  const [cur] = await db
    .select({ downloadCredits: architects.downloadCredits })
    .from(architects)
    .where(eq(architects.id, architectId))
    .limit(1);

  if (cur) {
    await db
      .update(architects)
      .set({
        profileCreditsGranted: newGranted,
        downloadCredits: cur.downloadCredits + totalNew,
      })
      .where(eq(architects.id, architectId));
  }

  return totalNew;
}

async function _creditReferrer(
  db: DbType,
  referralCode: string,
  refereeArchitectId: number,
  refereeEmail: string
): Promise<void> {
  const [referrerRow] = await db
    .select({ id: architects.id, downloadCredits: architects.downloadCredits })
    .from(architects)
    .where(eq(architects.referralCode, referralCode))
    .limit(1);

  if (!referrerRow) return; // Unknown code — silently ignore

  // Don't let architects refer themselves
  if (referrerRow.id === refereeArchitectId) return;

  // Check if this referral was already credited
  const [existingReferral] = await db
    .select({
      id: architectReferrals.id,
      creditedAt: architectReferrals.creditedAt,
    })
    .from(architectReferrals)
    .where(
      and(
        eq(architectReferrals.referrerId, referrerRow.id),
        eq(architectReferrals.refereeId, refereeArchitectId)
      )
    )
    .limit(1);

  if (existingReferral?.creditedAt) return; // Already credited

  const now = new Date();

  if (existingReferral) {
    // Referral row exists but uncredited — mark as credited
    await db
      .update(architectReferrals)
      .set({ refereeId: refereeArchitectId, creditedAt: now })
      .where(eq(architectReferrals.id, existingReferral.id));
  } else {
    // New referral row
    await db.insert(architectReferrals).values({
      referrerId: referrerRow.id,
      refereeEmail,
      refereeId: refereeArchitectId,
      creditedAt: now,
    });
  }

  // Grant +3 to referrer
  await db
    .update(architects)
    .set({ downloadCredits: referrerRow.downloadCredits + 3 })
    .where(eq(architects.id, referrerRow.id));
}
