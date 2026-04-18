# Azure Managed Identity Setup Guide

## Overview

GreenChainz uses **User-Assigned Managed Identity** for Zero Trust authentication to Azure services. This eliminates the need for storing secrets and connection strings in code or environment variables.

**Identity Details:**
- Identity Name: `id-greenchainz-backend`
- Resource Group: `rg-greenchainz-infra`
- Client ID: `ec248abf-f6ce-4d7c-8888-740317709f1b`
- Used by: Container Apps (greenchainz-main-app, greenchainz-audit-api)

> ⚠️ **IMPORTANT:** `MANAGED_IDENTITY_CLIENT_ID` and the Entra app registration `CLIENT_ID` (`479e2a01-70ab-4df9-baa4-560d317c3423`) are **completely different things**. The managed identity grants access to **Azure resources**. The Entra app registration is used for **user sign-in (OAuth2/OIDC)** only. Never mix them.

## Benefits

✅ **Zero secrets in code** - No connection strings, API keys, or passwords  
✅ **Automatic credential rotation** - Azure handles token lifecycle  
✅ **Fine-grained permissions** - RBAC on each Azure resource  
✅ **Audit trail** - All access logged in Azure Activity Log  
✅ **Works locally** - Falls back to developer credentials (VS Code, Azure CLI)

## Resource Group Structure

```
rg-greenchainz-prod        ← main app, API, database, Key Vault
rg-greenchainz-agents      ← AI Audit Agent, future agent workloads
rg-greenchainz-infra       ← ACR, managed identities, networking
```

## Identity Architecture

Each Container App gets a **system-assigned** managed identity for its own operations.  
Shared resources (Key Vault, ACR) are accessed via the **user-assigned** managed identity `id-greenchainz-backend`.

```
id-greenchainz-backend (user-assigned, rg-greenchainz-infra)
  ├── Key Vault Secrets User  → greenchainz-vault (rg-greenchainz-prod)
  └── AcrPull                 → ACR (rg-greenchainz-infra)

greenchainz-main-app (system-assigned)
  └── PostgreSQL read/write   → DB level only

greenchainz-audit-api (system-assigned)
  ├── Key Vault Secrets User  → greenchainz-vault (rg-greenchainz-prod)
  └── Storage Blob Data Reader → container scope (if needed)
```

## Managed Identity Role Assignments (Least Privilege)

| Identity | Resource | Role | Scope |
|---|---|---|---|
| id-greenchainz-backend (user-assigned) | greenchainz-vault | Key Vault Secrets User | Key Vault resource |
| id-greenchainz-backend (user-assigned) | ACR | AcrPull | ACR resource |
| greenchainz-main-app (system-assigned) | PostgreSQL | DB role with read/write only | DB level |
| greenchainz-audit-api (system-assigned) | greenchainz-vault | Key Vault Secrets User | Key Vault resource |
| greenchainz-audit-api (system-assigned) | Storage (if needed) | Storage Blob Data Reader | Container scope |

> ✅ **No managed identity has Contributor or Owner at subscription or resource group scope.**

## Supported Azure Services

The following services authenticate via managed identity:

| Service | Authentication Method | Fallback (Local Dev) |
|---------|----------------------|---------------------|
| Azure Key Vault | `DefaultAzureCredential` | VS Code / Azure CLI |
| Azure App Configuration | `DefaultAzureCredential` | VS Code / Azure CLI |
| Azure Blob Storage | `DefaultAzureCredential` | Connection string |
| Azure Queue Storage | `DefaultAzureCredential` | Connection string |
| Azure Document Intelligence | `DefaultAzureCredential` | VS Code / Azure CLI |
| Azure AI Foundry | `DefaultAzureCredential` | VS Code / Azure CLI |

## Architecture

### Production (Azure Container Apps)

```
Container App (greenchainz-container)
  ↓ (uses User-Assigned Managed Identity)
  ↓ MANAGED_IDENTITY_CLIENT_ID: ec248abf-f6ce-4d7c-8888-740317709f1b
  ↓
  ├── Azure Key Vault (greenchainz-vault)
  │     └── RBAC: "Key Vault Secrets User"
  │
  ├── Azure App Configuration (app-config-green)
  │     └── RBAC: "App Configuration Data Reader"
  │
  ├── Azure Blob Storage (greenchainzstorage)
  │     └── RBAC: "Storage Blob Data Contributor"
  │
  ├── Azure Queue Storage (greenchainzstorage)
  │     └── RBAC: "Storage Queue Data Contributor"
  │
  └── Azure Document Intelligence
        └── RBAC: "Cognitive Services User"
```

### Local Development

```
Developer Machine
  ↓ (uses VS Code / Azure CLI credentials)
  ↓ Authenticated via: az login
  ↓
  ├── Azure Key Vault ✅
  ├── Azure App Configuration ✅
  ├── Azure Blob Storage (via connection string) ⚠️
  └── Azure Queue Storage (via connection string) ⚠️
```

## Environment Variables

### Production (Azure Container Apps)

Set these environment variables in Azure Container Apps:

```bash
# ── User-Assigned Managed Identity ──────────────────────────────────────────
# REQUIRED for production. This is id-greenchainz-backend in rg-greenchainz-infra.
# Do NOT set this to the Entra app registration CLIENT_ID.
MANAGED_IDENTITY_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b

# Key Vault & App Configuration
KEY_VAULT_NAME=greenchainz-vault
APP_CONFIG_ENDPOINT=https://app-config-green.azconfig.io

# Blob & Queue Storage (NO connection string needed)
AZURE_STORAGE_ACCOUNT_NAME=greenchainzstorage

# Document Intelligence
DOCUMENT_INTELLIGENCE_ENDPOINT=https://greenchainz-content-intel.cognitiveservices.azure.com/

# AI Foundry
AZURE_AI_FOUNDRY_ENDPOINT=https://greenchainz-foundry.cognitiveservices.azure.com/

# ── Entra App Registration (user sign-in only) ───────────────────────────────
# These are for OAuth2/OIDC user authentication flows — not Azure resource access.
AZURE_AD_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_AD_CLIENT_SECRET=<from Key Vault>
AZURE_CLIENT_SECRET=<from Key Vault>
AZURE_AD_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc

```

### Local Development

Set these in `.env.local`:

```bash
# OPTIONAL: Leave MANAGED_IDENTITY_CLIENT_ID unset to use VS Code/Azure CLI credentials
# MANAGED_IDENTITY_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b

# Key Vault & App Configuration (uses VS Code/Azure CLI auth)
KEY_VAULT_NAME=greenchainz-vault
APP_CONFIG_ENDPOINT=https://app-config-green.azconfig.io

# Blob & Queue Storage (use connection string for local dev)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# Document Intelligence (uses VS Code/Azure CLI auth)
DOCUMENT_INTELLIGENCE_ENDPOINT=https://greenchainz-content-intel.cognitiveservices.azure.com/
```

## Code Usage

### Centralized Credential Factory

All Azure SDK clients use the centralized `getAzureCredential()` function:

```typescript
// lib/azure/credentials.ts
import { getAzureCredential } from '@/lib/azure/credentials';

const credential = getAzureCredential();
// Automatically uses:
// - User-Assigned Managed Identity (production with MANAGED_IDENTITY_CLIENT_ID set)
// - Developer credentials (local dev without MANAGED_IDENTITY_CLIENT_ID)
```

### Example: Key Vault Access

```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { getAzureCredential } from '@/lib/azure/credentials';

const credential = getAzureCredential();
const client = new SecretClient('https://greenchainz-vault.vault.azure.net', credential);

const secret = await client.getSecret('database-connection-string');
console.log(secret.value);
```

### Example: Blob Storage

```typescript
import { BlobServiceClient } from '@azure/storage-blob';
import { getAzureCredential } from '@/lib/azure/credentials';

// Production (managed identity)
const accountUrl = 'https://greenchainzstorage.blob.core.windows.net';
const credential = getAzureCredential();
const blobClient = new BlobServiceClient(accountUrl, credential);

// Local development (connection string)
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobClient = BlobServiceClient.fromConnectionString(connectionString);
```

### Simplified API

Use our wrapper functions that handle both scenarios automatically:

```typescript
// Blob storage - automatically uses managed identity or connection string
import { uploadBlob, downloadBlob } from '@/lib/azure/blob-storage';

const result = await uploadBlob('container', 'file.pdf', buffer);
console.log(result.url);

// Queue service - automatically uses managed identity or connection string
import { sendToScraperQueue } from '@/lib/queue-service';

await sendToScraperQueue('process_document', { documentId: '123' });
```

## Setting Up Managed Identity (Admin Guide)

### 1. Create Resource Groups

```bash
az group create --name rg-greenchainz-prod   --location eastus
az group create --name rg-greenchainz-agents --location eastus
az group create --name rg-greenchainz-infra  --location eastus
```

### 2. Create User-Assigned Managed Identity

```bash
# Identity lives in rg-greenchainz-infra
az identity create \
  --name id-greenchainz-backend \
  --resource-group rg-greenchainz-infra \
  --location eastus
```

Get the Client ID and Principal ID:
```bash
az identity show \
  --name id-greenchainz-backend \
  --resource-group rg-greenchainz-infra \
  --query '{clientId:clientId, principalId:principalId}' -o json
```

### 3. Assign Identity to Container Apps

```bash
# Get identity resource ID
IDENTITY_ID=$(az identity show \
  --name id-greenchainz-backend \
  --resource-group rg-greenchainz-infra \
  --query id -o tsv)

# Assign to main app container app
az containerapp identity assign \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod \
  --user-assigned $IDENTITY_ID

# Enable system-assigned identity on main app
az containerapp identity assign \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod \
  --system-assigned

# Enable system-assigned identity on audit API
az containerapp identity assign \
  --name greenchainz-audit-api \
  --resource-group rg-greenchainz-agents \
  --system-assigned
```

### 4. Grant RBAC Permissions (Least Privilege)

> ⚠️ **No identity should receive Contributor or Owner at subscription or resource group scope.**

#### id-greenchainz-backend: Key Vault Secrets User (Key Vault resource scope only)
```bash
MI_PRINCIPAL_ID=$(az identity show \
  --name id-greenchainz-backend \
  --resource-group rg-greenchainz-infra \
  --query principalId -o tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$MI_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/rg-greenchainz-prod/providers/Microsoft.KeyVault/vaults/greenchainz-vault
```

#### id-greenchainz-backend: AcrPull (ACR resource scope only)
```bash
az role assignment create \
  --role "AcrPull" \
  --assignee-object-id "$MI_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/rg-greenchainz-infra/providers/Microsoft.ContainerRegistry/registries/acrgreenchainzprod916
```

#### greenchainz-audit-api: Key Vault Secrets User (Key Vault resource scope only)
```bash
AUDIT_PRINCIPAL_ID=$(az containerapp show \
  --name greenchainz-audit-api \
  --resource-group rg-greenchainz-agents \
  --query "identity.principalId" -o tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$AUDIT_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/rg-greenchainz-prod/providers/Microsoft.KeyVault/vaults/greenchainz-vault
```

#### App Configuration
```bash
az role assignment create \
  --role "App Configuration Data Reader" \
  --assignee-object-id "$MI_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/rg-greenchainz-prod/providers/Microsoft.AppConfiguration/configurationStores/app-config-green
```

#### Blob Storage
```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee-object-id "$MI_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/rg-greenchainz-prod/providers/Microsoft.Storage/storageAccounts/greenchainzstorage
```

#### Document Intelligence
```bash
az role assignment create \
  --role "Cognitive Services User" \
  --assignee-object-id "$MI_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/rg-greenchainz-prod/providers/Microsoft.CognitiveServices/accounts/greenchainz-content-intel
```

### 5. Set MANAGED_IDENTITY_CLIENT_ID in Container Apps

```bash
# Get the managed identity client ID
MI_CLIENT_ID=$(az identity show \
  --name id-greenchainz-backend \
  --resource-group rg-greenchainz-infra \
  --query clientId -o tsv)

# Main app
az containerapp update \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod \
  --set-env-vars MANAGED_IDENTITY_CLIENT_ID=$MI_CLIENT_ID

# Audit API
az containerapp update \
  --name greenchainz-audit-api \
  --resource-group rg-greenchainz-agents \
  --set-env-vars MANAGED_IDENTITY_CLIENT_ID=$MI_CLIENT_ID
```

### 6. Verify: No Broad Role Assignments

```bash
# Confirm no managed identity has Contributor or Owner at subscription or RG scope
az role assignment list \
  --assignee "$MI_PRINCIPAL_ID" \
  --query "[?roleDefinitionName=='Contributor' || roleDefinitionName=='Owner']" \
  -o table
# Expected: empty result
```

## Troubleshooting

### Error: "DefaultAzureCredential failed to retrieve token"

**Cause:** Managed identity not assigned or RBAC permissions missing

**Solution:**
1. Verify identity is assigned to container app
2. Check RBAC role assignments
3. Ensure `MANAGED_IDENTITY_CLIENT_ID` is set correctly

### Error: "ManagedIdentityCredential authentication failed"

**Cause:** `MANAGED_IDENTITY_CLIENT_ID` not set or incorrect

**Solution:**
```bash
# Verify environment variable
az containerapp show \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod \
  --query "properties.template.containers[0].env[?name=='MANAGED_IDENTITY_CLIENT_ID']" -o table

# Should show: MANAGED_IDENTITY_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b
```

### Local Development: "Authentication failed"

**Cause:** Not logged in to Azure CLI or VS Code

**Solution:**
```bash
# Login via Azure CLI
az login

# Or use VS Code Azure extension and sign in
```

### Mixed Credentials: Some services work, others don't

**Cause:** Inconsistent credential usage across files

**Solution:**
All Azure SDK clients should use `getAzureCredential()`:

```typescript
// ✅ CORRECT
import { getAzureCredential } from '@/lib/azure/credentials';
const credential = getAzureCredential();
// Uses MANAGED_IDENTITY_CLIENT_ID automatically

// ❌ WRONG - missing managedIdentityClientId
import { DefaultAzureCredential } from '@azure/identity';
const credential = new DefaultAzureCredential();
```

## Security Best Practices

✅ **Always use managed identity in production**  
✅ **Never commit connection strings to Git**  
✅ **Use principle of least privilege** — only grant required RBAC roles at resource scope  
✅ **No managed identity should have Contributor or Owner at subscription or RG scope**  
✅ **Keep MANAGED_IDENTITY_CLIENT_ID and the Entra app CLIENT_ID separate in environment variables**  
✅ **Rotate connection strings** used in local dev regularly  
✅ **Monitor access** via Azure Monitor and Activity Log  
✅ **Test locally with VS Code Azure extension** before deploying  
✅ **OAUTH_SERVER_URL must be in .env** — do not put it only in .env.local  

## References

- [Azure Managed Identity Overview](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [DefaultAzureCredential Documentation](https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredential)
- [Azure RBAC Roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Container Apps Managed Identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity)
