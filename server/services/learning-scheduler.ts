/**
 * Learning Pipeline Scheduler
 * ─────────────────────────────────────────────────────────────────────────────
 * Registers cron-like intervals on the Express server for learning jobs.
 * In production, these should ideally run as Azure Timer Functions for
 * better reliability, but this works for MVP and costs nothing extra.
 *
 * Schedule:
 *   - Nightly enrichment: every day at 2:00 AM UTC
 *   - Auto-discovery (EC3): every day at 3:00 AM UTC
 *   - Weekly synthesis: every Monday at 6:00 AM UTC
 */

import { runNightlyEnrichment, runWeeklySynthesis, runAutoDiscovery } from "./learning-pipeline";

let nightlyTimer: ReturnType<typeof setInterval> | null = null;
let weeklyTimer: ReturnType<typeof setInterval> | null = null;

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Start the learning scheduler. Call once at server boot.
 */
export function startLearningScheduler(): void {
  if (process.env.NODE_ENV !== "production") {
    console.log("[learning-scheduler] Skipping in non-production environment");
    return;
  }

  console.log("[learning-scheduler] Starting passive learning pipeline");

  // Nightly enrichment — run daily
  nightlyTimer = setInterval(async () => {
    const hour = new Date().getUTCHours();
    if (hour !== 2) return; // Only run at 2 AM UTC

    try {
      console.log("[learning-scheduler] Running nightly enrichment...");
      const report = await runNightlyEnrichment();
      console.log("[learning-scheduler] Nightly complete:", {
        embedded: report.materialsEmbedded,
        gaps: report.gapsIdentified.length,
        demandUpdated: report.demandScoresUpdated,
      });

      // Run auto-discovery after enrichment
      console.log("[learning-scheduler] Running EC3 auto-discovery...");
      const discovery = await runAutoDiscovery();
      console.log("[learning-scheduler] Discovery complete:", {
        found: discovery.discovered,
        imported: discovery.imported,
      });
    } catch (err) {
      console.error("[learning-scheduler] Nightly enrichment failed:", err);
    }
  }, ONE_HOUR); // Check every hour, only execute at 2 AM

  // Weekly synthesis — run on Mondays
  weeklyTimer = setInterval(async () => {
    const now = new Date();
    if (now.getUTCDay() !== 1 || now.getUTCHours() !== 6) return; // Monday 6 AM UTC

    try {
      console.log("[learning-scheduler] Running weekly synthesis...");
      const report = await runWeeklySynthesis();
      console.log("[learning-scheduler] Weekly synthesis complete. Score:", report.synthesis.weeklyScore);
      console.log("[learning-scheduler] Top recommendation:", report.synthesis.topRecommendation);
    } catch (err) {
      console.error("[learning-scheduler] Weekly synthesis failed:", err);
    }
  }, ONE_HOUR);

  console.log("[learning-scheduler] ✅ Scheduled: nightly at 2AM UTC, weekly Monday 6AM UTC");
}

/**
 * Stop the learning scheduler (for graceful shutdown).
 */
export function stopLearningScheduler(): void {
  if (nightlyTimer) clearInterval(nightlyTimer);
  if (weeklyTimer) clearInterval(weeklyTimer);
  nightlyTimer = null;
  weeklyTimer = null;
  console.log("[learning-scheduler] Stopped");
}
