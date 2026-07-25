// ─────────────────────────────────────────────────────────────────────────────
// Key Vault module — GreenChainz
// RBAC-authorised (no access policies). Soft-delete + purge-protection on.
// ─────────────────────────────────────────────────────────────────────────────

@description('Azure region for this resource.')
param location string

@description('Key Vault name (globally unique, 3–24 chars, alphanumeric + hyphens).')
param vaultName string

@description('Entra ID tenant that owns this vault.')
param tenantId string = subscription().tenantId

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    // RBAC mode: grant access via role assignments (Key Vault Secrets User / Officer),
    // not legacy access policies. Keeps infra and identity in sync with main.bicep.
    enableRbacAuthorization: true
    // Soft-delete + purge-protection prevent accidental secret loss.
    // 90-day retention gives ample time to recover.
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    // Public network access on — private endpoint is a future concern
    // (see sign-off report item 5: Private networking / zone redundancy).
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

@description('URI callers use to reference secrets: https://<vault>.vault.azure.net/')
output vaultUri string = keyVault.properties.vaultUri

@description('Resource ID — needed for role-assignment scope in main.bicep.')
output resourceId string = keyVault.id
