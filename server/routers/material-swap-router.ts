/**
 * Material Swap Router
 *
 * tRPC router for finding material alternatives, validating swaps,
 * and tracking swap history. Uses raw SQL via pg pool.
 *
 * Expected schema:
 *
 * -- Materials table (already exists):
 * -- CREATE TABLE materials (
 * --   id SERIAL PRIMARY KEY,
 * --   name VARCHAR(255) NOT NULL,
 * --   category VARCHAR(100) NOT NULL,
 * --   "gwpValue" DECIMAL(12,4),
 * --   "fireRating" VARCHAR(50),
 * --   "compressiveStrength" DECIMAL(12,2),
 * --   "tensileStrength" DECIMAL(12,2),
 * --   density DECIMAL(10,4),
 * --   "recycledContent" DECIMAL(5,2),
 * --   "embodiedEnergy" DECIMAL(12,4),
 * --   voc DECIMAL(8,4),
 * --   "epdUrl" TEXT,
 * --   certifications TEXT[],
 * --   "pricePerUnit" DECIMAL(12,2),
 * --   "priceUnit" VARCHAR(50),
 * --   "supplierId" INTEGER,
 * --   "supplierName" VARCHAR(255),
 * --   "createdAt" TIMESTAMP DEFAULT NOW(),
 * --   "updatedAt" TIMESTAMP DEFAULT NOW()
 * -- );
 *
 * -- CREATE TABLE material_swap_history (
 * --   id SERIAL PRIMARY KEY,
 * --   "userId" INTEGER,
 * --   "projectId" INTEGER,
 * --   "originalMaterialId" INTEGER NOT NULL REFERENCES materials(id),
 * --   "substituteMaterialId" INTEGER NOT NULL REFERENCES materials(id),
 * --   status VARCHAR(20) NOT NULL DEFAULT 'considered',
 * --   "carbonSavingsKg" DECIMAL(12,4),
 * --   "createdAt" TIMESTAMP DEFAULT NOW(),
 * --   "updatedAt" TIMESTAMP DEFAULT NOW()
 * -- );
 * -- CREATE INDEX idx_swap_history_user ON material_swap_history("userId");
 * -- CREATE INDEX idx_swap_history_project ON material_swap_history("projectId");
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { queryMany, queryOne } from '../../lib/pg-pool';
import {
  validateSwap as validateSwapService,
  type MaterialSpec,
} from '../services/swapValidationService';
import { checkBccaCompliance } from '../services/bcca';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MaterialRow {
  id: number;
  name: string;
  category: string;
  gwpValue: string | null;
  fireRating: string | null;
  compressiveStrength: string | null;
  tensileStrength: string | null;
  flexuralStrength: string | null;
  density: string | null;
  thermalConductivity: string | null;
  waterAbsorption: string | null;
  recycledContentPct: string | null;
  embodiedEnergy: string | null;
  voc: string | null;
  epdUrl: string | null;
  certifications: string[] | null;
  pricePerUnit: string | null;
  priceUnit: string | null;
  supplierName: string | null;
}

interface SwapHistoryRow {
  id: number;
  userId: number | null;
  projectId: number | null;
  originalMaterialId: number;
  substituteMaterialId: number;
  status: string;
  carbonSavingsKg: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIRE_RATING_RANK: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

function fireRank(rating: string | null): number {
  if (!rating) return 0;
  return FIRE_RATING_RANK[rating.trim().toUpperCase()] ?? 0;
}

function toNum(val: string | null | undefined): number | null {
  if (val == null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function rowToMaterialSpec(row: MaterialRow): MaterialSpec {
  return {
    materialId: row.id,
    materialName: row.name,
    category: row.category,
    specs: {
      compressiveStrength: toNum(row.compressiveStrength),
      tensileStrength: toNum(row.tensileStrength),
      flexuralStrength: toNum(row.flexuralStrength),
      density: toNum(row.density),
      thermalConductivity: toNum(row.thermalConductivity),
      fireRating: row.fireRating,
      waterAbsorption: toNum(row.waterAbsorption),
      gwp: toNum(row.gwpValue),
      recycledContent: toNum(row.recycledContentPct),
      voc: toNum(row.voc),
      embodiedEnergy: toNum(row.embodiedEnergy),
    },
    certifications: row.certifications ?? [],
    epdUrl: row.epdUrl,
  };
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const materialSwapRouter = router({
  /**
   * Find alternative materials for a given material.
   * Filters by same category, structural tolerances, fire rating, and lower GWP.
   * Ranked by carbon savings (highest GWP reduction first).
   */
  findAlternatives: publicProcedure
    .input(
      z.object({
        materialName: z.string(),
        category: z.string(),
        specs: z.object({
          compressiveStrength: z.number().optional(),
          tensileStrength: z.number().optional(),
          fireRating: z.string().optional(),
          density: z.number().optional(),
          gwp: z.number().optional(),
        }),
      })
    )
    .query(async ({ input }) => {
      const { category, specs } = input;

      // Build dynamic WHERE clauses for structural tolerances
      const conditions: string[] = ['category = $1'];
      const params: unknown[] = [category];
      let paramIdx = 2;

      // Compressive strength within +/-20%
      if (specs.compressiveStrength != null) {
        const lower = specs.compressiveStrength * 0.8;
        const upper = specs.compressiveStrength * 1.2;
        conditions.push(`"compressiveStrength" BETWEEN $${paramIdx} AND $${paramIdx + 1}`);
        params.push(lower, upper);
        paramIdx += 2;
      }

      // Tensile strength within +/-20%
      if (specs.tensileStrength != null) {
        const lower = specs.tensileStrength * 0.8;
        const upper = specs.tensileStrength * 1.2;
        conditions.push(`"tensileStrength" BETWEEN $${paramIdx} AND $${paramIdx + 1}`);
        params.push(lower, upper);
        paramIdx += 2;
      }

      // Density within +/-30%
      if (specs.density != null) {
        const lower = specs.density * 0.7;
        const upper = specs.density * 1.3;
        conditions.push(`density BETWEEN $${paramIdx} AND $${paramIdx + 1}`);
        params.push(lower, upper);
        paramIdx += 2;
      }

      // GWP must be lower than original
      if (specs.gwp != null) {
        conditions.push(`"gwpValue" < $${paramIdx}`);
        params.push(specs.gwp);
        paramIdx += 1;
      }

      const whereClause = conditions.join(' AND ');

      const rows = await queryMany<MaterialRow>(
        `SELECT id, name, category,
                "gwpValue"::TEXT AS "gwpValue",
                "fireRating",
                "compressiveStrength"::TEXT AS "compressiveStrength",
                "tensileStrength"::TEXT AS "tensileStrength",
                "flexuralStrength"::TEXT AS "flexuralStrength",
                density::TEXT AS density,
                "thermalConductivity"::TEXT AS "thermalConductivity",
                "waterAbsorption"::TEXT AS "waterAbsorption",
                "recycledContentPct"::TEXT AS "recycledContentPct",
                "embodiedEnergy"::TEXT AS "embodiedEnergy",
                voc::TEXT AS voc,
                "epdUrl",
                certifications,
                "pricePerUnit"::TEXT AS "pricePerUnit",
                "priceUnit",
                "supplierName"
         FROM materials
         WHERE ${whereClause}
         ORDER BY "gwpValue" ASC NULLS LAST
         LIMIT 50`,
        params
      );

      // Post-filter: fire rating must be >= original
      const origFireRank = fireRank(specs.fireRating ?? null);
      const filtered = rows.filter(r => {
        if (origFireRank > 0) {
          return fireRank(r.fireRating) >= origFireRank;
        }
        return true;
      });

      // Rank by carbon savings (highest GWP reduction first)
      const origGwp = specs.gwp ?? 0;
      return filtered.map(r => {
        const candidateGwp = toNum(r.gwpValue) ?? 0;
        const gwpReduction = origGwp - candidateGwp;
        const gwpReductionPercent = origGwp > 0
          ? parseFloat(((gwpReduction / origGwp) * 100).toFixed(2))
          : 0;
        // Approximate carbon savings per functional unit (kg CO2e)
        const carbonSavingsKgCO2 = parseFloat(gwpReduction.toFixed(4));

        const bcca = checkBccaCompliance(r.category, toNum(r.gwpValue), r.name);

        return {
          materialId: r.id,
          materialName: r.name,
          category: r.category,
          specs: {
            compressiveStrength: toNum(r.compressiveStrength),
            tensileStrength: toNum(r.tensileStrength),
            fireRating: r.fireRating,
            density: toNum(r.density),
            gwp: toNum(r.gwpValue),
          },
          gwpReduction: parseFloat(gwpReduction.toFixed(4)),
          gwpReductionPercent,
          carbonSavingsKgCO2,
          supplier: r.supplierName,
          pricePerUnit: toNum(r.pricePerUnit),
          bcca: {
            status:      bcca.status,
            message:     bcca.message,
            gwpMargin:   bcca.gwpMargin,
            gwpMarginPct:bcca.gwpMarginPct,
            threshold:   bcca.threshold?.maxGwp ?? null,
            unit:        bcca.threshold?.unit ?? null,
          },
        };
      });
    }),

  /**
   * Validate a swap between two materials.
   * Checks structural, fire, and density equivalence.
   * Returns pass/fail per check, warnings, and LEED credit potential.
   */
  validateSwap: publicProcedure
    .input(
      z.object({
        originalMaterialId: z.number().int().positive(),
        substituteMaterialId: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      const selectCols = `id, name, category,
        "gwpValue"::TEXT AS "gwpValue", "fireRating",
        "compressiveStrength"::TEXT AS "compressiveStrength",
        "tensileStrength"::TEXT AS "tensileStrength",
        "flexuralStrength"::TEXT AS "flexuralStrength",
        density::TEXT AS density,
        "thermalConductivity"::TEXT AS "thermalConductivity",
        "waterAbsorption"::TEXT AS "waterAbsorption",
        "recycledContentPct"::TEXT AS "recycledContentPct",
        "embodiedEnergy"::TEXT AS "embodiedEnergy",
        voc::TEXT AS voc, "epdUrl", certifications,
        "pricePerUnit"::TEXT AS "pricePerUnit", "priceUnit", "supplierName"`;

      const [originalRow, substituteRow] = await Promise.all([
        queryOne<MaterialRow>(
          `SELECT ${selectCols} FROM materials WHERE id = $1`,
          [input.originalMaterialId]
        ),
        queryOne<MaterialRow>(
          `SELECT ${selectCols} FROM materials WHERE id = $1`,
          [input.substituteMaterialId]
        ),
      ]);

      if (!originalRow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Original material with ID ${input.originalMaterialId} not found`,
        });
      }
      if (!substituteRow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Substitute material with ID ${input.substituteMaterialId} not found`,
        });
      }

      const original = rowToMaterialSpec(originalRow);
      const substitute = rowToMaterialSpec(substituteRow);

      return validateSwapService(original, substitute);
    }),

  /**
   * Get swap history with optional filters and pagination.
   */
  getSwapHistory: publicProcedure
    .input(
      z.object({
        userId: z.number().int().optional(),
        projectId: z.number().int().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (input.userId != null) {
        conditions.push(`"userId" = $${paramIdx++}`);
        params.push(input.userId);
      }
      if (input.projectId != null) {
        conditions.push(`"projectId" = $${paramIdx++}`);
        params.push(input.projectId);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const limitParam = `$${paramIdx++}`;
      const offsetParam = `$${paramIdx}`;
      params.push(input.limit, input.offset);

      const rows = await queryMany<SwapHistoryRow>(
        `SELECT id, "userId", "projectId",
                "originalMaterialId", "substituteMaterialId",
                status,
                "carbonSavingsKg"::TEXT AS "carbonSavingsKg",
                "createdAt"::TEXT AS "createdAt",
                "updatedAt"::TEXT AS "updatedAt"
         FROM material_swap_history
         ${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );

      return rows.map(r => ({
        id: r.id,
        userId: r.userId,
        projectId: r.projectId,
        originalMaterialId: r.originalMaterialId,
        substituteMaterialId: r.substituteMaterialId,
        status: r.status,
        carbonSavingsKg: r.carbonSavingsKg ? parseFloat(r.carbonSavingsKg) : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    }),

  /**
   * Search materials by name, category, or product description.
   * Used by the Material Swap Engine search bar.
   */
  search: publicProcedure
    .input(z.object({ query: z.string(), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const term = `%${input.query.toLowerCase()}%`;
      const rows = await queryMany<MaterialRow & { hasEpd: boolean; productName: string | null }>(
        `SELECT id, name, category,
                "gwpValue"::TEXT AS "gwpValue",
                "fireRating",
                "compressiveStrength"::TEXT AS "compressiveStrength",
                "tensileStrength"::TEXT AS "tensileStrength",
                "flexuralStrength"::TEXT AS "flexuralStrength",
                density::TEXT AS density,
                "thermalConductivity"::TEXT AS "thermalConductivity",
                "waterAbsorption"::TEXT AS "waterAbsorption",
                "recycledContentPct"::TEXT AS "recycledContentPct",
                "embodiedEnergy"::TEXT AS "embodiedEnergy",
                voc::TEXT AS voc,
                "epdUrl",
                certifications,
                "pricePerUnit"::TEXT AS "pricePerUnit",
                "priceUnit",
                "supplierName",
                "hasEpd",
                "productName"
         FROM materials
         WHERE LOWER(name) LIKE $1
            OR LOWER(category) LIKE $1
            OR LOWER(COALESCE("productName", '')) LIKE $1
         ORDER BY name
         LIMIT $2`,
        [term, input.limit]
      );
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        gwpValue: r.gwpValue,
        hasEpd: r.hasEpd,
        pricePerUnit: r.pricePerUnit,
        priceUnit: r.priceUnit,
        productName: r.productName ?? null,
      }));
    }),

  /**
   * Find swap alternatives for a material identified by integer ID.
   * Looks up the material, then delegates to the same alternative-finding logic.
   */
  findSwaps: publicProcedure
    .input(
      z.object({
        materialId: z.number().int().positive(),
        maxGwpIncrease: z.number().default(0),
        maxPriceIncrease: z.number().default(20),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const selectCols = `id, name, category,
        "gwpValue"::TEXT AS "gwpValue", "fireRating",
        "compressiveStrength"::TEXT AS "compressiveStrength",
        "tensileStrength"::TEXT AS "tensileStrength",
        "flexuralStrength"::TEXT AS "flexuralStrength",
        density::TEXT AS density,
        "thermalConductivity"::TEXT AS "thermalConductivity",
        "waterAbsorption"::TEXT AS "waterAbsorption",
        "recycledContentPct"::TEXT AS "recycledContentPct",
        "embodiedEnergy"::TEXT AS "embodiedEnergy",
        voc::TEXT AS voc, "epdUrl", certifications,
        "pricePerUnit"::TEXT AS "pricePerUnit", "priceUnit", "supplierName"`;

      const originalRow = await queryOne<MaterialRow>(
        `SELECT ${selectCols} FROM materials WHERE id = $1`,
        [input.materialId]
      );

      if (!originalRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Material ${input.materialId} not found` });
      }

      const origGwp = toNum(originalRow.gwpValue);
      const origPrice = toNum(originalRow.pricePerUnit);

      // Candidates: same category, GWP within bounds
      const candidates = await queryMany<MaterialRow>(
        `SELECT ${selectCols}
         FROM materials
         WHERE category = $1
           AND id != $2
           AND ("gwpValue" IS NULL OR "gwpValue"::FLOAT <= COALESCE($3::FLOAT * (1 + $4 / 100.0), 9999))
         ORDER BY "gwpValue" ASC NULLS LAST
         LIMIT $5`,
        [originalRow.category, input.materialId, origGwp, input.maxGwpIncrease, input.limit * 3]
      );

      // Post-filter by price and fire rating, then shape the response
      const swaps = candidates
        .filter(c => {
          const cPrice = toNum(c.pricePerUnit);
          if (origPrice !== null && cPrice !== null) {
            const priceDeltaPct = ((cPrice - origPrice) / origPrice) * 100;
            if (priceDeltaPct > input.maxPriceIncrease) return false;
          }
          if (fireRank(originalRow.fireRating) > 0) {
            return fireRank(c.fireRating) >= fireRank(originalRow.fireRating);
          }
          return true;
        })
        .slice(0, input.limit)
        .map(c => {
          const cPrice = toNum(c.pricePerUnit);
          const priceDelta = origPrice !== null && cPrice !== null
            ? parseFloat((((cPrice - origPrice) / origPrice) * 100).toFixed(1))
            : null;
          const leadTimeDelta: number | null = null; // not stored in current schema

          const bccaOriginal  = checkBccaCompliance(originalRow.category, toNum(originalRow.gwpValue), originalRow.name);
          const bccaCandidate = checkBccaCompliance(c.category, toNum(c.gwpValue), c.name);

          return {
            original: originalRow,
            candidate: c,
            tradeoffs: { priceDelta, leadTimeDelta },
            bcca: {
              original:  { status: bccaOriginal.status,  message: bccaOriginal.message,  gwpMargin: bccaOriginal.gwpMargin },
              candidate: { status: bccaCandidate.status, message: bccaCandidate.message, gwpMargin: bccaCandidate.gwpMargin },
              /** True when original is non-compliant but candidate IS compliant — key differentiator */
              upgradesCompliance: bccaOriginal.status === "non_compliant" && bccaCandidate.status === "compliant",
            },
          };
        });

      return { swaps };
    }),

  /**
   * Full CCPS scorecard comparison between two materials.
   */
  compareScorecard: publicProcedure
    .input(
      z.object({
        materialId1: z.number().int().positive(),
        materialId2: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      const selectCols = `id, name, category,
        "gwpValue"::TEXT AS "gwpValue", "fireRating",
        "compressiveStrength"::TEXT AS "compressiveStrength",
        "tensileStrength"::TEXT AS "tensileStrength",
        "flexuralStrength"::TEXT AS "flexuralStrength",
        density::TEXT AS density,
        "thermalConductivity"::TEXT AS "thermalConductivity",
        "waterAbsorption"::TEXT AS "waterAbsorption",
        "recycledContentPct"::TEXT AS "recycledContentPct",
        "embodiedEnergy"::TEXT AS "embodiedEnergy",
        voc::TEXT AS voc, "epdUrl", certifications,
        "pricePerUnit"::TEXT AS "pricePerUnit", "priceUnit", "supplierName",
        "hasEpd", "hasDeclare", "hasHpd", "hasFsc", "hasC2c",
        "usManufactured", "regionalAvailabilityMiles",
        "leadTimeDays"`;

      const [row1, row2] = await Promise.all([
        queryOne<MaterialRow & {
          hasEpd: boolean; hasDeclare: boolean; hasHpd: boolean; hasFsc: boolean; hasC2c: boolean;
          usManufactured: boolean; regionalAvailabilityMiles: number | null; leadTimeDays: number | null;
        }>(`SELECT ${selectCols} FROM materials WHERE id = $1`, [input.materialId1]),
        queryOne<MaterialRow & {
          hasEpd: boolean; hasDeclare: boolean; hasHpd: boolean; hasFsc: boolean; hasC2c: boolean;
          usManufactured: boolean; regionalAvailabilityMiles: number | null; leadTimeDays: number | null;
        }>(`SELECT ${selectCols} FROM materials WHERE id = $1`, [input.materialId2]),
      ]);

      if (!row1) throw new TRPCError({ code: 'NOT_FOUND', message: `Material ${input.materialId1} not found` });
      if (!row2) throw new TRPCError({ code: 'NOT_FOUND', message: `Material ${input.materialId2} not found` });

      type ScorecardRow = NonNullable<typeof row1>;
      function buildScorecard(r: ScorecardRow) {
        return {
          carbon: { gwp: toNum(r.gwpValue) },
          compliance: {
            fireRating: r.fireRating,
            rValue: null as number | null,
            meetsTitle24: false,
            meetsIecc: false,
          },
          certifications: {
            hasEpd: r.hasEpd,
            hasDeclare: r.hasDeclare,
            hasHpd: r.hasHpd,
            hasFsc: r.hasFsc,
            hasC2c: r.hasC2c,
          },
          cost: {
            pricePerUnit: toNum(r.pricePerUnit),
            priceUnit: r.priceUnit,
            leadTimeDays: r.leadTimeDays,
          },
          supplyChain: {
            usManufactured: r.usManufactured,
            regionalAvailabilityMiles: r.regionalAvailabilityMiles,
          },
          health: {
            vocLevel: r.voc,
            onRedList: false,
          },
        };
      }

      const gwp1 = toNum(row1.gwpValue);
      const gwp2 = toNum(row2.gwpValue);
      const carbonSavings = gwp1 !== null && gwp2 !== null && gwp1 > 0
        ? parseFloat((((gwp1 - gwp2) / gwp1) * 100).toFixed(2))
        : null;

      const price1 = toNum(row1.pricePerUnit);
      const price2 = toNum(row2.pricePerUnit);
      const priceDifference = price1 !== null && price2 !== null
        ? parseFloat((price2 - price1).toFixed(2))
        : null;

      return {
        material1: { id: row1.id, name: row1.name, category: row1.category, scorecard: buildScorecard(row1) },
        material2: { id: row2.id, name: row2.name, category: row2.category, scorecard: buildScorecard(row2) },
        comparison: { carbonSavings, priceDifference },
      };
    }),
});
