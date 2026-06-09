import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { Span } from "@opentelemetry/api";

/**
 * OTel span processor that scrubs sensitive HTTP attributes before spans are
 * exported to Azure Application Insights:
 *
 *   • url.full / http.url       — query string values replaced with [REDACTED]
 *   • url.query                 — entire attribute replaced with [REDACTED]
 *   • client.address / net.peer.ip — replaced with [IP]
 */
const SENSITIVE_QUERY_PARAM_RE =
  /\b(token|access_token|refresh_token|id_token|key|api_key|apikey|secret|client_secret|password|passwd|pwd|code|auth_code|state|nonce|session|session_id|sig|signature|hash|jwt)=([^&\s"'#]*)/gi;

function scrubUrl(raw: string): string {
  return raw.replace(SENSITIVE_QUERY_PARAM_RE, "$1=[REDACTED]");
}

class TelemetryScrubberProcessor implements SpanProcessor {
  // No delegation needed — useAzureMonitor adds this alongside its own exporter processor.
  onStart(_span: Span, _parentContext: Context): void {
    // Nothing to scrub at start — attributes are set after onStart.
  }

  onEnd(span: ReadableSpan): void {
    const attrs = span.attributes as Record<string, unknown>;

    for (const key of ["url.full", "http.url"]) {
      if (typeof attrs[key] === "string") {
        attrs[key] = scrubUrl(attrs[key] as string);
      }
    }

    if ("url.query" in attrs) {
      attrs["url.query"] = "[REDACTED]";
    }

    for (const key of ["client.address", "net.peer.ip"]) {
      if (key in attrs) {
        attrs[key] = "[IP]";
      }
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

queueMicrotask(() => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  const enable = process.env.NODE_ENV === "production" || process.env.AZURE_MONITOR_ENABLED === "true";

  if (!enable) return;

  if (!connectionString) {
    console.warn("[telemetry] APPLICATIONINSIGHTS_CONNECTION_STRING not set — telemetry disabled");
    return;
  }

  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString },
    // Scrubs sensitive fields from every span before export to App Insights.
    spanProcessors: [new TelemetryScrubberProcessor()],
  });
  console.log("[telemetry] Azure Monitor OpenTelemetry initialized (with telemetry scrubber)");
});
