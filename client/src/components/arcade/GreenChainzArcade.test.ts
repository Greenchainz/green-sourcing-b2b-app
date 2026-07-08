import { describe, expect, it } from "vitest";
import { getLeaderboardView } from "./GreenChainzArcade";

describe("getLeaderboardView", () => {
  it("shows the global empty state when the global board succeeds with zero scores", () => {
    expect(
      getLeaderboardView({
        hasGlobalScores: false,
        globalBoardSucceeded: true,
      }),
    ).toBe("global-empty");
  });

  it("falls back locally when the global board is not available and has no scores", () => {
    expect(
      getLeaderboardView({
        hasGlobalScores: false,
        globalBoardSucceeded: false,
      }),
    ).toBe("local");
  });

  it("shows global scores when rows are present", () => {
    expect(
      getLeaderboardView({
        hasGlobalScores: true,
        globalBoardSucceeded: false,
      }),
    ).toBe("global");
  });
});
