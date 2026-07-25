/**
 * EC3 (Building Transparency) API service — openEPD-format layer.
 *
 * Wraps the lower-level `server/ec3.ts` client and returns results as
 * OpenEPD objects. Gracefully falls back to empty results when
 * EC3_API_KEY is missing so the app never hard-errors.
 *
 * API docs: https://openepd.buildingtransparency.org
 */

import type { OpenEPD } from "../../shared/types/openepd";
import type { EC3EPD } from "../ec3";
import { getDb } from "../db";
import { materials } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Helpers ──────────────────────────────────────────────────────────────────

function ec3Configured(): boolean {
  return !!(
    process.env.EC3_API_KEY ||
    (process.env.EC3_USERNAME && process.env.EC3_PASSWORD)
  );
}

/** Convert the raw EC3EPD shape returned by `server/ec3.ts` to our OpenEPD type. */
function ec3ToOpenEPD(epd: EC3EPD): OpenEPD {
  const gwpMatch = epd.gwp?.match(/^([\d.]+)\s*(.*)$/);
  const gwpMean = gwpMatch ? parseFloat(gwpMatch[1]) : 0;
  const gwpUnit = gwpMatch?.[2]?.trim() || "kgCO2e";

  return {
    id: epd.open_xpd_uuid || epd.id,
    name: epd.name || `${epd.category?.display_name ?? "Material"} — ${epd.manufacturer?.name ?? "Unknown"}`,
    manufacturer: {
      name: epd.manufacturer?.name || "Unknown",
      country: epd.plant?.country || undefined,
    },
    program_operator: { name: "Building Transparency (EC3)" },
    epd_url: epd.doc || undefined,
    date_of_issue: epd.date_of_issue || undefined,
    valid_until: epd.date_validity_ends || undefined,
    declared_unit: epd.declared_unit || epd.category?.declared_unit || "unknown",
    impacts: {
      gwp: gwpMean > 0 ? { mean: gwpMean, unit: gwpUnit } : undefined,
    },
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Search EC3 for materials and return OpenEPD-formatted results.
 * Returns `[]` if credentials are missing.
 */
export async function searchEC3Materials(
  query: string,
  category?: string,
  limit = 20,
): Promise<OpenEPD[]> {
  if (!ec3Configured()) {
    console.warn("[ec3-service] EC3_API_KEY not set — returning empty results");
    return [];
  }

  try {
    // Dynamic import to avoid blowing up at module-load time when env is unset
    const { searchEC3EPDs, fetchEC3EPDs } = await import("../ec3");

    let raw: EC3EPD[];
    if (query) {
      raw = await searchEC3EPDs(query, limit);
    } else if (category) {
      raw = await fetchEC3EPDs(category, limit);
    } else {
      raw = await searchEC3EPDs("*", limit);
    }

    return raw.map(ec3ToOpenEPD);
  } catch (err) {
    console.error("[ec3-service] Search failed:", err);
    return [];
  }
}

/**
 * Fetch a single EPD by its ID and return it in OpenEPD format.
 * Returns `null` if the EPD is not found or credentials are missing.
 */
export async function getEC3EPD(epdId: string): Promise<OpenEPD | null> {
  if (!ec3Configured()) {
    console.warn("[ec3-service] EC3_API_KEY not set — cannot fetch EPD");
    return null;
  }

  try {
    const { fetchEC3EPDById } = await import("../ec3");
    const raw = await fetchEC3EPDById(epdId);
    if (!raw) return null;
    return ec3ToOpenEPD(raw);
  } catch (err) {
    console.error("[ec3-service] Fetch EPD failed:", err);
    return null;
  }
}

/**
 * Bulk import materials from EC3 into the GreenChainz database.
 * Searches by category, converts to the internal schema, and upserts.
 * Returns the count of newly created materials.
 */
export async function importEC3Materials(
  category: string,
  limit = 100,
): Promise<number> {
  if (!ec3Configured()) {
    console.warn("[ec3-service] EC3_API_KEY not set — skipping import");
    return 0;
  }

  const db = await getDb();
  if (!db) {
    console.error("[ec3-service] Database unavailable");
    return 0;
  }

  try {
    const { fetchEC3EPDs } = await import("../ec3");
    const { transformEC3Batch } = await import("../ec3-transform");

    const raw = await fetchEC3EPDs(category, limit);
    if (raw.length === 0) return 0;

    const transformed = await transformEC3Batch(raw);
    let created = 0;

    for (const mat of transformed) {
      if (!mat.ec3Id) continue;

      // Check if already exists
      const existing = await db
        .select({ id: materials.id })
        .from(materials)
        .where(eq(materials.ec3Id, mat.ec3Id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(materials).values(mat as any);
        created++;
      } else {
        // Update existing record with fresh data
        await db
          .update(materials)
          .set({ ...mat, updatedAt: new Date() } as any)
          .where(eq(materials.ec3Id, mat.ec3Id));
      }
    }

    console.log(`[ec3-service] Imported ${created} new materials from EC3 (category: ${category})`);
    return created;
  } catch (err) {
    console.error("[ec3-service] Import failed:", err);
    return 0;
  }
}
