/**
 * GreenChainz Arcade - the "Showtime" daily gate + streak.
 *
 * The Round is the daily main show: your FIRST completed round of the day is
 * your ranked "Showtime" run (it counts on today's board). Everything after is
 * Practice - you can screw around all you want, but it never touches the board.
 * Come back tomorrow for your next Showtime. Consecutive Showtime days build a
 * streak; miss a day and it resets.
 *
 * This is a deliberately SOFT gate (localStorage): it shapes the honest daily
 * ritual for real players. Hard anti-cheat (server identity) is a separate,
 * later piece - noted in the plan.
 *
 * The day boundary + streak math come from the shared `arcadePeriods` helper,
 * the exact same 00:00 UTC boundary the server uses for today's board, so the
 * "this one counts" prompt and the board can never disagree.
 */

import { utcDayKey, dayKeyDelta } from "@shared/arcadePeriods";

export type ShowtimeMode = "showtime" | "practice";

export interface ShowtimeStatus {
  /** 'showtime' = today's ranked run is still available; 'practice' = already done today. */
  mode: ShowtimeMode;
  /** The player's current standing streak (0 when there is no live streak). */
  streak: number;
  /** The UTC day of the last recorded Showtime, or null if none. */
  lastDay: string | null;
}

/** Minimal storage shape - real `localStorage` satisfies it; tests inject a stub. */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredState {
  day: string;
  streak: number;
}

const keyFor = (gameId: string): string => `gcz:showtime:${gameId}`;

function defaultStore(): KVStore | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // localStorage access can throw in sandboxed iframes / privacy modes.
  }
  return null;
}

function read(store: KVStore, gameId: string): StoredState | null {
  try {
    const raw = store.getItem(keyFor(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (typeof parsed?.day !== "string") return null;
    const streak = typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 1;
    return { day: parsed.day, streak };
  } catch {
    return null;
  }
}

function write(store: KVStore, gameId: string, state: StoredState): void {
  try {
    store.setItem(keyFor(gameId), JSON.stringify(state));
  } catch {
    // Best-effort: a failed write just means the gate is open again next time.
  }
}

/**
 * What run is the player about to take right now? Read-only - does not record.
 * `streak` is the *effective* current streak (0 if a day was already missed).
 */
export function getShowtimeStatus(
  gameId: string,
  nowMs: number = Date.now(),
  store: KVStore | null = defaultStore(),
): ShowtimeStatus {
  const today = utcDayKey(nowMs);
  const prev = store ? read(store, gameId) : null;

  if (!prev) return { mode: "showtime", streak: 0, lastDay: null };
  if (prev.day === today) return { mode: "practice", streak: prev.streak, lastDay: prev.day };

  // A new day since the last Showtime: it's available again. The streak only
  // survives if yesterday was the last one; any larger gap has already broken it.
  const effectiveStreak = dayKeyDelta(prev.day, today) === 1 ? prev.streak : 0;
  return { mode: "showtime", streak: effectiveStreak, lastDay: prev.day };
}

/**
 * Record that the player just completed today's Showtime run. Returns the new
 * status (mode is now 'practice' for the rest of the day) with the updated
 * streak. Idempotent within a day - a second call the same day is a no-op.
 */
export function recordShowtime(
  gameId: string,
  nowMs: number = Date.now(),
  store: KVStore | null = defaultStore(),
): ShowtimeStatus {
  const today = utcDayKey(nowMs);
  const prev = store ? read(store, gameId) : null;

  if (prev && prev.day === today) {
    // Already logged today's Showtime - don't double-count the streak.
    return { mode: "practice", streak: prev.streak, lastDay: prev.day };
  }

  const streak = prev && dayKeyDelta(prev.day, today) === 1 ? prev.streak + 1 : 1;
  const next: StoredState = { day: today, streak };
  if (store) write(store, gameId, next);
  return { mode: "practice", streak, lastDay: today };
}
