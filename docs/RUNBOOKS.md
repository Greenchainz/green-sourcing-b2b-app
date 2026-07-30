# GreenChainz — Incident Runbooks

> **Classification: INTERNAL ONLY.** Do not commit real credentials, personal data, or active tokens to this file.

---

## Index

| Runbook | Severity | Trigger |
|---------|----------|---------|
| [RB-01: Emergency Manual Deployment (Break-Glass)](#rb-01-emergency-manual-deployment-break-glass) | Sev-1 | Production outage requiring immediate deploy with expedited human approval |
| [RB-02: Production Rollback](#rb-02-production-rollback) | Sev-1 | New revision degrading production; must revert in < 15 min |
| [RB-03: Credential Compromise](#rb-03-credential-compromise) | Sev-1 | Exposed secret, unauthorized access, or leaked token |
| [RB-04: Database Restoration](#rb-04-database-restoration) | Sev-1 | Data corruption, catastrophic migration failure, or accidental deletion |
| [RB-05: Cross-Tenant Data Exposure](#rb-05-cross-tenant-data-exposure) | Sev-1 | User A can see User B's data — immediate freeze required |
| [RB-06: Auth Loop / All Users Locked Out](#rb-06-auth-lockout--all-users-signed-out) | Sev-1 | OAuth callback failure or JWT secret rotation breaking sessions |
| [RB-07: High Error Rate Alert (5xx > 2%)](#rb-07-high-error-rate-alert-5xx--2) | Sev-2 | Azure Monitor alert fires |

---

## RB-01: Emergency Manual Deployment (Break-Glass)

**When to use:** Production is down and the normal deployment path (PR → CI → manual approval → deploy) is too slow. This runbook is a manual deployment path and still requires the Production environment approval gate.

**Authorization:** Requires an audited break-glass identity. Before proceeding:
- Authenticate with MFA on the account you will use to trigger the deployment.
- Link this action to an open GitHub Issue tagged `incident` (create one now if none exists).
- A post-incident review is mandatory after every break-glass use.

### Steps

1. **Create an incident record** before doing anything:

   ```
   Incident: <short description>
   Date/Time UTC: <timestamp>
   Git SHA deployed: <commit SHA>
   Phases expedited: CI gate / staging validation
   Justification: <why this can't wait>
   Post-deploy validation: <what you will verify after>
   ```

   Save this in a GitHub Issue tagged `incident`.

2. **Trigger the workflow manually** via GitHub Actions UI:

   Open GitHub Actions → `deploy-azure.yml` → **Run workflow** → select the exact
   commit SHA you intend to deploy → click **Run workflow**.

   Alternatively, use the CLI (workflow must be triggered from the target ref):

   ```bash
   gh workflow run deploy-azure.yml --ref <commit-sha-or-branch>
   ```

   > **Do NOT** use `git push origin main --force` — this rewrites history, bypasses
   > CI, and can promote arbitrary code to production without an audit trail.

3. **Approve the Production environment gate** in GitHub Actions → Environments → Production (required for this runbook).

   > This is still a standard protected-environment approval. If no approver is
   > available, escalate to the on-call approver per incident policy; do not
   > assume a technical bypass exists in `deploy-azure.yml`.

4. **Post-deploy validation** (within 10 minutes of deploy):
   - Hit `/health` and `/ready` endpoints
   - Run a manual smoke test: sign in, submit a test RFQ, verify response
   - Check Azure Monitor for 5xx spike

5. **Close the incident** in the GitHub Issue. Note the commit SHA, what was bypassed, and the outcome.

> **Policy:** Every break-glass use is reviewed at the next available opportunity. Repeat use without improvement to the deployment process is a process failure.

---

## RB-02: Production Rollback

**Target time:** < 15 minutes from alert to rollback complete.

**Goal:** Restore the last known-good deploy by re-pointing both Container Apps to known-good image tags.

### Steps

1. **Identify the last known-good image tags** (backend and frontend):

   ```bash
   # Pick a known-good commit SHA from GitHub Actions deploy history,
   # then use it as the image tag for both apps.
   GOOD_SHA="<known-good-commit-sha>"
   BACKEND_IMAGE="acrgreenchainzprod916.azurecr.io/greenchainz-backend:${GOOD_SHA}"
   FRONTEND_IMAGE="acrgreenchainzprod916.azurecr.io/greenchainz-frontend:${GOOD_SHA}"
   ```

2. **Roll back backend app** (`greenchainz-backend-v2`):

   ```bash
   az containerapp update \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container \
     --image "${BACKEND_IMAGE}"
   ```

3. **Roll back frontend app** (`greenchainz-frontend`):

   ```bash
   az containerapp update \
     --name greenchainz-frontend \
     --resource-group rg-greenchainz-prod-container \
     --image "${FRONTEND_IMAGE}"
   ```

   > **Note:** The checked-in deployment workflow deploys backend and frontend as
   > separate Container Apps. Rollback must cover both apps when both were updated.

4. **Verify rollback success:**
   - Check `/health` → 200
   - Check `/ready` → 200 (DB connected)
   - Azure Monitor → HTTP 5xx rate should drop to baseline

5. **Post-mortem:** Create a GitHub Issue with `post-mortem` label. Capture what failed and what guard would have caught it.

---

## RB-03: Credential Compromise

**Triggers:** Exposed secret in git history, unauthorized API calls, leaked token in logs, Sentry alert about unusual auth activity.

### Immediate containment (< 5 minutes)

1. **Identify the compromised credential** — is it a:
   - JWT_SECRET → all active sessions are compromised
   - AZURE_AD_CLIENT_SECRET → OAuth login is compromised
   - DATABASE_URL / database password → DB access is compromised
   - Sentry auth token → Sentry source maps access is compromised
   - Resend / SendGrid API key → email sending is compromised

2. **Revoke immediately at the issuing service first** — replacing the Key Vault
   value alone does NOT revoke the credential; the old value remains valid at
   the issuer until explicitly invalidated there:
   - **JWT_SECRET**: generate a new value and redeploy (see Step 3 below)
   - **Azure AD client secret**: Portal → App Registrations → Certificates & secrets → Delete the compromised secret
   - **Sentry auth token**: Settings → Auth Tokens → Revoke
   - **Resend API key**: Dashboard → API Keys → Delete
   - **Database password**: `ALTER ROLE <user> WITH PASSWORD '<new-password>'` in psql, then update Key Vault

   Once revoked at the issuer, update Key Vault with the replacement value:

   ```bash
   az keyvault secret set \
     --vault-name Greenchainz-vault \
     --name <secret-name> \
     --value "<new-value>"
   ```

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
   # 1. Revoke the credential at its issuer BEFORE rewriting history.
   #    Rewriting history does NOT invalidate already-cloned copies.

   # 2. Scan ALL files and ALL refs for the exact secret value to find
   #    every commit and file path that contains it:
   git log --all -p | grep -n "<exact-secret-value>"

   # 3. Rewrite history to remove every file containing the secret.
   #    Replace <file-path> with each path identified in step 2.
   #    Run once per file path (git-filter-repo removes from all branches/tags):
   pip install git-filter-repo
   git filter-repo --path <file-path> --invert-paths

   # 4. Verify the secret no longer appears in any ref:
   git log --all -p | grep "<exact-secret-value>"
   # Output must be empty before proceeding.

   # 5. Force-push the cleaned history to all branches and tags:
   git push origin --force --all
   git push origin --force --tags
   ```

   Then notify all contributors to re-clone. The secret remains valid in any
   clone that existed before the rewrite — revocation at the issuer (Step 2
   above) is the only reliable containment.

7. **Audit blast radius:**
   - Review Azure Monitor logs for unauthorized access during the window
   - Check Database audit logs for unexpected queries
   - Review Sentry for source map access

---

## RB-04: Database Restoration

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

## RB-05: Cross-Tenant Data Exposure

**Severity: Sev-1 — STOP ALL ONBOARDING IMMEDIATELY**

### Immediate actions (< 10 minutes)

1. **Halt all new user onboarding** — the fastest option is to roll back to the
   last known-good revision (see RB-02), which simultaneously removes the
   vulnerable code and prevents new sign-ups on the faulty path.

   If a rollback is not yet possible, disable the Container App ingress to block
   all public traffic while the vulnerability is assessed:

   ```bash
   az containerapp ingress disable \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container
   ```

   Re-enable once a patch or rollback is in place:

   ```bash
   az containerapp ingress enable \
     --name greenchainz-backend-v2 \
     --resource-group rg-greenchainz-prod-container \
     --type external --target-port 3001 --transport auto
   ```

   > **Note:** Set `DISABLE_SIGNUP=true` to block `/api/auth/email/signup` while
   > containment is in progress.

2. **Identify the affected users** — query the audit log using the actual schema
   columns (`actorUserId`, `resourceType`, `resourceId`, `action`, `metadata`,
   `createdAt`):

   ```sql
   -- Find successful/blocked resource access events for RFQs and extract any
   -- tenant context that was logged in metadata.
   SELECT "actorUserId", "actorEmail", "action", "resourceType", "resourceId",
         "outcome",
         "metadata"->>'actorOrgId' AS actor_org_id,
         "metadata"->>'ownerOrgId' AS owner_org_id,
         "metadata",
         "createdAt"
   FROM audit_logs
   WHERE ("action" LIKE '%access%' OR "action" LIKE '%view%' OR "action" LIKE '%read%')
    AND "resourceType" = 'rfq'
   ORDER BY "createdAt" DESC
   LIMIT 100;
   ```

   If `actor_org_id` / `owner_org_id` are null, use `resourceId` + `actorUserId`
   to correlate against ownership records and request logs to determine cross-tenant exposure.

3. **Determine blast radius** — which records were exposed, for how long, to whom.

4. **Patch the vulnerability** — rollback or hotfix the specific router procedure.

5. **Notify affected users** per GDPR/CCPA requirements if PII was exposed:
   - **Supervisory authority (GDPR Art. 33):** notify within **72 hours** of becoming aware, even if the investigation is incomplete. Late notification must include the reason for delay.
   - **Affected data subjects (GDPR Art. 34):** notify **without undue delay** when the breach is likely to result in high risk. No fixed 72-hour deadline, but prompt action is required.

6. **Document in a GitHub Issue** with `security` label. Include: affected users, data types, exposure window, remediation.

### Diagnostic query for tenant boundary violations

```sql
-- Find RFQ access attempts where the actor is neither the RFQ owner nor an invited supplier user.
-- Ownership: rfqs.userId. Assignment: rfq_supplier_invites.supplier_id -> suppliers.userId.
WITH invited_supplier_users AS (
  SELECT rsi.rfq_id, array_agg(DISTINCT s."userId") AS invited_user_ids
  FROM rfq_supplier_invites rsi
  JOIN suppliers s ON s.id = rsi.supplier_id
  GROUP BY rsi.rfq_id
)
SELECT r.id AS rfq_id,
       r."userId" AS owner_user_id,
       COALESCE(isu.invited_user_ids, ARRAY[]::integer[]) AS invited_user_ids,
       al."actorUserId",
       al."action",
       al."outcome",
       al."resourceId",
       al."createdAt" AS audit_created_at
FROM rfqs r
JOIN audit_logs al
  ON al."resourceType" = 'rfq'
 AND al."resourceId" = r.id::text
LEFT JOIN invited_supplier_users isu
  ON isu.rfq_id = r.id
WHERE r."deletedAt" IS NULL
  AND (al."action" LIKE '%access%' OR al."action" LIKE '%view%' OR al."action" LIKE '%read%')
  AND al."outcome" = 'success'
  AND al."actorUserId" IS NOT NULL
  AND al."actorUserId" <> r."userId"
  AND NOT (al."actorUserId" = ANY(COALESCE(isu.invited_user_ids, ARRAY[]::integer[])))
ORDER BY al."createdAt" DESC
LIMIT 50;
```

If tenant identifiers are not present in `audit_logs`, use the Azure Log Analytics source that records both actor and owner tenant IDs for successful access events, then flag rows where actor and owner tenant IDs differ.

---

## RB-06: Auth Lockout — All Users Signed Out

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

## RB-07: High Error Rate Alert (5xx > 2%)

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
| Founder / Primary Responder | See team contact list in the GreenChainz internal wiki | Direct / on-call rotation |
| Azure Support | Open a case at support.azure.com (Sev A for production outages) | Portal: support.azure.com |
| Database (PostgreSQL Flexible Server) | Azure Support P1 | +1-800-642-7676 |

> **Maintain this table.** If the Founder or on-call contact changes, update
> this file and the internal wiki in the same PR. Stale contacts make Sev-1
> escalation non-actionable.

---

*Last updated: 2026-07. Review after every Sev-1 incident.*
