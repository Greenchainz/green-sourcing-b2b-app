/**
 * Architect Spec Matcher (the "Interceptor")
 *
 * Finds sustainable alternatives from the `materials` catalog for every
 * parsed assembly row in an architect's uploaded spec.
 *
 * Pipeline:
 *   Step 1: Load spec assembly rows
 *   Step 2: Map assembly type → material categories
 *   Step 3: Hard filter (lower embodied carbon than original)
 *   Step 4: Score each candidate with inline CCPS
 *   Step 5: Compute carbon delta % vs original spec
 */

import { getDb } from "../db";
import { architectSpecAssemblies } from "../../drizzle/schema-additions-mcs";
import { materials, manufacturers } from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getAssemblyMappingByType } from "./masterformat-mapping";

// ── CCPS inline scorer ───────────────────────────────────────────────────────

type Persona = "aor" | "leed_ap" | "gc_pm" | "spec_writer";

const PERSONA_WEIGHTS: Record<Persona, { carbon: number; compliance: number; cost: number; health: number }> = {
  aor:         { carbon: 0.35, compliance: 0.30, cost: 0.15, health: 0.20 },
  leed_ap:     { carbon: 0.40, compliance: 0.20, cost: 0.05, health: 0.35 },
  gc_pm:       { carbon: 0.15, compliance: 0.25, cost: 0.50, health: 0.10 },
  spec_writer: { carbon: 0.30, compliance: 0.35, cost: 0.10, health: 0.25 },
};

interface MaterialRow {
  id: number;
  name: string;
  productName: string | null;
  manufacturerName: string | null;
  category: string;
  embodiedCarbonPer1000sf: string | null;
  gwpValue: string | null;
  pricePerUnit: string | null;
  hasEpd: boolean | null;
  hasHpd: boolean | null;
  hasGreenguard: boolean | null;
  hasC2c: boolean | null;
  hasDeclare: boolean | null;
  meetsTitle24: boolean | null;
  meetsIecc: boolean | null;
  fireRating: string | null;
  astmStandards: string | null;
  onRedList: boolean | null;
  epdExpiry: Date | null;
}

function scoreMaterial(
  m: MaterialRow,
  baselineGwp: number,
  avgPrice: number,
  persona: Persona,
): { total: number; breakdown: { carbon: number; compliance: number; cost: number; health: number } } {
  const w = PERSONA_WEIGHTS[persona];

  // Carbon score (0-100): lower GWP vs baseline = higher score
  const gwp = m.embodiedCarbonPer1000sf != null
    ? parseFloat(m.embodiedCarbonPer1000sf)
    : (m.gwpValue != null ? parseFloat(m.gwpValue) : null);
  const carbon = gwp != null && baselineGwp > 0
    ? Math.max(0, Math.min(100, 50 + ((baselineGwp - gwp) / baselineGwp) * 50))
    : 50;

  // Compliance score (0-100): additive binary flags
  let compliance = 0;
  if (m.hasEpd && (!m.epdExpiry || m.epdExpiry > new Date())) compliance += 25;
  if (m.astmStandards && m.astmStandards.length > 0)            compliance += 25;
  if (m.meetsTitle24)                                            compliance += 15;
  if (m.meetsIecc)                                               compliance += 15;
  if (m.fireRating && m.fireRating.length > 0)                   compliance += 10;
  if (m.hasGreenguard)                                           compliance += 10;
  compliance = Math.min(100, compliance);

  // Cost score (0-100): lower price = higher score
  const price = m.pricePerUnit != null ? parseFloat(m.pricePerUnit) : null;
  const cost = price != null && avgPrice > 0
    ? Math.max(0, Math.min(100, 50 + ((avgPrice - price) / avgPrice) * 50))
    : 50;

  // Health score (0-100): additive material health flags
  let health = 0;
  if (m.hasGreenguard)            health += 30;
  if (!m.onRedList)               health += 25;
  if (m.hasHpd)                   health += 20;
  if (m.hasC2c)                   health += 15;
  if (m.hasDeclare)               health += 10;
  health = Math.min(100, health);

  const total = Math.round(
    w.carbon * carbon +
    w.compliance * compliance +
    w.cost * cost +
    w.health * health,
  );

  return { total, breakdown: { carbon, compliance, cost, health } };
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface MatchedAlternative {
  rank: number;
  epdMaterialId: number;         // maps to materials.id
  productName: string;
  manufacturerName: string | null;
  assemblyType: string | null;   // material category
  structuralOption: number | null;
  gwpPer1000sf: number | null;
  carbonDeltaPct: number | null; // negative = savings vs original
  gcs: number;
  sustainabilityScore: number;
  performanceScore: number;
}

export interface MatchResultForRow {
  specAssemblyId: number;
  originalAssemblyCode: string | null;
  masterformatSection: string | null;
  originalGwpPer1000sf: number | null;
  alternatives: MatchedAlternative[];
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function matchSpecAlternatives(
  specId: number,
  opts: {
    topN?: number;
    persona?: "aor" | "leed_ap" | "gc_pm" | "spec_writer" | "interior_designer";
  } = {},
): Promise<MatchResultForRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const topN = opts.topN ?? 5;
  const persona: Persona = opts.persona === "interior_designer" ? "spec_writer"
    : (opts.persona ?? "aor") as Persona;

  const rows = await db
    .select()
    .from(architectSpecAssemblies)
    .where(eq(architectSpecAssemblies.specId, specId));

  const results: MatchResultForRow[] = [];

  for (const row of rows) {
    const original = row.gwpPer1000sf == null ? null : parseFloat(row.gwpPer1000sf);

    // Map assembly type to material categories
    const assemblyMapping = getAssemblyMappingByType(row.assemblyType);
    const targetCategories: string[] = assemblyMapping?.categories ?? [];

    // Build category filter
    const categoryFilter = targetCategories.length > 0
      ? inArray(materials.category, targetCategories)
      : sql`true`;

    // Hard filter: only pull materials with lower carbon (or no carbon data)
    const carbonFilter = original != null
      ? sql`(${materials.embodiedCarbonPer1000sf} IS NULL OR CAST(${materials.embodiedCarbonPer1000sf} AS NUMERIC) < ${original})`
      : sql`true`;

    const candidates = await db
      .select({
        id: materials.id,
        name: materials.name,
        productName: materials.productName,
        manufacturerName: manufacturers.name,
        category: materials.category,
        embodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
        gwpValue: materials.gwpValue,
        pricePerUnit: materials.pricePerUnit,
        hasEpd: materials.hasEpd,
        hasHpd: materials.hasHpd,
        hasGreenguard: materials.hasGreenguard,
        hasC2c: materials.hasC2c,
        hasDeclare: materials.hasDeclare,
        meetsTitle24: materials.meetsTitle24,
        meetsIecc: materials.meetsIecc,
        fireRating: materials.fireRating,
        astmStandards: materials.astmStandards,
        onRedList: materials.onRedList,
        epdExpiry: materials.epdExpiry,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(and(categoryFilter, carbonFilter))
      .limit(200); // cap for performance

    // Compute category baseline GWP (median of candidates with carbon data)
    const gwpValues = candidates
      .map((c) => c.embodiedCarbonPer1000sf != null ? parseFloat(c.embodiedCarbonPer1000sf) : null)
      .filter((v): v is number => v != null);
    const baselineGwp = gwpValues.length > 0
      ? gwpValues.sort((a, b) => a - b)[Math.floor(gwpValues.length / 2)]
      : (original ?? 10000);

    // Average price for cost scoring
    const prices = candidates
      .map((c) => c.pricePerUnit != null ? parseFloat(c.pricePerUnit) : null)
      .filter((v): v is number => v != null);
    const avgPrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 100;

    // Score + rank
    const scored = candidates
      .map((c) => ({ candidate: c, score: scoreMaterial(c as MaterialRow, baselineGwp, avgPrice, persona) }))
      .sort((a, b) => b.score.total - a.score.total);

    const alternatives: MatchedAlternative[] = scored.slice(0, topN).map((s, idx) => {
      const altGwp = s.candidate.embodiedCarbonPer1000sf != null
        ? parseFloat(s.candidate.embodiedCarbonPer1000sf)
        : (s.candidate.gwpValue != null ? parseFloat(s.candidate.gwpValue) : null);

      const carbonDeltaPct =
        original != null && altGwp != null && original > 0
          ? ((altGwp - original) / original) * 100
          : null;

      const { carbon, compliance, cost, health } = s.score.breakdown;

      return {
        rank: idx + 1,
        epdMaterialId: s.candidate.id,
        productName: s.candidate.productName ?? s.candidate.name,
        manufacturerName: s.candidate.manufacturerName ?? null,
        assemblyType: s.candidate.category,
        structuralOption: null,
        gwpPer1000sf: altGwp,
        carbonDeltaPct,
        gcs: s.score.total,
        sustainabilityScore: Math.round(carbon + compliance),
        performanceScore: Math.round(cost + health),
      };
    });

    // Persist top match back to the spec row
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
      masterformatSection: row.masterformatSection ?? assemblyMapping?.masterformatSection ?? null,
      originalGwpPer1000sf: original,
      alternatives,
    });
  }

  return results;
}
