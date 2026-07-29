import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getRelativeTime } from "./timeUtils";

describe("getRelativeTime", () => {
  const RealDate = global.Date;
  // Mock current date to be a specific point in time
  const mockNow = new RealDate("2024-01-10T12:00:00Z"); // Wednesday, Jan 10, 2024

  beforeAll(() => {
    // Manually mock global Date to avoid issues with vi.useFakeTimers() in bun
    // @ts-ignore
    global.Date = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow);
        } else {
          super(...(args as [any]));
        }
      }
      static now() {
        return mockNow.getTime();
      }
    };
  });

  afterAll(() => {
    global.Date = RealDate;
  });

  it("should return 'Just now' for times less than 1 minute ago", () => {
    const pastDate = new RealDate(mockNow.getTime() - 30 * 1000); // 30 seconds ago
    expect(getRelativeTime(pastDate)).toBe("Just now");
  });

  it("should return minutes ago for times less than 1 hour ago", () => {
    const pastDate = new RealDate(mockNow.getTime() - 15 * 60 * 1000); // 15 minutes ago
    expect(getRelativeTime(pastDate)).toBe("15 min ago");
  });

  it("should return 1 hour ago without plural for exactly 1 hour", () => {
    const pastDate = new RealDate(mockNow.getTime() - 60 * 60 * 1000); // 1 hour ago
    expect(getRelativeTime(pastDate)).toBe("1 hour ago");
  });

  it("should return hours ago with plural for multiple hours", () => {
    const pastDate = new RealDate(mockNow.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
    expect(getRelativeTime(pastDate)).toBe("3 hours ago");
  });

  it("should format as Yesterday with time when 1 day ago", () => {
    const pastDate = new RealDate(mockNow.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
    const expectedTime = pastDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    expect(getRelativeTime(pastDate)).toBe(`Yesterday ${expectedTime}`);
  });

  it("should format with day of week and time for less than 7 days ago", () => {
    const pastDate = new RealDate(mockNow.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago (Sunday)
    const expectedDayName = pastDate.toLocaleDateString("en-US", { weekday: "short" });
    const expectedTime = pastDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    expect(getRelativeTime(pastDate)).toBe(`${expectedDayName} ${expectedTime}`);
  });

  it("should format with month and day for earlier this year", () => {
    // 8 days ago (Jan 2, 2024)
    const pastDateSameYear = new RealDate(mockNow.getTime() - 8 * 24 * 60 * 60 * 1000);
    const expectedDate = pastDateSameYear.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    expect(getRelativeTime(pastDateSameYear)).toBe(expectedDate);
  });

  it("should format with full date for older than this year", () => {
    const pastDate = new RealDate(mockNow.getTime() - 400 * 24 * 60 * 60 * 1000); // > 1 year ago (Dec 2022)
    const expectedDate = pastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    expect(getRelativeTime(pastDate)).toBe(expectedDate);
  });

  it("should work with string input", () => {
    const pastDate = new RealDate(mockNow.getTime() - 15 * 60 * 1000); // 15 mins ago
    const dateString = pastDate.toISOString();
    expect(getRelativeTime(dateString)).toBe("15 min ago");
  });
});
