/**
 * Scheduled background jobs — called once from startServer() after the HTTP
 * server is listening.  Each job manages its own setTimeout/setInterval.
 */

async function runNotificationEmails(
  label: string,
  generator: () => Promise<Array<{ to: string; subject: string; html: string }>>
): Promise<void> {
  const { sendEmail } = await import('./email-service');
  const payloads = await generator();
  let sent = 0;
  for (const p of payloads) {
    const ok = await sendEmail({ to: p.to, subject: p.subject, html: p.html });
    if (ok) sent++;
  }
  if (payloads.length > 0) console.log(`[Notifications] ${label}: ${sent}/${payloads.length} sent`);
}

export async function startSchedulers(): Promise<void> {
  // ── EC3 sync — startup + every 24 hours ───────────────────────────────────
  if (process.env.EC3_API_KEY || (process.env.EC3_USERNAME && process.env.EC3_PASSWORD)) {
    const { fetchEC3EPDs, fetchEC3Categories } = await import('./ec3');
    const { transformEC3Batch } = await import('./ec3-transform');
    const { getDb } = await import('./db');
    const { materials } = await import('../drizzle/schema');
    const { inArray, eq } = await import('drizzle-orm');

    // Target category display names — used to match against EC3's real category IDs.
    // Do NOT derive from the materials table (contains KBOB German names).
    const EC3_SYNC_CATEGORIES = [
      'Concrete', 'Steel', 'Wood', 'Insulation', 'Glass', 'Aluminum',
      'Masonry', 'Roofing', 'Flooring', 'Gypsum', 'Copper', 'Timber',
    ];

    const PAGE_SIZE = 100; // EC3 max page size

    const runEC3Sync = async () => {
      console.log('[EC3 Sync] Starting scheduled sync...');
      const db = await getDb();
      if (!db) { console.error('[EC3 Sync] No DB connection'); return; }

      // Step 1: resolve EC3 category IDs so we filter by ID, not by free-text name.
      // EC3's ?category=<name> param is unreliable — the API expects a category UUID.
      const categoryIdMap = new Map<string, string>();
      try {
        const ec3Cats = await fetchEC3Categories();
        for (const cat of ec3Cats) {
          const display = (cat.display_name || cat.name || '').toLowerCase();
          for (const target of EC3_SYNC_CATEGORIES) {
            if (display.includes(target.toLowerCase()) || target.toLowerCase().includes(display)) {
              if (!categoryIdMap.has(target)) categoryIdMap.set(target, cat.id);
            }
          }
        }
        console.log(`[EC3 Sync] Resolved ${categoryIdMap.size}/${EC3_SYNC_CATEGORIES.length} category IDs from EC3`);
      } catch (err) {
        console.warn('[EC3 Sync] Could not fetch EC3 categories — falling back to name-based search:', err);
      }

      let totalCreated = 0;
      let totalUpdated = 0;

      // Step 2: paginate through every EPD for each category
      for (const category of EC3_SYNC_CATEGORIES) {
        try {
          // Prefer the resolved EC3 category ID; fall back to plain name
          const categoryParam = categoryIdMap.get(category) ?? category;
          let offset = 0;
          let pagesFetched = 0;

          while (true) {
            const epds = await fetchEC3EPDs(categoryParam, PAGE_SIZE, offset);
            if (epds.length === 0) break;
            pagesFetched++;

            const transformed = await transformEC3Batch(epds);
            const ec3Ids = epds.map((e) => e.id).filter(Boolean) as string[];

            const existing = await db
              .select({ ec3Id: materials.ec3Id })
              .from(materials)
              .where(inArray(materials.ec3Id, ec3Ids));

            const existingSet = new Set(existing.map((m) => m.ec3Id));
            const toCreate = transformed.filter((m) => m.ec3Id && !existingSet.has(m.ec3Id));
            const toUpdate = transformed.filter((m) => m.ec3Id && existingSet.has(m.ec3Id));

            if (toCreate.length > 0) {
              await db.insert(materials).values(
                toCreate as unknown as (typeof materials.$inferInsert)[]
              );
              totalCreated += toCreate.length;
            }
            if (toUpdate.length > 0) {
const UPDATE_CONCURRENCY = 5;
              for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
                const results = await Promise.allSettled(
                  toUpdate.slice(i, i + UPDATE_CONCURRENCY).map((m) =>
                    db.update(materials).set({ ...m, updatedAt: new Date() }).where(eq(materials.ec3Id, m.ec3Id!))
                  )
                );
                totalUpdated += results.filter((result) => result.status === 'fulfilled').length;
                const failure = results.find((result) => result.status === 'rejected');
                if (failure?.status === 'rejected') throw failure.reason;
              }
            }

            // Stop if we got a partial page (last page) or hit 2000 EPDs per category (safety cap)
            if (epds.length < PAGE_SIZE || offset >= 2000) break;
            offset += PAGE_SIZE;
          }

          if (pagesFetched > 0) console.log(`[EC3 Sync] ${category}: fetched ${pagesFetched} page(s) (offset reached ${offset})`);
        } catch (err) {
          console.error(`[EC3 Sync] Error syncing category "${category}":`, err);
        }
      }

      console.log(`[EC3 Sync] Done — created: ${totalCreated}, updated: ${totalUpdated}`);
    };

    setTimeout(() => runEC3Sync().catch(e => console.error('[EC3 Sync] Startup sync failed:', e)), 10_000);
    setInterval(() => runEC3Sync().catch(e => console.error('[EC3 Sync] Scheduled sync failed:', e)), 24 * 60 * 60 * 1000);
  } else {
    console.warn('[EC3 Sync] No credentials set — skipping sync. Set EC3_API_KEY in env.');
  }

  // ── FRED price index scraper — startup + weekly ────────────────────────────
  setTimeout(async () => {
    try {
      const { runFredScraper } = await import('./services/fred-scraper');
      console.log('[FRED] Running initial price index scrape...');
      await runFredScraper();
    } catch (e) {
      console.error('[FRED] Initial scrape failed:', e);
    }
  }, 30_000);

  setInterval(async () => {
    try {
      const { runFredScraper } = await import('./services/fred-scraper');
      await runFredScraper();
    } catch (e) {
      console.error('[FRED] Weekly scrape failed:', e);
    }
  }, 7 * 24 * 60 * 60 * 1000);

  // ── Outreach drip processor — startup + daily ─────────────────────────────
  setTimeout(async () => {
    try {
      const { processDueSequenceSteps } = await import('./services/outreach-email-service');
      await processDueSequenceSteps();
    } catch (e) {
      console.error('[Outreach] Daily drip failed:', e);
    }
  }, 60_000);

  setInterval(async () => {
    try {
      const { processDueSequenceSteps } = await import('./services/outreach-email-service');
      await processDueSequenceSteps();
    } catch (e) {
      console.error('[Outreach] Daily drip failed:', e);
    }
  }, 24 * 60 * 60 * 1000);

  // ── RFQ expiry/reminder scheduler — every 15 min ──────────────────────────
  const { startNotificationScheduler } = await import('./services/notification-scheduler');
  startNotificationScheduler();

  // ── Material score snapshot maintenance — startup + daily ──────────────────
  const runMaterialScoreMaintenance = async () => {
    try {
      const {
        markExpiredMaterialScoreCaches,
        cleanupOldMaterialScoreSnapshots,
      } = await import('./services/material-credit-score');
      const staleMarked = await markExpiredMaterialScoreCaches();
      const removed = await cleanupOldMaterialScoreSnapshots();
      if (staleMarked > 0 || removed > 0) {
        console.log(`[score-maintenance] stale marked=${staleMarked}, snapshots removed=${removed}`);
      }
    } catch (e) {
      console.error('[score-maintenance] run failed:', e);
    }
  };

  setTimeout(runMaterialScoreMaintenance, 120_000);
  setInterval(runMaterialScoreMaintenance, 24 * 60 * 60 * 1000);

  // ── Streak reminder emails — daily (first run: 90s after boot) ────────────
  async function runStreakReminders(): Promise<void> {
    try {
      const { findAtRiskStreaks } = await import('./services/notification-scheduler');
      await runNotificationEmails('Streak reminders', findAtRiskStreaks);
    } catch (e) {
      console.error('[Notifications] Streak reminder run failed:', e);
    }
  }

  setTimeout(runStreakReminders, 90_000);
  setInterval(runStreakReminders, 24 * 60 * 60 * 1000);

  // ── New-material alert emails — daily (first run: 2h after boot) ──────────
  async function runNewMaterialAlerts(): Promise<void> {
    try {
      const { findNewMaterialMatches } = await import('./services/notification-scheduler');
      await runNotificationEmails('New-material alerts', findNewMaterialMatches);
    } catch (e) {
      console.error('[Notifications] New-material alert run failed:', e);
    }
  }

  setTimeout(runNewMaterialAlerts, 2 * 60 * 60 * 1000);
  setInterval(runNewMaterialAlerts, 24 * 60 * 60 * 1000);

  // ── Weekly digest emails — every 7 days (no immediate run on startup) ─────
  setInterval(async () => {
    try {
      const { generateWeeklyDigests } = await import('./services/notification-scheduler');
      await runNotificationEmails('Weekly digests', generateWeeklyDigests);
    } catch (e) {
      console.error('[Notifications] Weekly digest run failed:', e);
    }
  }, 7 * 24 * 60 * 60 * 1000);

  // ── Supplier "profile hits" digest — first run: 3min, then weekly ─────────
  // Emails suppliers who had architect views in the last 7 days. Free tier gets
  // an upgrade CTA to unlock viewer identities; premium gets the firms inline.
  async function runHitsDigest(): Promise<void> {
    try {
      const { runSupplierHitsDigest } = await import('./services/supplier-hits-digest');
      await runSupplierHitsDigest();
    } catch (e) {
      console.error('[Hits Digest] run failed:', e);
    }
  }

  setTimeout(runHitsDigest, 3 * 60 * 1000);
  setInterval(runHitsDigest, 7 * 24 * 60 * 60 * 1000);

  // ── EPD data ────────────────────────────────────────────────────────────
  // Autodesk SDA was decommissioned April 2026 and its integration removed.
  // EPD data comes from EC3 (Building Transparency) — see seed-materials.ts
  // and the /api/admin/seed-materials endpoint above.

  // ── Supplier Scraper — first run: 5min, then weekly ───────────────────────
  setTimeout(async () => {
    try {
      const { runSupplierScraper } = await import('../lib/scrapers/supplier-scraper');
      console.log('[Supplier Scraper] Running initial scrape...');
      await runSupplierScraper();
    } catch (e) {
      console.error('[Supplier Scraper] Initial scrape failed:', e);
    }
  }, 5 * 60 * 1000);

  setInterval(async () => {
    try {
      const { runSupplierScraper } = await import('../lib/scrapers/supplier-scraper');
      await runSupplierScraper();
    } catch (e) {
      console.error('[Supplier Scraper] Weekly scrape failed:', e);
    }
  }, 7 * 24 * 60 * 60 * 1000);

  // ── Lead Scraper — first run: 7min, then weekly ───────────────────────────
  setTimeout(async () => {
    try {
      const { runLeadScraper } = await import('../lib/scrapers/lead-scraper');
      console.log('[Lead Scraper] Running initial decision-maker scrape...');
      await runLeadScraper();
    } catch (e) {
      console.error('[Lead Scraper] Initial scrape failed:', e);
    }
  }, 7 * 60 * 1000);

  setInterval(async () => {
    try {
      const { runLeadScraper } = await import('../lib/scrapers/lead-scraper');
      await runLeadScraper();
    } catch (e) {
      console.error('[Lead Scraper] Weekly scrape failed:', e);
    }
  }, 7 * 24 * 60 * 60 * 1000);
}
