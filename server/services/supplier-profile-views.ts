import { getDb } from "../db";
import {
  supplierProfileViews,
  suppliers,
  architects,
  users,
} from "../../drizzle/schema";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

/**
 * Supplier profile "hits" — architects viewing a supplier's profile.
 *
 * A "hit" = a unique architect (role='buyer') who viewed the supplier on a
 * given day. The unique index on (supplier_id, viewer_user_id, view_date)
 * dedupes repeated same-day views, so counts can't be inflated by re-renders.
 *
 * Only architect views are recorded — that is the money-lane signal a supplier
 * pays to see (which firms are looking at them, and how many).
 */

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD — matches the `date` column
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateStr(d);
}

export interface SupplierHitViewer {
  firmName: string;
  firmType: string | null;
  city: string | null;
  state: string | null;
  views: number;
  lastViewedAt: string;
}

export interface SupplierHits {
  supplierId: number;
  totalHits: number;
  hitsThisWeek: number;
  hitsThisMonth: number;
  weeklyTrend: { weekStart: string; count: number }[];
  viewerIdentitiesUnlocked: boolean;
  /** Distinct architect firms (empty when identities are locked / on free tier). */
  viewers: SupplierHitViewer[];
}

/**
 * Record one or more supplier profile views by an architect.
 *
 * No-ops for non-architect viewers and for suppliers owned by the viewer
 * (self-views never count). Fire-and-forget safe: never throws.
 */
export async function recordSupplierViews(opts: {
  supplierIds: number[];
  viewerUserId: number;
  viewerRole?: string | null;
  source?: string | null;
}): Promise<void> {
  // Only architect (buyer) interest counts as a "hit".
  if (opts.viewerRole !== "buyer") return;

  const ids = Array.from(
    new Set(opts.supplierIds.filter((n) => Number.isInteger(n) && n > 0))
  );
  if (ids.length === 0) return;

  try {
    const db = await getDb();
    if (!db) return;

    // Exclude any supplier owned by the viewer (defensive — architects don't
    // own supplier rows, but never inflate a profile with self-views).
    const owned = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(inArray(suppliers.id, ids), eq(suppliers.userId, opts.viewerUserId)));
    const ownedSet = new Set(owned.map((o) => o.id));
    const targetIds = ids.filter((id) => !ownedSet.has(id));
    if (targetIds.length === 0) return;

    const today = dateStr(new Date());
    await db
      .insert(supplierProfileViews)
      .values(
        targetIds.map((supplierId) => ({
          supplierId,
          viewerUserId: opts.viewerUserId,
          viewerRole: opts.viewerRole ?? null,
          source: opts.source ?? null,
          viewDate: today,
        }))
      )
      .onConflictDoNothing();
  } catch (err) {
    console.error("[profile-views] record failed:", err);
  }
}

/** Aggregate hit stats for a supplier, optionally with viewer identities. */
export async function getSupplierHits(
  supplierId: number,
  opts: { includeViewers: boolean }
): Promise<SupplierHits> {
  const empty: SupplierHits = {
    supplierId,
    totalHits: 0,
    hitsThisWeek: 0,
    hitsThisMonth: 0,
    weeklyTrend: [],
    viewerIdentitiesUnlocked: opts.includeViewers,
    viewers: [],
  };

  const db = await getDb();
  if (!db) return empty;

  try {
    const [totalRow] = await db
      .select({ value: count() })
      .from(supplierProfileViews)
      .where(eq(supplierProfileViews.supplierId, supplierId));

    const [weekRow] = await db
      .select({ value: count() })
      .from(supplierProfileViews)
      .where(
        and(
          eq(supplierProfileViews.supplierId, supplierId),
          gte(supplierProfileViews.viewDate, daysAgo(6))
        )
      );

    const [monthRow] = await db
      .select({ value: count() })
      .from(supplierProfileViews)
      .where(
        and(
          eq(supplierProfileViews.supplierId, supplierId),
          gte(supplierProfileViews.viewDate, daysAgo(29))
        )
      );

    // Last 8 weeks of hits, bucketed by ISO week start.
    const trendResult = await db.execute(sql`
      SELECT to_char(date_trunc('week', "view_date"), 'YYYY-MM-DD') AS week_start,
             count(*)::int AS count
      FROM "supplier_profile_views"
      WHERE "supplier_id" = ${supplierId}
        AND "view_date" >= (CURRENT_DATE - INTERVAL '56 days')
      GROUP BY 1
      ORDER BY 1
    `);
    const weeklyTrend = (trendResult.rows as Array<{ week_start: string; count: number }>).map(
      (r) => ({ weekStart: r.week_start, count: Number(r.count) })
    );

    let viewers: SupplierHitViewer[] = [];
    if (opts.includeViewers) {
      const rows = await db
        .select({
          views: count(),
          lastViewedAt: sql<string | Date>`max(${supplierProfileViews.createdAt})`,
          firmName: architects.firmName,
          firmType: architects.firmType,
          city: architects.location,
          state: architects.state,
          userName: users.name,
          companyName: users.companyName,
        })
        .from(supplierProfileViews)
        .leftJoin(architects, eq(architects.userId, supplierProfileViews.viewerUserId))
        .leftJoin(users, eq(users.id, supplierProfileViews.viewerUserId))
        .where(eq(supplierProfileViews.supplierId, supplierId))
        .groupBy(
          supplierProfileViews.viewerUserId,
          architects.firmName,
          architects.firmType,
          architects.location,
          architects.state,
          users.name,
          users.companyName
        )
        .orderBy(desc(sql`max(${supplierProfileViews.createdAt})`))
        .limit(50);

      viewers = rows.map((r) => ({
        firmName: r.firmName ?? r.companyName ?? r.userName ?? "An architecture firm",
        firmType: r.firmType ?? null,
        city: r.city ?? null,
        state: r.state ?? null,
        views: Number(r.views),
        lastViewedAt:
          r.lastViewedAt instanceof Date ? r.lastViewedAt.toISOString() : String(r.lastViewedAt),
      }));
    }

    return {
      supplierId,
      totalHits: Number(totalRow?.value ?? 0),
      hitsThisWeek: Number(weekRow?.value ?? 0),
      hitsThisMonth: Number(monthRow?.value ?? 0),
      weeklyTrend,
      viewerIdentitiesUnlocked: opts.includeViewers,
      viewers,
    };
  } catch (err) {
    console.error("[profile-views] getSupplierHits failed:", err);
    return empty;
  }
}
