# GreenChainz Environment Variable Setup

## Quick Start Checklist

Three variables most commonly missing in local dev:

| Variable | Where to get it | Required for |
|---|---|---|
| `FRED_API_KEY` | [fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html) — free, instant | FRED PPI scraper (PCU32411324 etc.) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | Buyer drip emails, outreach notifications |
| `OAUTH_SERVER_URL` | Must be set in `.env` (not `.env.local`) | Dev auth shim — Easy Auth sidecar |

## Setup Steps

### 1. Copy the example file

```bash
cp .env.local.example .env
```

### 2. Get a FRED API key

1. Go to https://fred.stlouisfed.org/docs/api/api_key.html
2. Click **Request API Key** and register
3. Copy the 32-character key into `.env`:

```env
FRED_API_KEY=abcdef1234567890abcdef1234567890
```

### 3. Get a Resend API key

1. Sign up at https://resend.com (free tier is enough for dev)
2. Go to **API Keys** → **Create API Key**
3. Copy it into `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

> **Note:** Use `onboarding@resend.dev` as the from address until you verify `greenchainz.com` as a sending domain in the Resend dashboard. After verification, switch to `noreply@greenchainz.com`.

### 4. OAUTH_SERVER_URL placement rule

⚠️ This must be in `.env`, **not** `.env.local`. The dev auth shim (`registerDevAuthShim()`) reads from `.env` only — `.env.local` values are not visible to the Express shim at startup.

```env
# .env  ← correct
OAUTH_SERVER_URL=https://login.microsoftonline.com/1d04bf50-8175-40af-a9d5-f8e441460b06/v2.0
```

## Production (Azure)

All secrets go into **Azure Key Vault**, not Container App environment variables directly. See `.env.azure.example` for the full reference.

Key Vault secret names to add for these three new values:

```bash
# FRED
az keyvault secret set --vault-name greenchainz-vault-2026 --name fred-api-key --value "<your_fred_key>"

# Resend
az keyvault secret set --vault-name greenchainz-vault-2026 --name resend-api-key --value "<your_resend_key>"
```

Then reference in Container App environment variables:

```yaml
env:
  - name: FRED_API_KEY
    secretRef: fred-api-key
  - name: RESEND_API_KEY
    secretRef: resend-api-key
```

## psql Not Found (Windows / Git Bash)

If `psql: command not found`:

```bash
# Option A — add PostgreSQL bin to PATH permanently
echo 'export PATH="/c/Program Files/PostgreSQL/16/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
psql -U postgres

# Option B — connect via Docker (if DB runs in a container)
docker exec -it $(docker ps --filter name=postgres -q) psql -U postgres -d greenchainz_dev
```
