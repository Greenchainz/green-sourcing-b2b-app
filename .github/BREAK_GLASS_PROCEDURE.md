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

```text
BREAK-GLASS INCIDENT RECORD
============================
Date/Time (UTC):         ____________________
Incident Severity:       Sev-1
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
  See "Immediate Rollback" section below — copy the containerapp update command
  with the known-good SHA and execute it immediately.

RESOLUTION
-----------
Incident resolved at (UTC):  ____________________
Root cause:                  ____________________
Follow-up tasks filed:       ____________________
Post-mortem scheduled:       Yes / No — Date: ____________________
```

---

## Executing the Break-Glass Deploy

### Option A: Promote an already-built staging image (fast path — approval gate still applies)

> ⚠️ **This path requires the same Production environment approval as the normal release path.**
> Use this when the fix exists as a pre-built, staging-validated image and an approver is available.
> If the approval gate itself is unavailable, use Option B.

If the fix was merged to `main` and built by `build-and-stage.yml`:

1. Find the git SHA from the `build-and-stage` run:

   ```bash
   gh run list --workflow=build-and-stage.yml --limit 5
   ```

2. Dispatch `release-production.yml` with that SHA:

   ```bash
   gh workflow run release-production.yml \
     --field image_sha=FULL_40_CHAR_SHA \
     --field skip_smoke_tests=false
   ```

3. Approve the Production environment gate in the GitHub Actions UI — or use the GitHub API to approve if the UI is unreachable.

### Option B: Emergency direct deploy (no existing build — bypasses the approval gate)

> ⚠️ **Use only when Option A is impossible.** This rebuilds from source and bypasses the staging validation gate.
> Requires Azure CLI access and write permission on the production Container Apps.
> Select the affected component(s): **Backend**, **Frontend**, or **Both**.

```bash
# 0. Ensure the working tree is clean — no uncommitted or untracked files.
git stash  # or: git status and address any diff
git status  # must show "nothing to commit, working tree clean"

# 1. Authenticate to Azure
az login

# ─── BACKEND ───────────────────────────────────────────────────────────────

# 2. Build and push the emergency backend image; capture the immutable digest.
COMMIT_SHA=$(git rev-parse HEAD)
BACKEND_DIGEST=$(az acr build \
  --registry acrgreenchainzprod916 \
  --image "greenchainz-backend:${COMMIT_SHA}" \
  --file Dockerfile.backend \
  --query "outputImages[0].digest" \
  --output tsv \
  .)

if [ -z "$BACKEND_DIGEST" ]; then
  echo "ERROR: ACR build did not return a digest — aborting" >&2
  exit 1
fi
echo "Backend digest: $BACKEND_DIGEST"

# 3. Deploy directly using the immutable digest (not the mutable tag).
az containerapp update \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --image "acrgreenchainzprod916.azurecr.io/greenchainz-backend@${BACKEND_DIGEST}"

# 4. Wait for the revision to become ready and validate health.
for i in $(seq 1 24); do
  STATUS=$(curl --fail --silent --show-error --max-time 10 \
    -o /dev/null -w "%{http_code}" \
    https://greenchainz.com/api/health 2>/dev/null || echo "FAIL")
  if [ "$STATUS" = "200" ]; then
    echo "✅ Backend health check passed (attempt $i)"
    break
  fi
  echo "⏳ Waiting for backend... (status=$STATUS, attempt $i/24)"
  sleep 10
done
if [ "$STATUS" != "200" ]; then
  echo "❌ Backend did not become healthy — consider rollback (see section below)"
  exit 1
fi

# ─── FRONTEND ──────────────────────────────────────────────────────────────

# 5. (If a frontend emergency deploy is also needed) Build and push the frontend image.
FRONTEND_DIGEST=$(az acr build \
  --registry acrgreenchainzprod916 \
  --image "greenchainz-frontend:${COMMIT_SHA}" \
  --file Dockerfile.frontend \
  --query "outputImages[0].digest" \
  --output tsv \
  .)

if [ -z "$FRONTEND_DIGEST" ]; then
  echo "ERROR: ACR build did not return a frontend digest — aborting" >&2
  exit 1
fi
echo "Frontend digest: $FRONTEND_DIGEST"

az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --image "acrgreenchainzprod916.azurecr.io/greenchainz-frontend@${FRONTEND_DIGEST}"

# 6. Validate frontend health.
for i in $(seq 1 24); do
  STATUS=$(curl --fail --silent --show-error --max-time 10 \
    -o /dev/null -w "%{http_code}" \
    https://greenchainz.com/ 2>/dev/null || echo "FAIL")
  if [ "$STATUS" = "200" ]; then
    echo "✅ Frontend health check passed (attempt $i)"
    break
  fi
  echo "⏳ Waiting for frontend... (status=$STATUS, attempt $i/24)"
  sleep 10
done
if [ "$STATUS" != "200" ]; then
  echo "❌ Frontend did not become healthy — consider rollback (see section below)"
  exit 1
fi
```

---

## Immediate Rollback (< 5 minutes)

> **Both Container Apps run in Single revision mode.** The prior revision is inactive.
> Rolling back means deploying the last known-good image using its immutable digest.

```bash
# 1. Find the known-good digest for the backend (from ACR or from the prior build-and-stage run).
KNOWN_GOOD_BACKEND_SHA="REPLACE_WITH_PRIOR_40_CHAR_SHA"
KNOWN_GOOD_FRONTEND_SHA="REPLACE_WITH_PRIOR_40_CHAR_SHA"

# 2. Roll back the backend by deploying the known-good image.
az containerapp update \
  --name greenchainz-backend-v2 \
  --resource-group rg-greenchainz-prod-container \
  --image "acrgreenchainzprod916.azurecr.io/greenchainz-backend:${KNOWN_GOOD_BACKEND_SHA}"

# 3. Roll back the frontend (if also impacted).
az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --image "acrgreenchainzprod916.azurecr.io/greenchainz-frontend:${KNOWN_GOOD_FRONTEND_SHA}"

# 4. Verify the rollback is healthy — fail-closed: non-2xx means the rollback has not taken effect.
curl --fail --show-error --silent --max-time 10 https://greenchainz.com/api/health
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
