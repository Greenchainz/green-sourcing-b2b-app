# Azure Managed Identity Setup

This document explains how to use the managed identity authentication modules in your GreenChainz application.

## Overview

Azure Managed Identity has been configured for your `greenchainz-frontend` Container App with least-privilege RBAC access to:

- **PostgreSQL** (`greenchainz-db-prod`) - Contributor role

- **Web PubSub** (`GreenChainz`) - Web PubSub Service Owner role

- **Azure Maps** (`greencahinz-maps`) - Azure Maps Data Reader role

**Managed Identity Principal ID:** `ded29e9e-46a1-4471-9d05-d85895e83991`

## Benefits

✅ **Zero secrets** - No connection strings or API keys in environment variables✅ **Automatic token refresh** - Azure handles authentication automatically✅ **Enterprise-grade security** - Least-privilege RBAC with audit trails✅ **Compliance-ready** - Meets SOC 2, ISO 27001, and HIPAA requirements

## Usage

### PostgreSQL (Passwordless Authentication)

**Old way (with secrets):**

```typescript
import { getPool } from './lib/db';
// Requires DATABASE_URL with password in environment
const pool = getPool();
const result = await pool.query('SELECT * FROM materials');
```

**New way (managed identity):**

```typescript
import { getPool, query } from './lib/db-managed-identity';

// No secrets required - uses managed identity
const result = await query('SELECT * FROM materials WHERE category = $1', ['concrete']);
```

**Environment variables required:**

```
POSTGRES_HOST=greenchainz-db-prod.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRESE=greenchainz
POSTGRES_USER=greenchainz-frontend  # Managed identity name
```

### Web PubSub (Real-time Messaging)

**Old way (with secrets):**

```typescript
// Requires AZURE_WEBPUBSUB_CONNECTION_STRING
const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
```

**New way (managed identity):**

```typescript
import { getClientAccessUrl, sendToUser } from './lib/webpubsub-managed-identity';

// Generate WebSocket URL for client
const wsUrl = await getClientAccessUrl('user-123', 'greenchainz-chat');

// Send message to a user
await sendToUser('user-456', { type: 'rfq_update', data: { ... } });
```

**Environment variables required:**

```
AZURE_WEBPUBSUB_ENDPOINT=https://GreenChainz.webpubsub.azure.com
AZURE_WEBPUBSUB_HUB=greenchainz-chat
```

### Azure Maps (Geocoding & Routing )

**Old way (with secrets):**

```typescript
// Requires AZURE_MAPS_SUBSCRIPTION_KEY
const apiKey = process.env.AZURE_MAPS_SUBSCRIPTION_KEY;
```

**New way (managed identity):**

```typescript
import { geocodeAddress, calculateRoute } from './lib/azure-maps-managed-identity';

// Geocode an address
const location = await geocodeAddress('123 Main St, Seattle, WA');
// Returns: { latitude: 47.6062, longitude: -122.3321, formattedAddress: '...' }

// Calculate route
const route = await calculateRoute(
  { latitude: 47.6062, longitude: -122.3321 },
  { latitude: 47.6205, longitude: -122.3493 }
);
// Returns: { distanceMeters: 2500, durationSeconds: 420, coordinates: [...] }
```

**Environment variables required:**

```
AZURE_MAPS_CLIENT_ID=greencahinz-maps
```

## Migration Checklist

- [ ] Install new dependencies: `npm install @azure/web-pubsub`

- [ ] Update imports to use managed identity modules

- [ ] Remove old secrets from environment variables:
  - ❌ `DATABASE_URL`
  - ❌ `AZURE_WEBPUBSUB_CONNECTION_STRING`
  - ❌ `AZURE_MAPS_SUBSCRIPTION_KEY`

- [ ] Add new environment variables (see above)

- [ ] Test locally with Azure CLI authentication (`az login`)

- [ ] Deploy to Azure Container Apps (managed identity works automatically)

## Local Development

For local development, managed identity uses `DefaultAzureCredential` which tries authentication methods in this order:

1. **Environment variables** (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`)

1. **Azure CLI** (`az login`)

1. **Visual Studio Code** (Azure Account extension)

1. **Azure PowerShell**

**Recommended for local dev:** Run `az login` before starting your app.

## Production Deployment

In Azure Container Apps, managed identity authentication happens automatically. No additional configuration needed.

## Troubleshooting

**Error: "ManagedIdentityCredential authentication failed"**

- Verify managed identity is enabled on your Container App

- Check RBAC role assignments are correct

- Ensure environment variables are set correctly

**Error: "Access token expired"**

- Token refresh is automatic - this shouldn't happen

- Check system clock is synchronized

- Restart the application

**PostgreSQL connection fails:**

- Verify the managed identity user exists in PostgreSQL

- Check firewall rules allow Container App IP range

- Ensure SSL is enabled (`ssl: true` in config)

## Security Best Practices

✅ **Never commit secrets** - Managed identity eliminates this risk✅ **Use least-privilege roles** - Only grant necessary permissions✅ **Monitor access** - Enable Azure Monitor for audit logs✅ **Rotate nothing** - Managed identity tokens rotate automatically

## Additional Resources

- [Azure Managed Identity Documentation](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/)

- [DefaultAzureCredential](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential)

- [PostgreSQL Azure AD Authentication](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-configure-sign-in-azure-ad-authentication)