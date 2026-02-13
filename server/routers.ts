import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  materials,
  manufacturers,
  assemblies,
  assemblyComponents,
  materialCertifications,
  ccpsBaselines,
  ccpsScores,
  decisionMakerPersonas,
  rfqs,
  rfqItems,
  leads,
} from "../drizzle/schema";
import { eq, like, and, gte, lte, desc, asc, sql, or } from "drizzle-orm";
import { calculateCcps, personaToWeights, calcCarbonDelta } from "./ccps-engine";
import type { PersonaWeights } from "./ccps-engine";
import { handleChat } from "./agent";
import { rfqMarketplaceRouter } from "./rfq-router";
import { supplierRouter } from "./supplier-router";
import { supplierRfqRouter } from "./supplier-rfq-router";
import { subscriptionRouter } from "./subscription-router";
import { agentConversations } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
  rfqMarketplace: rfqMarketplaceRouter,
  supplier: supplierRouter,
  supplierRfq: supplierRfqRouter,
  subscription: subscriptionRouter,
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
        if (input.hasEpd !== undefined) conditions.push(eq(materials.hasEpd, input.hasEpd ? 1 : 0));
        if (input.usManufactured !== undefined) conditions.push(eq(materials.usManufactured, input.usManufactured ? 1 : 0));
        if (input.maxGwp !== undefined) conditions.push(lte(materials.gwpValue, String(input.maxGwp)));

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

        if (input.sortBy === "ccps") {
          items.sort((a, b) =>
            input.sortOrder === "desc"
              ? b.ccps.ccpsTotal - a.ccps.ccpsTotal
              : a.ccps.ccpsTotal - b.ccps.ccpsTotal
          );
        } else if (input.sortBy === "carbon") {
          items.sort((a, b) => {
            const aVal = Number(a.gwpValue) || 0;
            const bVal = Number(b.gwpValue) || 0;
            return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          });
        } else if (input.sortBy === "price") {
          items.sort((a, b) => {
            const aVal = Number(a.pricePerUnit) || 0;
            const bVal = Number(b.pricePerUnit) || 0;
            return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          });
        } else if (input.sortBy === "name") {
          items.sort((a, b) =>
            input.sortOrder === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name)
          );
        } else if (input.sortBy === "leadTime") {
          items.sort((a, b) => {
            const aVal = a.leadTimeDays || 0;
            const bVal = b.leadTimeDays || 0;
            return input.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          });
        }

        return { items, total };
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
        })
        .from(assemblyComponents)
        .leftJoin(materials, eq(assemblyComponents.materialId, materials.id))
        .where(eq(assemblyComponents.assemblyId, input.id))
        .orderBy(asc(assemblyComponents.layerOrder));

      return { ...rows[0], components };
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

        const result = await db.insert(rfqs).values({
          userId: ctx.user.id,
          projectName: input.projectName,
          projectLocation: input.projectLocation || null,
          projectType: input.projectType || null,
          notes: input.notes || null,
          dueDate: input.dueDate || null,
          status: "draft",
        });

        const rfqId = Number(result[0].insertId);

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

    markAsRead: protectedProcedure
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

        // Generate agent response
        const agentResponse = await generateAgentResponse({
          userId: ctx.user.id,
          conversationId: input.conversationId,
          agentType: triageResult.agentType,
          messageHistory: formattedHistory,
          conversationContext: input.conversationContext,
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

    createDirectConversation: protectedProcedure
      .input(z.object({ supplierId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getOrCreateConversation } = await import('./messaging-service');
        const conversation = await getOrCreateConversation({
          rfqId: null,
          buyerId: ctx.user.id,
          supplierId: input.supplierId,
        });
        return { conversationId: conversation.id };
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
    getAllSubscriptions: protectedProcedure.query(async ({ ctx }) => {
      // TODO: Add admin role check
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
      const { getAllSubscriptions } = await import('./microsoft-subscription-service');
      return await getAllSubscriptions();
    }),

    // Admin: Manually update user tier
    updateUserTier: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          tier: z.enum(['free', 'standard', 'premium']),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // TODO: Add admin role check
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized: Admin access required');
        }
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
