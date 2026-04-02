/**
 * Material Spec Router
 *
 * tRPC router for fetching engineering specs, comparing materials,
 * and searching by spec criteria. Uses raw SQL via pg pool.
 *
 * Expected schema (materials table — already exists, relevant columns shown):
 *
 * -- CREATE TABLE materials (
 * --   id SERIAL PRIMARY KEY,
 * --   name VARCHAR(255) NOT NULL,
 * --   category VARCHAR(100) NOT NULL,
 * --   "gwpValue" DECIMAL(12,4),
 * --   "gwpUnit" VARCHAR(50),
 * --   "fireRating" VARCHAR(50),
 * --   "compressiveStrength" DECIMAL(12,2),
 * --   "tensileStrength" DECIMAL(12,2),
 * --   "flexuralStrength" DECIMAL(12,2),
 * --   density DECIMAL(10,4),
 * --   "thermalConductivity" DECIMAL(8,4),
 * --   "waterAbsorption" DECIMAL(8,4),
 * --   "recycledContentPct" DECIMAL(5,2),
 * --   "embodiedEnergy" DECIMAL(12,4),
 * --   voc DECIMAL(8,4),
 * --   "epdUrl" TEXT,
 * --   certifications TEXT[],
 * --   "pricePerUnit" DECIMAL(12,2),
 * --   "priceUnit" VARCHAR(50),
 * --   "createdAt" TIMESTAMP DEFAULT NOW(),
 * --   "updatedAt" TIMESTAMP DEFAULT NOW()
 * -- );
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { queryMany, queryOne } from '../pg-db';
import { enforceAndTrack } from '../usage-tracking-service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MaterialSpecRow {
  id: number;
  name: string;
  category: string;
  compressiveStrength: string | null;
  tensileStrength: string | null;
  flexuralStrength: string | null;
  density: string | null;
  thermalConductivity: string | null;
  fireRating: string | null;
  waterAbsorption: string | null;
  gwpValue: string | null;
  recycledContentPct: string | null;
  voc: string | null;
  embodiedEnergy: string | null;
  epdUrl: string | null;
  certifications: string[] | null;
  pricePerUnit: string | null;
  priceUnit: string | null;
}

interface MaterialSpecResult {
  materialId: number;
  materialName: string;
  category: string;
  specs: {
    compressiveStrength: number | null;
    tensileStrength: number | null;
    flexuralStrength: number | null;
    density: number | null;
    thermalConductivity: number | null;
    fireRating: string | null;
    waterAbsorption: number | null;
    gwp: number | null;
    recycledContent: number | null;
    voc: number | null;
    embodiedEnergy: number | null;
  };
  certifications: string[];
  epdUrl: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SELECT_COLS = `
  id, name, category,
  "compressiveStrength"::TEXT AS "compressiveStrength",
  "tensileStrength"::TEXT AS "tensileStrength",
  "flexuralStrength"::TEXT AS "flexuralStrength",
  density::TEXT AS density,
  "thermalConductivity"::TEXT AS "thermalConductivity",
  "fireRating",
  "waterAbsorption"::TEXT AS "waterAbsorption",
  "gwpValue"::TEXT AS "gwpValue",
  "recycledContentPct"::TEXT AS "recycledContentPct",
  voc::TEXT AS voc,
  "embodiedEnergy"::TEXT AS "embodiedEnergy",
  "epdUrl",
  certifications,
  "pricePerUnit"::TEXT AS "pricePerUnit",
  "priceUnit"
`;

function toNum(val: string | null | undefined): number | null {
  if (val == null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function rowToSpec(row: MaterialSpecRow): MaterialSpecResult {
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

// Spec property metadata for comparison matrix
const SPEC_PROPERTIES: {
  key: string;
  property: string;
  unit: string;
  bestDirection: 'low' | 'high' | 'none';
}[] = [
  { key: 'compressiveStrength', property: 'Compressive Strength', unit: 'psi', bestDirection: 'high' },
  { key: 'tensileStrength', property: 'Tensile Strength', unit: 'psi', bestDirection: 'high' },
  { key: 'flexuralStrength', property: 'Flexural Strength', unit: 'psi', bestDirection: 'high' },
  { key: 'density', property: 'Density', unit: 'lb/ft³', bestDirection: 'none' },
  { key: 'thermalConductivity', property: 'Thermal Conductivity', unit: 'W/mK', bestDirection: 'low' },
  { key: 'fireRating', property: 'Fire Rating', unit: 'class', bestDirection: 'none' },
  { key: 'waterAbsorption', property: 'Water Absorption', unit: '%', bestDirection: 'low' },
  { key: 'gwp', property: 'Global Warming Potential', unit: 'kgCO₂e', bestDirection: 'low' },
  { key: 'recycledContent', property: 'Recycled Content', unit: '%', bestDirection: 'high' },
  { key: 'voc', property: 'VOC', unit: 'g/L', bestDirection: 'low' },
  { key: 'embodiedEnergy', property: 'Embodied Energy', unit: 'MJ/kg', bestDirection: 'low' },
];

// ─── Router ─────────────────────────────────────────────────────────────────

export const materialSpecRouter = router({
  /**
   * Get full engineering specs for a single material.
   */
  getByMaterial: publicProcedure
    .input(z.object({ materialId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const row = await queryOne<MaterialSpecRow>(
        `SELECT ${SELECT_COLS} FROM materials WHERE id = $1`,
        [input.materialId]
      );

      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Material with ID ${input.materialId} not found`,
        });
      }

      return rowToSpec(row);
    }),

  /**
   * Compare specs for 2-10 materials side by side.
   * Returns a comparison matrix with isBest flags per property.
   */
  compareSpecs: protectedProcedure
    .input(
      z.object({
        materialIds: z.array(z.number().int().positive()).min(2).max(10),
      })
    )
    .query(async ({ ctx, input }) => {
      await enforceAndTrack(ctx.user.id, "material_comparison");
      if (input.materialIds.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least 2 material IDs required' });
      }

      // Build parameterized IN clause
      const placeholders = input.materialIds.map((_, i) => `$${i + 1}`).join(', ');
      const rows = await queryMany<MaterialSpecRow>(
        `SELECT ${SELECT_COLS} FROM materials WHERE id IN (${placeholders})`,
        input.materialIds
      );

      if (rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No materials found for given IDs' });
      }

      const materials = rows.map(rowToSpec);

      // Build comparison matrix
      const comparisonMatrix: Record<string, {
        property: string;
        unit: string;
        values: { materialId: number; value: number | string | null; isBest: boolean }[];
      }> = {};

      for (const prop of SPEC_PROPERTIES) {
        const values = materials.map(m => {
          const val = m.specs[prop.key as keyof typeof m.specs];
          return { materialId: m.materialId, value: val, isBest: false };
        });

        // Determine best value
        if (prop.bestDirection !== 'none') {
          const numericValues = values
            .map(v => ({ ...v, numVal: typeof v.value === 'number' ? v.value : null }))
            .filter(v => v.numVal != null);

          if (numericValues.length > 0) {
            let bestVal: number;
            if (prop.bestDirection === 'high') {
              bestVal = Math.max(...numericValues.map(v => v.numVal!));
            } else {
              bestVal = Math.min(...numericValues.map(v => v.numVal!));
            }
            for (const v of values) {
              if (typeof v.value === 'number' && v.value === bestVal) {
                v.isBest = true;
              }
            }
          }
        }

        comparisonMatrix[prop.key] = {
          property: prop.property,
          unit: prop.unit,
          values,
        };
      }

      return { materials, comparisonMatrix };
    }),

  /**
   * Search materials by spec filters with pagination and sorting.
   */
  searchBySpecs: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        minCompressiveStrength: z.number().optional(),
        maxGwp: z.number().optional(),
        minRecycledContent: z.number().optional(),
        fireRating: z.string().optional(),
        maxPrice: z.number().optional(),
        sortBy: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (input.category) {
        conditions.push(`category = $${paramIdx++}`);
        params.push(input.category);
      }
      if (input.minCompressiveStrength != null) {
        conditions.push(`"compressiveStrength" >= $${paramIdx++}`);
        params.push(input.minCompressiveStrength);
      }
      if (input.maxGwp != null) {
        conditions.push(`"gwpValue" <= $${paramIdx++}`);
        params.push(input.maxGwp);
      }
      if (input.minRecycledContent != null) {
        conditions.push(`"recycledContentPct" >= $${paramIdx++}`);
        params.push(input.minRecycledContent);
      }
      if (input.fireRating) {
        conditions.push(`"fireRating" = $${paramIdx++}`);
        params.push(input.fireRating);
      }
      if (input.maxPrice != null) {
        conditions.push(`"pricePerUnit" <= $${paramIdx++}`);
        params.push(input.maxPrice);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Validate sortBy to prevent SQL injection
      const allowedSortColumns: Record<string, string> = {
        name: 'name',
        category: 'category',
        gwp: '"gwpValue"',
        compressiveStrength: '"compressiveStrength"',
        tensileStrength: '"tensileStrength"',
        density: 'density',
        recycledContent: '"recycledContentPct"',
        price: '"pricePerUnit"',
        embodiedEnergy: '"embodiedEnergy"',
      };
      const sortCol = (input.sortBy && allowedSortColumns[input.sortBy]) ?? '"gwpValue"';
      const orderClause = `ORDER BY ${sortCol} ASC NULLS LAST`;

      const limitParam = `$${paramIdx++}`;
      const offsetParam = `$${paramIdx}`;
      params.push(input.limit, input.offset);

      const rows = await queryMany<MaterialSpecRow>(
        `SELECT ${SELECT_COLS}
         FROM materials
         ${whereClause}
         ${orderClause}
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );

      return rows.map(rowToSpec);
    }),
});
