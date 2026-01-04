# Major Changes Proposal (PR 2 Candidate)

The following changes are recommended but involve potential breaking changes or significant restructuring. They have been separated from the routine optimizations for your review.

## 1. Standardize Dockerfiles for Azure Migration

**Current State:**
- `backend/Dockerfile`: Legacy/Generic Dockerfile.
- `backend/Dockerfile.azure`: Optimized for Azure Container Apps (multi-stage, non-root user).
- `docker-compose.yml`: Currently uses `backend/Dockerfile`.

**Recommendation:**
- **Action:** Delete `backend/Dockerfile`.
- **Action:** Rename `backend/Dockerfile.azure` to `backend/Dockerfile` (or update `docker-compose.yml` to point to `Dockerfile.azure`).
- **Reason:** The Azure Dockerfile is production-ready, cleaner, and aligned with the migration goal. Standardizing avoids confusion.

## 2. Dependency Cleanup (MongoDB)

**Current State:**
- `package.json` files are clean of MongoDB.
- `backend/package-lock.json` contains `@opentelemetry/instrumentation-mongodb` (likely a transitive dependency of `applicationinsights`).

**Recommendation:**
- **Action:** Run `npm prune` and potentially regenerate `package-lock.json` in `backend/` to ensure no unnecessary dependencies remain.
- **Reason:** Ensuring a clean dependency tree reduces attack surface and image size.

## 3. Documentation & Placeholder Cleanup

**Current State:**
- `CLOUD-DEPLOYMENT.md` contains placeholder secrets (e.g., `sk_live_...`).

**Recommendation:**
- **Action:** Review `CLOUD-DEPLOYMENT.md` to ensure no real secrets were accidentally pasted. (Verified as safe placeholders by automated scan, but manual review is always good).

## 4. Azure Configuration

**Recommendation:**
- Ensure `azure/setup-secrets.sh` is used to populate Key Vault, and that developers have the necessary Azure CLI permissions.

## Execution Plan
To apply these changes, please approve the creation of a second PR or authorize the execution of these steps.
