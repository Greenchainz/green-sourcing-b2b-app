/**
 * Structured JSON Logger
 *
 * Emits all log lines as newline-delimited JSON to stdout.
 * Azure Monitor Log Analytics ingests these automatically when the container
 * writes to stdout — each JSON object becomes a queryable row in the
 * ContainerAppConsoleLogs_CL table.
 *
 * Usage:
 *   import { log } from './_core/log';
 *   log.info('rfq.submitted', { rfqId: 42, userId: 'abc' });
 *   log.error('db.query.failed', { error: err.message, query: 'getUserById' });
 *
 * KQL query example (Log Analytics):
 *   ContainerAppConsoleLogs_CL
 *   | where Log_s has '"event":"rfq.submitted"'
 *   | extend parsed = parse_json(Log_s)
 *   | project TimeGenerated, correlationId = parsed.correlationId, rfqId = parsed.rfqId
 */

import { scrub } from "./log-scrubber";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  env: string;
  sha: string;
  correlationId?: string;
  userId?: string | null;
  tenantId?: string | null;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

// ── Configuration ─────────────────────────────────────────────────────────────

const ENV = process.env.NODE_ENV ?? "development";
const SHA = (process.env.GIT_SHA ?? process.env.GITHUB_SHA ?? "local").slice(0, 12);
const IS_PROD = ENV === "production";

// In development, emit human-readable output to avoid JSON noise in the terminal.
// In production (and in CI), always emit JSON for log aggregation pipelines.
const USE_JSON = IS_PROD || process.env.LOG_FORMAT === "json";

// ── AsyncLocalStorage for correlation context ─────────────────────────────────

import { AsyncLocalStorage } from "async_hooks";

interface LogContext {
  correlationId?: string;
  userId?: string | null;
  tenantId?: string | null;
}

const logContextStorage = new AsyncLocalStorage<LogContext>();

/** Run a callback with a bound log context (correlationId, userId, etc.). */
export function withLogContext<T>(ctx: LogContext, fn: () => T): T {
  return logContextStorage.run(ctx, fn);
}

/** Get the current request's log context (may be undefined outside a request). */
export function getLogContext(): LogContext {
  return logContextStorage.getStore() ?? {};
}

// ── Sensitive key redaction ───────────────────────────────────────────────────

/**
 * Keys whose values must be redacted from structured log entries.
 * Checked case-insensitively against every key in the log field tree.
 */
const REDACTED_KEYS = new Set([
  "token", "accesstoken", "access_token", "refreshtoken", "refresh_token",
  "idtoken", "id_token", "jwt", "authorization", "cookie",
  "password", "passwd", "pwd",
  "secret", "client_secret", "clientsecret",
  "apikey", "api_key", "apiKey",
  "key",
  "sig", "signature",
  "ssn", "creditcard", "credit_card",
]);

/**
 * Recursively redact values whose keys appear in REDACTED_KEYS.
 * Works on plain objects and arrays; primitives are returned as-is.
 */
function redactKeys(value: unknown, ancestors = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return scrub(value);
  }
  if (value !== null && typeof value === "object") {
    if (ancestors.has(value)) return "[CIRCULAR]";
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        return value.map((item) => redactKeys(item, ancestors));
      }

      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = REDACTED_KEYS.has(k.toLowerCase())
          ? "[REDACTED]"
          : redactKeys(v, ancestors);
      }
      return out;
    } finally {
      ancestors.delete(value);
    }
  }
  return value;
}

// ── Core emitter ──────────────────────────────────────────────────────────────

function emit(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const ctx = getLogContext();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    env: ENV,
    sha: SHA,
    ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
    ...(ctx.userId !== undefined ? { userId: ctx.userId } : {}),
    ...(ctx.tenantId !== undefined ? { tenantId: ctx.tenantId } : {}),
    ...fields,
  };

  if (USE_JSON) {
    // Redact sensitive keys before serialisation, then apply string-level
    // scrubbing (IP addresses, query tokens) while traversing the object.
    // Avoid post-hoc regex over serialised JSON.
    const safe = JSON.stringify(redactKeys(entry));
    process.stdout.write(safe + "\n");
  } else {
    // Human-readable dev output — apply the same key-based redaction as the
    // JSON path so sensitive fields (token, password, etc.) are never printed
    // as plain text even in local development.
    const safeEntry = redactKeys(entry) as LogEntry;
    const { timestamp, level: lvl, event: evt, ...rest } = safeEntry;
    const prefix = `[${timestamp}] ${lvl.toUpperCase().padEnd(5)} ${evt}`;
    const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
    // Route through console so the log-scrubber's monkey-patch covers us.
    if (lvl === "error") console.error(prefix + extras);
    else if (lvl === "warn") console.warn(prefix + extras);
    else console.log(prefix + extras);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const log = {
  debug(event: string, fields?: Record<string, unknown>): void {
    emit("debug", event, fields);
  },
  info(event: string, fields?: Record<string, unknown>): void {
    emit("info", event, fields);
  },
  warn(event: string, fields?: Record<string, unknown>): void {
    emit("warn", event, fields);
  },
  error(event: string, fields?: Record<string, unknown>): void {
    emit("error", event, fields);
  },
};

// ── Request logger middleware ──────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that:
 *   1. Extracts or generates a correlation ID (from X-Correlation-ID header or req.id)
 *   2. Binds it to AsyncLocalStorage so all downstream log.* calls include it
 *   3. Echoes the correlation ID back as a response header
 *   4. Logs the completed request (method, path, status, duration) as JSON
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId: string =
    (req.headers["x-correlation-id"] as string) ||
    (req.id as string) ||
    "";

  // Echo back so clients can correlate their traces with server logs
  res.setHeader("X-Correlation-ID", correlationId);

  const startMs = Date.now();

  withLogContext({ correlationId }, () => {
    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const level: LogLevel =
        res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

      emit(level, "http.request", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        // Omit query string — may contain tokens; log-scrubber would cover it
        // but omitting entirely is safer for health-check noise reduction.
        ...(req.path.startsWith("/api/") ? { route: req.path } : {}),
      });
    });

    next();
  });
}
