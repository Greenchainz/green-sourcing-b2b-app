# AI Agent Mapping Guide

## ✅ Configuration Complete

**Endpoint Format:** OpenAI Service (agents use OpenAI models)
- **Base Endpoint:** `https://greenchainz-resource.openai.azure.com`
- **Full URL Format:** `https://greenchainz-resource.openai.azure.com/openai/deployments/{agent-name}/chat/completions?api-version=2024-02-15-preview`

---

## 🔍 Agent Name Mapping

### Your Foundry Agents (12 agents)
1. **AZURE-COMMANDER** (v2)
2. **CARBON-OPTIMIZER-AGENT** (v6)
3. **COMPLIANCE-VALIDATOR-AGENT** (v5)
4. **DATA-REFINERY** (v3)
5. **Dynamic-Pricing-Agent** (v8)
6. **GREENCHAINZ-ORCHESTRATOR** (v2)
7. **gREENIE** (v1)
8. **LEGAL-GUARDIAN** (v3)
9. **OUTREACH-SCALER** (v4)
10. **RFQ-MATCHING** (v5)
11. **SEO-DOMINATOR** (v3)
12. **VISUAL-ARCHITECT** (v2)

### Existing Workflows (5 workflows)
Current workflows use generic deployment names like `gpt-4o`:

1. **material-alternative** → `azureDeploymentName: 'gpt-4o'`
2. **rfq-scorer** → `azureDeploymentName: 'gpt-4o'`
3. **outreach-draft** → `azureDeploymentName: 'gpt-4o'`
4. **compliance-check** → `azureDeploymentName: 'gpt-4o'`
5. **carbon-estimator** → `azureDeploymentName: 'gpt-4o'`

---

## 🔗 Suggested Mapping

Based on functionality, here's a suggested mapping:

| Workflow Name | Suggested Agent | Notes |
|--------------|----------------|-------|
| `material-alternative` | **DATA-REFINERY** or **gREENIE** | Material alternatives analysis |
| `rfq-scorer` | **RFQ-MATCHING** | RFQ scoring and matching |
| `outreach-draft` | **OUTREACH-SCALER** | Outreach message drafting |
| `compliance-check` | **COMPLIANCE-VALIDATOR-AGENT** | Compliance validation |
| `carbon-estimator` | **CARBON-OPTIMIZER-AGENT** | Carbon footprint estimation |

**Additional agents available for custom workflows:**
- **AZURE-COMMANDER** - Command/control operations
- **Dynamic-Pricing-Agent** - Pricing optimization
- **GREENCHAINZ-ORCHESTRATOR** - Orchestration
- **LEGAL-GUARDIAN** - Legal/compliance review
- **SEO-DOMINATOR** - SEO optimization
- **VISUAL-ARCHITECT** - Visual analysis

---

## 📝 How to Update Workflows

### Option 1: Update Workflow Deployment Names

Update workflows in the database to use agent names:

```sql
-- Example: Map carbon-estimator to CARBON-OPTIMIZER-AGENT
UPDATE AI_Workflows 
SET AzureDeploymentName = 'CARBON-OPTIMIZER-AGENT'
WHERE Name = 'carbon-estimator';

-- Example: Map rfq-scorer to RFQ-MATCHING
UPDATE AI_Workflows 
SET AzureDeploymentName = 'RFQ-MATCHING'
WHERE Name = 'rfq-scorer';
```

### Option 2: Update Workflow Registry Code

Update `backend/services/ai-gateway/workflowRegistry.js`:

```javascript
{
    name: 'carbon-estimator',
    azureDeploymentName: 'CARBON-OPTIMIZER-AGENT',  // Changed from 'gpt-4o'
    // ... rest of config
}
```

### Option 3: Use Admin API

Update workflows via the admin API endpoint:
```http
PATCH /api/v1/ai-gateway/admin/workflows/{workflowId}
Content-Type: application/json

{
  "azureDeploymentName": "CARBON-OPTIMIZER-AGENT"
}
```

---

## ⚠️ Important Notes

1. **Case Sensitivity**: Agent names are case-sensitive (e.g., `CARBON-OPTIMIZER-AGENT`, not `carbon-optimizer-agent`)

2. **Deployment Names**: The `azureDeploymentName` field in workflows must match the exact agent name as shown in Azure AI Foundry

3. **Agent Availability**: Ensure the agents you're mapping to are actually deployed and running in Azure AI Foundry

4. **Testing**: After mapping, test each workflow to ensure the agent responds correctly

5. **Default Behavior**: If a workflow doesn't have a deployment name set, it will use the default endpoint but may fail

---

## 🧪 Testing

After updating mappings, test workflows:

```bash
# Test carbon-estimator workflow
POST /api/v1/ai-gateway/carbon-estimate
Authorization: Bearer {token}
Content-Type: application/json

{
  "materials": [...],
  "projectDetails": {...}
}
```

Check logs to verify the correct agent is called:
```
https://greenchainz-resource.openai.azure.com/openai/deployments/CARBON-OPTIMIZER-AGENT/chat/completions
```
