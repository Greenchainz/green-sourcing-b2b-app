param location string
param resourceSuffix string

@description('Controls whether to deploy the Foundry project resource. Defaults to false.')
param deployFoundry bool = false

// AI Foundry Project
// NOTE: This is a reference template only — not production-ready IaC. Azure AI Foundry
// projects are typically created via the Azure Portal or Azure AI Studio. A real
// deployment would require agent profiles, tool connections, and additional configuration.
// Set deployFoundry=true only after verifying the resource type is available in your
// subscription and region and all required configuration is in place.
resource foundryProject 'Microsoft.AI/foundryProjects@2023-10-31-preview' = if (deployFoundry) {
// AI Foundry Project
resource foundryProject 'Microsoft.AI/foundryProjects@2023-10-31-preview' = {
  name: 'greenchainz-agent-foundry-${resourceSuffix}'
  location: location
  properties: {
    displayName: 'GreenChainz Agent Foundry'
    description: 'Foundry project for the GreenChainz multi-agent system.'
  }
}

output projectName string = deployFoundry ? foundryProject.name : ''
// This is a simplified representation. A real implementation would involve
// defining agent profiles, tool connections, and other configurations here.

output projectName string = foundryProject.name
