import { initSentry, captureException, setUserContext } from './sentry';
import { initPostHog, identifyUser, resetUser, trackEvent, trackPageView } from './posthog';

export interface AnalyticsUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

// Function to initialize both Sentry and PostHog
// Should be called only if user has consented to analytics
export const initAnalytics = () => {
  // Check if consent is given, or if we want to initialize by default and let tools handle consent
  // For now, we assume this is called when consent is verified or not needed (e.g. strict mode)
  // However, the CookieBanner logic will control when this is called.

  // Note: Sentry might be considered "Essential" for error tracking depending on interpretation,
  // but usually it's good practice to respect "Analytics" or "Performance" consent for full tracing.
  // Exception tracking might be essential.

  initSentry();
  initPostHog();
};

export const identify = (user: AnalyticsUser) => {
  setUserContext(user);
  identifyUser(user.id, user);
};

export const reset = () => {
  setUserContext(null);
  resetUser();
};

export const track = (event: string, properties?: Record<string, any>) => {
  trackEvent(event, properties);
};

export const trackPage = (path: string) => {
  trackPageView(path);
};

export const captureError = (error: unknown, context?: Record<string, any>) => {
  captureException(error, context);
};

// Helper functions for common events
export const trackSearch = (query: string, resultsCount: number) => {
  track('Search', {
    query,
    results_count: resultsCount,
  });
};

export const trackRFQSubmit = (rfqId: string, supplierId: string) => {
  track('RFQ Submitted', {
    rfq_id: rfqId,
    supplier_id: supplierId,
  });
};

export const trackSignup = (userId: string, role: string) => {
  track('User Signup', {
    user_id: userId,
    role,
  });
};

export const trackUpgrade = (tier: string, price: number) => {
  track('Upgrade Plan', {
    tier,
    price,
  });
};
