/**
 * RFx Supplier Matcher
 *
 * Finds the best-fit verified suppliers for a Smart RFx sourcing request.
 * Runs in < 50ms — pure Drizzle, no external API calls on the critical path.
 *
 * Scoring (100 pts total):
 *   40 — material category keyword overlap
 *   30 — location match (state or shipsNationwide)
 *   20 — tier bonus (premium > standard > free)
 *   10 — sustainability / certification match
 *
 * Only approved suppliers with leadCredits > 0 are eligible.
 * Returns up to MAX_INVITES suppliers, sorted by score desc.
 */

import { getDb } from "../db";
import { suppliers } from "../../drizzle/schema";
import { eq, and, gt, or } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RfxMatchCandidate {
  supplierId:  number;
  userId:      number;
  companyName: string;
  email:       string;
  matchScore:  number;  // 0–100
}

export interface RfxMatchInput {
  requestType:            string;
  description:            string;
  projectLocation?:       string;
  requiredCertifications?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_INVITES = 10;

/** Maps RFx request types + common keywords to supplier material category slugs */
const CATEGORY_SIGNAL_MAP: Array<{ keywords: string[]; categories: string[] }> = [
  {
    keywords: ["concrete", "ready-mix", "precast", "cement", "shotcrete"],
    categories: ["concrete", "precast_concrete", "ready_mix"],
  },
  {
    keywords: ["steel", "rebar", "structural steel", "metal stud", "cold-formed", "deck"],
    categories: ["steel", "structural_steel", "metal"],
  },
  {
    keywords: ["wood", "lumber", "timber", "mass timber", "clt", "glulam", "framing"],
    categories: ["wood", "lumber", "mass_timber", "framing"],
  },
  {
    keywords: ["insulation", "mineral wool", "spray foam", "rockwool", "rigid insulation"],
    categories: ["insulation"],
  },
  {
    keywords: ["glass", "glazing", "curtain wall", "window", "fenestration"],
    categories: ["glass", "glazing"],
  },
  {
    keywords: ["masonry", "brick", "cmu", "block", "stone", "tile"],
    categories: ["masonry", "brick", "tile"],
  },
  {
    keywords: ["roofing", "membrane", "tpo", "epdm", "flat roof"],
    categories: ["roofing"],
  },
  {
    keywords: ["flooring", "carpet", "hardwood", "lvt", "terrazzo"],
    categories: ["flooring"],
  },
  {
    keywords: ["mechanical", "hvac", "plumbing", "piping", "ductwork"],
    categories: ["mechanical", "hvac"],
  },
  {
    keywords: ["electrical", "conduit", "panel", "lighting", "switchgear"],
    categories: ["electrical"],
  },
  {
    keywords: ["alternative", "substitute", "replacement", "low-carbon", "green"],
    categories: [], // matches any category — no filter applied
  },
];

/** Request types that imply all material categories (no category filter) */
const OPEN_REQUEST_TYPES = new Set([
  "rfi",
  "supplier_qualification",
  "submittal_documentation",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractStateCode(location: string | undefined): string | null {
  if (!location) return null;
  // Match 2-letter state abbreviation: "Richmond, VA" → "VA"
  const m = location.match(/\b([A-Z]{2})\b/);
  return m ? m[1] : null;
}

function inferCategoryTargets(input: RfxMatchInput): string[] | null {
  // Open request types → no category filter, match all
  if (OPEN_REQUEST_TYPES.has(input.requestType)) return null;

  const text = (input.description + " " + input.requestType).toLowerCase();
  const hits = new Set<string>();

  for (const { keywords, categories } of CATEGORY_SIGNAL_MAP) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      if (categories.length === 0) return null; // "alternative" → match all
      categories.forEach((c) => hits.add(c));
    }
  }

  return hits.size > 0 ? Array.from(hits) : null; // null = no filter
}

function scoreCandidate(
  supplier: typeof suppliers.$inferSelect,
  targetCategories: string[] | null,
  stateCode: string | null,
  requiredCerts: string[],
): number {
  let score = 0;

  // ── 40 pts: material category match ──────────────────────────────────────
  const supplierCats = (supplier.materialCategories ?? []).map((c) => c.toLowerCase());
  if (targetCategories === null) {
    // Open request — give 20 base points (all suppliers are candidates)
    score += 20;
  } else {
    const overlap = targetCategories.filter((tc) =>
      supplierCats.some((sc) => sc.includes(tc) || tc.includes(sc))
    ).length;
    score += Math.min(40, overlap * 20);
  }

  // ── 30 pts: location match ────────────────────────────────────────────────
  if (supplier.shipsNationwide) {
    score += 25;
  } else if (stateCode) {
    const served = (supplier.statesServed ?? []).map((s) => s.toUpperCase());
    if (served.includes(stateCode)) score += 30;
    else if (supplier.state?.toUpperCase() === stateCode) score += 20;
    else score += 5; // different state but not excluded
  } else {
    score += 15; // no location info — neutral
  }

  // ── 20 pts: tier bonus ────────────────────────────────────────────────────
  if (supplier.tier === "premium")  score += 20;
  else if (supplier.tier === "standard") score += 12;
  else score += 4;

  // ── 10 pts: certifications ────────────────────────────────────────────────
  if (requiredCerts.length > 0) {
    const supplierCertText = (supplier.certifications ?? []).join(" ").toLowerCase();
    const certHits = requiredCerts.filter((rc) =>
      supplierCertText.includes(rc.toLowerCase())
    ).length;
    score += Math.min(10, certHits * 5);
  } else {
    // No required certs — give partial points for EPD/LEED signals
    const certText = (supplier.certifications ?? []).join(" ").toLowerCase();
    if (certText.includes("epd") || certText.includes("leed") || certText.includes("declare")) {
      score += 5;
    }
  }

  return Math.min(100, score);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Find the best-fit verified suppliers for a Smart RFx sourcing request.
 * Returns up to MAX_INVITES candidates sorted by matchScore desc.
 * Never throws — returns [] on any error.
 */
export async function matchSuppliersForRfx(
  input: RfxMatchInput
): Promise<RfxMatchCandidate[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    // Fetch all eligible suppliers in one query
    const eligible = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.verificationStatus, "approved"),
          gt(suppliers.leadCredits, 0),
        )
      );

    if (eligible.length === 0) return [];

    const targetCategories = inferCategoryTargets(input);
    const stateCode        = extractStateCode(input.projectLocation);
    const requiredCerts    = input.requiredCertifications ?? [];

    // Score every eligible supplier
    const scored = eligible.map((s) => ({
      supplierId:  s.id,
      userId:      s.userId,
      companyName: s.companyName,
      email:       s.email,
      matchScore:  scoreCandidate(s, targetCategories, stateCode, requiredCerts),
    }));

    // Sort desc by score, return top N with score > 0
    return scored
      .filter((c) => c.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, MAX_INVITES);
  } catch (err) {
    console.error("[rfx-matcher] Error matching suppliers:", err);
    return [];
  }
}
