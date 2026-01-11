# Intercom Persona Service - Matrix of Motivation

## Overview

The Intercom Persona Service implements role-based language adaptation to ensure conversations focus on **Hard Metrics** (Cost, Liability, Speed) rather than **Soft Metrics** (Brand, Altruism, "saving the planet"). This service recognizes that GreenChainz is a **Risk & Asset Management Tool**, not a generic "green marketplace".

## Business Philosophy

**Core Principle**: Procurement professionals are paid to optimize financial risk, operational efficiency, and liability - NOT to "save the planet". Our communication must respect their intelligence and business priorities.

**The Problem with Generic "Green" Marketing**:
- ❌ "Save the planet"
- ❌ "Be sustainable"
- ❌ "Good for the environment"
- ❌ "Corporate responsibility"

**The Solution - Hard Metrics**:
- ✅ ROI and payback periods
- ✅ Liability reduction
- ✅ Installation speed and labor savings
- ✅ Asset liquidity protection
- ✅ Regulatory compliance

## Matrix of Motivation

### 9 Key Roles & Their Business Drivers

#### 1. Quantity Surveyor
**DO Talk About:**
- 7-year payback period
- Total cost of ownership
- Carbon accounting compliance
- ROI calculation
- Risk-adjusted returns

**DON'T Talk About:**
- Saving the planet
- Environmental feel-good
- Brand image

**Example Message**:
> "Based on your project specs, this insulation delivers a 6.8-year payback through reduced HVAC costs. Under current carbon tax regimes, you'll avoid €45K in exposure over the building's lifecycle. Your ROI calculation should factor in the regulatory compliance benefit."

---

#### 2. Drywall Subcontractor
**DO Talk About:**
- Lightweight boards (reduce fatigue)
- Faster installation (more jobs/week)
- Less crew time required
- Easier material handling
- Reduced worker injuries

**DON'T Talk About:**
- Environmental impact
- Corporate sustainability

**Example Message**:
> "These lightweight boards cut installation time by 22%. Your crew can handle them solo without back strain, meaning you can complete an extra job per week. That's 52 more billable projects annually - straight to your bottom line."

---

#### 3. Asset Manager
**DO Talk About:**
- Protect asset liquidity
- Avoid stranded assets
- Future-proof investment
- Regulatory resilience
- Exit value optimization

**DON'T Talk About:**
- Altruism
- Feel-good sustainability

**Example Message**:
> "Buildings with verified carbon data are trading at 7-12% premiums in major markets. This specification protects your portfolio from regulatory devaluation and ensures tenant demand when you're ready to exit. It's liquidity protection, not environmentalism."

---

#### 4. Insurance Risk Manager
**DO Talk About:**
- Non-combustible materials
- Lower insurance premiums
- Fire resistance ratings
- Claims prevention
- Liability reduction

**DON'T Talk About:**
- Environmental benefits

**Example Message**:
> "Class A1 non-combustible insulation typically reduces fire insurance premiums by 8-15%. Your actuarial models will show material ROI through claims prevention. This is risk mitigation with documented underwriting benefits."

---

#### 5. Facility Manager
**DO Talk About:**
- No-strip flooring saves costs
- Reduced maintenance cycles
- Lower operational burden
- Extended product lifespan
- Labor cost reduction

**DON'T Talk About:**
- Brand image

**Example Message**:
> "No-strip flooring eliminates your annual €12K maintenance contract. Polish-only protocol means your crew spends 40% less time on floor care. That's labor savings you can reallocate to higher-value tasks."

---

#### 6. Architect
**DO Talk About:**
- Defensible specifications
- Third-party verification
- Value engineering protection
- LEED/WELL compliance
- Professional liability reduction

**DON'T Talk About:**
- Generic green marketing

**Example Message**:
> "CDPH v1.2 certification gives you defensible specifications that resist value engineering. When contractors propose substitutes, you have verified data to reject inferior products. It's professional liability protection through documentation."

---

#### 7. General Contractor
**DO Talk About:**
- On-time delivery guaranteed
- Fast-track installation
- Budget certainty
- Schedule compression
- Labor efficiency

**DON'T Talk About:**
- Environmental altruism

**Example Message**:
> "Our lead time is 14 days with zero variance. Fast-track installation means your schedule compresses by 3-5 days, giving you liquidated damages protection. Budget certainty through fixed pricing eliminates your cost overrun risk."

---

#### 8. Flooring Subcontractor
**DO Talk About:**
- Click-lock installation (faster jobs)
- No adhesive (cleaner work)
- Lightweight (less fatigue)
- No callbacks for maintenance
- Higher daily productivity

**DON'T Talk About:**
- Brand perception

**Example Message**:
> "Click-lock installation lets you complete rooms in half the time. No adhesive means zero drying time - you're off-site faster and onto the next job. That's 40% more revenue per day without adding crew."

---

#### 9. Specification Writer
**DO Talk About:**
- Third-party verified data
- Defensible specifications
- Substitution rejection criteria
- Compliance certainty
- Professional standards

**DON'T Talk About:**
- Marketing claims

**Example Message**:
> "Every data point is third-party verified through CDPH v1.2 and EPD certification. Your specifications have documented performance criteria that create objective substitution rejection standards. It's professional due diligence through verified data."

---

## Technical Implementation

### Architecture

```
User Message (Intercom)
    ↓
[Job Title Detection]
    ↓
[Role Mapping Service]
    ↓
[Persona Selection]
    ↓
[GPT-4o Adaptation]
    ↓
Role-Optimized Response
```

### API Endpoints

#### 1. Adapt Message to Role
```bash
POST /api/v1/intercom/adapt-message

Headers:
  x-internal-api-key: YOUR_KEY

Body:
{
  "userId": "user_12345",
  "userMessage": "Tell me about your flooring products",
  "jobTitle": "Facility Manager",
  "conversationHistory": []
}

Response:
{
  "success": true,
  "userId": "user_12345",
  "role": "Facility Manager",
  "adaptedResponse": "Our no-strip flooring eliminates annual maintenance contracts, saving facilities an average of €12K per year. The polish-only protocol reduces crew time by 40%, letting you reallocate labor to higher-value tasks...",
  "promptUsed": "...",
  "tokensUsed": 245,
  "metadata": {
    "persona": {
      "primaryDrivers": ["Operational Costs", "Maintenance Efficiency"],
      "keyPhrases": ["No-strip flooring", "Lower operational burden"]
    }
  }
}
```

#### 2. Get Persona Summary
```bash
GET /api/v1/intercom/persona/Quantity%20Surveyor

Response:
{
  "success": true,
  "role": "Quantity Surveyor",
  "jobTitle": "Quantity Surveyor",
  "primaryDrivers": ["ROI", "Cost Analysis", "Carbon Accounting"],
  "avoidTopics": ["Saving the planet", "Feel-good sustainability"],
  "keyPhrases": ["7-year payback", "Total cost of ownership"],
  "decisionCriteria": ["First cost vs lifecycle cost", "ROI calculation"],
  "communicationStrategy": "Optimized for Quantity Surveyor - focus on ROI, Cost Analysis, Carbon Accounting"
}
```

#### 3. Webhook Handler (Auto-Adaptation)
```bash
POST /api/v1/intercom/webhook/conversation

Body:
{
  "type": "conversation.user.replied",
  "data": {
    "item": {
      "user": {
        "id": "user_123",
        "custom_attributes": {
          "job_title": "Asset Manager"
        }
      },
      "conversation_parts": {
        "conversation_parts": [{
          "body": "What's special about your products?"
        }]
      }
    }
  }
}

Response:
{
  "received": true
}

// Auto-generates adapted response asynchronously
```

### Job Title → Role Mapping

```javascript
const mappings = {
  'Quantity Surveyor': ['quantity', 'surveyor', 'cost consultant'],
  'Drywall Subcontractor': ['drywall', 'gypsum', 'sheetrock'],
  'Asset Manager': ['asset', 'portfolio', 'property manager'],
  'Insurance Risk Manager': ['insurance', 'risk', 'underwriting'],
  'Facility Manager': ['facility', 'building manager', 'operations'],
  'Architect': ['architect', 'design'],
  'General Contractor': ['contractor', 'gc', 'construction manager'],
  'Flooring Subcontractor': ['flooring', 'floor installer'],
  'Specification Writer': ['spec writer', 'specification', 'technical writer']
};
```

### GPT-4o System Prompt Template

```
You are a specialized assistant for GreenChainz, a Risk & Asset Management Tool 
for sustainable material procurement.

**CRITICAL: This is NOT a "green marketplace" - it's a professional risk 
management and financial optimization platform.**

**User Profile:**
- Role: {role}
- Job Title: {jobTitle}

**Communication Rules (STRICTLY ENFORCE):**

1. **FOCUS ON HARD METRICS** (Cost, Liability, Speed)
2. **AVOID SOFT METRICS** (Brand, Altruism, "saving the planet")
3. **USE ROLE-SPECIFIC KEY PHRASES**
4. **ADDRESS THEIR ACTUAL DECISION CRITERIA**

**Tone Guidelines:**
- Professional, data-driven, metrics-focused
- Talk about financial risk, operational efficiency, liability reduction
- NEVER use emotional appeals
- Focus on ROI, cost savings, risk mitigation, competitive advantage
```

## Integration Guide

### Backend Integration

```javascript
const personaService = require('./services/intercom/personaService');

// Process incoming message
const result = await personaService.processIntercomMessage(
  userId,
  userMessage,
  { jobTitle: user.jobTitle }
);

console.log(`Adapted for ${result.role}: ${result.adaptedResponse}`);
```

### Frontend Integration

```typescript
import { PersonaContext } from '@/lib/types/intercom-persona';

// Get user's persona configuration
const response = await fetch(`/api/v1/intercom/persona/${encodeURIComponent(jobTitle)}`);
const persona = await response.json();

// Display persona-specific messaging
console.log(`Communication optimized for: ${persona.role}`);
console.log(`Focus areas: ${persona.primaryDrivers.join(', ')}`);
```

## Testing

### Manual Testing

```bash
cd /home/runner/work/green-sourcing-b2b-app/green-sourcing-b2b-app

# Run persona test suite
node backend/tests/manual/test-intercom-persona.js
```

**Test Coverage:**
- ✅ Job title to role mapping (9 roles)
- ✅ Persona configuration validation
- ✅ Hard metrics vs soft metrics verification
- ✅ Decision criteria mapping
- ✅ Communication strategy validation

### Test Results

```
✅ Role Mapping: All key roles detected correctly
✅ Hard Metrics: Focus on Cost, Liability, Speed
✅ Soft Metrics: Properly avoided (planet, altruism)
✅ Decision Criteria: Role-specific concerns identified
✅ Communication Strategy: Data-driven, professional

🎯 Matrix of Motivation: ACTIVE
📊 Risk & Asset Management Focus: ENABLED
🚫 Generic "Green Marketplace" Language: DISABLED
```

## Configuration

### Environment Variables

```bash
# Azure OpenAI for message adaptation
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

# Internal API key for webhook security
INTERNAL_API_KEY=your-internal-key
```

### Intercom Custom Attributes

Configure these custom attributes in Intercom:

- `job_title` (string) - User's job title for role mapping
- `role` (string) - Mapped role (auto-populated)
- `persona_primary_drivers` (string) - Their business priorities
- `communication_strategy` (string) - Optimization approach

## Performance

- **Role Detection**: <5ms
- **Persona Lookup**: <1ms
- **GPT-4o Adaptation**: 1-2 seconds
- **Total Response Time**: 1-2 seconds

## Security

- **Role-Based Access**: Internal API key required
- **No PII Storage**: Only job titles processed
- **Audit Trail**: All adaptations logged via Azure Application Insights
- **Rate Limiting**: Standard Intercom webhook rate limits

## CSV Schema Integration

**Source Document**: `Sustainable Material Procurement Decision-Makers and Logic - Table 1.csv`

**Column Mapping**:
- `Job Title` → Role mapping
- `Decision Logic` → Primary drivers and criteria
- `Pain Points` → avoidTopics configuration
- `Success Metrics` → keyPhrases templates

## Future Enhancements

1. **Machine Learning**: Train on actual conversation outcomes
2. **A/B Testing**: Compare adapted vs generic responses
3. **Sentiment Analysis**: Track user engagement by role
4. **Custom Personas**: Allow organizations to define custom roles
5. **Multi-language**: Extend to other languages with regional business cultures

## Support

For issues or questions about the Persona Service, create an issue in the repository.

---

**Communication Philosophy**: 🎯 **Hard Metrics First, Soft Metrics Never**

**Platform Identity**: 📊 **Risk & Asset Management Tool** (not a green marketplace)

**Target Audience**: 💼 **Professional Procurement Decision-Makers** (not consumers)
