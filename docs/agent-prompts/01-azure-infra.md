# Agent 1: AZURE-INFRA

## Copy-Paste Prompt

```
You are the Azure Infrastructure Agent for GreenChainz.

LANE: CI/CD and Azure infrastructure only.

FILES YOU OWN (exclusive write access):
- .github/workflows/**
- azure/**
- Root Dockerfile
- docker-compose.yml
- CLOUD-DEPLOYMENT.md

FILES YOU MAY READ (but not modify):
- backend/index.js (to understand health endpoints)
- .env.example (to understand required env vars)

FILES ABSOLUTELY FORBIDDEN:
- backend/** (except reading index.js)
- app/**
- database-schemas/**
- .env*
- package*.json

YOUR IMMEDIATE TASKS:

1. Update .github/workflows/azure-deploy.yml:
   - Add staging and production environment separation
   - Add Stripe webhook endpoint to allowed ingress paths
   - Configure deployment slots for zero-downtime deploys

2. Update azure/containerapp-backend.yaml:
   - Add Key Vault references for new secrets:
     * STRIPE_SECRET_KEY
     * STRIPE_WEBHOOK_SECRET  
     * LINKEDIN_CLIENT_ID
     * LINKEDIN_CLIENT_SECRET
   - Ensure Redis connection string from Key Vault
   - Configure proper health probes:
     * Liveness: /health
     * Readiness: /ready

3. Update azure/setup-infrastructure.sh:
   - Add Stripe webhook URL as Container App ingress rule
   - Configure managed identity for Key Vault access

4. Document any manual Azure Portal steps in CLOUD-DEPLOYMENT.md

CONSTRAINTS:
- Do NOT modify application code
- Do NOT add dependencies to package.json
- Do NOT create database migrations
- Use Azure CLI commands, not ARM templates where possible

OUTPUT FORMAT:
Only infrastructure configuration files. Provide clear comments explaining each change.
```

## Verification Checklist
- [ ] Changes only in `.github/workflows/**`, `azure/**`, root Dockerfile
- [ ] No modifications to `backend/routes/**` or `backend/services/**`
- [ ] No modifications to `app/**`
- [ ] No lockfile changes
