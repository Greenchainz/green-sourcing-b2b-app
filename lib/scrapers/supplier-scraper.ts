import axios from 'axios';
import { getDb } from '../../server/db';
import { scrapedSuppliers } from '../../drizzle/schema';
import { isNull, and, ne, isNotNull, eq } from 'drizzle-orm';
import { getAzureMapsAuth } from '../azure/azure-maps-auth';

export interface ScrapedSupplier {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  materialTypes?: string[];
  source: string;
}

const MATERIAL_QUERIES: Array<{ query: string; materialTypes: string[] }> = [
  { query: 'concrete supplier',                materialTypes: ['Concrete', 'Masonry'] },
  { query: 'structural steel supplier',        materialTypes: ['Steel', 'Rebar'] },
  { query: 'insulation manufacturer',          materialTypes: ['Insulation'] },
  { query: 'glass manufacturer building',      materialTypes: ['Glass'] },
  { query: 'aluminum building products',       materialTypes: ['Aluminum'] },
  { query: 'roofing materials supplier',       materialTypes: ['Roofing'] },
  { query: 'gypsum wallboard manufacturer',    materialTypes: ['Gypsum Board'] },
  { query: 'lumber wood products supplier',    materialTypes: ['Wood'] },
  { query: 'sustainable building materials',   materialTypes: ['Concrete', 'Steel', 'Wood', 'Insulation'] },
  { query: 'green building products supplier', materialTypes: ['Concrete', 'Steel', 'Glass', 'Aluminum'] },
  { query: 'ready mix concrete plant',         materialTypes: ['Concrete'] },
  { query: 'steel fabricator structural',      materialTypes: ['Steel'] },
  { query: 'fly ash slag cement supplier',     materialTypes: ['Concrete', 'Masonry'] },
  { query: 'timber glulam mass timber',        materialTypes: ['Wood'] },
  { query: 'fiberglass mineral wool insulation', materialTypes: ['Insulation'] },
];

// All 50 states — ordered by construction market size
const STATES = [
  'TX', 'CA', 'FL', 'NY', 'IL', 'GA', 'NC', 'AZ', 'CO', 'WA',
  'OH', 'PA', 'VA', 'TN', 'SC', 'MI', 'MN', 'NV', 'OR', 'WI',
  'IN', 'MD', 'MO', 'NJ', 'MA', 'LA', 'AL', 'KY', 'OK', 'AR',
  'UT', 'KS', 'NE', 'IA', 'MS', 'ID', 'NM', 'MT', 'WV', 'ME',
  'NH', 'RI', 'DE', 'CT', 'SD', 'ND', 'WY', 'AK', 'HI', 'VT',
];

// Apollo job titles to search for decision-makers at building materials companies
const APOLLO_TITLES = [
  'sustainability director',
  'director of sustainability',
  'VP sustainability',
  'director of sales',
  'VP sales',
  'national sales manager',
  'regional sales manager',
  'business development manager',
  'procurement manager',
  'marketing director',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(website: string): string | null {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.length < 4 || host.includes(' ')) return null;
    return host;
  } catch {
    return null;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500,
  label = 'request'
): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === retries;
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      // Don't retry 4xx (bad request / auth) — only transient errors
      if (status && status >= 400 && status < 500) {
        console.error(`[supplier-scraper] ${label} → ${status}, not retrying`);
        return null;
      }
      if (isLast) {
        console.error(`[supplier-scraper] ${label} failed after ${retries} attempts:`, err);
        return null;
      }
      await sleep(delayMs * attempt);
    }
  }
  return null;
}

// ── Azure Maps scrape ─────────────────────────────────────────────────────────

export async function scrapeAzureMaps(
  searchQuery: string,
  materialTypes: string[],
  state?: string
): Promise<ScrapedSupplier[]> {
  const auth = await getAzureMapsAuth();
  if (!auth) {
    console.warn('[supplier-scraper] Azure Maps auth unavailable — skipping query');
    return [];
  }

  const fullQuery = state ? `${searchQuery} ${state}` : searchQuery;
  const params = new URLSearchParams({
    'api-version': '1.0',
    query: fullQuery,
    countrySet: 'US',
    limit: '100',
  });
  if (auth.keyParam) {
    params.set('subscription-key', auth.keyParam);
  }
  const url = `https://atlas.microsoft.com/search/poi/json?${params.toString()}`;

  const data = await withRetry(
    () => axios.get<{ results: unknown[] }>(url, { headers: auth.headers, timeout: 10000 }).then((r) => r.data),
    3,
    800,
    `AzureMaps '${fullQuery}'`
  );
  if (!data) return [];

  const suppliers: ScrapedSupplier[] = [];
  for (const result of data.results || []) {
    const r = result as Record<string, Record<string, string>>;
    const poi     = r['poi']     || {};
    const address = r['address'] || {};
    const name    = (poi['name'] || '').trim();
    if (!name) continue;
    suppliers.push({
      companyName:   name,
      website:       poi['url']                      || undefined,
      phone:         poi['phone']                    || undefined,
      address:       address['freeformAddress']      || undefined,
      city:          address['municipality']         || undefined,
      state:         address['countrySubdivision']   || undefined,
      zipCode:       address['postalCode']            || undefined,
      materialTypes,
      source: 'azure_maps',
    });
  }
  return suppliers;
}

// ── EPD International scrape ──────────────────────────────────────────────────

export async function scrapeEPDManufacturers(): Promise<ScrapedSupplier[]> {
  const suppliers: ScrapedSupplier[] = [];
  const seen     = new Set<string>();
  const pageSize = 200;
  let   page     = 1;
  let   total    = 0;

  do {
    const url = `https://api.environdec.com/api/v1/EPDLibrary/SearchEPD?PageNumber=${page}&PageSize=${pageSize}`;
    const data = await withRetry(
      () => axios.get<{ Data: unknown[]; TotalCount: number }>(url, { headers: { Accept: 'application/json' }, timeout: 15000 }).then((r) => r.data),
      3,
      1000,
      `EPD page ${page}`
    );
    if (!data) break;

    total = data.TotalCount ?? 0;
    for (const epdRaw of data.Data || []) {
      const epd = epdRaw as Record<string, string>;
      const manufacturer = (epd['ManufacturerName'] || epd['Owner'] || '').trim();
      if (!manufacturer || seen.has(manufacturer)) continue;
      seen.add(manufacturer);
      suppliers.push({
        companyName:   manufacturer,
        website:       epd['ManufacturerWebsite'] || undefined,
        materialTypes: [epd['ProductCategoryName'] || epd['SubCategoryName'] || 'Building Materials'],
        source:        'epd_international',
      });
    }

    console.log(`[supplier-scraper] EPD page ${page}: ${data.Data?.length ?? 0} records (${seen.size} unique so far / ${total} total)`);
    page++;
    await sleep(300);
  } while ((page - 1) * pageSize < total);

  return suppliers;
}

// ── Apollo enrichment ─────────────────────────────────────────────────────────

interface ApolloContact {
  email?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
}

interface ApolloPeopleSearchResponse {
  contacts?: ApolloContact[];
  people?: ApolloContact[];
}

/**
 * Use Apollo People Search to find a decision-maker email for a given domain.
 * Returns the first verified email found, or null.
 */
export async function findEmailViaApollo(domain: string): Promise<string | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  const data = await withRetry(
    () =>
      axios
        .post<ApolloPeopleSearchResponse>(
          'https://api.apollo.io/v1/mixed_people/search',
          {
            api_key: apiKey,
            q_organization_domains: domain,
            person_titles:          APOLLO_TITLES,
            contact_email_status:   ['verified', 'likely to engage'],
            per_page:               3,
          },
          { timeout: 15000 }
        )
        .then((r) => r.data),
    2,
    1000,
    `Apollo enrich ${domain}`
  );
  if (!data) return null;

  const contacts: ApolloContact[] = data.contacts ?? data.people ?? [];
  const contact = contacts.find((c) => c.email && c.email.includes('@'));
  if (contact?.email) {
    console.log(`[supplier-scraper] Apollo → found ${contact.title ?? 'contact'} at ${domain}`);
    return contact.email;
  }
  return null;
}

/**
 * Run Apollo enrichment against all scraped suppliers that:
 *   - have a website (for domain extraction)
 *   - have no email yet
 *   - have not been suppressed
 *
 * Rate-limited to 1 request / 300ms to respect Apollo's free-tier limits.
 * Processes up to maxBatch records per call (default 200) to avoid long-running jobs.
 */
export async function enrichSuppliersWithApollo(maxBatch = 200): Promise<{
  enriched: number;
  checked: number;
  noEmail: number;
}> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.log('[supplier-scraper] APOLLO_API_KEY not set — skipping enrichment');
    return { enriched: 0, checked: 0, noEmail: 0 };
  }

  const db = await getDb();
  if (!db) return { enriched: 0, checked: 0, noEmail: 0 };

  // Find suppliers with websites but no email
  const targets = await db
    .select({
      id:      scrapedSuppliers.id,
      company: scrapedSuppliers.companyName,
      website: scrapedSuppliers.website,
    })
    .from(scrapedSuppliers)
    .where(
      and(
        isNull(scrapedSuppliers.email),
        isNotNull(scrapedSuppliers.website),
        ne(scrapedSuppliers.emailStatus, 'invalid'),
      )
    )
    .limit(maxBatch);

  console.log(`[supplier-scraper] Apollo enrichment: ${targets.length} suppliers to check`);

  let enriched = 0;
  let noEmail  = 0;

  for (const target of targets) {
    const domain = target.website ? extractDomain(target.website) : null;
    if (!domain) { noEmail++; continue; }

    const email = await findEmailViaApollo(domain);
    if (email) {
      await db
        .update(scrapedSuppliers)
        .set({ email, updatedAt: new Date() })
        .where(eq(scrapedSuppliers.id, target.id));
      enriched++;
    } else {
      noEmail++;
    }

    await sleep(300); // ~200 req/min max on Apollo free tier
  }

  console.log(`[supplier-scraper] Apollo enrichment done — enriched: ${enriched}, no email found: ${noEmail}`);
  return { enriched, checked: targets.length, noEmail };
}

// ── Save helpers ──────────────────────────────────────────────────────────────

export async function saveSuppliers(
  suppliers: ScrapedSupplier[]
): Promise<{ saved: number; duplicates: number }> {
  if (suppliers.length === 0) return { saved: 0, duplicates: 0 };

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  let saved = 0;
  let duplicates = 0;

  for (const supplier of suppliers) {
    try {
      const result = await db
        .insert(scrapedSuppliers)
        .values({
          companyName:   supplier.companyName,
          email:         supplier.email       || null,
          phone:         supplier.phone       || null,
          website:       supplier.website     || null,
          address:       supplier.address     || null,
          city:          supplier.city        || null,
          state:         supplier.state       || null,
          zipCode:       supplier.zipCode     || null,
          materialTypes: supplier.materialTypes || [],
          source:        supplier.source,
          emailStatus:   'pending',
        })
        .onConflictDoNothing()
        .returning({ id: scrapedSuppliers.id });

      if (result.length > 0) saved++;
      else duplicates++;
    } catch (err) {
      console.error(`[supplier-scraper] Failed to save ${supplier.companyName}:`, err);
    }
  }

  return { saved, duplicates };
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function runSupplierScraper(opts: {
  skipAzureMaps?: boolean;
  skipEpd?: boolean;
  skipApollo?: boolean;
  apolloBatch?: number;
} = {}): Promise<{
  totalSaved: number;
  totalDuplicates: number;
  azureMaps: number;
  epdInternational: number;
  apolloEnriched: number;
}> {
  let totalSaved      = 0;
  let totalDuplicates = 0;
  let azureMapsSaved  = 0;
  let epdSaved        = 0;
  let apolloEnriched  = 0;

  // ── Azure Maps ──────────────────────────────────────────────────────────────
  if (!opts.skipAzureMaps) {
    console.log(`[supplier-scraper] Starting Azure Maps scrape — ${STATES.length} states × ${MATERIAL_QUERIES.length} queries`);
    for (const { query, materialTypes } of MATERIAL_QUERIES) {
      for (const state of STATES) {
        const results = await scrapeAzureMaps(query, materialTypes, state);
        if (results.length > 0) {
          const { saved, duplicates } = await saveSuppliers(results);
          totalSaved      += saved;
          totalDuplicates += duplicates;
          azureMapsSaved  += saved;
          console.log(`[supplier-scraper] '${query}' ${state}: ${results.length} found, ${saved} new`);
        }
        await sleep(200);
      }
    }
    console.log(`[supplier-scraper] Azure Maps done — ${azureMapsSaved} new suppliers`);
  }

  // ── EPD International ───────────────────────────────────────────────────────
  if (!opts.skipEpd) {
    console.log('[supplier-scraper] Starting EPD International scrape...');
    const epdResults = await scrapeEPDManufacturers();
    if (epdResults.length > 0) {
      const { saved, duplicates } = await saveSuppliers(epdResults);
      totalSaved      += saved;
      totalDuplicates += duplicates;
      epdSaved        += saved;
      console.log(`[supplier-scraper] EPD International: ${epdResults.length} found, ${saved} new`);
    }
  }

  // ── Apollo enrichment ───────────────────────────────────────────────────────
  if (!opts.skipApollo) {
    console.log('[supplier-scraper] Starting Apollo email enrichment...');
    const { enriched } = await enrichSuppliersWithApollo(opts.apolloBatch ?? 200);
    apolloEnriched = enriched;
  }

  console.log(
    `[supplier-scraper] Complete — saved: ${totalSaved}, dupes: ${totalDuplicates}, ` +
    `apollo enriched: ${apolloEnriched}`
  );

  return {
    totalSaved,
    totalDuplicates,
    azureMaps:       azureMapsSaved,
    epdInternational: epdSaved,
    apolloEnriched,
  };
}
