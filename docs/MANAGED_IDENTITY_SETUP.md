# Azure Managed Identity Setup Guide

## Overview

GreenChainz uses **User-Assigned Managed Identity** for Zero Trust authentication to Azure services. This eliminates the need for storing secrets and connection strings in code or environment variables.

**Identity Details:**
- Identity Name: `id-greenchainz-backend`
- Client ID: `ec248abf-f6ce-4d7c-8888-740317709f1b`
- Used by: Container Apps (frontend & backend)

## Benefits

✅ **Zero secrets in code** - No connection strings, API keys, or passwords  
✅ **Automatic credential rotation** - Azure handles token lifecycle  
✅ **Fine-grained permissions** - RBAC on each Azure resource  
✅ **Audit trail** - All access logged in Azure Activity Log  
✅ **Works locally** - Falls back to developer credentials (VS Code, Azure CLI)

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
  ↓ Client ID: ec248abf-f6ce-4d7c-8888-740317709f1b
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
# User-Assigned Managed Identity Client ID (REQUIRED for production)
AZURE_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b

# Key Vault & App Configuration
KEY_VAULT_NAME=greenchainz-vault
APP_CONFIG_ENDPOINT=https://app-config-green.azconfig.io

# Blob & Queue Storage (NO connection string needed)
AZURE_STORAGE_ACCOUNT_NAME=greenchainzstorage

# Document Intelligence
DOCUMENT_INTELLIGENCE_ENDPOINT=https://greenchainz-content-intel.cognitiveservices.azure.com/

# AI Foundry
AZURE_AI_FOUNDRY_ENDPOINT=https://greenchainz-foundry.cognitiveservices.azure.com/
```

### Local Development

Set these in `.env.local`:

```bash
# OPTIONAL: Leave AZURE_CLIENT_ID unset to use VS Code/Azure CLI credentials
# AZURE_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b

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
// - User-Assigned Managed Identity (production with AZURE_CLIENT_ID set)
// - Developer credentials (local dev without AZURE_CLIENT_ID)
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

### 1. Create User-Assigned Managed Identity

```bash
az identity create \
  --name id-greenchainz-backend \
  --resource-group greenchainz-production \
  --location eastus
```

Get the Client ID:
```bash
az identity show \
  --name id-greenchainz-backend \
  --resource-group greenchainz-production \
  --query clientId -o tsv
```

### 2. Assign Identity to Container Apps

```bash
# Get identity resource ID
IDENTITY_ID=$(az identity show \
  --name id-greenchainz-backend \
  --resource-group greenchainz-production \
  --query id -o tsv)

# Assign to frontend container app
az containerapp identity assign \
  --name greenchainz-frontend \
  --resource-group greenchainz-production \
  --user-assigned $IDENTITY_ID

# Assign to backend container app
az containerapp identity assign \
  --name greenchainz-container \
  --resource-group greenchainz-production \
  --user-assigned $IDENTITY_ID
```

### 3. Grant RBAC Permissions

#### Key Vault
```bash
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee ec248abf-f6ce-4d7c-8888-740317709f1b \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/greenchainz-production/providers/Microsoft.KeyVault/vaults/greenchainz-vault
```

#### App Configuration
```bash
az role assignment create \
  --role "App Configuration Data Reader" \
  --assignee ec248abf-f6ce-4d7c-8888-740317709f1b \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/greenchainz-production/providers/Microsoft.AppConfiguration/configurationStores/app-config-green
```

#### Blob Storage
```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee ec248abf-f6ce-4d7c-8888-740317709f1b \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/greenchainz-production/providers/Microsoft.Storage/storageAccounts/greenchainzstorage
```

#### Queue Storage
```bash
az role assignment create \
  --role "Storage Queue Data Contributor" \
  --assignee ec248abf-f6ce-4d7c-8888-740317709f1b \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/greenchainz-production/providers/Microsoft.Storage/storageAccounts/greenchainzstorage
```

#### Document Intelligence
```bash
az role assignment create \
  --role "Cognitive Services User" \
  --assignee ec248abf-f6ce-4d7c-8888-740317709f1b \
  --scope /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/greenchainz-production/providers/Microsoft.CognitiveServices/accounts/greenchainz-content-intel
```

### 4. Set Environment Variables in Container Apps

```bash
# Frontend
az containerapp update \
  --name greenchainz-frontend \
  --resource-group greenchainz-production \
  --set-env-vars AZURE_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b

# Backend
az containerapp update \
  --name greenchainz-container \
  --resource-group greenchainz-production \
  --set-env-vars AZURE_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b
```

## Troubleshooting

### Error: "DefaultAzureCredential failed to retrieve token"

**Cause:** Managed identity not assigned or RBAC permissions missing

**Solution:**
1. Verify identity is assigned to container app
2. Check RBAC role assignments
3. Ensure `AZURE_CLIENT_ID` is set correctly

### Error: "ManagedIdentityCredential authentication failed"

**Cause:** `AZURE_CLIENT_ID` not set or incorrect

**Solution:**
```bash
# Verify environment variable
az containerapp show \
  --name greenchainz-container \
  --resource-group greenchainz-production \
  --query "properties.configuration.secrets" -o table

# Should show: AZURE_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b
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

// ❌ WRONG - missing managedIdentityClientId
import { DefaultAzureCredential } from '@azure/identity';
const credential = new DefaultAzureCredential();
```

## Security Best Practices

✅ **Always use managed identity in production**  
✅ **Never commit connection strings to Git**  
✅ **Use principle of least privilege** - only grant required RBAC roles  
✅ **Rotate connection strings** used in local dev regularly  
✅ **Monitor access** via Azure Monitor and Activity Log  
✅ **Test locally with VS Code Azure extension** before deploying  

## References

- [Azure Managed Identity Overview](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [DefaultAzureCredential Documentation](https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredential)
- [Azure RBAC Roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Container Apps Managed Identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity)
