# Agent Prompts Directory

Copy-paste prompts for each agent in the GreenChainz multi-agent coordination.

## Quick Reference

| File | Agent | Lane |
|------|-------|------|
| `01-azure-infra.md` | AZURE-INFRA | CI/CD, Azure config |
| `02-secrets-config.md` | SECRETS-CONFIG | Env vars, docs |
| `03-db-schema.md` | DB-SCHEMA | Migrations only |
| `04-backend-rfq.md` | BACKEND-RFQ | RFQ routes/services |
| `05-backend-catalog.md` | BACKEND-CATALOG | Catalog API |
| `06-ui-catalog.md` | UI-CATALOG | Frontend catalog |
| `07-backend-payments.md` | BACKEND-PAYMENTS | Stripe, LinkedIn |

## Usage

1. Open the agent prompt file
2. Copy the prompt between the triple backticks
3. Paste into a new Cursor agent session
4. Agent will work within their defined lane

## Merge Order

```
1. SECRETS-CONFIG  → No dependencies
2. DB-SCHEMA       → Creates tables
3. AZURE-INFRA     → Configures deployment
4. BACKEND-PAYMENTS → Depends on schema
5. BACKEND-CATALOG  → Depends on schema
6. BACKEND-RFQ      → Depends on schema + payments
7. UI-CATALOG       → Depends on catalog API
```

## Locked Files

These files require commander approval to modify:
- `app/layout.tsx`
- `app/globals.css`
- `backend/index.js`
- `package.json`
- `package-lock.json`
- `backend/db.js`

See `../COMMANDER-LOCKED-FILES.md` for the change request workflow.
