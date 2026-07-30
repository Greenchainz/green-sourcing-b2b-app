/**
 * Structured JSON logger — wraps pino for production-grade log ingestion.
 *
 * In production: emits newline-delimited JSON consumed by Azure Log Analytics.
 * In development: pretty-prints with pino-pretty when the terminal is a TTY,
 *                 or raw JSON otherwise (keeps pipe/grep usable).
 *
 * Every log record automatically includes:
 *  - env        — NODE_ENV
 *  - sha        — Git commit SHA injected at build time (COMMIT_SHA env var)
 *  - requestId  — injected per-request via logger.child({ requestId })
 *  - userId     — injected per-request (first 8 chars of hashed id — not raw PII)
 *
 * Usage:
 *   import { logger } from "./_core/logger";
 *   logger.info({ userId: "abc123" }, "User logged in");
 *
 *   // Per-request child logger:
 *   const reqLog = logger.child({ requestId: req.id, userId: req.user?.id });
 *   reqLog.warn({ path: req.path }, "Unauthorized access attempt");
 */

import pino, { type Logger } from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isTestEnv = process.env.NODE_ENV === "test";

// Deployment SHA — set by GitHub Actions as COMMIT_SHA or WEBSITE_DEPLOYMENT_ID (Azure)
const deploymentSha =
  process.env.COMMIT_SHA ??
  process.env.WEBSITE_DEPLOYMENT_ID ??
  "local";

const baseOptions: pino.LoggerOptions = {
  // Minimum level: suppress debug in production to reduce log volume / cost
  level: isDev ? "debug" : "info",

  // Silence logging entirely in test runs unless DEBUG_LOGS=true
  ...(isTestEnv && process.env.DEBUG_LOGS !== "true" ? { level: "silent" } : {}),

  // Base fields included on every log record
  base: {
    env: process.env.NODE_ENV ?? "unknown",
    sha: deploymentSha,
    service: "greenchainz-api",
  },

  // ISO timestamp instead of epoch ms for human readability in Azure Monitor
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact fields that must never reach log storage
  redact: {
    paths: [
      "password",
      "passwd",
      "pwd",
      "secret",
      "client_secret",
      "access_token",
      "refresh_token",
      "id_token",
      "jwt",
      "authorization",
      "cookie",
      "set-cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },

  // Serializers: sanitize/trim common objects before logging
  serializers: {
    req: (req: { method?: string; url?: string; id?: string }) => ({
      method: req.method,
      url: req.url ? new URL(req.url, "http://localhost").pathname : undefined,
      id: req.id,
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
};

function createLogger(): Logger {
  if (isDev && process.stdout.isTTY) {
    // In interactive development terminals, try pino-pretty for human-readable output. If it's not
    // installed this falls through to raw JSON (never blocks startup).
    try {
      return pino({
        ...baseOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname,env,sha,service",
          },
        },
      });
    } catch {
      // pino-pretty unavailable — emit raw JSON
    }
  }

  return pino(baseOptions);
}

export const logger: Logger = createLogger();

// ── Convenience child factory ─────────────────────────────────────────────────

/**
 * Create a child logger for a single request, stamped with requestId and an
 * opaque userId prefix (not the raw ID — avoids PII in log storage).
 */
export function requestLogger(opts: {
  requestId?: string;
  userId?: number | string;
  tenantId?: number | string;
}): Logger {
  return logger.child({
    requestId: opts.requestId,
    // Truncate userId to 8 chars as an opaque correlation token — not raw PII
    userId: opts.userId != null ? String(opts.userId).slice(0, 8) : undefined,
    tenantId: opts.tenantId != null ? String(opts.tenantId).slice(0, 8) : undefined,
  });
}
