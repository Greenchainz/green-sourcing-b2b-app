import { GatekeeperPersona, GatekeeperRole } from '../types/GatekeeperTypes';

/**
 * Gatekeeper Personas for Hunter Agents
 * 
 * These are the high-leverage decision-makers we're targeting.
 * Each persona has specific "motivation keywords" that reveal their priorities.
 */

/**
 * Quantity Surveyor - Financial Gatekeeper
 * Focus: Whole Life Costing, Carbon Accounting, NPV
 */
export const QUANTITY_SURVEYOR_GATEKEEPER: GatekeeperPersona = {
  role: 'quantity_surveyor',
  title: 'Quantity Surveyor',
  vertical: 'Commercial Construction',
  motivationKeywords: [
    'whole life costing',
    'wlc',
    'carbon accounting',
    'net present value',
    'npv',
    'life cycle cost',
    'cost certainty',
    'value engineering',
    'embodied carbon',
    'carbon budget',
    'capex vs opex',
    'financial modeling',
    'cost planning',
    'risk contingency'
  ],
  requiredSkills: [
    'RICS qualified',
    'cost estimation',
    'financial analysis',
    'contract administration'
  ],
  decisionLogic: ['ROI', 'NPV', 'Cost Analysis', 'Financial Metrics', 'Risk'],
  searchQueries: [
    'quantity surveyor "whole life costing"',
    'quantity surveyor "carbon accounting"',
    'cost consultant "net present value" construction',
    'QS "embodied carbon" project',
    'quantity surveyor "life cycle cost"',
    'cost manager "carbon budget" building'
  ]
};

/**
 * Infection Control Officer - Healthcare Gatekeeper
 * Focus: Pathogen Reduction, Seamless Flooring, UV-C Cleaning
 */
export const INFECTION_CONTROL_OFFICER: GatekeeperPersona = {
  role: 'infection_control_officer',
  title: 'Infection Control Officer',
  vertical: 'Healthcare',
  motivationKeywords: [
    'pathogen reduction',
    'infection prevention',
    'seamless flooring',
    'uv-c cleaning',
    'antimicrobial',
    'hospital acquired infection',
    'hai',
    'surface hygiene',
    'cleanability',
    'bioburden',
    'disinfection protocol',
    'aseptic environment',
    'contamination control',
    'healthcare associated infection'
  ],
  requiredSkills: [
    'infection control certification',
    'epidemiology',
    'environmental health',
    'facility planning'
  ],
  decisionLogic: ['Risk', 'Compliance', 'Technical Specs', 'Maintenance'],
  searchQueries: [
    'infection control officer "seamless flooring"',
    'infection prevention "pathogen reduction" hospital',
    'ICO "UV-C cleaning" healthcare',
    'infection control "antimicrobial flooring"',
    'hospital infection prevention "surface hygiene"',
    'healthcare "bioburden reduction" facility'
  ]
};

/**
 * Insurance Risk Manager - Risk Mitigation Gatekeeper
 * Focus: Mass Timber, Resilience, Liability
 */
export const INSURANCE_RISK_MANAGER: GatekeeperPersona = {
  role: 'insurance_risk_manager',
  title: 'Insurance Risk Manager',
  vertical: 'Construction Insurance',
  motivationKeywords: [
    'mass timber',
    'resilience',
    'climate resilience',
    'risk mitigation',
    'liability exposure',
    'business continuity',
    'property insurance',
    'builders risk',
    'fire resistance',
    'seismic resilience',
    'weather resilience',
    'catastrophic loss',
    'underwriting criteria',
    'risk assessment'
  ],
  requiredSkills: [
    'risk assessment',
    'insurance underwriting',
    'loss prevention',
    'construction knowledge'
  ],
  decisionLogic: ['Risk', 'Liability', 'Compliance', 'Financial Stability'],
  searchQueries: [
    'insurance risk manager "mass timber" project',
    'construction insurance "resilience" building',
    'risk manager "climate resilience" property',
    'insurance "mass timber" underwriting',
    'builders risk "seismic resilience"',
    'construction insurance "business continuity"'
  ]
};

/**
 * Facility Director - Operational Steward
 * Focus: TCO, Operations, Maintenance Strategy
 */
export const FACILITY_DIRECTOR: GatekeeperPersona = {
  role: 'facility_director',
  title: 'Facility Director',
  vertical: 'Corporate Real Estate',
  motivationKeywords: [
    'total cost of ownership',
    'tco',
    'facilities management',
    'preventive maintenance',
    'asset lifecycle',
    'operational efficiency',
    'building performance',
    'energy efficiency',
    'maintenance strategy',
    'facility operations',
    'capex planning',
    'deferred maintenance',
    'occupancy cost',
    'space utilization'
  ],
  requiredSkills: [
    'facility management',
    'operations management',
    'strategic planning',
    'budget management'
  ],
  decisionLogic: ['TCO', 'Maintenance', 'Lifecycle', 'Durability', 'Operations'],
  searchQueries: [
    'facility director "total cost of ownership"',
    'facilities manager "asset lifecycle"',
    'facility director "maintenance strategy"',
    'FM "preventive maintenance" program',
    'facility operations "building performance"',
    'director facilities "operational efficiency"'
  ]
};

/**
 * Procurement Director - Strategic Sourcing Gatekeeper
 * Focus: Supply Chain Risk, Vendor Stability, Contract Strategy
 */
export const PROCUREMENT_DIRECTOR_GATEKEEPER: GatekeeperPersona = {
  role: 'procurement_director',
  title: 'Procurement Director',
  vertical: 'Construction & Real Estate',
  motivationKeywords: [
    'strategic sourcing',
    'supply chain risk',
    'vendor management',
    'supplier financial stability',
    'contract strategy',
    'procurement excellence',
    'supply chain resilience',
    'category management',
    'total cost management',
    'supplier diversity',
    'procurement transformation',
    'supply assurance',
    'vendor risk assessment',
    'contract negotiation'
  ],
  requiredSkills: [
    'strategic procurement',
    'contract management',
    'supply chain management',
    'negotiation'
  ],
  decisionLogic: ['Risk', 'Liability', 'Financial Stability', 'Supply Chain', 'TCO'],
  searchQueries: [
    'procurement director "strategic sourcing" construction',
    'CPO "supply chain risk" building materials',
    'procurement "vendor financial stability"',
    'procurement director "supply chain resilience"',
    'chief procurement officer "contract strategy"',
    'procurement "supplier risk assessment" construction'
  ]
};

/**
 * Map of all gatekeeper personas
 */
export const GATEKEEPER_PERSONAS: Record<GatekeeperRole, GatekeeperPersona> = {
  quantity_surveyor: QUANTITY_SURVEYOR_GATEKEEPER,
  infection_control_officer: INFECTION_CONTROL_OFFICER,
  insurance_risk_manager: INSURANCE_RISK_MANAGER,
  facility_director: FACILITY_DIRECTOR,
  procurement_director: PROCUREMENT_DIRECTOR_GATEKEEPER
};

/**
 * Get gatekeeper persona by role
 */
export function getGatekeeperPersona(role: GatekeeperRole): GatekeeperPersona | null {
  return GATEKEEPER_PERSONAS[role] || null;
}

/**
 * Get all gatekeeper personas
 */
export function getAllGatekeeperPersonas(): GatekeeperPersona[] {
  return Object.values(GATEKEEPER_PERSONAS);
}

/**
 * Get gatekeeper personas by vertical
 */
export function getGatekeepersByVertical(vertical: string): GatekeeperPersona[] {
  return Object.values(GATEKEEPER_PERSONAS).filter(
    persona => persona.vertical?.toLowerCase().includes(vertical.toLowerCase())
  );
}
