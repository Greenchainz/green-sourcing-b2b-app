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
    const { fetchEC3EPDs } = await import('./ec3');
    const { transformEC3Batch } = await import('./ec3-transform');
    const { getDb } = await import('./db');
    const { materials } = await import('../drizzle/schema');
    const { inArray, eq } = await import('drizzle-orm');

    const EC3_SYNC_CATEGORIES = ['Concrete', 'Steel', 'Wood', 'Insulation', 'Glass', 'Aluminum', 'Masonry', 'Roofing'];

    const runEC3Sync = async () => {
      console.log('[EC3 Sync] Starting scheduled sync...');
      const db = await getDb();
      if (!db) { console.error('[EC3 Sync] No DB connection'); return; }

      let totalCreated = 0;
      let totalUpdated = 0;

      for (const category of EC3_SYNC_CATEGORIES) {
        try {
          const epds = await fetchEC3EPDs(category, 50);
          if (epds.length === 0) continue;

          const transformed = transformEC3Batch(epds);
          const ec3Ids = epds.map((e: any) => e.id).filter(Boolean);

          const existing = await db
            .select({ ec3Id: materials.ec3Id })
            .from(materials)
            .where(inArray(materials.ec3Id, ec3Ids));

          const existingSet = new Set(existing.map((m: any) => m.ec3Id));
          const toCreate = transformed.filter((m: any) => m.ec3Id && !existingSet.has(m.ec3Id));
          const toUpdate = transformed.filter((m: any) => m.ec3Id && existingSet.has(m.ec3Id));

          if (toCreate.length > 0) {
            await db.insert(materials).values(toCreate as any);
            totalCreated += toCreate.length;
          }
          for (const m of toUpdate as any[]) {
            await db.update(materials).set({ ...m, updatedAt: new Date() }).where(eq(materials.ec3Id, m.ec3Id!));
            totalUpdated++;
          }
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

  // ── EPD Sync Scheduler (Autodesk SDA) — first run: 3min, then hourly ──────
  setTimeout(async () => {
    try {
      const { startEpdSyncScheduler } = await import('./epd-sync-scheduler');
      startEpdSyncScheduler(60 * 60 * 1000);
    } catch (e) {
      console.error('[EPD Sync] Failed to start scheduler:', e);
    }
  }, 3 * 60 * 1000);

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
