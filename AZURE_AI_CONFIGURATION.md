# Azure AI Configuration Guide

## ✅ Completed

### Document Intelligence
- **Endpoint**: `https://greenchainz-content-intel.cognitiveservices.azure.com/`
- **Key**: Configured in Key Vault as `Azure-Document-Intelligence-Key`
- **Environment Variables Needed**:
  - `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` → Key Vault: `Azure-Document-Intelligence-Endpoint`
  - `AZURE_DOCUMENT_INTELLIGENCE_KEY` → Key Vault: `Azure-Document-Intelligence-Key`

### Azure AI Foundry Agents
- **Workspace**: `greenchainz-foundry`
- **Resource**: `greenchainz-resource`
- **Endpoint**: `https://greenchainz-resource.services.ai.azure.com/api/projects/greenchainz`
- **API Key**: Configured in Key Vault as `Azure-AI-Foundry-Key`
- **Project**: `greenchainz`
- **Environment Variables Needed**:
  - `AZURE_AI_FOUNDRY_ENDPOINT` → Key Vault: `Azure-AI-Foundry-Endpoint`
  - `AZURE_AI_FOUNDRY_KEY` → Key Vault: `Azure-AI-Foundry-Key`
  - `AZURE_AI_API_VERSION` → `2024-02-15-preview` (default)

---

## ⚠️ Important Note: Endpoint Format Mismatch

**Your Agents (Project: `greenchainz`):**
- AZURE-COMMANDER (v2)
- CARBON-OPTIMIZER-AGENT (v6)
- COMPLIANCE-VALIDATOR-AGENT (v5)
- DATA-REFINERY (v3)
- Dynamic-Pricing-Agent (v8)
- GREENCHAINZ-ORCHESTRATOR (v2)
- gREENIE (v1)
- LEGAL-GUARDIAN (v3)
- OUTREACH-SCALER (v4)
- RFQ-MATCHING (v5)
- SEO-DOMINATOR (v3)
- VISUAL-ARCHITECT (v2)

**Current Code Status:**
- ✅ AI Gateway infrastructure exists
- ⚠️ **Endpoint Format Mismatch**: Code uses Azure OpenAI Service format (`/openai/deployments/${deploymentName}/chat/completions`), but you provided Foundry API format (`/api/projects/greenchainz`)

**The Issue:**
- Your endpoint: `https://greenchainz-resource.services.ai.azure.com/api/projects/greenchainz`
- Code expects: `https://greenchainz-resource.openai.azure.com` (then adds `/openai/deployments/...`)

**Potential Solutions:**
1. **If agents use OpenAI models**: Use OpenAI Service endpoint format instead
   - Try: `https://greenchainz-resource.openai.azure.com`
   - This would work with existing code
2. **If using Foundry API directly**: Code needs modification to use Foundry API format
   - Current code would need changes to call Foundry agents API
   - Different authentication/request format

---

## 🔍 Next Steps to Resolve

---

## 🔧 Current Environment Variables Needed

### Document Intelligence (Ready to Configure)
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=secretref:azure-document-intelligence-endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=secretref:azure-document-intelligence-key
```

### AI Foundry (Configured in Key Vault, but endpoint format needs verification)
```bash
AZURE_AI_FOUNDRY_ENDPOINT=secretref:azure-ai-foundry-endpoint  # Currently: Foundry API format (may need OpenAI format)
AZURE_AI_FOUNDRY_KEY=secretref:azure-ai-foundry-key
AZURE_AI_API_VERSION=2024-02-15-preview
```

---

## 📝 Notes

- Document Intelligence is separate from AI Foundry ✅
- **IMPORTANT**: The endpoint format you provided is Foundry API format, but the code expects OpenAI Service format
- **Action Required**: Test if agents work with OpenAI endpoint format, or code needs modification for Foundry API
- Check Azure AI Foundry portal to see if agents expose OpenAI-compatible endpoints
