import { describe, it, expect, beforeEach, vi } from "vitest";
import { arcadeRouter } from "./arcade-router";
import { getDb } from "../db";
import {
  isValidArcadeScore,
  normalizeInitials,
  MAX_PLAUSIBLE_SCORE,
} from "@shared/arcadeScoring";

// Mock the database accessor (same approach as legal-router.test.ts).
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Minimal req so the public rate-limit middleware can read an IP.
const mockReq = {
  headers: { "x-forwarded-for": "127.0.0.1" },
  socket: { remoteAddress: "127.0.0.1" },
};

const baseCtx = { user: null, auth: null, req: mockReq };

const containsNestedValue = (
  value: unknown,
  expected: unknown,
  seen = new WeakSet<object>(),
): boolean => {
  if (value === expected) return true;
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((nested) =>
    containsNestedValue(nested, expected, seen),
  );
};

describe("shared arcade scoring", () => {
  it("rejects non-integer, negative, and over-cap scores", () => {
    expect(isValidArcadeScore("green-approach", 1.5)).toBe(false);
    expect(isValidArcadeScore("green-approach", -1)).toBe(false);
    expect(
      isValidArcadeScore("green-iq", MAX_PLAUSIBLE_SCORE["green-iq"] + 1),
    ).toBe(false);
  });

  it("accepts plausible scores at or below the cap", () => {
    expect(isValidArcadeScore("green-iq", MAX_PLAUSIBLE_SCORE["green-iq"])).toBe(true);
    expect(isValidArcadeScore("spec-breaker", 1200)).toBe(true);
    expect(isValidArcadeScore("supply-snake", 0)).toBe(true);
  });

  it("normalizes initials to exactly 3 uppercase letters", () => {
    expect(normalizeInitials("ab")).toBe("ABA");
    expect(normalizeInitials("green")).toBe("GRE");
    expect(normalizeInitials("j1!")).toBe("JAA");
    expect(normalizeInitials("")).toBe("AAA");
  });
});

describe("arcadeRouter.submitScore", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("rejects an implausible score before touching the database", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);
    const caller = arcadeRouter.createCaller(baseCtx as any);
    await expect(
      caller.submitScore({
        gameId: "green-approach",
        score: MAX_PLAUSIBLE_SCORE["green-approach"] + 999,
        initials: "ZZZ",
      }),
    ).rejects.toThrow();
  });

  it("returns persisted:false when no database is configured", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);
    const caller = arcadeRouter.createCaller(baseCtx as any);
    const result = await caller.submitScore({
      gameId: "supply-snake",
      score: 120,
      initials: "abc",
    });
    expect(result).toMatchObject({
      persisted: false,
      rank: null,
      leadCaptured: false,
    });
  });

  it("persists a valid score and captures a new lead when an email is supplied", async () => {
    const insertValues = vi.fn().mockResolvedValue({});
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    // 1st select = leads dedupe -> .from().where().limit() resolves []
    // 2nd select = rank count -> .from().where() resolves [{ better: 2 }]
    let selectCall = 0;
    const select = vi.fn().mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ better: 2 }]),
        }),
      };
    });

    vi.mocked(getDb).mockResolvedValue({ insert, select } as any);

    const caller = arcadeRouter.createCaller(baseCtx as any);
    const result = await caller.submitScore({
      gameId: "green-iq",
      score: 3400,
      initials: "JON",
      playerName: "Jon",
      email: "jon@example.com",
      company: "Greenchainz",
    });

    expect(result.persisted).toBe(true);
    expect(result.rank).toBe(3); // 2 strictly-better + 1
    expect(result.leadCaptured).toBe(true);
    // one insert for arcade_scores + one insert for the new lead
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("ranks tied submissions behind earlier equal scores", async () => {
    const createdAt = new Date("2026-02-03T04:05:06.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(createdAt);

    try {
      const insertValues = vi.fn().mockResolvedValue({});
      const insert = vi.fn().mockReturnValue({ values: insertValues });
      const rankWhere = vi.fn().mockResolvedValue([{ better: 4 }]);
      const select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: rankWhere,
        }),
      });

      vi.mocked(getDb).mockResolvedValue({ insert, select } as any);

      const caller = arcadeRouter.createCaller(baseCtx as any);
      const result = await caller.submitScore({
        gameId: "spec-breaker",
        score: 500,
        initials: "TIE",
      });

      expect(result.rank).toBe(5); // one higher score + three earlier ties + 1
      const insertedCreatedAt = insertValues.mock.calls[0]?.[0]?.createdAt;
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({ score: 500, createdAt }),
      );
      expect(insertedCreatedAt).toEqual(createdAt);
      expect(containsNestedValue(rankWhere.mock.calls[0]?.[0], insertedCreatedAt)).toBe(
        true,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create a duplicate lead when the email already exists", async () => {
    const insertValues = vi.fn().mockResolvedValue({});
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    let selectCall = 0;
    const select = vi.fn().mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              // lead already present
              limit: vi.fn().mockResolvedValue([{ id: 7 }]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ better: 0 }]),
        }),
      };
    });

    vi.mocked(getDb).mockResolvedValue({ insert, select } as any);

    const caller = arcadeRouter.createCaller(baseCtx as any);
    const result = await caller.submitScore({
      gameId: "spec-breaker",
      score: 5000,
      initials: "AAA",
      email: "existing@example.com",
    });

    expect(result.persisted).toBe(true);
    expect(result.rank).toBe(1);
    expect(result.leadCaptured).toBe(false);
    // only the arcade_scores insert - no lead insert
    expect(insert).toHaveBeenCalledTimes(1);
  });
});

describe("arcadeRouter.topScores", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("returns an empty board when no database is configured", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);
    const caller = arcadeRouter.createCaller(baseCtx as any);
    const result = await caller.topScores({ gameId: "spec-breaker" });
    expect(result.scores).toEqual([]);
  });

  it("ranks rows by score and returns 1-based ranks with company", async () => {
    const rows = [
      { initials: "AAA", score: 900, company: "Acme", createdAt: new Date("2025-01-01") },
      { initials: "BBB", score: 700, company: null, createdAt: new Date("2025-01-02") },
    ];
    const limit = vi.fn().mockResolvedValue(rows);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });

    vi.mocked(getDb).mockResolvedValue({ select } as any);

    const caller = arcadeRouter.createCaller(baseCtx as any);
    const result = await caller.topScores({ gameId: "spec-breaker", limit: 10 });

    expect(result.scores[0]).toMatchObject({
      rank: 1,
      initials: "AAA",
      score: 900,
      company: "Acme",
    });
    expect(result.scores[1]).toMatchObject({
      rank: 2,
      initials: "BBB",
      score: 700,
      company: null,
    });
  });
});
