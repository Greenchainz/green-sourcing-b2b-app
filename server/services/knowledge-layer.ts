/**
 * knowledge-layer.ts — Two-Bucket Knowledge Layer Access Guard
 * ──────────────────────────────────────────────────────────────────────────────
 * GreenChainz operates two physically separate Azure AI Foundry vector stores:
 *
 *   DOMAIN (greenchainz-domain-knowledge)
 *     Marketplace truth: suppliers, EPDs, materials, HITL decisions.
 *     Used to ground supplier matching and RFQ reasoning.
 *
 *   INTERNAL (greenchainz-internal-knowledge)
 *     Code + business intel: repos, CLAUDE.md files, ADRs, product strategy.
 *     Used by engineering agents and internal copilots ONLY.
 *
 * RULES (enforced here, not by "remembering to be careful"):
 *   ✅ Marketplace callers → DOMAIN only
 *   ✅ Engineering/copilot callers → INTERNAL only
 *   ❌ No direct frontend access (all access goes through server-side services)
 *   ❌ INTERNAL store never influences supplier ranking or RFQ decisions
 *   ❌ Human decisions (HITL approvals) always outrank AI memory
 *
 * AI pattern:
 *   Agent → retrieve from correct bucket → make DRAFT proposal → human approves
 */

// ── Store identifiers ─────────────────────────────────────────────────────────

export const DOMAIN_STORE_NAME   = "greenchainz-domain-knowledge";
export const INTERNAL_STORE_NAME = "greenchainz-internal-knowledge";

// ── Caller classifications ────────────────────────────────────────────────────

/** Callers allowed to query the domain (marketplace) knowledge store */
export type DomainCaller =
  | "swapEngine"
  | "rfqAgent"
  | "matchSuppliers"
  | "auditAgent"
  | "carbonOptimizer"
  | "complianceValidator";

/** Callers allowed to query the internal (code + business) knowledge store */
export type InternalCaller =
  | "codingAgent"
  | "architectureAgent"
  | "internalCopilot"
  | "workflowAgent"
  | "marketingAgent";

// ── Access guard ──────────────────────────────────────────────────────────────

/**
 * Returns the correct vector store name for a given caller.
 * Throws if an internal caller attempts to access the domain store
 * or vice versa — this prevents accidental cross-contamination.
 */
export function resolveKnowledgeStore(caller: DomainCaller | InternalCaller): string {
  const domainCallers = new Set<string>([
    "swapEngine", "rfqAgent", "matchSuppliers",
    "auditAgent", "carbonOptimizer", "complianceValidator",
  ]);
  const internalCallers = new Set<string>([
    "codingAgent", "architectureAgent", "internalCopilot",
    "workflowAgent", "marketingAgent",
  ]);

  if (domainCallers.has(caller)) return DOMAIN_STORE_NAME;
  if (internalCallers.has(caller)) return INTERNAL_STORE_NAME;

  // Unknown caller — fail closed (no store access)
  throw new Error(
    `[knowledge-layer] Unknown caller "${caller}". ` +
    `Add it to DomainCaller or InternalCaller in knowledge-layer.ts.`
  );
}

/**
 * Assertion helper: ensures a domain caller is not accidentally using
 * the internal store. Call at the start of any agent service function.
 *
 * @example
 *   assertDomainCaller("swapEngine");  // no-op if correct, throws if not
 */
export function assertDomainCaller(caller: string): asserts caller is DomainCaller {
  const store = resolveKnowledgeStore(caller as DomainCaller | InternalCaller);
  if (store !== DOMAIN_STORE_NAME) {
    throw new Error(
      `[knowledge-layer] Caller "${caller}" is not a domain caller. ` +
      `It cannot query the marketplace knowledge store.`
    );
  }
}

/**
 * Assertion helper: ensures an internal caller is not accidentally using
 * the domain store (which could contaminate marketplace decisions).
 */
export function assertInternalCaller(caller: string): asserts caller is InternalCaller {
  const store = resolveKnowledgeStore(caller as DomainCaller | InternalCaller);
  if (store !== INTERNAL_STORE_NAME) {
    throw new Error(
      `[knowledge-layer] Caller "${caller}" is not an internal caller. ` +
      `Use the domain store for marketplace reasoning.`
    );
  }
}

// ── Metadata types ────────────────────────────────────────────────────────────

/** Metadata required on every chunk entering the domain knowledge store */
export interface DomainChunkMeta {
  source:          "supplier_profile" | "material_catalog" | "epd" | "rfq_decision"
                 | "research_doc" | "certification_data" | "project_outcome";
  entityType:     "supplier" | "material" | "rfq" | "epd" | "certification" | "research";
  entityId:       string;   // canonical ID — no floating embeddings
  tenantScope:    string;   // orgId or "global"
  confidence:     number;   // 0.0–1.0
  lastVerifiedAt: string;   // ISO-8601 UTC
}

/** Metadata required on every chunk entering the internal knowledge store */
export interface InternalChunkMeta {
  source:         "repo_code" | "repo_config" | "architecture_doc"
                | "adr" | "product_strategy" | "ops_runbook" | "claude_md";
  domain:         "engineering" | "product" | "business" | "operations";
  ownerTeam:      "core" | "ai" | "ops" | "product";
  repo:           string;   // e.g. "green-sourcing-b2b-app"
  filePath:       string;   // relative path within repo
  confidence:     number;   // 0.0–1.0 (low confidence OK but must be labeled)
  lastReviewedAt: string;   // ISO-8601 UTC
}

// ── Retrieval context builder ─────────────────────────────────────────────────

/**
 * Builds the retrieval context object to pass to a Foundry agent.
 * The agent uses this to constrain which store it searches and how
 * it interprets results.
 *
 * Usage in swapEngine:
 *   const ctx = buildRetrievalContext("swapEngine", intent.category, intent.projectState);
 *   const agentResult = await rankSuppliersWithAgent(candidates, requirements, ctx);
 */
export function buildDomainRetrievalContext(
  caller: DomainCaller,
  category: string,
  projectState?: string,
) {
  assertDomainCaller(caller);
  return {
    storeName:    DOMAIN_STORE_NAME,
    caller,
    filters: {
      category,
      projectState: projectState ?? null,
    },
    // Human decisions always override AI memory — instruct agent to weight them highest
    prioritySignal: "human_approved_decisions_first",
  };
}
