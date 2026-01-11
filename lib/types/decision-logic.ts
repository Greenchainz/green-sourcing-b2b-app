/**
 * Decision Logic Types
 * 
 * Types for material-specific decision criteria extraction
 * to support role-based product evaluation
 */

/**
 * Supported material categories for decision logic extraction
 */
export type MaterialCategory = 'Flooring' | 'Insulation' | 'Facade' | 'Structure' | 'Unknown';

/**
 * Target stakeholder roles for each material category
 */
export interface TargetRoles {
  Flooring: string[];
  Insulation: string[];
  Facade: string[];
  Structure: string[];
}

/**
 * Maintenance requirements for flooring materials
 */
export interface MaintenanceRequirements {
  noStripping: boolean;
  polishOnly: boolean;
  adhesiveFree: boolean;
  cleaningProtocol?: string;
  maintenanceCycleMonths?: number;
}

/**
 * Fire resistance data for insulation and facade materials
 */
export interface FireResistanceData {
  nonCombustible: boolean;
  mineralWool: boolean;
  fireResistanceRating?: string;
  fireResistanceMinutes?: number;
  flameSpreadIndex?: number;
  smokeDevelopedIndex?: number;
}

/**
 * Installation data for structural materials
 */
export interface InstallationData {
  lightweight: boolean;
  speedOfInstall: boolean;
  weightPerSqFt?: number;
  specialToolsRequired?: boolean;
  specialTools?: string[];
}

/**
 * Decision criteria specific to material category
 */
export interface DecisionCriteria {
  // Flooring-specific
  maintenanceRequirements?: MaintenanceRequirements;
  
  // Insulation/Facade-specific
  fireResistanceData?: FireResistanceData;
  
  // Structural-specific
  installationData?: InstallationData;
}

/**
 * Relevance score for search indexing
 */
export type RelevanceScore = 'High' | 'Medium' | 'Low';

/**
 * Complete decision logic extraction result
 */
export interface DecisionLogicResult {
  materialCategory: MaterialCategory;
  targetRoles: string[];
  decisionCriteria: DecisionCriteria;
  relevanceScore: RelevanceScore;
  missingCriteria: string[];
  validationNotes: string;
}

/**
 * Role-to-category mapping for target audience
 */
export const TARGET_ROLES: TargetRoles = {
  Flooring: ['Facility Manager', 'Flooring Subcontractor'],
  Insulation: ['Insurance Risk Manager', 'Architect'],
  Facade: ['Insurance Risk Manager', 'Architect'],
  Structure: ['Drywall Subcontractor', 'General Contractor']
};
