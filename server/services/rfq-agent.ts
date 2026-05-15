/**
 * RFQ Agent Service
 * ─────────────────
 * Calls the Azure AI Foundry "RFQ-MATCHING" agent to semantically rank
 * supplier candidates against the live RFQ requirements.
 *
 * Architecture:
 *   matchSuppliers (scoring) → rankSuppliersWithAgent (AI re-rank) → final order
 *
 * Fallback: if the Foundry call fails or exceeds TIMEOUT_MS, the function
 * returns the candidates in their original score-based order — transparently.
 * The user never waits more than TIMEOUT_MS for Step 2 to load.
 *
 * Auth: DefaultAzureCredential (managed identity in prod, az login locally).
 * Model: configured via AZURE_AI_RFQ_MODEL env var (default: gpt-5.4).
 * Endpoint: derived from AZURE_AI_PROJECT_ENDPOINT env var.
 */
import { DefaultAzureCredential } from "@azure/identity";

// ── Config ────────────────────────────────────────────────────────────────────

const FOUNDRY_ENDPOINT =
  process.env.AZURE_AI_PROJECT_ENDPOINT ??
  "https://greenchainz-resource.services.ai.azure.com/api/projects/greenchainz";

// Agent model deployment name — must match Azure AI Foundry Studio exactly
const RFQ_MODEL = process.env.AZURE_AI_RFQ_MODEL ?? "gpt-5.4";

// OpenAI-compatible API version supported by the Foundry endpoint
const API_VERSION = "2024-12-01-preview";

// Never block the tRPC query longer than this — user gets the skeleton UI
const TIMEOUT_MS = 4000;

// Maximum suppliers to send to the agent (token budget)
const MAX_CANDIDATES = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAzureBase(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return "https://greenchainz-resource.services.ai.azure.com";
  }
}

const AZURE_BASE = getAzureBase(FOUNDRY_ENDPOINT);

// Singleton credential — avoids re-initialising the MSAL chain on every call
let _credential: DefaultAzureCredential | null = null;

function credential(): DefaultAzureCredential {
  if (!_credential) _credential = new DefaultAzureCredential();
  return _credential;
}

async function getToken(): Promise<string> {
  const tok = await credential().getToken(
    "https://cognitiveservices.azure.com/.default"
  );
  if (!tok?.token) throw new Error("[rfq-agent] Could not acquire Azure AD token");
  return tok.token;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SupplierCandidate {
  id: number;
  companyName: string;
  city: string | null;
  state: string | null;
  materialCategories: string[] | null;
  certifications: string[] | null;
  sustainabilityScore: number | null;
  isLocalSupplier: boolean;
  matchScore: number;
}

export interface RfqRequirements {
  category: string;
  description?: string;
  certifications?: string[];
  maxGwp?: number;
  projectState?: string;
  projectCity?: string;
}

export interface AgentRanking {
  /** Supplier IDs ordered best → worst fit for this RFQ */
  rankedIds: number[];
  /** IDs the agent flagged as having strong sustainability credentials */
  highSustainabilityIds: number[];
  /** One-sentence reasoning from the agent (useful for logging/debugging) */
  reasoning?: string;
  /** "agent" = AI ranked | "fallback" = score-based order used */
  source: "agent" | "fallback";
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function fallback(candidates: SupplierCandidate[]): AgentRanking {
  // Keep existing score order; mark suppliers with score ≥70 as high sustainability
  const highIds = candidates
    .filter((s) => (s.sustainabilityScore ?? 0) >= 70)
    .slice(0, 3)
    .map((s) => s.id);

  // Always surface at least one
  const final =
    highIds.length > 0
      ? highIds
      : candidates.length > 0
      ? [candidates[0].id]
      : [];

  return {
    rankedIds: candidates.map((s) => s.id),
    highSustainabilityIds: final,
    source: "fallback",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calls the RFQ-MATCHING Foundry agent to semantically re-rank the scored
 * candidate pool and identify high-sustainability options.
 *
 * Never throws — always resolves with a valid AgentRanking.
 */
export async function rankSuppliersWithAgent(
  candidates: SupplierCandidate[],
  requirements: RfqRequirements
): Promise<AgentRanking> {
  if (candidates.length === 0) {
    return { rankedIds: [], highSustainabilityIds: [], source: "fallback" };
  }

  // Trim to token budget, preserve score order within the cap
  const pool = candidates.slice(0, MAX_CANDIDATES);

  const supplierList = pool.map((s) => ({
    id: s.id,
    name: s.companyName,
    location: [s.city, s.state].filter(Boolean).join(", ") || "Unknown",
    categories: s.materialCategories ?? [],
    certifications: s.certifications ?? [],
    sustainabilityScore: s.sustainabilityScore,
    isLocal: s.isLocalSupplier,
  }));

  const userMessage = `RFQ Requirements:
- Category: ${requirements.category}
- Description: ${requirements.description ?? "Not specified"}
- Required certifications: ${(requirements.certifications ?? []).join(", ") || "None specified"}
- Max GWP: ${requirements.maxGwp != null ? `${requirements.maxGwp} kgCO₂e/kg` : "No limit"}
- Project location: ${[requirements.projectCity, requirements.projectState].filter(Boolean).join(", ") || "Not specified"}

Supplier candidates:
${JSON.stringify(supplierList, null, 2)}

Return ONLY a valid JSON object — no markdown, no extra text:
{
  "rankedIds": [/* ALL supplier IDs ordered best→worst fit for this specific RFQ */],
  "highSustainabilityIds": [/* IDs with strong sustainability credentials — at least 1 required */],
  "reasoning": "one sentence explaining the ranking logic"
}`;

  const agentCall = (async (): Promise<AgentRanking> => {
    const token = await getToken();
    const url = `${AZURE_BASE}/openai/deployments/${RFQ_MODEL}/chat/completions?api-version=${API_VERSION}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are the GreenChainz RFQ matching specialist. Rank suppliers by sustainability credentials, category fit, location proximity, and certifications. Output only valid JSON — no markdown fences, no extra text.",
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[rfq-agent] Foundry API ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = json.choices[0]?.message?.content ?? "";
    // Strip any markdown fences the model may add despite instructions
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(clean) as Partial<AgentRanking>;

    if (!Array.isArray(parsed.rankedIds)) {
      throw new Error("[rfq-agent] Response missing rankedIds array");
    }
    if (!Array.isArray(parsed.highSustainabilityIds)) {
      throw new Error("[rfq-agent] Response missing highSustainabilityIds array");
    }

    // Ensure the agent didn't hallucinate IDs that aren't in our pool
    const validIds = new Set(pool.map((s) => s.id));
    const rankedIds = parsed.rankedIds.filter((id) => validIds.has(id));
    // Append any IDs the agent omitted (safety net)
    pool.forEach((s) => { if (!rankedIds.includes(s.id)) rankedIds.push(s.id); });

    const highSustainabilityIds = parsed.highSustainabilityIds.filter((id) =>
      validIds.has(id)
    );
    // Always guarantee at least one high-sustainability pick
    if (highSustainabilityIds.length === 0 && rankedIds.length > 0) {
      highSustainabilityIds.push(rankedIds[0]);
    }

    console.log(
      `[rfq-agent] ✓ Agent ranked ${rankedIds.length} suppliers. ` +
        `High sustainability: ${highSustainabilityIds.join(", ")}. ` +
        `Reason: ${parsed.reasoning ?? "n/a"}`
    );

    return {
      rankedIds,
      highSustainabilityIds,
      reasoning: parsed.reasoning,
      source: "agent",
    };
  })();

  // Race the agent call against the hard timeout
  const timer = new Promise<AgentRanking>((resolve) =>
    setTimeout(() => {
      console.warn(`[rfq-agent] Timed out after ${TIMEOUT_MS}ms — using fallback`);
      resolve(fallback(candidates));
    }, TIMEOUT_MS)
  );

  return Promise.race([agentCall, timer]).catch((err) => {
    console.error("[rfq-agent] Unexpected error — using fallback:", err);
    return fallback(candidates);
  });
}
