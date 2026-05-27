import { describe, expect, it } from "vitest";
import { determineScoreStaleReason } from "./material-credit-score";

describe("material-credit-score cache policy", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("marks cache miss", () => {
    const reason = determineScoreStaleReason({
      cached: null,
      expectedRulesVersion: "ccps-policy-v1",
      expectedInputFingerprint: "abc",
      now,
      epdUsableForScoring: true,
    });
    expect(reason).toBe("cache_miss");
  });

  it("marks rules version drift", () => {
    const reason = determineScoreStaleReason({
      cached: {
        rulesVersion: "ccps-policy-v0",
        inputFingerprint: "abc",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      expectedRulesVersion: "ccps-policy-v1",
      expectedInputFingerprint: "abc",
      now,
      epdUsableForScoring: true,
    });
    expect(reason).toBe("rules_version_changed");
  });

  it("marks changed inputs", () => {
    const reason = determineScoreStaleReason({
      cached: {
        rulesVersion: "ccps-policy-v1",
        inputFingerprint: "old",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      expectedRulesVersion: "ccps-policy-v1",
      expectedInputFingerprint: "new",
      now,
      epdUsableForScoring: true,
    });
    expect(reason).toBe("input_changed");
  });

  it("marks expired cache", () => {
    const reason = determineScoreStaleReason({
      cached: {
        rulesVersion: "ccps-policy-v1",
        inputFingerprint: "same",
        expiresAt: new Date("2025-12-31T23:00:00.000Z"),
      },
      expectedRulesVersion: "ccps-policy-v1",
      expectedInputFingerprint: "same",
      now,
      epdUsableForScoring: true,
    });
    expect(reason).toBe("cache_expired");
  });

  it("marks invalid EPD as fail-closed", () => {
    const reason = determineScoreStaleReason({
      cached: {
        rulesVersion: "ccps-policy-v1",
        inputFingerprint: "same",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      expectedRulesVersion: "ccps-policy-v1",
      expectedInputFingerprint: "same",
      now,
      epdUsableForScoring: false,
    });
    expect(reason).toBe("epd_invalid");
  });

  it("returns null for valid cache", () => {
    const reason = determineScoreStaleReason({
      cached: {
        rulesVersion: "ccps-policy-v1",
        inputFingerprint: "same",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      expectedRulesVersion: "ccps-policy-v1",
      expectedInputFingerprint: "same",
      now,
      epdUsableForScoring: true,
    });
    expect(reason).toBeNull();
  });
});

