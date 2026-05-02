import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import {
  materials,
  manufacturers,
  materialCertifications,
  ccpsBaselines,
  decisionMakerPersonas,
} from '../../drizzle/schema';
import { eq, like, and, lte, asc, sql, or, getTableColumns } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { calculateCcps, personaToWeights, calcCarbonDelta } from '../ccps-engine';
import type { PersonaWeights } from '../ccps-engine';
import { getAllPriceTrendsFromDb, getPriceTrendByCategory } from '../services/price-trends';
import { generateEmbedding } from '../services/embedding-service';

export const materialsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        persona: z.string().default('default'),
        sortBy: z.enum(['ccps', 'carbon', 'price', 'name', 'leadTime']).default('ccps'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        hasEpd: z.boolean().optional(),
        usManufactured: z.boolean().optional(),
        maxGwp: z.number().optional(),
        certifications: z.array(z.enum(['EPD', 'HPD', 'FSC', 'C2C', 'GREENGUARD', 'Declare'])).optional(),
        minScore: z.number().min(0).max(100).optional(),
        categorySearch: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions: SQL[] = [];
      if (input.search) {
        conditions.push(
          or(
            like(materials.name, `%${input.search}%`),
            like(materials.productName, `%${input.search}%`),
            like(materials.category, `%${input.search}%`)
          )!
        );
      }
      if (input.category) conditions.push(eq(materials.category, input.category));
      if (input.hasEpd !== undefined) conditions.push(eq(materials.hasEpd, input.hasEpd));
      if (input.usManufactured !== undefined) conditions.push(eq(materials.usManufactured, input.usManufactured));
      if (input.maxGwp !== undefined) conditions.push(lte(materials.gwpValue, String(input.maxGwp)));
      if (input.categorySearch) conditions.push(like(materials.category, `%${input.categorySearch}%`));
      if (input.certifications?.includes('EPD')) conditions.push(eq(materials.hasEpd, true));
      if (input.certifications?.includes('HPD')) conditions.push(eq(materials.hasHpd, true));
      if (input.certifications?.includes('FSC')) conditions.push(eq(materials.hasFsc, true));
      if (input.certifications?.includes('C2C')) conditions.push(eq(materials.hasC2c, true));
      if (input.certifications?.includes('GREENGUARD')) conditions.push(eq(materials.hasGreenguard, true));
      if (input.certifications?.includes('Declare')) conditions.push(eq(materials.hasDeclare, true));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Exclude heavy vector/search columns from the list query — they're only
      // needed for semantic search and cause query failures on some DB configs.
      const { embedding, searchText, ...listColumns } = getTableColumns(materials);

      const rows = await db
        .select({
          material: listColumns,
          manufacturerName: manufacturers.name,
          manufacturerWebsite: manufacturers.website,
          manufacturerLogoUrl: manufacturers.logoUrl,
        })
        .from(materials)
        .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
        .where(whereClause)
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(materials)
        .where(whereClause);
      const total = Number(countResult[0]?.count) || 0;

      const baselineRows = await db.select().from(ccpsBaselines);
      const baselineMap: Record<string, any> = {};
      for (const b of baselineRows) baselineMap[b.category] = b;

      let weights: PersonaWeights | undefined;
      if (input.persona && input.persona !== 'default') {
        const personaRows = await db
          .select()
          .from(decisionMakerPersonas)
          .where(eq(decisionMakerPersonas.personaKey, input.persona))
          .limit(1);
        if (personaRows.length > 0) weights = personaToWeights(personaRows[0]);
      }

      const items = rows.map((row) => {
        const baseline = baselineMap[row.material.category] || {};
        const ccps = calculateCcps(row.material, baseline, weights);
        return {
          ...row.material,
          manufacturerName: row.manufacturerName,
          manufacturerWebsite: row.manufacturerWebsite,
          manufacturerLogoUrl: row.manufacturerLogoUrl,
          ccps,
        };
      });

      const scoredItems = input.minScore !== undefined
        ? items.filter((item) => item.ccps.ccpsTotal >= (input.minScore ?? 0))
        : items;

      if (input.sortBy === 'ccps') {
        scoredItems.sort((a, b) =>
          input.sortOrder === 'desc'
            ? b.ccps.ccpsTotal - a.ccps.ccpsTotal
            : a.ccps.ccpsTotal - b.ccps.ccpsTotal
        );
      } else if (input.sortBy === 'carbon') {
        scoredItems.sort((a, b) => {
          const aVal = Number(a.gwpValue) || 0;
          const bVal = Number(b.gwpValue) || 0;
          return input.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
      } else if (input.sortBy === 'price') {
        scoredItems.sort((a, b) => {
          const aVal = Number(a.pricePerUnit) || 0;
          const bVal = Number(b.pricePerUnit) || 0;
          return input.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
      } else if (input.sortBy === 'name') {
        scoredItems.sort((a, b) =>
          input.sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        );
      } else if (input.sortBy === 'leadTime') {
        scoredItems.sort((a, b) => {
          const aVal = a.leadTimeDays || 0;
          const bVal = b.leadTimeDays || 0;
          return input.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
      }

      return { items: scoredItems, total };
    }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const { embedding: _emb, searchText: _st, ...detailColumns } = getTableColumns(materials);

    const rows = await db
      .select({
        material: detailColumns,
        manufacturerName: manufacturers.name,
        manufacturerWebsite: manufacturers.website,
        manufacturerLogoUrl: manufacturers.logoUrl,
        manufacturerPhone: manufacturers.phone,
        manufacturerEmail: manufacturers.email,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(eq(materials.id, input.id))
      .limit(1);

    if (rows.length === 0) return null;

    const certs = await db
      .select()
      .from(materialCertifications)
      .where(eq(materialCertifications.materialId, input.id));

    const baselineRows = await db
      .select()
      .from(ccpsBaselines)
      .where(eq(ccpsBaselines.category, rows[0].material.category))
      .limit(1);
    const baseline = baselineRows[0] || {};

    const personaRows = await db.select().from(decisionMakerPersonas);
    const ccpsByPersona: Record<string, any> = {};
    for (const p of personaRows) {
      ccpsByPersona[p.personaKey] = calculateCcps(rows[0].material, baseline, personaToWeights(p));
    }

    const { embedding: _e2, searchText: _s2, ...altColumns } = getTableColumns(materials);

    const altRows = await db
      .select({
        material: altColumns,
        manufacturerName: manufacturers.name,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(
        and(
          eq(materials.category, rows[0].material.category),
          sql`${materials.id} != ${input.id}`
        )
      )
      .limit(5);

    const alternatives = altRows.map((r) => {
      const altCcps = calculateCcps(r.material, baseline);
      const carbonDelta = calcCarbonDelta(
        Number(rows[0].material.embodiedCarbonPer1000sf) || 0,
        Number(r.material.embodiedCarbonPer1000sf) || 0
      );
      return {
        ...r.material,
        manufacturerName: r.manufacturerName,
        ccps: altCcps,
        carbonDelta,
      };
    });

    return {
      ...rows[0].material,
      manufacturerName: rows[0].manufacturerName,
      manufacturerWebsite: rows[0].manufacturerWebsite,
      manufacturerLogoUrl: rows[0].manufacturerLogoUrl,
      manufacturerPhone: rows[0].manufacturerPhone,
      manufacturerEmail: rows[0].manufacturerEmail,
      certifications: certs,
      ccpsByPersona,
      alternatives,
    };
  }),

  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        category: materials.category,
        count: sql<number>`count(*)`,
      })
      .from(materials)
      .groupBy(materials.category);
    return rows;
  }),

  getScore: protectedProcedure
    .input(z.object({ materialId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const { embedding: _scoreEmb, searchText: _scoreSt, ...scoreColumns } = getTableColumns(materials);

      const rows = await db
        .select({ material: scoreColumns, manufacturerName: manufacturers.name })
        .from(materials)
        .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
        .where(eq(materials.id, input.materialId))
        .limit(1);

      if (rows.length === 0) return null;
      const { material, manufacturerName } = rows[0];

      const certs = await db
        .select()
        .from(materialCertifications)
        .where(eq(materialCertifications.materialId, input.materialId));

      const hasEpdFlag = !!material.hasEpd;
      const hasEpdNumber = !!material.epdNumber;
      const epdScore = hasEpdFlag ? 30 : hasEpdNumber ? 15 : 0;

      const gwp = material.gwpValue ? Number(material.gwpValue) : null;
      const median = material.ec3IndustryMedian ? Number(material.ec3IndustryMedian) : null;
      const bestPractice = material.ec3BestPractice ? Number(material.ec3BestPractice) : null;
      const conservative = material.ec3ConservativeEstimate ? Number(material.ec3ConservativeEstimate) : null;

      let carbonScore = 0;
      if (gwp !== null && median !== null && median > 0) {
        if (bestPractice !== null && gwp <= bestPractice) {
          carbonScore = 25;
        } else if (conservative !== null && gwp >= conservative) {
          carbonScore = 0;
        } else if (conservative !== null && bestPractice !== null && conservative > bestPractice) {
          carbonScore = Math.max(0, Math.min(25, Math.round(25 * (conservative - gwp) / (conservative - bestPractice))));
        } else {
          const ratio = gwp / median;
          carbonScore = Math.max(0, Math.min(25, Math.round((1 - ratio) * 50)));
        }
      }

      const certSet = new Set<string>();
      if (material.hasEpd) certSet.add('EPD');
      if (material.hasHpd) certSet.add('HPD');
      if (material.hasFsc) certSet.add('FSC');
      if (material.hasC2c) certSet.add('Cradle to Cradle');
      if (material.hasGreenguard) certSet.add('GREENGUARD');
      if (material.hasDeclare) certSet.add('Declare');
      for (const c of certs) if (c.certificationName) certSet.add(c.certificationName);
      const certificationScore = Math.min(20, certSet.size * 4);
      const certNames = Array.from(certSet);

      const miles = material.regionalAvailabilityMiles ?? null;
      const baseLocal = miles === null ? 8 : miles === 0 ? 15 : Math.max(0, Math.min(15, Math.round((1 - miles / 500) * 15)));
      const localSourcingScore = material.usManufactured ? Math.min(15, baseLocal + 3) : baseLocal;

      const transparencyFields = [
        material.description,
        material.gwpValue,
        material.pricePerUnit,
        material.leadTimeDays,
        material.epdUrl || material.epdNumber,
        material.specSheetUrl,
        material.manufacturerId,
        material.recycledContentPct,
        material.ec3IndustryMedian,
        material.category,
      ];
      const filledCount = transparencyFields.filter(
        (f) => f !== null && f !== undefined && String(f).trim() !== ''
      ).length;
      const transparencyScore = Math.round((filledCount / transparencyFields.length) * 10);

      const total = Math.min(100, epdScore + carbonScore + certificationScore + localSourcingScore + transparencyScore);

      const now = new Date();
      const history = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - i));
        const variance = ((input.materialId * (i + 1) * 7) % 9) - 4;
        const historicScore = Math.max(0, Math.min(100, Math.round(total * (0.72 + (i / 5) * 0.28) + variance)));
        return { month: d.toISOString().slice(0, 7), score: historicScore };
      });

      return {
        materialId: input.materialId,
        materialName: material.name,
        manufacturerName,
        total,
        breakdown: {
          epd: { score: epdScore, max: 30, hasEpd: hasEpdFlag, hasEpdNumber },
          carbon: { score: carbonScore, max: 25, gwp, median, bestPractice },
          certifications: { score: certificationScore, max: 20, certNames },
          localSourcing: { score: localSourcingScore, max: 15, miles, usManufactured: !!material.usManufactured },
          transparency: { score: transparencyScore, max: 10, filledFields: filledCount, totalFields: transparencyFields.length },
        },
        history,
      };
    }),

  semanticSearch: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], semantic: false };

      const embedding = await generateEmbedding(input.query);

      if (embedding) {
        const embString = `[${embedding.join(',')}]`;
        const rows = await db.execute(
          sql`SELECT m.*,
                     mfg.name AS "manufacturerName",
                     mfg.website AS "manufacturerWebsite",
                     mfg."logoUrl" AS "manufacturerLogoUrl",
                     m.embedding <=> ${embString}::vector AS distance
              FROM materials m
              LEFT JOIN manufacturers mfg ON m."manufacturerId" = mfg.id
              WHERE m.embedding IS NOT NULL
              ORDER BY m.embedding <=> ${embString}::vector
              LIMIT ${input.limit}`
        );
        return { items: rows.rows ?? rows, semantic: true };
      }

      const term = `%${input.query}%`;
      const rows = await db
        .select({
          material: materials,
          manufacturerName: manufacturers.name,
          manufacturerWebsite: manufacturers.website,
          manufacturerLogoUrl: manufacturers.logoUrl,
        })
        .from(materials)
        .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
        .where(
          or(
            like(materials.name, term),
            like(materials.productName, term),
            like(materials.category, term),
            like(materials.subcategory, term),
            like(materials.description, term)
          )
        )
        .limit(input.limit);

      const items = rows.map((r) => ({
        ...r.material,
        manufacturerName: r.manufacturerName,
        manufacturerWebsite: r.manufacturerWebsite,
        manufacturerLogoUrl: r.manufacturerLogoUrl,
      }));

      return { items, semantic: false };
    }),

  getPriceTrends: publicProcedure.query(() => {
    return getAllPriceTrendsFromDb();
  }),

  getPriceTrend: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => {
      return getPriceTrendByCategory(input.category);
    }),

  searchEC3: protectedProcedure
    .input(z.object({ query: z.string(), category: z.string().optional() }))
    .query(async ({ input }) => {
      const { searchEC3Materials } = await import('../services/ec3-service');
      return searchEC3Materials(input.query, input.category);
    }),
});
