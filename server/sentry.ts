/**
 * Sentry server-side initialization.
 * Import this ONCE at the very top of server/_core/index.ts — before any other imports.
 * Requires SENTRY_DSN in environment (loaded from Azure Key Vault via loadSecrets()).
 *
 * Note: loadSecrets() runs before this module's side-effects because index.ts
 * calls loadSecrets() before the server boots. SENTRY_DSN is available by
 * the time Express middleware runs.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Capture 100% of transactions in dev, 10% in prod to stay on free tier
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Don't send events in test runs
    enabled: process.env.NODE_ENV !== "test",
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  console.log("[Sentry] Server monitoring initialized");
} else {
  console.warn("[Sentry] SENTRY_DSN not set — error monitoring disabled");
}

export { Sentry };
