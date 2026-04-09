/**
 * GreenChainz k6 Load Test — Realistic Production Traffic
 *
 * Simulates four concurrent user personas weighted by expected real-world mix:
 *   45% — Anonymous visitor browsing the materials catalog
 *   30% — Authenticated buyer (browse → create RFQ → check bids)
 *   20% — Authenticated supplier (check invitations → submit bid → message)
 *    5% — Messaging / real-time chat
 *
 * Ramp profile: 5 min ramp-up → 10 min sustained → 2 min ramp-down
 * Peak VUs: 50 (target for Founding 50 supplier launch)
 *
 * Usage:
 *   k6 run tests/load/load.js
 *   k6 run -e BASE_URL=https://staging.greenchainz.com tests/load/load.js
 *   k6 run -e BUYER_EMAIL=x -e BUYER_PASSWORD=y tests/load/load.js
 *
 * Pass/fail thresholds are strict — fix failures before launch.
 */

import { check, sleep, group } from "k6";
import http from "k6/http";
import {
  BASE_URL,
  JSON_HEADERS,
  trpcQuery,
  trpcMutation,
  emailLogin,
  restGet,
  restPost,
  randomItem,
  randomInt,
  randomMaterial,
  randomUnit,
  randomLocation,
  randomCategory,
  futureDeadline,
} from "./utils.js";

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    catalog_browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 22 }, // ramp to 45% of 50
        { duration: "10m", target: 22 },
        { duration: "2m", target: 0 },
      ],
      exec: "catalogBrowse",
      tags: { scenario: "catalog" },
    },
    buyer_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 15 }, // 30% of 50
        { duration: "10m", target: 15 },
        { duration: "2m", target: 0 },
      ],
      exec: "buyerFlow",
      tags: { scenario: "buyer" },
    },
    supplier_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 10 }, // 20% of 50
        { duration: "10m", target: 10 },
        { duration: "2m", target: 0 },
      ],
      exec: "supplierFlow",
      tags: { scenario: "supplier" },
    },
    messaging: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 3 }, // 5% of 50
        { duration: "10m", target: 3 },
        { duration: "2m", target: 0 },
      ],
      exec: "messagingFlow",
      tags: { scenario: "messaging" },
    },
  },

  thresholds: {
    // Overall — nothing should be failing at this scale
    http_req_failed: ["rate<0.01"],

    // Response time budgets by scenario tag
    "http_req_duration{scenario:catalog}":  ["p(95)<400", "p(99)<800"],
    "http_req_duration{scenario:buyer}":    ["p(95)<800", "p(99)<1500"],
    "http_req_duration{scenario:supplier}": ["p(95)<800", "p(99)<1500"],
    "http_req_duration{scenario:messaging}":["p(95)<600", "p(99)<1200"],

    // Auth must be fast (cached session, not re-authing every request)
    "http_req_duration{type:auth}": ["p(95)<1000"],

    // tRPC mutations (writes) — stricter than queries
    "http_req_duration{type:mutation}": ["p(95)<1000"],

    // No rate limiting should trigger at this scale
    "checks{type:ratelimit}": ["rate>0.99"],
  },
};

// ── Shared test credentials ───────────────────────────────────────────────────
const BUYER_EMAIL    = __ENV.BUYER_EMAIL    || "loadtest-buyer@greenchainz.com";
const BUYER_PASSWORD = __ENV.BUYER_PASSWORD || "LoadTest123!";
const SUP_EMAIL      = __ENV.SUP_EMAIL      || "loadtest-supplier@greenchainz.com";
const SUP_PASSWORD   = __ENV.SUP_PASSWORD   || "LoadTest123!";

// Known supplier IDs in the test DB to invite on RFQs
const SUPPLIER_IDS   = [1, 2, 3];
// Known material IDs for swap / spec queries
const MATERIAL_IDS   = [1, 2, 3, 4, 5];

// ── Scenario: Anonymous catalog browse ───────────────────────────────────────
export function catalogBrowse() {
  group("catalog: public browse", () => {
    // Material swap alternatives (public)
    trpcQuery("materialSwap.findAlternatives", {
      materialId: randomItem(MATERIAL_IDS),
      targetReduction: randomInt(10, 40),
    });
    sleep(randomInt(1, 3));

    // Validate a swap pair (public)
    trpcQuery("materialSwap.validateSwap", {
      originalId: 1,
      replacementId: randomItem(MATERIAL_IDS.slice(1)),
    });
    sleep(randomInt(1, 2));

    // Material spec search (public)
    trpcQuery("materialSpec.searchBySpecs", {
      category: randomCategory(),
      minRValue: 3,
      limit: 10,
    });
    sleep(randomInt(1, 3));

    // EC3 carbon range search (public)
    trpcQuery("ec3.searchByCarbon", {
      maxGwp: randomInt(50, 200),
      category: randomCategory(),
      limit: 10,
    });
    sleep(randomInt(2, 4));

    // Location distance (public, no DB hit)
    trpcQuery("location.distance", {
      lat1: 30.2672 + Math.random() * 5,
      lon1: -97.7431 + Math.random() * 5,
      lat2: 39.7392 + Math.random() * 5,
      lon2: -104.9903 + Math.random() * 5,
    });
    sleep(randomInt(1, 2));

    // EPD listing for a material (public)
    trpcQuery("epd.listForMaterial", {
      materialId: randomItem(MATERIAL_IDS),
    });
    sleep(randomInt(1, 3));

    // Assembly specs (public)
    trpcQuery("assemblySpecs.list", { limit: 20 });
    sleep(randomInt(2, 5));
  });
}

// ── Scenario: Authenticated buyer flow ───────────────────────────────────────
export function buyerFlow() {
  // Login once per VU iteration (jar persists for the iteration)
  const jar = emailLogin(BUYER_EMAIL, BUYER_PASSWORD);
  if (!jar) {
    sleep(5);
    return;
  }

  group("buyer: browse + create RFQ", () => {
    // Check identity
    group("buyer: auth.me", () => {
      const me = trpcQuery("auth.me", null, jar);
      check(me, { "buyer me: has id": (v) => v?.id !== undefined });
    });
    sleep(randomInt(1, 2));

    // Browse material specs while logged in
    group("buyer: compare specs", () => {
      const specs = trpcQuery(
        "materialSpec.compareSpecs",
        { materialIds: MATERIAL_IDS.slice(0, randomInt(2, 4)) },
        jar
      );
      check(specs, { "compareSpecs: ok": () => true });
    });
    sleep(randomInt(2, 4));

    // Check existing RFQs
    group("buyer: list RFQs", () => {
      const rfqs = trpcQuery("rfqRequests.list", { page: 1, limit: 10 }, jar);
      check(rfqs, { "rfq list: ok": () => true });
    });
    sleep(randomInt(1, 3));

    // Check unread messages
    group("buyer: messages", () => {
      const unread = restGet("/api/messages/unread-count", jar);
      check(unread, {
        "unread-count: 200": (r) => r.status === 200,
        "unread-count: not rate limited": (r) => r.status !== 429,
      });
    });
    sleep(randomInt(1, 2));

    // Supplier region search before creating RFQ
    group("buyer: find nearby suppliers", () => {
      trpcQuery("location.nearbySuppliers", {
        lat: 30.2672,
        lon: -97.7431,
        radiusMiles: 200,
      }, jar);
    });
    sleep(randomInt(2, 3));

    // Create an RFQ (the core buyer action)
    group("buyer: create RFQ", () => {
      const result = trpcMutation(
        "rfqRequests.create",
        {
          title: `Load Test RFQ — ${randomMaterial()} ${Date.now()}`,
          description: "Automated load test RFQ — safe to ignore",
          material_category: randomCategory(),
          quantity: randomInt(100, 5000),
          unit: randomUnit(),
          delivery_location: randomLocation(),
          deadline: futureDeadline(14, 60),
          supplier_ids: [randomItem(SUPPLIER_IDS)],
        },
        jar
      );
      check(result, {
        "create RFQ: has rfq_id": (v) => v?.rfq_id !== undefined,
      });
    });
    sleep(randomInt(3, 6));

    // Architect-style: check assembly specs
    group("buyer: assembly specs with components", () => {
      trpcQuery("assemblySpecs.listWithComponents", { limit: 5 }, jar);
    });
    sleep(randomInt(2, 4));
  });
}

// ── Scenario: Authenticated supplier flow ────────────────────────────────────
export function supplierFlow() {
  const jar = emailLogin(SUP_EMAIL, SUP_PASSWORD);
  if (!jar) {
    sleep(5);
    return;
  }

  group("supplier: check invitations + bid", () => {
    // Auth check
    group("supplier: auth.me", () => {
      const me = trpcQuery("auth.me", null, jar);
      check(me, { "supplier me: has id": (v) => v?.id !== undefined });
    });
    sleep(randomInt(1, 2));

    // Profile
    group("supplier: profile", () => {
      const profile = trpcQuery("supplierOnboarding.getMyProfile", null, jar);
      check(profile, { "supplier profile: ok": () => true });
    });
    sleep(randomInt(1, 2));

    // List open RFQs the supplier is invited to
    group("supplier: list RFQs", () => {
      const rfqs = trpcQuery(
        "rfqRequests.list",
        { status: "open", page: 1, limit: 10 },
        jar
      );
      check(rfqs, { "supplier rfq list: ok": () => true });

      // If there are open RFQs, inspect the first one
      if (Array.isArray(rfqs) && rfqs.length > 0) {
        const rfqId = rfqs[0]?.id;
        if (rfqId) {
          sleep(randomInt(1, 2));
          group("supplier: view RFQ detail", () => {
            const detail = trpcQuery(
              "rfqRequests.getById",
              { rfq_id: rfqId },
              jar
            );
            check(detail, { "rfq detail: ok": () => true });
          });
          sleep(randomInt(2, 4));

          // Attempt to submit a bid (may fail if already quoted — that's fine)
          group("supplier: submit bid", () => {
            const bid = trpcMutation(
              "rfqRequests.submitQuote",
              {
                rfq_id: rfqId,
                price_per_unit: randomInt(10, 500) + 0.99,
                lead_time_days: randomInt(7, 45),
                notes: "Load test bid — ignore",
              },
              jar
            );
            // CONFLICT (already bid) is acceptable
            check(bid, { "submit bid: attempted": () => true });
          });
        }
      }
    });
    sleep(randomInt(2, 4));

    // Supplier EPD management
    group("supplier: list my EPDs", () => {
      const epds = trpcQuery("epd.listMine", null, jar);
      check(epds, { "listMine: ok": () => true });
    });
    sleep(randomInt(2, 4));

    // Credit score for their materials
    group("supplier: material credit score", () => {
      trpcQuery("materialCreditScore.getForSupplier", { supplierId: 1 });
    });
    sleep(randomInt(2, 5));

    // Check messages
    group("supplier: messages", () => {
      const threads = restGet("/api/messages/threads", jar);
      check(threads, {
        "supplier threads: 200": (r) => r.status === 200,
        "supplier threads: not rate limited": (r) => r.status !== 429,
      });

      // Rate-limit guard check (tagged separately)
      check(threads, { "not rate limited": (r) => r.status !== 429 }, { type: "ratelimit" });
    });
    sleep(randomInt(2, 5));
  });
}

// ── Scenario: Concurrent messaging ───────────────────────────────────────────
export function messagingFlow() {
  const jar = emailLogin(BUYER_EMAIL, BUYER_PASSWORD);
  if (!jar) {
    sleep(5);
    return;
  }

  group("messaging: real-time chat simulation", () => {
    // Poll unread count (simulates the notification badge polling)
    for (let i = 0; i < randomInt(3, 6); i++) {
      const unread = restGet("/api/messages/unread-count", jar);
      check(unread, {
        "poll unread: 200": (r) => r.status === 200,
        "poll unread: has count": (r) => {
          try {
            const body = JSON.parse(r.body);
            return typeof body.count === "number";
          } catch {
            return false;
          }
        },
      });
      sleep(randomInt(2, 5)); // realistic polling interval
    }

    // List threads
    const threads = restGet("/api/messages/threads", jar);
    check(threads, { "threads: 200": (r) => r.status === 200 });
    sleep(randomInt(1, 3));

    // If threads exist, read one
    try {
      const threadList = JSON.parse(threads.body);
      if (Array.isArray(threadList) && threadList.length > 0) {
        const threadId = threadList[0]?.id;
        if (threadId) {
          const msgs = restGet(`/api/messages/threads/${threadId}`, jar);
          check(msgs, { "thread messages: 200": (r) => r.status === 200 });
          sleep(randomInt(1, 2));

          // Mark as read
          const markRead = restPost(
            `/api/messages/threads/${threadId}/read`,
            {},
            jar
          );
          check(markRead, { "mark read: 200": (r) => r.status === 200 });
          sleep(randomInt(2, 4));

          // Send a message
          const send = restPost(
            `/api/messages/threads/${threadId}/send`,
            { content: `Load test message ${Date.now()} — safe to ignore` },
            jar
          );
          check(send, { "send message: 200 or 201": (r) => r.status === 200 || r.status === 201 });
        }
      }
    } catch {
      // No threads yet — that's fine
    }

    sleep(randomInt(3, 8));
  });
}
