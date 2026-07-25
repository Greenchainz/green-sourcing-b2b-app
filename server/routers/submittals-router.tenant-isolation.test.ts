/**
 * Cross-tenant isolation tests — Submittals (CSI submittal log).
 *
 * Submittals are project-authorship records owned by the user who created them.
 * Enforcement seam (server/routers/submittals-router.ts):
 *   `getOwnedSubmittalOrThrow` scopes every read/mutation in SQL to
 *   `and(eq(submittals.id, x), eq(submittals.createdBy, ctx.user.id))`, and
 *   `listMine` / `listByReference` filter by `createdBy = ctx.user.id`.
 *
 * Uses the honest in-memory fake DB so removing the `createdBy` predicate would
 * make these cross-tenant assertions FAIL.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeDb, makeDrizzleOpMock } from "../test-helpers/tenant-fake-db";
import { submittals, submittalItems } from "../../drizzle/schema";

vi.mock("drizzle-orm", async (orig) => ({
  ...(await orig<typeof import("drizzle-orm")>()),
  ...makeDrizzleOpMock(),
}));
vi.mock("../db", () => ({ getDb: vi.fn() }));

import { submittalsRouter } from "./submittals-router";
import { getDb } from "../db";

const USER_A = { id: 10, role: "buyer" as const, email: "a@test.com", openId: "oid-a", name: "User A" };
const USER_B = { id: 20, role: "buyer" as const, email: "b@test.com", openId: "oid-b", name: "User B" };

function callerAs(user: typeof USER_A | null) {
  return submittalsRouter.createCaller({
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

describe("Submittal tenant isolation (submittals-router)", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new FakeDb();
    db.seed(submittals, [
      { id: 1, createdBy: USER_A.id, submittalNumber: "A-001", title: "A submittal", status: "submitted", ballInCourt: "buyer", createdAt: new Date("2026-01-01") },
      { id: 2, createdBy: USER_B.id, submittalNumber: "B-001", title: "B submittal", status: "draft", ballInCourt: "buyer", createdAt: new Date("2026-01-02") },
    ]);
    db.seed(submittalItems, [
      { id: 1, submittalId: 1, materialId: 1, supplierId: null, notes: "item" },
    ]);
    (getDb as any).mockResolvedValue(db);
  });

  describe("read-by-id (getById)", () => {
    it("lets the owner (User A) read their own submittal", async () => {
      const res = await callerAs(USER_A).getById({ submittalId: 1 });
      expect(res.submittal.id).toBe(1);
      expect(res.items).toHaveLength(1);
    });

    it("BLOCKS User B from reading User A's submittal (NOT_FOUND)", async () => {
      await expect(callerAs(USER_B).getById({ submittalId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" }),
      );
    });
  });

  describe("list (listMine)", () => {
    it("returns only the caller's own submittals", async () => {
      const a = await callerAs(USER_A).listMine({ limit: 100 });
      expect(a.map((r: any) => r.id)).toEqual([1]);

      const b = await callerAs(USER_B).listMine({ limit: 100 });
      expect(b.map((r: any) => r.id)).toEqual([2]);
    });
  });

  describe("update (updateStatus / attachReferences)", () => {
    it("BLOCKS User B from updating User A's submittal and leaves it untouched", async () => {
      await expect(
        callerAs(USER_B).updateStatus({ submittalId: 1, status: "approved_as_noted" }),
      ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));

      const a = db.snapshot(submittals).find((r) => r.id === 1);
      expect(a?.status).toBe("submitted"); // unchanged
    });

    it("BLOCKS User B from attaching references to User A's submittal", async () => {
      await expect(
        callerAs(USER_B).attachReferences({ submittalId: 1, relatedRfqId: 999 }),
      ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
    });

    it("lets User A update their own submittal", async () => {
      const res = await callerAs(USER_A).updateStatus({ submittalId: 1, status: "closed" });
      expect(res.success).toBe(true);
      const a = db.snapshot(submittals).find((r) => r.id === 1);
      expect(a?.status).toBe("closed");
    });
  });

  describe("unauthenticated access", () => {
    it("rejects an anonymous caller", async () => {
      await expect(callerAs(null).getById({ submittalId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
    });
  });
});
