/**
 * Cross-tenant isolation tests — Supplier RFQ Bids (the money objects).
 *
 * A bid/quote is the most commercially sensitive object a supplier owns: its
 * price, lead time and notes are how it wins work. One supplier organization
 * must NEVER be able to read, list or mutate another supplier's bids.
 *
 * Enforcement seam under test (server/supplier-rfq-router.ts):
 *   1. `protectedProcedure` requires an authenticated `ctx.user`.
 *   2. The caller's supplier record is resolved via `suppliers.userId = ctx.user.id`.
 *   3. Every bid query is scoped in SQL to that supplier id
 *      (`where(and(eq(rfqBids.id, x), eq(rfqBids.supplierId, mine)))`).
 *
 * These tests use an HONEST in-memory fake DB (see test-helpers/tenant-fake-db)
 * that genuinely evaluates the WHERE predicate against seeded rows — so if the
 * `supplierId` scoping were removed, the cross-tenant assertions would FAIL.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeDb, makeDrizzleOpMock } from "./test-helpers/tenant-fake-db";
import { suppliers, rfqBids } from "../drizzle/schema";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("drizzle-orm", async (orig) => ({
  ...(await orig<typeof import("drizzle-orm")>()),
  ...makeDrizzleOpMock(),
}));
vi.mock("./db", () => ({ getDb: vi.fn() }));
// getStats/getMatchedRfqs reach into rfq-service — stub it so the unit stays hermetic.
vi.mock("./rfq-service", () => ({
  getSupplierMatchedRfqs: vi.fn().mockResolvedValue([]),
}));

import { supplierRfqRouter } from "./supplier-rfq-router";
import { getDb } from "./db";

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Supplier C — legitimate owner of bid #1. */
const SUPPLIER_C = { id: 30, role: "supplier" as const, email: "c@test.com", openId: "oid-c", name: "Supplier C" };
/** Supplier D — a different supplier org that must never see C's bids. */
const SUPPLIER_D = { id: 40, role: "supplier" as const, email: "d@test.com", openId: "oid-d", name: "Supplier D" };

const SUP_C_ID = 100; // suppliers.id for C
const SUP_D_ID = 200; // suppliers.id for D
const C_BID_ORIGINAL_PRICE = "5000.00";

function callerAs(user: typeof SUPPLIER_C | null) {
  return supplierRfqRouter.createCaller({
    user: user as any,
    auth: user
      ? { userId: user.openId, email: user.email, role: user.role, tenantId: null, rawRoles: [user.role] }
      : null,
    req: {
      headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "vitest" },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {} as any,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Bid tenant isolation (supplier-rfq-router)", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new FakeDb();
    db.seed(suppliers, [
      { id: SUP_C_ID, userId: SUPPLIER_C.id, companyName: "C Co", latitude: null, longitude: null },
      { id: SUP_D_ID, userId: SUPPLIER_D.id, companyName: "D Co", latitude: null, longitude: null },
    ]);
    db.seed(rfqBids, [
      {
        id: 1,
        rfqId: 5,
        supplierId: SUP_C_ID,
        bidPrice: C_BID_ORIGINAL_PRICE,
        leadDays: 14,
        status: "submitted",
        notes: "Supplier C confidential pricing",
        deletedAt: null,
        createdAt: new Date("2026-01-01"),
      },
    ]);
    (getDb as any).mockResolvedValue(db);
  });

  describe("read-by-id (getBid)", () => {
    it("lets Supplier C read its own bid", async () => {
      const bid = await callerAs(SUPPLIER_C).getBid({ bidId: 1 });
      expect(bid.id).toBe(1);
      expect(bid.supplierId).toBe(SUP_C_ID);
    });

    it("BLOCKS Supplier D from reading Supplier C's bid", async () => {
      // D is a valid supplier, but the bid is scoped to C's supplier id.
      await expect(callerAs(SUPPLIER_D).getBid({ bidId: 1 })).rejects.toThrow(/bid not found/i);
    });
  });

  describe("list (getBidHistory / getStats)", () => {
    it("returns only the caller's own bids", async () => {
      const cHistory = await callerAs(SUPPLIER_C).getBidHistory({ limit: 20, offset: 0 });
      expect(cHistory.map((b: any) => b.id)).toEqual([1]);

      const dHistory = await callerAs(SUPPLIER_D).getBidHistory({ limit: 20, offset: 0 });
      expect(dHistory).toEqual([]);
    });

    it("never leaks another supplier's bid count/pricing through aggregate stats", async () => {
      const cStats = await callerAs(SUPPLIER_C).getStats();
      expect(cStats.totalBids).toBe(1);

      const dStats = await callerAs(SUPPLIER_D).getStats();
      expect(dStats.totalBids).toBe(0);
      expect(dStats.avgBidPrice).toBe(0);
    });
  });

  describe("update (updateBid)", () => {
    it("BLOCKS Supplier D from mutating Supplier C's bid and leaves it untouched", async () => {
      await expect(
        callerAs(SUPPLIER_D).updateBid({ bidId: 1, bidPrice: 1 }),
      ).rejects.toThrow(/not found|unauthorized/i);

      // The original bid price must be exactly as seeded — no cross-tenant write.
      const [bid] = db.snapshot(rfqBids);
      expect(bid.bidPrice).toBe(C_BID_ORIGINAL_PRICE);
    });

    it("lets Supplier C update its own bid", async () => {
      const res = await callerAs(SUPPLIER_C).updateBid({ bidId: 1, bidPrice: 6000 });
      expect(res.success).toBe(true);
      const [bid] = db.snapshot(rfqBids);
      expect(bid.bidPrice).toBe("6000");
    });
  });

  describe("unauthenticated access", () => {
    it("rejects an anonymous caller before any data access", async () => {
      await expect(callerAs(null).getBid({ bidId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
    });
  });
});
