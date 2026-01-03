# GreenChainz Azure Deployment - Outside Actions Report

> **Generated:** 2026-01-03
> **Purpose:** Comprehensive checklist of everything required OUTSIDE Cursor to complete Azure deployment

---

## A) Outside Actions Checklist

### 1. Azure Portal / CLI Actions

#### 1.1 Resource Verification (Confirm Existing)
| Resource | Expected Name | Resource Group | Action |
|----------|---------------|----------------|--------|
| Container Registry | `acrgreenchainzprod916` | `rg-greenchainz-prod-container` | ✅ Verify exists |
| Container Apps Environment | `cae-greenchainz-env` | `rg-greenchainz-prod-container` | ✅ Verify exists |
| Backend Container App | `greenchainz-container` | `rg-greenchainz-prod-container` | ✅ Verify exists |
| Frontend Container App | `greenchainz-frontend` | `rg-greenchainz-prod-container` | ⚠️ May not exist yet |
| Key Vault | `greenchianz-vault` | `greenchainz-production` | ✅ Verify exists |
| Redis Cache | `greenchainz` | `greenchainz-production` | ✅ Verify exists |
| Storage Account | `revitfiles` | `rg-greenchainz` | ✅ Verify exists |
| App Insights | `greenchainz-platform` | `rg-greenchainz` | ✅ Verify exists |
| Document Intelligence | `greenchainz-content-intel` | `greenchainz-ai` | ✅ Verify exists |
| Log Analytics | `workspace-rggreenchainzprodcontainer5PZ8` | `rg-greenchainz-prod-container` | ✅ Verify exists |

#### 1.2 Azure Database for PostgreSQL (⚠️ NOT FOUND IN REPO)
**Critical:** No Postgres resource is defined in the repo scripts. Owner must:
1. **Create or confirm existing Azure Database for PostgreSQL**
   - Recommended: Flexible Server, Standard_B1ms tier
   - Location: `eastus`
   - SSL: Required
2. **Record the following:**
   - Server hostname (e.g., `greenchainz-db.postgres.database.azure.com`)
   - Database name (e.g., `greenchainz_prod`)
   - Admin username (e.g., `greenchainz_admin`)
   - Admin password (store in Key Vault)
3. **Configure firewall rules:**
   - Allow Azure services
   - Allow Container Apps subnet (if using VNet integration)

#### 1.3 Key Vault Secrets to Create/Verify
Run these commands (or use Azure Portal):

```bash
# REQUIRED secrets
az keyvault secret set --vault-name greenchianz-vault --name postgres-password --value "<DB_PASSWORD>"
az keyvault secret set --vault-name greenchianz-vault --name jwt-secret --value "$(openssl rand -base64 32)"
az keyvault secret set --vault-name greenchianz-vault --name session-secret --value "$(openssl rand -base64 32)"

# Redis password (auto-fetch from Azure)
REDIS_KEY=$(az redis list-keys --name greenchainz --resource-group greenchainz-production --query "primaryKey" -o tsv)
az keyvault secret set --vault-name greenchianz-vault --name redis-password --value "$REDIS_KEY"

# REQUIRED by containerapp-backend.yaml (even if feature disabled)
# Application Insights connection string
az keyvault secret set --vault-name greenchianz-vault --name appinsights-connection-string --value "<CONNECTION_STRING>"

# Document Intelligence key
az keyvault secret set --vault-name greenchianz-vault --name document-intelligence-key --value "<DOC_INTEL_KEY>"
```

| Secret Name | Required | Source |
|-------------|----------|--------|
| `postgres-password` | ✅ Yes | Owner provides or auto-generate |
| `jwt-secret` | ✅ Yes | Auto-generate (min 32 chars) |
| `session-secret` | ✅ Yes | Auto-generate (min 32 chars) |
| `redis-password` | ✅ Yes | Fetch from Azure Redis |
| `appinsights-connection-string` | ✅ Yes* | Azure Portal → App Insights → Overview |
| `document-intelligence-key` | ✅ Yes* | Azure Portal → Doc Intelligence → Keys |

*Backend YAML references these as secretRef. They must exist even if empty (backend handles gracefully).

#### 1.4 Managed Identity Permissions
The backend Container App uses system-assigned managed identity. Grant:

```bash
# Get principal ID
PRINCIPAL_ID=$(az containerapp show \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --query "identity.principalId" -o tsv)

# 1. Key Vault: Secret read
az keyvault set-policy \
  --name greenchianz-vault \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list

# 2. ACR: Pull images
ACR_ID=$(az acr show --name acrgreenchainzprod916 --query "id" -o tsv)
az role assignment create \
  --assignee-object-id $PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPull" \
  --scope $ACR_ID

# 3. Storage: Blob access (for file uploads)
STORAGE_ID=$(az storage account show --name revitfiles --resource-group rg-greenchainz --query "id" -o tsv)
az role assignment create \
  --assignee-object-id $PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope $STORAGE_ID
```

#### 1.5 Storage Container Setup
```bash
az storage container create \
  --name greenchainz-uploads \
  --account-name revitfiles \
  --auth-mode login
```
**Note:** Repo code sets container to PRIVATE and generates SAS URLs. Do NOT set public access.

#### 1.6 Container Apps Configuration Update
After secrets are in Key Vault, update the backend Container App:

```bash
# Update with yaml (after filling in subscription-id in the yaml)
az containerapp update \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --yaml azure/containerapp-backend.yaml
```

**CRITICAL:** Edit `azure/containerapp-backend.yaml` first:
- Line 5: Replace `{subscription-id}` with actual subscription ID
- Line 79: Replace `your-postgres-host.postgres.database.azure.com` with actual host

---

### 2. GitHub Repository Settings

#### 2.1 Required Secrets (Settings → Secrets → Actions)
| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `AZURE_CREDENTIALS` | Service principal JSON | `az ad sp create-for-rbac --sdk-auth` |
| `AZURE_CLIENT_ID` | For OIDC auth (alternative) | Azure AD App Registration |
| `AZURE_TENANT_ID` | For OIDC auth | Azure Portal → Azure AD |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription | Azure Portal |
| `ACR_USERNAME` | Container Registry username | Azure Portal → ACR → Access keys |
| `ACR_PASSWORD` | Container Registry password | Azure Portal → ACR → Access keys |
| `NEXT_PUBLIC_AZURE_TENANT` | Azure AD tenant | `greenchainz2025.onmicrosoft.com` |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Frontend app client ID | Azure AD App Registration |

**Third workflow (`greenchainz-container-AutoDeployTrigger-*.yml`) uses different secret names:**
| Secret Name | Description |
|-------------|-------------|
| `GREENCHAINZCONTAINER_AZURE_CLIENT_ID` | Same as AZURE_CLIENT_ID |
| `GREENCHAINZCONTAINER_AZURE_TENANT_ID` | Same as AZURE_TENANT_ID |
| `GREENCHAINZCONTAINER_AZURE_SUBSCRIPTION_ID` | Same as AZURE_SUBSCRIPTION_ID |
| `GREENCHAINZCONTAINER_REGISTRY_USERNAME` | Same as ACR_USERNAME |
| `GREENCHAINZCONTAINER_REGISTRY_PASSWORD` | Same as ACR_PASSWORD |

#### 2.2 Environment Configuration
Create a `production` environment (Settings → Environments):
- Name: `production`
- Required reviewers: (optional, recommended)
- Wait timer: (optional)
- Add all secrets above to this environment

#### 2.3 Branch Protection (Recommended)
- Protect `main` branch
- Require pull request before merging
- Require status checks to pass

#### 2.4 Workflow Cleanup
**⚠️ There are 3 overlapping deploy workflows.** Recommend keeping only:
- `.github/workflows/azure-deploy.yml` (most complete)

Consider disabling/removing:
- `.github/workflows/deploy-azure-backend.yml` (duplicate)
- `.github/workflows/greenchainz-container-AutoDeployTrigger-*.yml` (auto-generated, duplicate secrets)

---

### 3. Azure AD / Entra ID Configuration

#### 3.1 App Registration for User Authentication
**Portal:** Azure AD → App registrations → New registration

| Setting | Value |
|---------|-------|
| Name | `GreenChainz` |
| Supported account types | Accounts in any organizational directory |
| Redirect URIs (Web) | `https://<frontend-fqdn>/login/callback` |
| | `https://greenchainz-frontend.<region>.azurecontainerapps.io/login/callback` |

**After creation, record:**
- Application (client) ID → `AZURE_CLIENT_ID` / `NEXT_PUBLIC_AZURE_CLIENT_ID`
- Directory (tenant) ID → `AZURE_TENANT_ID`

**Create client secret:**
- Certificates & secrets → New client secret
- Record value → `AZURE_CLIENT_SECRET`

**API Permissions:**
- Microsoft Graph → `openid`, `profile`, `email` (delegated)

#### 3.2 Required Environment Variables for Auth
| Variable | Backend | Frontend | Source |
|----------|---------|----------|--------|
| `AZURE_TENANT_ID` | ✅ | | Azure AD |
| `AZURE_CLIENT_ID` | ✅ | | Azure AD App Registration |
| `AZURE_CLIENT_SECRET` | ✅ | | Azure AD App Registration |
| `NEXT_PUBLIC_AZURE_TENANT` | | ✅ | `greenchainz2025.onmicrosoft.com` |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | | ✅ | Azure AD App Registration |

---

### 4. DNS / Domain Configuration

#### 4.1 Custom Domains (Optional but Recommended)
| Domain | Points To | Purpose |
|--------|-----------|---------|
| `api.greenchainz.com` | Backend Container App FQDN | Backend API |
| `app.greenchainz.com` | Frontend Container App FQDN | Frontend |
| `greenchainz.com` | Frontend or landing page | Main site |

**Azure Container Apps Custom Domain Setup:**
```bash
# Add custom domain
az containerapp hostname add \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --hostname api.greenchainz.com

# Bind managed certificate
az containerapp hostname bind \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --hostname api.greenchainz.com \
  --environment cae-greenchainz-env \
  --validation-method CNAME
```

#### 4.2 CORS Origins (Update in containerapp-backend.yaml)
Currently configured:
```yaml
allowedOrigins:
  - "https://greenchainz-frontend.azurecontainerapps.io"
  - "https://greenchainz.com"
  - "https://www.greenchainz.com"
```
**Update to match actual domains after deployment.**

#### 4.3 Cookie Domain
Set `COOKIE_DOMAIN` environment variable if using custom domain:
- For `*.greenchainz.com` → `.greenchainz.com`
- For Container Apps default FQDN → leave unset

---

### 5. Third-Party Services Configuration

#### 5.1 Email / SMTP (Required for Notifications)
**Current repo uses SMTP via nodemailer.** Options:

| Provider | Env Vars Required | Notes |
|----------|-------------------|-------|
| Zoho Mail | `SMTP_HOST=smtp.zoho.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` | Referenced in .env.example |
| Gmail | `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS` | Requires App Password |
| Azure Communication Services | `AZURE_COMMUNICATION_CONNECTION_STRING` | Referenced in .env.azure.example |
| SendGrid | Custom config needed | Not currently in code |

**Decision needed:** Which email provider is final?

#### 5.2 Intercom (Optional - Found in Code)
The repo has Intercom integration code. If using:
- Set `INTERCOM_ACCESS_TOKEN` in environment
- Configure Intercom dashboard webhooks

#### 5.3 OAuth Providers (Optional - Code Supports All)
| Provider | Required Env Vars | Callback URL |
|----------|-------------------|--------------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `https://<backend>/auth/google/callback` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `https://<backend>/auth/github/callback` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | `https://<backend>/auth/linkedin/callback` |
| Microsoft | Uses Azure AD config | `https://<backend>/auth/microsoft/callback` |

**Decision needed:** Which OAuth providers to enable?

#### 5.4 Stripe (Optional - Code Placeholder Only)
Found in `.env.example`:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Not implemented in backend yet.

---

## B) Inputs Needed from Owner

### Critical (Blocking Deployment)

| Item | Description | Where to Find |
|------|-------------|---------------|
| **Azure Subscription ID** | The subscription for all resources | Azure Portal → Subscriptions |
| **Postgres Host** | Azure Database for PostgreSQL hostname | Azure Portal → Postgres → Overview → Server name |
| **Postgres Credentials** | Database name, username, password | Owner-defined during Postgres creation |
| **ACR Credentials** | Registry username and password | Azure Portal → ACR → Access keys (enable admin) |
| **Azure AD Client ID** | For user authentication | Azure AD → App registrations |
| **Azure AD Client Secret** | For backend token exchange | Azure AD → App registrations → Certificates & secrets |

### Configuration Decisions

| Question | Options | Default in Repo |
|----------|---------|-----------------|
| **Redis for sessions?** | Yes (required in prod) / No | Yes (required) |
| **Document Intelligence enabled?** | Yes / No | Feature flag: `FEATURE_AI_DOCUMENT_ANALYSIS=false` |
| **App Insights monitoring?** | Yes / No | Feature flag: `FEATURE_AZURE_MONITORING=false` |
| **Email provider?** | SMTP / Azure Communication Services | SMTP (Zoho) |
| **OAuth providers to enable?** | Google, GitHub, LinkedIn, Microsoft/Azure AD | Azure AD only appears implemented |
| **Storage access model?** | Private + SAS URLs / Public | Private + SAS |
| **Custom domain?** | Yes (provide domain) / No | No (Container Apps FQDN) |

### Verify Resource Names
Please confirm these match your Azure subscription:

| Resource | Expected Name | Confirm? |
|----------|---------------|----------|
| Subscription name | `greenchainz-core-start` | ☐ |
| ACR name | `acrgreenchainzprod916` | ☐ |
| Key Vault | `greenchianz-vault` (note: typo in name) | ☐ |
| Redis | `greenchainz` | ☐ |
| Storage | `revitfiles` | ☐ |
| Container Apps Env | `cae-greenchainz-env` | ☐ |

---

## C) Repo-Derived Configuration Map

| Setting | Source File(s) | Used By | Azure Place to Set |
|---------|----------------|---------|-------------------|
| `NODE_ENV` | hardcoded `production` | Backend | Container App env var |
| `PORT` | `3001` backend, `3000` frontend | Both | Container App env var |
| `FRONTEND_URL` | `containerapp-backend.yaml:75` | Backend CORS | Container App env var |
| `POSTGRES_HOST` | `containerapp-backend.yaml:79` | Backend DB | Container App env var |
| `POSTGRES_PORT` | `containerapp-backend.yaml:81` | Backend DB | Container App env var |
| `DB_USER` | `containerapp-backend.yaml:83` | Backend DB | Container App env var |
| `DB_PASSWORD` | `containerapp-backend.yaml:85` | Backend DB | **Key Vault** `postgres-password` |
| `DB_NAME` | `containerapp-backend.yaml:87` | Backend DB | Container App env var |
| `JWT_SECRET` | `containerapp-backend.yaml:99` | Backend Auth | **Key Vault** `jwt-secret` |
| `SESSION_SECRET` | `containerapp-backend.yaml:101` | Backend Sessions | **Key Vault** `session-secret` |
| `REDIS_HOST` | `containerapp-backend.yaml:105` | Backend Cache | Container App env var |
| `REDIS_PORT` | `containerapp-backend.yaml:107` | Backend Cache | Container App env var |
| `REDIS_PASSWORD` | `containerapp-backend.yaml:109` | Backend Cache | **Key Vault** `redis-password` |
| `AZURE_KEY_VAULT_URL` | `containerapp-backend.yaml:127` | Backend Secrets | Container App env var |
| `AZURE_STORAGE_ACCOUNT_NAME` | `containerapp-backend.yaml:129` | Backend Storage | Container App env var |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `containerapp-backend.yaml:137` | Backend Monitoring | **Key Vault** `appinsights-connection-string` |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | `containerapp-backend.yaml:145` | Backend AI | **Key Vault** `document-intelligence-key` |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | `containerapp-backend.yaml:143` | Backend AI | Container App env var |
| `NEXT_PUBLIC_BACKEND_URL` | Dockerfile build arg | Frontend | **GitHub Secret** (build-time) |
| `NEXT_PUBLIC_AZURE_TENANT` | Dockerfile build arg | Frontend | **GitHub Secret** (build-time) |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Dockerfile build arg | Frontend | **GitHub Secret** (build-time) |
| `AZURE_TENANT_ID` | `backend/routes/auth.js:13` | Backend Auth | Container App env var |
| `AZURE_CLIENT_ID` | `backend/routes/auth.js:14` | Backend Auth | Container App env var |
| `AZURE_CLIENT_SECRET` | `backend/routes/auth.js:15` | Backend Auth | **Key Vault** (recommended) |
| `SMTP_HOST` | `backend/services/emailService.js` | Backend Email | Container App env var |
| `SMTP_PORT` | `backend/services/emailService.js` | Backend Email | Container App env var |
| `SMTP_USER` | `backend/services/emailService.js` | Backend Email | Container App env var |
| `SMTP_PASS` | `backend/services/emailService.js` | Backend Email | **Key Vault** (recommended) |
| `ACR_USERNAME` | `.github/workflows/*.yml` | CI/CD | **GitHub Secret** |
| `ACR_PASSWORD` | `.github/workflows/*.yml` | CI/CD | **GitHub Secret** |
| `AZURE_CREDENTIALS` | `.github/workflows/*.yml` | CI/CD | **GitHub Secret** |

---

## D) Risk List (Top 10)

### 🔴 Critical (Will Block Deployment)

| # | Risk | Details | Resolution |
|---|------|---------|------------|
| 1 | **No Postgres resource defined** | No Azure Database for PostgreSQL in repo scripts. `containerapp-backend.yaml` has placeholder `your-postgres-host` | Owner must create/confirm Postgres and provide hostname |
| 2 | **Key Vault secrets missing** | `appinsights-connection-string` and `document-intelligence-key` are required by YAML but may not exist | Create secrets even if empty (backend handles gracefully) |
| 3 | **Subscription ID placeholder** | `containerapp-backend.yaml:5` has `{subscription-id}` | Must replace before `az containerapp update --yaml` |
| 4 | **COOKIE_SECRET not in Key Vault** | `validateEnv.js` requires `COOKIE_SECRET` in prod but it's not in containerapp-backend.yaml | Add to Key Vault and YAML |
| 5 | **Readiness probe path `/ready`** | `containerapp-backend.yaml:179` probes `/ready` but backend only has `/health` | Either add `/ready` endpoint or change probe to `/health` |

### 🟠 High (Will Cause Issues)

| # | Risk | Details | Resolution |
|---|------|---------|------------|
| 6 | **3 duplicate deploy workflows** | `azure-deploy.yml`, `deploy-azure-backend.yml`, and auto-generated workflow | Keep one, disable others |
| 7 | **Supabase code still present** | `backend/services/supabase/*`, `AZURE_AUTH_SETUP.md` references Supabase | Remove or ignore; Azure AD auth is implemented |
| 8 | **Azure AD not fully wired** | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` not in Container App YAML | Add to YAML or rely on defaults |
| 9 | **OAuth callback URLs hardcoded** | `.env.azure.example` has `greenchainz-container.eastus.azurecontainerapps.io` | Update after deployment |

### 🟡 Medium (May Cause Issues)

| # | Risk | Details | Resolution |
|---|------|---------|------------|
| 10 | **`setup-secrets.sh` has syntax errors** | Script has multiple duplicate/conflicting code blocks for App Insights and Doc Intelligence | Review and clean up before running |

> ✅ **Verified:** `next.config.js` has `output: 'standalone'` configured correctly.

---

## E) What Cursor Cannot Do

The following actions **require human intervention** with appropriate portal access or credentials:

### Azure Portal Access Required
- ✗ Create/modify Azure resources (Postgres, Redis, Key Vault, etc.)
- ✗ Grant RBAC role assignments
- ✗ Set Key Vault secrets (requires vault access)
- ✗ Configure Azure AD app registrations
- ✗ Generate service principal credentials
- ✗ Enable ACR admin access
- ✗ Configure firewall rules
- ✗ Set up VNet integration
- ✗ Configure custom domains and SSL

### GitHub Settings Access Required
- ✗ Create repository secrets
- ✗ Configure environment protection rules
- ✗ Set up branch protection

### DNS Provider Access Required
- ✗ Create CNAME/A records for custom domains
- ✗ Verify domain ownership

### Third-Party Dashboard Access Required
- ✗ Create OAuth app credentials (Google, GitHub, LinkedIn)
- ✗ Configure Intercom webhooks
- ✗ Set up SMTP credentials
- ✗ Configure Stripe webhooks

### Billing/Subscription Owner Required
- ✗ Approve credit/cost increases
- ✗ Move resources between subscriptions
- ✗ Accept marketplace terms

---

## Quick Reference: First 5 Actions

1. **Verify Postgres exists** or create one → get hostname
2. **Create Key Vault secrets** (6 secrets minimum)
3. **Grant managed identity permissions** (Key Vault, ACR, Storage)
4. **Set GitHub secrets** (8 secrets for main workflow)
5. **Update `containerapp-backend.yaml`** (subscription ID, Postgres host)

---

## Files to Review Before Deployment

```
azure/containerapp-backend.yaml    # ⚠️ Update subscription-id, postgres-host
azure/containerapp-frontend.yaml   # ⚠️ Update subscription-id, backend URL
.github/workflows/azure-deploy.yml # ✅ Main workflow
backend/config/validateEnv.js      # Lists required env vars
.env.azure.example                 # Reference for all config
```
