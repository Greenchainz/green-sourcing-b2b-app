# Authentication Diagnostics Test Script

This directory contains a test script to validate the Azure AD authentication diagnostics system.

## Scripts

### Authentication Diagnostics Test (`test-auth-diagnostics.sh`)

This will:
1. Check/create `.env` file
2. Enable `AUTH_DEBUG=true`
3. Run diagnostic tests demonstrating:
   - Trace ID generation
   - Structured logging with redaction
   - User-facing error messages
   - Metrics tracking

### Azure AD Configuration Verification (`verify-azure-ad-config.sh`)

Verifies that all necessary Azure AD configurations are in place for the Container App.

**Usage:**
```bash
./scripts/verify-azure-ad-config.sh
```

**What it checks:**
- Azure CLI installation and login status
- Container App existence and URL
- Required environment variables (NextAuth, Azure AD)
- Provides checklist for Azure Portal verification

### Azure AD Configuration Update (`update-azure-auth-config.sh`)

Updates the Container App with all required NextAuth environment variables.

**Usage:**
```bash
./scripts/update-azure-auth-config.sh
```

**What it does:**
1. Prompts for Azure AD client secret
2. Generates or accepts NextAuth secret
3. Determines Container App URL automatically
4. Updates all environment variables
5. Restarts the Container App

## Usage

### Quick Test (Local Development)

```bash
bash scripts/test-auth-diagnostics.sh
```

## Quick Start

### For Local Development
```bash
# Test authentication diagnostics
bash scripts/test-auth-diagnostics.sh
```

### For Production Issues (invalid_grant errors)

1. **Run verification script:**
   ```bash
   ./scripts/verify-azure-ad-config.sh
   ```

2. **If environment variables are missing, update them:**
   ```bash
   ./scripts/update-azure-auth-config.sh
   ```

3. **Verify redirect URIs in Azure Portal:**
   - See output from verification script
   - Or follow guide in `docs/AZURE_AD_FIX.md`

4. **Test login:**
   ```bash
   # Get your Container App URL from verification script
   open https://YOUR-APP-URL/login
   ```

## Manual Authentication Flow Testing

After running the test script, test the full flow:

```bash
# 1. Ensure Azure AD credentials are in .env
# 2. Start dev server
npm run dev

# 3. Open browser to http://localhost:3000/login
# 4. Sign in with Microsoft
# 5. Check terminal for [AUTH] log entries
```

## Troubleshooting Production Issues

### "Azure CLI not found"
Install Azure CLI:
- Mac: `brew install azure-cli`
- Windows: Download from https://aka.ms/installazurecliwindows
- Linux: https://docs.microsoft.com/cli/azure/install-azure-cli-linux

### "Not logged in to Azure"
Login to Azure:
```bash
az login
```

### "Container App not found"
Set the correct resource group:
```bash
export AZURE_RESOURCE_GROUP=your-resource-group-name
./scripts/verify-azure-ad-config.sh
```

### "Client secret is invalid"
Get the latest secret from Azure Key Vault:
1. Go to: Azure Portal → Key Vaults → Greenchainz-vault-2026
2. Navigate to: Secrets → AzureAD-ClientSecret
3. Click on the latest version
4. Click "Show Secret Value"
5. Copy the value and use it in the update script

### Expected Log Output

With `AUTH_DEBUG=true`, you'll see structured logs like:

```json
[AUTH] {
  "timestamp": "2026-01-15T03:36:46.897Z",
  "level": "info",
  "message": "Token exchange initiated",
  "traceId": "auth-1768448206897-4b03a24b",
  "provider": "azure",
  "step": "token-exchange",
  "metadata": {
    "access_token": "[REDACTED 39 chars]",
    "redirectUri": "https://www.greenchainz.com/login/callback"
  }
}
```

### Troubleshooting

If authentication fails:

1. **Copy the Trace ID** from the error message shown to the user
2. **Search logs** for that trace ID: `grep "auth-xxx-yyy" terminal-output.log`
3. **Review the flow** - all steps with that trace ID show the complete auth pipeline
4. **Check specific errors** - look for `"level":"error"` entries

### Debug Mode Control

```bash
# Enable debug mode (verbose logging)
echo "AUTH_DEBUG=true" >> .env

# Disable debug mode (errors only)
echo "AUTH_DEBUG=false" >> .env
```

## Documentation

- [Authentication Debugging Guide](../docs/auth-debugging.md) - Complete documentation
- [OAuth Setup](../docs/OAUTH_SETUP.md) - Azure AD configuration
- [Environment Variables](../.env.example) - Configuration reference

## Test Coverage

The diagnostics system is fully tested:

```bash
# Run diagnostics unit tests
npm test -- tests/unit/auth/diagnostics.test.ts

# Run azure callback tests (validates integration)
npm test -- tests/unit/auth/azure-callback.test.ts
```

All tests passing ✅

## Related Documentation

For comprehensive authentication fix instructions:
- **`docs/AZURE_AD_FIX.md`** - Complete Azure AD authentication fix guide (START HERE for production issues)
- `AZURE_AD_SETUP.md` - Original PKCE setup documentation
- `AZURE_PORTAL_CHECKLIST.md` - Azure Portal configuration checklist
- `.env.azure.example` - Production environment variables reference
- [Authentication Debugging Guide](../docs/auth-debugging.md) - Detailed debugging information
- [OAuth Setup](../docs/OAUTH_SETUP.md) - Azure AD configuration
- [Environment Variables](../.env.example) - Configuration reference
