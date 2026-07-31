import { describe, it, expect, beforeEach, vi } from "vitest";
import { legalRouter } from "./legal-router";
import { getDb } from "./db";
import { legalAcceptances } from "../drizzle/schema";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock request object that satisfies rate limiter's ctx.req.headers access
const mockReq = {
  headers: { "x-forwarded-for": "127.0.0.1" },
  socket: { remoteAddress: "127.0.0.1" },
};

describe("Legal Router", () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    mockCtx = {
      user: {
        id: 123,
      },
      auth: {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'buyer',
        tenantId: 'test-tenant',
        rawRoles: ['buyer'],
      },
      req: mockReq,
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getAcceptanceStatus", () => {
    it("should reject unauthenticated requests", async () => {
      const caller = legalRouter.createCaller({
        user: null,
        auth: null,
        req: mockReq,
      } as any);

      // getAcceptanceStatus is a protectedProcedure — throws for unauthenticated users
      await expect(caller.getAcceptanceStatus()).rejects.toThrow();
    });

    it("should return acceptance status from database", async () => {
      const now = new Date();
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              termsAccepted: 1,
              termsAcceptedAt: now,
              termsVersion: "1.0",
              privacyAccepted: 1,
              privacyAcceptedAt: now,
              privacyVersion: "1.0",
              cookieConsentGiven: 1,
              cookieConsentAt: now,
            },
          ]),
        }),
      });

      mockDb.select = mockSelect;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.getAcceptanceStatus();

      expect(result.termsAccepted).toBe(true);
      expect(result.privacyAccepted).toBe(true);
      expect(result.cookieConsentGiven).toBe(true);
    });

    it("should return false when acceptance records don't exist", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = mockSelect;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.getAcceptanceStatus();

      expect(result).toMatchObject({
        termsAccepted: false,
        privacyAccepted: false,
        cookieConsentGiven: false,
      });
    });
  });

  describe("acceptTerms", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
        auth: null,
        req: mockReq,
      } as any);

      await expect(
        caller.acceptTerms({ version: "1.0" })
      ).rejects.toThrow();
    });

    it("should upsert a legal acceptance record", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptTerms({ version: "1.0" });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });
  });

  describe("acceptPrivacy", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
        req: mockReq,
      } as any);

      await expect(
        caller.acceptPrivacy({ version: "1.0" })
      ).rejects.toThrow();
    });

    it("should upsert a legal acceptance record for privacy", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptPrivacy({ version: "1.0" });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });
  });

  describe("acceptCookieConsent", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
        req: mockReq,
      } as any);

      await expect(caller.acceptCookieConsent()).rejects.toThrow();
    });

    it("should upsert a legal acceptance record for cookies", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptCookieConsent();

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });
  });

  describe("acceptAll", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
        req: mockReq,
      } as any);

      await expect(
        caller.acceptAll({
          termsVersion: "1.0",
          privacyVersion: "1.0",
        })
      ).rejects.toThrow();
    });

    it("should upsert all legal documents at once", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptAll({
        termsVersion: "1.0",
        privacyVersion: "1.0",
      });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });
  });
});
