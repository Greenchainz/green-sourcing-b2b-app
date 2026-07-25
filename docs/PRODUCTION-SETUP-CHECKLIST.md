# Production Setup Checklist

**Version**: 1.0.0
**Date**: 2026-01-03

This document outlines the **MANUAL** steps required to deploy GreenChainz to production. Follow this order strictly to avoid dependency errors.

---

## 1. pre-Deployment: Environment & Secrets

### A. Azure Key Vault

Create a Key Vault and add the following secrets (do not put these in `Container App` env vars directly if possible, or use secret references):

| Secret Name              | Description                         | Source                    |
| :----------------------- | :---------------------------------- | :------------------------ |
| `JWT_SECRET`             | 32+ char random string for Auth     | `openssl rand -base64 48` |
| `SESSION_SECRET`         | 32+ char random string for Sessions | `openssl rand -base64 48` |
| `COOKIE_SECRET`          | 32+ char random string for Cookies  | `openssl rand -base64 48` |
| `AZURE_CLIENT_SECRET`    | Azure AD App Client Secret          | Azure Portal (App Reg)    |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn App Client Secret          | LinkedIn Developers       |
| `SMTP_PASS`              | Email Provider Password             | Zoho/SendGrid             |

### B. Environment Variables (Container Configuration)

Ensure the following are set in your `Container App` configuration:

- `NODE_ENV`: `production`
- `FRONTEND_URL`: `https://your-domain.com`
- `BACKEND_URL`: `https://api.your-domain.com`
- `DATABASE_URL`: Full PostgreSQL connection string (SSL required)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (if using Redis)
- `AZURE_STORAGE_CONNECTION_STRING`

Optional (About page video):

- `ABOUT_VIDEO_BLOB_KEY`: Blob key in the `founder-videos` Azure Storage container (e.g. `about/about-video-faststart.mp4`). Server-side only — the tRPC `founderVideo.aboutVideo` endpoint generates a short-lived SAS URL at runtime.

---

## 2. Infrastructure Resources

### A. Azure Resources

1. **Azure Container Apps**: Enable Dapr (optional but recommended for microservices later) and Ingress (HTTPS).
2. **Azure PostgreSQL**: Version 14+. SSL enforced.
3. **Azure Redis Cache**: Basic tier is sufficient for sessions.
4. **Storage Account**: Container name `greenchainz-uploads` must exist. Set CORS to allow `FRONTEND_URL`.
5. **Azure AI Foundry / OpenAI**:
   - **Deployment Name**: `gpt-4o` (Must match `AZURE_OPENAI_DEPLOYMENT_NAME`)
   - **Model**: GPT-4o
   - **API Version**: `2024-10-21`

### B. Microsoft AppSource

Billing is handled via Microsoft AppSource ISV certification. Refer to
`MICROSOFT_MARKETPLACE_SETUP.md` for subscription webhook setup.

Required environment variables:

- `MICROSOFT_WEBHOOK_SECRET`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_TENANT_ID`

### C. LinkedIn Developers

1. Create App.
2. Verify Domain.
3. **Products**: Add "Sign In with LinkedIn" and "Share on LinkedIn".
4. **OAuth 2.0 Settings**:
   - Redirect URL: `https://api.your-domain.com/auth/linkedin/callback` (Verify route path in code)

---

## 3. Database Migration & Seeding

**Order matches dependencies:**

1. **Schema Initialization**
   Run the SQL against your production DB:

   ```bash
   psql $DATABASE_URL -f database-schemas/schema.sql
   ```

2. **Seed Static Data (Reference Tables)**

   ```bash
   psql $DATABASE_URL -f database-schemas/seed-plans.sql
   psql $DATABASE_URL -f database-schemas/seed-supplier-tiers.sql
   ```

3. **Seed Initial Application Data**
   Run the Node script to populate initial providers/configs:

   ```bash
   # From backend directory
   node scripts/seed.js
   node scripts/seed-rfq-simulator.js (Optional)
   ```

4. **Verify Indexes**
   Ensure indexes exist for performance:
   - `idx_products_material_type`
   - `idx_products_certifications` (GIN)
   - `idx_products_gwp`

---

## 4. Post-Deployment Verification

- [ ] **Health Check**: Call `GET /health` (or `/`) -> Expect 200 OK.
- [ ] **Auth**: Log in via Azure AD. Check `Users` table for new record.
- [ ] **Subscriptions**:
  - Go to Supplier Settings.
  - Click "Upgrade".
  - Verify Microsoft AppSource subscription upgrade flow completes successfully.
- [ ] **AI Gateway**:
  - Attempt to generate an RFQ or use Chat.
  - verify `AI_User_Quotas` record is created.

---

## 5. Rollback Plan

If deployment fails:

1. **Database**: No automatic rollback. Manually `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` if generic reset needed, or restore backup.
2. **Infrastructure**: Revert Container App Revision to previous active revision.
3. **Secrets**: Rotate keys if exposure suspected.
