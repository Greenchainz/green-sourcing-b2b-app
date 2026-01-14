# GreenChainz Scraper Function App - Deployment Status Report

**Date:** 2026-01-08  
**Function App:** greenchainz-scraper  
**Resource Group:** greenchainzscraper  
**Region:** East US

---

## ✅ VERIFICATION CHECKLIST

### 1. FUNCTION FILES IN REPOSITORY ✅

**Status:** All required files exist

- ✅ `backend/functions/host.json` - Present
- ✅ `backend/functions/package.json` - Present
- ✅ `backend/functions/scrape-suppliers/function.json` - Present
- ✅ `backend/functions/scrape-suppliers/index.js` - Present

**Files Structure:**
```
backend/functions/
├── host.json
├── package.json
├── scrape-suppliers/
│   ├── function.json
│   └── index.js
└── scrape-epd/
    ├── function.json
    └── index.js
```

**⚠️ ISSUE FOUND:**
- `function.json` references `"scriptFile": "../dist/scrape-suppliers/index.js"` but the actual file is at `scrape-suppliers/index.js`
- For Azure Functions v4 (programming model), this might be correct if there's a build step, but typically v4 doesn't require a dist folder

---

### 2. AZURE PORTAL CONFIGURATION ⚠️ (VERIFY MANUALLY)

**Required App Settings:**
- ⚠️ `DATABASE_URL` - Should reference Key Vault: `@Microsoft.KeyVault(SecretUri=https://GreenChainz-vault-2026.vault.azure.net/secrets/Database-URL/)`
- ⚠️ `AZURE_STORAGE_CONNECTION_STRING` - Should reference Key Vault (if needed)
- ⚠️ `SCRAPER_RATE_LIMIT_MS` - Optional: Default 2000ms (hardcoded in code)
- ⚠️ `SCRAPER_MAX_BATCH` - Optional: Default 10 (hardcoded in code)

**Action Required:** 
- Go to Azure Portal → greenchainz-scraper → Configuration → Application settings
- Verify `DATABASE_URL` exists and references Key Vault
- Add optional settings if you want to override defaults

---

### 3. MANAGED IDENTITY ⚠️ (VERIFY MANUALLY)

**Action Required:**
- Go to Azure Portal → greenchainz-scraper → Identity → System assigned
- Verify Status = **On**
- Copy the **Object (principal) ID** for Key Vault access configuration

---

### 4. KEY VAULT ACCESS ⚠️ (VERIFY MANUALLY)

**Action Required:**
- Go to Azure Portal → Key Vault: `GreenChainz-vault-2026` → Access policies
- Find the managed identity for `greenchainz-scraper`
- Verify it has **Get** and **List** permissions for secrets

**OR (RBAC - Recommended):**
- Go to Key Vault → Access control (IAM)
- Verify `greenchainz-scraper` has role: **Key Vault Secrets User**

**Required Secret:**
- `Database-URL` - PostgreSQL connection string

---

### 5. DEPLOYMENT CENTER ⚠️ (VERIFY MANUALLY)

**Action Required:**
- Go to Azure Portal → greenchainz-scraper → Deployment Center
- Verify GitHub is connected
- Check Repository: `jnorvi5/green-sourcing-b2b-app`
- Check Branch: `main`
- Check Workflow status: Success/Pending/Failed

**NOTE:** Current workflow (`deploy-azure-cd.yml`) only deploys Container Apps, NOT Azure Functions. 
**A separate workflow or Deployment Center setup is needed for the Function App.**

---

### 6. CODE ISSUES IDENTIFIED ⚠️

**Issue 1: Table/Column Name Mismatch**
- **Location:** `backend/functions/scrape-suppliers/index.js` (lines 87, 108, 115)
- **Problem:** Code uses lowercase `users` table and `id` column
- **Schema:** Uses uppercase `Users` table and `UserID` primary key
- **PostgreSQL:** Unquoted identifiers are case-insensitive, but column names need to match
- **Status:** May work if PostgreSQL folds to lowercase, but `id` vs `UserID` is a real issue
- **Impact:** Scraper will fail to query/update records

**Issue 2: Missing Column**
- **Location:** `backend/functions/scrape-suppliers/index.js` (line 87)
- **Problem:** Query selects `name` column, but `Users` table has `FirstName` and `LastName`
- **Impact:** Query will fail or return null

**Issue 3: function.json scriptFile Path**
- **Location:** `backend/functions/scrape-suppliers/function.json` (line 16)
- **Problem:** References `../dist/scrape-suppliers/index.js` but no build step exists
- **Impact:** Function may not load correctly (depends on Azure Functions v4 behavior)

---

## 📋 NEXT STEPS

### PRIORITY 1: Fix Code Issues

1. **Fix table/column references:**
   - Change `users` → `Users`
   - Change `id` → `UserID`
   - Change `name` → `FirstName` (or concatenate `FirstName || ' ' || LastName`)

2. **Fix function.json:**
   - Change `"scriptFile": "../dist/scrape-suppliers/index.js"` → `"scriptFile": "index.js"` (or remove if v4 doesn't need it)

### PRIORITY 2: Verify Azure Configuration

1. Check Azure Portal for app settings
2. Verify Managed Identity is enabled
3. Verify Key Vault access
4. Check Deployment Center status

### PRIORITY 3: Database Migration

1. Run migration: `psql $DATABASE_URL < backend/migrations/003_add_scraper_columns.sql`
2. Verify columns were created successfully

### PRIORITY 4: Deployment Setup

1. Either configure Deployment Center in Azure Portal for GitHub deployment
2. OR create a GitHub Actions workflow for Function App deployment
3. OR use Azure CLI/Functions Core Tools to deploy manually

---

## 🔍 VERIFICATION COMMANDS

**Check Function App exists:**
```bash
az functionapp show --name greenchainz-scraper --resource-group greenchainzscraper
```

**Check App Settings:**
```bash
az functionapp config appsettings list --name greenchainz-scraper --resource-group greenchainzscraper
```

**Check Managed Identity:**
```bash
az functionapp identity show --name greenchainz-scraper --resource-group greenchainzscraper
```

**Check Key Vault Access:**
```bash
az keyvault show --name GreenChainz-vault-2026
az keyvault secret show --vault-name GreenChainz-vault-2026 --name Database-URL
```

---

## 📊 SUMMARY

| Component | Status | Action Required |
|-----------|--------|----------------|
| Function Files | ✅ Present | Fix code issues |
| Database Migration | ⚠️ Not Run | Run migration SQL |
| Azure App Settings | ⚠️ Unknown | Verify in Portal |
| Managed Identity | ⚠️ Unknown | Verify in Portal |
| Key Vault Access | ⚠️ Unknown | Verify in Portal |
| Deployment Center | ⚠️ Unknown | Check GitHub connection |
| Code Issues | ❌ 3 Issues | Fix before deployment |

**Recommendation:** Fix code issues FIRST, then verify Azure configuration, then deploy.
