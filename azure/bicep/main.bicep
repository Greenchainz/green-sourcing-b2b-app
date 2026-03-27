targetScope = 'subscription'

// === PARAMETERS ===
@description('The Azure region to deploy resources into.')
param location string = 'eastus'

@description('A short unique suffix (max 8 chars) for globally unique resource names.')
@maxLength(8)
param resourceSuffix string = substring(uniqueString(subscription().id), 0, 8)

// === RESOURCE GROUPS ===

// rg-greenchainz-prod: main app, API, database, Key Vault
resource rgProd 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-prod'
  location: location
}

// rg-greenchainz-agents: AI Audit Agent and future agent workloads
resource rgAgents 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-agents'
  location: location
}

// rg-greenchainz-infra: ACR, managed identities, networking
resource rgInfra 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-infra'
  location: location
}

// NOTE: Azure AI Foundry projects are created manually via the Azure Portal.
// NOTE: Cosmos DB is NOT provisioned here — use your existing Cosmos DB account.
//       Point your agents at your existing endpoint via environment variables.

// === USER-ASSIGNED MANAGED IDENTITY ===
// id-greenchainz-backend is the shared identity used by all Container Apps to access
// Key Vault and ACR. It has least-privilege RBAC only — no Contributor or Owner roles.
module managedIdentity 'modules/managed-identity.bicep' = {
  scope: rgInfra
  name: 'managedIdentityDeployment'
  params: {
    location: location
    identityName: 'id-greenchainz-backend'
  }
}

// === RBAC ROLE ASSIGNMENTS ===
// All role assignments use least-privilege built-in roles scoped to the specific resource.
// No managed identity has Contributor or Owner at subscription or resource group scope.

// Key Vault Secrets User — id-greenchainz-backend on greenchainz-vault (in rg-greenchainz-prod)
// Role definition ID: 4633458b-17de-408a-b874-0445c86b69e6
module kvSecretsUser 'modules/role-assignment.bicep' = {
  scope: rgProd
  name: 'kvSecretsUserAssignment'
  params: {
    principalId: managedIdentity.outputs.principalId
    // Key Vault Secrets User
    roleDefinitionId: '4633458b-17de-408a-b874-0445c86b69e6'
    description: 'id-greenchainz-backend: Key Vault Secrets User on greenchainz-vault'
  }
}

// AcrPull — id-greenchainz-backend on ACR (in rg-greenchainz-infra)
// Role definition ID: 7f951dda-4ed3-4680-a7ca-43fe172d538d
module acrPull 'modules/role-assignment.bicep' = {
  scope: rgInfra
  name: 'acrPullAssignment'
  params: {
    principalId: managedIdentity.outputs.principalId
    // AcrPull
    roleDefinitionId: '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    description: 'id-greenchainz-backend: AcrPull on ACR'
  }
}

// === STORAGE (agent workloads) ===

// --- Azure Blob Storage for RFQ documents ---
// Stores generated RFQ PDFs and Excel files produced by the RFQ Forge agent.
module storage 'modules/storage.bicep' = {
  scope: rgAgents
  name: 'storageAccountDeployment'
  params: {
    location: location
    // Storage account names: 3-24 chars, lowercase letters and numbers ONLY
    // 'v2' prefix distinguishes this from the failed eastus deployment
    storageAccountName: 'stgczv2${resourceSuffix}'
  }
}

// === OUTPUTS ===
output rgProdName string = rgProd.name
output rgAgentsName string = rgAgents.name
output rgInfraName string = rgInfra.name
output managedIdentityClientId string = managedIdentity.outputs.clientId
output managedIdentityPrincipalId string = managedIdentity.outputs.principalId
output storageAccountName string = storage.outputs.storageAccountName
