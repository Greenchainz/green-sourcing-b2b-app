// ─────────────────────────────────────────────────────────────────────────────
// Azure Container Registry module — GreenChainz
// Standard SKU. Admin disabled (MI-based auth only). Zone-redundancy off
// (cost-sensitive — enable only if SLA > 99.9 % becomes a hard requirement).
// ─────────────────────────────────────────────────────────────────────────────

@description('Azure region for this resource.')
param location string

@description('Registry name (globally unique, 5–50 alphanumeric chars).')
param registryName string

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: registryName
  location: location
  sku: {
    name: 'Standard' // Standard gives geo-replication opt-in + webhook support at ~$0.167/day
  }
  properties: {
    // Admin credentials disabled — the deploy workflow authenticates via OIDC
    // (az acr login --expose-token) and the Container App pulls via AcrPull
    // role assignment on the managed identity.
    adminUserEnabled: false
    // Blocks docker pull without authentication — prevents accidental public exposure.
    anonymousPullEnabled: false
    // Public network access on — no private endpoint yet (see sign-off report item 5).
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: 'Disabled' // cost-sensitive; flip to 'Enabled' in Premium SKU when needed
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

@description('FQDN of the registry, e.g. acrgreenchainzprod916.azurecr.io')
output loginServer string = acr.properties.loginServer

@description('Resource ID — needed for AcrPull role-assignment scope in main.bicep.')
output resourceId string = acr.id
