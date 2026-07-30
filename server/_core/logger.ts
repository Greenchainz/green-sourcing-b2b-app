/**
 * Structured JSON logger — the single logging surface for all server code.
 *
 * Architecture:
 *  - Uses Pino for zero-cost structured JSON output that Azure Log Analytics
 *    ingests natively (each line is a valid JSON object).
 *  - Every log entry carries: timestamp, level, environment, git_sha, and
 *    any context bound via logger.child({ userId, tenantId, requestId }).
 *  - The log scrubber (./log-scrubber.ts) is left in place for console.* calls
 *    that haven't been migrated; Pino handles its own serialization.
 *
 * Usage:
 *   import { log } from './logger';
 *   log.info({ requestId, userId }, 'User authenticated');
 *   log.error({ err, requestId }, 'Database query failed');
 *
 * Request-scoped child loggers (bound context flows through all children):
 *   const reqLog = log.child({ requestId: req.id, userId: user.id });
 *   reqLog.info('Processing RFQ submission');
 */

import pino from "pino";

// ── Build-time metadata stamped on every log line ───────────────────────────

const GIT_SHA = process.env.GITHUB_SHA ?? process.env.SENTRY_RELEASE ?? "local";
const ENV_NAME = process.env.NODE_ENV ?? "development";
const APP_VERSION = process.env.npm_package_version ?? "0.0.0";

// ── Sensitive field redactor ─────────────────────────────────────────────────
// Pino redact strips these key paths before serialisation. Use dot notation
// for nested keys (e.g. "req.headers.authorization").

const REDACT_PATHS = [
  "password",
  "passwd",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "client_secret",
  "authorization",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  "*.password",
  "*.secret",
  "*.token",
];

// ── Logger factory ────────────────────────────────────────────────────────────

function createLogger() {
  const isDev = ENV_NAME !== "production";

  return pino({
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    // In development: pretty-print with colours so the terminal is readable.
    // In production: raw JSON so Azure Monitor / Log Analytics can parse each line.
    ...(isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,git_sha,app_version",
            },
          },
        }
      : {}),
    base: {
      env: ENV_NAME,
      git_sha: GIT_SHA,
      app_version: APP_VERSION,
    },
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
    // Rename pino's default "msg" field to "message" so Azure Log Analytics
    // parses it into the standard Message column without a custom extraction rule.
    messageKey: "message",
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  });
}

export const log = createLogger();

// ── Request-scoped logger helper ─────────────────────────────────────────────

export function requestLogger(
  requestId: string,
  context?: Record<string, unknown>
) {
  return log.child({ request_id: requestId, ...context });
}

// ── Typed log context shapes ──────────────────────────────────────────────────

export interface AuthLogContext {
  request_id: string;
  user_id?: string;
  tenant_id?: string;
  action: string;
}

export interface DbLogContext {
  request_id: string;
  query?: string;
  duration_ms?: number;
  rows_affected?: number;
}

export interface HttpLogContext {
  request_id: string;
  method: string;
  path: string;
  status_code?: number;
  duration_ms?: number;
  user_id?: string;
  tenant_id?: string;
}
