/**
 * Agent Configuration Router
 * 
 * Premium supplier feature: Configure AI agent handoff behavior
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { agentHandoffRules } from "../drizzle/agent-handoff-schema";
import { suppliers, agentAnalytics, supplierSubscriptions } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const agentConfigRouter = router({
  /**
   * Get agent configuration for current supplier
   */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Get supplier ID for current user
    const supplierRows = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (supplierRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Supplier profile not found" });
    }

    const supplier = supplierRows[0];

    // Check Premium access
    const subscriptionRows = await db
      .select({ tier: supplierSubscriptions.tier, status: supplierSubscriptions.status })
      .from(supplierSubscriptions)
      .where(eq(supplierSubscriptions.supplierId, supplier.id))
      .limit(1);

    const subscription = subscriptionRows[0];
    if (!subscription || subscription.tier !== "premium" || subscription.status !== "active") {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Agent configuration is a Premium feature. Upgrade to access." 
      });
    }

    // Get or create agent handoff rules
    let rules = await db
      .select()
      .from(agentHandoffRules)
      .where(eq(agentHandoffRules.supplierId, supplier.id))
      .limit(1);

    if (rules.length === 0) {
      // Create default rules
      const [newRule] = await db.insert(agentHandoffRules).values({
        supplierId: supplier.id,
        handoffMode: "hybrid",
        maxAgentMessages: 5,
        businessHoursEnabled: 0,
        customAgentPrompt: null,
        autoDeflectEnabled: 1,
      });

      rules = await db
        .select()
        .from(agentHandoffRules)
        .where(eq(agentHandoffRules.id, newRule.insertId))
        .limit(1);
    }

    return rules[0];
  }),

  /**
   * Update agent configuration
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        handoffMode: z.enum(["always_agent", "hybrid", "immediate_human"]).optional(),
        maxAgentMessages: z.number().min(1).max(20).optional(),
        businessHoursEnabled: z.number().min(0).max(1).optional(),
        businessHoursStart: z.string().optional(),
        businessHoursEnd: z.string().optional(),
        businessDays: z.string().optional(),
        timezone: z.string().optional(),
        customAgentPrompt: z.string().max(2000).optional(),
        autoDeflectEnabled: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get supplier ID
      const supplierRows = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (supplierRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier profile not found" });
      }

      const supplier = supplierRows[0];

      // Check Premium access
      const subscriptionRows = await db
        .select({ tier: supplierSubscriptions.tier, status: supplierSubscriptions.status })
        .from(supplierSubscriptions)
        .where(eq(supplierSubscriptions.supplierId, supplier.id))
        .limit(1);

      const subscription = subscriptionRows[0];
      if (!subscription || subscription.tier !== "premium" || subscription.status !== "active") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Agent configuration is a Premium feature. Upgrade to access." 
        });
      }

      // Update rules
      await db
        .update(agentHandoffRules)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(agentHandoffRules.supplierId, supplier.id));

      return { success: true };
    }),

  /**
   * Get agent analytics for current supplier
   */
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Get supplier ID
    const supplierRows = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (supplierRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Supplier profile not found" });
    }

    const supplier = supplierRows[0];

    // Check Premium access
    const subscriptionRows = await db
      .select({ tier: supplierSubscriptions.tier, status: supplierSubscriptions.status })
      .from(supplierSubscriptions)
      .where(eq(supplierSubscriptions.supplierId, supplier.id))
      .limit(1);

    const subscription = subscriptionRows[0];
    if (!subscription || subscription.tier !== "premium" || subscription.status !== "active") {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Agent analytics is a Premium feature. Upgrade to access." 
      });
    }

    // Get analytics from agent_analytics table
    const analyticsRows = await db
      .select({
        totalConversations: sql<number>`COUNT(DISTINCT ${agentAnalytics.sessionId})`,
        totalMessages: sql<number>`COUNT(*)`,
        avgResponseTime: sql<number>`AVG(${agentAnalytics.responseTimeMs})`,
        handoffRate: sql<number>`AVG(${agentAnalytics.escalated}) * 100`,
        humanHandoffRate: sql<number>`AVG(${agentAnalytics.handedOffToHuman}) * 100`,
      })
      .from(agentAnalytics)
      .where(eq(agentAnalytics.agent, "supplier"));

    const analytics = analyticsRows[0] || {
      totalConversations: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      handoffRate: 0,
      humanHandoffRate: 0,
    };

    // Get agent handoff rules for stored analytics
    const rulesRows = await db
      .select({
        totalConversations: agentHandoffRules.totalConversations,
        agentResolutionRate: agentHandoffRules.agentResolutionRate,
        avgMessagesBeforeHandoff: agentHandoffRules.avgMessagesBeforeHandoff,
      })
      .from(agentHandoffRules)
      .where(eq(agentHandoffRules.supplierId, supplier.id))
      .limit(1);

    const storedAnalytics = rulesRows[0] || {
      totalConversations: 0,
      agentResolutionRate: 0,
      avgMessagesBeforeHandoff: 0,
    };

    return {
      totalConversations: Math.max(analytics.totalConversations, storedAnalytics.totalConversations),
      totalMessages: analytics.totalMessages,
      avgResponseTime: Math.round(analytics.avgResponseTime),
      handoffRate: Math.round(analytics.handoffRate),
      humanHandoffRate: Math.round(analytics.humanHandoffRate),
      agentResolutionRate: storedAnalytics.agentResolutionRate,
      avgMessagesBeforeHandoff: storedAnalytics.avgMessagesBeforeHandoff,
    };
  }),
});
