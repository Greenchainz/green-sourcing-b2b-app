import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { userEngagement, engagementLog, users } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

// Credit awards per action type
const ACTION_CREDITS: Record<string, number> = {
  check_in: 1,
  rfq_submit: 5,
  comparison: 2,
  spec_sheet: 1,
  referral: 10,
};

// Streak thresholds for tier upgrades
function tierForStreak(streak: number): string {
  if (streak >= 12) return "founding";
  if (streak >= 4) return "pro";
  return "explorer";
}

// Check if two dates fall within the same ISO week (Mon-Sun)
function isSameWeek(a: Date, b: Date): boolean {
  const getWeekStart = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const start = new Date(d);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  };
  return getWeekStart(a) === getWeekStart(b);
}

export const engagementRouter = router({
  getMyEngagement: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const rows = await db
      .select()
      .from(userEngagement)
      .where(eq(userEngagement.userId, ctx.user.id))
      .limit(1);

    if (rows.length > 0) return rows[0];

    // Create a new engagement record
    const [created] = await db
      .insert(userEngagement)
      .values({ userId: ctx.user.id })
      .returning();

    return created;
  }),

  checkIn: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Get or create engagement record
    let rows = await db
      .select()
      .from(userEngagement)
      .where(eq(userEngagement.userId, ctx.user.id))
      .limit(1);

    if (rows.length === 0) {
      await db.insert(userEngagement).values({ userId: ctx.user.id });
      rows = await db
        .select()
        .from(userEngagement)
        .where(eq(userEngagement.userId, ctx.user.id))
        .limit(1);
    }

    const engagement = rows[0];
    const now = new Date();

    // Check if already checked in this week
    if (engagement.lastCheckIn && isSameWeek(engagement.lastCheckIn, now)) {
      return { alreadyCheckedIn: true, engagement };
    }

    // Calculate new streak
    let newStreak = 1;
    if (engagement.lastCheckIn) {
      const daysSince = Math.floor(
        (now.getTime() - engagement.lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince <= 14) {
        // Continue streak
        newStreak = engagement.currentStreak + 1;
      }
      // else: reset to 1 (gap > 14 days)
    }

    const newLongest = Math.max(newStreak, engagement.longestStreak);
    const newTier = tierForStreak(newStreak);
    const creditsEarned = ACTION_CREDITS.check_in;

    await db
      .update(userEngagement)
      .set({
        credits: sql`${userEngagement.credits} + ${creditsEarned}`,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCheckIn: now,
        totalCheckIns: sql`${userEngagement.totalCheckIns} + 1`,
        tier: newTier,
        updatedAt: now,
      })
      .where(eq(userEngagement.userId, ctx.user.id));

    // Log the action
    await db.insert(engagementLog).values({
      userId: ctx.user.id,
      action: "check_in",
      creditsEarned,
      metadata: { streak: newStreak, tier: newTier },
    });

    // Return updated record
    const [updated] = await db
      .select()
      .from(userEngagement)
      .where(eq(userEngagement.userId, ctx.user.id))
      .limit(1);

    return { alreadyCheckedIn: false, engagement: updated };
  }),

  logAction: protectedProcedure
    .input(
      z.object({
        action: z.enum(["rfq_submit", "comparison", "spec_sheet", "referral"]),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const creditsEarned = ACTION_CREDITS[input.action] || 0;

      // Ensure engagement record exists
      const rows = await db
        .select()
        .from(userEngagement)
        .where(eq(userEngagement.userId, ctx.user.id))
        .limit(1);

      if (rows.length === 0) {
        await db.insert(userEngagement).values({ userId: ctx.user.id });
      }

      // Update credits + action counter
      const counterField =
        input.action === "rfq_submit"
          ? userEngagement.rfqsSubmitted
          : input.action === "comparison"
          ? userEngagement.comparisons
          : input.action === "spec_sheet"
          ? userEngagement.specSheetsGenerated
          : input.action === "referral"
          ? userEngagement.referrals
          : null;

      if (counterField) {
        await db
          .update(userEngagement)
          .set({
            credits: sql`${userEngagement.credits} + ${creditsEarned}`,
            [counterField.name]: sql`${counterField} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(userEngagement.userId, ctx.user.id));
      } else {
        await db
          .update(userEngagement)
          .set({
            credits: sql`${userEngagement.credits} + ${creditsEarned}`,
            updatedAt: new Date(),
          })
          .where(eq(userEngagement.userId, ctx.user.id));
      }

      // Log the action
      await db.insert(engagementLog).values({
        userId: ctx.user.id,
        action: input.action,
        creditsEarned,
        metadata: input.metadata ?? null,
      });

      return { creditsEarned };
    }),

  getLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        name: users.name,
        credits: userEngagement.credits,
        tier: userEngagement.tier,
        currentStreak: userEngagement.currentStreak,
      })
      .from(userEngagement)
      .innerJoin(users, eq(userEngagement.userId, users.id))
      .orderBy(desc(userEngagement.credits))
      .limit(10);

    return rows.map((r) => ({
      name: r.name || "Anonymous Architect",
      credits: r.credits,
      tier: r.tier,
      currentStreak: r.currentStreak,
    }));
  }),
});
