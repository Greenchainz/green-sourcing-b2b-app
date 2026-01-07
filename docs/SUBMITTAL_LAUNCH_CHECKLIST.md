# 🚀 Submittal Generator - Launch Checklist

**Target Launch Date:** January 7, 2026  
**Status:** Ready for Production

---

## Pre-Launch Verification (Before Pushing to `main`)

### Code Quality
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] No console errors in dev: `npm run dev`
- [ ] Linter passes: `npm run lint`
- [ ] All new files follow project conventions
- [ ] No hardcoded secrets or credentials

### Local Testing
- [ ] Submittal upload works with test PDF
- [ ] API endpoint returns valid PDF response
- [ ] Error handling works (try invalid file)
- [ ] Health check returns 200: `curl http://localhost:3000/api/health`
- [ ] PDF output opens in Acrobat/Preview

### Environment Variables
- [ ] `.env.local` has all required Azure variables
- [ ] All services can be reached (test connections)
- [ ] Azure credentials are valid and have permissions

---

## Infrastructure Verification (Azure)

### Azure Services
- [ ] Azure Container Registry exists and is accessible
- [ ] Container App is configured with correct port (3000)
- [ ] Azure SQL Database is reachable and has schema
- [ ] Azure Blob Storage container "submittals" exists
- [ ] Document Intelligence endpoint is responding
- [ ] Azure OpenAI endpoint is responding and deployment is set

### Azure Networking
- [ ] Container App has public HTTPS endpoint
- [ ] Custom domain (greenchainz.com) is configured
- [ ] SSL certificate is valid and not expired
- [ ] Firewall rules allow traffic (if applicable)

### Azure Credentials & Access
- [ ] Service Principal has necessary roles
- [ ] Managed Identity is enabled on Container App
- [ ] Key Vault has all required secrets
- [ ] GitHub Actions can authenticate to Azure

---

## GitHub Actions Setup

### Secrets Configured
- [ ] `AZURE_CLIENT_ID`
- [ ] `AZURE_TENANT_ID`
- [ ] `AZURE_SUBSCRIPTION_ID`
- [ ] `AZURE_STORAGE_CONNECTION_STRING`
- [ ] `AZURE_SQL_SERVER`
- [ ] `AZURE_SQL_USER`
- [ ] `AZURE_SQL_PASSWORD`
- [ ] `AZURE_SQL_DATABASE`
- [ ] `AZURE_DOC_INTEL_ENDPOINT`
- [ ] `AZURE_DOC_INTEL_KEY`
- [ ] `AZURE_OPENAI_ENDPOINT`
- [ ] `AZURE_OPENAI_API_KEY`
- [ ] `AZURE_OPENAI_DEPLOYMENT`

### Workflow Testing
- [ ] Manual workflow trigger succeeds
- [ ] Docker image builds successfully
- [ ] Image pushes to ACR
- [ ] Container App deploys and starts
- [ ] Health checks pass post-deployment

---

## Production Readiness

### Documentation
- [ ] README updated with new feature
- [ ] SUBMITTAL_AZURE_DEPLOYMENT.md is current
- [ ] SUBMITTAL_GENERATOR_README.md explains the tool
- [ ] Code comments explain complex logic
- [ ] Error messages are user-friendly

### Monitoring
- [ ] Azure Monitor dashboards created
- [ ] Application Insights is enabled
- [ ] Log retention policy is set (default: 90 days)
- [ ] Alerts configured for errors/failures

### Performance
- [ ] Page load time < 3s
- [ ] PDF generation < 30s for typical spec
- [ ] Database queries are optimized with indexes
- [ ] No N+1 query problems

### Security
- [ ] No sensitive data in logs
- [ ] API validates file type (PDF only)
- [ ] API validates file size (limit to 50MB)
- [ ] CORS is properly configured
- [ ] Rate limiting is in place (optional)

---

## Launch Steps (Day Of)

### 1. Final Code Review
```bash
# Review recent changes
git log --oneline -10

# Check diff against main
git diff main...HEAD

# Verify file structure
ls -la app/api/submittal/
ls -la lib/azure/
ls -la lib/agents/
```

### 2. Push to Main
```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/submittal-generator-azure

# Make final commit
git add .
git commit -m "feat: submittal auto-generator (azure-native)"

# Push and create PR
git push origin feature/submittal-generator-azure
# Create PR on GitHub and get approval

# Merge to main
git checkout main
git merge --squash feature/submittal-generator-azure
git push origin main
```

### 3. Monitor GitHub Actions
```bash
# Watch deployment in GitHub Actions tab
# Expected timeline: 10-15 minutes total
# - Build: 3-4 min
# - Tests: 2-3 min
# - Docker build: 2-3 min
# - Push to ACR: 1-2 min
# - Deploy to Container App: 2-3 min
# - Health check: 1-2 min
```

### 4. Verify Production Deployment
```bash
# Check Container App status
az containerapp show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --query "properties.runningStatus"

# Test health endpoint
curl https://greenchainz.com/api/health

# Test submittal endpoint with real PDF
curl -X POST https://greenchainz.com/api/submittal/generate \
  -F "file=@sample-spec.pdf" \
  -o test-output.pdf \
  && file test-output.pdf
```

### 5. Check Logs for Errors
```bash
# Stream logs for first 5 minutes after deployment
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --follow \
  --tail 50

# Look for:
# ✅ "Connected to Azure SQL Database"
# ✅ "Uploaded ... to Azure Blob"
# ✅ "Extracted ... characters from PDF"
# ✅ No ❌ errors
```

### 6. Smoke Test
- [ ] Open https://greenchainz.com/tools/submittal-generator
- [ ] Upload sample PDF file
- [ ] Download generated submittal PDF
- [ ] Open PDF and verify it contains:
  - Cover sheet with GreenChainz branding
  - Extracted criteria
  - Product matches
  - EPD documents attached

---

## Post-Launch (First 24 Hours)

### Monitor Performance
- [ ] Check response times in Application Insights
- [ ] Monitor error rate (should be 0%)
- [ ] Check resource usage (CPU, memory)
- [ ] Verify logs for any warnings

### User Feedback
- [ ] Share link with internal team for testing
- [ ] Collect feedback on UX
- [ ] Test with multiple spec PDFs
- [ ] Document any edge cases found

### Rollback Plan (If Critical Issue)
```bash
# If something breaks, rollback to previous image:
az containerapp update \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz:previous

# Or redeploy main without this feature
git revert <commit-hash>
git push origin main
# GitHub Actions will auto-redeploy
```

---

## Post-Launch (Week 1)

### Analytics
- [ ] Track "submittal generated" events
- [ ] Measure average PDF generation time
- [ ] Monitor Azure cost impact
- [ ] Track unique users

### Optimization
- [ ] Profile slow requests
- [ ] Add caching if needed
- [ ] Optimize database queries
- [ ] Reduce PDF generation time if > 20s

### Feature Ideas
- [ ] Email PDF directly to user
- [ ] Allow spec text paste instead of PDF
- [ ] Save previous submittals for user
- [ ] Add product comparison view

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|-----------|
| Azure Admin | [TBD] | Portal.azure.com |
| GitHub Actions | [TBD] | GitHub Settings |
| On-Call Eng | [TBD] | Slack #incidents |

---

## Success Criteria

✅ **Launch is successful if:**
1. Health endpoint returns 200
2. Submittal generator accepts PDF upload
3. PDF generated in < 30 seconds
4. No critical errors in logs
5. Team can submit first production submittal

🚀 **Ready to launch!**

---

**Last Updated:** January 7, 2026  
**Next Review:** January 8, 2026 (24h post-launch)
