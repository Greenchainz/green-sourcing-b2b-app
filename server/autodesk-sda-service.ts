/**
 * Autodesk Sustainability Data (SDA) API Service — v3beta
 *
 * Base URL: https://developer.api.autodesk.com/sustainability/v3beta
 * Docs:     https://aps.autodesk.com/en/docs/sustainability/v3/developers_guide
 *
 * Auth: SSA (Secure Service Account) — headless 3-legged flow.
 * Grant type: urn:autodesk:params:oauth:grant-type:ssa
 * Standard 2-legged client_credentials is rejected (AUTH-001).
 *
 * Prerequisites:
 *   1. Enable "Sustainability Data API" for your app at developer.autodesk.com
 *   2. AUTODESK_CLIENT_ID + AUTODESK_CLIENT_SECRET in .env.local
 */

const SDA_BASE  = 'https://developer.api.autodesk.com/sustainability/v3beta';
const APS_AUTH  = 'https://developer.api.autodesk.com/authentication/v2/token';

// ── SSA token (headless 3-legged) ─────────────────────────────────────────────

let _ssaToken: string | null = null;
let _ssaExpiry = 0;

async function getSSAToken(): Promise<string> {
  if (_ssaToken && Date.now() < _ssaExpiry - 60_000) return _ssaToken;

  const clientId     = process.env.AUTODESK_CLIENT_ID;
  const clientSecret = process.env.AUTODESK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('[SDA] Missing AUTODESK_CLIENT_ID or AUTODESK_CLIENT_SECRET');
  }

  const res = await fetch(APS_AUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'urn:autodesk:params:oauth:grant-type:ssa',
      scope:         'data:read',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[SDA] SSA auth failed ${res.status}: ${err}`);
  }

  const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number };
  _ssaToken  = access_token;
  _ssaExpiry = Date.now() + expires_in * 1000;
  console.log('[SDA] SSA token obtained, expires in', expires_in, 's');
  return access_token;
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function sdaFetch<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const token = await getSSAToken();
  const res = await fetch(`${SDA_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[SDA] ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SDADataset {
  datasetId: string;
  name: string;
  description?: string;
  provider?: string;
  jurisdictions?: string[];
}

export interface SDACategory {
  id: string;
  system: string;   // "masterformat"
  code: string;     // "03 30 00"
  name: string;     // "Cast-in-Place Concrete"
  parentId?: string;
}

export interface SDAProductEpd {
  id: string;
  name: string;
  categoryIds: string[];
  description?: string;
  jurisdictions?: string[];
  dateOfIssue?: string;
  validUntil?: string;
  declarationUrl?: string;
  declaredUnit: { qty: number; unit: string };
  manufacturer?: { name: string; url?: string };
  version?: string;
}

export interface SDAIndustryStats {
  declaredUnit: { qty: number; unit: string };
  indicator: string;
  methodology: string;
  a1a2a3: {
    mean: { qty: number; unit: string };
    min:  { qty: number; unit: string };
    max:  { qty: number; unit: string };
    sd:   number;
  };
}

export interface SDAPagination {
  offset: number;
  limit: number;
  totalResults: number;
  nextUrl?: string;
}

// ── Datasets ──────────────────────────────────────────────────────────────────

/** List all datasets your program tier can access (EC3, EPD International, etc.) */
export async function listDatasets(): Promise<SDADataset[]> {
  const data = await sdaFetch<{ datasets: SDADataset[] }>('/datasets');
  console.log('[SDA] Datasets:', data.datasets.map(d => `${d.datasetId} — ${d.name}`));
  return data.datasets;
}

// ── Product EPDs ──────────────────────────────────────────────────────────────

/** Filter product EPDs within a dataset */
export async function filterProductEPDs(
  datasetId: string,
  filters: object,
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 }
): Promise<{ results: SDAProductEpd[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/product-epds/filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

/** Get full detail for one product EPD */
export async function getProductEPDDetail(
  datasetId: string,
  epdId: string
): Promise<SDAProductEpd | null> {
  try {
    const data = await sdaFetch<{ productEpd: SDAProductEpd }>(
      `/datasets/${datasetId}/product-epds/${epdId}`
    );
    return data.productEpd;
  } catch (err: unknown) {
    if (String(err).includes('404')) return null;
    throw err;
  }
}

/** Filter product EPD categories (MasterFormat) in a dataset */
export async function filterProductEPDCategories(
  datasetId: string,
  filters: object = {}
): Promise<{ results: SDACategory[]; pagination: SDAPagination }> {
  return sdaFetch(`/datasets/${datasetId}/product-epds/categories/filter`, 'POST', { filters });
}

/** Get GWP statistics for product EPDs in a category */
export async function getProductEPDStats(
  datasetId: string,
  filters: object
): Promise<{ statistics: SDAIndustryStats }> {
  return sdaFetch(`/datasets/${datasetId}/product-epds/statistics:filter`, 'POST', { filters });
}

// ── Industry EPDs (benchmarks) ────────────────────────────────────────────────

/** Filter industry-average EPDs (used for carbon benchmarks) */
export async function filterIndustryEPDs(
  datasetId: string,
  filters: object,
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 }
): Promise<{ results: SDAProductEpd[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/industry-epds/filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

/** Get industry GWP statistics for a category (mean/min/max/sd) */
export async function getIndustryStats(
  datasetId: string,
  categoryId: string
): Promise<SDAIndustryStats | null> {
  try {
    const data = await sdaFetch<{ statistics: SDAIndustryStats }>(
      `/datasets/${datasetId}/industry-epds/statistics:filter`,
      'POST',
      { filters: { categoryId: { op: 'EQ', value: categoryId } } }
    );
    return data.statistics;
  } catch {
    return null;
  }
}

// ── Baselines ─────────────────────────────────────────────────────────────────

/** Filter baseline estimates (typical values per category) */
export async function filterBaselines(
  datasetId: string,
  filters: object = {},
  limit = 100
): Promise<{ results: unknown[]; pagination: SDAPagination }> {
  return sdaFetch(`/datasets/${datasetId}/baselines/filter?limit=${limit}`, 'POST', { filters });
}

// ── Generic Estimates ─────────────────────────────────────────────────────────

/** Filter generic estimates for rough material carbon estimates */
export async function filterGenericEstimates(
  datasetId: string,
  filters: object = {},
  limit = 100
): Promise<{ results: unknown[]; pagination: SDAPagination }> {
  return sdaFetch(`/datasets/${datasetId}/generic-estimates/filter?limit=${limit}`, 'POST', { filters });
}

// ── Router-facing helpers ─────────────────────────────────────────────────────

/**
 * Search EPDs by query string and optional category.
 * Used by the tRPC autodesksDARouter.searchEpds procedure.
 */
export async function searchEpds(
  query: string,
  category?: string,
  limit = 20
): Promise<SDAProductEpd[]> {
  const datasets = await listDatasets();
  if (datasets.length === 0) return [];
  const dataset = datasets.find(d => d.name?.toLowerCase().includes('ec3'))
    ?? datasets.find(d => d.name?.toLowerCase().includes('building transparency'))
    ?? datasets[0];

  const filters: Record<string, unknown> = {
    name: { op: 'CONTAINS', value: query },
  };
  if (category) filters.categoryId = { op: 'EQ', value: category };

  const { results } = await filterProductEPDs(dataset.datasetId, filters, { limit, offset: 0 });
  return results;
}

/**
 * Get full EPD detail by ID.
 * Used by the tRPC autodesksDARouter.getEpdDetail procedure.
 */
export async function getEpdDetail(epdId: string): Promise<SDAProductEpd | null> {
  const datasets = await listDatasets();
  if (datasets.length === 0) return null;
  const dataset = datasets.find(d => d.name?.toLowerCase().includes('ec3'))
    ?? datasets.find(d => d.name?.toLowerCase().includes('building transparency'))
    ?? datasets[0];
  return getProductEPDDetail(dataset.datasetId, epdId);
}

/**
 * Find the single best-matching EPD for a material query.
 * Returns the first result from searchEpds, or null if none found.
 */
export async function findBestEpd(
  query: string,
  category?: string
): Promise<SDAProductEpd | null> {
  const results = await searchEpds(query, category, 1);
  return results[0] ?? null;
}

// ── GreenChainz seed helper ───────────────────────────────────────────────────

/**
 * MasterFormat category IDs for GreenChainz priority materials.
 * Use with filterProductEPDs() to seed the catalog.
 */
export const GREENCHAINZ_SDA_CATEGORIES: Record<string, string> = {
  'Concrete':     'cat-masterformat-033000',
  'Steel':        'cat-masterformat-051200',
  'Wood':         'cat-masterformat-061000',
  'Insulation':   'cat-masterformat-072100',
  'Masonry':      'cat-masterformat-042000',
  'Glazing':      'cat-masterformat-088000',
  'Aluminum':     'cat-masterformat-054000',
  'Gypsum Board': 'cat-masterformat-092900',
  'Roofing':      'cat-masterformat-075000',
  'Rebar':        'cat-masterformat-032000',
};

/**
 * Seed GreenChainz materials from Autodesk SDA.
 * Call POST /api/admin/seed-materials-autodesk (admin only) to trigger.
 *
 * Returns summary of what was fetched per category.
 */
export async function fetchSDAMaterialsForSeed(): Promise<{
  category: string;
  fetched: number;
  epds: SDAProductEpd[];
}[]> {
  const datasets = await listDatasets();
  if (datasets.length === 0) throw new Error('[SDA] No datasets available — check API access in APS portal');

  // Prefer EC3 dataset if available, otherwise use first
  const dataset = datasets.find(d => d.name?.toLowerCase().includes('ec3'))
    ?? datasets.find(d => d.name?.toLowerCase().includes('building transparency'))
    ?? datasets[0];

  console.log(`[SDA] Seeding from dataset: ${dataset.datasetId} (${dataset.name})`);

  const results = [];

  for (const [categoryName, categoryId] of Object.entries(GREENCHAINZ_SDA_CATEGORIES)) {
    try {
      const { results: epds, pagination } = await filterProductEPDs(
        dataset.datasetId,
        { categoryId: { op: 'EQ', value: categoryId }, jurisdiction: { op: 'EQ', value: 'US' } },
        { limit: 50, offset: 0 }
      );
      console.log(`[SDA] ${categoryName}: ${epds.length}/${pagination.totalResults} EPDs`);
      results.push({ category: categoryName, fetched: epds.length, epds });
    } catch (err) {
      console.warn(`[SDA] ${categoryName} failed:`, err);
      results.push({ category: categoryName, fetched: 0, epds: [] });
    }
  }

  return results;
}
