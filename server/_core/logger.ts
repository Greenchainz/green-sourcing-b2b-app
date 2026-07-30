import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Structured logger — emits JSON in production (ingested by Azure Log Analytics),
 * pretty-printed in development. Import and use everywhere instead of console.log.
 *
 * Usage:
 *   import { logger } from "./_core/logger";
 *   logger.info({ userId, duration }, "RFQ submitted");
 *   logger.error({ err }, "Database query failed");
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    // Redact sensitive fields before they reach the log sink.
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "secret",
        "token",
        "hash",
        "salt",
        "*.password",
        "*.secret",
        "*.token",
        "*.hash",
        "*.salt",
      ],
      censor: "[REDACTED]",
    },
    // Standard fields included on every log line.
    base: {
      env: process.env.NODE_ENV ?? "development",
      deploymentSha: process.env.DEPLOYMENT_SHA ?? "local",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname,env,deploymentSha",
        },
      })
    : undefined
);

/** Child logger pre-bound with a correlation/request ID. */
export function requestLogger(correlationId: string) {
  return logger.child({ correlationId });
}
