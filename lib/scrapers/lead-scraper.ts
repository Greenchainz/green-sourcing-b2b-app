/**
 * Decision Maker Lead Scraper
 *
 * Discovers all 38 buyer-side decision maker roles via:
 *   1. Bing Web Search API (role-specific queries × 10 states)
 *   2. Azure Maps POI search (AEC business listings)
 *
 * For each new lead:
 *   → saves to scraped_leads table
 *   → upserts a CRM contact (crm_contacts)
 *   → enrolls in the buyer_role_drip email sequence
 *
 * Env vars:
 *   BING_SEARCH_API_KEY, BING_SEARCH_ENDPOINT
 *   AZURE_MAPS_CLIENT_ID (managed identity preferred)
 */

import axios from "axios";
import { getDb } from "../../server/db";
import { scrapedLeads, crmContacts, crmEmailSequences } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ROLE_CONFIGS, type RoleConfig } from "./lead-role-config";
import { getAzureMapsAuth } from "../azure/azure-maps-auth";

// ── Config ────────────────────────────────────────────────────────────────────

const BING_ENDPOINT =
  process.env.BING_SEARCH_ENDPOINT ||
  "https://api.bing.microsoft.com/v7.0/search";

const STATES = ["TX", "CA", "FL", "NY", "IL", "GA", "NC", "AZ", "CO", "WA"];

// Azure Maps POI queries for AEC firm discovery (supplements Bing)
const MAPS_QUERIES: Array<{ query: string; crmCategory: string }> = [
  { query: "architecture firm",          crmCategory: "architect_aor" },
  { query: "general contractor",         crmCategory: "project_manager_gc" },
  { query: "construction company",       crmCategory: "project_manager_gc" },
  { query: "sustainability consultant",  crmCategory: "cso" },
  { query: "facility management",        crmCategory: "facility_manager" },
  { query: "hospital construction",      crmCategory: "hospital_administrator" },
];

// ── Bing ──────────────────────────────────────────────────────────────────────

async function searchBing(
  query: string,
  state: string,
  count = 10
): Promise<Array<{ name: string; url: string }>> {
  const key = process.env.BING_SEARCH_API_KEY;
  if (!key) return [];
  try {
    const response = await axios.get(BING_ENDPOINT, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      params: { q: `${query} ${state}`, count, mkt: "en-US", responseFilter: "Webpages", safeSearch: "Moderate" },
      timeout: 10_000,
    });
    return (response.data?.webPages?.value ?? []).map((p: any) => ({
      name: p.name ?? "",
      url:  p.url  ?? "",
    }));
  } catch (err: any) {
    if (err?.response?.status === 429) {
      console.warn("[lead-scraper] Bing rate limit — pausing Bing phase");
      throw new Error("BING_RATE_LIMIT", { cause: err });
    }
    return [];
  }
}

function extractCompanyName(title: string): string {
  return title
    .replace(/\s*[|–—-]\s*.+$/, "")
    .replace(/\s+(LLC|Inc|Corp|Co|Ltd|LLP|PC|AIA|LEED AP)\.?$/i, "")
    .trim();
}

function guessEmail(websiteUrl: string): string | undefined {
  try {
    const { hostname } = new URL(websiteUrl);
    const domain = hostname.replace(/^www\./, "");
    const skip = ["linkedin.com","facebook.com","yelp.com","houzz.com","yellowpages.com",
                  "bbb.org","angieslist.com","indeed.com","glassdoor.com","google.com","bing.com"];
    if (skip.some((s) => domain.endsWith(s))) return undefined;
    return `info@${domain}`;
  } catch { return undefined; }
}

// ── Azure Maps ────────────────────────────────────────────────────────────────

async function searchMaps(
  query: string,
  state: string,
  authOverride?: Awaited<ReturnType<typeof getAzureMapsAuth>>
): Promise<Array<{ company: string; phone?: string; website?: string; city?: string; state: string }>> {
  const auth = authOverride ?? await getAzureMapsAuth();
  if (!auth) {
    console.warn("[lead-scraper] Azure Maps auth unavailable — skipping Maps phase");
    return [];
  }

  try {
    const response = await axios.get("https://atlas.microsoft.com/search/poi/json", {
      params: {
        "api-version": "1.0",
        query: `${query} ${state}`,
        countrySet: "US",
        limit: 20,
      },
      headers: auth.headers,
      timeout: 10_000,
    });
    return (response.data?.results ?? []).map((r: any) => ({
      company: (r.poi?.name ?? "").trim(),
      phone:   r.poi?.phone || undefined,
      website: r.poi?.url || undefined,
      city:    r.address?.municipality || undefined,
      state:   r.address?.countrySubdivision || state,
    })).filter((r: any) => r.company.length > 2);
  } catch { return []; }
}

// ── Save lead + CRM auto-enroll ───────────────────────────────────────────────

async function saveLead(
  company: string,
  website: string | undefined,
  email: string | undefined,
  phone: string | undefined,
  city: string | undefined,
  state: string,
  role: RoleConfig
): Promise<"saved" | "duplicate"> {
  const db = await getDb();
  if (!db) return "duplicate";

  // 1. Save to scraped_leads (dedup on company + role category)
  const leadResult = await db
    .insert(scrapedLeads)
    .values({
      company, website: website ?? null, email: email ?? null,
      phone: phone ?? null, city: city ?? null, state,
      role: role.crmCategory, source: "lead_scraper", emailStatus: "pending",
      title: role.roleTitle,
    })
    .onConflictDoNothing()
    .returning({ id: scrapedLeads.id });

  if (leadResult.length === 0) return "duplicate";

  // 2. Upsert CRM contact
  const existingContact = await db
    .select({ id: crmContacts.id })
    .from(crmContacts)
    .where(and(eq(crmContacts.companyName, company), eq(crmContacts.category, role.crmCategory)))
    .limit(1);

  let contactId: number;

  if (existingContact.length > 0) {
    contactId = existingContact[0].id;
  } else {
    const contactResult = await db
      .insert(crmContacts)
      .values({
        type: "architect_firm",          // use existing enum value for all buyer types
        companyName: company,
        email: email ?? null,
        website: website ?? null,
        location: [city, state].filter(Boolean).join(", ") || null,
        category: role.crmCategory,      // specific role stored here
        subcategory: role.procurementLayer,
        pitchAngle: role.engagementHook,
        readinessLevel: role.purchaseVolume,
        source: "lead_scraper",
        stage: "prospect",
      })
      .returning({ id: crmContacts.id });

    if (contactResult.length === 0) return "duplicate";
    contactId = contactResult[0].id;
  }

  // 3. Enroll in buyer_role_drip (3-step sequence at 0 / 4 / 10 days)
  const DELAY_DAYS = [0, 4, 10];
  const now = new Date();

  for (let step = 1; step <= 3; step++) {
    const existing = await db
      .select({ id: crmEmailSequences.id })
      .from(crmEmailSequences)
      .where(and(
        eq(crmEmailSequences.contactId, contactId),
        eq(crmEmailSequences.sequenceName, "buyer_role_drip"),
        eq(crmEmailSequences.step, step)
      ))
      .limit(1);

    if (existing.length === 0) {
      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() + DELAY_DAYS[step - 1]);
      await db.insert(crmEmailSequences).values({
        contactId,
        sequenceName: "buyer_role_drip",
        step,
        scheduledAt,
        status: "pending",
      });
    }
  }

  return "saved";
}

// ── Main Entry ────────────────────────────────────────────────────────────────

export async function runLeadScraper(): Promise<{
  totalSaved: number;
  totalDuplicates: number;
  bing: number;
  maps: number;
  enrolled: number;
}> {
  let totalSaved = 0;
  let totalDuplicates = 0;
  let bingSaved = 0;
  let mapsSaved = 0;

  // ── Bing phase ────────────────────────────────────────────────────────────
  console.log(`[lead-scraper] Bing phase — ${ROLE_CONFIGS.length} roles × ${STATES.length} states`);
  let bingBlocked = false;

  for (const role of ROLE_CONFIGS) {
    if (bingBlocked) break;

    for (const query of role.bingQueries) {
      if (bingBlocked) break;

      for (const state of STATES) {
        try {
          const results = await searchBing(query, state);

          for (const r of results) {
            const company = extractCompanyName(r.name);
            if (!company || company.length < 3) continue;
            const outcome = await saveLead(
              company, r.url || undefined, guessEmail(r.url), undefined,
              undefined, state, role
            );
            if (outcome === "saved") { totalSaved++; bingSaved++; }
            else totalDuplicates++;
          }

          await new Promise((r) => setTimeout(r, 400)); // Bing rate limit
        } catch (err: any) {
          if (String(err.message).includes("BING_RATE_LIMIT")) {
            bingBlocked = true; break;
          }
          console.error(`[lead-scraper] Bing error '${query}' ${state}:`, err?.message);
        }
      }
    }
  }

  console.log(`[lead-scraper] Bing phase done — ${bingSaved} new leads`);

  // ── Azure Maps phase ──────────────────────────────────────────────────────
  console.log("[lead-scraper] Maps phase...");
  const azureMapsAuth = await getAzureMapsAuth();
  if (!azureMapsAuth) {
    console.warn("[lead-scraper] Azure Maps credentials not configured/usable — skipping Maps phase");
  }

  for (const { query, crmCategory } of MAPS_QUERIES) {
    if (!azureMapsAuth) break;
    const role = ROLE_CONFIGS.find((r) => r.crmCategory === crmCategory);
    if (!role) continue;

    for (const state of STATES) {
      try {
        const results = await searchMaps(query, state, azureMapsAuth);
        for (const r of results) {
          const email = r.website ? guessEmail(r.website) : undefined;
          const outcome = await saveLead(
            r.company, r.website, email, r.phone, r.city, r.state, role
          );
          if (outcome === "saved") { totalSaved++; mapsSaved++; }
          else totalDuplicates++;
        }
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`[lead-scraper] Maps error '${query}' ${state}:`, err);
      }
    }
  }

  console.log(
    `[lead-scraper] Done. saved=${totalSaved} duplicates=${totalDuplicates} ` +
    `(bing=${bingSaved} maps=${mapsSaved}) — all enrolled in buyer_role_drip`
  );

  return { totalSaved, totalDuplicates, bing: bingSaved, maps: mapsSaved, enrolled: totalSaved };
}
