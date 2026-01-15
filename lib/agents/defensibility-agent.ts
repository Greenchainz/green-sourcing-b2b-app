/**
 * Defensibility Agent (Anti-Value Engineering)
 * 
 * Prevents "value engineering" (swapping good products for cheaper ones)
 * by verifying certifications and comparing environmental/health metrics
 */

import type {
  CertificateVerification,
  EPDMetrics,
  HealthMetrics,
  ProductData,
  ProductComparison,
  DefensibilityResult,
  RejectionMemo,
} from '../types/defensibility';

/**
 * Extract certificate data from document content
 */
export function extractCertificates(content: string): CertificateVerification {
  const result: CertificateVerification = {
    hasCDPHv12: false,
    hasVerifiedEPD: false
  };

  // CDPH v1.2 patterns
  const cdphPatterns = {
    version: /cdph\s*(?:v|version)?\s*1\.2/i,
    certificate: /cdph\s*(?:certificate|cert)?[\s#:]*([A-Z0-9-]+)/i,
    issueDate: /(?:issue|issued|certificate)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    expiryDate: /(?:expir(?:y|ation)|valid\s*(?:until|thru|through))[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
  };

  // Check for CDPH v1.2
  if (cdphPatterns.version.test(content)) {
    result.hasCDPHv12 = true;
    
    const certMatch = content.match(cdphPatterns.certificate);
    if (certMatch) result.cdphCertificateNumber = certMatch[1];
    
    const issueMatch = content.match(cdphPatterns.issueDate);
    if (issueMatch) result.cdphIssueDate = issueMatch[1];
    
    const expiryMatch = content.match(cdphPatterns.expiryDate);
    if (expiryMatch) result.cdphExpiryDate = expiryMatch[1];
  }

  // EPD patterns
  const epdPatterns = {
    verified: /(?:verified|third[-\s]party\s*verified|independently\s*verified)\s*epd/i,
    number: /epd\s*(?:number|no|#)[:\s]*([A-Z0-9-]+)/i,
    programOperator: /program\s*operator[:\s]*([^\n]+)/i,
    validFrom: /valid\s*from[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    validTo: /valid\s*(?:to|until|thru|through)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
  };

  // Check for verified EPD
  const hasEPDMention = /\bepd\b/i.test(content);
  const isVerified = epdPatterns.verified.test(content);
  
  if (hasEPDMention && isVerified) {
    result.hasVerifiedEPD = true;
    
    const numberMatch = content.match(epdPatterns.number);
    if (numberMatch) result.epdNumber = numberMatch[1];
    
    const operatorMatch = content.match(epdPatterns.programOperator);
    if (operatorMatch) result.epdProgramOperator = operatorMatch[1].trim();
    
    const validFromMatch = content.match(epdPatterns.validFrom);
    if (validFromMatch) result.epdValidFrom = validFromMatch[1];
    
    const validToMatch = content.match(epdPatterns.validTo);
    if (validToMatch) result.epdValidTo = validToMatch[1];
  }

  return result;
}

/**
 * Extract EPD environmental metrics from content
 */
export function extractEPDMetrics(content: string): EPDMetrics {
  const metrics: EPDMetrics = {};

  // GWP (Global Warming Potential)
  const gwpMatch = content.match(/(?:gwp|global\s*warming\s*potential)[:\s]*([0-9.]+)\s*(?:kg\s*co2|kgco2)/i);
  if (gwpMatch) {
    metrics.globalWarmingPotential = parseFloat(gwpMatch[1]);
    metrics.gwpUnit = 'kg CO2 eq';
  }

  // Acidification Potential
  const acidMatch = content.match(/acidification\s*(?:potential)?[:\s]*([0-9.]+)/i);
  if (acidMatch) metrics.acidificationPotential = parseFloat(acidMatch[1]);

  // Eutrophication Potential
  const eutrophMatch = content.match(/eutrophication\s*(?:potential)?[:\s]*([0-9.]+)/i);
  if (eutrophMatch) metrics.eutrophicationPotential = parseFloat(eutrophMatch[1]);

  // Recycled content
  const recycledMatch = content.match(/(?:recycled|post[-\s]consumer)\s*content[:\s]*([0-9.]+)\s*%/i);
  if (recycledMatch) metrics.recycledContent = parseFloat(recycledMatch[1]);

  // Renewable content
  const renewableMatch = content.match(/renewable\s*content[:\s]*([0-9.]+)\s*%/i);
  if (renewableMatch) metrics.renewableContent = parseFloat(renewableMatch[1]);

  return metrics;
}

/**
 * Extract health metrics from CDPH certificate
 */
export function extractHealthMetrics(content: string): HealthMetrics {
  const metrics: HealthMetrics = {};

  // VOC emissions (μg/m³)
  const vocMatch = content.match(/(?:total\s*)?voc\s*(?:emissions)?[:\s]*([0-9.]+)\s*(?:μg\/m³|ug\/m3|µg\/m³)/i);
  if (vocMatch) metrics.vocEmissions = parseFloat(vocMatch[1]);

  // Formaldehyde emissions
  const formaldehydeMatch = content.match(/formaldehyde[:\s]*([0-9.]+)\s*(?:μg\/m³|ug\/m3|µg\/m³)/i);
  if (formaldehydeMatch) metrics.formaldehydeEmissions = parseFloat(formaldehydeMatch[1]);

  // Test method
  const testMethodMatch = content.match(/(?:test|testing)\s*method[:\s]*([A-Z0-9.\s-]+)/i);
  if (testMethodMatch) metrics.testMethod = testMethodMatch[1].trim();

  // Compliance
  if (/pass(?:ed)?|compliant|meets?\s*(?:requirements|standards?)/i.test(content)) {
    metrics.compliance = 'Pass';
  } else if (/fail(?:ed)?|non[-]?compliant|does\s*not\s*meet/i.test(content)) {
    metrics.compliance = 'Fail';
  } else {
    metrics.compliance = 'Unknown';
  }

  return metrics;
}

/**
 * Check product defensibility
 */
export function checkDefensibility(productData: ProductData): DefensibilityResult {
  const missingRequirements: string[] = [];
  const strengths: string[] = [];
  const vulnerabilities: string[] = [];
  const recommendations: string[] = [];
  
  let score = 0;

  // Certificate checks (40 points total)
  if (productData.certificates.hasCDPHv12) {
    score += 20;
    strengths.push('CDPH v1.2 certified for health & safety');
  } else {
    missingRequirements.push('CDPH v1.2 certificate');
    vulnerabilities.push('No third-party health verification');
    recommendations.push('Obtain CDPH v1.2 certification to strengthen specification');
  }

  if (productData.certificates.hasVerifiedEPD) {
    score += 20;
    strengths.push('Verified EPD with environmental data');
  } else {
    missingRequirements.push('Verified Environmental Product Declaration (EPD)');
    vulnerabilities.push('No verified environmental impact data');
    recommendations.push('Obtain third-party verified EPD');
  }

  // EPD metrics checks (30 points total)
  if (productData.epdMetrics.globalWarmingPotential !== undefined) {
    score += 15;
    strengths.push(`Documented carbon footprint: ${productData.epdMetrics.globalWarmingPotential} ${productData.epdMetrics.gwpUnit || ''}`);
  } else {
    vulnerabilities.push('No carbon footprint data');
    recommendations.push('Document Global Warming Potential (GWP)');
  }

  if (productData.epdMetrics.recycledContent !== undefined && productData.epdMetrics.recycledContent > 0) {
    score += 15;
    strengths.push(`Contains ${productData.epdMetrics.recycledContent}% recycled content`);
  }

  // Health metrics checks (30 points total)
  if (productData.healthMetrics.vocEmissions !== undefined) {
    score += 15;
    strengths.push(`VOC emissions: ${productData.healthMetrics.vocEmissions} μg/m³`);
  } else {
    vulnerabilities.push('No VOC emissions data');
  }

  if (productData.healthMetrics.compliance === 'Pass') {
    score += 15;
    strengths.push('Passes health & safety compliance tests');
  } else if (productData.healthMetrics.compliance === 'Fail') {
    score -= 20;
    vulnerabilities.push('Failed compliance testing');
  }

  const isDefensible = score >= 60 && missingRequirements.length <= 1;

  return {
    productData,
    isDefensible,
    defensibilityScore: Math.max(0, Math.min(100, score)),
    missingRequirements,
    strengths,
    vulnerabilities,
    recommendations
  };
}

/**
 * Compare two products (Original vs Substitute) for "Or Equal" evaluation
 */
export function compareProducts(
  original: ProductData,
  substitute: ProductData
): ProductComparison {
  const reasons: string[] = [];
  
  // Environmental comparison
  const originalGWP = original.epdMetrics.globalWarmingPotential || 0;
  const substituteGWP = substitute.epdMetrics.globalWarmingPotential || 0;
  const carbonDelta = substituteGWP - originalGWP;
  const carbonDeltaPercent = originalGWP > 0 ? (carbonDelta / originalGWP) * 100 : 0;

  if (carbonDelta > 0) {
    reasons.push(`Substitute has ${carbonDeltaPercent.toFixed(1)}% higher carbon footprint`);
  }

  const otherMetricDeltas: { [key: string]: number } = {};
  
  if (original.epdMetrics.acidificationPotential && substitute.epdMetrics.acidificationPotential) {
    otherMetricDeltas.acidification = substitute.epdMetrics.acidificationPotential - original.epdMetrics.acidificationPotential;
  }

  // Health comparison
  const originalVOC = original.healthMetrics.vocEmissions || 0;
  const substituteVOC = substitute.healthMetrics.vocEmissions || 0;
  const vocDelta = substituteVOC - originalVOC;

  const originalFormaldehyde = original.healthMetrics.formaldehydeEmissions || 0;
  const substituteFormaldehyde = substitute.healthMetrics.formaldehydeEmissions || 0;
  const formaldehydeDelta = substituteFormaldehyde - originalFormaldehyde;

  let overallHealthScore: 'Better' | 'Equivalent' | 'Worse' = 'Equivalent';
  if (vocDelta > 0 || formaldehydeDelta > 0) {
    overallHealthScore = 'Worse';
    if (vocDelta > 0) reasons.push(`Substitute has higher VOC emissions (+${vocDelta.toFixed(1)} μg/m³)`);
    if (formaldehydeDelta > 0) reasons.push(`Substitute has higher formaldehyde emissions (+${formaldehydeDelta.toFixed(1)} μg/m³)`);
  } else if (vocDelta < 0 && formaldehydeDelta < 0) {
    overallHealthScore = 'Better';
  }

  // Certificate comparison
  const originalCertified = original.certificates.hasCDPHv12 && original.certificates.hasVerifiedEPD;
  const substituteCertified = substitute.certificates.hasCDPHv12 && substitute.certificates.hasVerifiedEPD;
  const certificateDowngrade = originalCertified && !substituteCertified;

  if (certificateDowngrade) {
    if (original.certificates.hasCDPHv12 && !substitute.certificates.hasCDPHv12) {
      reasons.push('Substitute lacks CDPH v1.2 certification');
    }
    if (original.certificates.hasVerifiedEPD && !substitute.certificates.hasVerifiedEPD) {
      reasons.push('Substitute lacks verified EPD');
    }
  }

  // Overall verdict
  let overallVerdict: 'Acceptable' | 'Reject' | 'Review' = 'Acceptable';
  
  if (carbonDelta > originalGWP * 0.1 || overallHealthScore === 'Worse' || certificateDowngrade) {
    overallVerdict = 'Reject';
  } else if (carbonDelta > 0 || reasons.length > 0) {
    overallVerdict = 'Review';
  }

  return {
    original,
    substitute,
    environmentalComparison: {
      carbonDelta,
      carbonDeltaPercent,
      otherMetricDeltas
    },
    healthComparison: {
      vocDelta,
      formaldehydeDelta,
      overallHealthScore
    },
    certificateComparison: {
      originalCertified,
      substituteCertified,
      certificateDowngrade
    },
    overallVerdict,
    reasons
  };
}

/**
 * Generate rejection memo for architect
 */
export function generateRejectionMemo(
  comparison: ProductComparison,
  projectContext?: {
    projectName: string;
    specSection: string;
    architect: string;
  }
): RejectionMemo {
  const date = new Date().toISOString().split('T')[0];
  
  const rejectionReasons = comparison.reasons;
  
  const carbonImpact = comparison.environmentalComparison.carbonDelta > 0
    ? `The substitute product has a ${comparison.environmentalComparison.carbonDeltaPercent.toFixed(1)}% higher carbon footprint (${comparison.environmentalComparison.carbonDelta.toFixed(2)} kg CO2 eq increase), which conflicts with the project's sustainability goals.`
    : 'No significant carbon impact difference.';

  const healthImpact = comparison.healthComparison.overallHealthScore === 'Worse'
    ? `The substitute product has worse indoor air quality metrics, with increased VOC and/or formaldehyde emissions, which may impact occupant health and LEED/WELL certification.`
    : 'No adverse health impact identified.';

  const comparisonSummary = `Original product: ${comparison.original.productName} by ${comparison.original.manufacturer}
Substitute product: ${comparison.substitute.productName} by ${comparison.substitute.manufacturer}

The substitute does not meet the "or equal" standard as specified in the project documents.`;

  return {
    title: 'Product Substitution Rejection Notice',
    date,
    projectName: projectContext?.projectName,
    specSection: projectContext?.specSection,
    originalProduct: `${comparison.original.productName} (${comparison.original.manufacturer})`,
    substituteProduct: `${comparison.substitute.productName} (${comparison.substitute.manufacturer})`,
    rejectionReasons,
    comparisonSummary,
    carbonImpact,
    healthImpact,
    recommendedAction: 'Retain the originally specified product or provide an alternate that meets or exceeds all environmental and health criteria.',
    architectSignature: {
      name: projectContext?.architect,
      date,
      title: 'Project Architect'
    },
    attachments: [
      'Original Product EPD',
      'Substitute Product EPD (if available)',
      'Comparative Analysis Report'
    ]
  };
}

/**
 * Main defensibility check orchestrator
 */
export function performDefensibilityCheck(documentContent: string, productName: string, manufacturer: string): DefensibilityResult {
  const certificates = extractCertificates(documentContent);
  const epdMetrics = extractEPDMetrics(documentContent);
  const healthMetrics = extractHealthMetrics(documentContent);

  const productData: ProductData = {
    productName,
    manufacturer,
    certificates,
    epdMetrics,
    healthMetrics
  };

  return checkDefensibility(productData);
}
