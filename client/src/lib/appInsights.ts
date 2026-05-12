/**
 * Azure Application Insights — Search & Click telemetry
 *
 * Tracks search events and material click-throughs for the Azure AI Search
 * service (aisearch-green). The search ID is returned in the
 * `x-ms-azs-searchid` response header and links Search → Click events
 * together in App Insights so you can measure relevance and CTR.
 *
 * Usage:
 *   trackSearch({ searchId, indexName, queryTerms, resultCount })
 *   trackClick({ searchId, clickedDocId, rank })
 */

const INSTRUMENTATION_KEY = '23337e83-1caa-4f3b-a657-3a8047c34898';
const SEARCH_SERVICE_NAME  = 'aisearch-green';

declare global {
  interface Window {
    appInsights?: {
      trackEvent: (name: string, props?: Record<string, unknown>) => void;
      trackPageView: (props?: Record<string, unknown>) => void;
    };
  }
}

function ai() {
  return window.appInsights;
}

// ── Search event ─────────────────────────────────────────────────────────────

export interface TrackSearchParams {
  searchId:       string;
  indexName:      string;
  queryTerms:     string;
  resultCount:    number;
  scoringProfile?: string;
}

export function trackSearch(params: TrackSearchParams): void {
  ai()?.trackEvent('Search', {
    SearchServiceName: SEARCH_SERVICE_NAME,
    SearchId:          params.searchId,
    IndexName:         params.indexName,
    QueryTerms:        params.queryTerms,
    ResultCount:       params.resultCount,
    ScoringProfile:    params.scoringProfile ?? '',
  });
}

// ── Click event ──────────────────────────────────────────────────────────────

export interface TrackClickParams {
  searchId:      string;
  clickedDocId:  string;
  rank:          number;
}

export function trackClick(params: TrackClickParams): void {
  ai()?.trackEvent('Click', {
    SearchServiceName: SEARCH_SERVICE_NAME,
    SearchId:          params.searchId,
    ClickedDocId:      params.clickedDocId,
    Rank:              params.rank,
  });
}

// ── Helper: pull search ID from an Azure Search response header ───────────────
// Call this on any fetch() response that hits the Azure Search REST API.
// The tRPC layer doesn't expose headers, so this is only useful if you ever
// call Azure Search directly from the client.

export function getSearchIdFromResponse(response: Response): string {
  return response.headers.get('x-ms-azs-searchid') ?? '';
}

export { INSTRUMENTATION_KEY };
