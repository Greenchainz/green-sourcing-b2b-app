/**
 * Swap Engine — GreenChainz Single Reasoning Surface
 * ────────────────────────────────────────────────────
 * This is the ONLY place that:
 *   - Talks to Foundry agents for marketplace reasoning
 *   - Maps intent → enriched RFQ fields
 *   - Proposes supplier candidates
 *   - Produces a human-reviewable DRAFT
 *
 * It consumes a ParsedRfqIntent from the thin intake layer (document-intelligence.ts)
 * and returns a SwapResult. All SwapResults are DRAFT — nothing executes without
 * explicit human approval via rfq.approveDraft.
 *
 * Callers:
 *   - rfq.saveDraft (tRPC) — architect submits intent, engine enriches it
 *
 * NOT allowed to call this from:
 *   - Frontend directly
 *   - Any other service (route all reasoning through here)
 *
 * Fallback: if Foundry is unavailable, swapEngine degrades gracefully —
 * it returns the raw parsed intent with a "needs_review" flag and confidence=LOW
 * so human review catches anything uncertain.
 */

import type { ParsedRfqTextFields } from "../services/document-intelligence";
import { rankSuppliersWithAgent, type SupplierCandidate, type RfqRequirements } from "../services/rfq-agent";
import { getDb } from "../db";
import { suppliers, suppliersLocation } from "../../drizzle/schema";
import { eq, or, ilike } from "drizzle-orm";
import { getShippingClass, isWithinServiceArea, DEFAULT_RADIUS_MILES } from "../lib/shipping-classes";
import { calculateDistance as haversineMiles } from "../location-service";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Thin intent from intake LLM — what the user explicitly stated */
export interface ParsedRfqIntent {
  rawText: string;
  category?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  certifications?: string[];
  maxGwp?: number;
  epdRequired?: boolean;
  projectName?: string;
  projectType?: string;
  projectCity?: string;
  projectState?: string;
  projectZip?: string;
  /** Geocoded project coordinates (populated server-side, never from client). */
  projectLatitude?: number;
  projectLongitude?: number;
  /** ASHRAE / IECC climate zone (e.g. "4A"). Best-effort, may be null. */
  projectClimateZone?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  fieldsFound: string[];
}

/** Context the server provides — never sourced from client input */
export interface RequesterContext {
  userId: number;
  orgId?: number;
  role: "architect" | "admin" | "supplier";
  region?: string;
}

/** An AI-inferred field with a confidence note */
export interface InferredField {
  value: unknown;
  source: "explicit" | "inferred" | "missing";
  note?: string;
}

/** Full DRAFT result from the swap engine */
export interface SwapResult {
  /** Overall status — always DRAFT until human approves */
  status: "draft";

  /** Enriched intent fields, each annotated with how it was derived */
  enrichedIntent: {
    projectName: InferredField;
    projectType: InferredField;
    projectCity: InferredField;
    projectState: InferredField;
    category: InferredField;
    description: InferredField;
    quantity: InferredField;
    unit: InferredField;
    certifications: InferredField;
    maxGwp: InferredField;
    epdRequired: InferredField;
    targetDeliveryDate: InferredField;
  };

  /** Fields the system is uncertain about — must be reviewed */
  missingFields: string[];

  /** Warnings the human should consider before approving */
  warnings: string[];

  /** Proposed supplier shortlist */
  candidateSuppliers: Array<{
    supplierId: number;
    companyName: string;
    city: string | null;
    state: string | null;
    reason: string;
    confidence: "high" | "medium" | "low";
    isFallback: boolean;
    isHighSustainability: boolean;
    matchScore: number;
  }>;

  /** Reasoning trace from the matching agent (for human review display) */
  reasoningTrace: string[];

  /** Whether Foundry was reachable for this call */
  agentAvailable: boolean;

  /** How the supplier pool was sourced */
  matchSource: "agent" | "fallback";
}

// ── Supplier candidate fetch ───────────────────────────────────────────────────

async function fetchCandidates(intent: ParsedRfqIntent): Promise<SupplierCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  const category = intent.category ?? "";

  // Pull active suppliers whose categories or certifications could match
  const rows = await db
    .select({
      id: suppliers.id,
      companyName: suppliers.companyName,
      city: suppliersLocation.city,
      state: suppliersLocation.state,
      latitude: suppliersLocation.latitude,
      longitude: suppliersLocation.longitude,
      materialCategories: suppliers.materialCategories,
      certifications: suppliers.certifications,
      sustainabilityScore: suppliers.sustainabilityScore,
      // Service area fields live on the suppliers table
      shipsNationwide: suppliers.shipsNationwide,
      statesServed: suppliers.statesServed,
      serviceRadiusMiles: suppliers.serviceRadiusMiles,
    })
    .from(suppliers)
    .leftJoin(suppliersLocation, eq(suppliersLocation.supplierId, suppliers.id))
    .where(eq(suppliers.verified, true))
    .limit(100);

  if (rows.length === 0) return [];

  // Score candidates locally before sending to the agent
  const shippingClass = getShippingClass(category);

  const scored: SupplierCandidate[] = rows.map((s) => {
    const cats: string[] = Array.isArray(s.materialCategories)
      ? (s.materialCategories as string[])
      : [];
    const certs: string[] = Array.isArray(s.certifications)
      ? (s.certifications as string[])
      : [];
    // DB returns decimal as string — coerce to number
    const sustainScore = s.sustainabilityScore != null ? parseFloat(s.sustainabilityScore) : null;

    let score = 0;

    // Category match (highest weight)
    const catLower = category.toLowerCase();
    if (cats.some((c) => c.toLowerCase().includes(catLower) || catLower.includes(c.toLowerCase()))) {
      score += 40;
    }

    // Certification overlap
    const reqCerts = (intent.certifications ?? []).map((c) => c.toLowerCase());
    const certOverlap = certs.filter((c) => reqCerts.includes(c.toLowerCase())).length;
    score += Math.min(certOverlap * 10, 30);

    // EPD required but supplier doesn't have it
    if (intent.epdRequired && !certs.some((c) => c.toUpperCase() === "EPD")) {
      score -= 10;
    }

    // Sustainability score contribution (stored 0–1 decimal, scale to 0–30)
    score += Math.round((sustainScore ?? 0) * 30);

    // Geographic proximity — compute real distance when both project and supplier are geocoded.
    let distanceMiles: number | null = null;
    if (
      intent.projectLatitude != null &&
      intent.projectLongitude != null &&
      s.latitude != null &&
      s.longitude != null
    ) {
      distanceMiles = haversineMiles(
        intent.projectLatitude,
        intent.projectLongitude,
        Number(s.latitude),
        Number(s.longitude),
      );
    }

    let isLocal = false;
    if (intent.projectState) {
      isLocal = isWithinServiceArea({
        distanceMiles,
        projectState: intent.projectState,
        supplierState: s.state ?? null,
        shipsNationwide: s.shipsNationwide ?? false,
        statesServed: Array.isArray(s.statesServed) ? (s.statesServed as string[]) : null,
        serviceRadiusMiles: s.serviceRadiusMiles != null ? Number(s.serviceRadiusMiles) : null,
        shippingClass,
      });
      // Graduated proximity bonus when real distance is known; fall back to state-match bonus.
      if (isLocal) {
        if (distanceMiles == null) {
          score += 15;
        } else if (distanceMiles <= 25) {
          score += 25;
        } else if (distanceMiles <= 100) {
          score += 18;
        } else if (distanceMiles <= 250) {
          score += 12;
        } else {
          score += 6;
        }
      }
    }

    return {
      id: s.id,
      companyName: s.companyName ?? `Supplier #${s.id}`,
      city: s.city ?? null,
      state: s.state ?? null,
      materialCategories: cats,
      certifications: certs,
      sustainabilityScore: sustainScore,
      isLocalSupplier: isLocal,
      matchScore: Math.max(0, Math.min(100, score)),
    };
  });

  // Return top candidates sorted by score descending
  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);
}

// ── Field annotation helpers ──────────────────────────────────────────────────

function field(
  value: unknown,
  fieldsFound: string[],
  fieldName: string,
  inferredNote?: string
): InferredField {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return { value: null, source: "missing" };
  }
  const isExplicit = fieldsFound.includes(fieldName);
  return {
    value,
    source: isExplicit ? "explicit" : "inferred",
    note: !isExplicit ? (inferredNote ?? "AI-suggested — please verify") : undefined,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Runs the full enrichment + supplier matching pipeline against a parsed RFQ intent.
 * Always returns a SwapResult with status="draft" — nothing executes without human approval.
 * Never throws — degrades gracefully on Foundry failure.
 */
export async function runSwapEngine(
  intent: ParsedRfqIntent,
  _context: RequesterContext
): Promise<SwapResult> {
  const trace: string[] = [];
  const warnings: string[] = [];

  trace.push(`Intent received: category="${intent.category ?? "unknown"}", confidence=${intent.confidence}`);

  // ── Step 1: Identify missing required fields ─────────────────────────────────
  const missingFields: string[] = [];
  if (!intent.category) missingFields.push("category");
  if (!intent.quantity) missingFields.push("quantity");
  if (!intent.unit) missingFields.push("unit");
  if (!intent.projectCity && !intent.projectZip) missingFields.push("projectLocation");
  if (!intent.description) missingFields.push("description");

  if (missingFields.length > 0) {
    warnings.push(`Missing fields that may affect supplier matching: ${missingFields.join(", ")}`);
  }
  if (intent.confidence === "LOW") {
    warnings.push("Low AI confidence — extra review recommended before sending to suppliers");
  }
  if (intent.epdRequired) {
    warnings.push("EPD required — only suppliers with documented EPDs will be a strong fit");
  }

  trace.push(`Missing fields: [${missingFields.join(", ") || "none"}]`);

  // ── Step 2: Build enriched intent ────────────────────────────────────────────
  const enrichedIntent: SwapResult["enrichedIntent"] = {
    projectName:      field(intent.projectName,  intent.fieldsFound, "projectName"),
    projectType:      field(intent.projectType,  intent.fieldsFound, "projectType"),
    projectCity:      field(intent.projectCity,  intent.fieldsFound, "projectCity"),
    projectState:     field(intent.projectState, intent.fieldsFound, "projectState"),
    category:         field(intent.category,     intent.fieldsFound, "category"),
    description:      field(intent.description,  intent.fieldsFound, "description"),
    quantity:         field(intent.quantity,      intent.fieldsFound, "quantity"),
    unit:             field(intent.unit,          intent.fieldsFound, "unit"),
    certifications:   field(intent.certifications, intent.fieldsFound, "certifications",
                       "Standard certs for this category — verify these apply to your project"),
    maxGwp:           field(intent.maxGwp,       intent.fieldsFound, "maxGwp"),
    epdRequired:      field(intent.epdRequired ?? false, intent.fieldsFound, "epdRequired"),
    targetDeliveryDate: { value: null, source: "missing" },
  };

  // ── Step 3: Fetch and score candidate suppliers ───────────────────────────────
  let candidates: SupplierCandidate[] = [];
  try {
    candidates = await fetchCandidates(intent);
    trace.push(`Candidate pool: ${candidates.length} verified suppliers`);
  } catch (err) {
    console.error("[swapEngine] Failed to fetch candidates:", err);
    warnings.push("Could not load supplier catalog — using empty shortlist");
    trace.push("Candidate fetch failed — proceeding with empty pool");
  }

  // ── Step 4: Run Foundry agent ranking ────────────────────────────────────────
  const requirements: RfqRequirements = {
    category: intent.category ?? "",
    description: intent.description,
    certifications: intent.certifications,
    maxGwp: intent.maxGwp,
    projectState: intent.projectState,
    projectCity: intent.projectCity,
  };

  const agentResult = await rankSuppliersWithAgent(candidates, requirements);
  const agentAvailable = agentResult.source === "agent";

  if (agentAvailable) {
    trace.push(`Agent ranked ${agentResult.rankedIds.length} suppliers. ${agentResult.reasoning ?? ""}`);
  } else {
    trace.push("Foundry agent unavailable — using score-based fallback order");
    warnings.push("AI ranking unavailable — supplier order is score-based only");
  }

  // ── Step 5: Build candidate supplier list in ranked order ─────────────────────
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const highSustainabilitySet = new Set(agentResult.highSustainabilityIds);

  const candidateSuppliers: SwapResult["candidateSuppliers"] = agentResult.rankedIds
    .map((id) => {
      const c = candidateMap.get(id);
      if (!c) return null;
      const isHigh = highSustainabilitySet.has(id);
      const isFallback = c.matchScore < 20;

      let reason = "";
      if (agentAvailable) {
        reason = isHigh
          ? "Selected by AI for strong sustainability credentials"
          : "Matched by category and location";
      } else {
        reason = `Score-based match: ${c.matchScore}/100`;
      }

      return {
        supplierId: c.id,
        companyName: c.companyName,
        city: c.city,
        state: c.state,
        reason,
        confidence: (c.matchScore >= 60 ? "high" : c.matchScore >= 35 ? "medium" : "low") as "high" | "medium" | "low",
        isFallback,
        isHighSustainability: isHigh,
        matchScore: c.matchScore,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 10);

  if (candidateSuppliers.length === 0) {
    warnings.push("No matching suppliers found — consider broadening the category or location");
  }

  trace.push(`Final shortlist: ${candidateSuppliers.length} suppliers`);

  return {
    status: "draft",
    enrichedIntent,
    missingFields,
    warnings,
    candidateSuppliers,
    reasoningTrace: trace,
    agentAvailable,
    matchSource: agentResult.source,
  };
}

/**
 * Converts a ParsedRfqTextFields (from document-intelligence) into a ParsedRfqIntent
 * suitable for the swap engine.
 *
 * `geocode` is optional; pass it after running `geocodeProjectLocation()` so
 * `fetchCandidates` can compute real distance to each supplier.
 */
export function intentFromParsed(
  parsed: ParsedRfqTextFields,
  rawText: string,
  projectZip?: string,
  geocode?: {
    latitude?: number | null;
    longitude?: number | null;
    climateZone?: string | null;
  },
): ParsedRfqIntent {
  return {
    rawText,
    category: parsed.category || undefined,
    description: parsed.description || undefined,
    quantity: parsed.quantity ?? undefined,
    unit: parsed.unit ?? undefined,
    certifications: parsed.certifications.length > 0 ? parsed.certifications : undefined,
    maxGwp: parsed.maxGwp ?? undefined,
    epdRequired: parsed.epdRequired || undefined,
    projectName: parsed.projectName ?? undefined,
    projectType: parsed.projectType ?? undefined,
    projectCity: parsed.projectCity ?? undefined,
    projectState: parsed.projectState ?? undefined,
    projectZip,
    projectLatitude: geocode?.latitude ?? undefined,
    projectLongitude: geocode?.longitude ?? undefined,
    projectClimateZone: geocode?.climateZone ?? undefined,
    confidence: parsed.confidence,
    fieldsFound: parsed.fieldsFound,
  };
}
