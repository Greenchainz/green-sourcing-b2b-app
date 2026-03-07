param location string
param resourceSuffix string

// AI Foundry Project
resource foundryProject 'Microsoft.AI/foundryProjects@2023-10-31-preview' = {
  name: 'greenchainz-agent-foundry-${resourceSuffix}'
  location: location
  properties: {
    displayName: 'GreenChainz Agent Foundry'
    description: 'Foundry project for the GreenChainz multi-agent system.'
  }
}

// This is a simplified representation. A real implementation would involve
// defining agent profiles, tool connections, and other configurations here.

output projectName string = foundryProject.name
