// ─────────────────────────────────────────────────────────────────────────────
// Application Insights module — GreenChainz
// Workspace-based (required for new deployments). Wires telemetry into the
// Log Analytics workspace so all Container App logs live in one place.
// ─────────────────────────────────────────────────────────────────────────────

@description('Azure region for this resource.')
param location string

@description('Application Insights resource name.')
param appInsightsName string

@description('Resource ID of the Log Analytics workspace to back this component.')
param workspaceId string

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web' // "web" works for Node.js/server apps — affects portal dashboard defaults only
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceId // workspace-based is mandatory for new components
    // Retention is controlled by the Log Analytics workspace (30 days as configured
    // in loganalytics.bicep). RetentionInDays on this resource is ineffective for
    // workspace-based Application Insights and is intentionally omitted.
    // SamplingPercentage omitted — defaults to 100 %. Tune in portal if ingest costs grow.
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

@description('Connection string to set as APPLICATIONINSIGHTS_CONNECTION_STRING in Key Vault.')
output connectionString string = appInsights.properties.ConnectionString

@description('Instrumentation key (legacy — prefer connection string for new SDKs).')
output instrumentationKey string = appInsights.properties.InstrumentationKey

@description('Resource ID.')
output resourceId string = appInsights.id
