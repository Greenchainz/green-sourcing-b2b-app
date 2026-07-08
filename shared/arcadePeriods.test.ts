import { describe, it, expect } from "vitest";
import {
  periodStartMs,
  utcDayKey,
  dayKeyDelta,
  isBoardPeriod,
} from "./arcadePeriods";

// A fixed instant used across the boundary tests: 2026-07-07 18:32:00 UTC.
const NOW = Date.UTC(2026, 6, 7, 18, 32, 0);

describe("arcadePeriods.periodStartMs", () => {
  it("returns null for the all-time board (no lower bound)", () => {
    expect(periodStartMs("all", NOW)).toBeNull();
  });

  it("snaps 'day' to 00:00 UTC of the current calendar day", () => {
    expect(periodStartMs("day", NOW)).toBe(Date.UTC(2026, 6, 7));
  });

  it("snaps 'month' to 00:00 UTC on the first of the month", () => {
    expect(periodStartMs("month", NOW)).toBe(Date.UTC(2026, 6, 1));
  });

  it("uses UTC, so a late-UTC instant still belongs to the same UTC day", () => {
    const lateUtc = Date.UTC(2026, 6, 7, 23, 59, 59);
    expect(periodStartMs("day", lateUtc)).toBe(Date.UTC(2026, 6, 7));
  });
});

describe("arcadePeriods.utcDayKey", () => {
  it("formats a zero-padded YYYY-MM-DD in UTC", () => {
    expect(utcDayKey(NOW)).toBe("2026-07-07");
    expect(utcDayKey(Date.UTC(2026, 0, 3, 5))).toBe("2026-01-03");
  });
});

describe("arcadePeriods.dayKeyDelta", () => {
  it("is 0 for the same day and 1 for consecutive days", () => {
    expect(dayKeyDelta("2026-07-07", "2026-07-07")).toBe(0);
    expect(dayKeyDelta("2026-07-07", "2026-07-08")).toBe(1);
  });

  it("counts a gap of more than one day", () => {
    expect(dayKeyDelta("2026-07-07", "2026-07-10")).toBe(3);
  });

  it("crosses month and year boundaries correctly", () => {
    expect(dayKeyDelta("2026-07-31", "2026-08-01")).toBe(1);
    expect(dayKeyDelta("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("arcadePeriods.isBoardPeriod", () => {
  it("accepts the three known periods and rejects anything else", () => {
    expect(isBoardPeriod("day")).toBe(true);
    expect(isBoardPeriod("month")).toBe(true);
    expect(isBoardPeriod("all")).toBe(true);
    expect(isBoardPeriod("week")).toBe(false);
    expect(isBoardPeriod("")).toBe(false);
  });
});
