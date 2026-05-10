/**
 * EC3 Integration Wrapper
 *
 * Thin layer over server/ec3.ts that adds:
 *   - Typed error class with statusCode + retryable flag
 *   - Per-call timeout (15 s) via Promise.race — never hangs the request pipeline
 *   - Retry helper for transient network errors
 *
 * Callers should import from here, not from server/ec3.ts directly.
 */

import {
  fetchEC3EPDs as _fetchEC3EPDs,
  fetchEC3EPDById as _fetchEC3EPDById,
  searchEC3EPDs as _searchEC3EPDs,
  fetchEC3Categories as _fetchEC3Categories,
  parseGWP,
} from "../../ec3";

export type { EC3EPD } from "../../ec3";
export { parseGWP };

// ─── Error class ─────────────────────────────────────────────────────────────

export class EC3IntegrationError extends Error {
  constructor(
    message: string,
    /** HTTP-equivalent status code (408 = timeout, 502 = upstream error, etc.) */
    public readonly statusCode: number,
    /** Whether the caller should retry this operation */
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "EC3IntegrationError";
  }
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000;

/**
 * Race a promise against a deadline.
 * Throws EC3IntegrationError(408, retryable=true) on timeout.
 */
function withTimeout<T>(promise: Promise<T>, label: string, ms = TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new EC3IntegrationError(
            `EC3 ${label} timed out after ${ms}ms`,
            408,
            true
          )
        ),
      ms
    );
  });

  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Map generic errors thrown by ec3.ts into EC3IntegrationError.
 * EC3 always includes the HTTP status in parentheses: "EC3 API error (503): ..."
 */
function toIntegrationError(err: unknown): EC3IntegrationError {
  if (err instanceof EC3IntegrationError) return err;

  const message = err instanceof Error ? err.message : String(err);

  // Parse embedded status code from ec3.ts error strings
  const statusMatch = message.match(/\((\d{3})\)/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 502;

  // 429, 503, 504 are transient and safe to retry
  const retryable = [429, 503, 504, 408].includes(statusCode);

  return new EC3IntegrationError(message, statusCode, retryable);
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      const integrationErr = toIntegrationError(err);

      if (!integrationErr.retryable || attempt >= maxRetries) {
        throw integrationErr;
      }

      attempt++;
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `[ec3] ${label} failed (${integrationErr.statusCode}), retry ${attempt}/${maxRetries} in ${delay}ms`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List EPDs from EC3, optionally filtered by category.
 * Adds timeout + retry on top of the raw ec3.ts call.
 */
export async function fetchEC3EPDs(
  category?: string,
  limit = 100,
  offset = 0
) {
  return withRetry(
    () => withTimeout(_fetchEC3EPDs(category, limit, offset), "fetchEC3EPDs"),
    "fetchEC3EPDs"
  );
}

/**
 * Fetch a single EPD by ID. Returns null if 404.
 * Adds timeout + retry (retries only on transient errors; 404 surfaces immediately).
 */
export async function fetchEC3EPDById(epdId: string) {
  return withRetry(
    () => withTimeout(_fetchEC3EPDById(epdId), "fetchEC3EPDById"),
    "fetchEC3EPDById"
  );
}

/**
 * Full-text search over EC3 EPDs.
 * Adds timeout + retry.
 */
export async function searchEC3EPDs(query: string, limit = 100) {
  return withRetry(
    () => withTimeout(_searchEC3EPDs(query, limit), "searchEC3EPDs"),
    "searchEC3EPDs"
  );
}

/**
 * Fetch all EC3 material categories.
 * Categories rarely change; callers should cache the result.
 */
export async function fetchEC3Categories() {
  return withRetry(
    () => withTimeout(_fetchEC3Categories(), "fetchEC3Categories"),
    "fetchEC3Categories"
  );
}

/**
 * Quick connectivity check — attempts to list 1 EPD.
 * Returns true if EC3 is reachable and credentials are valid.
 */
export async function isEC3Configured(): Promise<boolean> {
  try {
    await fetchEC3EPDs(undefined, 1);
    return true;
  } catch {
    return false;
  }
}
