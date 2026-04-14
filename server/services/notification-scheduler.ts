/**
 * Notification Scheduler — generates ready-to-send email payloads.
 *
 * These functions are triggered manually from admin endpoints (or cron later).
 * They query the database, apply templates, and return arrays of
 * `{ to, subject, html }` without sending anything.
 */

import { getDb } from "../db";
import { users, userEngagement, materials, manufacturers } from "../../drizzle/schema";
import { eq, desc, gte, lte, gt, and, isNotNull, sql } from "drizzle-orm";
import { getAllPriceTrends } from "./price-trends";
import {
  weeklyDigestEmail,
  streakReminderEmail,
  newMaterialAlertEmail,
  type WeeklyDigestData,
  type StreakReminderData,
  type NewMaterialAlertData,
} from "./email-templates";
import { query, queryMany } from "../../lib/pg-pool";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

// Milestone map: streak → next milestone
function nextMilestoneFor(streak: number): { name: string; weeksNeeded: number } {
  if (streak < 4) return { name: "Pro Tier", weeksNeeded: 4 };
  if (streak < 8) return { name: "Carbon Report Access", weeksNeeded: 8 };
  if (streak < 12) return { name: "Founding Architect", weeksNeeded: 12 };
  return { name: "Founding Architect", weeksNeeded: 12 };
}

/**
 * Generate personalised weekly digest emails for all engaged users.
 */
export async function generateWeeklyDigests(): Promise<EmailPayload[]> {
  const db = await getDb();
  if (!db) return [];

  // Fetch users who have engagement records and a valid email
  const rows = await db
    .select({
      email: users.email,
      name: users.name,
      streak: userEngagement.currentStreak,
      credits: userEngagement.credits,
      tier: userEngagement.tier,
    })
    .from(userEngagement)
    .innerJoin(users, eq(userEngagement.userId, users.id))
    .where(isNotNull(users.email));

  // Shared data: price trends + new materials (last 7 days)
  const allTrends = getAllPriceTrends();
  const trendEntries = Object.entries(allTrends)
    .slice(0, 3)
    .map(([category, trend]) => ({
      category,
      direction: trend.direction as "up" | "down",
      change: `${Math.abs(trend.yoyChange)}%`,
    }));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMaterials = await db
    .select({
      name: materials.name,
      manufacturerId: materials.manufacturerId,
    })
    .from(materials)
    .where(gte(materials.createdAt, sevenDaysAgo))
    .orderBy(desc(materials.createdAt))
    .limit(3);

  // Resolve manufacturer names
  const mfgIds = recentMaterials
    .map((m) => m.manufacturerId)
    .filter((id): id is number => id != null);

  const mfgMap = new Map<number, string>();
  if (mfgIds.length > 0) {
    const mfgRows = await db
      .select({ id: manufacturers.id, name: manufacturers.name })
      .from(manufacturers)
      .where(sql`${manufacturers.id} IN (${sql.join(mfgIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const m of mfgRows) {
      mfgMap.set(m.id, m.name);
    }
  }

  const newMaterials = recentMaterials.map((m) => ({
    name: m.name,
    manufacturer: (m.manufacturerId && mfgMap.get(m.manufacturerId)) || "Unknown",
  }));

  const payloads: EmailPayload[] = [];

  for (const row of rows) {
    if (!row.email) continue;

    const data: WeeklyDigestData = {
      userName: row.name || "there",
      streak: row.streak,
      credits: row.credits,
      tier: row.tier,
      priceTrends: trendEntries,
      newMaterials,
      nextMilestone: nextMilestoneFor(row.streak),
    };

    const { subject, html } = weeklyDigestEmail(data);
    payloads.push({ to: row.email, subject, html });
  }

  return payloads;
}

/**
 * Find users whose streak is at risk (last check-in was 6–13 days ago).
 * Returns ready-to-send reminder emails.
 */
export async function findAtRiskStreaks(): Promise<EmailPayload[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const thirteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      email: users.email,
      name: users.name,
      streak: userEngagement.currentStreak,
      lastCheckIn: userEngagement.lastCheckIn,
    })
    .from(userEngagement)
    .innerJoin(users, eq(userEngagement.userId, users.id))
    .where(
      and(
        isNotNull(users.email),
        gt(userEngagement.currentStreak, 0),
        isNotNull(userEngagement.lastCheckIn),
        lte(userEngagement.lastCheckIn, sixDaysAgo),
        gte(userEngagement.lastCheckIn, thirteenDaysAgo)
      )
    );

  const payloads: EmailPayload[] = [];

  for (const row of rows) {
    if (!row.email) continue;

    const data: StreakReminderData = {
      userName: row.name || "there",
      streak: row.streak,
      nextMilestone: nextMilestoneFor(row.streak),
    };

    const { subject, html } = streakReminderEmail(data);
    payloads.push({ to: row.email, subject, html });
  }

  return payloads;
}

/**
 * Placeholder: find new materials added in the last 24 hours and
 * match them to user interests. Returns alert emails.
 *
 * Currently returns alerts for all new EPD-verified materials to all
 * engaged users. In production, this should be filtered by user
 * category preferences (not yet implemented).
 */
export async function findNewMaterialMatches(): Promise<EmailPayload[]> {
  const db = await getDb();
  if (!db) return [];

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const newMats = await db
    .select({
      id: materials.id,
      name: materials.name,
      category: materials.category,
      gwpValue: materials.gwpValue,
      manufacturerId: materials.manufacturerId,
      ec3IndustryMedian: materials.ec3IndustryMedian,
    })
    .from(materials)
    .where(and(gte(materials.createdAt, oneDayAgo), eq(materials.hasEpd, true)))
    .orderBy(desc(materials.createdAt))
    .limit(5);

  if (newMats.length === 0) return [];

  // Resolve manufacturer names
  const mfgIds = newMats
    .map((m) => m.manufacturerId)
    .filter((id): id is number => id != null);

  const mfgMap = new Map<number, string>();
  if (mfgIds.length > 0) {
    const mfgRows = await db
      .select({ id: manufacturers.id, name: manufacturers.name })
      .from(manufacturers)
      .where(sql`${manufacturers.id} IN (${sql.join(mfgIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const m of mfgRows) {
      mfgMap.set(m.id, m.name);
    }
  }

  // Get all engaged users with email
  const engagedUsers = await db
    .select({ email: users.email, name: users.name })
    .from(userEngagement)
    .innerJoin(users, eq(userEngagement.userId, users.id))
    .where(isNotNull(users.email));

  const payloads: EmailPayload[] = [];

  // For now, send the first new material to all engaged users
  const mat = newMats[0];
  const mfgName = (mat.manufacturerId && mfgMap.get(mat.manufacturerId)) || "Unknown";

  // Estimate carbon below median
  let carbonBelowMedian: number | null = null;
  if (mat.gwpValue && mat.ec3IndustryMedian) {
    const gwp = parseFloat(String(mat.gwpValue));
    const median = parseFloat(mat.ec3IndustryMedian);
    if (median > 0 && gwp < median) {
      carbonBelowMedian = Math.round(((median - gwp) / median) * 100);
    }
  }

  for (const user of engagedUsers) {
    if (!user.email) continue;

    const data: NewMaterialAlertData = {
      userName: user.name || "there",
      materialName: mat.name,
      manufacturer: mfgName,
      category: mat.category,
      gwpValue: mat.gwpValue ? String(mat.gwpValue) : "N/A",
      carbonBelowMedian,
      materialId: mat.id,
    };

    const { subject, html } = newMaterialAlertEmail(data);
    payloads.push({ to: user.email, subject, html });
  }

  return payloads;
}

// ============================================================================
// RFQ Lifecycle Scheduler
// ============================================================================

/** In-memory set of RFQ IDs that have already received an expiry reminder */
const remindedRfqIds = new Set<string>();

/** Check for RFQs expiring within 24 hours and log reminders */
async function checkExpiringRfqs(): Promise<void> {
  try {
    const rows = await queryMany<{ id: string; title: string; deadline: Date; buyer_id: number }>(
      `SELECT id, title, deadline, buyer_id
       FROM rfqs
       WHERE status = 'open'
         AND deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`
    );

    for (const rfq of rows) {
      if (remindedRfqIds.has(rfq.id)) continue;

      console.log(
        `[rfq-scheduler] RFQ "${rfq.title}" (${rfq.id}) expires at ${rfq.deadline.toISOString()} — reminder pending`
      );
      remindedRfqIds.add(rfq.id);
    }

    if (rows.length > 0) {
      console.log(`[rfq-scheduler] ${rows.length} RFQ(s) expiring within 24h, ${remindedRfqIds.size} total reminded`);
    }
  } catch (err) {
    console.error("[rfq-scheduler] Error checking expiring RFQs:", err);
  }
}

/** Auto-expire overdue RFQs (status = 'open' and deadline < NOW()) */
async function expireOverdueRfqs(): Promise<void> {
  try {
    const result = await query(
      `UPDATE rfqs SET status = 'expired', updated_at = NOW()
       WHERE status = 'open' AND deadline < NOW()`
    );

    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`[rfq-scheduler] Expired ${count} overdue RFQ(s)`);
    }
  } catch (err) {
    console.error("[rfq-scheduler] Error expiring overdue RFQs:", err);
  }
}

/** 15-minute interval handle (for cleanup on shutdown) */
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the RFQ notification scheduler.
 * Runs every 15 minutes: checks for expiring RFQs and auto-expires overdue ones.
 * Call once on server startup.
 */
export function startNotificationScheduler(): void {
  if (schedulerInterval) {
    console.warn("[rfq-scheduler] Scheduler already running — skipping duplicate start");
    return;
  }

  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

  console.log("[rfq-scheduler] Starting RFQ notification scheduler (every 15 min)");

  // Run immediately on startup, then every 15 minutes
  void runSchedulerTick();

  schedulerInterval = setInterval(() => {
    void runSchedulerTick();
  }, FIFTEEN_MINUTES_MS);
}

async function runSchedulerTick(): Promise<void> {
  await checkExpiringRfqs();
  await expireOverdueRfqs();
}
