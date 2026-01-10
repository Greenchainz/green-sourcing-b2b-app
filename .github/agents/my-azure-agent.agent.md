---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name:
description:
---

# My Agent

Describe what your agent does here...# GreenChainz Azure Container App Build Configuration

## Context
Repository: jnorvi5/green-sourcing-b2b-app (Next.js 15 + TypeScript)
Target: Azure Container Apps (East US region)
Current Issue: Build failing due to Node.js version mismatch

## Azure Infrastructure
- **Tech Stack**: Azure ONLY (no Vercel, no Supabase)
- **Resources Available**:
  - Azure Database for PostgreSQL (greenchainz-db-prod in Central US)
  - Azure AI Foundry projects (greenchainz-resource, greenchainz-foundry)
  - Azure Container Apps Environment (cae-greenchainz-env in East US)
  - Azure Container Registry (acrgreenchainzprod916)
  - Azure App Configuration (app-config-green)
  - Azure Cache for Redis (greenchainz in East US 2)
  - Azure Blob Storage (greenchainzscraper)
  - Azure Key Vault (GreenChainz-vault-2026)

## Build Requirements
1. **Node.js**: Must be 18.18.0 or higher (NOT 16.20.2)
2. **Python**: 3.8.18 already working
3. **Dependencies**: 
   - Next.js 15.5.9
   - Azure SDK packages (@azure/* require Node 20+)
   - React-email packages (require Node 20+)
   - Playwright (requires Node 18+)

## Critical Files to Check/Create
- [ ] `.oryx-node-version` (set to `18.18.0`)
- [ ] `azure-pipelines.yml` or `.github/workflows/*.yml` (verify Node version)
- [ ] `Dockerfile` (if custom - ensure FROM node:18-alpine)
- [ ] `package.json` engines field (add if missing):
  ```json
  "engines": {
    "node": ">=18.18.0",
    "npm": ">=8.0.0"
  }
