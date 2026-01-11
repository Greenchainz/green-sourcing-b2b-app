/**
 * Intercom Persona Service
 * 
 * Role-based conversation adaptation using GPT-4o
 * Implements the "Matrix of Motivation" for procurement decision-makers
 */

// Lazy load OpenAI to allow testing without it
let AzureOpenAI;
try {
  const openai = require('openai');
  AzureOpenAI = openai.AzureOpenAI;
} catch (e) {
  console.warn('OpenAI module not available - persona service will work in limited mode');
}

/**
 * Role persona definitions (Hard Metrics focus)
 */
const ROLE_PERSONAS = {
  'Quantity Surveyor': {
    primaryDrivers: ['ROI', 'Cost Analysis', 'Carbon Accounting'],
    avoidTopics: ['Saving the planet', 'Feel-good sustainability'],
    keyPhrases: ['7-year payback', 'Total cost of ownership', 'Carbon tax exposure'],
    decisionCriteria: ['First cost vs lifecycle cost', 'ROI calculation', 'Regulatory compliance costs']
  },
  
  'Drywall Subcontractor': {
    primaryDrivers: ['Installation Speed', 'Labor Efficiency', 'Material Weight'],
    avoidTopics: ['Environmental impact', 'Brand reputation'],
    keyPhrases: ['Lightweight boards', 'Less fatigue', 'Faster installation', 'More jobs per week'],
    decisionCriteria: ['Weight per sq ft', 'Installation time', 'Crew size', 'Tool requirements']
  },
  
  'Asset Manager': {
    primaryDrivers: ['Asset Liquidity', 'Exit Strategy', 'Stranded Asset Risk'],
    avoidTopics: ['Altruism', 'Corporate responsibility'],
    keyPhrases: ['Protect liquidity', 'Avoid stranded assets', 'Future-proof investment', 'Regulatory resilience'],
    decisionCriteria: ['Building valuation', 'Regulatory exposure', 'Tenant demand', 'Resale value']
  },
  
  'Insurance Risk Manager': {
    primaryDrivers: ['Liability Reduction', 'Fire Safety', 'Premium Reduction'],
    avoidTopics: ['Environmental benefits'],
    keyPhrases: ['Non-combustible materials', 'Lower premiums', 'Fire resistance', 'Risk mitigation'],
    decisionCriteria: ['Fire classification', 'Material combustibility', 'Safety certifications']
  },
  
  'Facility Manager': {
    primaryDrivers: ['Operational Costs', 'Maintenance Efficiency', 'Labor Savings'],
    avoidTopics: ['Brand image'],
    keyPhrases: ['No-strip flooring', 'Reduced maintenance', 'Lower operational burden', 'Labor cost reduction'],
    decisionCriteria: ['Maintenance frequency', 'Cleaning requirements', 'Product durability']
  },
  
  'Architect': {
    primaryDrivers: ['Design Authority', 'Specification Defense', 'Liability Protection'],
    avoidTopics: ['Generic green marketing'],
    keyPhrases: ['Defensible specifications', 'Third-party verification', 'Value engineering protection'],
    decisionCriteria: ['Verified certifications', 'Specification defensibility', 'Performance guarantees']
  },
  
  'General Contractor': {
    primaryDrivers: ['Schedule Adherence', 'Budget Control', 'Margin Protection'],
    avoidTopics: ['Environmental altruism'],
    keyPhrases: ['On-time delivery', 'Fast-track installation', 'Budget certainty', 'Labor efficiency'],
    decisionCriteria: ['Lead times', 'Installation speed', 'Material availability']
  },
  
  'Flooring Subcontractor': {
    primaryDrivers: ['Installation Speed', 'Labor Costs', 'Material Handling'],
    avoidTopics: ['Brand perception'],
    keyPhrases: ['Click-lock installation', 'No adhesive', 'Lightweight', 'Higher productivity'],
    decisionCriteria: ['Installation method', 'Material weight', 'Maintenance needs']
  },
  
  'Specification Writer': {
    primaryDrivers: ['Specification Defense', 'Verification Data', 'Compliance'],
    avoidTopics: ['Marketing claims'],
    keyPhrases: ['Third-party verified', 'Defensible specs', 'Substitution criteria', 'Professional standards'],
    decisionCriteria: ['CDPH v1.2', 'Verified EPD', 'Performance test data']
  }
};

/**
 * Map job title to role
 */
function mapJobTitleToRole(jobTitle) {
  if (!jobTitle) return 'Unknown';
  
  const titleLower = jobTitle.toLowerCase();
  
  // Exact matches first
  for (const role of Object.keys(ROLE_PERSONAS)) {
    if (titleLower.includes(role.toLowerCase())) {
      return role;
    }
  }
  
  // Fuzzy matches
  if (titleLower.includes('quantity') || titleLower.includes('surveyor') || titleLower.includes('cost')) {
    return 'Quantity Surveyor';
  }
  if (titleLower.includes('drywall') || titleLower.includes('gypsum')) {
    return 'Drywall Subcontractor';
  }
  if (titleLower.includes('asset') || titleLower.includes('portfolio')) {
    return 'Asset Manager';
  }
  if (titleLower.includes('insurance') || titleLower.includes('risk')) {
    return 'Insurance Risk Manager';
  }
  if (titleLower.includes('facility') || titleLower.includes('building manager')) {
    return 'Facility Manager';
  }
  if (titleLower.includes('architect')) {
    return 'Architect';
  }
  if (titleLower.includes('contractor') && !titleLower.includes('sub')) {
    return 'General Contractor';
  }
  if (titleLower.includes('flooring')) {
    return 'Flooring Subcontractor';
  }
  if (titleLower.includes('spec') || titleLower.includes('specification')) {
    return 'Specification Writer';
  }
  
  return 'Unknown';
}

/**
 * Get persona for a role
 */
function getPersona(role) {
  return ROLE_PERSONAS[role] || {
    primaryDrivers: ['Cost', 'Quality', 'Reliability'],
    avoidTopics: [],
    keyPhrases: ['Professional service', 'Quality products', 'Reliable delivery'],
    decisionCriteria: ['Product performance', 'Pricing', 'Support']
  };
}

/**
 * Generate role-adapted response using GPT-4o
 */
async function adaptMessageToRole(userMessage, role, jobTitle, conversationHistory = []) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  if (!endpoint || !apiKey || !AzureOpenAI) {
    console.warn('Azure OpenAI not configured - returning generic response');
    return {
      adaptedResponse: 'Thank you for your message. How can we assist you today?',
      promptUsed: 'Generic (no AI)',
      tokensUsed: 0
    };
  }

  const persona = getPersona(role);
  
  // Build system prompt based on role
  const systemPrompt = `You are a specialized assistant for GreenChainz, a Risk & Asset Management Tool for sustainable material procurement.

**CRITICAL: This is NOT a "green marketplace" - it's a professional risk management and financial optimization platform.**

**User Profile:**
- Role: ${role}
- Job Title: ${jobTitle}

**Communication Rules (STRICTLY ENFORCE):**

1. **FOCUS ON HARD METRICS** (Cost, Liability, Speed):
   ${persona.primaryDrivers.map(d => `   - ${d}`).join('\n')}

2. **AVOID SOFT METRICS** (Brand, Altruism):
   ${persona.avoidTopics.map(t => `   - NEVER mention: "${t}"`).join('\n')}

3. **USE THESE KEY PHRASES:**
   ${persona.keyPhrases.map(p => `   - "${p}"`).join('\n')}

4. **DECISION CRITERIA THEY CARE ABOUT:**
   ${persona.decisionCriteria.map(c => `   - ${c}`).join('\n')}

**Tone Guidelines:**
- Professional, data-driven, and metrics-focused
- Talk about financial risk, operational efficiency, and liability reduction
- NEVER use emotional appeals or "save the planet" language
- Focus on ROI, cost savings, risk mitigation, and competitive advantage

**Response Format:**
- Start with their primary business concern
- Provide specific metrics and data points
- End with a clear action or next step

Remember: These are professionals making high-stakes procurement decisions. Respect their intelligence and focus on what they're paid to optimize.`;

  const userContext = `The user asked: "${userMessage}"

Respond in a way that aligns with their role (${role}) and business priorities. Focus on hard metrics and avoid soft sustainability messaging.`;

  try {
    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: '2024-08-01-preview',
      deployment
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4), // Include last 4 messages for context
      { role: 'user', content: userContext }
    ];

    const response = await client.chat.completions.create({
      model: deployment,
      messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const adaptedResponse = response.choices[0]?.message?.content || 'How can I assist you today?';
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      adaptedResponse,
      promptUsed: systemPrompt,
      tokensUsed
    };

  } catch (error) {
    console.error('GPT-4o adaptation failed:', error.message);
    return {
      adaptedResponse: 'Thank you for reaching out. One of our specialists will respond shortly.',
      promptUsed: 'Error fallback',
      tokensUsed: 0
    };
  }
}

/**
 * Process Intercom message with role adaptation
 */
async function processIntercomMessage(userId, userMessage, userData = {}) {
  const jobTitle = userData.jobTitle || userData.job_title || '';
  const role = mapJobTitleToRole(jobTitle);
  const conversationHistory = userData.conversationHistory || [];

  console.log(`[Persona Service] Processing message for ${role} (${jobTitle})`);

  const result = await adaptMessageToRole(userMessage, role, jobTitle, conversationHistory);

  return {
    userId,
    role,
    jobTitle,
    userMessage,
    ...result,
    metadata: {
      persona: getPersona(role),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Get persona summary for user
 */
function getPersonaSummary(jobTitle) {
  const role = mapJobTitleToRole(jobTitle);
  const persona = getPersona(role);
  
  return {
    role,
    jobTitle,
    ...persona,
    communicationStrategy: role !== 'Unknown' 
      ? `Optimized for ${role} - focus on ${persona.primaryDrivers.join(', ')}`
      : 'Generic professional communication'
  };
}

module.exports = {
  mapJobTitleToRole,
  getPersona,
  adaptMessageToRole,
  processIntercomMessage,
  getPersonaSummary,
  ROLE_PERSONAS
};
