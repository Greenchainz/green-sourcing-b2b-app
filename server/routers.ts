import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  materials,
  manufacturers,
  assemblies,
  assemblyComponents,
  materialCertifications,
  materialAssemblySpecs,
  ewsCarbonComponents,
  ccpsBaselines,
  ccpsScores,
  decisionMakerPersonas,
  rfqs,
  rfqItems,
  leads,
} from "../drizzle/schema";
import { eq, like, and, gte, lte, desc, asc, sql, or, inArray } from "drizzle-orm";
import { calculateCcps, personaToWeights, calcCarbonDelta } from "./ccps-engine";
import type { PersonaWeights } from "./ccps-engine";
import { handleChat } from "./agent";
import { rfqMarketplaceRouter } from "./rfq-router";
import { supplierRouter } from "./supplier-router";
import { supplierRfqRouter } from "./supplier-rfq-router";
import { subscriptionRouter } from "./subscription-router";
import { agentConversations } from "../drizzle/schema";
import { adminRouter } from "./admin-router";
import { ec3Router } from "./routers/ec3-router";
import { materialSpecRouter } from "./routers/material-spec-router";
import { materialSwapRouter } from "./routers/material-swap-router";
import { agentConfigRouter } from "./agent-config-router";
import { legalRouter } from "./legal-router";
import { autodesksDARouter } from "./autodesk-sda-router";
import { txdotScraperRouter } from "./routers/txdotScraper";
import { swapValidationRouter } from "./routers/swapValidation";
import { rfqRouter } from "./routers/rfq";
import { supplierOnboardingRouter } from "./routers/supplier";
import { epdRouter } from "./routers/epd";
import { locationRouter } from "./routers/location";
import { architectRouter } from "./routers/architect";
import { manufacturerRouter } from "./manufacturer-router";
import { getAllPriceTrends, getPriceTrend } from "./services/price-trends";
import { engagementRouter } from "./engagement-router";

export const appRouter = router({
  system: systemRouter,
  rfqMarketplace: rfqMarketplaceRouter,
  supplier: supplierRouter,
  supplierRfq: supplierRfqRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  ec3: ec3Router,
  materialSpec: materialSpecRouter,
  materialSwap: materialSwapRouter,
  agentConfig: agentConfigRouter,
  legal: legalRouter,
  autodesk: autodesksDARouter,
  txdotScraper: txdotScraperRouter,
  swapValidation: swapValidationRouter,
  rfqRequests: rfqRouter,
  supplierOnboarding: supplierOnboardingRouter,
  architect: architectRouter,
  manufacturer: manufacturerRouter,
  engagement: engagementRouter,
  epd: epdRouter,
  location: locationRouter,

  // ─── Assembly Specs (EWS carbon data for Carbon Compare page) ────────────
  assemblySpecs: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(materialAssemblySpecs)
        .orderBy(asc(materialAssemblySpecs.gwpPer1000sf));
    }),

    // Full assembly + component breakdown for Carbon Compare chart
    listWithComponents: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const specs = await db
        .select()
        .from(materialAssemblySpecs)
        .orderBy(asc(materialAssemblySpecs.gwpPer1000sf));

      const components = await db
        .select()
        .from(ewsCarbonComponents)
        .orderBy(asc(ewsCarbonComponents.assemblySpecId), asc(ewsCarbonComponents.layerOrder));

      // Group components by assemblySpecId
      const componentMap = new Map<number, typeof components>();
      for (const c of components) {
        const arr = componentMap.get(c.assemblySpecId) || [];
        arr.push(c);
        componentMap.set(c.assemblySpecId, arr);
      }

      return specs.map((spec) => ({
        ...spec,
        components: componentMap.get(spec.id) || [],
      }));
    }),
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Materials ─────────────────────────────────────────────────────────────
  materials: router({
    list: publicProcedure
      .input(
        z.object({
          search: z.string().optional(),
          category: z.string().optional(),
          persona: z.string().default("default"),
          sortBy: z.enum(["ccps", "carbon", "price", "name", "leadTime"]).default("ccps"),
          sortOrder: z.enum(["asc", "desc"]).default("desc"),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          hasEpd: z.boolean().optional(),
          usManufactured: z.boolean().optional(),
          maxGwp: z.number().optional(),
          // Cert multi-filter: each adds an AND condition
          certifications: z.array(z.enum(["EPD", "HPD", "FSC", "C2C", "GREENGUARD", "Declare"])).optional(),
          // Post-filter by computed CCPS score (proxy for MCS in catalog)
          minScore: z.number().min(0).max(100).optional(),
          // ILIKE match on category — used by CSI-division quick filters
          categorySearch: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };

        const conditions: any[] = [];
        if (input.search) {
          conditions.push(
            or(
              like(materials.name, `%${input.search}%`),
              like(materials.productName, `%${input.search}%`),
              like(materials.category, `%${input.search}%`)
            )
          );
        }
        if (input.category) conditions.push(eq(materials.category, input.category));
        if (input.hasEpd !== undefined) conditions.push(eq(materials.hasEpd, input.hasEpd));
        if (input.usManufactured !== undefined) conditions.push(eq(materials.usManufactured, input.usManufactured));
        if (input.maxGwp !== undefined) conditions.push(lte(materials.gwpValue, String(input.maxGwp)));
        if (input.categorySearch) conditions.push(like(materials.category, `%${input.categorySearch}%`));
        // Cert filters — each is an AND requirement
        if (input.certifications?.includes("EPD")) conditions.push(eq(materials.hasEpd, true));
        if (input.certifications?.includes("HPD")) conditions.push(eq(materials.hasHpd, true));
        if (input.certifications?.includes("FSC")) conditions.push(eq(materials.hasFsc, true));
        if (input.certifications?.includes("C2C")) conditions.push(eq(materials.hasC2c, true));
        if (input.certifications?.includes("GREENGUARD")) conditions.push(eq(materials.hasGreenguard, true));
        if (input.certifications?.includes("Declare")) conditions.push(eq(materials.hasDeclare, true));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const rows = await db
          .select({
            material: materials,
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
        if (input.persona && input.persona !== "default") {
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

        // Post-filter by minimum CCPS score (computed, can't be done in SQL)
        const scoredItems = input.minScore !== undefined
          ? items.filter((item) => item.ccps.ccpsTotal >= (input.minScore ?? 0))
          : items;

        if (input.sortBy === "ccps") {
          scoredItems.sort((a, b) =>
            input.sortOrder === "desc"
              ? b.ccps.ccpsTotal - a.ccps.ccpsTotal
              : a.ccps.ccpsTotal - b.ccps.ccpsTotal
          );
        } else if (input.sortBy === "carbon") {
          scoredItems.sort((a, b) => {
            const aVal = Number(a.gwpValue) || 0;
            const bVal = Number(b.gwpValue) || 0;
            return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          });
        } else if (input.sortBy === "price") {
          scoredItems.sort((a, b) => {
            const aVal = Number(a.pricePerUnit) || 0;
            const bVal = Number(b.pricePerUnit) || 0;
            return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          });
        } else if (input.sortBy === "name") {
          scoredItems.sort((a, b) =>
            input.sortOrder === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name)
          );
        } else if (input.sortBy === "leadTime") {
          scoredItems.sort((a, b) => {
            const aVal = a.leadTimeDays || 0;
            const bVal = b.leadTimeDays || 0;
            return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          });
        }

        return { items: scoredItems, total };
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select({
          material: materials,
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

      const altRows = await db
        .select({
          material: materials,
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

    // ── Material Credit Score ──────────────────────────────────────────────
    getScore: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const rows = await db
          .select({ material: materials, manufacturerName: manufacturers.name })
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

        // ── EPD Verified (30 pts) ────────────────────────────────────────
        const hasEpdFlag = !!material.hasEpd;
        const hasEpdNumber = !!material.epdNumber;
        const epdScore = hasEpdFlag ? 30 : hasEpdNumber ? 15 : 0;

        // ── Carbon Performance (25 pts) ──────────────────────────────────
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
            // Fallback: score by how far below the median
            const ratio = gwp / median;
            carbonScore = Math.max(0, Math.min(25, Math.round((1 - ratio) * 50)));
          }
        }

        // ── Certifications (20 pts, 4 pts each, max 5 unique) ───────────
        const certSet = new Set<string>();
        if (material.hasEpd) certSet.add("EPD");
        if (material.hasHpd) certSet.add("HPD");
        if (material.hasFsc) certSet.add("FSC");
        if (material.hasC2c) certSet.add("Cradle to Cradle");
        if (material.hasGreenguard) certSet.add("GREENGUARD");
        if (material.hasDeclare) certSet.add("Declare");
        for (const c of certs) if (c.certificationName) certSet.add(c.certificationName);
        const certificationScore = Math.min(20, certSet.size * 4);
        const certNames = Array.from(certSet);

        // ── Local Sourcing (15 pts) ──────────────────────────────────────
        const miles = material.regionalAvailabilityMiles ?? null;
        const baseLocal = miles === null ? 8 : miles === 0 ? 15 : Math.max(0, Math.min(15, Math.round((1 - miles / 500) * 15)));
        const localSourcingScore = material.usManufactured ? Math.min(15, baseLocal + 3) : baseLocal;

        // ── Transparency (10 pts) ────────────────────────────────────────
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
          (f) => f !== null && f !== undefined && String(f).trim() !== ""
        ).length;
        const transparencyScore = Math.round((filledCount / transparencyFields.length) * 10);

        const total = Math.min(100, epdScore + carbonScore + certificationScore + localSourcingScore + transparencyScore);

        // ── History (6 months, deterministic from materialId) ────────────
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

    getPriceTrends: publicProcedure.query(() => {
      return getAllPriceTrends();
    }),

    getPriceTrend: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(({ input }) => {
        return getPriceTrend(input.category);
      }),
  }),

  // ─── Assemblies ────────────────────────────────────────────────────────────
  assemblies: router({
    list: publicProcedure
      .input(
        z.object({
          assemblyType: z.string().optional(),
          tier: z.enum(["good", "better", "best"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions: any[] = [];
        if (input?.assemblyType) conditions.push(eq(assemblies.assemblyType, input.assemblyType));
        if (input?.tier) conditions.push(eq(assemblies.sustainabilityTier, input.tier));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        return db.select().from(assemblies).where(whereClause).orderBy(asc(assemblies.totalGwpPer1000Sqft));
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db.select().from(assemblies).where(eq(assemblies.id, input.id)).limit(1);
      if (rows.length === 0) return null;

      const components = await db
        .select({
          component: assemblyComponents,
          materialName: materials.name,
          materialProductName: materials.productName,
          materialRValue: materials.rValue,
          materialEmbodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
          materialPricePerUnit: materials.pricePerUnit,
          materialPriceUnit: materials.priceUnit,
          materialFireRating: materials.fireRating,
        })
        .from(assemblyComponents)
        .leftJoin(materials, eq(assemblyComponents.materialId, materials.id))
        .where(eq(assemblyComponents.assemblyId, input.id))
        .orderBy(asc(assemblyComponents.layerOrder));

      return { ...rows[0], components };
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255),
          code: z.string().max(50).nullable().optional(),
          description: z.string().nullable().optional(),
          sustainabilityTier: z.enum(["good", "better", "best"]).nullable().optional(),
          fireRating: z.string().max(50).nullable().optional(),
          components: z.array(
            z.object({
              materialId: z.number().nullable().optional(),
              layerOrder: z.number().int().min(1),
              layerName: z.string().min(1).max(255),
              thickness: z.string().max(50).nullable().optional(),
              gwpContribution: z.number().nullable().optional(),
              notes: z.string().nullable().optional(),
            })
          ).min(1),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db.select({ id: assemblies.id }).from(assemblies).where(eq(assemblies.id, input.id)).limit(1);
        if (existing.length === 0) {
          throw new Error("Assembly not found");
        }

        const materialIds = Array.from(
          new Set(
            input.components
              .map((component) => component.materialId)
              .filter((value): value is number => typeof value === "number")
          )
        );

        const linkedMaterials = materialIds.length > 0
          ? await db
              .select({
                id: materials.id,
                embodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
                rValue: materials.rValue,
                pricePerUnit: materials.pricePerUnit,
              })
              .from(materials)
              .where(inArray(materials.id, materialIds))
          : [];

        const materialMap = new Map(linkedMaterials.map((material) => [material.id, material]));

        const totalGwp = input.components.reduce((sum, component) => {
          const material = component.materialId ? materialMap.get(component.materialId) : undefined;
          const componentGwp = component.gwpContribution ?? Number(material?.embodiedCarbonPer1000sf ?? 0);
          return sum + (Number.isFinite(componentGwp) ? componentGwp : 0);
        }, 0);

        const totalRValue = input.components.reduce((sum, component) => {
          const material = component.materialId ? materialMap.get(component.materialId) : undefined;
          return sum + Number(material?.rValue ?? 0);
        }, 0);

        const estimatedCostPer1000Sqft = input.components.reduce((sum, component) => {
          const material = component.materialId ? materialMap.get(component.materialId) : undefined;
          return sum + Number(material?.pricePerUnit ?? 0);
        }, 0);

        await db
          .update(assemblies)
          .set({
            name: input.name,
            code: input.code ?? null,
            description: input.description ?? null,
            sustainabilityTier: input.sustainabilityTier ?? "good",
            fireRating: input.fireRating ?? null,
            totalGwpPer1000Sqft: totalGwp.toFixed(2),
            totalRValue: totalRValue.toFixed(2),
            estimatedCostPer1000Sqft: estimatedCostPer1000Sqft.toFixed(2),
          })
          .where(eq(assemblies.id, input.id));

        await db.delete(assemblyComponents).where(eq(assemblyComponents.assemblyId, input.id));
        await db.insert(assemblyComponents).values(
          input.components.map((component, index) => ({
            assemblyId: input.id,
            materialId: component.materialId ?? null,
            layerOrder: component.layerOrder || index + 1,
            layerName: component.layerName,
            thickness: component.thickness ?? null,
            gwpContribution:
              component.gwpContribution === null || component.gwpContribution === undefined
                ? null
                : Number(component.gwpContribution).toFixed(4),
            notes: component.notes ?? null,
          }))
        );

        return {
          id: input.id,
          totalGwpPer1000Sqft: totalGwp.toFixed(2),
          totalRValue: totalRValue.toFixed(2),
          estimatedCostPer1000Sqft: estimatedCostPer1000Sqft.toFixed(2),
        };
      }),
  }),

  // ─── Personas ──────────────────────────────────────────────────────────────
  personas: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(decisionMakerPersonas);
    }),
  }),

  // ─── RFQ ───────────────────────────────────────────────────────────────────
  rfq: router({
    create: protectedProcedure
      .input(
        z.object({
          projectName: z.string().min(1),
          projectLocation: z.string().optional(),
          projectType: z.string().optional(),
          notes: z.string().optional(),
          dueDate: z.date().optional(),
          items: z.array(
            z.object({
              materialId: z.number().optional(),
              assemblyId: z.number().optional(),
              quantity: z.number().optional(),
              quantityUnit: z.string().optional(),
              notes: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [rfqResult] = await db.insert(rfqs).values({
          userId: ctx.user.id,
          projectName: input.projectName,
          projectLocation: input.projectLocation || null,
          projectType: input.projectType || null,
          notes: input.notes || null,
          dueDate: input.dueDate || null,
          status: "draft",
        }).returning({ id: rfqs.id });

        const rfqId = rfqResult.id;

        if (input.items.length > 0) {
          await db.insert(rfqItems).values(
            input.items.map((item) => ({
              rfqId,
              materialId: item.materialId || null,
              assemblyId: item.assemblyId || null,
              quantity: item.quantity ? String(item.quantity) : null,
              quantityUnit: item.quantityUnit || null,
              notes: item.notes || null,
            }))
          );
        }

        return { id: rfqId, status: "draft" };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(rfqs)
        .where(eq(rfqs.userId, ctx.user.id))
        .orderBy(desc(rfqs.createdAt));
    }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select()
        .from(rfqs)
        .where(and(eq(rfqs.id, input.id), eq(rfqs.userId, ctx.user.id)))
        .limit(1);
      if (rows.length === 0) return null;

      const items = await db
        .select({
          item: rfqItems,
          materialName: materials.name,
          assemblyName: assemblies.name,
          assemblyCode: assemblies.code,
        })
        .from(rfqItems)
        .leftJoin(materials, eq(rfqItems.materialId, materials.id))
        .leftJoin(assemblies, eq(rfqItems.assemblyId, assemblies.id))
        .where(eq(rfqItems.rfqId, input.id));

      return { ...rows[0], items };
    }),
  }),

  // ─── Agent (ChainBot) ──────────────────────────────────────────────────────
  agent: router({
    chat: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(2000),
          sessionId: z.string().min(1),
          context: z.object({
            currentPage: z.string().default("/"),
            materialId: z.number().optional(),
            assemblyId: z.number().optional(),
            cartItems: z.array(z.number()).optional(),
            projectName: z.string().optional(),
            projectLocation: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userPersona = ctx.user?.persona || "default";
        const userName = ctx.user?.name || undefined;
        const response = await handleChat(
          input.message,
          input.sessionId,
          {
            ...input.context,
            userPersona,
            userName: userName || undefined,
          },
          ctx.user?.id
        );
        return {
          content: response.content,
          agent: response.agent,
          toolsUsed: response.toolsUsed,
        };
      }),

    history: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select({
            role: agentConversations.role,
            content: agentConversations.content,
            agent: agentConversations.agent,
            createdAt: agentConversations.createdAt,
          })
          .from(agentConversations)
          .where(eq(agentConversations.sessionId, input.sessionId))
          .orderBy(asc(agentConversations.createdAt))
          .limit(50);
        return rows;
      }),
  }),

  // ─── Leads ─────────────────────────────────────────────────────────────────
  leads: router({
    submit: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().optional(),
          company: z.string().optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.insert(leads).values({
          email: input.email,
          name: input.name || null,
          company: input.company || null,
          source: input.source || null,
        });
        return { success: true };
      }),
   }),
  
  // ─── Material Swaps ───────────────────────────────────────────────────────
  materialSwaps: router({
    findCandidates: publicProcedure
      .input(
        z.object({
          materialId: z.number(),
          limit: z.number().min(1).max(20).default(5),
        })
      )
      .query(async ({ input }) => {
        const { findSwapCandidates } = await import('./material-swap-service');
        return findSwapCandidates(input.materialId, input.limit);
      }),

    getSavedSwaps: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(async ({ input }) => {
        const { getSavedSwaps } = await import('./material-swap-service');
        return getSavedSwaps(input.materialId);
      }),

    saveSwap: protectedProcedure
      .input(
        z.object({
          materialId: z.number(),
          swapMaterialId: z.number(),
          swapReason: z.string(),
          swapScore: z.number().min(0).max(100),
          swapTier: z.enum(["good", "better", "best"]),
          confidence: z.number().min(0).max(100),
          createdBy: z.enum(["algorithm", "agent", "admin"]).default("admin"),
        })
      )
      .mutation(async ({ input }) => {
        const { saveSwapRecommendation } = await import('./material-swap-service');
        const swapId = await saveSwapRecommendation(
          input.materialId,
          input.swapMaterialId,
          input.swapReason,
          input.swapScore,
          input.swapTier,
          input.confidence,
          input.createdBy
        );
        return { swapId, success: swapId > 0 };
      }),

    calculateScore: publicProcedure
      .input(
        z.object({
          originalMaterialId: z.number(),
          candidateMaterialId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const { calculateSwapScore } = await import('./material-swap-service');
        return calculateSwapScore(input.originalMaterialId, input.candidateMaterialId);
      }),
  }),

  // ─── Real-Time Messaging ──────────────────────────────────────────────────
  messaging: router({
    getAccessToken: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getWebSocketAccessToken } = await import('./webpubsub-manager');
        return getWebSocketAccessToken(ctx.user.id, input.threadId);
      }),

    sendMessage: protectedProcedure
      .input(
        z.object({
          threadId: z.number(),
          message: z.string().min(1).max(1000),
          isBuyer: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { sendMessageToThread } = await import('./webpubsub-manager');
        return sendMessageToThread(input.threadId, ctx.user.id, input.message, input.isBuyer);
      }),

    getThreadMessages: protectedProcedure
      .input(
        z.object({
          threadId: z.number(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const { getThreadMessages } = await import('./webpubsub-manager');
        return getThreadMessages(input.threadId, input.limit, input.offset);
      }),

    markMessageAsRead: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input }) => {
        const { markMessageAsRead } = await import('./webpubsub-manager');
        return markMessageAsRead(input.messageId);
      }),

    broadcastTyping: protectedProcedure
      .input(
        z.object({
          threadId: z.number(),
          isBuyer: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { broadcastTypingIndicator } = await import('./webpubsub-manager');
        return broadcastTypingIndicator(input.threadId, ctx.user.id, input.isBuyer);
      }),

    closeThread: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .mutation(async ({ input }) => {
        const { closeThread } = await import('./webpubsub-manager');
        return closeThread(input.threadId);
      }),

    // ─── Conversation-based messaging ─────────────────────────────────────────
    getOrCreateConversation: protectedProcedure
      .input(
        z.object({
          rfqId: z.number().optional().nullable(),
          buyerId: z.number(),
          supplierId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const { getOrCreateConversation } = await import('./messaging-service');
        return await getOrCreateConversation(input);
      }),

    getConversations: protectedProcedure.query(async ({ ctx }) => {
      const { getUserConversations } = await import('./messaging-service');
      return await getUserConversations(ctx.user.id);
    }),

    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const { getConversationMessages } = await import('./messaging-service');
        return await getConversationMessages(input.conversationId);
      }),

    send: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check message limit before sending
        const { checkMessageLimit } = await import('./messaging-paywall');
        const limitCheck = await checkMessageLimit(ctx.user.id, input.conversationId);
        
        if (!limitCheck.canSend) {
          throw new Error(limitCheck.reason || 'Message limit reached');
        }

        const { sendMessage } = await import('./messaging-service');
        return await sendMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: input.content,
        });
      }),

    // Mark all messages in a conversation as read for the current user
    markAsRead: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { markMessagesAsRead } = await import('./messaging-service');
        await markMessagesAsRead({ conversationId: input.conversationId, userId: ctx.user.id });
        return { ok: true as const };
      }),

    // Total unread message count (used for nav badge)
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadMessageCount } = await import('./messaging-service');
      const count = await getUnreadMessageCount(ctx.user.id);
      return { count };
    }),

    // Send message with agent response
    sendWithAgent: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().min(1),
          conversationContext: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { triageMessage, incrementAgentMessageCount, checkHandoffRules, updateHandoffStatus } = await import('./agent-triage-service');
        const { generateAgentResponse } = await import('./agent-response-handler');
        const { sendMessage, getConversationMessages } = await import('./messaging-service');
        const { getDb } = await import('./db');
        const { conversations } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // Save user message
        await sendMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: input.content,
        });

        // Get conversation details
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.conversationId))
          .limit(1);

        if (conv.length === 0) throw new Error('Conversation not found');

        const conversation = conv[0];

        // Check if conversation should be handed off to human
        const handoffCheck = await checkHandoffRules({
          conversationId: input.conversationId,
          supplierId: conversation.supplierId,
          agentMessageCount: conversation.agentMessageCount,
        });

        if (handoffCheck.shouldHandoff) {
          await updateHandoffStatus({
            conversationId: input.conversationId,
            handoffStatus: 'pending_handoff',
            handoffReason: handoffCheck.reason,
          });

          // Send handoff message
          await sendMessage({
            conversationId: input.conversationId,
            senderId: ctx.user.id, // System message
            content: `I've handled your initial questions, but I think you'd benefit from speaking with a human representative. ${handoffCheck.reason}. A team member will respond shortly.`,
          });

          return { success: true, handedOff: true };
        }

        // Triage message to determine agent type
        const triageResult = await triageMessage({
          userId: ctx.user.id,
          conversationId: input.conversationId,
          messageContent: input.content,
          conversationContext: input.conversationContext,
        });

        if (triageResult.shouldHandoff) {
          await updateHandoffStatus({
            conversationId: input.conversationId,
            handoffStatus: 'pending_handoff',
            handoffReason: 'User requested human contact',
          });

          await sendMessage({
            conversationId: input.conversationId,
            senderId: ctx.user.id,
            content: "I'll connect you with a human representative right away. Someone from our team will respond shortly.",
          });

          return { success: true, handedOff: true };
        }

        // Get message history for context
        const messageHistory = await getConversationMessages(input.conversationId);
        const formattedHistory = messageHistory.slice(-10).map((msg) => ({
          role: (msg.senderId === ctx.user.id ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content,
        }));

        // Get custom agent prompt for supplier agent (if Premium)
        let customPrompt: string | undefined;
        if (triageResult.agentType === 'supplier' && conversation.supplierId) {
          const { agentHandoffRules } = await import('../drizzle/agent-handoff-schema');
          const rules = await db
            .select({ customAgentPrompt: agentHandoffRules.customAgentPrompt })
            .from(agentHandoffRules)
            .where(eq(agentHandoffRules.supplierId, conversation.supplierId))
            .limit(1);

          if (rules.length > 0 && rules[0].customAgentPrompt) {
            customPrompt = rules[0].customAgentPrompt;
          }
        }

        // Generate agent response
        const agentResponse = await generateAgentResponse({
          userId: ctx.user.id,
          conversationId: input.conversationId,
          agentType: triageResult.agentType,
          messageHistory: formattedHistory,
          conversationContext: input.conversationContext,
          customPrompt,
        });

        // Save agent response
        await sendMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id, // Use system user ID in production
          content: agentResponse,
        });

        // Increment agent message count
        await incrementAgentMessageCount(input.conversationId);

        return { success: true, handedOff: false, agentType: triageResult.agentType };
      }),

    sendMessageWithAttachment: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.string().optional(),
        attachmentName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { messages, conversations } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Insert message with attachment
        const result = await db.insert(messages).values({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: input.content,
          attachmentUrl: input.attachmentUrl,
          attachmentType: input.attachmentType,
          attachmentName: input.attachmentName,
        });

        // Update conversation lastMessage and lastMessageAt
        const messagePreview = input.attachmentType 
          ? `📎 ${input.attachmentName || 'Attachment'}`
          : (input.content.length > 50 ? input.content.substring(0, 50) + "..." : input.content);
        
        await db
          .update(conversations)
          .set({ 
            lastMessageAt: new Date(),
            lastMessage: messagePreview,
          })
          .where(eq(conversations.id, input.conversationId));

        return { success: true, messageId: Number(result[0].insertId) };
      }),

    markConversationAsRead: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { markMessagesAsRead } = await import('./messaging-service');
        return await markMessagesAsRead({
          conversationId: input.conversationId,
          userId: ctx.user.id,
        });
      }),

    getUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadMessageCount } = await import('./messaging-service');
      return await getUnreadMessageCount(ctx.user.id);
    }),

    addReaction: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        reactionType: z.enum(["thumbs_up", "thumbs_down", "heart", "party", "check"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { messageReactions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check if user already reacted with this type
        const existing = await db
          .select()
          .from(messageReactions)
          .where(
            and(
              eq(messageReactions.messageId, input.messageId),
              eq(messageReactions.userId, ctx.user.id),
              eq(messageReactions.reactionType, input.reactionType)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Remove reaction if already exists (toggle)
          await db
            .delete(messageReactions)
            .where(eq(messageReactions.id, existing[0].id));
          return { added: false };
        }

        // Add new reaction
        await db.insert(messageReactions).values({
          messageId: input.messageId,
          userId: ctx.user.id,
          reactionType: input.reactionType,
        });

        return { added: true };
      }),

    getMessageReactions: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { messageReactions } = await import('../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get reaction counts grouped by type
        const reactions = await db
          .select({
            reactionType: messageReactions.reactionType,
            count: sql<number>`COUNT(*)`
          })
          .from(messageReactions)
          .where(eq(messageReactions.messageId, input.messageId))
          .groupBy(messageReactions.reactionType);

        return reactions;
      }),

    pinConversation: protectedProcedure
      .input(z.object({ conversationId: z.number(), pinned: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { conversations } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify user is part of conversation
        const conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.conversationId))
          .limit(1);

        if (conversation.length === 0) {
          throw new Error("Conversation not found");
        }

        const conv = conversation[0];
        if (conv.buyerId !== ctx.user.id && conv.supplierId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        await db
          .update(conversations)
          .set({ isPinned: input.pinned ? 1 : 0 })
          .where(eq(conversations.id, input.conversationId));

        return { success: true };
      }),

    archiveConversation: protectedProcedure
      .input(z.object({ conversationId: z.number(), archived: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { conversations } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify user is part of conversation
        const conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.conversationId))
          .limit(1);

        if (conversation.length === 0) {
          throw new Error("Conversation not found");
        }

        const conv = conversation[0];
        if (conv.buyerId !== ctx.user.id && conv.supplierId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        await db
          .update(conversations)
          .set({ isArchived: input.archived ? 1 : 0 })
          .where(eq(conversations.id, input.conversationId));

        return { success: true };
      }),

    getUserUsageStats: protectedProcedure.query(async ({ ctx }) => {
      const { getUserUsageStats } = await import('./messaging-paywall');
      return await getUserUsageStats(ctx.user.id);
    }),

    checkMessageLimit: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { checkMessageLimit } = await import('./messaging-paywall');
        return await checkMessageLimit(ctx.user.id, input.conversationId);
      }),

    checkVideoLimit: protectedProcedure.query(async ({ ctx }) => {
      const { checkVideoLimit } = await import('./messaging-paywall');
      return await checkVideoLimit(ctx.user.id);
    }),

    getRecentSuppliers: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const { conversations, suppliers } = await import('../drizzle/schema');
      const { eq, or, desc } = await import('drizzle-orm');

      const db = await getDb();
      if (!db) return [];

      // Get conversations where user is buyer (recent suppliers are the supplierId)
      const recentConvs = await db
        .select({
          supplierId: conversations.supplierId,
          companyName: suppliers.companyName,
          city: suppliers.city,
          state: suppliers.state,
          isPremium: suppliers.isPremium,
          verified: suppliers.verified,
          certifications: suppliers.certifications,
        })
        .from(conversations)
        .innerJoin(suppliers, eq(conversations.supplierId, suppliers.id))
        .where(eq(conversations.buyerId, ctx.user.id))
        .orderBy(desc(conversations.createdAt))
        .limit(5);

      // Deduplicate by supplierId
      const uniqueSuppliers = Array.from(
        new Map(recentConvs.map((s) => [s.supplierId, { id: s.supplierId, ...s }])).values()
      );

      return uniqueSuppliers;
    }),

    createDirectConversation: protectedProcedure
      .input(z.object({ supplierId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getOrCreateConversation } = await import('./messaging-service');
        const { sendInAppNotification } = await import('./notification-service');
        const { getDb } = await import('./db');
        const { suppliers } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const conversation = await getOrCreateConversation({
          rfqId: null,
          buyerId: ctx.user.id,
          supplierId: input.supplierId,
        });

        // Get supplier user ID for notification
        const db = await getDb();
        if (db) {
          const supplier = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1);
          if (supplier.length > 0 && supplier[0].userId) {
            // Create notification for supplier
            await sendInAppNotification({
              userId: supplier[0].userId,
              type: 'new_message',
              title: 'New Direct Conversation',
              content: `${ctx.user.name} started a conversation with you`,
              relatedId: conversation.id,
            });
          }
        }

        return { conversationId: conversation.id };
      }),

    // ─── Voice/Video Calling ──────────────────────────────────────────────────
    checkCallLimit: protectedProcedure.query(async ({ ctx }) => {
      const { checkCallLimit } = await import('./calling-service');
      return await checkCallLimit(ctx.user.id);
    }),

    initiateCall: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          receiverId: z.number(),
          callType: z.enum(["voice", "video"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { initiateCall } = await import('./calling-service');
        return await initiateCall({
          conversationId: input.conversationId,
          callerId: ctx.user.id,
          receiverId: input.receiverId,
          callType: input.callType,
        });
      }),

    acceptCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const { acceptCall } = await import('./calling-service');
        return await acceptCall(input.callId);
      }),

    rejectCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const { rejectCall } = await import('./calling-service');
        await rejectCall(input.callId);
        return { success: true };
      }),

    endCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { endCall } = await import('./calling-service');
        return await endCall(input.callId, ctx.user.id);
      }),
  }),

  // ─── Video Calling (Dual System: WebRTC for Standard, ACS for Premium) ────
  videoCalling: router({    
    // WebRTC procedures (Standard tier)
    initiateWebRTCCall: protectedProcedure
      .input(
        z.object({
          calleeId: z.number(),
          conversationId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { checkVideoLimit } = await import('./messaging-paywall');
        const limitCheck = await checkVideoLimit(ctx.user.id);
        
        if (!limitCheck.canCall) {
          throw new Error(limitCheck.reason || 'Video calling limit reached');
        }

        const { initiateVideoCall } = await import('./webrtc-video-service');
        return await initiateVideoCall({
          callerId: ctx.user.id,
          calleeId: input.calleeId,
          conversationId: input.conversationId,
        });
      }),

    acceptWebRTCCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const { acceptVideoCall } = await import('./webrtc-video-service');
        return await acceptVideoCall(input.callId);
      }),

    rejectWebRTCCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const { rejectVideoCall } = await import('./webrtc-video-service');
        return await rejectVideoCall(input.callId);
      }),

    endWebRTCCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { endVideoCall } = await import('./webrtc-video-service');
        return await endVideoCall({
          callId: input.callId,
          userId: ctx.user.id,
        });
      }),

    sendWebRTCSignal: protectedProcedure
      .input(
        z.object({
          callId: z.string(),
          recipientId: z.number(),
          type: z.enum(["offer", "answer", "ice-candidate"]),
          data: z.any(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { sendSignalingData } = await import('./webrtc-video-service');
        return await sendSignalingData({
          callId: input.callId,
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          type: input.type,
          data: input.data,
        });
      }),

    // Azure Communication Services procedures (Premium tier)
    getACSToken: protectedProcedure.query(async ({ ctx }) => {
      const { getACSUserToken } = await import('./acs-video-service');
      return await getACSUserToken(ctx.user.id);
    }),

    initiateACSCall: protectedProcedure
      .input(
        z.object({
          calleeId: z.number(),
          conversationId: z.number(),
          recordingEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { checkVideoLimit } = await import('./messaging-paywall');
        const limitCheck = await checkVideoLimit(ctx.user.id);
        
        if (!limitCheck.canCall) {
          throw new Error(limitCheck.reason || 'Video calling limit reached');
        }

        // Check if user is Premium tier
        if (limitCheck.tier !== 'premium') {
          throw new Error('Azure Communication Services video calling is only available for Premium tier subscribers');
        }

        const { initiateACSVideoCall } = await import('./acs-video-service');
        return await initiateACSVideoCall({
          callerId: ctx.user.id,
          calleeId: input.calleeId,
          conversationId: input.conversationId,
          recordingEnabled: input.recordingEnabled,
        });
      }),

    acceptACSCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const { acceptACSVideoCall } = await import('./acs-video-service');
        return await acceptACSVideoCall(input.callId);
      }),

    endACSCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { endACSVideoCall } = await import('./acs-video-service');
        return await endACSVideoCall({
          callId: input.callId,
          userId: ctx.user.id,
        });
      }),

    startRecording: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const { startCallRecording } = await import('./acs-video-service');
        return await startCallRecording(input.callId);
      }),

    stopRecording: protectedProcedure
      .input(
        z.object({
          callId: z.string(),
          recordingId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { stopCallRecording } = await import('./acs-video-service');
        return await stopCallRecording(input.callId, input.recordingId);
      }),
  }),

  // ─── Microsoft Subscriptions ──────────────────────────────────────────────
  microsoftSubscription: router({
    // Get current user's subscription status
    getMySubscription: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSubscription } = await import('./microsoft-subscription-service');
      return await getUserSubscription(ctx.user.id);
    }),

    // Get current user's tier
    getMyTier: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTier } = await import('./microsoft-subscription-service');
      return await getUserTier(ctx.user.id);
    }),

    // Check if user has access to a specific tier
    checkAccess: protectedProcedure
      .input(z.object({ requiredTier: z.enum(['free', 'standard', 'premium']) }))
      .query(async ({ input, ctx }) => {
        const { userHasAccess } = await import('./microsoft-subscription-service');
        return await userHasAccess(ctx.user.id, input.requiredTier);
      }),

    // Admin: Get all subscriptions
    getAllSubscriptions: adminProcedure.query(async () => {
      const { getAllSubscriptions } = await import('./microsoft-subscription-service');
      return await getAllSubscriptions();
    }),

    // Admin: Manually update user tier
    updateUserTier: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          tier: z.enum(['free', 'standard', 'premium']),
        })
      )
      .mutation(async ({ input }) => {
        const { updateUserTier } = await import('./microsoft-subscription-service');
        return await updateUserTier(input.userId, input.tier);
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────────────────
  notifications: router({
    getUnread: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotifications } = await import('./notification-service');
      return getUnreadNotifications(ctx.user.id);
    }),
    
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotificationCount } = await import('./notification-service');
      return getUnreadNotificationCount(ctx.user.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import('./notification-service');
        return markNotificationAsRead(input.notificationId);
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { markAllNotificationsAsRead } = await import('./notification-service');
        return markAllNotificationsAsRead(ctx.user.id);
      }),
    
    send: protectedProcedure
      .input(z.object({
        userId: z.number(),
        type: z.enum(['rfq_match', 'new_message', 'bid_accepted', 'bid_rejected', 'rfq_closed']),
        title: z.string(),
        content: z.string(),
        relatedId: z.number().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sendNotification } = await import('./notification-service');
        return sendNotification(input);
      }),
  }),
});
export type AppRouter = typeof appRouter;
