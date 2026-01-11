import { PersonaLogic } from '../types/PersonaLogic';

/**
 * The 7 Layers of Procurement - Persona Definitions
 * 
 * These personas represent the key decision-makers in construction procurement.
 * Each has unique anxieties, decision logic, and information needs.
 * 
 * Key Insight: Procurement is NOT about "saving the planet" - it's about:
 * - Risk Mitigation
 * - Total Cost of Ownership (TCO)
 * - Return on Investment (ROI)
 * - Liability Protection
 */

export const FACILITY_MANAGER: PersonaLogic = {
  personaId: 'facility_manager',
  jobTitle: 'Facility Manager',
  decisionLogic: ['TCO', 'Maintenance', 'Lifecycle', 'Durability'],
  scrapeKeywords: [
    'total cost of ownership',
    'tco',
    'maintenance schedule',
    'warranty',
    'warranty years',
    'lifecycle cost',
    'replacement interval',
    'durability rating',
    'maintenance cost',
    'service life',
    'expected lifespan',
    'maintenance-free',
    'low maintenance',
    'annual maintenance'
  ],
  ignoreKeywords: [
    'save the planet',
    'eco-friendly',
    'green choice',
    'sustainable future',
    'environmentally conscious',
    'carbon neutral',
    'good for earth'
  ],
  outputSchema: {
    tco_data: {
      type: 'object',
      description: 'Total cost of ownership information',
      required: true
    },
    maintenance_info: {
      type: 'object',
      description: 'Maintenance requirements and schedules',
      required: true
    },
    warranty_details: {
      type: 'object',
      description: 'Warranty coverage and duration',
      required: true
    },
    lifecycle_metrics: {
      type: 'object',
      description: 'Product lifecycle and durability data',
      required: true
    }
  }
};

export const PROJECT_MANAGER_GC: PersonaLogic = {
  personaId: 'project_manager_gc',
  jobTitle: 'Project Manager (GC)',
  decisionLogic: ['Installation Speed', 'Logistics', 'Schedule', 'Labor'],
  scrapeKeywords: [
    'lead time',
    'delivery time',
    'installation time',
    'take-back program',
    'logistics',
    'delivery schedule',
    'crew size',
    'labor hours',
    'install rate',
    'square feet per day',
    'installation crew',
    'quick install',
    'fast installation',
    'delivery lead time',
    'shipping time'
  ],
  ignoreKeywords: [
    'save the planet',
    'eco-friendly',
    'green choice',
    'sustainable future',
    'carbon footprint',
    'climate action'
  ],
  outputSchema: {
    installation_data: {
      type: 'object',
      description: 'Installation time and requirements',
      required: true
    },
    logistics_info: {
      type: 'object',
      description: 'Delivery and logistics information',
      required: true
    },
    labor_requirements: {
      type: 'object',
      description: 'Labor and crew requirements',
      required: false
    }
  }
};

export const QUANTITY_SURVEYOR: PersonaLogic = {
  personaId: 'quantity_surveyor',
  jobTitle: 'Quantity Surveyor',
  decisionLogic: ['ROI', 'NPV', 'Cost Analysis', 'Financial Metrics'],
  scrapeKeywords: [
    'cost per unit',
    'cost per square foot',
    'bulk pricing',
    'volume discount',
    'payment terms',
    'roi',
    'return on investment',
    'npv',
    'net present value',
    'cost breakdown',
    'price per',
    'unit cost',
    'payback period',
    'financial analysis',
    'cost savings'
  ],
  ignoreKeywords: [
    'save the planet',
    'eco-friendly',
    'green choice',
    'sustainable future',
    'environmental impact',
    'carbon neutral'
  ],
  outputSchema: {
    cost_data: {
      type: 'object',
      description: 'Detailed cost breakdown and pricing',
      required: true
    },
    financial_metrics: {
      type: 'object',
      description: 'ROI, NPV, and other financial metrics',
      required: true
    },
    payment_terms: {
      type: 'object',
      description: 'Payment terms and conditions',
      required: false
    }
  }
};

export const FLOORING_SUB: PersonaLogic = {
  personaId: 'flooring_sub',
  jobTitle: 'Flooring Subcontractor',
  decisionLogic: ['Moisture Mitigation', 'Technical Specs', 'Installation'],
  scrapeKeywords: [
    'moisture barrier',
    'moisture mitigation',
    'substrate requirements',
    'rh tolerance',
    'relative humidity',
    'adhesive compatibility',
    'subfloor prep',
    'subfloor preparation',
    'installation method',
    'concrete moisture',
    'vapor barrier',
    'moisture testing',
    'substrate moisture',
    'humidity requirements'
  ],
  ignoreKeywords: [
    'save the planet',
    'eco-friendly',
    'green choice',
    'sustainable future',
    'environmentally responsible'
  ],
  outputSchema: {
    moisture_data: {
      type: 'object',
      description: 'Moisture requirements and mitigation',
      required: true
    },
    technical_specs: {
      type: 'object',
      description: 'Technical specifications and requirements',
      required: true
    },
    installation_requirements: {
      type: 'object',
      description: 'Installation methods and requirements',
      required: true
    }
  }
};

export const ARCHITECT: PersonaLogic = {
  personaId: 'architect',
  jobTitle: 'Architect',
  decisionLogic: ['LEED Points', 'Aesthetics', 'Compliance', 'Specifications'],
  scrapeKeywords: [
    'leed credits',
    'leed points',
    'leed certification',
    'epd',
    'environmental product declaration',
    'aesthetic options',
    'finish options',
    'color range',
    'design options',
    'specification',
    'architectural spec',
    'csi masterformat',
    'astm standards',
    'building codes',
    'compliance'
  ],
  ignoreKeywords: [
    'save the planet',
    'eco-friendly message',
    'green marketing',
    'sustainable future'
  ],
  outputSchema: {
    leed_data: {
      type: 'object',
      description: 'LEED credits and certification information',
      required: true
    },
    aesthetic_options: {
      type: 'object',
      description: 'Design and aesthetic options',
      required: true
    },
    compliance_info: {
      type: 'object',
      description: 'Standards and compliance information',
      required: true
    },
    specifications: {
      type: 'object',
      description: 'Technical specifications',
      required: false
    }
  }
};

export const SUSTAINABILITY_CONSULTANT: PersonaLogic = {
  personaId: 'sustainability_consultant',
  jobTitle: 'Sustainability Consultant',
  decisionLogic: ['Documentation', 'Compliance', 'Verification', 'Reporting'],
  scrapeKeywords: [
    'epd',
    'environmental product declaration',
    'lca',
    'life cycle assessment',
    'chain of custody',
    'third-party verified',
    'third party certification',
    'iso 14025',
    'iso 14040',
    'carbon footprint',
    'embodied carbon',
    'gwp',
    'global warming potential',
    'transparency',
    'verified data',
    'certified data'
  ],
  ignoreKeywords: [
    'green marketing',
    'eco-friendly statement',
    'sustainability mission',
    'save the planet'
  ],
  outputSchema: {
    documentation: {
      type: 'object',
      description: 'EPDs, LCAs, and other documentation',
      required: true
    },
    compliance_data: {
      type: 'object',
      description: 'Compliance and certification information',
      required: true
    },
    verification_info: {
      type: 'object',
      description: 'Third-party verification details',
      required: true
    },
    carbon_metrics: {
      type: 'object',
      description: 'Carbon footprint and GWP data',
      required: false
    }
  }
};

export const PROCUREMENT_DIRECTOR: PersonaLogic = {
  personaId: 'procurement_director',
  jobTitle: 'Procurement Director',
  decisionLogic: ['Risk', 'Liability', 'Stability', 'Insurance'],
  scrapeKeywords: [
    'supplier insurance',
    'liability insurance',
    'financial stability',
    'liability',
    'business continuity',
    'dun and bradstreet',
    'd&b rating',
    'credit rating',
    'years in business',
    'company stability',
    'supply chain risk',
    'risk mitigation',
    'product liability',
    'warranty coverage',
    'insurance coverage'
  ],
  ignoreKeywords: [
    'save the planet',
    'eco-friendly',
    'green choice',
    'sustainable future',
    'environmental mission'
  ],
  outputSchema: {
    risk_data: {
      type: 'object',
      description: 'Risk and liability information',
      required: true
    },
    stability_info: {
      type: 'object',
      description: 'Financial stability and business continuity',
      required: true
    },
    insurance_coverage: {
      type: 'object',
      description: 'Insurance and liability coverage',
      required: true
    },
    compliance_info: {
      type: 'object',
      description: 'Regulatory compliance',
      required: false
    }
  }
};

/**
 * Map of all personas by ID for easy lookup
 */
export const PERSONAS: Record<string, PersonaLogic> = {
  facility_manager: FACILITY_MANAGER,
  project_manager_gc: PROJECT_MANAGER_GC,
  quantity_surveyor: QUANTITY_SURVEYOR,
  flooring_sub: FLOORING_SUB,
  architect: ARCHITECT,
  sustainability_consultant: SUSTAINABILITY_CONSULTANT,
  procurement_director: PROCUREMENT_DIRECTOR
};

/**
 * Array of all persona IDs
 */
export const PERSONA_IDS = Object.keys(PERSONAS);

/**
 * Get a persona by ID with fallback to default
 */
export function getPersonaById(personaId: string): PersonaLogic | null {
  return PERSONAS[personaId] || null;
}

/**
 * Get all personas as an array
 */
export function getAllPersonas(): PersonaLogic[] {
  return Object.values(PERSONAS);
}
