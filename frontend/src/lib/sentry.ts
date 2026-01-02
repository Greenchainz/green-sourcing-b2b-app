import * as Sentry from "@sentry/react";

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (dsn) {
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Tracing
      tracesSampleRate: 1.0, // Capture 100% of the transactions for now
      // Session Replay
      replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, always sample the session when an error occurs.
    });
  } else {
    console.warn("Sentry DSN not found. Sentry not initialized.");
  }
};

export const captureException = (error: unknown, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

export const setUserContext = (user: { id: string; email?: string; role?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
};

export const SentryErrorBoundary = Sentry.ErrorBoundary;
