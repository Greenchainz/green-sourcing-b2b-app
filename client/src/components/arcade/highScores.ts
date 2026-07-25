/**
 * Per-game local high-score boards (top 10, 3-letter arcade initials).
 * 100% client-side (localStorage) and SSR-safe — never touches the server.
 */
export interface HighScore {
  initials: string;
  score: number;
  /** epoch ms */
  at: number;
}

const MAX_ENTRIES = 10;
const KEY_PREFIX = "greenchainz.arcade.scores.";

function storageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function keyFor(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`;
}

export function normalizeInitials(raw: string): string {
  return (raw || "AAA")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "A");
}

export function getHighScores(gameId: string): HighScore[] {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(gameId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HighScore =>
          e &&
          typeof e.initials === "string" &&
          typeof e.score === "number" &&
          Number.isFinite(e.score),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** True if `score` would earn a spot on the board. */
export function isHighScore(gameId: string, score: number): boolean {
  if (!Number.isFinite(score) || score <= 0) return false;
  const scores = getHighScores(gameId);
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}

/** Insert a score and return the updated (persisted) board. */
export function addHighScore(
  gameId: string,
  initials: string,
  score: number,
): HighScore[] {
  const entry: HighScore = {
    initials: normalizeInitials(initials),
    score: Math.max(0, Math.floor(score)),
    at: Date.now(),
  };
  const next = [...getHighScores(gameId), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  if (storageAvailable()) {
    try {
      window.localStorage.setItem(keyFor(gameId), JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }
  return next;
}

export function bestScore(gameId: string): number {
  const s = getHighScores(gameId);
  return s.length ? s[0].score : 0;
}
