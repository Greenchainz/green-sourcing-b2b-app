import { describe, it, expect } from "vitest";
import {
  getShowtimeStatus,
  recordShowtime,
  type KVStore,
} from "./showtime";

// In-memory KVStore stub so these tests need no jsdom / real localStorage.
function memStore(): KVStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

const GAME = "green-round";
// Three reference instants on distinct UTC days.
const DAY_A = Date.UTC(2026, 6, 7, 12); // 2026-07-07
const DAY_B = Date.UTC(2026, 6, 8, 9); //  2026-07-08 (A + 1)
const DAY_D = Date.UTC(2026, 6, 11, 9); // 2026-07-11 (A + 4, a gap)

describe("showtime gate", () => {
  it("offers Showtime to a brand-new player with no streak", () => {
    const store = memStore();
    const status = getShowtimeStatus(GAME, DAY_A, store);
    expect(status.mode).toBe("showtime");
    expect(status.streak).toBe(0);
    expect(status.lastDay).toBeNull();
  });

  it("flips to Practice for the rest of the day after the Showtime run", () => {
    const store = memStore();
    const recorded = recordShowtime(GAME, DAY_A, store);
    expect(recorded.mode).toBe("practice");
    expect(recorded.streak).toBe(1);

    const later = getShowtimeStatus(GAME, DAY_A + 3_600_000, store);
    expect(later.mode).toBe("practice");
    expect(later.streak).toBe(1);
  });

  it("re-opens Showtime the next day and grows the streak", () => {
    const store = memStore();
    recordShowtime(GAME, DAY_A, store); // streak 1

    const nextDay = getShowtimeStatus(GAME, DAY_B, store);
    expect(nextDay.mode).toBe("showtime");
    expect(nextDay.streak).toBe(1); // carried in from yesterday

    const recorded = recordShowtime(GAME, DAY_B, store);
    expect(recorded.streak).toBe(2); // consecutive day -> +1
  });

  it("resets the streak when a day is missed", () => {
    const store = memStore();
    recordShowtime(GAME, DAY_A, store);
    recordShowtime(GAME, DAY_B, store); // streak 2

    // Skips 2026-07-09 and -10 entirely, returns on -11.
    const afterGap = getShowtimeStatus(GAME, DAY_D, store);
    expect(afterGap.mode).toBe("showtime");
    expect(afterGap.streak).toBe(0); // gap already broke it

    const recorded = recordShowtime(GAME, DAY_D, store);
    expect(recorded.streak).toBe(1); // starts over
  });

  it("does not double-count a second Showtime record on the same day", () => {
    const store = memStore();
    recordShowtime(GAME, DAY_A, store);
    const again = recordShowtime(GAME, DAY_A + 60_000, store);
    expect(again.streak).toBe(1);
  });

  it("treats a null store as always-Showtime (no persistence available)", () => {
    const status = getShowtimeStatus(GAME, DAY_A, null);
    expect(status.mode).toBe("showtime");
    const recorded = recordShowtime(GAME, DAY_A, null);
    expect(recorded.streak).toBe(1);
  });
});
