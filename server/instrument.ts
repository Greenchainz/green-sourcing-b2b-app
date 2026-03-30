// Server-side Sentry initialization — must be loaded before all other modules.
// In production: loaded via --import flag before dist/index.js
// In development: imported at the top of server/_core/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  release: process.env.SENTRY_RELEASE,

  sendDefaultPii: true,

  // Tracing — 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture local variable values in stack frames
  includeLocalVariables: true,

  // Structured logging
  enableLogs: true,
});
