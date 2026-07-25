/**
 * GreenChainz k6 Stress Test — Find the Breaking Point
 *
 * Drives traffic beyond expected peak to find:
 *   - At what VU count does p95 response time breach 2s?
 *   - At what VU count does error rate climb above 1%?
 *   - Do we recover cleanly when load drops back to normal?
 *
 * Focuses on the two highest-cost flows: RFQ creation (buyer) and
 * concurrent catalog reads (anonymous). These produce the most DB writes
 * and read load respectively.
 *
 * Stages:
 *   10 VU baseline → spike to 50 → spike to 100 → spike to 200 → recovery
 *
 * This test is EXPECTED to produce failures at peak — that's the point.
 * Review the k6 output to find the inflection point.
 *
 * Usage:
 *   k6 run tests/load/stress.js
 *   k6 run -e BASE_URL=https://staging.greenchainz.com tests/load/stress.js
 *
 * DO NOT run against production without notifying the team.
 */

import { check, sleep, group } from "k6";
import http from "k6/http";
import {
  trpcQuery,
  trpcMutation,
  emailLogin,
  restGet,
  randomItem,
  randomInt,
  randomMaterial,
  randomUnit,
  randomLocation,
  randomCategory,
  futureDeadline,
} from "./utils.js";

export const options = {
  scenarios: {
    // Catalog reads: majority of anonymous traffic — hits DB hardest
    catalog_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 10 },   // warm-up baseline
        { duration: "3m", target: 50 },   // expected peak
        { duration: "3m", target: 100 },  // 2x expected peak
        { duration: "3m", target: 200 },  // 4x — find the wall
        { duration: "2m", target: 50 },   // recovery check
        { duration: "2m", target: 0 },
      ],
      exec: "catalogStress",
      tags: { scenario: "catalog_stress" },
    },

    // RFQ creates: write-heavy, most expensive DB operation
    rfq_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 5 },
        { duration: "3m", target: 25 },
        { duration: "3m", target: 50 },
        { duration: "3m", target: 100 },
        { duration: "2m", target: 25 },
        { duration: "2m", target: 0 },
      ],
      exec: "rfqStress",
      tags: { scenario: "rfq_stress" },
    },

    // Auth flood: tests session creation throughput
    auth_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 5 },
        { duration: "5m", target: 30 },
        { duration: "3m", target: 0 },
      ],
      exec: "authStress",
      tags: { scenario: "auth_stress" },
    },
  },

  // Thresholds deliberately relaxed — we're looking for the cliff, not passing/failing
  thresholds: {
    // We want to SEE error rate, not abort — comment out to remove hard stop
    http_req_failed: ["rate<0.15"],  // allow up to 15% errors during stress

    // Track where timing falls apart
    "http_req_duration{scenario:catalog_stress}": ["p(99)<5000"],
    "http_req_duration{scenario:rfq_stress}":     ["p(99)<5000"],
    "http_req_duration{scenario:auth_stress}":    ["p(99)<5000"],

    // If p95 goes above 2s on catalog, flag it — that's our SLA
    "http_req_duration{scenario:catalog_stress}": ["p(95)<2000"],
  },
};

const BUYER_EMAIL    = __ENV.BUYER_EMAIL    || "loadtest-buyer@greenchainz.com";
const BUYER_PASSWORD = __ENV.BUYER_PASSWORD || "LoadTest123!";
const SUPPLIER_IDS   = [1, 2, 3];
const MATERIAL_IDS   = [1, 2, 3, 4, 5];

// ── Scenario: Catalog read stress ────────────────────────────────────────────
export function catalogStress() {
  // Mix of the most expensive public read paths

  // 1. Material swap search (joins + ranking)
  trpcQuery("materialSwap.findAlternatives", {
    materialId: randomItem(MATERIAL_IDS),
    targetReduction: randomInt(5, 50),
  });

  // 2. Spec search (filtered query)
  trpcQuery("materialSpec.searchBySpecs", {
    category: randomCategory(),
    limit: 20,
  });

  // 3. EPD list for a material
  trpcQuery("epd.listForMaterial", { materialId: randomItem(MATERIAL_IDS) });

  // 4. EC3 carbon search
  trpcQuery("ec3.searchByCarbon", {
    maxGwp: randomInt(50, 300),
    limit: 10,
  });

  // Short sleep — simulate fast page navigation, not human reading
  sleep(randomInt(0, 1));
}

// ── Scenario: RFQ write stress ────────────────────────────────────────────────
export function rfqStress() {
  const jar = emailLogin(BUYER_EMAIL, BUYER_PASSWORD, "architect");
  if (!jar) {
    sleep(3);
    return;
  }

  group("rfq stress: create + list", () => {
    // Create RFQ (DB write + rfq_suppliers insert)
    const rfq = trpcMutation(
      "rfqRequests.create",
      {
        title: `Stress Test ${Date.now()} ${Math.random()}`,
        material_category: randomCategory(),
        quantity: randomInt(50, 10000),
        unit: randomUnit(),
        delivery_location: randomLocation(),
        deadline: futureDeadline(7, 90),
        supplier_ids: [randomItem(SUPPLIER_IDS)],
      },
      jar
    );
    check(rfq, { "stress rfq create: has id": (v) => v?.rfq_id !== undefined });

    sleep(randomInt(0, 1));

    // Immediately list to hit the read path too
    trpcQuery("rfqRequests.list", { page: 1, limit: 20 }, jar);
  });

  sleep(randomInt(1, 3));
}

// ── Scenario: Auth stress ────────────────────────────────────────────────────
export function authStress() {
  group("auth stress: login + me", () => {
    // Login (scrypt verify — CPU-bound, deliberate slowdown by design)
    const jar = emailLogin(BUYER_EMAIL, BUYER_PASSWORD, "architect");

    if (jar) {
      // Immediate auth.me after login
      const me = trpcQuery("auth.me", null, jar);
      check(me, { "stress auth.me: ok": (v) => v !== null });
    }
  });

  // No sleep — as fast as possible to test auth throughput
  sleep(randomInt(0, 1));
}
