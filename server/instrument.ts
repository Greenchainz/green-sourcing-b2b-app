import { useAzureMonitor } from "@azure/monitor-opentelemetry";

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
const enable = process.env.NODE_ENV === "production" || process.env.AZURE_MONITOR_ENABLED === "true";

if (enable) {
  if (!connectionString) {
    console.warn("[telemetry] APPLICATIONINSIGHTS_CONNECTION_STRING not set — telemetry disabled");
  } else {
    useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
    console.log("[telemetry] Azure Monitor OpenTelemetry initialized");
  }
}
