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
import { queryMany, queryOne } from '../pg-db';
import {
  validateSwap as validateSwapService,
  type MaterialSpec,
} from '../services/swapValidationService';

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
});
