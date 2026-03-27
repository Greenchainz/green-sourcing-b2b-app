// Least-privilege RBAC role assignment.
// Assign a built-in role to a managed identity principal scoped to the specific resource
// the module is deployed to. No Contributor or Owner roles are used here.

param principalId string
param roleDefinitionId string
param description string = ''

var roleAssignmentName = guid(resourceGroup().id, principalId, roleDefinitionId)

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentName
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitionId)
    description: description
  }
}
