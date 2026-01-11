/**
 * Intercom Persona Types
 * 
 * Role-based language adaptation for the Matrix of Motivation
 * Source: Sustainable Material Procurement Decision-Makers and Logic
 */

/**
 * User roles from the procurement decision-maker matrix
 */
export type UserRole =
  | 'Quantity Surveyor'
  | 'Drywall Subcontractor'
  | 'Asset Manager'
  | 'Insurance Risk Manager'
  | 'Facility Manager'
  | 'Architect'
  | 'General Contractor'
  | 'Flooring Subcontractor'
  | 'Specification Writer'
  | 'Unknown';

/**
 * Motivation drivers for each role (Hard Metrics focus)
 */
export interface RoleMotivation {
  role: UserRole;
  primaryDrivers: string[]; // Hard metrics: Cost, Liability, Speed
  avoidTopics: string[]; // Soft metrics: Brand, Altruism, "saving the planet"
  keyPhrases: string[]; // Language to use
  decisionCriteria: string[]; // What they care about
  painPoints: string[]; // Their specific challenges
}

/**
 * Persona mapping for each role
 */
export const ROLE_PERSONAS: Record<string, RoleMotivation> = {
  'Quantity Surveyor': {
    role: 'Quantity Surveyor',
    primaryDrivers: ['ROI', 'Cost Analysis', 'Budget Impact', 'Financial Risk'],
    avoidTopics: ['Saving the planet', 'Environmental feel-good', 'Brand image', 'Corporate responsibility'],
    keyPhrases: [
      '7-year payback period',
      'Total cost of ownership',
      'Carbon accounting compliance',
      'Reduced lifecycle costs',
      'Financial risk mitigation',
      'Budget certainty'
    ],
    decisionCriteria: [
      'First cost vs. lifecycle cost',
      'ROI calculation',
      'Carbon tax exposure',
      'Regulatory compliance costs',
      'Risk-adjusted returns'
    ],
    painPoints: [
      'Unpredictable material costs',
      'Carbon tax uncertainty',
      'Budget overruns',
      'Regulatory penalties'
    ]
  },

  'Drywall Subcontractor': {
    role: 'Drywall Subcontractor',
    primaryDrivers: ['Installation Speed', 'Labor Efficiency', 'Material Handling', 'Worker Safety'],
    avoidTopics: ['Environmental impact', 'Corporate sustainability', 'Brand reputation'],
    keyPhrases: [
      'Lightweight boards reduce fatigue',
      'Faster installation = higher margins',
      'Less crew time required',
      'Easier material handling',
      'Reduced worker injuries',
      'More jobs per week'
    ],
    decisionCriteria: [
      'Weight per square foot',
      'Installation time savings',
      'Crew size requirements',
      'Tool requirements',
      'Waste reduction'
    ],
    painPoints: [
      'Heavy materials causing injuries',
      'Slow installation eating profit',
      'Labor shortages',
      'Tight project schedules'
    ]
  },

  'Asset Manager': {
    role: 'Asset Manager',
    primaryDrivers: ['Asset Value', 'Exit Strategy', 'Liquidity', 'Stranded Asset Risk'],
    avoidTopics: ['Feel-good sustainability', 'Altruism', 'Brand perception'],
    keyPhrases: [
      'Protect asset liquidity',
      'Avoid stranded assets',
      'Future-proof investment',
      'Regulatory resilience',
      'Exit value optimization',
      'Portfolio risk management'
    ],
    decisionCriteria: [
      'Building valuation impact',
      'Regulatory exposure',
      'Tenant demand trends',
      'Resale value',
      'Carbon disclosure requirements'
    ],
    painPoints: [
      'Buildings becoming unmarketable',
      'Carbon regulations devaluing assets',
      'Tenant exodus to green buildings',
      'Limited exit options'
    ]
  },

  'Insurance Risk Manager': {
    role: 'Insurance Risk Manager',
    primaryDrivers: ['Liability Reduction', 'Fire Safety', 'Claims Prevention', 'Premium Reduction'],
    avoidTopics: ['Environmental benefits', 'Sustainability marketing'],
    keyPhrases: [
      'Non-combustible materials reduce liability',
      'Lower insurance premiums',
      'Fire resistance rating',
      'Claims history improvement',
      'Risk mitigation',
      'Regulatory compliance'
    ],
    decisionCriteria: [
      'Fire resistance classification',
      'Material combustibility',
      'Smoke development index',
      'Flame spread rating',
      'Safety certifications'
    ],
    painPoints: [
      'High fire insurance costs',
      'Material liability claims',
      'Regulatory safety requirements',
      'Premium increases'
    ]
  },

  'Facility Manager': {
    role: 'Facility Manager',
    primaryDrivers: ['Operational Costs', 'Maintenance Efficiency', 'Downtime Reduction', 'Labor Savings'],
    avoidTopics: ['Brand image', 'Corporate sustainability reports'],
    keyPhrases: [
      'No-strip flooring saves costs',
      'Reduced maintenance cycles',
      'Lower operational burden',
      'Extended product lifespan',
      'Simplified cleaning protocols',
      'Labor cost reduction'
    ],
    decisionCriteria: [
      'Maintenance frequency',
      'Cleaning requirements',
      'Product durability',
      'Replacement cycles',
      'Labor intensity'
    ],
    painPoints: [
      'High maintenance costs',
      'Frequent product replacement',
      'Labor-intensive cleaning',
      'Operational disruptions'
    ]
  },

  'Architect': {
    role: 'Architect',
    primaryDrivers: ['Design Authority', 'Specification Defense', 'Liability Protection', 'Project Compliance'],
    avoidTopics: ['Generic green marketing'],
    keyPhrases: [
      'Defensible specifications',
      'Third-party verification',
      'Value engineering protection',
      'LEED/WELL compliance',
      'Design intent preservation',
      'Professional liability reduction'
    ],
    decisionCriteria: [
      'Verified certifications (CDPH, EPD)',
      'Specification defensibility',
      'Code compliance',
      'Performance guarantees',
      'Substitution resistance'
    ],
    painPoints: [
      'Value engineering undermining design',
      'Unverified product claims',
      'Liability from poor substitutions',
      'Lost LEED points'
    ]
  },

  'General Contractor': {
    role: 'General Contractor',
    primaryDrivers: ['Schedule Adherence', 'Budget Control', 'Risk Mitigation', 'Margin Protection'],
    avoidTopics: ['Environmental altruism'],
    keyPhrases: [
      'On-time delivery guaranteed',
      'Fast-track installation',
      'Budget certainty',
      'Reduced site waste',
      'Labor efficiency',
      'Schedule compression'
    ],
    decisionCriteria: [
      'Lead times',
      'Installation speed',
      'Crew requirements',
      'Material availability',
      'Waste factors'
    ],
    painPoints: [
      'Schedule delays',
      'Cost overruns',
      'Labor coordination',
      'Material shortages'
    ]
  },

  'Flooring Subcontractor': {
    role: 'Flooring Subcontractor',
    primaryDrivers: ['Installation Speed', 'Labor Costs', 'Maintenance Callbacks', 'Material Handling'],
    avoidTopics: ['Brand perception', 'Environmental messaging'],
    keyPhrases: [
      'Click-lock installation = faster jobs',
      'No adhesive = cleaner work',
      'Lightweight = less fatigue',
      'No callbacks for maintenance',
      'Higher daily productivity',
      'More revenue per day'
    ],
    decisionCriteria: [
      'Installation method',
      'Adhesive requirements',
      'Material weight',
      'Maintenance needs',
      'Tool requirements'
    ],
    painPoints: [
      'Labor-intensive installations',
      'Heavy materials',
      'Maintenance callbacks',
      'Tight schedules'
    ]
  },

  'Specification Writer': {
    role: 'Specification Writer',
    primaryDrivers: ['Specification Defense', 'Verification Data', 'Compliance Documentation', 'Substitution Prevention'],
    avoidTopics: ['Marketing claims', 'Unverified benefits'],
    keyPhrases: [
      'Third-party verified data',
      'Defensible specifications',
      'Documented performance',
      'Substitution rejection criteria',
      'Compliance certainty',
      'Professional standards'
    ],
    decisionCriteria: [
      'CDPH v1.2 certification',
      'Verified EPD',
      'Performance test data',
      'Certification validity',
      'Substitution criteria'
    ],
    painPoints: [
      'Weak specifications',
      'Unverified claims',
      'Value engineering',
      'Liability exposure'
    ]
  }
};

/**
 * GPT-4o prompt template for role-based responses
 */
export interface PersonaPromptTemplate {
  systemPrompt: string;
  userContext: string;
  responseGuidelines: string[];
}

/**
 * Conversation context with role-based adaptation
 */
export interface PersonaContext {
  userId: string;
  role: UserRole;
  jobTitle: string;
  motivation: RoleMotivation;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Intercom message with persona adaptation
 */
export interface PersonaMessage {
  context: PersonaContext;
  userMessage: string;
  adaptedResponse: string;
  promptUsed: string;
  tokensUsed?: number;
}
