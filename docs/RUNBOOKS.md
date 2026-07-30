# GreenChainz — Incident Runbooks

> **Classification: INTERNAL ONLY.** Do not commit real credentials, personal data, or active tokens to this file.

---

## Index

| Runbook | Severity | Trigger |
|---------|----------|---------|
| [RB-01: Emergency Deployment Bypass (Break-Glass)](#rb-01-break-glass) | Sev-1 | Production outage requiring immediate deploy without normal approval |
| [RB-02: Production Rollback](#rb-02-production-rollback) | Sev-1 | New revision degrading production; must revert in < 15 min |
| [RB-03: Credential Compromise](#rb-03-credential-compromise) | Sev-1 | Exposed secret, unauthorized access, or leaked token |
| [RB-04: Database Restoration](#rb-04-database-restoration) | Sev-1 | Data corruption, catastrophic migration failure, or accidental deletion |
| [RB-05: Cross-Tenant Data Exposure](#rb-05-cross-tenant-data-exposure) | Sev-1 | User A can see User B's data — immediate freeze required |
| [RB-06: Auth Loop / All Users Locked Out](#rb-06-auth-lockout) | Sev-1 | OAuth callback failure or JWT secret rotation breaking sessions |
| [RB-07: High Error Rate Alert (5xx > 2%)](#rb-07-high-error-rate) | Sev-2 | Azure Monitor alert fires |

---

## RB-01: Break-Glass — Emergency Deployment Bypass {#rb-01-break-glass}

**When to use:** Production is down and the normal deployment path (PR → CI → manual approval → deploy) is too slow. The break-glass procedure allows bypassing the GitHub Environment protection rules.

**Authorization:** Solo founder (you). No other approvals required.

### Steps

1. **Create an incident record** before doing anything:

   ```
   Incident: <short description>
   Date/Time UTC: <timestamp>
   Git SHA deployed: <commit SHA>
   Phases bypassed: CI gate / staging validation / manual approval
   Justification: <why this can't wait>
   Post-deploy validation: <what you will verify after>
   ```

   Save this in a GitHub Issue tagged `incident`.

2. **Trigger the workflow manually** (workflow_dispatch skips the push-to-main trigger but still fires the Production environment gate):

   ```bash
   gh workflow run deploy-azure.yml --ref main -f bypass_reason="<incident number>"
   ```

3. **Or bypass entirely** by pushing directly with `--force` using the emergency credential path:

   ```bash
   # ONLY in true break-glass. Document this commit in the incident issue.
   git push origin main --force
   ```

4. **Approve the Production environment gate** in GitHub Actions → Environments → Production.

5. **Post-deploy validation** (within 10 minutes of deploy):
   - Hit `/health` and `/ready` endpoints
   - Run a manual smoke test: sign in, submit a test RFQ, verify response
   - Check Azure Monitor for 5xx spike

6. **Close the incident** in the GitHub Issue. Note the commit SHA, what was bypassed, and the outcome.

> **Policy:** Every break-glass use is reviewed at the next available opportunity. Repeat use without improvement to the deployment process is a process failure.

---

## RB-02: Production Rollback {#rb-02-production-rollback}

**Target time:** < 15 minutes from alert to rollback complete.

**Goal:** Restore the last known-good revision without redeploying from source.

### Steps

1. **Identify the last good revision:**

   ```bash
   az containerapp revision list \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container \
     --query "[].{name:name, traffic:properties.trafficWeight, created:properties.createdTime, active:properties.active}" \
     --output table
   ```

2. **Shift 100% traffic back to the prior revision:**

   ```bash
   GOOD_REVISION="<revision-name-from-step-1>"
   
   az containerapp ingress traffic set \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container \
     --revision-weight "${GOOD_REVISION}=100"
   ```

3. **Deactivate the bad revision:**

   ```bash
   BAD_REVISION="<failing-revision-name>"
   
   az containerapp revision deactivate \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container \
     --revision "${BAD_REVISION}"
   ```

4. **Repeat for frontend** if the frontend was also deployed:

   ```bash
   az containerapp revision list \
     --name greenchainz-frontend \
     --resource-group rg-greenchainz-prod-container \
     --output table
   ```

5. **Verify rollback success:**
   - Check `/health` → 200
   - Check `/ready` → 200 (DB connected)
   - Azure Monitor → HTTP 5xx rate should drop to baseline

6. **Post-mortem:** Create a GitHub Issue with `post-mortem` label. Capture what failed and what guard would have caught it.

---

## RB-03: Credential Compromise {#rb-03-credential-compromise}

**Triggers:** Exposed secret in git history, unauthorized API calls, leaked token in logs, Sentry alert about unusual auth activity.

### Immediate containment (< 5 minutes)

1. **Identify the compromised credential** — is it a:
   - JWT_SECRET → all active sessions are compromised
   - AZURE_AD_CLIENT_SECRET → OAuth login is compromised
   - DATABASE_URL / database password → DB access is compromised
   - Sentry auth token → Sentry source maps access is compromised
   - Resend / SendGrid API key → email sending is compromised

2. **Revoke immediately** in the relevant system:
   - Azure Key Vault: `az keyvault secret set --vault-name Greenchainz-vault --name <secret-name> --value "REVOKED-$(date +%s)"`
   - Azure AD: Portal → App Registrations → Certificates & secrets → Delete
   - Sentry: Settings → Auth Tokens → Revoke
   - Resend: Dashboard → API Keys → Delete

3. **Force session invalidation** (if JWT_SECRET was compromised):

   ```bash
   # Generate a new JWT secret and update Key Vault
   NEW_SECRET=$(openssl rand -hex 64)
   az keyvault secret set \
     --vault-name Greenchainz-vault \
     --name jwt-secret \
     --value "$NEW_SECRET"
   ```

   Then redeploy to pick up the new secret. All existing session cookies are immediately invalid.

### Remediation

4. **Generate replacement credentials** with minimum necessary scopes.

5. **Store in Key Vault** — never in `.env` files, GitHub Secrets, or plaintext.

6. **Scrub git history** if the secret was committed:

   ```bash
   # Using git-filter-repo (install: pip install git-filter-repo)
   git filter-repo --path .env.sentry-build-plugin --invert-paths
   # Force-push all branches
   git push origin --force --all
   git push origin --force --tags
   ```

   Then notify all contributors to re-clone.

7. **Audit blast radius:**
   - Review Azure Monitor logs for unauthorized access during the window
   - Check Database audit logs for unexpected queries
   - Review Sentry for source map access

---

## RB-04: Database Restoration {#rb-04-database-restoration}

**RTO target:** < 4 hours  
**RPO target:** < 24 hours (automated daily backup)

### Identify the restoration point

```bash
# List available backups
az postgres flexible-server backup list \
  --resource-group rg-greenchainz \
  --server-name greenchainz-db-prod \
  --output table
```

### Point-in-time restore

```bash
# Restore to a new server (does NOT overwrite production)
RESTORE_TIME="2026-01-15T10:30:00Z"  # ISO 8601 UTC

az postgres flexible-server restore \
  --resource-group rg-greenchainz \
  --name greenchainz-db-restore \
  --source-server greenchainz-db-prod \
  --restore-time "${RESTORE_TIME}"
```

### Validate the restored server

1. Connect to the restored server using a direct psql connection
2. Verify row counts on critical tables: `users`, `rfqs`, `rfq_bids`, `supplier_profiles`
3. Verify the most recent legitimate transaction is present

### Promote the restored server

> ⚠️ **This step is irreversible and causes downtime.**

```bash
# Update DATABASE_URL in Key Vault to point at the restored server
NEW_URL="postgresql://<user>:<pass>@greenchainz-db-restore.postgres.database.azure.com/greenchainz_prod?sslmode=require"

az keyvault secret set \
  --vault-name Greenchainz-vault \
  --name Database-URL \
  --value "$NEW_URL"

# Trigger a new deployment to pick up the updated DATABASE_URL
gh workflow run deploy-azure.yml --ref main
```

### Post-restore checklist

- [ ] Re-run Drizzle migrations against the restored DB (`pnpm db:migrate`)
- [ ] Verify RFQ state machine integrity (no orphaned bids)
- [ ] Notify affected users of any data loss window
- [ ] File incident report

---

## RB-05: Cross-Tenant Data Exposure {#rb-05-cross-tenant-data-exposure}

**Severity: Sev-1 — STOP ALL ONBOARDING IMMEDIATELY**

### Immediate actions (< 10 minutes)

1. **Halt all new user onboarding** — disable sign-up in the Azure Container App environment variable:

   ```bash
   az containerapp update \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container \
     --set-env-vars DISABLE_SIGNUP=true
   ```

2. **Identify the affected users** — query the audit log:

   ```sql
   SELECT user_id, action, target_user_id, created_at
   FROM audit_logs
   WHERE action LIKE '%cross_tenant%'
     OR (target_user_id IS NOT NULL AND target_user_id != user_id)
   ORDER BY created_at DESC
   LIMIT 100;
   ```

3. **Determine blast radius** — which records were exposed, for how long, to whom.

4. **Patch the vulnerability** — rollback or hotfix the specific router procedure.

5. **Notify affected users** per GDPR/CCPA requirements within 72 hours if PII was exposed.

6. **Document in a GitHub Issue** with `security` label. Include: affected users, data types, exposure window, remediation.

### Diagnostic query for tenant boundary violations

```sql
-- Find any RFQ visible to users who aren't the owner or assigned supplier
SELECT r.id, r."architectId", r."supplierId", 
       r."createdAt"::date as created_date
FROM rfqs r
WHERE r."architectId" != r."supplierId"  -- basic sanity
  AND r."deletedAt" IS NULL
ORDER BY r."createdAt" DESC
LIMIT 50;
```

---

## RB-06: Auth Lockout — All Users Signed Out {#rb-06-auth-lockout}

**Triggers:** JWT_SECRET rotation, OAuth callback misconfiguration, cookie domain change.

### Diagnosis

```bash
# Check recent auth failures in structured logs
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "
    ContainerAppConsoleLogs_CL
    | where Log_s has '\"event\":\"auth.'
    | where Log_s has '\"level\":\"error\"'
    | extend parsed = parse_json(Log_s)
    | project TimeGenerated, event = parsed.event, error = parsed.error
    | order by TimeGenerated desc
    | take 50
  "
```

### If JWT_SECRET was rotated unintentionally

1. Retrieve the previous secret value from Key Vault version history:

   ```bash
   # List versions
   az keyvault secret list-versions \
     --vault-name Greenchainz-vault \
     --name jwt-secret \
     --output table
   
   # Retrieve a specific version
   az keyvault secret show \
     --vault-name Greenchainz-vault \
     --name jwt-secret \
     --version <version-id> \
     --query value -o tsv
   ```

2. Restore the previous value to Key Vault and redeploy.

### If OAuth callback URL is misconfigured

1. Check the Azure AD App Registration → Authentication → Redirect URIs
2. Verify `APP_BASE_URL` is set correctly in the Container App env vars
3. Ensure `https://greenchainz.com/api/auth/callback/microsoft` is in the allowed redirect URIs

---

## RB-07: High Error Rate Alert (5xx > 2%) {#rb-07-high-error-rate}

### Initial triage (< 5 minutes)

```bash
# Check recent 5xx errors in structured logs
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "
    ContainerAppConsoleLogs_CL
    | where Log_s has '\"statusCode\":5'
    | extend parsed = parse_json(Log_s)
    | summarize count() by tostring(parsed.path), tostring(parsed.statusCode)
    | order by count_ desc
    | take 20
  "
```

### Common causes and fixes

| Cause | Symptom | Fix |
|-------|---------|-----|
| DB connection pool exhausted | Errors spike after traffic increase | Scale up DB or increase pool size |
| External service timeout (Resend, EC3) | Only specific routes fail | Check external service status; verify timeout is configured |
| Memory OOM | Replica restarts frequently | Check container memory limits; review query for N+1 patterns |
| Bad migration | Errors started immediately after deploy | Roll back to previous revision (RB-02) |

### Useful diagnostic commands

```bash
# Container replica health
az containerapp replica list \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --output table

# Recent container restarts
az monitor metrics list \
  --resource /subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.App/containerApps/greenchainz-backend-v2 \
  --metric RestartCount \
  --interval PT5M \
  --output table
```

---

## Standing SLO Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Availability | 99.5% monthly uptime | < 99.5% over rolling 7 days |
| API p95 latency (non-AI) | < 1 second | > 2 seconds for 5 min |
| HTTP 5xx error rate | < 0.5% | > 2% for 5 min |
| Production rollback time | < 15 minutes | N/A (drill quarterly) |
| DB restore RTO | < 4 hours | N/A (drill semi-annually) |

---

## Escalation Contacts

| Role | Contact | Channel |
|------|---------|---------|
| Founder / Primary Responder | [your name] | Direct |
| Azure Support | [Azure support case URL] | Portal: support.azure.com |
| Database (PostgreSQL Flexible Server) | Azure Support P1 | +1-800-642-7676 |

---

*Last updated: 2026-07. Review after every Sev-1 incident.*
