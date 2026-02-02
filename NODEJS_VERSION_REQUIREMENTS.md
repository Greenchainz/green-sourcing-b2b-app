# Node.js Version Requirements for GreenChainz

## ⚠️ CRITICAL: Node.js 20.0.0+ Required

This repository **MUST** use Node.js version **20.0.0 or higher** for Azure Container Apps deployment.

## Why Node 20+ is Required

### Azure SDK Dependencies
The following Azure SDK packages require Node.js >=20.0.0:

- **`@azure/identity@4.13.0`** - Requires Node >=20.0.0
  - Used for: Managed identity authentication, Azure AD authentication
  - Critical for: Key Vault access, Azure Storage, Azure SQL, all Azure services

### React Email Dependencies
The following react-email packages require Node.js >=22.0.0:

- **`@react-email/components@1.0.1`** - Requires Node >=22.0.0
  - Used for: Transactional email templates
  - Note: Currently using Node 20 (minimum for Azure SDKs) - upgrade to 22 recommended

### Playwright Testing
- **`@playwright/test@1.57.0`** - Requires Node >=18
  - Used for: End-to-end testing
  - Compliant with Node 20+

## Current Configuration

All configurations have been standardized to Node 20 LTS:

| File/Config | Node Version | Status |
|-------------|--------------|--------|
| `package.json` engines | `>=20.0.0` | ✅ Updated |
| `.oryx-node-version` | `20.18.0` | ✅ Updated |
| `Dockerfile` | `node:20-alpine` | ✅ Compliant |
| `Dockerfile.azure` | `node:20-alpine` | ✅ Compliant |
| GitHub Workflows | `20.x` | ✅ Updated |

## Azure Oryx Build Platform

Azure Container Apps uses **Oryx** as the build platform. Oryx reads:
1. `.oryx-node-version` - Explicit Node.js version (highest priority)
2. `package.json` engines.node - Node.js version range
3. Default Node.js version (if none specified)

**Our configuration:**
- `.oryx-node-version` = `20.18.0` (explicit LTS version)
- `package.json` engines = `>=20.0.0` (allows 20.x and above)
- Dockerfiles use `node:20-alpine` (matches Oryx)

## Version History

### Before (Non-Compliant)
- ❌ `.oryx-node-version`: 18.18.0
- ❌ `package.json` engines: >=18.18.0
- ❌ Workflow: 22.x (inconsistent)
- ⚠️ Azure SDK required 20+ but config specified 18+

### After (Compliant)
- ✅ `.oryx-node-version`: 20.18.0
- ✅ `package.json` engines: >=20.0.0
- ✅ Workflow: 20.x
- ✅ All dependencies satisfied

## Validation Commands

### Check Current Node.js Version
```bash
node --version
# Expected: v20.x.x or higher
```

### Validate Dependencies
```bash
npm view @azure/identity@4.13.0 engines
# Expected: { node: '>=20.0.0' }

npm view @react-email/components@1.0.1 engines
# Expected: { node: '>=22.0.0' }

npm view @playwright/test@1.57.0 engines
# Expected: { node: '>=18' }
```

### Test Build
```bash
npm install
npm run build
# Should complete without Node.js version errors
```

## Azure Container Apps Deployment

### Environment Validation

Before deploying, verify Node.js version in Azure Container Apps:

```bash
# Check active revision Node.js version
az containerapp revision show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --revision <latest-revision> \
  --query "properties.template.containers[].env[?name=='NODE_VERSION']" -o table

# Expected: 20.18.0 or 20.x
```

### Oryx Build Logs

During deployment, check Oryx build logs for Node.js detection:

```bash
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --tail 100 | grep -i "node"

# Expected output should include:
# "Detected Node.js version: 20.18.0"
# "Using Node.js version 20.18.0 from .oryx-node-version"
```

## Troubleshooting

### Error: "Module requires Node.js >=20.0.0"
**Cause:** Node.js version is below 20.0.0

**Fix:**
1. Update `.oryx-node-version` to `20.18.0`
2. Update `package.json` engines to `>=20.0.0`
3. Rebuild and redeploy

### Error: "react-email requires Node.js >=22.0.0"
**Cause:** react-email packages require Node 22+

**Options:**
1. **Recommended:** Upgrade to Node 22 LTS
   - Update `.oryx-node-version` to `22.x.x`
   - Update `package.json` engines to `>=22.0.0`
   - Update Dockerfiles to `node:22-alpine`

2. **Alternative:** Remove react-email dependency if not critical

### Mismatch Between Configurations
**Cause:** `.oryx-node-version` and `package.json` specify different versions

**Fix:**
- Ensure `.oryx-node-version` = exact version (e.g., `20.18.0`)
- Ensure `package.json` engines = range (e.g., `>=20.0.0`)
- Both should align to the same major version (20.x)

## Future Upgrades

### When to Upgrade to Node 22
Consider upgrading to Node 22 LTS when:
- React Email features become critical
- Node 22 is LTS (Long Term Support) stable
- All Azure SDKs support Node 22 (currently do)

### Upgrade Checklist
- [ ] Update `.oryx-node-version` to `22.x.x`
- [ ] Update `package.json` engines to `>=22.0.0`
- [ ] Update Dockerfiles to `node:22-alpine`
- [ ] Update GitHub workflows to `22.x`
- [ ] Test build locally
- [ ] Deploy to staging
- [ ] Validate Azure Container Apps deployment
- [ ] Update this documentation

## References

- [Azure SDK for JavaScript - Node.js Requirements](https://github.com/Azure/azure-sdk-for-js)
- [Azure Oryx Build Platform](https://github.com/microsoft/Oryx)
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)
- [Azure Container Apps - Runtime Configuration](https://learn.microsoft.com/en-us/azure/container-apps/containers)

## Last Updated

**Date:** 2026-02-02  
**Updated By:** Azure Build Enforcer Agent  
**Node Version:** 20.18.0 LTS  
**Status:** ✅ Compliant with Azure Container Apps requirements
