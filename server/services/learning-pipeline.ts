/**
 * GreenChainz Continuous Learning Pipeline
 * ──────────────────────────────────────────────────────────────────────────────
 * Enterprise-grade passive intelligence that makes the platform smarter every day.
 *
 * Architecture:
 *   1. EVENT CAPTURE — logs every meaningful user interaction (zero LLM cost)
 *   2. NIGHTLY ENRICHMENT — batch processes new signals with embeddings ($0.02/1M tokens)
 *   3. WEEKLY SYNTHESIS — GPT-4o distills patterns into actionable knowledge (~$0.50/week)
 *   4. KNOWLEDGE STORE SYNC — pushes learned insights to Azure AI Search (included in tier)
 *
 * Cost estimate with moderate usage (500 users/day):
 *   - Event logging: $0 (PostgreSQL writes)
 *   - Nightly embeddings: ~$2-5/month (text-embedding-3-small)
 *   - Weekly synthesis: ~$2/month (one GPT-4o call/week)
 *   - Azure AI Search: already provisioned
 *   - EC3 sync: free tier (1000 EPDs/month)
 *   Total: ~$10-15/month for enterprise-grade learning
 *
 * Run modes:
 *   - captureEvent() — called inline from routes (synchronous, fast)
 *   - runNightlyEnrichment() — cron / Azure Timer Function (async batch)
 *   - runWeeklySynthesis() — cron / Azure Timer Function (async batch)
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { generateEmbeddingsBatch, buildSearchText } from "./embedding-service";

// ─── Learning Events Schema ───────────────────────────────────────────────────

export type LearningEventType =
  | "search_query"           // what architects search for
  | "search_zero_results"    // gaps in our catalog
  | "material_view"          // interest signal
  | "material_compare"       // which materials get compared side-by-side
  | "swap_suggested"         // SWAP engine proposed an alternative
  | "swap_accepted"          // architect chose the swap (STRONG signal)
  | "swap_rejected"          // architect rejected swap (negative signal)
  | "rfq_created"            // material entered procurement (STRONGEST signal)
  | "rfq_supplier_matched"   // which suppliers won
  | "epd_uploaded"           // new data entering system
  | "spec_parsed"            // architect uploaded a spec sheet
  | "agent_query"            // what users ask ChainBot
  | "agent_fallback"         // ChainBot couldn't answer (gap signal)
  | "supplier_profile_view"  // demand signal for supplier
  | "price_comparison";      // cost sensitivity signal

export interface LearningEvent {
  type: LearningEventType;
  userId?: number;
  orgId?: number;
  materialId?: number;
  supplierId?: number;
  query?: string;
  metadata?: Record<string, unknown>;
}

// ─── Event Capture (inline, zero-cost) ────────────────────────────────────────

/**
 * Fire-and-forget event capture. Call this from any route handler.
 * Non-blocking — errors are swallowed to never impact user experience.
 */
export function captureEvent(event: LearningEvent): void {
  void _persistEvent(event).catch((err) =>
    console.error("[learning] Failed to capture event:", err)
  );
}

async function _persistEvent(event: LearningEvent): Promise<void> {
  const db = getDb();
  await db.execute(sql`
    INSERT INTO learning_events (type, user_id, org_id, material_id, supplier_id, query, metadata)
    VALUES (
      ${event.type},
      ${event.userId ?? null},
      ${event.orgId ?? null},
      ${event.materialId ?? null},
      ${event.supplierId ?? null},
      ${event.query ?? null},
      ${event.metadata ? JSON.stringify(event.metadata) : null}
    )
  `);
}

// ─── Nightly Enrichment (batch, cheap) ────────────────────────────────────────

/**
 * Processes the day's signals and updates the knowledge layer.
 * Designed to run as an Azure Timer Function at 2 AM UTC.
 *
 * What it does:
 *   1. Embeds any new/updated materials that lack embeddings
 *   2. Computes "demand scores" from search/view/RFQ signals
 *   3. Identifies catalog gaps (searches with zero results)
 *   4. Updates material popularity rankings
 */
export async function runNightlyEnrichment(): Promise<NightlyReport> {
  const db = getDb();
  const report: NightlyReport = {
    materialsEmbedded: 0,
    gapsIdentified: [],
    demandScoresUpdated: 0,
    timestamp: new Date().toISOString(),
  };

  // 1. Embed materials that don't have embeddings yet
  const unembedded = await db.execute(sql`
    SELECT id, name, "productName", category, subcategory, description
    FROM materials
    WHERE embedding IS NULL OR embedding_updated_at < NOW() - INTERVAL '7 days'
    LIMIT 100
  `);

  if (unembedded.rows.length > 0) {
    const texts = unembedded.rows.map((m: any) =>
      buildSearchText({
        name: m.name,
        productName: m.productName,
        category: m.category,
        subcategory: m.subcategory,
        description: m.description,
      })
    );

    const embeddings = await generateEmbeddingsBatch(texts);

    for (let i = 0; i < unembedded.rows.length; i++) {
      const emb = embeddings[i];
      if (emb) {
        await db.execute(sql`
          UPDATE materials
          SET embedding = ${JSON.stringify(emb)},
              embedding_updated_at = NOW()
          WHERE id = ${(unembedded.rows[i] as any).id}
        `);
        report.materialsEmbedded++;
      }
    }
  }

  // 2. Identify catalog gaps (zero-result searches from last 24h)
  const gaps = await db.execute(sql`
    SELECT query, COUNT(*) as search_count
    FROM learning_events
    WHERE type = 'search_zero_results'
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY query
    ORDER BY search_count DESC
    LIMIT 20
  `);
  report.gapsIdentified = gaps.rows.map((r: any) => ({
    query: r.query,
    count: Number(r.search_count),
  }));

  // 3. Update demand scores (materials that get viewed/RFQ'd get boosted)
  const demandUpdate = await db.execute(sql`
    WITH demand AS (
      SELECT material_id,
        COUNT(*) FILTER (WHERE type = 'material_view') as views,
        COUNT(*) FILTER (WHERE type = 'swap_accepted') * 5 as swap_weight,
        COUNT(*) FILTER (WHERE type = 'rfq_created') * 10 as rfq_weight
      FROM learning_events
      WHERE material_id IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY material_id
    )
    UPDATE materials m
    SET demand_score = COALESCE(d.views, 0) + COALESCE(d.swap_weight, 0) + COALESCE(d.rfq_weight, 0),
        demand_updated_at = NOW()
    FROM demand d
    WHERE m.id = d.material_id
    RETURNING m.id
  `);
  report.demandScoresUpdated = demandUpdate.rows.length;

  console.log("[learning] Nightly enrichment complete:", report);
  return report;
}

// ─── Weekly Synthesis (one LLM call, high value) ──────────────────────────────

/**
 * Once per week, synthesize all learning signals into actionable intelligence.
 * This is the "brain" that turns raw data into strategic recommendations.
 *
 * Cost: ~$0.05-0.10 per run (one GPT-4o call with structured output)
 */
export async function runWeeklySynthesis(): Promise<WeeklySynthesisReport> {
  const db = getDb();

  // Gather the week's intelligence signals
  const [topSearches, topGaps, topSwaps, topRfqMaterials, agentFallbacks] =
    await Promise.all([
      // Most searched terms
      db.execute(sql`
        SELECT query, COUNT(*) as cnt
        FROM learning_events
        WHERE type = 'search_query' AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY query ORDER BY cnt DESC LIMIT 15
      `),
      // Biggest catalog gaps
      db.execute(sql`
        SELECT query, COUNT(*) as cnt
        FROM learning_events
        WHERE type = 'search_zero_results' AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY query ORDER BY cnt DESC LIMIT 10
      `),
      // Most accepted swaps (what alternatives are winning)
      db.execute(sql`
        SELECT metadata->>'swapToMaterialId' as swap_to, COUNT(*) as cnt
        FROM learning_events
        WHERE type = 'swap_accepted' AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY metadata->>'swapToMaterialId' ORDER BY cnt DESC LIMIT 10
      `),
      // Materials entering RFQs (revenue signal)
      db.execute(sql`
        SELECT m.name, m.category, COUNT(*) as rfq_count
        FROM learning_events le
        JOIN materials m ON m.id = le.material_id
        WHERE le.type = 'rfq_created' AND le.created_at > NOW() - INTERVAL '7 days'
        GROUP BY m.name, m.category ORDER BY rfq_count DESC LIMIT 10
      `),
      // Agent failures (where AI couldn't help)
      db.execute(sql`
        SELECT query, COUNT(*) as cnt
        FROM learning_events
        WHERE type = 'agent_fallback' AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY query ORDER BY cnt DESC LIMIT 10
      `),
    ]);

  // Build synthesis prompt
  const synthesisInput = {
    topSearches: topSearches.rows,
    catalogGaps: topGaps.rows,
    winningSwaps: topSwaps.rows,
    rfqMaterials: topRfqMaterials.rows,
    agentGaps: agentFallbacks.rows,
  };

  // One GPT-4o call to distill patterns
  const { invokeLLM } = await import("../_core/llm");
  const synthesis = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the GreenChainz intelligence analyst. Analyze this week's platform usage data and produce actionable recommendations. Be specific and data-driven. Format as JSON matching the schema.`,
      },
      {
        role: "user",
        content: `Here is this week's learning data:\n${JSON.stringify(synthesisInput, null, 2)}\n\nProduce a JSON report with:\n- materialGaps: [{query, searchCount, recommendation}] — what materials should we add?\n- swapInsights: [{pattern, recommendation}] — what swap patterns are emerging?\n- supplierOpportunities: [{category, demandSignal, action}] — where should we recruit suppliers?\n- agentImprovements: [{gap, fix}] — how should we improve ChainBot?\n- weeklyScore: 0-100 (platform intelligence health)\n- topRecommendation: one sentence — the #1 thing to do this week`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2000,
  });

  const report: WeeklySynthesisReport = {
    timestamp: new Date().toISOString(),
    rawData: synthesisInput,
    synthesis: JSON.parse(synthesis.content as string),
  };

  // Store the synthesis for admin dashboard
  await db.execute(sql`
    INSERT INTO learning_synthesis (report, created_at)
    VALUES (${JSON.stringify(report)}, NOW())
  `);

  console.log("[learning] Weekly synthesis complete. Score:", report.synthesis.weeklyScore);
  return report;
}

// ─── EC3 Auto-Discovery (passive catalog expansion) ───────────────────────────

/**
 * Uses catalog gaps (zero-result searches) to automatically search EC3
 * for matching EPDs and import them. Runs after nightly enrichment.
 *
 * This is the "self-healing" catalog — when architects search for something
 * we don't have, we go find it and add it automatically.
 */
export async function runAutoDiscovery(): Promise<AutoDiscoveryReport> {
  const db = getDb();
  const report: AutoDiscoveryReport = { discovered: 0, imported: 0, errors: [] };

  // Get top gaps that occurred 3+ times (real demand, not typos)
  const gaps = await db.execute(sql`
    SELECT query, COUNT(*) as cnt
    FROM learning_events
    WHERE type = 'search_zero_results'
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY query
    HAVING COUNT(*) >= 3
    ORDER BY cnt DESC
    LIMIT 5
  `);

  if (gaps.rows.length === 0) return report;

  // Dynamically import EC3 service
  const { searchEC3Materials } = await import("../ec3");

  for (const gap of gaps.rows as any[]) {
    try {
      const ec3Results = await searchEC3Materials(gap.query, { limit: 3 });
      report.discovered += ec3Results.length;

      for (const epd of ec3Results) {
        // Check if we already have it
        const existing = await db.execute(sql`
          SELECT id FROM materials WHERE ec3_id = ${epd.id} LIMIT 1
        `);
        if (existing.rows.length > 0) continue;

        // Import to materials table
        await db.execute(sql`
          INSERT INTO materials (name, category, gwp_value, gwp_unit, declared_unit, has_epd, verified, data_source, ec3_id)
          VALUES (${epd.name}, ${epd.category?.display_name ?? 'Other'}, ${epd.gwp_z}, 'kgCO2e', ${epd.declared_unit ?? '1 unit'}, true, false, 'ec3-auto-discovery', ${epd.id})
          ON CONFLICT (ec3_id) DO NOTHING
        `);
        report.imported++;
      }
    } catch (err) {
      report.errors.push(`EC3 search failed for "${gap.query}": ${err}`);
    }
  }

  console.log("[learning] Auto-discovery:", report);
  return report;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NightlyReport {
  materialsEmbedded: number;
  gapsIdentified: { query: string; count: number }[];
  demandScoresUpdated: number;
  timestamp: string;
}

interface WeeklySynthesisReport {
  timestamp: string;
  rawData: any;
  synthesis: {
    materialGaps: { query: string; searchCount: number; recommendation: string }[];
    swapInsights: { pattern: string; recommendation: string }[];
    supplierOpportunities: { category: string; demandSignal: string; action: string }[];
    agentImprovements: { gap: string; fix: string }[];
    weeklyScore: number;
    topRecommendation: string;
  };
}

interface AutoDiscoveryReport {
  discovered: number;
  imported: number;
  errors: string[];
}

// ─── Convenience: Search with learning ────────────────────────────────────────

/**
 * Wraps any material search with automatic event capture.
 * Use this instead of raw DB queries to get free learning.
 */
export function withLearning<T>(
  searchFn: (query: string) => Promise<T[]>,
  userId?: number,
): (query: string) => Promise<T[]> {
  return async (query: string) => {
    const results = await searchFn(query);

    captureEvent({
      type: results.length === 0 ? "search_zero_results" : "search_query",
      userId,
      query,
      metadata: { resultCount: results.length },
    });

    return results;
  };
}
