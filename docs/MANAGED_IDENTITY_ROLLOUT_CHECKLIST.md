# Managed Identity Rollout Checklist

This checklist is for production rollout of the managed-identity-first hardening.

## 1) Required Production Configuration

Set these for all API containers:

- `NODE_ENV=production`
- `JWT_SECRET`
- `DATABASE_URL`
- `AZURE_AD_CLIENT_SECRET`

Set these for managed identity:

- `AZURE_MI_CLIENT_ID` (or `MANAGED_IDENTITY_CLIENT_ID`)

## 2) Service Auth Matrix

| Service | Preferred Auth | Required Env (Preferred) | Fallback Env | Production Fallback Override |
|---|---|---|---|---|
| Blob Storage | Managed Identity | `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_MI_CLIENT_ID` | `AZURE_STORAGE_CONNECTION_STRING` | `ALLOW_STORAGE_CONNECTION_STRING_IN_PROD=true` |
| Queue Storage | Managed Identity | `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_MI_CLIENT_ID` | `AZURE_STORAGE_CONNECTION_STRING` | `ALLOW_STORAGE_CONNECTION_STRING_IN_PROD=true` |
| Azure Maps | AAD Token | `AZURE_MAPS_CLIENT_ID` + `AZURE_MI_CLIENT_ID` | `AZURE_MAPS_SUBSCRIPTION_KEY` | `ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD=true` |
| ACS Identity | Managed Identity | `AZURE_COMMUNICATION_SERVICES_ENDPOINT` + `AZURE_MI_CLIENT_ID` | `AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING` | `ALLOW_ACS_CONNECTION_STRING_IN_PROD=true` |
| Azure OpenAI | AAD Token | `AZURE_OPENAI_ENDPOINT` + `AZURE_MI_CLIENT_ID` | `AZURE_OPENAI_API_KEY` | `ALLOW_AZURE_OPENAI_API_KEY_IN_PROD=true` |
| Redis Call Sessions | Redis endpoint auth | `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT` | in-memory fallback (non-prod only) | `REQUIRE_REDIS_CALL_SESSIONS=false` |

## 3) Startup Preflight

Startup runs preflight checks from:

- `server/_core/security-preflight.ts`

Behavior:

- Logs `PASS`, `WARN`, `FAIL` summary at startup.
- In production, any `FAIL` causes process exit.

## 4) Emergency Override Policy

Only use emergency overrides for incident mitigation.

- Set one override at a time.
- Record incident ticket and owner.
- Remove override after root cause fix.

## 5) Deployment Verification

After deployment:

1. Check startup logs for preflight summary.
2. Verify no `FAIL` lines.
3. Verify no emergency override flags enabled unless intentional.
4. Validate call-session Redis behavior and WebPubSub/Maps/OpenAI requests.

## 6) Suggested Cutover Sequence

1. Configure managed identity permissions and env vars.
2. Deploy with overrides disabled.
3. Confirm clean preflight in logs.
4. Run smoke tests for auth, uploads, calls, messaging, AI features.
5. Keep overrides disabled permanently.
