# GreenChainz Platform — Admin Operations Runbook

**Version:** 1.0 | **Last Updated:** March 2026 | **Owner:** Jerit Norville, Founder & CEO

---

## 1. Quick Reference

| System | URL / Endpoint | Access |
|---|---|---|
| **Production app** | `https://greenchainz.com` | Public |
| **Azure Portal** | `https://portal.azure.com` | Azure AD login |
| **Container App** | `rg-greenchainz-prod-container` / `greenchainz-frontend` | Azure CLI / Portal |
| **ACR** | `acrgreenchainzprod916.azurecr.io` | Azure CLI |
| **Key Vault** | `greenchainz-vault` | Managed Identity |
| **PostgreSQL** | `greenchainz-db-prod.postgres.database.azure.com` | VNet only |
| **GitHub** | `github.com/Greenchainz/green-sourcing-b2b-app` | GitHub login |
| **Admin tRPC** | `https://greenchainz.com/api/trpc/admin.*` | Auth-gated (admin role) |

---

## 2. Daily Health Checks (5 minutes)

Run these every morning before your first meeting.

### 2.1 App Liveness

```bash
# App responding
curl -s -o /dev/null -w "%{http_code}" https://greenchainz.com/

# Auth working
curl -s -o /dev/null -w "%{http_code}" https://greenchainz.com/.auth/login/aad

# API responding
curl -s --max-time 8 "https://greenchainz.com/api/trpc/system.health" | head -50
```

Expected: all three return `200` or `302`.

### 2.2 Container Revision

```bash
az containerapp revision list \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --query "[?properties.active==\`true\`].{rev:name, created:properties.createdTime}" \
  --output table
```

**What to check:** Only one active revision. If you see two active revisions, traffic is split — run `az containerapp ingress traffic set` to consolidate.

### 2.3 Container Logs (last 50 lines)

```bash
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --tail 50 \
  --output table
```

**Red flags to watch for:**
- `Key Vault secret fetch failed` — a secret expired or RBAC changed
- `Database connection refused` — PostgreSQL firewall rule expired or VNet issue
- `ECONNREFUSED` or `ETIMEDOUT` — downstream API (EC3, Autodesk, WebPubSub) is down
- `JWT malformed` or `invalid signature` — `NEXTAUTH-SECRET` rotation needed

---

## 3. Database Monitoring

### 3.1 Table Row Counts (Run Weekly)

Connect via the app's admin tRPC endpoint or Azure Data Studio (add your IP to the PostgreSQL firewall first):

```bash
# Add your IP to the firewall temporarily
MY_IP=$(curl -s https://api.ipify.org)
az postgres flexible-server firewall-rule create \
  --resource-group rg-greenchainz-prod-container \
  --name greenchainz-db-prod \
  --rule-name admin-access \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

**Key tables and healthy thresholds:**

| Table | What It Stores | Healthy Range | Alert If |
|---|---|---|---|
| `materials` | EPD-verified materials from EC3 | 200–500 | < 100 (EC3 sync broken) |
| `manufacturers` | Linked manufacturer records | 50–200 | < 20 |
| `scraped_suppliers` | Azure Maps POI supplier data | 5,000–15,000 | < 1,000 (scraper failed) |
| `pricing_data` | TxDOT bid tabulation records | 100–500 | < 50 (TxDOT scraper broken) |
| `users` | Registered users | Growing | Sudden drop = auth issue |
| `rfqs` | Submitted RFQs | Growing | Stagnant = UX problem |
| `rfq_bids` | Supplier bid responses | Growing | 0 bids = supplier onboarding issue |
| `material_swaps` | Saved swap recommendations | Growing | 0 = swap engine not running |
| `swap_validations` | Technical validation results | Growing | 0 = validation not triggered |
| `ccps_baselines` | Category baselines for scoring | 10–30 | < 5 (scoring broken) |
| `ccps_scores` | Cached CCPS scores | = materials count | Stale = cache not refreshing |
| `agent_conversations` | ChainBot conversation history | Growing | Sudden spike = abuse |
| `notifications` | Unread notification queue | < 1,000 | > 5,000 = delivery backlog |
| `email_suppression_list` | Bounced/unsubscribed emails | Growing slowly | Sudden spike = deliverability issue |

### 3.2 Data Quality Checks

Run these SQL queries monthly to catch bad data before it reaches users:

```sql
-- Materials with no EPD (should be 0 — all materials require EPD)
SELECT COUNT(*) FROM materials WHERE has_epd = false;

-- Materials with GWP = 0 (suspicious — likely missing data)
SELECT COUNT(*) FROM materials WHERE gwp_value = 0 OR gwp_value IS NULL;

-- Materials with no category (breaks CCPS scoring)
SELECT COUNT(*) FROM materials WHERE category IS NULL OR category = '';

-- Swap recommendations with confidence < 0.3 (low-quality swaps)
SELECT COUNT(*) FROM material_swaps WHERE confidence::numeric < 0.3;

-- RFQs stuck in 'submitted' > 7 days (no supplier response)
SELECT id, title, created_at FROM rfqs 
WHERE status = 'submitted' 
AND created_at < NOW() - INTERVAL '7 days';

-- Users with no role assigned (broken onboarding)
SELECT COUNT(*) FROM users WHERE role IS NULL;

-- Swap validations expiring in next 30 days
SELECT COUNT(*) FROM swap_validations 
WHERE expires_at < NOW() + INTERVAL '30 days' 
AND validation_status = 'APPROVED';
```

### 3.3 PostgreSQL Performance

```bash
# Check slow queries (requires pg_stat_statements extension)
# Run in Azure Data Studio or psql:
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan ASC 
LIMIT 10;
```

**Alert if:** Any query averaging > 500ms. Add an index or optimize the query.

---

## 4. Key Vault Secret Rotation

Secrets do not auto-expire but should be rotated every 90 days. Rotation procedure:

```bash
# 1. Update the secret value
az keyvault secret set \
  --vault-name greenchainz-vault \
  --name "NEXTAUTH-SECRET" \
  --value "$(openssl rand -base64 64)"

# 2. Force a new container revision to pick up the new value
az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --set-env-vars DEPLOY_TIMESTAMP=$(date +%s)
```

**Secrets requiring rotation (90-day schedule):**

| Secret | Rotation Method | Impact if Expired |
|---|---|---|
| `NEXTAUTH-SECRET` | `openssl rand -base64 64` | All sessions invalidated |
| `jwt-secret` | `openssl rand -base64 64` | API auth broken |
| `AZURE-AD-CLIENT-SECRET` | Azure AD App Registration portal | Microsoft login broken |
| `microsoft-client-secret-easyauth` | Azure AD App Registration portal | Easy Auth broken |
| `GOOGLE-SECRET` | Google Cloud Console | Google login broken |
| `LINKEDIN-SECRET` | LinkedIn Developer portal | LinkedIn login broken |

---

## 5. CI/CD Pipeline

### 5.1 Normal Deploy Flow

Every push to `main` on `github.com/Greenchainz/green-sourcing-b2b-app` triggers:

1. GitHub Actions builds Docker image via `az acr build`
2. Image tagged with full commit SHA, pushed to `acrgreenchainzprod916.azurecr.io`
3. `az containerapp update` deploys new revision
4. Old revision deactivated automatically

**Typical build time:** 3–5 minutes.

### 5.2 Manual Force Deploy

If CI/CD fails or you need to roll back:

```bash
# Roll back to a specific commit SHA
COMMIT_SHA="548ddd9"  # replace with target SHA

az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --image "acrgreenchainzprod916.azurecr.io/greenchainz-frontend:${COMMIT_SHA}"
```

### 5.3 Check Available Images

```bash
az acr repository show-tags \
  --name acrgreenchainzprod916 \
  --repository greenchainz-frontend \
  --orderby time_desc \
  --top 10 \
  --output table
```

---

## 6. Scraper Operations

Two scrapers populate the database. Both are triggered via admin endpoints.

### 6.1 Supplier Discovery Scraper (Azure Maps POI)

**Trigger:**
```bash
curl -s -X POST "https://greenchainz.com/api/admin/scrape/suppliers"
```

**What it does:** Queries Azure Maps for sustainable building material suppliers across 15 material categories × 8 US states. Populates `scraped_suppliers` table.

**Run frequency:** Monthly (or when `scraped_suppliers` count drops below 5,000).

**Healthy output:** 7,000–15,000 records. Check logs for `Scrape complete`.

### 6.2 TxDOT Pricing Scraper

**Trigger:**
```bash
curl -s -X POST "https://greenchainz.com/api/admin/scrape/txdot"
```

**What it does:** Scrapes Texas DOT bid tabulation pages (36 pages) for material pricing data. Populates `pricing_data` table.

**Run frequency:** Monthly (TxDOT updates quarterly).

**Healthy output:** 150–200 records per run. Check logs for `Extracted N records`.

### 6.3 EC3 Material Sync

Triggered via tRPC:
```bash
curl -s "https://greenchainz.com/api/trpc/ec3.syncMaterials"
```

**Run frequency:** Weekly. Keeps `materials` table current with Building Transparency EPD data.

---

## 7. Subscription & Billing Operations

### 7.1 Check Active Subscriptions

Via tRPC admin endpoint (requires admin auth cookie):
```
GET /api/trpc/admin.getSubscriptionStats
```

### 7.2 Manually Upgrade a User

```bash
# Via tRPC mutation (requires admin session)
curl -s -X POST "https://greenchainz.com/api/trpc/subscription.adminUpgrade" \
  -H "Content-Type: application/json" \
  -d '{"json": {"userId": "USER_ID", "tier": "premium"}}'
```

### 7.3 Microsoft Marketplace Webhook

All subscription lifecycle events (purchase, suspend, reinstate, cancel) hit:
```
POST https://greenchainz.com/api/marketplace/webhook
```

**Monitor this endpoint in Azure Monitor.** If webhook delivery fails, Microsoft retries for 24 hours then marks the subscription as failed.

---

## 8. User Management

### 8.1 Admin Role Assignment

Admin role is auto-assigned to any user with a `@greenchainz.com` email. To manually promote a user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

### 8.2 Supplier Verification

New suppliers register via `/register?role=supplier`. They start as `pending`. To approve:

```sql
UPDATE suppliers SET verification_status = 'approved' WHERE user_id = 'USER_ID';
```

### 8.3 Suspend a User

```sql
UPDATE users SET role = 'user' WHERE email = 'bad-actor@example.com';
-- For suppliers:
UPDATE suppliers SET status = 'suspended' WHERE user_id = 'USER_ID';
```

---

## 9. Monitoring & Alerts

### 9.1 Azure Monitor Alerts (Set These Up)

| Alert | Condition | Action |
|---|---|---|
| Container restart | Restart count > 3 in 1 hour | Page on-call |
| HTTP 5xx rate | > 5% of requests | Page on-call |
| PostgreSQL CPU | > 80% for 5 min | Scale up |
| PostgreSQL storage | > 80% full | Expand disk |
| Key Vault access denied | Any | Immediate investigation |
| Container app inactive | No requests for 30 min (business hours) | Check health |

```bash
# Create a basic availability alert
az monitor metrics alert create \
  --name "greenchainz-5xx-alert" \
  --resource-group rg-greenchainz-prod-container \
  --scopes "/subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.App/containerApps/greenchainz-frontend" \
  --condition "avg Requests > 0 where StatusCodeClass includes 5xx" \
  --description "5xx error rate alert"
```

### 9.2 Log Analytics Queries

```kusto
// Container restarts in last 24h
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains "error" or Log_s contains "Error"
| project TimeGenerated, Log_s
| order by TimeGenerated desc

// Auth failures
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains "Not authenticated" or Log_s contains "JWT"
| summarize count() by bin(TimeGenerated, 1h)
```

---

## 10. Incident Response

### App is Down (HTTP 5xx or timeout)

1. Check container logs: `az containerapp logs show --name greenchainz-frontend --resource-group rg-greenchainz-prod-container --tail 100`
2. Check active revision: `az containerapp revision list ...`
3. If new revision is bad: roll back to previous SHA (see §5.2)
4. If Key Vault issue: check RBAC on managed identity
5. If DB issue: check PostgreSQL firewall and VNet peering

### Auth is Broken

1. Check Easy Auth config: `az containerapp auth show ...`
2. Check `NEXTAUTH-SECRET` in Key Vault is not expired
3. Check Azure AD App Registration redirect URIs include `https://greenchainz.com/.auth/login/aad/callback`
4. Check Google OAuth consent screen is not in "Testing" mode (limits to 100 test users)

### Swap Engine Returning Wrong Results

1. Check `ccps_baselines` table has entries for the affected material category
2. Run `revalidateSwap` mutation on affected swap validation IDs
3. Check `material_technical_specs` table has data for the materials in question
4. Review CCPS engine weights in `server/ccps-engine.ts` — see §3 of the Swap Engine Guide

---

## 11. Founding 50 Supplier Campaign Operations

Track progress via:

```sql
-- Supplier registration funnel
SELECT 
  verification_status,
  COUNT(*) as count,
  MIN(created_at) as first,
  MAX(created_at) as last
FROM suppliers
GROUP BY verification_status;

-- Suppliers by tier
SELECT tier, COUNT(*) FROM supplier_subscriptions GROUP BY tier;

-- Most active suppliers (by RFQ bids)
SELECT s.company_name, COUNT(rb.id) as bids
FROM suppliers s
LEFT JOIN rfq_bids rb ON rb.supplier_id = s.id
GROUP BY s.id, s.company_name
ORDER BY bids DESC
LIMIT 20;
```

---

*This runbook should be reviewed and updated after every significant infrastructure change. Store in the `green-sourcing-b2b-app` repo under `/docs/ADMIN_RUNBOOK.md`.*
