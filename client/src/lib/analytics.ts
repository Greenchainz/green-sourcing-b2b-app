const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

let gaInitialized = false;

const isGoogleAnalyticsEnabled = () =>
  typeof window !== "undefined" &&
  typeof GA_MEASUREMENT_ID === "string" &&
  GA_MEASUREMENT_ID.trim().length > 0;

export function initGoogleAnalytics() {
  if (!isGoogleAnalyticsEnabled() || gaInitialized) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  gaInitialized = true;
}

export function trackGooglePageView(path: string) {
  if (!isGoogleAnalyticsEnabled()) return;

  initGoogleAnalytics();

  const normalizedPath = path || window.location.pathname;
  window.gtag?.("event", "page_view", {
    page_path: normalizedPath,
    page_location: `${window.location.origin}${normalizedPath}`,
    page_title: document.title,
  });
}

// ── Custom events ─────────────────────────────────────────────────────────────
// Use for funnel milestones and conversions (e.g. a supplier claiming their
// profile) so they show up in GA alongside page views.
export function trackGoogleEvent(action: string, params?: Record<string, unknown>) {
  if (!isGoogleAnalyticsEnabled()) return;

  initGoogleAnalytics();

  window.gtag?.("event", action, params ?? {});
}
