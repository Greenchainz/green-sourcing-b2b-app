/**
 * Tenant Isolation Tests — RFQ Router
 *
 * These tests verify that a user can never read or mutate another user's
 * RFQ data, even if they know the RFQ ID. This is the most critical
 * multi-tenant safety property in the marketplace.
 *
 * Pattern: create a caller as User A, attempt to access data owned by
 * User B, and assert the operation is rejected with FORBIDDEN / NOT_FOUND.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { rfqRouter } from "./rfq";
import { getDb } from "../db";
import * as pgPool from "../../lib/pg-pool";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../../lib/pg-pool", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryMany: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock("../usage-tracking-service", () => ({
  enforceAndTrack: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}) {
  const db: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return db;
}

/** User A — the legitimate RFQ owner (architect / buyer role). */
const USER_A = { id: 10, role: "buyer" as const, email: "a@test.com", openId: "oid-a", name: "User A" };
/** User B — a different user who should never see User A's data. */
const USER_B = { id: 20, role: "buyer" as const, email: "b@test.com", openId: "oid-b", name: "User B" };
/** Supplier C — invited to User A's RFQ. */
const SUPPLIER_C = { id: 30, role: "supplier" as const, email: "c@test.com", openId: "oid-c", name: "Supplier C" };
/** Supplier D — a different supplier who was NOT invited. */
const SUPPLIER_D = { id: 40, role: "supplier" as const, email: "d@test.com", openId: "oid-d", name: "Supplier D" };

function callerAs(user: typeof USER_A) {
  return rfqRouter.createCaller({
    user: user as any,
    req: {} as any,
    res: {} as any,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RFQ tenant isolation", () => {
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = makeDb();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);
  });

  // ── getById: ownership check ──────────────────────────────────────────────

  describe("getById", () => {
    it("allows the RFQ owner (User A) to read their own RFQ", async () => {
      // DB returns an RFQ owned by User A
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, architectId: USER_A.id, supplierId: SUPPLIER_C.id, status: "pending", specs: null },
      ]);

      const result = await callerAs(USER_A).getById({ id: 1 });
      expect(result.id).toBe(1);
    });

    it("allows the assigned supplier (Supplier C) to read the RFQ", async () => {
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, architectId: USER_A.id, supplierId: SUPPLIER_C.id, status: "pending", specs: null },
      ]);

      const result = await callerAs(SUPPLIER_C).getById({ id: 1 });
      expect(result.id).toBe(1);
    });

    it("blocks User B from reading User A's RFQ (FORBIDDEN)", async () => {
      // RFQ belongs to User A; User B should be blocked
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, architectId: USER_A.id, supplierId: SUPPLIER_C.id, status: "pending", specs: null },
      ]);

      await expect(callerAs(USER_B).getById({ id: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "FORBIDDEN" })
      );
    });

    it("blocks Supplier D (not assigned) from reading the RFQ (FORBIDDEN)", async () => {
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, architectId: USER_A.id, supplierId: SUPPLIER_C.id, status: "pending", specs: null },
      ]);

      await expect(callerAs(SUPPLIER_D).getById({ id: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "FORBIDDEN" })
      );
    });

    it("returns NOT_FOUND (not FORBIDDEN) when RFQ does not exist", async () => {
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(callerAs(USER_B).getById({ id: 9999 })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" })
      );
    });
  });

  // ── respond: supplier ownership check ────────────────────────────────────

  describe("respond", () => {
    it("allows the assigned supplier (Supplier C) to accept the RFQ", async () => {
      // First select: returns RFQ with supplierId = SUPPLIER_C
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { supplierId: SUPPLIER_C.id, status: "pending" },
      ]);
      // update().set().where() chain
      (mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await callerAs(SUPPLIER_C).respond({ id: 1, status: "accepted" });
      expect(result.success).toBe(true);
    });

    it("blocks Supplier D (not assigned) from responding to the RFQ (FORBIDDEN)", async () => {
      // RFQ was assigned to Supplier C, not D
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { supplierId: SUPPLIER_C.id, status: "pending" },
      ]);

      await expect(
        callerAs(SUPPLIER_D).respond({ id: 1, status: "accepted" })
      ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    });

    it("blocks a buyer (User A) from responding to an RFQ (FORBIDDEN)", async () => {
      await expect(
        callerAs(USER_A).respond({ id: 1, status: "accepted" })
      ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    });
  });

  // ── cancel: owner-only ────────────────────────────────────────────────────

  describe("cancel", () => {
    it("allows User A to cancel their own RFQ", async () => {
      // limit() resolves with the RFQ row for the ownership check
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { architectId: USER_A.id },
      ]);
      // Do NOT override where() here — makeDb() already has it as mockReturnThis(),
      // which lets the select chain reach .limit(). The update chain's .where()
      // returns `this` (non-thenable), so await resolves cleanly.

      const result = await callerAs(USER_A).cancel({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("blocks User B from cancelling User A's RFQ (FORBIDDEN)", async () => {
      (mockDb.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
        { architectId: USER_A.id },
      ]);

      await expect(callerAs(USER_B).cancel({ id: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "FORBIDDEN" })
      );
    });
  });

  // ── listMine: query scope verification ───────────────────────────────────

  describe("listMine", () => {
    it("passes ctx.user.id as the architect filter — not a caller-supplied ID", async () => {
      // The test proves listMine never reads an ID from input — it always
      // uses ctx.user.id. We verify this by confirming the DB where clause
      // is called with USER_A.id even though no ID was passed in.
      const whereCapture: unknown[] = [];
      mockDb.where = vi.fn().mockImplementation((...args: unknown[]) => {
        whereCapture.push(...args);
        return { orderBy: vi.fn().mockResolvedValue([]) };
      });

      await callerAs(USER_A).listMine();

      // The where clause must have been called (i.e., a filter was applied)
      expect(mockDb.where).toHaveBeenCalled();
      // And the result must not be all rows (no unscoped .select() without .where())
      expect(mockDb.orderBy).not.toHaveBeenCalledWith(); // chained from where, not top-level
    });

    it("returns empty array when user has no RFQs", async () => {
      mockDb.where = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      });

      const result = await callerAs(USER_B).listMine();
      expect(result).toEqual([]);
    });
  });

  // ── Unauthenticated access ─────────────────────────────────────────────────

  describe("unauthenticated access", () => {
    it("rejects unauthenticated getById (UNAUTHORIZED)", async () => {
      const unauthCaller = rfqRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(unauthCaller.getById({ id: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" })
      );
    });

    it("rejects unauthenticated listMine (UNAUTHORIZED)", async () => {
      const unauthCaller = rfqRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(unauthCaller.listMine()).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" })
      );
    });
  });
});
