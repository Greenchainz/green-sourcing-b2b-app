/**
 * Log scrubber — installed at process startup via side-effect import.
 *
 * Scrubs three classes of sensitive data from every console.* call:
 *   1. IPv4 and IPv6 addresses  → [IP]
 *   2. Request URLs             → query values of sensitive params replaced
 *   3. Query string arg values  → ?<sensitiveKey>=<value> → ?<key>=[REDACTED]
 *
 * Add names to SENSITIVE_QUERY_ARGS to extend coverage (e.g. custom API key names).
 */

/** Query parameter names whose values must never appear in logs. */
export const SENSITIVE_QUERY_ARGS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "key",
  "api_key",
  "apikey",
  "apiKey",
  "secret",
  "client_secret",
  "password",
  "passwd",
  "pwd",
  "code",
  "auth_code",
  "authorization_code",
  "state",
  "nonce",
  "session",
  "session_id",
  "sessionid",
  "sig",
  "signature",
  "hash",
  "jwt",
]);

// ── Compiled patterns ─────────────────────────────────────────────────────────

const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

// Matches the most common colon-separated IPv6 forms (full and compressed).
const IPV6_RE =
  /\b(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\b/g;

function buildQueryArgRe(): RegExp {
  const escaped = [...SENSITIVE_QUERY_ARGS]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  // Matches  paramName=<anything up to & or whitespace or quote>
  return new RegExp(`\\b(${escaped})=([^&\\s"'#]*)`, "gi");
}

const QUERY_ARG_RE = buildQueryArgRe();

// ── Core scrub function (exported for unit testing) ───────────────────────────

export function scrub(value: string): string {
  return value
    .replace(IPV4_RE, "[IP]")
    .replace(IPV6_RE, "[IP]")
    .replace(QUERY_ARG_RE, "$1=[REDACTED]");
}

// ── Argument normaliser ───────────────────────────────────────────────────────

function scrubArg(arg: unknown): unknown {
  if (typeof arg === "string") return scrub(arg);

  if (arg instanceof Error) {
    const copy = new Error(scrub(arg.message));
    copy.name = arg.name;
    if (arg.stack) copy.stack = scrub(arg.stack);
    return copy;
  }

  // Attempt a JSON round-trip so nested objects / arrays are covered.
  try {
    const json = JSON.stringify(arg);
    if (json !== undefined) {
      const scrubbed = scrub(json);
      if (scrubbed !== json) return JSON.parse(scrubbed) as unknown;
    }
  } catch {
    // Non-serialisable value — return as-is.
  }

  return arg;
}

// ── Console patcher ───────────────────────────────────────────────────────────

const PATCHED = Symbol("log-scrubber-patched");

export function installLogScrubber(): void {
  if ((console as unknown as Record<symbol, unknown>)[PATCHED]) return;
  (console as unknown as Record<symbol, unknown>)[PATCHED] = true;

  const methods = ["log", "info", "warn", "error", "debug"] as const;
  for (const method of methods) {
    const original = (console[method] as (...a: unknown[]) => void).bind(console);
    (console[method] as (...a: unknown[]) => void) = (...args: unknown[]) => {
      original(...args.map(scrubArg));
    };
  }
}

// Side-effect: install immediately on import.
installLogScrubber();
