/**
 * Material Credit Score Service
 *
 * Scores each epd_materials row on a 0-100 scale across four weighted
 * dimensions:
 *   Carbon efficiency        40 pts
 *   EPD verification         20 pts
 *   Manufacturer transparency 20 pts
 *   Assembly options coverage 20 pts
 */

import { getDb } from "../db";
import {
  epdMaterials,
  suppliers,
  materialCreditScoreCache,
  materialCreditScoreSnapshots,
} from "../../drizzle/schema";
import { eq, and, isNull, lte, lt } from "drizzle-orm";
import { createHash } from "node:crypto";
import { SCORE_POLICY, evaluateEpdValidity, type EpdValidityStatus } from "./epd-validity-policy";

// ─── Benchmarks ───────────────────────────────────────────────────────────────

const BENCHMARKS: Record<
  string,
  { baseline: number; bestInClass: number }
> = {
  unitized_curtain_wall: { baseline: 20597, bestInClass: 4323 },
  stone_panel: { baseline: 13000, bestInClass: 5169 },
};

/** Derive a benchmark key from an assembly type string. */
function benchmarkKey(assemblyType: string | null | undefined): string {
  const t = (assemblyType ?? "").toLowerCase();
  if (t.includes("ews") || t.includes("curtain") || t.includes("unitized")) {
    return "unitized_curtain_wall";
  }
  return "stone_panel";
}

// ─── EPD number format heuristic ─────────────────────────────────────────────

const EPD_REGISTRY_PATTERN =
  /^(EPD-[A-Z]{2,6}-\d+|[A-Z]{2,4}-\d{4,}-\w+|\d{5,}-EPD|\w+-EPD-\d+)$/i;

function verifyEpdFormat(epdNumber: string | null | undefined): "verified" | "unverified" | "none" {
  if (!epdNumber) return "none";
  return EPD_REGISTRY_PATTERN.test(epdNumber.trim()) ? "verified" : "unverified";
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  carbonEfficiency: number;
  epdVerification: number;
  manufacturerTransparency: number;
  assemblyOptionsCoverage: number;
}

export interface MaterialCreditScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
}

export type ScoreCacheState = "hit_valid" | "miss" | "stale_recomputed";
export type ScoreStaleReason =
  | "cache_miss"
  | "cache_expired"
  | "rules_version_changed"
  | "input_changed"
  | "epd_invalid";

export interface CachedScoreStateInput {
  cached:
    | {
        rulesVersion: string;
        inputFingerprint: string;
        expiresAt: Date;
      }
    | null
    | undefined;
  expectedRulesVersion: string;
  expectedInputFingerprint: string;
  now: Date;
  epdUsableForScoring: boolean;
}

export interface MaterialCreditScoreValidity {
  cacheState: ScoreCacheState;
  isStale: boolean;
  staleReason: ScoreStaleReason | null;
  blocked: boolean;
  blockedReason: string | null;
  rulesVersion: string;
  inputFingerprint: string;
  epdValidityStatus: EpdValidityStatus;
  epdDaysUntilExpiry: number | null;
  computedAt: string;
  expiresAt: string;
}

export interface MaterialCreditScoreResponse extends MaterialCreditScoreResult {
  validity: MaterialCreditScoreValidity;
}

export function determineScoreStaleReason(input: CachedScoreStateInput): ScoreStaleReason | null {
  if (!input.epdUsableForScoring) return "epd_invalid";
  if (!input.cached) return "cache_miss";
  if (input.cached.rulesVersion !== input.expectedRulesVersion) return "rules_version_changed";
  if (input.cached.inputFingerprint !== input.expectedInputFingerprint) return "input_changed";
  if (input.cached.expiresAt <= input.now) return "cache_expired";
  return null;
}

/**
 * Compute carbon-efficiency score (0–40) for a single gwpPer1000sf value.
 */
function scoreCarbonEfficiency(
  gwpPer1000sf: number | null | undefined,
  assemblyType: string | null | undefined
): number {
  if (gwpPer1000sf == null) return 0;
  const gwp = typeof gwpPer1000sf === "string" ? parseFloat(gwpPer1000sf) : gwpPer1000sf;
  if (isNaN(gwp)) return 0;

  const key = benchmarkKey(assemblyType);
  const { baseline, bestInClass } = BENCHMARKS[key];

  if (gwp <= bestInClass) return 40;
  if (gwp >= baseline) return 0;

  // Linear interpolation: lower GWP → higher score
  const fraction = (baseline - gwp) / (baseline - bestInClass);
  return Math.round(fraction * 40);
}

/**
 * Score EPD verification (0 | 10 | 20).
 */
function scoreEpdVerification(epdNumber: string | null | undefined): number {
  switch (verifyEpdFormat(epdNumber)) {
    case "verified":   return 20;
    case "unverified": return 10;
    case "none":       return 0;
  }
}

/**
 * Score manufacturer transparency (0 | 10 | 20) based on supplier profile
 * completeness. Requires the supplier record to be passed in.
 */
function scoreManufacturerTransparency(
  supplierRow: { companyName: string | null; website: string | null; description: string | null; contactName: string | null } | null
): number {
  if (!supplierRow) return 0;

  const filledFields = [
    supplierRow.companyName,
    supplierRow.website,
    supplierRow.description,
    supplierRow.contactName,
  ].filter(Boolean).length;

  if (filledFields >= 4) return 20;
  if (filledFields >= 2) return 10;
  return 0;
}

/**
 * Score assembly options coverage (0 | 6 | 13 | 20) based on how many of the
 * 3 core options (1, 2, 3) are represented across *all* rows for this
 * assembly type from the supplier.
 */
function scoreAssemblyOptions(coveredOptions: Set<number>): number {
  if (coveredOptions.size >= 3) return 20;
  if (coveredOptions.size === 2) return 13;
  if (coveredOptions.size === 1) return 6;
  return 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyScore(): MaterialCreditScoreResult {
  return { total: 0, breakdown: { carbonEfficiency: 0, epdVerification: 0, manufacturerTransparency: 0, assemblyOptionsCoverage: 0 } };
}

function normalizeDecimal(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInputFingerprint(input: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

async function loadMaterialScoreInputs(epdId: number) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(epdMaterials)
    .where(eq(epdMaterials.id, epdId))
    .limit(1);
  if (!row) return null;

  const [supplierRow] = await db
    .select({
      companyName: suppliers.companyName,
      website: suppliers.website,
      description: suppliers.description,
      contactName: suppliers.contactName,
    })
    .from(suppliers)
    .where(eq(suppliers.id, row.supplierId))
    .limit(1);

  let coveredOptions = new Set<number>();
  if (row.assemblyType) {
    const siblings = await db
      .select({ coreOption: epdMaterials.coreOption })
      .from(epdMaterials)
      .where(and(eq(epdMaterials.assemblyType, row.assemblyType), eq(epdMaterials.supplierId, row.supplierId)));
    for (const s of siblings) {
      if (s.coreOption != null) coveredOptions.add(s.coreOption);
    }
  } else if (row.coreOption != null) {
    coveredOptions = new Set([row.coreOption]);
  }

  const scoreInputRecord: Record<string, unknown> = {
    epdId: row.id,
    assemblyType: row.assemblyType ?? null,
    coreOption: row.coreOption ?? null,
    supplierId: row.supplierId,
    gwpPer1000sf: normalizeDecimal(row.gwpPer1000sf),
    epdNumber: row.epdNumber ?? null,
    epdExpiry: row.epdExpiry ?? null,
    supplierProfile: supplierRow ?? null,
    coveredOptions: [...coveredOptions].sort((a, b) => a - b),
  };

  return {
    db,
    row,
    supplierRow: supplierRow ?? null,
    coveredOptions,
    scoreInputRecord,
    inputFingerprint: buildInputFingerprint(scoreInputRecord),
    epdValidity: evaluateEpdValidity(row.epdExpiry),
  };
}

async function persistScoreArtifacts(args: {
  epdId: number;
  result: MaterialCreditScoreResult;
  rulesVersion: string;
  inputFingerprint: string;
  epdValidityStatus: EpdValidityStatus;
  staleReason: ScoreStaleReason | null;
  computedAt: Date;
  expiresAt: Date;
  inputs: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .insert(materialCreditScoreCache)
    .values({
      epdId: args.epdId,
      total: args.result.total,
      carbonEfficiency: args.result.breakdown.carbonEfficiency,
      epdVerification: args.result.breakdown.epdVerification,
      manufacturerTransparency: args.result.breakdown.manufacturerTransparency,
      assemblyOptionsCoverage: args.result.breakdown.assemblyOptionsCoverage,
      rulesVersion: args.rulesVersion,
      inputFingerprint: args.inputFingerprint,
      epdValidityStatus: args.epdValidityStatus,
      staleReason: args.staleReason,
      computedAt: args.computedAt,
      expiresAt: args.expiresAt,
    })
    .onConflictDoUpdate({
      target: materialCreditScoreCache.epdId,
      set: {
        total: args.result.total,
        carbonEfficiency: args.result.breakdown.carbonEfficiency,
        epdVerification: args.result.breakdown.epdVerification,
        manufacturerTransparency: args.result.breakdown.manufacturerTransparency,
        assemblyOptionsCoverage: args.result.breakdown.assemblyOptionsCoverage,
        rulesVersion: args.rulesVersion,
        inputFingerprint: args.inputFingerprint,
        epdValidityStatus: args.epdValidityStatus,
        staleReason: args.staleReason,
        computedAt: args.computedAt,
        expiresAt: args.expiresAt,
      },
    });

  await db.insert(materialCreditScoreSnapshots).values({
    epdId: args.epdId,
    total: args.result.total,
    carbonEfficiency: args.result.breakdown.carbonEfficiency,
    epdVerification: args.result.breakdown.epdVerification,
    manufacturerTransparency: args.result.breakdown.manufacturerTransparency,
    assemblyOptionsCoverage: args.result.breakdown.assemblyOptionsCoverage,
    rulesVersion: args.rulesVersion,
    inputFingerprint: args.inputFingerprint,
    epdValidityStatus: args.epdValidityStatus,
    staleReason: args.staleReason,
    inputs: args.inputs,
    computedAt: args.computedAt,
    expiresAt: args.expiresAt,
  });
}

function blockedScoreResponse(
  staleReason: ScoreStaleReason,
  inputFingerprint: string,
  epdValidityStatus: EpdValidityStatus,
  epdDaysUntilExpiry: number | null,
  computedAt: Date,
  expiresAt: Date
): MaterialCreditScoreResponse {
  return {
    ...emptyScore(),
    validity: {
      cacheState: "stale_recomputed",
      isStale: true,
      staleReason,
      blocked: true,
      blockedReason: "EPD is missing or expired under server-side score policy.",
      rulesVersion: SCORE_POLICY.rulesVersion,
      inputFingerprint,
      epdValidityStatus,
      epdDaysUntilExpiry,
      computedAt: computedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the Material Credit Score for a single epd_materials row.
 * Cache-first: returns the pre-computed score if available, otherwise
 * computes live and writes the result to cache asynchronously.
 */
export async function compute(
  epdId: number
): Promise<MaterialCreditScoreResponse> {
  const loaded = await loadMaterialScoreInputs(epdId);
  if (!loaded) {
    return {
      ...emptyScore(),
      validity: {
        cacheState: "miss",
        isStale: true,
        staleReason: "cache_miss",
        blocked: true,
        blockedReason: "Material not found for score computation.",
        rulesVersion: SCORE_POLICY.rulesVersion,
        inputFingerprint: "",
        epdValidityStatus: "missing",
        epdDaysUntilExpiry: null,
        computedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      },
    };
  }

  const { db, row, supplierRow, coveredOptions, inputFingerprint, scoreInputRecord, epdValidity } = loaded;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SCORE_POLICY.cacheTtlHours * 60 * 60 * 1000);

  const [cached] = await db
    .select()
    .from(materialCreditScoreCache)
    .where(eq(materialCreditScoreCache.epdId, epdId))
    .limit(1);

  if (cached) {
    const staleReason = determineScoreStaleReason({
      cached: {
        rulesVersion: cached.rulesVersion,
        inputFingerprint: cached.inputFingerprint,
        expiresAt: cached.expiresAt,
      },
      expectedRulesVersion: SCORE_POLICY.rulesVersion,
      expectedInputFingerprint: inputFingerprint,
      now,
      epdUsableForScoring: epdValidity.isUsableForScoring,
    });

    if (!staleReason) {
      return {
        total: cached.total,
        breakdown: {
          carbonEfficiency: cached.carbonEfficiency,
          epdVerification: cached.epdVerification,
          manufacturerTransparency: cached.manufacturerTransparency,
          assemblyOptionsCoverage: cached.assemblyOptionsCoverage,
        },
        validity: {
          cacheState: "hit_valid",
          isStale: false,
          staleReason: null,
          blocked: false,
          blockedReason: null,
          rulesVersion: cached.rulesVersion,
          inputFingerprint: cached.inputFingerprint,
          epdValidityStatus: epdValidity.status,
          epdDaysUntilExpiry: epdValidity.daysUntilExpiry,
          computedAt: toIso(cached.computedAt),
          expiresAt: toIso(cached.expiresAt),
        },
      };
    }
  }

  if (!epdValidity.isUsableForScoring) {
    const blocked = blockedScoreResponse(
      "epd_invalid",
      inputFingerprint,
      epdValidity.status,
      epdValidity.daysUntilExpiry,
      now,
      expiresAt
    );
    await persistScoreArtifacts({
      epdId,
      result: { total: blocked.total, breakdown: blocked.breakdown },
      rulesVersion: SCORE_POLICY.rulesVersion,
      inputFingerprint,
      epdValidityStatus: epdValidity.status,
      staleReason: "epd_invalid",
      computedAt: now,
      expiresAt,
      inputs: scoreInputRecord,
    });
    return blocked;
  }

  const carbonEfficiency = scoreCarbonEfficiency(
    row.gwpPer1000sf != null ? parseFloat(row.gwpPer1000sf) : null,
    row.assemblyType
  );
  const epdVerification = scoreEpdVerification(row.epdNumber);
  const manufacturerTransparency = scoreManufacturerTransparency(supplierRow ?? null);
  const assemblyOptionsCoverage = scoreAssemblyOptions(coveredOptions);

  const total = Math.min(
    100,
    carbonEfficiency + epdVerification + manufacturerTransparency + assemblyOptionsCoverage
  );

  const result: MaterialCreditScoreResult = {
    total,
    breakdown: {
      carbonEfficiency,
      epdVerification,
      manufacturerTransparency,
      assemblyOptionsCoverage,
    },
  };

  const staleReason =
    determineScoreStaleReason({
      cached: cached
        ? {
            rulesVersion: cached.rulesVersion,
            inputFingerprint: cached.inputFingerprint,
            expiresAt: cached.expiresAt,
          }
        : null,
      expectedRulesVersion: SCORE_POLICY.rulesVersion,
      expectedInputFingerprint: inputFingerprint,
      now,
      epdUsableForScoring: epdValidity.isUsableForScoring,
    }) ?? "cache_miss";

  await persistScoreArtifacts({
    epdId,
    result,
    rulesVersion: SCORE_POLICY.rulesVersion,
    inputFingerprint,
    epdValidityStatus: epdValidity.status,
    staleReason,
    computedAt: now,
    expiresAt,
    inputs: scoreInputRecord,
  });

  return {
    ...result,
    validity: {
      cacheState: cached ? "stale_recomputed" : "miss",
      isStale: cached != null,
      staleReason: cached ? staleReason : "cache_miss",
      blocked: false,
      blockedReason: null,
      rulesVersion: SCORE_POLICY.rulesVersion,
      inputFingerprint,
      epdValidityStatus: epdValidity.status,
      epdDaysUntilExpiry: epdValidity.daysUntilExpiry,
      computedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  };
}

/**
 * Compute scores for all epd_materials rows belonging to a supplier.
 */
export async function computeForSupplier(
  supplierId: number
): Promise<Array<{ epdId: number; productName: string } & MaterialCreditScoreResponse>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ id: epdMaterials.id, productName: epdMaterials.productName })
    .from(epdMaterials)
    .where(eq(epdMaterials.supplierId, supplierId));

  const results = await Promise.all(
    rows.map(async (r) => {
      const score = await compute(r.id);
      return { epdId: r.id, productName: r.productName, ...score };
    })
  );

  return results;
}

export async function markExpiredMaterialScoreCaches(now: Date = new Date()): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ epdId: materialCreditScoreCache.epdId })
    .from(materialCreditScoreCache)
    .where(and(lte(materialCreditScoreCache.expiresAt, now), isNull(materialCreditScoreCache.staleReason)));

  if (rows.length === 0) return 0;

  await db
    .update(materialCreditScoreCache)
    .set({ staleReason: "cache_expired" })
    .where(and(lte(materialCreditScoreCache.expiresAt, now), isNull(materialCreditScoreCache.staleReason)));

  return rows.length;
}

export async function cleanupOldMaterialScoreSnapshots(now: Date = new Date()): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(now.getTime() - SCORE_POLICY.snapshotRetentionDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: materialCreditScoreSnapshots.id })
    .from(materialCreditScoreSnapshots)
    .where(lt(materialCreditScoreSnapshots.computedAt, cutoff));

  if (rows.length === 0) return 0;

  await db
    .delete(materialCreditScoreSnapshots)
    .where(lt(materialCreditScoreSnapshots.computedAt, cutoff));

  return rows.length;
}
