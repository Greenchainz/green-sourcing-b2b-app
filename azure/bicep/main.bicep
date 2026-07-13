targetScope = 'subscription'

// === PARAMETERS ===
@description('The Azure region to deploy resources into.')
param location string = 'eastus'

@description('A short unique suffix (max 8 chars) for globally unique resource names.')
@maxLength(8)
param resourceSuffix string = substring(uniqueString(subscription().id), 0, 8)

// === RESOURCE GROUPS (managed by this Bicep) ===

// rg-greenchainz-prod: reserved for future resources owned by this Bicep
resource rgProd 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-prod'
  location: location
}

// rg-greenchainz-agents: AI Audit Agent and future agent workloads
resource rgAgents 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-agents'
  location: location
}

// rg-greenchainz-infra: managed identities
resource rgInfra 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-infra'
  location: location
}

// === PRE-EXISTING PRODUCTION RESOURCE GROUPS (adopt only — NOT created here) ===
// These RGs were provisioned before this Bicep and must not be re-created.

resource rgProduction 'Microsoft.Resources/resourceGroups@2021-04-01' existing = {
  name: 'greenchainz-production' // Key Vault lives here
}

resource rgProdContainer 'Microsoft.Resources/resourceGroups@2021-04-01' existing = {
  name: 'rg-greenchainz-prod-container' // ACR, Container Apps, Log Analytics live here
}

// NOTE: Azure AI Foundry projects are created manually via the Azure Portal.
// NOTE: Cosmos DB is NOT provisioned here — use your existing Cosmos DB account.

// === USER-ASSIGNED MANAGED IDENTITY ===
// id-greenchainz-backend is the shared identity used by Container Apps to access
// Key Vault and ACR. Least-privilege RBAC only — resource-scoped, not RG-scoped.
module managedIdentity 'modules/managed-identity.bicep' = {
  scope: rgInfra
  name: 'managedIdentityDeployment'
  params: {
    location: location
    identityName: 'id-greenchainz-backend'
  }
}

// === STORAGE (agent workloads) ===
module storage 'modules/storage.bicep' = {
  scope: rgAgents
  name: 'storageAccountDeployment'
  params: {
    location: location
    storageAccountName: 'stgczv2${resourceSuffix}'
  }
}

// === KEY VAULT ===
// greenchainz-vault lives in greenchainz-production (pre-existing RG — module adopts in place).
// RBAC mode is on, so role assignments below replace the legacy access policies.
module keyVault 'modules/keyvault.bicep' = {
  scope: rgProduction
  name: 'keyVaultDeployment'
  params: {
    location: location
    vaultName: 'greenchainz-vault'
  }
}

// Existing reference used to scope the RBAC role assignment to the vault resource,
// not to the whole resource group. dependsOn the module ensures creation order.
resource kvForRbac 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: 'greenchainz-vault'
  scope: rgProduction
}

// === CONTAINER REGISTRY ===
// Production registry: acrgreenchainzprod916 in rg-greenchainz-prod-container.
// This module adopts/manages the existing registry in place.
module acr 'modules/acr.bicep' = {
  scope: rgProdContainer
  name: 'acrDeployment'
  params: {
    location: location
    registryName: 'acrgreenchainzprod916'
  }
}

// Existing reference for RBAC scoping (same pattern as Key Vault above).
resource acrForRbac 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: 'acrgreenchainzprod916'
  scope: rgProdContainer
}

// === OBSERVABILITY ===

// IMPORTANT: Do NOT recreate a new Log Analytics workspace.
// The Container App environment (cae-greenchainz-env) is already wired to
// workspace-rggreenchainzprodcontainer5PZ8 in rg-greenchainz-prod-container.
// Creating a second workspace here would leave the Container App environment
// pointing to the old one while this Bicep creates an orphan.
resource existingLogAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: 'workspace-rggreenchainzprodcontainer5PZ8'
  scope: rgProdContainer
}

// Application Insights — workspace-based, connected to the existing Log Analytics workspace.
// The connection string output below should be stored in Key Vault as "appinsights-connection".
// Name matches setup-infrastructure.sh: APP_INSIGHTS="greenchainz-platform"
module appInsights 'modules/appinsights.bicep' = {
  scope: rgProdContainer
  name: 'appInsightsDeployment'
  params: {
    location: location
    appInsightsName: 'greenchainz-platform'
    workspaceId: existingLogAnalytics.id
  }
}

// === RBAC ROLE ASSIGNMENTS (resource-scoped, not RG-scoped) ===
// Each assignment is scoped to a specific resource using the `scope` property,
// so the managed identity only gets the role on that one resource.

// Key Vault Secrets User — scoped to greenchainz-vault only.
// Role definition ID: 4633458b-17de-408a-b874-0445c86b69e6
resource kvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kvForRbac.id, managedIdentity.outputs.principalId, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: kvForRbac
  dependsOn: [keyVault]
  properties: {
    principalId: managedIdentity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    description: 'id-greenchainz-backend: Key Vault Secrets User on greenchainz-vault only'
  }
}

// AcrPull — scoped to acrgreenchainzprod916 only.
// Role definition ID: 7f951dda-4ed3-4680-a7ca-43fe172d538d
resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acrForRbac.id, managedIdentity.outputs.principalId, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  scope: acrForRbac
  dependsOn: [acr]
  properties: {
    principalId: managedIdentity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    description: 'id-greenchainz-backend: AcrPull on acrgreenchainzprod916 only'
  }
}

// === OUTPUTS ===
output rgProdName string = rgProd.name
output rgAgentsName string = rgAgents.name
output rgInfraName string = rgInfra.name
output managedIdentityClientId string = managedIdentity.outputs.clientId
output managedIdentityPrincipalId string = managedIdentity.outputs.principalId
output storageAccountName string = storage.outputs.storageAccountName
output keyVaultUri string = keyVault.outputs.vaultUri
output acrLoginServer string = acr.outputs.loginServer
// Store this in Key Vault as "appinsights-connection" after running this deployment:
//   az keyvault secret set --vault-name greenchainz-vault --name appinsights-connection --value "<output below>"
output appInsightsConnectionString string = appInsights.outputs.connectionString
output logAnalyticsWorkspaceId string = existingLogAnalytics.id
