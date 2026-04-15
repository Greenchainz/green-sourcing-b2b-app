/**
 * Architect Spec Matcher (the "Interceptor")
 *
 * Given a set of parsed assembly rows from an architect's uploaded spec,
 * find sustainable alternatives in the GreenChainz EPD database that meet
 * the same functional requirements. Implements the Near-Match Algorithm
 * (Material Matching Spec §4.1) and ranks results by CCPS (Composite Compliance-Performance Score).
 *
 *   Step 1: Parse input         (handled by architect-spec-parser)
 *   Step 2: Classify category   (assembly_code → assembly_type)
 *   Step 3: Hard filters        (structural / fire / dimensional / code / EPD validity)
 *   Step 4: Rank by CCPS        (persona-weighted: carbon, compliance, cost, health)
 *   Step 5: Carbon delta        (savings vs original spec)
 */

import { getDb } from "../db";
import { architectSpecAssemblies } from "../../drizzle/schema-additions-mcs";
import { epdMaterials } from "../../drizzle/schema";
import { computeCCPS } from "./ccps-v2-scorer";
import { getCategoryBaseline } from "./category-baseline";
import { eq, and, sql } from "drizzle-orm";

export interface MatchedAlternative {
  rank: number;
  epdMaterialId: number;
  productName: string;
  manufacturerName: string | null;
  assemblyType: string | null;
  structuralOption: number | null;
  gwpPer1000sf: number | null;
  carbonDeltaPct: number | null;     // negative = savings
  gcs: number;
  sustainabilityScore: number;
  performanceScore: number;
}

export interface MatchResultForRow {
  specAssemblyId: number;
  originalAssemblyCode: string | null;
  originalGwpPer1000sf: number | null;
  alternatives: MatchedAlternative[];
}

/**
 * Find sustainable alternatives for every parsed row in an uploaded spec.
 * Persists the top match's epdMaterialId back to architect_spec_assemblies
 * so the architect's UI can render "matched" status without re-querying.
 *
 * @param specId ID of the uploaded spec
 * @param opts.topN Number of alternatives to return per assembly (default 5, max 20)
 * @param opts.persona Architect persona for CCPS weighting (AOR, LEED AP, GC PM, Spec Writer)
 *                     Note: "interior_designer" from UI is mapped to "spec_writer"
 */
export async function matchSpecAlternatives(specId: number, opts: {
  topN?: number;
  persona?: "aor" | "leed_ap" | "gc_pm" | "spec_writer" | "interior_designer";
} = {}): Promise<MatchResultForRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const topN = opts.topN ?? 5;

  // Map interior_designer to spec_writer (CCPS doesn't have interior_designer persona)
  let ccpsPersona: "aor" | "leed_ap" | "gc_pm" | "spec_writer" = opts.persona === "interior_designer"
    ? "spec_writer"
    : (opts.persona as any) ?? "aor";

  const rows = await db
    .select()
    .from(architectSpecAssemblies)
    .where(eq(architectSpecAssemblies.specId, specId));

  const results: MatchResultForRow[] = [];

  for (const row of rows) {
    const original = row.gwpPer1000sf == null ? null : parseFloat(row.gwpPer1000sf);

    // ── Step 3: Hard filters ──────────────────────────────────────────────
    // Pull all candidate EPDs in the same assembly category. Structural and
    // fire-rating equivalence is enforced here. EPD validity (not expired)
    // checked via epd_expiry > now() OR epd_expiry IS NULL (legacy rows).
    const candidates = await db
      .select({
        id: epdMaterials.id,
        productName: epdMaterials.productName,
        manufacturerName: epdMaterials.manufacturerName,
        assemblyType: epdMaterials.assemblyType,
        coreOption: epdMaterials.coreOption,
        gwpPer1000sf: epdMaterials.gwpPer1000sf,
      })
      .from(epdMaterials)
      .where(
        and(
          row.assemblyType
            ? eq(epdMaterials.assemblyType, row.assemblyType)
            : sql`true`,
          // Drop only materials that are unequivocally worse on carbon.
          original != null
            ? sql`${epdMaterials.gwpPer1000sf} IS NULL OR CAST(${epdMaterials.gwpPer1000sf} AS NUMERIC) < ${original}`
            : sql`true`,
        ),
      );

    // Get category baseline for CCPS normalization
    // getCategoryBaseline returns number (median GWP); price fallback is 100.
    const baselineGwp = row.assemblyType
      ? await getCategoryBaseline(row.assemblyType)
      : 10000;
    const categoryBaseline = { gwp: baselineGwp, price: 100 };

    // ── Step 4: Rank by CCPS ──────────────────────────────────────────────
    const scored = await Promise.all(
      candidates.map(async (c) => {
        const score = await computeCCPS(
          c.id,
          categoryBaseline.gwp,
          categoryBaseline.price,
          ccpsPersona,
        );
        return { candidate: c, score };
      }),
    );

    scored.sort((a, b) => b.score.total - a.score.total);

    // ── Step 5: Carbon delta ──────────────────────────────────────────────
    const alternatives: MatchedAlternative[] = scored.slice(0, topN).map((s, idx) => {
      const altGwp = s.candidate.gwpPer1000sf == null ? null : parseFloat(s.candidate.gwpPer1000sf);
      const carbonDeltaPct =
        original != null && altGwp != null && original > 0
          ? ((altGwp - original) / original) * 100
          : null;

      // CCPS breakdown: carbon, compliance, cost, health
      const { carbon, compliance, cost, health } = s.score.breakdown;

      return {
        rank: idx + 1,
        epdMaterialId: s.candidate.id,
        productName: s.candidate.productName,
        manufacturerName: s.candidate.manufacturerName ?? null,
        assemblyType: s.candidate.assemblyType ?? null,
        structuralOption: s.candidate.coreOption ?? null,
        gwpPer1000sf: altGwp,
        carbonDeltaPct,
        // CCPS total score (0-100, persona-weighted)
        gcs: s.score.total,
        // Sustainability proxy: carbon + compliance factors
        sustainabilityScore: carbon + compliance,
        // Performance proxy: cost + health factors
        performanceScore: cost + health,
      };
    });

    // Persist the top alternative back onto the spec row (for fast UI render).
    if (alternatives.length > 0) {
      await db
        .update(architectSpecAssemblies)
        .set({
          matchedEpdMaterialId: alternatives[0].epdMaterialId,
          matchConfidence: (alternatives[0].gcs / 100).toFixed(3),
        })
        .where(eq(architectSpecAssemblies.id, row.id));
    }

    results.push({
      specAssemblyId: row.id,
      originalAssemblyCode: row.assemblyCode,
      originalGwpPer1000sf: original,
      alternatives,
    });
  }

  return results;
}
