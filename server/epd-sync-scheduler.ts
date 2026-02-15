/**
 * EPD Sync Scheduler
 * 
 * Periodically syncs Autodesk EPD data into the materials table.
 * Runs on a configurable interval (default: hourly).
 * 
 * This service:
 * 1. Searches Autodesk for popular building materials
 * 2. Fetches detailed EPD data for each material
 * 3. Upserts into materials table
 * 4. Tracks sync status and errors
 */

import { getDb } from './db';
import { materials } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { searchEpds, getEpdDetail } from './autodesk-sda-service';

interface SyncStatus {
  lastSync: Date;
  nextSync: Date;
  materialsAdded: number;
  materialsUpdated: number;
  errors: string[];
  status: 'idle' | 'running' | 'error';
}

let syncStatus: SyncStatus = {
  lastSync: new Date(0),
  nextSync: new Date(),
  materialsAdded: 0,
  materialsUpdated: 0,
  errors: [],
  status: 'idle',
};

// Popular building materials to sync
const MATERIAL_QUERIES = [
  'concrete',
  'steel',
  'aluminum',
  'wood',
  'glass',
  'insulation',
  'drywall',
  'roofing',
  'flooring',
  'brick',
  'stone',
  'copper',
  'plumbing',
  'electrical',
];

/**
 * Sync EPD data from Autodesk to materials table
 */
export async function syncEpdData(): Promise<SyncStatus> {
  if (syncStatus.status === 'running') {
    console.log('[EPD Sync] Already running, skipping');
    return syncStatus;
  }

  syncStatus.status = 'running';
  syncStatus.errors = [];
  syncStatus.materialsAdded = 0;
  syncStatus.materialsUpdated = 0;

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    console.log('[EPD Sync] Starting sync at', new Date().toISOString());

    for (const query of MATERIAL_QUERIES) {
      try {
        console.log('[EPD Sync] Searching for:', query);
        const results = await searchEpds(query, undefined, 5);

        for (const result of results) {
          try {
            // Fetch detailed EPD data
            const detail = await getEpdDetail(result.id);
            if (!detail) continue;

            // Check if material already exists by EPD number
            const existing = await db
              .select()
              .from(materials)
              .where(eq(materials.epdNumber, detail.id))
              .limit(1);

            const materialData = {
              name: detail.name,
              category: detail.category,
              description: detail.description,
              epdNumber: detail.id,
              gwpValue: detail.gwp.toString(),
              gwpUnit: 'kg CO2-eq',
              hasEpd: 1,
              vocCertification: detail.certifications.join(','),
            };

            if (existing.length > 0) {
              // Update existing material
              await db
                .update(materials)
                .set(materialData)
                .where(eq(materials.epdNumber, detail.id));
              syncStatus.materialsUpdated++;
              console.log('[EPD Sync] Updated:', detail.name);
            } else {
              // Insert new material
              await db.insert(materials).values(materialData);
              syncStatus.materialsAdded++;
              console.log('[EPD Sync] Added:', detail.name);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            syncStatus.errors.push(`Error syncing ${result.name}: ${msg}`);
            console.error('[EPD Sync] Error syncing material:', msg);
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        syncStatus.errors.push(`Error searching for ${query}: ${msg}`);
        console.error('[EPD Sync] Search error:', msg);
      }

      // Rate limit: wait 500ms between searches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    syncStatus.lastSync = new Date();
    syncStatus.nextSync = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    syncStatus.status = 'idle';

    console.log('[EPD Sync] Completed:', {
      added: syncStatus.materialsAdded,
      updated: syncStatus.materialsUpdated,
      errors: syncStatus.errors.length,
    });

    return syncStatus;
  } catch (error) {
    syncStatus.status = 'error';
    const msg = error instanceof Error ? error.message : String(error);
    syncStatus.errors.push(`Sync failed: ${msg}`);
    console.error('[EPD Sync] Fatal error:', msg);
    return syncStatus;
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

/**
 * Start periodic EPD sync (runs every hour)
 */
export function startEpdSyncScheduler(intervalMs: number = 60 * 60 * 1000): ReturnType<typeof setInterval> {
  console.log('[EPD Sync] Scheduler started, interval:', intervalMs / 1000 / 60, 'minutes');

  // Run immediately on startup
  syncEpdData().catch(err => console.error('[EPD Sync] Initial sync error:', err));

  // Then run on interval
  return setInterval(() => {
    syncEpdData().catch(err => console.error('[EPD Sync] Scheduled sync error:', err));
  }, intervalMs);
}

/**
 * Stop the EPD sync scheduler
 */
export function stopEpdSyncScheduler(timer: ReturnType<typeof setInterval>): void {
  clearInterval(timer);
  console.log('[EPD Sync] Scheduler stopped');
}
