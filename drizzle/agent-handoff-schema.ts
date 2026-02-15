import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, tinyint } from "drizzle-orm/mysql-core";

// ─── Agent Handoff Rules (Premium Supplier Feature) ────────────────────────

export const agentHandoffRules = mysqlTable("agent_handoff_rules", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull().unique(), // One rule set per supplier
  
  // Handoff mode configuration
  handoffMode: mysqlEnum("handoffMode", ["always_agent", "hybrid", "immediate_human"])
    .default("hybrid")
    .notNull(),
  
  // Agent message threshold (for hybrid mode)
  maxAgentMessages: int("maxAgentMessages").default(5).notNull(), // Agent handles up to N messages before offering human
  
  // Business hours for human availability
  businessHoursEnabled: tinyint("businessHoursEnabled").default(0).notNull(),
  businessHoursStart: varchar("businessHoursStart", { length: 5 }), // "09:00"
  businessHoursEnd: varchar("businessHoursEnd", { length: 5 }), // "17:00"
  businessDays: varchar("businessDays", { length: 50 }).default("Mon,Tue,Wed,Thu,Fri"), // Comma-separated
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  
  // Custom agent configuration
  customAgentPrompt: text("customAgentPrompt"), // Supplier-specific agent personality/instructions
  autoDeflectEnabled: tinyint("autoDeflectEnabled").default(1).notNull(), // Try to deflect human requests
  
  // Analytics
  totalConversations: int("totalConversations").default(0).notNull(),
  agentResolutionRate: int("agentResolutionRate").default(0).notNull(), // Percentage (0-100)
  avgMessagesBeforeHandoff: int("avgMessagesBeforeHandoff").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentHandoffRule = typeof agentHandoffRules.$inferSelect;
export type InsertAgentHandoffRule = typeof agentHandoffRules.$inferInsert;
