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
import { rankSuppliersWithAgent, type RfqRequirements } from "../services/rfq-agent";
import { getDb } from "../db";
import { suppliers, suppliersLocation, supplierMaterialEpds, supplierBuyerFitInputs } from "../../drizzle/schema";
import { eq, or, inArray, and, gt, isNull, desc } from "drizzle-orm";
import { getShippingClass, isWithinServiceArea } from "../lib/shipping-classes";
import { calculateDistance as haversineMiles } from "../location-service";
import {
  scoreCandidate,
  loadPersonaWeights,
  type EnrichedCandidate,
  type ScoreBreakdown,
  type ScoringIntent,
  type PersonaKey,
} from "./scoring/composite-score";

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

  /** Per-candidate composite score breakdowns (9 metric families) — for UI display and audit */
  scoreBreakdowns: ScoreBreakdown[];

  /** Persona key used for composite scoring (for audit log + UI display) */
  personaKey: PersonaKey;
}

// ── Supplier candidate fetch ───────────────────────────────────────────────────

async function fetchCandidates(intent: ParsedRfqIntent): Promise<EnrichedCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  const category = intent.category ?? "";

  // ── Step 1: Core supplier + location query ────────────────────────────────
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
      shipsNationwide: suppliers.shipsNationwide,
      statesServed: suppliers.statesServed,
      serviceRadiusMiles: suppliers.serviceRadiusMiles,
      // Reliability vetting fields
      otifPercentage: suppliers.otifPercentage,
      avgLeadTimeDays: suppliers.avgLeadTimeDays,
      leadTimeVarianceDays: suppliers.leadTimeVarianceDays,
      supplierZScore: suppliers.supplierZScore,
      inventoryVisibility: suppliers.inventoryVisibility,
      vetLastUpdatedAt: suppliers.vetLastUpdatedAt,
    })
    .from(suppliers)
    .leftJoin(suppliersLocation, eq(suppliersLocation.supplierId, suppliers.id))
    .where(eq(suppliers.verified, true))
    .limit(100);

  if (rows.length === 0) return [];

  const supplierIds = rows.map((r) => r.id);

  // ── Step 2: Best approved EPD per supplier (lowest GWP) ──────────────────
  const now = new Date();
  const epdRows = await db
    .select({
      supplierId: supplierMaterialEpds.supplierId,
      gwpValue: supplierMaterialEpds.gwpValue,
    })
    .from(supplierMaterialEpds)
    .where(
      and(
        eq(supplierMaterialEpds.status, "approved"),
        inArray(supplierMaterialEpds.supplierId, supplierIds),
        or(
          isNull(supplierMaterialEpds.expiresAt),
          gt(supplierMaterialEpds.expiresAt, now),
        ),
      ),
    )
    .orderBy(supplierMaterialEpds.gwpValue); // ASC — lowest GWP surfaces first

  const epdMap = new Map<number, { gwpValue: number | null; hasEpd: boolean }>();
  for (const epd of epdRows) {
    if (!epdMap.has(epd.supplierId)) {
      epdMap.set(epd.supplierId, {
        gwpValue: epd.gwpValue != null ? parseFloat(epd.gwpValue) : null,
        hasEpd: true,
      });
    }
  }

  // ── Step 3: Buyer-fit inputs per supplier (most recent row) ──────────────
  const fitRows = await db
    .select()
    .from(supplierBuyerFitInputs)
    .where(inArray(supplierBuyerFitInputs.supplierId, supplierIds))
    .orderBy(desc(supplierBuyerFitInputs.computedAt));

  const fitMap = new Map<number, typeof fitRows[0]>();
  for (const row of fitRows) {
    if (!fitMap.has(row.supplierId)) fitMap.set(row.supplierId, row);
  }

  // ── Step 4: Build EnrichedCandidate[] with distance + service-area check ─
  const shippingClass = getShippingClass(category);

  const enriched: EnrichedCandidate[] = rows.map((s) => {
    const cats: string[] = Array.isArray(s.materialCategories) ? (s.materialCategories as string[]) : [];
    const certs: string[] = Array.isArray(s.certifications) ? (s.certifications as string[]) : [];
    const sustainScore = s.sustainabilityScore != null ? parseFloat(s.sustainabilityScore) : null;
    const epd = epdMap.get(s.id) ?? { gwpValue: null, hasEpd: false };
    const fit = fitMap.get(s.id);

    // Pre-compute haversine distance when project is geocoded
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
    }

    return {
      // Core identity
      id: s.id,
      companyName: s.companyName ?? `Supplier #${s.id}`,
      city: s.city ?? null,
      state: s.state ?? null,
      materialCategories: cats,
      certifications: certs,
      sustainabilityScore: sustainScore,
      isLocalSupplier: isLocal,
      matchScore: 0, // replaced by composite score in runSwapEngine
      // Carbon / EPD
      gwpValue: epd.gwpValue,
      hasEpd: epd.hasEpd,
      // Reliability vetting
      otifPercentage: s.otifPercentage != null ? parseFloat(s.otifPercentage) : null,
      avgLeadTimeDays: s.avgLeadTimeDays,
      leadTimeVarianceDays: s.leadTimeVarianceDays,
      supplierZScore: s.supplierZScore != null ? parseFloat(s.supplierZScore) : null,
      inventoryVisibility: s.inventoryVisibility ?? false,
      vetLastUpdatedAt: s.vetLastUpdatedAt ?? null,
      // Buyer-fit signals
      buyerFitScore: fit?.buyerFitScore ?? null,
      avgRfqResponseHours: fit?.avgRfqResponseHours ?? null,
      priceIndexVsMedian: fit?.priceIndexVsMedian ?? null,
      completedRfqCount: fit?.completedRfqCount ?? 0,
      noShowCount: fit?.noShowCount ?? 0,
      leadTimeDays: fit?.leadTimeDays ?? null,
      // Distance
      distanceMiles,
    };
  });

  return enriched;
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

  // ── Step 3: Fetch enriched candidate pool ────────────────────────────────────
  let candidates: EnrichedCandidate[] = [];
  try {
    candidates = await fetchCandidates(intent);
    trace.push(`Candidate pool: ${candidates.length} verified suppliers`);
  } catch (err) {
    console.error("[swapEngine] Failed to fetch candidates:", err);
    warnings.push("Could not load supplier catalog — using empty shortlist");
    trace.push("Candidate fetch failed — proceeding with empty pool");
  }

  // ── Step 3b: Composite scoring ────────────────────────────────────────────────
  // Map RequesterContext role → persona key. Extend when architect profiles carry firmType.
  const personaKey =
    _context.role === "architect" ? "architect" : "default";
  const personaWeights = await loadPersonaWeights(personaKey);

  const scoringIntent: ScoringIntent = {
    maxGwp: intent.maxGwp,
    epdRequired: intent.epdRequired,
    certifications: intent.certifications,
    projectState: intent.projectState,
    projectClimateZone: intent.projectClimateZone,
    category: intent.category,
  };

  let scoreBreakdowns: ScoreBreakdown[] = [];
  if (candidates.length > 0) {
    scoreBreakdowns = candidates.map((c) => scoreCandidate(c, scoringIntent, personaWeights));
    const scoreMap = new Map(scoreBreakdowns.map((b) => [b.supplierId, b]));
    // Stamp composite total back onto each candidate so agent ranking sees updated scores
    for (const c of candidates) {
      const bd = scoreMap.get(c.id);
      if (bd) c.matchScore = bd.total;
    }
    // Re-sort by composite score descending before sending to agent
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    trace.push(`Composite scoring complete (persona: ${personaKey}). Top score: ${candidates[0]?.matchScore ?? 0}/100`);
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
    scoreBreakdowns,
    personaKey,
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
