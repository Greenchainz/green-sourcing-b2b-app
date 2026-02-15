import { describe, it, expect, beforeEach, vi } from "vitest";
import { legalRouter } from "./legal-router";
import { getDb } from "./db";
import { legalAcceptances } from "../drizzle/schema";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

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
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getAcceptanceStatus", () => {
    it("should return default values when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
      } as any);

      const result = await caller.getAcceptanceStatus();

      expect(result).toEqual({
        termsAccepted: false,
        privacyAccepted: false,
        cookieConsentGiven: false,
      });
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

      expect(result).toEqual({
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
      } as any);

      await expect(
        caller.acceptTerms({ version: "1.0" })
      ).rejects.toThrow("User not authenticated");
    });

    it("should insert new legal acceptance record", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = mockSelect;
      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptTerms({ version: "1.0" });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
    });

    it("should update existing legal acceptance record", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ userId: 123 }]),
        }),
      });

      mockDb.select = mockSelect;
      mockDb.update = mockUpdate;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptTerms({ version: "1.0" });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(legalAcceptances);
    });
  });

  describe("acceptPrivacy", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
      } as any);

      await expect(
        caller.acceptPrivacy({ version: "1.0" })
      ).rejects.toThrow("User not authenticated");
    });

    it("should insert new legal acceptance record for privacy", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = mockSelect;
      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptPrivacy({ version: "1.0" });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
    });
  });

  describe("acceptCookieConsent", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
      } as any);

      await expect(caller.acceptCookieConsent()).rejects.toThrow(
        "User not authenticated"
      );
    });

    it("should insert new legal acceptance record for cookies", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = mockSelect;
      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptCookieConsent();

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
    });
  });

  describe("acceptAll", () => {
    it("should throw error when user is not authenticated", async () => {
      const caller = legalRouter.createCaller({
        user: null,
      } as any);

      await expect(
        caller.acceptAll({
          termsVersion: "1.0",
          privacyVersion: "1.0",
        })
      ).rejects.toThrow("User not authenticated");
    });

    it("should accept all documents at once", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = mockSelect;
      mockDb.insert = mockInsert;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptAll({
        termsVersion: "1.0",
        privacyVersion: "1.0",
      });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(legalAcceptances);
    });

    it("should update existing record when accepting all", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ userId: 123 }]),
        }),
      });

      mockDb.select = mockSelect;
      mockDb.update = mockUpdate;

      const caller = legalRouter.createCaller(mockCtx as any);
      const result = await caller.acceptAll({
        termsVersion: "1.0",
        privacyVersion: "1.0",
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(legalAcceptances);
    });
  });
});
