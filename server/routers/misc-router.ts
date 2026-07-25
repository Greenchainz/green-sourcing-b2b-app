/**
 * Miscellaneous small routers: auth, rfq (marketplace), agent, leads, materialSwaps.
 */
import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import {
  rfqs,
  rfqItems,
  materials,
  assemblies,
  leads,
  agentConversations,
} from '../../drizzle/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { handleChat } from '../agent';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  logout: publicProcedure.mutation(() => ({ success: true } as const)),
});

// ─── RFQ (marketplace) ───────────────────────────────────────────────────────

export const rfqInternalRouter = router({
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
      if (!db) throw new Error('Database not available');

      const [rfqResult] = await db.insert(rfqs).values({
        userId: ctx.user.id,
        projectName: input.projectName,
        projectLocation: input.projectLocation || null,
        projectType: input.projectType || null,
        notes: input.notes || null,
        dueDate: input.dueDate || null,
        status: 'draft',
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

      return { id: rfqId, status: 'draft' };
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
});

// ─── Agent (ChainBot) ─────────────────────────────────────────────────────────

export const agentRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        sessionId: z.string().min(1),
        context: z.object({
          currentPage: z.string().default('/'),
          materialId: z.number().optional(),
          assemblyId: z.number().optional(),
          cartItems: z.array(z.number()).optional(),
          projectName: z.string().optional(),
          projectLocation: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userPersona = ctx.user.persona || 'default';
      const userName = ctx.user.name || undefined;
      const response = await handleChat(
        input.message,
        input.sessionId,
        {
          ...input.context,
          userPersona,
          userName: userName || undefined,
        },
        ctx.user.id
      );
      return {
        content: response.content,
        agent: response.agent,
        toolsUsed: response.toolsUsed,
      };
    }),

  history: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
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
        .where(
          and(
            eq(agentConversations.sessionId, input.sessionId),
            eq(agentConversations.userId, ctx.user.id),
          )
        )
        .orderBy(asc(agentConversations.createdAt))
        .limit(50);
      return rows;
    }),
});

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leadsRouter = router({
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
});

// ─── Material Swaps ───────────────────────────────────────────────────────────

export const materialSwapsRouter = router({
  findCandidates: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input }) => {
      const { findSwapCandidates } = await import('../material-swap-service');
      return findSwapCandidates(input.materialId, input.limit);
    }),

  getSavedSwaps: protectedProcedure
    .input(z.object({ materialId: z.number() }))
    .query(async ({ input }) => {
      const { getSavedSwaps } = await import('../material-swap-service');
      return getSavedSwaps(input.materialId);
    }),

  saveSwap: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
        swapMaterialId: z.number(),
        swapReason: z.string(),
        swapScore: z.number().min(0).max(100),
        swapTier: z.enum(['good', 'better', 'best']),
        confidence: z.number().min(0).max(100),
        createdBy: z.enum(['algorithm', 'agent', 'admin']).default('admin'),
      })
    )
    .mutation(async ({ input }) => {
      const { saveSwapRecommendation } = await import('../material-swap-service');
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

  calculateScore: protectedProcedure
    .input(
      z.object({
        originalMaterialId: z.number(),
        candidateMaterialId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { calculateSwapScore } = await import('../material-swap-service');
      return calculateSwapScore(input.originalMaterialId, input.candidateMaterialId);
    }),
});
