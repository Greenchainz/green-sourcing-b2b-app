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

## ✅ Configuration Complete

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
- ✅ **Endpoint Format**: Using OpenAI Service format (agents use OpenAI models)
- ✅ **Endpoint Configured**: `https://greenchainz-resource.openai.azure.com`
- ✅ **Code Compatibility**: Code structure matches endpoint format

**Endpoint Format:**
- Base endpoint: `https://greenchainz-resource.openai.azure.com`
- Code appends: `/openai/deployments/{agent-name}/chat/completions`
- Example: `https://greenchainz-resource.openai.azure.com/openai/deployments/CARBON-OPTIMIZER-AGENT/chat/completions?api-version=2024-02-15-preview`

---

## 🔍 Agent Name Mapping

---

## 🔧 Current Environment Variables Needed

### Document Intelligence (Ready to Configure)
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=secretref:azure-document-intelligence-endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=secretref:azure-document-intelligence-key
```

### AI Foundry (Configured in Key Vault)
```bash
AZURE_AI_FOUNDRY_ENDPOINT=secretref:azure-ai-foundry-endpoint  # OpenAI format: https://greenchainz-resource.openai.azure.com
AZURE_AI_FOUNDRY_KEY=secretref:azure-ai-foundry-key
AZURE_AI_API_VERSION=2024-02-15-preview
```

**Agent Names to Use:**
Your agents will be called using their exact names (case-sensitive):
- CARBON-OPTIMIZER-AGENT
- COMPLIANCE-VALIDATOR-AGENT
- RFQ-MATCHING
- etc.

**Note:** The existing workflows use deployment names like `gpt-4o`. You may need to map workflow deployment names to your actual agent names, or update workflows to use agent names directly.

---

## 📝 Notes

- Document Intelligence is separate from AI Foundry ✅
- Agents use OpenAI models, so OpenAI endpoint format is correct ✅
- Endpoint configured: `https://greenchainz-resource.openai.azure.com` ✅
- Code structure matches endpoint format ✅
- **Next**: Map workflow deployment names to your agent names, or update workflows
