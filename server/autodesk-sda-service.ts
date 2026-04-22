/**
 * Autodesk Sustainability Data API (SDA) Service — v3beta
 *
 * Base URL: https://developer.api.autodesk.com/sustainability/v3beta
 * Docs:     https://aps.autodesk.com/en/docs/sustainability/v3/developers_guide
 *
 * Auth: 3-legged OAuth (Authorization Code Grant), scope: data:read
 *   - One-time setup: GET /api/admin/autodesk-auth  → Autodesk login → callback stores refresh token
 *   - Runtime: refresh token is read from app_settings table, exchanged for access token automatically
 *
 * Prerequisites:
 *   1. App type set to "Traditional Web App" at developer.autodesk.com
 *   2. "Sustainability Data API" enabled under APIs for your app
 *   3. Callback URL: http://localhost:3001/api/admin/autodesk-callback (dev)
 *                    https://api.greenchainz.com/api/admin/autodesk-callback (prod)
 *   4. Run the one-time auth flow via /api/admin/autodesk-auth
 */

import { getDb } from './db';
import { appSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const SDA_BASE  = 'https://developer.api.autodesk.com/sustainability/v3beta';
const APS_AUTH  = 'https://developer.api.autodesk.com/authentication/v2/authorize';
const APS_TOKEN = 'https://developer.api.autodesk.com/authentication/v2/token';

const SETTING_REFRESH_TOKEN = 'autodesk_sda_refresh_token';
const SETTING_ACCESS_TOKEN  = 'autodesk_sda_access_token';
const SETTING_TOKEN_EXPIRY  = 'autodesk_sda_token_expiry';

// ── OAuth helpers ─────────────────────────────────────────────────────────────

function getCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId     = process.env.AUTODESK_CLIENT_ID;
  const clientSecret = process.env.AUTODESK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('[SDA] Missing AUTODESK_CLIENT_ID or AUTODESK_CLIENT_SECRET');
  }
  const base = process.env.BACKEND_URL || process.env.APP_BASE_URL || 'http://localhost:3001';
  const redirectUri = `${base}/api/admin/autodesk-callback`;
  return { clientId, clientSecret, redirectUri };
}

/** Build the Autodesk OAuth authorization URL for the one-time setup flow. */
export function buildAuthorizationUrl(): string {
  const { clientId, redirectUri } = getCredentials();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
    scope:         'data:read',
  });
  return `${APS_AUTH}?${params.toString()}`;
}

/** Exchange authorization code for access + refresh tokens. Call from OAuth callback. */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const { clientId, clientSecret, redirectUri } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(APS_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[SDA] Token exchange failed ${res.status}: ${err}`);
  }

  const { access_token, refresh_token, expires_in } =
    await res.json() as { access_token: string; refresh_token: string; expires_in: number };

  await saveTokens(access_token, refresh_token, expires_in);
  console.log('[SDA] OAuth tokens saved — SDA integration is active');
}

async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('[SDA] No DB connection when saving tokens');

  const expiry = String(Date.now() + expiresIn * 1000);

  for (const [key, value] of [
    [SETTING_REFRESH_TOKEN, refreshToken],
    [SETTING_ACCESS_TOKEN,  accessToken],
    [SETTING_TOKEN_EXPIRY,  expiry],
  ] as [string, string][]) {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
}

/** Get a valid access token — refreshes automatically when expired. */
export async function getSDAToken(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('[SDA] No DB connection');

  // Check cached access token first
  const [expiryRow, accessRow] = await Promise.all([
    db.select().from(appSettings).where(eq(appSettings.key, SETTING_TOKEN_EXPIRY)).limit(1),
    db.select().from(appSettings).where(eq(appSettings.key, SETTING_ACCESS_TOKEN)).limit(1),
  ]);

  const expiry = expiryRow[0]?.value ? Number(expiryRow[0].value) : 0;
  if (accessRow[0]?.value && Date.now() < expiry - 60_000) {
    return accessRow[0].value;
  }

  // Refresh using stored refresh token
  const [refreshRow] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SETTING_REFRESH_TOKEN))
    .limit(1);

  if (!refreshRow?.value) {
    throw new Error(
      '[SDA] No refresh token stored. Run the one-time setup: GET /api/admin/autodesk-auth'
    );
  }

  const { clientId, clientSecret } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(APS_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshRow.value,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[SDA] Token refresh failed ${res.status}: ${err}`);
  }

  const { access_token, refresh_token, expires_in } =
    await res.json() as { access_token: string; refresh_token: string; expires_in: number };

  await saveTokens(access_token, refresh_token, expires_in);
  console.log('[SDA] Access token refreshed');
  return access_token;
}

/** Returns true if OAuth has been set up (refresh token stored). */
export async function isSDAConfigured(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SETTING_REFRESH_TOKEN))
      .limit(1);
    return Boolean(row?.value);
  } catch {
    return false;
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

// Beta API fail-safes:
//   - 10s timeout on every request (beta endpoints can hang)
//   - Retry once on 5xx (transient infra issues common in beta)
//   - 404 returns null instead of throwing (endpoints may be added/removed)
//   - Structured error logging so API changes are easy to spot in logs
const SDA_TIMEOUT_MS = 10_000;

async function sdaFetch<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const token = await getSDAToken();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SDA_TIMEOUT_MS);

  let lastErr: Error | null = null;

  // One retry on 5xx — beta infra is occasionally flaky
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${SDA_BASE}${path}`, {
        method,
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        signal: controller.signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      clearTimeout(timeout);

      // Log unexpected status codes — useful for detecting beta API changes
      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 404) {
          // Endpoint may have moved — log prominently so we catch API changes
          console.warn(`[SDA] 404 on ${method} ${path} — endpoint may have changed in beta`);
          throw new Error(`[SDA] 404 ${path}`);
        }
        if (res.status === 401 || res.status === 403) {
          console.error(`[SDA] Auth error ${res.status} — re-run /api/admin/autodesk-auth if this persists`);
          throw new Error(`[SDA] Auth ${res.status}: ${errBody}`);
        }
        if (res.status >= 500 && attempt < 2) {
          console.warn(`[SDA] ${res.status} on attempt ${attempt}, retrying...`);
          lastErr = new Error(`[SDA] ${method} ${path} → ${res.status}: ${errBody}`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw new Error(`[SDA] ${method} ${path} → ${res.status}: ${errBody}`);
      }

      return res.json() as Promise<T>;
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`[SDA] ${method} ${path} timed out after ${SDA_TIMEOUT_MS}ms`);
      }
      if (attempt < 2 && !(err instanceof Error && err.message.includes('Auth'))) {
        lastErr = err as Error;
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }

  throw lastErr ?? new Error(`[SDA] ${method} ${path} failed`);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SDADataset {
  id: string;
  name: string;
  description?: string;
  provider?: { name: string };
  supportedDataTypes?: string[];
}

export interface SDACategory {
  id: string;
  system: string;
  code: string;
  name: string;
  parentId?: string | null;
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
  manufacturer?: { name: string; url?: string } | null;
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
  hasMoreResults?: boolean;
  totalResults: number | null;
  nextUrl?: string | null;
}

// ── Datasets ──────────────────────────────────────────────────────────────────

export async function listDatasets(): Promise<SDADataset[]> {
  const data = await sdaFetch<{ results: SDADataset[]; pagination: SDAPagination }>('/datasets');
  console.log('[SDA] Datasets:', data.results.map(d => `${d.id} — ${d.name}`));
  return data.results;
}

// ── Product EPDs ──────────────────────────────────────────────────────────────

export async function filterProductEPDs(
  datasetId: string,
  filters: object,
  pagination: { limit: number; offset: number } = { limit: 100, offset: 0 }
): Promise<{ results: SDAProductEpd[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/product-epds/list:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function getProductEPDDetail(
  datasetId: string,
  epdId: string
): Promise<SDAProductEpd | null> {
  try {
    return await sdaFetch<SDAProductEpd>(
      `/datasets/${datasetId}/product-epds/details/${epdId}`
    );
  } catch (err: unknown) {
    if (String(err).includes('404')) return null;
    throw err;
  }
}

export async function filterProductEPDCategories(
  datasetId: string,
  filters: object = {},
  pagination: { limit: number; offset: number } = { limit: 250, offset: 0 }
): Promise<{ results: SDACategory[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/product-epds/categories:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function getProductEPDStats(
  datasetId: string,
  filters: object
): Promise<{ statistics: SDAIndustryStats }> {
  return sdaFetch(`/datasets/${datasetId}/product-epds/statistics:filter`, 'POST', { filters });
}

export async function filterProductEPDImpacts(
  datasetId: string,
  epdId: string,
  filters: object = {}
): Promise<{ results: unknown[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/product-epds/details/${epdId}/impacts:filter`,
    'POST',
    { filters }
  );
}

// ── Industry EPDs ─────────────────────────────────────────────────────────────

export async function filterIndustryEPDs(
  datasetId: string,
  filters: object,
  pagination: { limit: number; offset: number } = { limit: 100, offset: 0 }
): Promise<{ results: SDAProductEpd[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/industry-epds/list:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function getIndustryEPDDetail(
  datasetId: string,
  epdId: string
): Promise<SDAProductEpd | null> {
  try {
    return await sdaFetch<SDAProductEpd>(
      `/datasets/${datasetId}/industry-epds/details/${epdId}`
    );
  } catch (err: unknown) {
    if (String(err).includes('404')) return null;
    throw err;
  }
}

export async function filterIndustryEPDCategories(
  datasetId: string,
  filters: object = {},
  pagination: { limit: number; offset: number } = { limit: 250, offset: 0 }
): Promise<{ results: SDACategory[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/industry-epds/categories:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

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

export async function filterIndustryEPDImpacts(
  datasetId: string,
  epdId: string,
  filters: object = {}
): Promise<{ results: unknown[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/industry-epds/details/${epdId}/impacts:filter`,
    'POST',
    { filters }
  );
}

export async function filterBaselines(
  datasetId: string,
  filters: object = {},
  pagination: { limit: number; offset: number } = { limit: 100, offset: 0 }
): Promise<{ results: unknown[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/baselines/list:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function filterBaselineCategories(
  datasetId: string,
  filters: object = {},
  pagination: { limit: number; offset: number } = { limit: 250, offset: 0 }
): Promise<{ results: SDACategory[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/baselines/categories:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function filterGenericEstimates(
  datasetId: string,
  filters: object = {},
  pagination: { limit: number; offset: number } = { limit: 100, offset: 0 }
): Promise<{ results: unknown[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/generic-estimates/list:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function filterGenericEstimateCategories(
  datasetId: string,
  filters: object = {},
  pagination: { limit: number; offset: number } = { limit: 250, offset: 0 }
): Promise<{ results: SDACategory[]; pagination: SDAPagination }> {
  return sdaFetch(
    `/datasets/${datasetId}/generic-estimates/categories:filter?limit=${pagination.limit}&offset=${pagination.offset}`,
    'POST',
    { filters }
  );
}

export async function searchEpds(
  query: string,
  category?: string,
  limit = 20
): Promise<SDAProductEpd[]> {
  const datasets = await listDatasets();
  if (datasets.length === 0) return [];
  const dataset =
    datasets.find(d => d.name?.toLowerCase().includes('ec3')) ??
    datasets.find(d => d.name?.toLowerCase().includes('building transparency')) ??
    datasets[0];
  const filters: Record<string, unknown> = { name: { op: 'CONTAINS', value: query } };
  if (category) filters['categoryId'] = { op: 'EQ', value: category };
  const { results } = await filterProductEPDs(dataset.id, filters, { limit, offset: 0 });
  return results;
}

export async function getEpdDetail(epdId: string): Promise<SDAProductEpd | null> {
  const datasets = await listDatasets();
  if (datasets.length === 0) return null;
  const dataset =
    datasets.find(d => d.name?.toLowerCase().includes('ec3')) ??
    datasets.find(d => d.name?.toLowerCase().includes('building transparency')) ??
    datasets[0];
  return getProductEPDDetail(dataset.id, epdId);
}

export async function findBestEpd(query: string, category?: string): Promise<SDAProductEpd | null> {
  const results = await searchEpds(query, category, 1);
  return results[0] ?? null;
}

export const GREENCHAINZ_SDA_CATEGORIES: Record<string, string> = {
  Concrete:       'cat-masterformat-033000',
  Steel:          'cat-masterformat-051200',
  Wood:           'cat-masterformat-061000',
  Insulation:     'cat-masterformat-072100',
  Masonry:        'cat-masterformat-042000',
  Glazing:        'cat-masterformat-088000',
  Aluminum:       'cat-masterformat-054000',
  GypsuBoard:     'cat-masterformat-092900',
  Roofing:        'cat-masterformat-075000',
  Rebar:          'cat-masterformat-032000',
};

export async function fetchSDAMaterialsForSeed(): Promise<{
  category: string;
  fetched: number;
  epds: SDAProductEpd[];
}[]> {
  const datasets = await listDatasets();
  if (datasets.length === 0) {
    throw new Error('[SDA] No datasets available - check API access in APS portal');
  }
  const dataset =
    datasets.find(d => d.name?.toLowerCase().includes('ec3')) ??
    datasets.find(d => d.name?.toLowerCase().includes('building transparency')) ??
    datasets[0];
  console.log('[SDA] Seeding from dataset:', dataset.id, dataset.name);
  const results = [];
  for (const [categoryName, categoryId] of Object.entries(GREENCHAINZ_SDA_CATEGORIES)) {
    try {
      const { results: epds, pagination } = await filterProductEPDs(
        dataset.id,
        { categoryId: { op: 'EQ', value: categoryId }, jurisdiction: { op: 'EQ', value: 'US' } },
        { limit: 50, offset: 0 }
      );
      console.log('[SDA]', categoryName + ':', epds.length + '/' + pagination.totalResults, 'EPDs');
      results.push({ category: categoryName, fetched: epds.length, epds });
    } catch (err) {
      console.warn('[SDA]', categoryName, 'failed:', err);
      results.push({ category: categoryName, fetched: 0, epds: [] });
    }
  }
  return results;
}
