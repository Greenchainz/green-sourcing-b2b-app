/**
 * Schema Types for Architecture of Equivalence Engine
 * 
 * Core type definitions for material viability profiles and risk management.
 * These types support the transformation from sustainability reporting to
 * full-risk management with hard metrics and persona-weighted scoring.
 */

/**
 * User persona types that influence viability scoring weights
 */
export type UserPersona = 
  | 'Architect'
  | 'GeneralContractor'
  | 'FacilityManager'
  | 'InsuranceRiskManager'
  | 'FlooringSubcontractor'
  | 'DrywallSubcontractor'
  | 'Distributor';

/**
 * ASTM standard compliance information
 */
export interface ASTMStandard {
  /** ASTM standard designation (e.g., "ASTM E84", "ASTM C518") */
  designation: string;
  /** Full title of the standard */
  title: string;
  /** Test result or compliance value */
  result?: string | number;
  /** Whether the material meets this standard */
  compliant: boolean;
  /** Test date if available */
  testDate?: Date;
  /** Testing laboratory */
  laboratory?: string;
}

/**
 * Labor unit metrics for installation and maintenance
 */
export interface LaborUnits {
  /** Installation labor hours per unit (e.g., per sq ft, per linear ft) */
  installationHoursPerUnit: number;
  /** Maintenance labor hours per year per unit */
  maintenanceHoursPerYear: number;
  /** Unit of measurement (e.g., "sq ft", "linear ft", "each") */
  unit: string;
  /** Skill level required (1-5, where 5 is most specialized) */
  skillLevelRequired: number;
  /** Special tools or equipment required */
  specialEquipment?: string[];
  /** Notes on installation complexity */
  installationNotes?: string;
}

/**
 * On-Time In-Full (OTIF) delivery performance metrics
 */
export interface OTIFMetrics {
  /** Percentage of orders delivered on time (0-100) */
  onTimePercentage: number;
  /** Percentage of orders delivered in full/complete (0-100) */
  inFullPercentage: number;
  /** Combined OTIF score (on time AND in full) */
  otifScore: number;
  /** Average lead time in days */
  averageLeadTimeDays: number;
  /** Standard deviation of lead time */
  leadTimeStdDev?: number;
  /** Sample size for these metrics */
  sampleSize: number;
  /** Date range for the data */
  dataFrom: Date;
  dataTo: Date;
}

/**
 * Persona-specific weighting for scoring algorithm
 */
export interface PersonaWeights {
  /** Weight for environmental/carbon metrics (0-1) */
  environmental: number;
  /** Weight for labor/installation metrics (0-1) */
  labor: number;
  /** Weight for standards compliance (0-1) */
  standards: number;
  /** Weight for delivery reliability (0-1) */
  delivery: number;
  /** Weight for cost/economics (0-1) */
  cost: number;
  /** Weight for health/safety metrics (0-1) */
  health: number;
}

/**
 * Calculated viability score with breakdown
 */
export interface ViabilityScore {
  /** Overall viability score (0-100) */
  overall: number;
  /** Environmental score component (0-100) */
  environmental: number;
  /** Labor feasibility score (0-100) */
  labor: number;
  /** Standards compliance score (0-100) */
  standards: number;
  /** Delivery reliability score (0-100) */
  delivery: number;
  /** Cost competitiveness score (0-100) */
  cost: number;
  /** Health and safety score (0-100) */
  health: number;
  /** Persona used for weighting */
  persona: UserPersona;
  /** Confidence level of the score (0-1) */
  confidence: number;
  /** Date the score was calculated */
  calculatedAt: Date;
}

/**
 * Material Viability Profile - Core entity for Architecture of Equivalence
 * 
 * This interface represents the complete risk and viability assessment
 * of a material or product, incorporating hard metrics and persona-weighted scoring.
 */
export interface MaterialViabilityProfile {
  /** Unique identifier for the profile */
  id?: string | number;
  
  /** Product/Material identification */
  productId?: string | number;
  productName: string;
  manufacturer: string;
  sku?: string;
  
  /** ASTM Standards compliance */
  astmStandards: ASTMStandard[];
  
  /** Labor metrics */
  laborUnits: LaborUnits;
  
  /** Delivery performance */
  otifMetrics: OTIFMetrics;
  
  /** Environmental metrics (from EPD) */
  environmentalMetrics: {
    /** Global Warming Potential (kg CO2 eq) */
    gwp?: number;
    gwpUnit?: string;
    /** Embodied carbon */
    embodiedCarbon?: number;
    /** Recyclability percentage */
    recyclability?: number;
    /** Red List status */
    redListStatus?: 'Free' | 'Approved' | 'Contains' | 'Unknown';
    /** EPD URL or document ID */
    epdSource?: string;
  };
  
  /** Health and safety metrics */
  healthMetrics: {
    /** Health grade from healthdb */
    healthGrade?: 'A' | 'B' | 'C' | 'F';
    /** VOC emissions */
    vocEmissions?: number;
    /** Formaldehyde emissions */
    formaldehydeEmissions?: number;
    /** CDPH compliance */
    cdphCompliant?: boolean;
  };
  
  /** Cost metrics */
  costMetrics: {
    /** Unit price */
    unitPrice: number;
    /** Currency */
    currency: string;
    /** Total cost of ownership per year */
    totalCostPerYear?: number;
    /** Price volatility (standard deviation) */
    priceVolatility?: number;
  };
  
  /** Calculated viability scores per persona */
  viabilityScores?: Record<UserPersona, ViabilityScore>;
  
  /** Data quality and sources */
  dataQuality: {
    /** Completeness score (0-1) */
    completeness: number;
    /** Data freshness in days */
    freshnessInDays: number;
    /** Data sources */
    sources: string[];
    /** Last updated timestamp */
    lastUpdated: Date;
  };
  
  /** Metadata */
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | number;
}

/**
 * Default persona weights for scoring algorithm
 * 
 * These can be customized per user or organization
 */
export const DEFAULT_PERSONA_WEIGHTS: Record<UserPersona, PersonaWeights> = {
  Architect: {
    environmental: 0.25,
    labor: 0.10,
    standards: 0.25,
    delivery: 0.10,
    cost: 0.15,
    health: 0.15,
  },
  GeneralContractor: {
    environmental: 0.10,
    labor: 0.25,
    standards: 0.15,
    delivery: 0.25,
    cost: 0.20,
    health: 0.05,
  },
  FacilityManager: {
    environmental: 0.15,
    labor: 0.20,
    standards: 0.15,
    delivery: 0.15,
    cost: 0.25,
    health: 0.10,
  },
  InsuranceRiskManager: {
    environmental: 0.05,
    labor: 0.05,
    standards: 0.35,
    delivery: 0.10,
    cost: 0.15,
    health: 0.30,
  },
  FlooringSubcontractor: {
    environmental: 0.05,
    labor: 0.35,
    standards: 0.15,
    delivery: 0.25,
    cost: 0.15,
    health: 0.05,
  },
  DrywallSubcontractor: {
    environmental: 0.05,
    labor: 0.35,
    standards: 0.15,
    delivery: 0.25,
    cost: 0.15,
    health: 0.05,
  },
  Distributor: {
    environmental: 0.10,
    labor: 0.10,
    standards: 0.15,
    delivery: 0.35,
    cost: 0.25,
    health: 0.05,
  },
};

/**
 * Request payload for calculating viability score
 */
export interface CalculateViabilityRequest {
  /** Profile to score */
  profile: MaterialViabilityProfile;
  /** Persona to use for weighting */
  persona: UserPersona;
  /** Optional custom weights (overrides persona defaults) */
  customWeights?: Partial<PersonaWeights>;
}

/**
 * Response from viability scoring
 */
export interface CalculateViabilityResponse {
  /** Calculated score */
  score: ViabilityScore;
  /** Any warnings or notes about the calculation */
  warnings?: string[];
  /** Recommendations for improving the score */
  recommendations?: string[];
}
