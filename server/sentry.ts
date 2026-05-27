/**
 * Sentry server-side initialization.
 * Import this ONCE at the very top of server/_core/index.ts — before any other imports.
 * Requires SENTRY_DSN in environment (loaded from Azure Key Vault via loadSecrets()).
 *
 * Note: loadSecrets() runs before this module's side-effects because index.ts
 * calls loadSecrets() before the server boots. SENTRY_DSN is available by
 * the time Express middleware runs.
 */
/**
 * Graceful Sentry shim.
 *
 * - If `SENTRY_DSN` is set we dynamically import `@sentry/node` and initialize it.
 * - If not set (or the package is absent) we export a no-op shim so callers
 *   can safely call Sentry APIs without the dependency being required.
 */

type ExpressErrorHandler = unknown;

const noop = () => { };

const SentryStub = {
  init: noop,
  // Returns a middleware no-op — matches Express error handler signature.
  expressErrorHandler: () => ((err: unknown, _req: unknown, _res: unknown, next: any) => next(err)) as unknown as ExpressErrorHandler,
  // Integrations stubs
  httpIntegration: () => ({}),
  expressIntegration: () => ({}),
};

const dsn = process.env.SENTRY_DSN;

let ExportedSentry: typeof SentryStub | any = SentryStub;

async function initIfNeeded() {
  if (!dsn) return;
  try {
    // Dynamically import to avoid hard dependency when Sentry is intentionally removed
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      enabled: process.env.NODE_ENV !== "test",
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
    });
    // Replace exported object with real Sentry implementation
    ExportedSentry = Sentry;
    console.log("[Sentry] Server monitoring initialized");
  } catch (err) {
    // If import fails, keep the stub but do not spam logs.
    ExportedSentry = SentryStub;
  }
}

// Kick off initialization but don't block module load.
void initIfNeeded();

export { ExportedSentry as Sentry };
