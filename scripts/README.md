# Authentication Diagnostics Test Script

This directory contains a test script to validate the Azure AD authentication diagnostics system.

## Usage

### Quick Test

```bash
bash scripts/test-auth-diagnostics.sh
```

This will:
1. Check/create `.env` file
2. Enable `AUTH_DEBUG=true`
3. Run diagnostic tests demonstrating:
   - Trace ID generation
   - Structured logging with redaction
   - User-facing error messages
   - Metrics tracking

### Manual Authentication Flow Testing

After running the test script, test the full flow:

```bash
# 1. Ensure Azure AD credentials are in .env
# 2. Start dev server
npm run dev

# 3. Open browser to http://localhost:3000/login
# 4. Sign in with Microsoft
# 5. Check terminal for [AUTH] log entries
```

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
