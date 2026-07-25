/**
 * CRM Router
 *
 * Full pipeline management for supplier + architect outreach.
 * Admin-only (protectedProcedure + role check).
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  crmContacts,
  crmEvents,
  crmEmailSequences,
  priceIndices,
  leadTimeCatalog,
  scraperRuns,
} from "../../drizzle/schema";
import {
  eq,
  and,
  desc,
  asc,
  ilike,
  count,
  sql,
  isNull,
  gt,
} from "drizzle-orm";
import {
  enrollInClaimSequence,
  sendManualEmail,
} from "../services/outreach-email-service";
import { sendSupplierClaimConfirmationEmail } from "../email-service";
import type { TrpcContext } from "../_core/context";
import { canAccessAdmin } from "../_core/admin-access";

// ── Guard: admin only ──────────────────────────────────────────────────────────
function requireAdmin(ctx: Pick<TrpcContext, "user">) {
  if (!canAccessAdmin(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

const VALID_STAGES = [
  "prospect", "contacted", "engaged", "claimed", "trial", "paying", "churned", "dead",
] as const;

const VALID_TYPES = ["supplier", "architect_firm", "architect"] as const;

// ─── Router ───────────────────────────────────────────────────────────────────

export const crmRouter = router({
  // ── Contacts ───────────────────────────────────────────────────────────────

  contacts: router({
    list: protectedProcedure
      .input(
        z.object({
          stage: z.enum(VALID_STAGES).optional(),
          type: z.enum(VALID_TYPES).optional(),
          category: z.string().optional(),
          readinessLevel: z.enum(["high", "medium", "low"]).optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const conditions = [];
        if (input.stage) conditions.push(eq(crmContacts.stage, input.stage));
        if (input.type) conditions.push(eq(crmContacts.type, input.type));
        if (input.category) conditions.push(ilike(crmContacts.category, `%${input.category}%`));
        if (input.readinessLevel) conditions.push(eq(crmContacts.readinessLevel, input.readinessLevel));
        if (input.search) {
          conditions.push(
            sql`(${crmContacts.companyName} ILIKE ${`%${input.search}%`} OR ${crmContacts.contactName} ILIKE ${`%${input.search}%`} OR ${crmContacts.email} ILIKE ${`%${input.search}%`})`
          );
        }

        const [rows, [{ total }]] = await Promise.all([
          db
            .select()
            .from(crmContacts)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(crmContacts.updatedAt))
            .limit(input.limit)
            .offset(input.offset),
          db
            .select({ total: count() })
            .from(crmContacts)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        return { contacts: rows, total: Number(total) };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [contact] = await db
          .select()
          .from(crmContacts)
          .where(eq(crmContacts.id, input.id))
          .limit(1);

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

        const [events, seqSteps] = await Promise.all([
          db
            .select()
            .from(crmEvents)
            .where(eq(crmEvents.contactId, input.id))
            .orderBy(desc(crmEvents.createdAt))
            .limit(50),
          db
            .select()
            .from(crmEmailSequences)
            .where(eq(crmEmailSequences.contactId, input.id))
            .orderBy(asc(crmEmailSequences.step)),
        ]);

        return { contact, events, seqSteps };
      }),

    create: protectedProcedure
      .input(
        z.object({
          type: z.enum(VALID_TYPES).default("supplier"),
          companyName: z.string().min(1),
          contactName: z.string().optional(),
          email: z.string().email().optional(),
          website: z.string().url().optional(),
          location: z.string().optional(),
          category: z.string().optional(),
          subcategory: z.string().optional(),
          keyProduct: z.string().optional(),
          pitchAngle: z.string().optional(),
          hasEpd: z.boolean().default(false),
          readinessLevel: z.enum(["high", "medium", "low"]).optional(),
          internalNotes: z.string().optional(),
          source: z.string().optional(),
          linkedinUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [contact] = await db
          .insert(crmContacts)
          .values({ ...input, stage: "prospect" })
          .returning();

        return contact;
      }),

    updateStage: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          stage: z.enum(VALID_STAGES),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [updated] = await db
          .update(crmContacts)
          .set({ stage: input.stage, updatedAt: new Date() })
          .where(eq(crmContacts.id, input.id))
          .returning();

        await db.insert(crmEvents).values({
          contactId: input.id,
          eventType: "status_changed",
          notes: input.notes ?? `Stage → ${input.stage}`,
          metadata: { stage: input.stage },
          performedBy: ctx.user?.name ?? "admin",
        });

        return updated;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          contactName: z.string().optional(),
          email: z.string().email().optional(),
          website: z.string().optional(),
          location: z.string().optional(),
          keyProduct: z.string().optional(),
          pitchAngle: z.string().optional(),
          hasEpd: z.boolean().optional(),
          readinessLevel: z.enum(["high", "medium", "low"]).optional(),
          internalNotes: z.string().optional(),
          linkedinUrl: z.string().optional(),
          nextFollowUpAt: z.string().datetime().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { id, nextFollowUpAt, ...rest } = input;
        const [updated] = await db
          .update(crmContacts)
          .set({
            ...rest,
            ...(nextFollowUpAt ? { nextFollowUpAt: new Date(nextFollowUpAt) } : {}),
            updatedAt: new Date(),
          })
          .where(eq(crmContacts.id, id))
          .returning();

        return updated;
      }),

    addNote: protectedProcedure
      .input(z.object({ contactId: z.number(), note: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.insert(crmEvents).values({
          contactId: input.contactId,
          eventType: "note_added",
          notes: input.note,
          performedBy: ctx.user?.name ?? "admin",
        });

        return { ok: true };
      }),
  }),

  // ── Pipeline Summary ───────────────────────────────────────────────────────

  pipeline: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select({
          stage: crmContacts.stage,
          type: crmContacts.type,
          cnt: count(),
        })
        .from(crmContacts)
        .groupBy(crmContacts.stage, crmContacts.type);

      // Pivot into { [stage]: { supplier, architect_firm, architect, total } }
      const summary: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        if (!summary[r.stage]) summary[r.stage] = { total: 0 };
        summary[r.stage][r.type] = Number(r.cnt);
        summary[r.stage].total = (summary[r.stage].total ?? 0) + Number(r.cnt);
      }

      return summary;
    }),

    recentActivity: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return await db
          .select({
            event: crmEvents,
            contactName: crmContacts.companyName,
            contactStage: crmContacts.stage,
          })
          .from(crmEvents)
          .innerJoin(crmContacts, eq(crmEvents.contactId, crmContacts.id))
          .orderBy(desc(crmEvents.createdAt))
          .limit(input.limit);
      }),
  }),

  // ── Outreach / Email ───────────────────────────────────────────────────────

  outreach: router({
    enroll: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        await enrollInClaimSequence(input.contactId);

        // Move stage to "contacted" if still prospect
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [c] = await db
          .select({ stage: crmContacts.stage })
          .from(crmContacts)
          .where(eq(crmContacts.id, input.contactId))
          .limit(1);

        if (c?.stage === "prospect") {
          await db
            .update(crmContacts)
            .set({ stage: "contacted", updatedAt: new Date() })
            .where(eq(crmContacts.id, input.contactId));
        }

        return { ok: true };
      }),

    enrollBatch: protectedProcedure
      .input(
        z.object({
          filters: z.object({
            stage: z.enum(VALID_STAGES).optional(),
            readinessLevel: z.enum(["high", "medium", "low"]).optional(),
            category: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const conditions = [];
        if (input.filters.stage) conditions.push(eq(crmContacts.stage, input.filters.stage));
        if (input.filters.readinessLevel) conditions.push(eq(crmContacts.readinessLevel, input.filters.readinessLevel));
        if (input.filters.category) conditions.push(ilike(crmContacts.category, `%${input.filters.category}%`));

        // Only contacts with an email address
        conditions.push(sql`${crmContacts.email} IS NOT NULL`);

        const contacts = await db
          .select({ id: crmContacts.id })
          .from(crmContacts)
          .where(and(...conditions))
          .limit(500);

        let enrolled = 0;
        for (const c of contacts) {
          await enrollInClaimSequence(c.id);
          enrolled++;
        }

        return { enrolled };
      }),

    sendManual: protectedProcedure
      .input(
        z.object({
          contactId: z.number(),
          subject: z.string().min(1),
          html: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        return await sendManualEmail(input.contactId, input.subject, input.html);
      }),

    sequenceStatus: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return await db
          .select()
          .from(crmEmailSequences)
          .where(eq(crmEmailSequences.contactId, input.contactId))
          .orderBy(asc(crmEmailSequences.step));
      }),
  }),

  // ── Price Intelligence ─────────────────────────────────────────────────────

  prices: router({
    latest: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Latest value per category (max period per series)
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (category)
          id, category, series_name, period, value, yoy_change_pct, scraped_at
        FROM price_indices
        ORDER BY category, period DESC
      `);

      return rows.rows as Array<{
        id: number;
        category: string;
        series_name: string;
        period: string;
        value: string;
        yoy_change_pct: string | null;
        scraped_at: string;
      }>;
    }),

    history: protectedProcedure
      .input(z.object({ category: z.string(), months: z.number().default(12) }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return await db
          .select()
          .from(priceIndices)
          .where(eq(priceIndices.category, input.category))
          .orderBy(desc(priceIndices.period))
          .limit(input.months);
      }),
  }),

  // ── Lead Times ─────────────────────────────────────────────────────────────

  leadTimes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db
        .select()
        .from(leadTimeCatalog)
        .orderBy(asc(leadTimeCatalog.category));
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          category: z.string().min(1),
          subcategory: z.string().optional(),
          product: z.string().optional(),
          weeksMin: z.number().int().positive(),
          weeksMax: z.number().int().positive(),
          notes: z.string().optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        if (input.id) {
          const [updated] = await db
            .update(leadTimeCatalog)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(leadTimeCatalog.id, input.id))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(leadTimeCatalog)
            .values({ ...input })
            .returning();
          return created;
        }
      }),
  }),

  // ── Scraper Health ─────────────────────────────────────────────────────────

  scrapers: router({
    recentRuns: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return await db
          .select()
          .from(scraperRuns)
          .orderBy(desc(scraperRuns.startedAt))
          .limit(input.limit);
      }),

    triggerFred: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx);
      // Fire and forget — run in background
      void import("../services/fred-scraper")
        .then(({ runFredScraper }) => runFredScraper())
        .catch((err: unknown) => console.error("[triggerFred]", err));
      return { triggered: true };
    }),

    triggerOutreachDrip: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx);
      void import("../services/outreach-email-service")
        .then(({ processDueSequenceSteps }) => processDueSequenceSteps())
        .catch((err: unknown) => console.error("[triggerOutreachDrip]", err));
      return { triggered: true };
    }),
  }),

  // ─── Public claim flow (no auth required — link from email) ─────────────────

  claim: router({
    // Verify token and return public profile info (FOMO preview)
    verify: publicProcedure
      .input(z.object({ token: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const now = new Date();
        const [contact] = await db
          .select({
            id: crmContacts.id,
            companyName: crmContacts.companyName,
            category: crmContacts.category,
            hasEpd: crmContacts.hasEpd,
            stage: crmContacts.stage,
            claimTokenExpiresAt: crmContacts.claimTokenExpiresAt,
            claimTokenUsedAt: crmContacts.claimTokenUsedAt,
            email: crmContacts.email,
          })
          .from(crmContacts)
          .where(
            and(
              eq(crmContacts.claimToken, input.token),
              isNull(crmContacts.claimTokenUsedAt),
              gt(crmContacts.claimTokenExpiresAt, now)
            )
          )
          .limit(1);

        if (!contact) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This claim link has expired or already been used.",
          });
        }

        if (contact.stage === "claimed" || contact.stage === "trial" || contact.stage === "paying") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This profile has already been claimed.",
          });
        }

        return {
          companyName: contact.companyName,
          category: contact.category,
          hasEpd: contact.hasEpd,
          prefillEmail: contact.email,
        };
      }),

    // Complete the claim — mark token used, advance CRM stage
    complete: publicProcedure
      .input(
        z.object({
          token: z.string().uuid(),
          contactName: z.string().min(2).max(255),
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const now = new Date();

        // Atomically consume the token: update only if still unused and unexpired.
        // Using .returning() means we get the row back only when we won the race;
        // concurrent requests will see 0 rows returned and throw NOT_FOUND.
        const claimedRows = await db
          .update(crmContacts)
          .set({
            stage: "engaged",
            claimTokenUsedAt: now,
            contactName: input.contactName,
            email: input.email,
            updatedAt: now,
          })
          .where(
            and(
              eq(crmContacts.claimToken, input.token),
              isNull(crmContacts.claimTokenUsedAt),
              gt(crmContacts.claimTokenExpiresAt, now)
            )
          )
          .returning();

        const claimed = claimedRows[0];

        if (!claimed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This claim link has expired or already been used.",
          });
        }

        await db.insert(crmEvents).values({
          contactId: claimed.id,
          eventType: "profile_claimed",
          subject: `${claimed.companyName} submitted claim form`,
          performedBy: "system",
          metadata: { contactName: input.contactName, email: input.email },
        });

        // Fire-and-forget: confirm the claim was received (transactional, not cold outreach).
        // Safely no-ops in envs without email keys. Copy is honest: claim != verified/live.
        void sendSupplierClaimConfirmationEmail({
          supplierEmail: input.email,
          contactName: input.contactName,
          companyName: claimed.companyName,
        }).catch((err) => console.error("claim confirmation email failed", err));

        return { success: true, companyName: claimed.companyName };
      }),
  }),
});
