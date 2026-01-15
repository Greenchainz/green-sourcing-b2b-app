# Azure AD Authentication Debugging Guide

This guide explains how to enable and use the authentication diagnostics system for troubleshooting Azure AD sign-in failures.

## Overview

The authentication diagnostics system provides:
- **Structured logging** with detailed step-by-step tracking of the auth flow
- **Trace IDs** for correlating user-facing errors with server logs
- **Automatic redaction** of sensitive data (tokens, secrets, codes)
- **Metrics tracking** for auth attempts, successes, and failures
- **User-friendly error messages** with trace IDs for support

## Enabling Debug Mode

### Local Development

Add to your `.env` file:
```bash
AUTH_DEBUG=true
```

Restart your Next.js development server:
```bash
npm run dev
```

### Azure Container Apps (Production/Preview)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Container App (e.g., `greenchainz-frontend`)
3. Click on **Settings** → **Environment variables**
4. Add or update:
   - **Name**: `AUTH_DEBUG`
   - **Value**: `true`
5. Click **Save** and wait for the app to restart

> **Note**: Auth errors are always logged even when `AUTH_DEBUG=false`. Debug mode adds verbose step-by-step logging of successful flows.

## Authentication Flow and Logging Points

### 1. Token Exchange (`/api/auth/azure-token-exchange`)

When a user completes Azure AD sign-in and returns to your app:

**Logged steps:**
- `init` - Token exchange initiated
- `parse-request` - Request body parsed (code, redirectUri)
- `validate-input` - Validation of required fields
- `validate-config` - Azure AD environment variables check
- `token-exchange` - Calling Microsoft token endpoint
- `token-response` - Response from Microsoft (status, errors)
- `token-success` - Successful token exchange
- `exception` - Unhandled errors

**Example log output:**
```json
{
  "timestamp": "2026-01-15T03:30:00.123Z",
  "level": "info",
  "message": "Calling Microsoft token endpoint",
  "traceId": "auth-1736912345678-a1b2c3d4",
  "provider": "azure",
  "step": "token-exchange",
  "metadata": {
    "tokenEndpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "redirectUri": "https://www.greenchainz.com/login/callback",
    "tenantId": "common",
    "scope": "openid profile email"
  }
}
```

### 2. User Callback (`/api/auth/azure-callback`)

After receiving tokens from Azure, creates or updates user in database:

**Logged steps:**
- `init` - Callback initiated
- `parse-body` - Request body parsed (email, azureId, etc.)
- `validate-input` - Validation of required fields
- `db-connect` - Database connection acquired
- `db-begin` - Transaction started
- `db-user-check` - Checking for existing user
- `db-update-user` - Updating existing user's last login
- `db-create-user` - Creating new user (if not exists)
- `db-commit` - Transaction committed
- `generate-tokens` - Generating JWT tokens
- `store-refresh-token` - Storing refresh token
- `success` - Authentication complete
- `exception` - Unhandled errors

### 3. Frontend Callback (`/app/login/callback/CallbackClient.tsx`)

Handles the OAuth redirect and calls the backend APIs:

**User-visible steps:**
- "Loading configuration..."
- "Validating sign-in state..."
- "[1/3] Exchanging code with Azure via backend..."
- "[2/3] Token exchange OK. Parsing Azure identity..."
- "[3/3] Finalizing sign-in on backend..."
- "Sign-in complete. Redirecting..."

## Viewing Logs

### Local Development

Logs appear in your terminal where `npm run dev` is running:

```bash
[AUTH] {
  "timestamp": "2026-01-15T03:30:00.123Z",
  "level": "error",
  "message": "Microsoft rejected the token exchange",
  "traceId": "auth-1736912345678-a1b2c3d4",
  "provider": "azure",
  "step": "token-rejected",
  "statusCode": 400,
  "metadata": {
    "error": "invalid_grant",
    "errorDescription": "AADSTS54005: OAuth2 Authorization code was already redeemed",
    "errorCodes": ["54005"],
    "correlationId": "abc123..."
  }
}
```

### Azure Container Apps

#### Option 1: Log Stream (Real-time)

1. Go to Azure Portal → Your Container App
2. Click **Monitoring** → **Log stream**
3. Watch logs in real-time
4. Search for `[AUTH]` to filter authentication logs

#### Option 2: Log Analytics (Historical)

1. Go to Azure Portal → Your Container App
2. Click **Monitoring** → **Logs**
3. Use Kusto queries to search logs:

```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "[AUTH]"
| where TimeGenerated > ago(1h)
| project TimeGenerated, Log_s
| order by TimeGenerated desc
| limit 100
```

Search by Trace ID:
```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "auth-1736912345678-a1b2c3d4"
| project TimeGenerated, Log_s
| order by TimeGenerated asc
```

#### Option 3: Azure CLI

```bash
# Stream logs in real-time
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group greenchainz-prod \
  --follow

# Filter for auth logs
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group greenchainz-prod \
  --follow | grep '\[AUTH\]'
```

## Common Issues and Solutions

### Issue: "Authorization code is required"

**Trace ID helps find:** Whether the code was sent from frontend

**Check logs for:**
- `step: "parse-request"` - Was code present?
- `metadata.hasCode` - Should be `true`

**Common causes:**
- User denied consent in Azure AD
- OAuth redirect URL mismatch
- State parameter tampering

### Issue: "Microsoft rejected the token exchange"

**Trace ID helps find:** The exact error from Microsoft

**Check logs for:**
- `step: "token-rejected"`
- `metadata.error` - Azure AD error code
- `metadata.errorDescription` - Human-readable error
- `metadata.correlationId` - Microsoft's correlation ID

**Common errors:**
- `invalid_grant` / `AADSTS54005` - Code already used (refresh page)
- `invalid_client` - Wrong client ID/secret
- `redirect_uri_mismatch` - Redirect URI doesn't match Azure app registration

### Issue: "Database connection failed"

**Trace ID helps find:** Which database operation failed

**Check logs for:**
- `step: "db-connect"` - Connection pool issue
- `step: "db-user-check"` - Query failed
- `step: "db-rollback"` - Transaction rolled back

**Common causes:**
- Database connection pool exhausted
- Database credentials incorrect
- Network connectivity to Azure PostgreSQL

### Issue: "Token exchange failed (HTTP 502)"

**This means:** Backend service is unreachable

**Check:**
1. Is the backend container running?
   ```bash
   az containerapp show \
     --name greenchainz-frontend \
     --resource-group greenchainz-prod \
     --query "properties.runningStatus"
   ```

2. Are environment variables set correctly?
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

## Using Trace IDs for Support

When users report authentication failures, they'll see an error like:

```
Authentication failed: Token exchange failed (Trace ID: auth-1736912345678-a1b2c3d4)
```

### To investigate:

1. **Copy the Trace ID** from the user's error message
2. **Search logs** in Azure Log Analytics:
   ```kusto
   ContainerAppConsoleLogs_CL
   | where Log_s contains "auth-1736912345678-a1b2c3d4"
   | project TimeGenerated, Log_s
   | order by TimeGenerated asc
   ```
3. **Review the flow** - All log entries with that trace ID show the complete auth flow
4. **Find the failure point** - Look for `level: "error"` entries

## Metrics

When `AUTH_DEBUG=true`, the system logs metrics for:
- `auth_attempt` - User started authentication
- `auth_success` - Authentication completed successfully
- `auth_failure` - Authentication failed (with reason)

These can be aggregated for monitoring:

```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "[AUTH_METRIC]"
| extend metric = extract("\"metric\":\"([^\"]+)\"", 1, Log_s)
| extend provider = extract("\"provider\":\"([^\"]+)\"", 1, Log_s)
| summarize count() by metric, provider
```

## Security Notes

The diagnostics system automatically redacts:
- Access tokens
- ID tokens
- Refresh tokens
- Authorization codes
- Client secrets
- API keys
- Passwords

Redacted values appear as `[REDACTED X chars]` in logs.

**Example:**
```json
{
  "access_token": "[REDACTED 1843 chars]",
  "id_token": "[REDACTED 912 chars]",
  "code": "[REDACTED 156 chars]"
}
```

## Disabling Debug Mode

To disable verbose logging:

### Local Development
Remove or set in `.env`:
```bash
AUTH_DEBUG=false
```

### Azure Container Apps
1. Go to Azure Portal → Container App → Environment variables
2. Set `AUTH_DEBUG` to `false` or delete the variable
3. Save and restart

> **Note**: Error logs will still be captured even when debug mode is off.

## Best Practices

1. **Enable debug mode only when troubleshooting** - Reduces log volume and costs
2. **Always include trace ID when filing support tickets**
3. **Check Azure AD audit logs** for complementary information:
   - Go to Azure Portal → Azure Active Directory → Sign-in logs
   - Search by user email or correlation ID
4. **Monitor authentication metrics** to identify patterns
5. **Review logs regularly** to catch issues before users report them

## Related Documentation

- [Azure AD OAuth Setup](./OAUTH_SETUP.md) - Configuring Azure AD app registration
- [Azure Secrets and Config](./AZURE_SECRETS_AND_CONFIG.md) - Managing environment variables
- [Production Setup Checklist](./PRODUCTION-SETUP-CHECKLIST.md) - Deployment guide

## Support

If authentication issues persist after following this guide:
1. Collect the trace ID from the error message
2. Export relevant logs from Azure Log Analytics
3. Check Azure AD sign-in logs for the user/time period
4. Contact support with all of the above information
