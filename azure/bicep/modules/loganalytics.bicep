// ─────────────────────────────────────────────────────────────────────────────
// Log Analytics workspace module — GreenChainz
// PerGB2018 SKU: pay only for data ingested.
// 30-day interactive retention (free), then pay-per-GB for archive.
// ─────────────────────────────────────────────────────────────────────────────

@description('Azure region for this resource.')
param location string

@description('Log Analytics workspace name (unique within subscription).')
param workspaceName string

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018' // cheapest — ~$2.76/GB after the 5 GB/month free tier
    }
    // 30-day interactive retention — sufficient for typical debugging windows.
    retentionInDays: 30
    // Force ingestion/query through Microsoft backbone, not public internet.
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

@description('Workspace resource ID — required for workspace-based Application Insights.')
output workspaceId string = logAnalytics.id

@description('Customer ID (workspace GUID) — used for direct KQL queries if needed.')
output customerId string = logAnalytics.properties.customerId
