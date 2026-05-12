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
            for (const m of toUpdate) {
              await db.update(materials).set({ ...m, updatedAt: new Date() }).where(eq(materials.ec3Id, m.ec3Id!));
              totalUpdated++;
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

  // ── EPD Sync Scheduler (Autodesk SDA) — DISABLED (SDA shut down April 2026) ─
  // SDA was decommissioned. The stub in autodesk-sda-service.ts returns empty
  // arrays / throws. Re-enable if a replacement EPD source is wired in.
  // To re-enable: uncomment the block below and set an appropriate interval.
  //
  // setTimeout(async () => {
  //   const { startEpdSyncScheduler } = await import('./epd-sync-scheduler');
  //   startEpdSyncScheduler(24 * 60 * 60 * 1000); // daily, not hourly
  // }, 3 * 60 * 1000);

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
