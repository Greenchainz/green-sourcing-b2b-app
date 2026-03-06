targetScope = 'subscription'

// === PARAMETERS ===
@description('The Azure region to deploy resources into.')
param location string = 'eastus'

@description('A short unique suffix (max 8 chars) for globally unique resource names.')
@maxLength(8)
param resourceSuffix string = substring(uniqueString(subscription().id), 0, 8)

// === RESOURCES ===

// --- Resource Group ---
// All GreenChainz agent team resources live here.
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-prod-agents'
  location: location
}

// NOTE: Azure AI Foundry projects are created manually via the Azure Portal.
// NOTE: Cosmos DB is NOT provisioned here — use your existing Cosmos DB account.
//       Point your agents at your existing endpoint via environment variables.

// --- Azure Blob Storage for RFQ documents ---
// Stores generated RFQ PDFs and Excel files produced by the RFQ Forge agent.
module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storageAccountDeployment'
  params: {
    location: location
    // Storage account names: 3-24 chars, lowercase letters and numbers ONLY
    // 'v2' prefix distinguishes this from the failed eastus deployment
    storageAccountName: 'stgczv2${resourceSuffix}'
  }
}

// === OUTPUTS ===
output resourceGroupName string = rg.name
output storageAccountName string = storage.outputs.storageAccountName
