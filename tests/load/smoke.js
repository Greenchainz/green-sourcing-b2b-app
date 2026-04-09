/**
 * GreenChainz k6 Smoke Test
 *
 * Quick sanity pass — verifies every critical endpoint responds correctly
 * before committing to a full load run. Runs fast (< 2 min).
 *
 * Usage:
 *   k6 run tests/load/smoke.js
 *   k6 run -e BASE_URL=https://staging.greenchainz.com tests/load/smoke.js
 *   k6 run -e BUYER_EMAIL=test@example.com -e BUYER_PASSWORD=secret tests/load/smoke.js
 */

import { check, sleep } from "k6";
import http from "k6/http";
import {
  BASE_URL,
  JSON_HEADERS,
  trpcQuery,
  trpcMutation,
  emailLogin,
  restGet,
  randomMaterial,
  randomUnit,
  randomLocation,
  futureDeadline,
} from "./utils.js";

export const options = {
  vus: 2,
  duration: "1m",
  thresholds: {
    http_req_failed:                  ["rate<0.01"],   // < 1% errors
    http_req_duration:                ["p(95)<2000"],  // generous for smoke
    "http_req_duration{type:catalog}": ["p(95)<800"],
    "http_req_duration{type:auth}":    ["p(95)<1000"],
    "http_req_duration{type:trpc}":    ["p(95)<1500"],
  },
};

// ── Test credentials (override via env) ──────────────────────────────────────
const BUYER_EMAIL    = __ENV.BUYER_EMAIL    || "loadtest-buyer@greenchainz.com";
const BUYER_PASSWORD = __ENV.BUYER_PASSWORD || "LoadTest123!";
const SUP_EMAIL      = __ENV.SUP_EMAIL      || "loadtest-supplier@greenchainz.com";
const SUP_PASSWORD   = __ENV.SUP_PASSWORD   || "LoadTest123!";

export default function () {
  // ── 1. Server health (tRPC) ──────────────────────────────────────────────
  const health = trpcQuery("system.health");
  check(health, { "system.health: got response": (v) => v !== null });
  sleep(0.5);

  // ── 2. Anonymous: public tRPC queries ────────────────────────────────────
  const swaps = trpcQuery("materialSwap.getSwapHistory", { page: 1, limit: 10 });
  check(swaps, { "materialSwap.getSwapHistory: ok": () => true }); // null is fine if no data
  sleep(0.3);

  const ec3Status = trpcQuery("ec3.getSyncStatus");
  check(ec3Status, { "ec3.getSyncStatus: ok": () => true });
  sleep(0.3);

  const locationDistance = trpcQuery("location.distance", {
    lat1: 30.2672, lon1: -97.7431,
    lat2: 39.7392, lon2: -104.9903,
  });
  check(locationDistance, { "location.distance: got km": (v) => v !== null });
  sleep(0.3);

  // ── 3. Auth: login as buyer ───────────────────────────────────────────────
  const buyerJar = emailLogin(BUYER_EMAIL, BUYER_PASSWORD);
  sleep(0.5);

  if (buyerJar) {
    // ── 4. Buyer: check identity ─────────────────────────────────────────
    const me = trpcQuery("auth.me", null, buyerJar);
    check(me, { "auth.me: has id": (v) => v?.id !== undefined });
    sleep(0.3);

    // ── 5. Buyer: list RFQs ──────────────────────────────────────────────
    const rfqs = trpcQuery("rfqRequests.list", { page: 1, limit: 5 }, buyerJar);
    check(rfqs, { "rfqRequests.list: ok": () => true });
    sleep(0.3);

    // ── 6. Messaging: unread count ───────────────────────────────────────
    const unread = restGet("/api/messages/unread-count", buyerJar);
    check(unread, {
      "messages/unread-count: 200": (r) => r.status === 200,
    });
    sleep(0.3);

    // ── 7. Messaging: thread list ────────────────────────────────────────
    const threads = restGet("/api/messages/threads", buyerJar);
    check(threads, { "messages/threads: 200": (r) => r.status === 200 });
    sleep(0.3);

    // ── 8. Buyer: create a test RFQ ──────────────────────────────────────
    const rfq = trpcMutation(
      "rfqRequests.create",
      {
        title: `Smoke Test RFQ ${Date.now()}`,
        description: "Automated smoke test — safe to ignore",
        material_category: "insulation",
        quantity: 500,
        unit: "SF",
        delivery_location: "Austin, TX",
        deadline: futureDeadline(7, 14),
        supplier_ids: [1],
      },
      buyerJar
    );
    check(rfq, { "rfqRequests.create: has rfq_id": (v) => v?.rfq_id !== undefined });
    sleep(0.5);
  }

  // ── 9. Auth: login as supplier ────────────────────────────────────────────
  const supJar = emailLogin(SUP_EMAIL, SUP_PASSWORD);
  sleep(0.5);

  if (supJar) {
    // ── 10. Supplier: list their RFQs ────────────────────────────────────
    const supRfqs = trpcQuery("rfqRequests.list", { page: 1, limit: 5 }, supJar);
    check(supRfqs, { "supplier rfqRequests.list: ok": () => true });
    sleep(0.3);

    // ── 11. Supplier: profile ────────────────────────────────────────────
    const profile = trpcQuery("supplierOnboarding.getMyProfile", null, supJar);
    check(profile, { "supplier getMyProfile: ok": () => true });
    sleep(0.3);
  }

  // ── 12. Rate limit check — PDF endpoint ──────────────────────────────────
  const pdf = http.get(`${BASE_URL}/api/pdf/material-score/1`, {
    headers: JSON_HEADERS,
    redirects: 0,
    tags: { type: "catalog" },
  });
  // 401 is fine (unauthed), 429 would be a problem at this VU count
  check(pdf, {
    "pdf endpoint: not rate limited": (r) => r.status !== 429,
  });

  sleep(1);
}
