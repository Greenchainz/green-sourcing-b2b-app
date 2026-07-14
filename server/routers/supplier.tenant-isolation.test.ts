/**
 * Cross-tenant isolation tests — Supplier organization profile.
 *
 * A supplier's profile (company details, service area, EPD references) is its
 * org identity. Enforcement seam (server/routers/supplier.ts):
 *   `getMyProfile` / `updateProfile` / `submitOnboarding` resolve the row purely
 *   via `eq(suppliers.userId, ctx.user.id)` — the client never supplies a
 *   supplier id, so a caller can only ever read/mutate their OWN org profile.
 *
 * Honest fake DB → if the `userId` scoping were dropped, User B would be able to
 * read or overwrite User A's profile and these assertions would FAIL.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeDb, makeDrizzleOpMock } from "../test-helpers/tenant-fake-db";
import { suppliers } from "../../drizzle/schema";

vi.mock("drizzle-orm", async (orig) => ({
  ...(await orig<typeof import("drizzle-orm")>()),
  ...makeDrizzleOpMock(),
}));
vi.mock("../db", () => ({ getDb: vi.fn() }));
// Keep the unit hermetic: no emails, no external verification, no geocoding.
vi.mock("../email-service", () => ({
  sendSupplierWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendFounderNewSupplierAlert: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/epd-intelligence", () => ({ parseEpdPdf: vi.fn().mockResolvedValue({}) }));
vi.mock("../services/supplier-verification", () => ({
  getSupplierVerificationSnapshot: vi.fn().mockResolvedValue({}),
}));
vi.mock("../services/geocode-project-location", () => ({
  geocodeProjectLocation: vi.fn().mockResolvedValue({ latitude: null, longitude: null }),
}));

import { supplierOnboardingRouter } from "./supplier";
import { getDb } from "../db";

const USER_A = { id: 10, role: "supplier" as const, email: "a@test.com", openId: "oid-a", name: "User A" };
const USER_B = { id: 20, role: "supplier" as const, email: "b@test.com", openId: "oid-b", name: "User B" };

const A_SUPPLIER_ID = 100;

function callerAs(user: typeof USER_A | null) {
  return supplierOnboardingRouter.createCaller({
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

describe("Supplier profile tenant isolation (supplier router)", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new FakeDb();
    // Only User A owns a supplier profile. User B is a supplier account with no profile yet.
    db.seed(suppliers, [
      {
        id: A_SUPPLIER_ID,
        userId: USER_A.id,
        companyName: "A GreenBuild Co",
        contactName: "Alice",
        email: "a@test.com",
        description: "A original description",
        materialCategories: ["insulation"],
        city: null,
        state: null,
        zipCode: null,
      },
    ]);
    (getDb as any).mockResolvedValue(db);
  });

  describe("read (getMyProfile)", () => {
    it("returns User A's own profile", async () => {
      const profile = await callerAs(USER_A).getMyProfile();
      expect(profile?.id).toBe(A_SUPPLIER_ID);
    });

    it("returns null for User B — never another org's profile", async () => {
      const profile = await callerAs(USER_B).getMyProfile();
      expect(profile).toBeNull();
    });
  });

  describe("update (updateProfile)", () => {
    it("BLOCKS User B from overwriting User A's profile (NOT_FOUND) and leaves it untouched", async () => {
      await expect(
        callerAs(USER_B).updateProfile({ description: "hijacked by B" }),
      ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));

      const a = db.snapshot(suppliers).find((r) => r.id === A_SUPPLIER_ID);
      expect(a?.description).toBe("A original description"); // unchanged
    });

    it("lets User A update their own profile", async () => {
      const res = await callerAs(USER_A).updateProfile({ description: "A updated" });
      expect(res.success).toBe(true);
      const a = db.snapshot(suppliers).find((r) => r.id === A_SUPPLIER_ID);
      expect(a?.description).toBe("A updated");
    });
  });

  describe("unauthenticated access", () => {
    it("rejects an anonymous caller", async () => {
      await expect(callerAs(null).getMyProfile()).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
    });
  });
});
