/**
 * GreenChainz k6 Load Test — Shared Utilities
 *
 * Helpers for tRPC calls, auth, and response validation.
 * Import from smoke.js, load.js, and stress.js.
 */

import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";

// ── Base URL ─────────────────────────────────────────────────────────────────
// Override with: k6 run -e BASE_URL=https://staging.greenchainz.com load.js
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";

// ── JSON headers ─────────────────────────────────────────────────────────────
export const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// ── tRPC helpers ─────────────────────────────────────────────────────────────

/**
 * Call a tRPC query procedure (GET).
 * Returns the parsed result data or null on failure.
 */
export function trpcQuery(procedure, input = null, cookieJar = null) {
  const inputParam = encodeURIComponent(JSON.stringify({ "0": { json: input } }));
  const url = `${BASE_URL}/api/trpc/${procedure}?batch=1&input=${inputParam}`;

  const params = { headers: JSON_HEADERS, redirects: 0 };
  if (cookieJar?.headers) {
    params.headers = { ...JSON_HEADERS, ...cookieJar.headers };
  } else if (cookieJar) {
    params.jar = cookieJar;
  }

  const res = http.get(url, params);
  return parseTrpcResponse(res, procedure);
}

/**
 * Call a tRPC mutation procedure (POST).
 * Returns the parsed result data or null on failure.
 */
export function trpcMutation(procedure, input, cookieJar = null) {
  const url = `${BASE_URL}/api/trpc/${procedure}?batch=1`;
  const body = JSON.stringify({ "0": { json: input } });

  const params = { headers: JSON_HEADERS, redirects: 0 };
  if (cookieJar?.headers) {
    params.headers = { ...JSON_HEADERS, ...cookieJar.headers };
  } else if (cookieJar) {
    params.jar = cookieJar;
  }

  const res = http.post(url, body, params);
  return parseTrpcResponse(res, procedure);
}

function parseTrpcResponse(res, procedure) {
  const ok = check(res, {
    [`${procedure}: status 200`]: (r) => r.status === 200,
  });

  if (!ok) return null;

  try {
    const body = JSON.parse(res.body);
    // tRPC batch response is an array
    const first = Array.isArray(body) ? body[0] : body;
    if (first?.error) {
      // Don't fail the check — let callers decide if an error is acceptable
      return null;
    }
    return first?.result?.data?.json ?? first?.result?.data ?? null;
  } catch {
    return null;
  }
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Build a fake Easy Auth principal header for load tests.
 * Each VU should call this once and reuse the returned headers across requests.
 */
export function emailLogin(email, password, role = "architect") {
  void password;

  const tenantId = __ENV.AAD_TENANT_ID;
  const clientId = __ENV.AAD_CLIENT_ID;
  if (!tenantId || !clientId) {
    throw new Error("AAD_TENANT_ID and AAD_CLIENT_ID must be set for load tests");
  }

  const payload = {
    claims: [
      { typ: "tid", val: tenantId },
      { typ: "aud", val: clientId },
      { typ: "oid", val: `loadtest-${role}-${email}` },
      { typ: "sub", val: `loadtest-${role}-${email}` },
    ],
    userDetails: email,
    userRoles: role === "supplier" ? ["supplier"] : role === "admin" ? ["admin"] : ["architect"],
    identityProvider: "aad",
  };

  return {
    headers: {
      "x-ms-client-principal": encoding.b64encode(JSON.stringify(payload)),
    },
  };
}

// ── REST helpers ──────────────────────────────────────────────────────────────

export function restGet(path, cookieJar = null) {
  const params = { headers: JSON_HEADERS, redirects: 0 };
  if (cookieJar?.headers) {
    params.headers = { ...JSON_HEADERS, ...cookieJar.headers };
  } else if (cookieJar) {
    params.jar = cookieJar;
  }
  return http.get(`${BASE_URL}${path}`, params);
}

export function restPost(path, body, cookieJar = null) {
  const params = { headers: JSON_HEADERS, redirects: 0 };
  if (cookieJar?.headers) {
    params.headers = { ...JSON_HEADERS, ...cookieJar.headers };
  } else if (cookieJar) {
    params.jar = cookieJar;
  }
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), params);
}

// ── Random data helpers ───────────────────────────────────────────────────────

const MATERIALS = ["CLT Panel", "Recycled Steel Beam", "Low-Carbon Concrete", "Mineral Wool Insulation", "FSC Timber"];
const UNITS = ["SF", "LF", "EA", "CY", "TON"];
const LOCATIONS = ["Austin, TX", "Denver, CO", "Seattle, WA", "Chicago, IL", "Boston, MA"];
const CATEGORIES = ["structural", "insulation", "cladding", "flooring", "roofing"];

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomMaterial() { return randomItem(MATERIALS); }
export function randomUnit()     { return randomItem(UNITS); }
export function randomLocation() { return randomItem(LOCATIONS); }
export function randomCategory() { return randomItem(CATEGORIES); }

/** Future deadline between 7 and 60 days from now */
export function futureDeadline(daysMin = 7, daysMax = 60) {
  const d = new Date();
  d.setDate(d.getDate() + randomInt(daysMin, daysMax));
  return d.toISOString();
}
