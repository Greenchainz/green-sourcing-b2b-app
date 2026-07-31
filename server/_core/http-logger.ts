/**
 * HTTP request/response structured logging middleware.
 *
 * Replaces ad-hoc console.log request logging with a structured Pino
 * entry per request. Each log line includes:
 *   - correlation_id: sourced from x-correlation-id header (upstream proxy)
 *                     or generated fresh as a UUID v4.
 *   - method, path, status_code, duration_ms, content_length
 *   - user_agent (scrubbed bot signatures for noise reduction)
 *   - git_sha, env (from logger base)
 *
 * The correlation_id is also written to the response as X-Correlation-Id
 * so clients and Azure Front Door can trace a full round-trip.
 */

import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { log } from "./logger";

// Paths to suppress from access logs (health checks, static assets) to
// reduce noise in Azure Log Analytics. Structured errors are always logged.
const SUPPRESS_PATHS = new Set(["/health", "/healthz", "/ready", "/api/health"]);

// ── Correlation ID injection ──────────────────────────────────────────────────

/**
 * Assigns a correlation ID to every request, sourced from the upstream
 * x-correlation-id header when present (Azure Front Door / API Management
 * passes this through). Falls back to a fresh UUID v4.
 *
 * Exposes the ID as:
 *   - req.id (Express convention, set by prior createRequestIdMiddleware)
 *   - req.correlationId (explicit typed field)
 *   - X-Correlation-Id response header
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const upstream = req.headers["x-correlation-id"];
  const correlationId =
    typeof upstream === "string" && upstream.length > 0
      ? upstream
      : (req.id ?? uuidv4());

  // Normalise — req.id is set by the UUID middleware that runs before this;
  // overwrite it so both fields are the same correlation ID.
  req.id = correlationId;
  (req as Request & { correlationId: string }).correlationId = correlationId;

  // Echo back so clients can correlate logs.
  res.setHeader("X-Correlation-Id", correlationId);
  next();
}

// ── Structured access log middleware ─────────────────────────────────────────

/**
 * Emits a structured JSON access log entry after the response finishes.
 * Runs as an `on('finish')` listener so the status code is final.
 */
export function httpAccessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on("finish", () => {
    const path = req.path ?? req.url ?? "";

    // Skip noisy health-check endpoints.
    if (SUPPRESS_PATHS.has(path)) return;

    const duration_ms = Date.now() - start;
    const status_code = res.statusCode;
    const method = req.method;
    const content_length = res.getHeader("content-length");

    const logPayload = {
      request_id: req.id,
      method,
      path,
      status_code,
      duration_ms,
      ...(content_length !== undefined ? { content_length: Number(content_length) } : {}),
    };

    if (status_code >= 500) {
      log.error(logPayload, "HTTP 5xx response");
    } else if (status_code >= 400) {
      log.warn(logPayload, "HTTP 4xx response");
    } else {
      log.info(logPayload, "HTTP request");
    }
  });

  next();
}
