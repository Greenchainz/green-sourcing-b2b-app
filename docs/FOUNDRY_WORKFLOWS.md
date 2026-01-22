# Azure AI Foundry Workflows

This document describes the Foundry workflows for GreenChainz agent orchestration.

## Product Validation Pipeline

**Purpose:** Validate supplier materials against sustainability criteria using parallel agent execution.

**Trigger:** HTTP POST to `/api/agents/trigger-workflow`

**Workflow YAML:**

```yaml
name: "Product Validation Pipeline"
description: "Validate supplier material against sustainability criteria"

triggers:
  - type: http
    endpoint: "/workflows/validate-product"

steps:
  # STEP 1: Extract data from uploaded PDF
  - id: "extract_document"
    type: "action"
    action: "http_request"
    url: "{{ env.APP_BASE_URL }}/api/extract-document"
    method: "POST"
    body:
      document_url: "{{ trigger.document_url }}"
      document_type: "{{ trigger.document_type }}"
    output_var: "extracted_data"

  # STEP 2: Parallel validation with agents
  - id: "validate_parallel"
    type: "parallel"
    branches:
      - name: "compliance_check"
        steps:
          - agent: "COMPLIANCE-VALIDATOR-AGENT"
            input:
              epd_data: "{{ extracted_data.extracted_data }}"
              required_certs: ["FSC", "LEED"]
            output_var: "compliance_result"

      - name: "carbon_check"
        steps:
          - agent: "CARBON-OPTIMIZER-AGENT"
            input:
              gwp: "{{ extracted_data.extracted_data.gwp }}"
              recycled_content: "{{ extracted_data.extracted_data.recycled_content_percentage }}"
              baseline: "{{ trigger.gwp_baseline }}"
            output_var: "carbon_result"

      - name: "rfq_match"
        steps:
          - agent: "RFQ-MATCHING"
            input:
              rfq: "{{ trigger.rfq }}"
              material_spec: "{{ extracted_data.extracted_data }}"
            output_var: "match_result"

  # STEP 3: Validation gate
  - id: "validation_gate"
    type: "condition"
    condition: |
      {{ validate_parallel.compliance_result.passed and
         validate_parallel.carbon_result.passed and
         validate_parallel.match_result.matched }}
    then_steps:
      - id: "compose_output"
        type: "action"
        action: "return"
        data:
          status: "APPROVED"
          compliance_score: "{{ validate_parallel.compliance_result.score }}"
          carbon_score: "{{ validate_parallel.carbon_result.score }}"
          matched_suppliers: "{{ validate_parallel.match_result.suppliers }}"
    else_steps:
      - id: "flag_failure"
        type: "action"
        action: "return"
        data:
          status: "FLAGGED_FOR_REVIEW"
          failures:
            compliance: "{{ validate_parallel.compliance_result }}"
            carbon: "{{ validate_parallel.carbon_result }}"
            match: "{{ validate_parallel.match_result }}"

outputs:
  - name: "validation_result"
    type: "object"
```

## Founding 50 Outreach Campaign

**Purpose:** Scrape prospects and send cold emails via Logic App.

**Trigger:** Scheduled daily at 9:00 AM

**Workflow YAML:**

```yaml
name: "Founding 50 Outreach Campaign"
description: "Scrape prospects + send cold emails via Logic App"

triggers:
  - type: "schedule"
    interval: "daily"
    time: "09:00 AM"

steps:
  - id: "trigger_scraper"
    type: "action"
    action: "http_request"
    url: "{{ env.LOGIC_APP_SCRAPER_WEBHOOK }}"
    method: "POST"
    body:
      query: "sustainable building materials suppliers USA"
      limit: 50
    output_var: "scraped_prospects"

  - id: "enrich_prospects"
    agent: "OUTREACH-SCALER"
    input:
      prospects: "{{ trigger_scraper.scraped_prospects }}"
      campaign_template: "founding_50"
      personalization_fields: ["company_name", "contact_name", "industry"]
    output_var: "enriched_outreach"

  - id: "send_emails"
    type: "action"
    action: "http_request"
    url: "{{ env.LOGIC_APP_EMAIL_WEBHOOK }}"
    method: "POST"
    body:
      recipients: "{{ enriched_outreach.email_list }}"
      subject: "{{ enriched_outreach.email_subject }}"
      body: "{{ enriched_outreach.email_body }}"
      tracking_id: "{{ enriched_outreach.campaign_id }}"
    output_var: "send_result"

  - id: "log_campaign"
    type: "action"
    action: "http_request"
    url: "{{ env.BACKEND_API_URL }}/api/outreach/campaigns"
    method: "POST"
    body:
      campaign_id: "{{ enriched_outreach.campaign_id }}"
      prospects_sent: "{{ send_result.sent_count }}"
      timestamp: "{{ now() }}"
      status: "{{ send_result.status }}"
    output_var: "log_result"

outputs:
  - name: "campaign_metrics"
    type: "object"
```

## Deployment Instructions

**Required Environment Variables:**
- `APP_BASE_URL` - Your application's base URL (e.g., `http://localhost:3000` for dev, `https://greenchainz.com` for prod)
- `BACKEND_API_URL` - Your backend API URL (e.g., `http://localhost:3000` or `https://api.greenchainz.com`)

**Required Agent Names in Azure AI Foundry:**
The workflows reference these exact agent names. Ensure they exist before deploying:
- `COMPLIANCE-VALIDATOR-AGENT`
- `CARBON-OPTIMIZER-AGENT`
- `RFQ-MATCHING`
- `OUTREACH-SCALER`

1. **Login to Azure AI Foundry:**
   ```bash
   az login
   az account set --subscription greenchainz
   ```

2. **Deploy workflows:**
   - Go to [Azure AI Foundry Studio](https://ai.azure.com)
   - Navigate to `greenchainz` project
   - Go to **Build > Workflows**
   - Click **+ New Workflow**
   - Paste YAML above
   - Click **Deploy**

3. **Enable agents:**
   - Go to **Build > Agents**
   - Enable (3/3 instances) for:
     - RFQ-MATCHING
     - COMPLIANCE-VALIDATOR-AGENT
     - CARBON-OPTIMIZER-AGENT
     - OUTREACH-SCALER

4. **Test locally:**
   ```bash
   curl -X POST http://localhost:3000/api/agents/trigger-workflow \
     -H "Content-Type: application/json" \
     -d '{
       "workflow_name": "Product Validation Pipeline",
       "payload": {
         "document_url": "https://example.com/epd.pdf",
         "document_type": "epd",
         "gwp_baseline": 120,
         "rfq": {"material_type": "steel", "quantity": 1000}
       }
     }'
   ```

## Agents to Delete

These agents are redundant and should be archived:

- ❌ GREENCHAINZ-ORCHESTRATOR (replaced by workflows)
- ❌ AZURE-COMMANDER (replaced by workflows)
- ❌ LEGAL-GUARDIAN (same function as COMPLIANCE-VALIDATOR)
- ❌ gREENIE (Intercom handles chatbot)
- ❌ SEO-DOMINATOR (marketing, not MVP)
- ❌ VISUAL-ARCHITECT (not MVP)

## Audit Trail

All agent executions are logged to console with:
- Timestamp
- Workflow/agent name
- Input payload summary
- Confidence scores (for Document Intelligence)
- Execution ID

For production, configure Azure Application Insights:
```bash
AZURE_APP_INSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;...
```
