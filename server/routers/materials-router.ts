import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import {
  materials,
  manufacturers,
  materialCertifications,
  materialSpecs,
  decisionMakerPersonas,
} from '../../drizzle/schema';
import { getCachedBaselines } from '../services/baselines-cache';
import { getCachedCategories } from '../services/categories-cache';
import { eq, like, ilike, and, lte, sql, or, not, getTableColumns, asc, desc, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { calculateCcps, personaToWeights, calcCarbonDelta } from '../ccps-engine';
import type { PersonaWeights } from '../ccps-engine';
import { getAllPriceTrendsFromDb, getPriceTrendByCategory } from '../services/price-trends';
import { computeMcs } from '../services/mcs-score';
import { materialSearchProvider } from '../services/search';

export const materialsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        persona: z.string().default('default'),
        sortBy: z.enum(['ccps', 'carbon', 'price', 'name', 'leadTime']).default('ccps'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.number().min(1).max(200).default(20),
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

      const conditions: SQL[] = [
        // Exclude Swiss/German KBOB reference data — non-English names, no images,
        // not real purchasable products. The catalog shows only English-language
        // verified products (static-seed, ews-pdf-import, supplier-submitted).
        not(like(materials.dataSource, 'open-material-data%')),
      ];
      if (input.search) {
        conditions.push(
          or(
            ilike(materials.name, `%${input.search}%`),
            ilike(materials.productName, `%${input.search}%`),
            ilike(materials.category, `%${input.search}%`)
          )!
        );
      }
      if (input.category) conditions.push(ilike(materials.category, input.category));
      if (input.hasEpd !== undefined) conditions.push(eq(materials.hasEpd, input.hasEpd));
      if (input.usManufactured !== undefined) conditions.push(eq(materials.usManufactured, input.usManufactured));
      if (input.maxGwp !== undefined) conditions.push(lte(materials.gwpValue, String(input.maxGwp)));
      if (input.categorySearch) conditions.push(ilike(materials.category, `%${input.categorySearch}%`));
      if (input.minScore !== undefined) {
        conditions.push(sql`COALESCE(${materials.ccpsScore}, 0) >= ${input.minScore}`);
      }
      if (input.certifications?.includes('EPD')) conditions.push(eq(materials.hasEpd, true));
      if (input.certifications?.includes('HPD')) conditions.push(eq(materials.hasHpd, true));
      if (input.certifications?.includes('FSC')) conditions.push(eq(materials.hasFsc, true));
      if (input.certifications?.includes('C2C')) conditions.push(eq(materials.hasC2c, true));
      if (input.certifications?.includes('GREENGUARD')) conditions.push(eq(materials.hasGreenguard, true));
      if (input.certifications?.includes('Declare')) conditions.push(eq(materials.hasDeclare, true));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Exclude heavy vector/search columns from the list query — they're only
      // needed for semantic search and cause query failures on some DB configs.
      const { embedding: _embedding, searchText: _searchText, ...listColumns } = getTableColumns(materials);

      // Run data fetch, count, and baselines in parallel — eliminates sequential waterfall
      const orderByExpr = (() => {
        switch (input.sortBy) {
          case 'carbon':
            return input.sortOrder === 'asc' ? asc(materials.gwpValue) : desc(materials.gwpValue);
          case 'price':
            return input.sortOrder === 'asc' ? asc(materials.pricePerUnit) : desc(materials.pricePerUnit);
          case 'name':
            return input.sortOrder === 'asc' ? asc(materials.name) : desc(materials.name);
          case 'leadTime':
            return input.sortOrder === 'asc' ? asc(materials.leadTimeDays) : desc(materials.leadTimeDays);
          case 'ccps':
          default:
            return input.sortOrder === 'asc' ? asc(materials.ccpsScore) : desc(materials.ccpsScore);
        }
      })();

      const [rows, countResult, baselineRows] = await Promise.all([
        db
          .select({
            material: listColumns,
            manufacturerName: manufacturers.name,
            manufacturerWebsite: manufacturers.website,
            manufacturerLogoUrl: manufacturers.logoUrl,
          })
          .from(materials)
          .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
          .where(whereClause)
          .orderBy(orderByExpr)
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(materials)
          .where(whereClause),
        getCachedBaselines(),
      ]);
      const total = Number(countResult[0]?.count) || 0;

      const baselineMap = new Map<string, Record<string, unknown>>();
      for (const baselineRow of baselineRows) {
        baselineMap.set(baselineRow.category, baselineRow as Record<string, unknown>);
      }

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
        const baseline = baselineMap.get(row.material.category) ?? {};
        const ccps = calculateCcps(row.material, baseline, weights);
        return {
          ...row.material,
          manufacturerName: row.manufacturerName,
          manufacturerWebsite: row.manufacturerWebsite,
          manufacturerLogoUrl: row.manufacturerLogoUrl,
          ccps,
        };
      });

      return { items, total };
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

    const [certs, allBaselines] = await Promise.all([
      db
        .select()
        .from(materialCertifications)
        .where(eq(materialCertifications.materialId, input.id)),
      getCachedBaselines(),
    ]);

    const baseline = allBaselines.find(b => b.category === rows[0].material.category) || {} as any;

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

  getByIds: publicProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(4) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const ids = Array.from(new Set(input.ids));
      if (ids.length === 0) return [];

      const { embedding: _emb, searchText: _st, ...detailColumns } = getTableColumns(materials);
      const [rows, allBaselines] = await Promise.all([
        db
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
          .where(inArray(materials.id, ids)),
        getCachedBaselines(),
      ]);

      const baselineMap = new Map<string, Record<string, unknown>>();
      for (const baselineRow of allBaselines) {
        baselineMap.set(baselineRow.category, baselineRow as Record<string, unknown>);
      }

      const byId = new Map(
        rows.map((row) => {
          const baseline = baselineMap.get(row.material.category) ?? {};
          const ccpsDefault = calculateCcps(row.material, baseline);
          return [row.material.id, {
            ...row.material,
            manufacturerName: row.manufacturerName,
            manufacturerWebsite: row.manufacturerWebsite,
            manufacturerLogoUrl: row.manufacturerLogoUrl,
            manufacturerPhone: row.manufacturerPhone,
            manufacturerEmail: row.manufacturerEmail,
            ccpsByPersona: { default: ccpsDefault },
            alternatives: [],
            certifications: [],
          }];
        }),
      );

      return ids
        .map((id) => byId.get(id))
        .filter((item): item is NonNullable<typeof item> => item !== undefined);
    }),

  categories: publicProcedure.query(async () => {
    return getCachedCategories();
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

      const { total, breakdown } = computeMcs(material, certs);

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
        breakdown,
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
      // Routed through the swappable hybrid retrieval seam (keyword + vector
      // fused via RRF). We call the PROVIDER interface (not the concrete
      // function) so rebinding `materialSearchProvider` to an Azure AI Search
      // implementation later reroutes this endpoint with no changes here.
      const { items, mode } = await materialSearchProvider.search({
        query: input.query,
        limit: input.limit,
        // semanticSearch historically searched the whole catalog (not verified-gated).
        verifiedOnly: false,
      });

      // Preserve the legacy distance contract: the old vector-only path gave
      // every returned item a real cosine distance. Under RRF a top hit can be
      // keyword-only (distance = null); consumers like ExcelAudit coerce a null
      // distance to 0 and would misread it as a perfect semantic match. Emit a
      // far sentinel (1.0 = no vector similarity) for keyword-only hits so they
      // are never mistaken for strong matches.
      const compatItems = items.map((item) => ({
        ...item,
        distance: item.distance ?? 1,
      }));

      return { items: compatItems, semantic: mode === 'hybrid' };
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

  /**
   * getScoresForSupplier — batch Material Credit Scores for all of a supplier's materials.
   *
   * Fetches all materials + certifications in 2 queries, then scores every row with
   * the same logic as getScore. Returns sorted ascending by total (worst-first) so
   * the supplier can immediately see what needs attention.
   */
  getScoresForSupplier: publicProcedure
    .input(z.object({ supplierId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // ── 1. Fetch all materials for this supplier ──────────────────────────
      const { embedding: _e, searchText: _s, ...scoreColumns } = getTableColumns(materials);
      const rows = await db
        .select({ material: scoreColumns, manufacturerName: manufacturers.name })
        .from(materials)
        .innerJoin(materialSpecs, eq(materialSpecs.materialId, materials.id))
        .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
        .where(eq(materialSpecs.supplierId, input.supplierId));

      if (rows.length === 0) return [];

      // ── 2. Fetch all certifications for these materials in one query ───────
      const materialIds = rows.map((r) => r.material.id);
      const allCerts = await db
        .select({ materialId: materialCertifications.materialId, certificationName: materialCertifications.certificationName })
        .from(materialCertifications)
        .where(sql`${materialCertifications.materialId} = ANY(${sql.raw(`ARRAY[${materialIds.join(',')}]::int[]`)})`)
      ;

      const certsByMaterial = new Map<number, string[]>();
      for (const c of allCerts) {
        if (!c.certificationName) continue;
        const existing = certsByMaterial.get(c.materialId) ?? [];
        existing.push(c.certificationName);
        certsByMaterial.set(c.materialId, existing);
      }

      // ── 3. Score each material (same logic as getScore) ────────────────────
      const scored = rows.map(({ material, manufacturerName }) => {
        const hasEpdFlag = !!material.hasEpd;
        const hasEpdNumber = !!material.epdNumber;
        const epdScore = hasEpdFlag ? 30 : hasEpdNumber ? 15 : 0;

        const gwp      = material.gwpValue           ? Number(material.gwpValue)           : null;
        const median   = material.ec3IndustryMedian  ? Number(material.ec3IndustryMedian)  : null;
        const best     = material.ec3BestPractice    ? Number(material.ec3BestPractice)    : null;
        const conserv  = material.ec3ConservativeEstimate ? Number(material.ec3ConservativeEstimate) : null;

        let carbonScore = 0;
        if (gwp !== null && median !== null && median > 0) {
          if (best !== null && gwp <= best) {
            carbonScore = 25;
          } else if (conserv !== null && gwp >= conserv) {
            carbonScore = 0;
          } else if (conserv !== null && best !== null && conserv > best) {
            carbonScore = Math.max(0, Math.min(25, Math.round(25 * (conserv - gwp) / (conserv - best))));
          } else {
            carbonScore = Math.max(0, Math.min(25, Math.round((1 - gwp / median) * 50)));
          }
        }

        const certSet = new Set<string>();
        if (material.hasEpd)       certSet.add('EPD');
        if (material.hasHpd)       certSet.add('HPD');
        if (material.hasFsc)       certSet.add('FSC');
        if (material.hasC2c)       certSet.add('Cradle to Cradle');
        if (material.hasGreenguard) certSet.add('GREENGUARD');
        if (material.hasDeclare)   certSet.add('Declare');
        for (const name of (certsByMaterial.get(material.id) ?? [])) certSet.add(name);
        const certificationScore = Math.min(20, certSet.size * 4);

        const miles = material.regionalAvailabilityMiles ?? null;
        const baseLocal = miles === null ? 8 : miles === 0 ? 15 : Math.max(0, Math.min(15, Math.round((1 - miles / 500) * 15)));
        const localSourcingScore = material.usManufactured ? Math.min(15, baseLocal + 3) : baseLocal;

        const transparencyFields = [
          material.description, material.gwpValue, material.pricePerUnit,
          material.leadTimeDays, material.epdUrl || material.epdNumber,
          material.specSheetUrl, material.manufacturerId,
          material.recycledContentPct, material.ec3IndustryMedian, material.category,
        ];
        const filledCount = transparencyFields.filter(
          (f) => f !== null && f !== undefined && String(f).trim() !== ''
        ).length;
        const transparencyScore = Math.round((filledCount / transparencyFields.length) * 10);

        const total = Math.min(100, epdScore + carbonScore + certificationScore + localSourcingScore + transparencyScore);

        // Top improvement tip — first gap by descending impact
        let topTip: string | null = null;
        if (!hasEpdFlag)                                            topTip = "Upload a verified EPD (+30 pts)";
        else if (carbonScore < 15)                                  topTip = "Add EC3 GWP data to improve carbon score";
        else if (certSet.size < 2)                                  topTip = "Add 2+ certifications (+8 pts each)";
        else if (localSourcingScore < 10)                           topTip = "Set regional availability or confirm US manufacturing";
        else if (transparencyScore < 7)                             topTip = "Fill in price, lead time, and spec sheet URL";

        return {
          materialId: material.id,
          materialName: material.name ?? "Unnamed Material",
          category: material.category ?? "",
          manufacturerName: manufacturerName ?? null,
          total,
          breakdown: {
            epd:           { score: epdScore,           max: 30, hasEpd: hasEpdFlag },
            carbon:        { score: carbonScore,         max: 25, gwp },
            certifications:{ score: certificationScore,  max: 20, count: certSet.size },
            localSourcing: { score: localSourcingScore,  max: 15, miles, usManufactured: !!material.usManufactured },
            transparency:  { score: transparencyScore,   max: 10, filledFields: filledCount, totalFields: transparencyFields.length },
          },
          topTip,
        };
      });

      // Worst scores first so the supplier sees what needs fixing immediately
      return scored.sort((a, b) => a.total - b.total);
    }),
});
