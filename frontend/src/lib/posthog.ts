import posthog from 'posthog-js';

export const initPostHog = () => {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const api_host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  if (key) {
    posthog.init(key, {
      api_host,
      autocapture: false, // Start with manual tracking or specific autocapture
      capture_pageview: false, // We will handle page views manually for React Router
      persistence: 'localStorage+cookie',
    });
  } else {
    console.warn("PostHog Key not found. PostHog not initialized.");
  }
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  posthog.identify(userId, traits);
};

export const resetUser = () => {
  posthog.reset();
};

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  posthog.capture(event, properties);
};

export const trackPageView = (path: string) => {
  posthog.capture('$pageview', {
    $current_url: path,
  });
};

export default posthog;
