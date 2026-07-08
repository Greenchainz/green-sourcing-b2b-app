/**
 * GreenChainz Arcade - shared leaderboard time windows.
 *
 * A single, dependency-free source of truth for how the daily / monthly boards
 * are bounded, imported by BOTH the server (to scope the board query) and the
 * client (to decide when a new day has started for the "Showtime" gate + streak).
 *
 * The day boundary is 00:00 UTC. A fixed global reset is deliberate: everyone in
 * the world rolls over to a fresh daily board at the same instant, which is the
 * fairest rule for a global competition (no timezone gives anyone a longer day).
 * Keeping the client and server on the exact same boundary means the "this one
 * counts" gate and the "Today's Top 10" board can never disagree.
 */

export type BoardPeriod = "day" | "month" | "all";

export const BOARD_PERIODS = ["day", "month", "all"] as const;

export function isBoardPeriod(value: string): value is BoardPeriod {
  return (BOARD_PERIODS as readonly string[]).includes(value);
}

/**
 * Inclusive lower bound (epoch ms) for a board window, or `null` for the
 * all-time board (no lower bound). A score counts on the window when its
 * `createdAt >= periodStartMs(...)`.
 *
 * @param nowMs current time in epoch ms (injectable so it is deterministic in tests)
 */
export function periodStartMs(period: BoardPeriod, nowMs: number): number | null {
  if (period === "all") return null;
  const now = new Date(nowMs);
  if (period === "day") {
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }
  // month
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

/**
 * The UTC calendar day as a stable `YYYY-MM-DD` string. Used as the key for the
 * client-side Showtime flag + streak so "have I already played my real round
 * today?" lines up exactly with the server's daily board boundary.
 */
export function utcDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Whole-day gap between two UTC day keys (b - a). Used to decide streak
 * continuation: 0 = same day, 1 = consecutive (streak continues), >1 = a day
 * was missed (streak resets). Returns a signed integer.
 */
export function dayKeyDelta(a: string, b: string): number {
  const toUtc = (key: string): number => {
    const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  const DAY_MS = 86_400_000;
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}
