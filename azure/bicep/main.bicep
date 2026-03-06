targetScope = 'subscription'

// === PARAMETERS ===
@description('The location for all resources.')
param location string = deployment().location

@description('A short unique suffix (max 8 chars) for globally unique resource names.')
@maxLength(8)
param resourceSuffix string = substring(uniqueString(subscription().id), 0, 8)

// === RESOURCES ===

// --- Resource Group ---
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-prod-agents'
  location: location
}

// NOTE: Azure AI Foundry projects are created manually via the Azure Portal.
// See README.md for instructions on creating and configuring your Foundry project.

// --- Agent-Specific Resources ---
// Cosmos DB for material data, RFQs, etc.
module cosmos 'modules/cosmos.bicep' = {
  scope: rg
  name: 'cosmosDbDeployment'
  params: {
    location: location
    // Cosmos account names: max 44 chars
    accountName: 'cosmos-gcz-${resourceSuffix}'
  }
}

// Azure Blob Storage for RFQ documents and other assets
module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storageAccountDeployment'
  params: {
    location: location
    // Storage account names: 3-24 chars, lowercase letters and numbers ONLY
    storageAccountName: 'stgcz${resourceSuffix}'
  }
}

// === OUTPUTS ===
output cosmosDbEndpoint string = cosmos.outputs.endpoint
output storageAccountName string = storage.outputs.storageAccountName
