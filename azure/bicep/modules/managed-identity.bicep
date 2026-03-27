// User-Assigned Managed Identity
// Used by Container Apps to access Key Vault, ACR, and other Azure services.
// Least-privilege: only specific RBAC roles are assigned — no Contributor or Owner.

param location string
param identityName string

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

output identityId string = managedIdentity.id
output principalId string = managedIdentity.properties.principalId
output clientId string = managedIdentity.properties.clientId
