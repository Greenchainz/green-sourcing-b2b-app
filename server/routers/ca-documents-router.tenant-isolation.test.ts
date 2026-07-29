/**
 * Cross-tenant isolation tests — CA Documents (RFIs / change requests).
 *
 * CA documents carry project-sensitive Q&A, cost and schedule impacts. They are
 * owned by their creator. Enforcement seam (server/routers/ca-documents-router.ts):
 *   `getOwnedDocumentOrThrow` scopes reads/mutations in SQL to
 *   `and(eq(caDocuments.id, x), eq(caDocuments.createdBy, ctx.user.id))`, and
 *   `listMine` filters by `createdBy = ctx.user.id`.
 *
 * Honest fake DB → removing the `createdBy` predicate makes these FAIL.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeDb, makeDrizzleOpMock } from "../test-helpers/tenant-fake-db";
import { caDocuments, caDocumentMessages } from "../../drizzle/schema";

vi.mock("drizzle-orm", async (orig) => ({
  ...(await orig<typeof import("drizzle-orm")>()),
  ...makeDrizzleOpMock(),
}));
vi.mock("../db", () => ({ getDb: vi.fn() }));

import { caDocumentsRouter } from "./ca-documents-router";
import { getDb } from "../db";

const USER_A = { id: 10, role: "buyer" as const, email: "a@test.com", openId: "oid-a", name: "User A" };
const USER_B = { id: 20, role: "buyer" as const, email: "b@test.com", openId: "oid-b", name: "User B" };

function callerAs(user: typeof USER_A | null) {
  return caDocumentsRouter.createCaller({
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

describe("CA document tenant isolation (ca-documents-router)", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new FakeDb();
    db.seed(caDocuments, [
      { id: 1, createdBy: USER_A.id, type: "rfi", status: "open", ballInCourt: "buyer", documentNumber: "RFI-1", title: "A RFI", createdAt: new Date("2026-01-01") },
      { id: 2, createdBy: USER_B.id, type: "rfi", status: "open", ballInCourt: "buyer", documentNumber: "RFI-2", title: "B RFI", createdAt: new Date("2026-01-02") },
    ]);
    db.seed(caDocumentMessages, []);
    (getDb as any).mockResolvedValue(db);
  });

  describe("read-by-id (getById)", () => {
    it("lets the owner read their own document", async () => {
      const res = await callerAs(USER_A).getById({ documentId: 1 });
      expect(res.document.id).toBe(1);
    });

    it("BLOCKS User B from reading User A's document (NOT_FOUND)", async () => {
      await expect(callerAs(USER_B).getById({ documentId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" }),
      );
    });
  });

  describe("list (listMine)", () => {
    it("returns only the caller's own documents", async () => {
      const a = await callerAs(USER_A).listMine({ limit: 100 });
      expect(a.map((r: any) => r.id)).toEqual([1]);
      const b = await callerAs(USER_B).listMine({ limit: 100 });
      expect(b.map((r: any) => r.id)).toEqual([2]);
    });
  });

  describe("update / append (updateStatus / addMessage)", () => {
    it("BLOCKS User B from changing User A's document status and leaves it untouched", async () => {
      await expect(
        callerAs(USER_B).updateStatus({ documentId: 1, status: "closed" }),
      ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
      const a = db.snapshot(caDocuments).find((r) => r.id === 1);
      expect(a?.status).toBe("open");
    });

    it("BLOCKS User B from posting a message onto User A's document (no message written)", async () => {
      await expect(
        callerAs(USER_B).addMessage({ documentId: 1, message: "leak attempt" }),
      ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
      expect(db.snapshot(caDocumentMessages)).toHaveLength(0);
    });

    it("lets User A append a message to their own document", async () => {
      const res = await callerAs(USER_A).addMessage({ documentId: 1, message: "hi" });
      expect(res.messageId).toBeDefined();
      expect(db.snapshot(caDocumentMessages)).toHaveLength(1);
    });
  });

  describe("unauthenticated access", () => {
    it("rejects an anonymous caller", async () => {
      await expect(callerAs(null).getById({ documentId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
    });
  });
});
