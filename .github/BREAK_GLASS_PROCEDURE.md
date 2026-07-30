# Break-Glass Emergency Deployment Procedure

> **This document must be completed for every production bypass.**  
> Store the completed incident record in a private incident log (never commit live credentials here).

---

## What "Break-Glass" Means

In normal operation, all production deployments flow through:

1. A PR merge → `build-and-stage.yml` builds the image and deploys to **staging**
2. A GitHub Release (tag `v*.*.*`) → `release-production.yml` requires **Production environment approval**

A break-glass bypass skips step 2's approval gate to allow an emergency deployment directly. This is the **last resort** for Sev-1 incidents only.

---

## Pre-Conditions for Break-Glass Use

Only use this procedure when **all** of the following are true:

- [ ] There is an active Sev-1 incident with documented customer/data impact
- [ ] The normal release workflow cannot run in time to contain the incident
- [ ] At least one rollback to a known-good revision has already been **attempted and failed**
- [ ] You have reviewed the specific commits being force-deployed

---

## Incident Record Template

Copy and complete this for every break-glass event. File it in the incident log (private Notion/Linear/email thread — not Git).

```
BREAK-GLASS INCIDENT RECORD
============================
Date/Time (UTC):         ____________________
Incident Severity:       Sev-1 / Sev-2
Initiated By:            ____________________

INCIDENT SUMMARY
-----------------
Description of production failure:


Customer/tenant impact:


Timeline of failure discovery:


BYPASS DETAILS
--------------
Git SHA deployed:                    ____________________  (40-char full SHA)
Image digest pushed to ACR:         sha256:______________
Approval gate bypassed:             Production environment reviewer
Reason normal release gate skipped: ____________________

TESTING BYPASSED
-----------------
List each phase bypassed and justification:

[ ] Staging smoke tests bypassed?    Yes / No
    Reason if yes: ____________________

[ ] DB migration validation skipped? Yes / No
    Reason if yes: ____________________

[ ] Full verify (typecheck/lint/test) skipped? Yes / No
    Reason if yes: ____________________

POST-DEPLOYMENT VALIDATION
---------------------------
Steps executed after the force deploy:

1. Health endpoint response:  GET https://greenchainz.com/api/health → ____
2. Core tRPC route tested:    ____________________
3. Auth flow verified:        ____________________
4. DB migration result:       ____________________
5. Azure Monitor 5xx rate:    ______ % (should be < 2%)
6. Application Insights:      No anomalies? Yes / No

ROLLBACK PLAN (if this deploy also fails)
------------------------------------------
Prior known-good revision:    ____________________
Rollback command:
  az containerapp ingress traffic set \
    --name greenchainz-backend-v2 \
    --resource-group rg-greenchainz-prod-container \
    --revision-weight <prior-revision-name>=100

RESOLUTION
-----------
Incident resolved at (UTC):  ____________________
Root cause:                  ____________________
Follow-up tasks filed:       ____________________
Post-mortem scheduled:       Yes / No — Date: ____________________
```

---

## Executing the Break-Glass Deploy

### Option A: Promote an already-built staging image

If the fix was merged to `main` and built by `build-and-stage.yml`:

1. Find the git SHA from the `build-and-stage` run:
   ```
   gh run list --workflow=build-and-stage.yml --limit 5
   ```

2. Dispatch `release-production.yml` with that SHA:
   ```
   gh workflow run release-production.yml \
     --field image_sha=<40-char-sha> \
     --field skip_smoke_tests=false
   ```

3. Approve the Production environment gate in the GitHub Actions UI — or use the GitHub API to approve if the UI is unreachable.

### Option B: Emergency direct deploy (no existing build)

**Use only when Option A is impossible.** This rebuilds from source and bypasses the staging validation gate.

```bash
# 1. Authenticate to Azure
az login

# 2. Build and push the emergency image
COMMIT_SHA=$(git rev-parse HEAD)
az acr build \
  --registry acrgreenchainzprod916 \
  --image greenchainz-backend:${COMMIT_SHA} \
  --file Dockerfile.backend .

# 3. Deploy directly
az containerapp update \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz-backend:${COMMIT_SHA}

# 4. Watch the revision come up
az containerapp revision list \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --output table
```

---

## Immediate Rollback (< 5 minutes)

If the production deployment is causing harm, roll back traffic to the prior revision instantly:

```bash
# List active revisions
az containerapp revision list \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --query "[].{name:name, active:properties.active, traffic:properties.trafficWeight}" \
  --output table

# Shift all traffic to the prior known-good revision
az containerapp ingress traffic set \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --revision-weight <PRIOR_REVISION_NAME>=100

# Verify
curl -v https://greenchainz.com/api/health
```

Rollback SLA: **< 15 minutes** from incident detection to traffic shift.

---

## Post-Break-Glass Obligations

Within **24 hours** of the incident resolution:

- [ ] File a detailed post-mortem (5 Whys or similar)
- [ ] Create a follow-up PR that adds a regression test covering the root cause
- [ ] Review whether the normal release pipeline needs modifications to prevent recurrence
- [ ] If DB migrations were applied, verify the migration is in the `drizzle/` directory and committed
- [ ] Rotate any credentials that may have been exposed during the incident
- [ ] Update this document if the procedure was unclear or insufficient

---

## Escalation Contacts

| Role | Contact |
|------|---------|
| Platform Owner | (founder) — primary on-call |
| Azure Support | [https://portal.azure.com/#blade/Microsoft_Azure_Support](https://portal.azure.com/#blade/Microsoft_Azure_Support) |
| GitHub Support | [https://support.github.com](https://support.github.com) |
| Sentry Incident | [https://sentry.io/organizations/greenchainz](https://sentry.io) |

---

*This procedure is reviewed and updated after every break-glass event and semi-annually during disaster recovery drills.*
