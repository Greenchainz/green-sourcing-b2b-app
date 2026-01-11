/**
 * Defensibility Agent Types
 * 
 * Types for anti-value engineering verification and product comparison
 */

/**
 * Certificate verification result
 */
export interface CertificateVerification {
  hasCDPHv12: boolean;
  cdphCertificateNumber?: string;
  cdphIssueDate?: string;
  cdphExpiryDate?: string;
  hasVerifiedEPD: boolean;
  epdNumber?: string;
  epdProgramOperator?: string;
  epdValidFrom?: string;
  epdValidTo?: string;
}

/**
 * Environmental metrics from EPD
 */
export interface EPDMetrics {
  globalWarmingPotential?: number; // kg CO2 eq
  gwpUnit?: string;
  acidificationPotential?: number;
  eutrophicationPotential?: number;
  ozoneDepletionPotential?: number;
  photochemicalOzoneCreation?: number;
  primaryEnergyDemand?: number;
  recycledContent?: number; // percentage
  renewableContent?: number; // percentage
}

/**
 * Health metrics from CDPH
 */
export interface HealthMetrics {
  vocEmissions?: number; // μg/m³
  formaldehydeEmissions?: number; // μg/m³
  totalVOCLimit?: number;
  compliance?: 'Pass' | 'Fail' | 'Unknown';
  testMethod?: string;
}

/**
 * Product data for comparison
 */
export interface ProductData {
  productName: string;
  manufacturer: string;
  productId?: string;
  certificates: CertificateVerification;
  epdMetrics: EPDMetrics;
  healthMetrics: HealthMetrics;
  documentUrl?: string;
}

/**
 * Comparison result between original and substitute
 */
export interface ProductComparison {
  original: ProductData;
  substitute: ProductData;
  environmentalComparison: {
    carbonDelta: number; // positive = substitute is worse
    carbonDeltaPercent: number;
    otherMetricDeltas: { [key: string]: number };
  };
  healthComparison: {
    vocDelta: number; // positive = substitute is worse
    formaldehydeDelta: number;
    overallHealthScore: 'Better' | 'Equivalent' | 'Worse';
  };
  certificateComparison: {
    originalCertified: boolean;
    substituteCertified: boolean;
    certificateDowngrade: boolean;
  };
  overallVerdict: 'Acceptable' | 'Reject' | 'Review';
  reasons: string[];
}

/**
 * Rejection memo content
 */
export interface RejectionMemo {
  title: string;
  date: string;
  projectName?: string;
  specSection?: string;
  originalProduct: string;
  substituteProduct: string;
  rejectionReasons: string[];
  comparisonSummary: string;
  carbonImpact: string;
  healthImpact: string;
  recommendedAction: string;
  architectSignature: {
    name?: string;
    date: string;
    title: string;
  };
  attachments: string[];
}

/**
 * Defensibility check result
 */
export interface DefensibilityResult {
  productData: ProductData;
  isDefensible: boolean;
  defensibilityScore: number; // 0-100
  missingRequirements: string[];
  strengths: string[];
  vulnerabilities: string[];
  recommendations: string[];
}

/**
 * Or Equal comparison request
 */
export interface OrEqualRequest {
  originalProductId: string;
  substituteProductId: string;
  projectContext?: {
    projectName: string;
    specSection: string;
    architect: string;
  };
}

/**
 * Or Equal comparison response
 */
export interface OrEqualResponse {
  comparison: ProductComparison;
  verdict: 'Acceptable' | 'Reject' | 'Review';
  rejectionMemo?: RejectionMemo;
  reviewNotes?: string;
}
