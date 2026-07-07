/**
 * GreenChainz Arcade - shared scoring rules.
 *
 * Single source of truth for game ids, per-game plausibility caps, and
 * score/initials normalization. Imported by BOTH the client (fast pre-submit
 * checks) and the server (authoritative validation before a score is allowed
 * onto the global leaderboard). Pure and dependency-free so either side can use
 * it without pulling in extra weight.
 */

export const ARCADE_GAME_IDS = [
  "spec-breaker",
  "supply-snake",
  "green-iq",
  "green-approach",
] as const;

export type ArcadeGameId = (typeof ARCADE_GAME_IDS)[number];

export function isArcadeGameId(value: string): value is ArcadeGameId {
  return (ARCADE_GAME_IDS as readonly string[]).includes(value);
}

/**
 * Upper bound for a single run, per game. Scores above this are rejected as
 * implausible so a tampered client cannot pollute the shared board with garbage
 * values (e.g. Number.MAX_SAFE_INTEGER). These caps are deliberately generous -
 * a great human run stays well under them; they only catch obvious fabrication.
 * This is anti-vandalism, not full anti-cheat (which would need server replay).
 */
export const MAX_PLAUSIBLE_SCORE: Record<ArcadeGameId, number> = {
  "spec-breaker": 100_000,
  "supply-snake": 50_000,
  "green-iq": 25_000,
  "green-approach": 2_000_000,
};

/** True when a score is a non-negative integer within the game's plausible cap. */
export function isValidArcadeScore(gameId: ArcadeGameId, score: number): boolean {
  if (!Number.isInteger(score)) return false;
  if (score < 0) return false;
  // eslint-disable-next-line security/detect-object-injection -- gameId is a validated ArcadeGameId union; lookup table is a hardcoded constant
  return score <= MAX_PLAUSIBLE_SCORE[gameId];
}

/** Normalize free-text initials to exactly 3 uppercase A-Z letters. */
export function normalizeInitials(raw: string): string {
  const cleaned = (raw || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return cleaned.padEnd(3, "A");
}
