targetScope = 'subscription'

// === PARAMETERS ===
@description('The location for all resources.')
param location string = deployment().location

@description('A unique suffix for all resources that require a globally unique name.')
param resourceSuffix string = uniqueString(subscription().id)

// === RESOURCES ===

// --- Resource Group ---
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-greenchainz-prod-agents'
  location: location
}

// --- AI Foundry Project ---
module foundry 'modules/foundry.bicep' = {
  scope: rg
  name: 'foundryDeployment'
  params: {
    location: location
    resourceSuffix: resourceSuffix
  }
}

// --- Agent-Specific Resources (Databases, Storage, etc.) ---
// Note: These would be more detailed in a full implementation

// Cosmos DB for material data, RFQs, etc.
module cosmos 'modules/cosmos.bicep' = {
  scope: rg
  name: 'cosmosDbDeployment'
  params: {
    location: location
    accountName: 'cosmos-greenchainz-${resourceSuffix}'
  }
}

// Azure Blob Storage for RFQ documents and other assets
module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storageAccountDeployment'
  params: {
    location: location
    storageAccountName: 'stgreenchainz${resourceSuffix}'
  }
}

// === OUTPUTS ===
output foundryProjectName string = foundry.outputs.projectName
output cosmosDbEndpoint string = cosmos.outputs.endpoint
output storageAccountName string = storage.outputs.storageAccountName
