/**
 * BLS/FRED Price Index Scraper
 *
 * Uses the FRED (Federal Reserve Economic Data) free API to pull Producer Price
 * Indices for construction material categories.  No API key required for
 * public series; optionally set FRED_API_KEY for higher rate limits.
 *
 * Runs weekly (wired in server/_core/index.ts scheduler).
 * Stores results in `price_indices` table with YoY % change pre-computed.
 */

import { getDb } from "../db";
import { priceIndices, scraperRuns } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── FRED Series → GreenChainz category mapping ───────────────────────────────
// PPI series IDs from FRED (all public, no key needed up to 120 req/min)
// https://fred.stlouisfed.org/categories/32455  (PPI Construction)
const SERIES: Array<{
  seriesId: string;
  seriesName: string;
  category: string;
}> = [
  // Concrete / Cement
  { seriesId: "PCU32733273",  seriesName: "PPI: Concrete Block & Brick",           category: "Concrete" },
  { seriesId: "PCU32731327",  seriesName: "PPI: Ready-Mix Concrete",                category: "Concrete" },
  // Steel
  { seriesId: "PCU331110331110", seriesName: "PPI: Steel Mills",                   category: "Steel" },
  { seriesId: "WPU101707",    seriesName: "PPI: Structural Steel (WPU)",            category: "Steel" },
  // Wood / Timber
  { seriesId: "WPU081",       seriesName: "PPI: Lumber & Wood Products",            category: "Mass Timber" },
  { seriesId: "PCU3219932199", seriesName: "PPI: Millwork",                         category: "Mass Timber" },
  // Insulation
  { seriesId: "PCU32993299",  seriesName: "PPI: Mineral Wool Products",             category: "Insulation" },
  // Glazing / Glass
  { seriesId: "PCU32721327", seriesName: "PPI: Flat Glass",                         category: "Glazing / Curtain Wall" },
  // Aluminum / Cladding
  { seriesId: "WPU102501",    seriesName: "PPI: Aluminum Mill Shapes",              category: "Cladding / Facades" },
  // Gypsum
  { seriesId: "PCU32742327", seriesName: "PPI: Gypsum Products",                   category: "Gypsum / Interior" },
  // Roofing
  { seriesId: "PCU32411324",  seriesName: "PPI: Asphalt Roofing Materials",        category: "Roofing" },
];

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FredObservation {
  date: string;   // "2025-11-01"
  value: string;  // "." means missing
}

interface FredResponse {
  observations: FredObservation[];
}

async function fetchSeries(seriesId: string): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY || ""; // empty = anonymous (120 req/min)
  const params = new URLSearchParams({
    series_id: seriesId,
    observation_start: "2023-01-01",
    sort_order: "desc",
    limit: "24",                 // last 24 months
    file_type: "json",
    ...(apiKey ? { api_key: apiKey } : {}),
  });

  const url = `${FRED_BASE}?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "GreenChainz/1.0 (greenchainz.com; price-intelligence)" },
  });

  if (!res.ok) {
    throw new Error(`FRED API ${res.status} for ${seriesId}: ${await res.text()}`);
  }

  const data = (await res.json()) as FredResponse;
  return data.observations;
}

/** Compute YoY % change between two index values */
function yoyChange(current: number, priorYear: number): number | null {
  if (!priorYear || priorYear === 0) return null;
  return ((current - priorYear) / priorYear) * 100;
}

/** Parse a period string like "2025-11-01" → "2025-11" */
function toPeriod(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export async function runFredScraper(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, created: 0, updated: 0, error: "DB unavailable" };

  const startedAt = Date.now();

  // Log run start
  const [run] = await db.insert(scraperRuns).values({
    scraperName: "fred_price_indices",
    status: "running",
    startedAt: new Date(),
  }).returning({ id: scraperRuns.id });

  let created = 0;
  let updated = 0;
  let errorMessage: string | undefined;

  try {
    for (const series of SERIES) {
      try {
        const observations = await fetchSeries(series.seriesId);

        // Filter out missing values (".")
        const valid = observations
          .filter((o) => o.value !== "." && o.value !== "")
          .map((o) => ({ period: toPeriod(o.date), value: parseFloat(o.value) }));

        for (let i = 0; i < valid.length; i++) {
          const { period, value } = valid[i];

          // YoY: find observation ~12 months earlier
          const priorPeriod = `${parseInt(period.slice(0, 4)) - 1}-${period.slice(5, 7)}`;
          const priorObs = valid.find((o) => o.period === priorPeriod);
          const yoy = priorObs ? yoyChange(value, priorObs.value) : null;

          // Upsert: ON CONFLICT (series_id, period) → update value + yoy
          const existing = await db
            .select({ id: priceIndices.id })
            .from(priceIndices)
            .where(
              and(
                eq(priceIndices.seriesId, series.seriesId),
                eq(priceIndices.period, period)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(priceIndices)
              .set({
                value: String(value),
                yoyChangePct: yoy != null ? String(yoy.toFixed(4)) : null,
                scrapedAt: new Date(),
              })
              .where(eq(priceIndices.id, existing[0].id));
            updated++;
          } else {
            await db.insert(priceIndices).values({
              category: series.category,
              seriesId: series.seriesId,
              seriesName: series.seriesName,
              period,
              value: String(value),
              yoyChangePct: yoy != null ? String(yoy.toFixed(4)) : null,
              source: "FRED",
              scrapedAt: new Date(),
            });
            created++;
          }
        }

        // Polite delay between series (FRED rate limit: 120/min anonymous)
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error(`[FRED] Series ${series.seriesId} failed:`, err);
        // Continue with remaining series
      }
    }

    // Update run log
    await db
      .update(scraperRuns)
      .set({
        status: "success",
        recordsCreated: created,
        recordsUpdated: updated,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
      })
      .where(eq(scraperRuns.id, run.id));

    console.log(`[FRED] Done — ${created} created, ${updated} updated`);
    return { success: true, created, updated };
  } catch (err: any) {
    errorMessage = String(err?.message ?? err);
    await db
      .update(scraperRuns)
      .set({
        status: "error",
        errorMessage,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
      })
      .where(eq(scraperRuns.id, run.id));

    console.error("[FRED] Fatal error:", errorMessage);
    return { success: false, created, updated, error: errorMessage };
  }
}
