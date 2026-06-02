import { useAzureMonitor } from "@azure/monitor-opentelemetry";

queueMicrotask(() => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  const enable = process.env.NODE_ENV === "production" || process.env.AZURE_MONITOR_ENABLED === "true";

  if (!enable) return;

  if (!connectionString) {
    console.warn("[telemetry] APPLICATIONINSIGHTS_CONNECTION_STRING not set — telemetry disabled");
    return;
  }

  useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
  console.log("[telemetry] Azure Monitor OpenTelemetry initialized");
});
