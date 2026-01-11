# Azure AI Configuration - Deployment Checklist

## ✅ Completed Steps

### 1. Key Vault Configuration
- [x] Document Intelligence endpoint added
- [x] Document Intelligence key added
- [x] AI Foundry endpoint added (`https://greenchainz-resource.openai.azure.com`)
- [x] AI Foundry key added

### 2. Code Updates
- [x] Workflow mappings updated in `backend/services/ai-gateway/workflowRegistry.js`
  - `material-alternative` → `DATA-REFINERY`
  - `rfq-scorer` → `RFQ-MATCHING`
  - `outreach-draft` → `OUTREACH-SCALER`
  - `compliance-check` → `COMPLIANCE-VALIDATOR-AGENT`
  - `carbon-estimator` → `CARBON-OPTIMIZER-AGENT`

### 3. Container App Configuration
- [x] Secrets added (Key Vault references)
- [x] Environment variables added

---

## 📋 Deployment Steps

### Step 1: Deploy Updated Code

The workflow mappings are in the code and will be seeded on startup. Deploy the updated backend:

```bash
# Build and push Docker image
az acr build --registry acrgreenchainzprod916 \
  --image greenchainz-backend:latest \
  --file Dockerfile.backend .

# Container App will auto-update on next revision
```

**OR** if using existing build process:
```bash
# Your existing deployment process
```

### Step 2: Restart Container App

The Container App must restart for the new secrets to be loaded:

```bash
az containerapp revision restart \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container
```

**OR** trigger a new revision by updating the app (even with no code changes).

### Step 3: Verify Configuration

Check environment variables are loaded:

```bash
# Check Container App environment
az containerapp show \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --query "properties.template.containers[0].env" \
  --output table
```

### Step 4: Test Endpoints

#### Test Document Intelligence:
```bash
# Health check
curl https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/ai/health
```

#### Test AI Gateway:
```bash
# Check AI Gateway health
curl https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/ai-gateway/health

# List workflows (requires auth)
curl -H "Authorization: Bearer {token}" \
  https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/ai-gateway/workflows
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Container App restarted successfully
- [ ] Environment variables are present:
  - [ ] `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
  - [ ] `AZURE_DOCUMENT_INTELLIGENCE_KEY`
  - [ ] `AZURE_AI_FOUNDRY_ENDPOINT`
  - [ ] `AZURE_AI_FOUNDRY_KEY`
  - [ ] `AZURE_AI_API_VERSION`
- [ ] Document Intelligence endpoint accessible
- [ ] AI Gateway health check passes
- [ ] Workflows list shows updated agent names
- [ ] Test workflow execution (e.g., carbon-estimator → CARBON-OPTIMIZER-AGENT)

---

## 🐛 Troubleshooting

### If secrets are not loaded:
1. Ensure Container App has managed identity
2. Verify Key Vault access policies (RBAC)
3. Check secret names match exactly (case-sensitive)
4. Restart Container App

### If workflows fail:
1. Check agent names match exactly (case-sensitive)
2. Verify agents are deployed and running in Azure AI Foundry
3. Check endpoint format: `https://greenchainz-resource.openai.azure.com`
4. Verify API key is correct
5. Check logs: `az containerapp logs show --name greenchainz-container --resource-group rg-greenchainz-prod-container`

### If endpoint format errors:
- Verify endpoint is: `https://greenchainz-resource.openai.azure.com` (not Foundry API format)
- Code expects OpenAI Service format
- Full URL: `{endpoint}/openai/deployments/{agent-name}/chat/completions`

---

## 📝 Configuration Details

### Environment Variables
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=secretref:azure-document-intelligence-endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=secretref:azure-document-intelligence-key
AZURE_AI_FOUNDRY_ENDPOINT=secretref:azure-ai-foundry-endpoint
AZURE_AI_FOUNDRY_KEY=secretref:azure-ai-foundry-key
AZURE_AI_API_VERSION=2024-02-15-preview
```

### Key Vault Secrets
- `Azure-Document-Intelligence-Endpoint` → `https://greenchainz-content-intel.cognitiveservices.azure.com/`
- `Azure-Document-Intelligence-Key` → (configured)
- `Azure-AI-Foundry-Endpoint` → `https://greenchainz-resource.openai.azure.com`
- `Azure-AI-Foundry-Key` → (configured)

### Agent Mappings
| Workflow | Agent Name |
|----------|-----------|
| material-alternative | DATA-REFINERY |
| rfq-scorer | RFQ-MATCHING |
| outreach-draft | OUTREACH-SCALER |
| compliance-check | COMPLIANCE-VALIDATOR-AGENT |
| carbon-estimator | CARBON-OPTIMIZER-AGENT |

---

## ✅ Completion Status

- [x] Key Vault configured
- [x] Code updated
- [x] Container App configured
- [ ] Code deployed
- [ ] Container App restarted
- [ ] Endpoints tested
- [ ] Configuration verified
