/**
 * Sentry client-side initialization.
 * Imported at the top of client/src/main.tsx before React mounts.
 * DSN is injected at build time via VITE_SENTRY_DSN env var.
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Capture 100% of transactions in dev, 10% in prod
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Only send events in production or when explicitly enabled
    enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === "true",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text/inputs by default — do NOT capture PII
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    // Session Replay: capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  console.log("[Sentry] Client monitoring initialized");
}

export { Sentry };
