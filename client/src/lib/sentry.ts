/**
 * Sentry client-side initialization.
 * Imported at the top of client/src/main.tsx before React mounts.
 * DSN is injected at build time via VITE_SENTRY_DSN env var.
 */
/**
 * Client-side Sentry shim: dynamically loads @sentry/react when a DSN is
 * provided at build time. Otherwise exports a no-op stub so imports are safe
 * even if the package has been removed.
 */

type SentryLike = {
  init: (...args: any[]) => void;
  browserTracingIntegration?: () => any;
  replayIntegration?: (opts: any) => any;
};

const noop = () => {};

const SentryStub: SentryLike = {
  init: noop,
  browserTracingIntegration: () => ({}),
  replayIntegration: () => ({}),
};

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let ExportedSentry: SentryLike = SentryStub;

if (dsn) {
  // Dynamically import to avoid build/runtime failures when package removed
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === "true",
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: false,
          }),
        ],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ExportedSentry = Sentry as any;
      // Do not log in dev if the user intentionally removed Sentry.
    })
    .catch(() => {
      // Ignore import failure — keep stub
    });
}

export { ExportedSentry as Sentry };
