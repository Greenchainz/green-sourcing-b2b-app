/**
 * Viability Scoring Algorithm
 * 
 * Core scoring engine for the Architecture of Equivalence.
 * Calculates persona-weighted viability scores based on hard metrics:
 * - Labor Units (installation & maintenance complexity)
 * - ASTM Standards (compliance & testing)
 * - OTIF (On-Time In-Full delivery performance)
 * - Environmental metrics (GWP, carbon, recyclability)
 * - Health & Safety (VOC, formaldehyde, health grades)
 * - Cost metrics (price, TCO, volatility)
 */

import {
  MaterialViabilityProfile,
  ViabilityScore,
  UserPersona,
  PersonaWeights,
  DEFAULT_PERSONA_WEIGHTS,
  CalculateViabilityRequest,
  CalculateViabilityResponse,
} from '../../types/schema';

/**
 * Calculate viability score for a material profile
 * 
 * @param request - Profile and persona configuration
 * @returns Calculated score with recommendations
 */
export function calculateViabilityScore(
  request: CalculateViabilityRequest
): CalculateViabilityResponse {
  const { profile, persona, customWeights } = request;
  
  // Get weights (custom or default)
  const weights = customWeights 
    ? { ...DEFAULT_PERSONA_WEIGHTS[persona], ...customWeights }
    : DEFAULT_PERSONA_WEIGHTS[persona];
  
  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights: PersonaWeights = {
    environmental: weights.environmental / totalWeight,
    labor: weights.labor / totalWeight,
    standards: weights.standards / totalWeight,
    delivery: weights.delivery / totalWeight,
    cost: weights.cost / totalWeight,
    health: weights.health / totalWeight,
    physical: (weights.physical ?? 0) / totalWeight,
    similarity: (weights.similarity ?? 0) / totalWeight,
  };
  
  // Calculate component scores
  const environmentalScore = calculateEnvironmentalScore(profile);
  const laborScore = calculateLaborScore(profile);
  const standardsScore = calculateStandardsScore(profile);
  const deliveryScore = calculateDeliveryScore(profile);
  const costScore = calculateCostScore(profile);
  const healthScore = calculateHealthScore(profile);
  const physicalScore = calculatePhysicalScore(profile);
  const similarityScore = calculateSimilarityScore(profile);
  
  // Calculate weighted overall score
  const overallScore = 
    environmentalScore * normalizedWeights.environmental +
    laborScore * normalizedWeights.labor +
    standardsScore * normalizedWeights.standards +
    deliveryScore * normalizedWeights.delivery +
    costScore * normalizedWeights.cost +
    healthScore * normalizedWeights.health +
    physicalScore * (normalizedWeights.physical ?? 0) +
    similarityScore * (normalizedWeights.similarity ?? 0);
  
  // Calculate confidence based on data quality and verification
  const verificationScore = calculateVerificationScore(profile);
  const confidence = (profile.dataQuality.completeness * 0.7) + (verificationScore / 100 * 0.3);
  
  // Build score object
  const score: ViabilityScore = {
    overall: Math.round(overallScore * 100) / 100,
    environmental: Math.round(environmentalScore * 100) / 100,
    labor: Math.round(laborScore * 100) / 100,
    standards: Math.round(standardsScore * 100) / 100,
    delivery: Math.round(deliveryScore * 100) / 100,
    cost: Math.round(costScore * 100) / 100,
    health: Math.round(healthScore * 100) / 100,
    physical: Math.round(physicalScore * 100) / 100,
    similarity: Math.round(similarityScore * 100) / 100,
    persona,
    confidence: Math.round(confidence * 100) / 100,
    calculatedAt: new Date(),
  };
  
  // Generate warnings and recommendations
  const warnings = generateWarnings(profile, score);
  const recommendations = generateRecommendations(profile, score, persona);
  
  return { score, warnings, recommendations };
}

/**
 * Calculate environmental sustainability score (0-100)
 * Based on GWP, embodied carbon, recyclability, red list status
 */
function calculateEnvironmentalScore(profile: MaterialViabilityProfile): number {
  const { environmentalMetrics } = profile;
  let score = 50; // Start at neutral
  
  // GWP scoring (lower is better)
  const gwpScore = calculateGWPScore(environmentalMetrics);
  score += (gwpScore - 50) * 0.4; // 40% weight
  
  // Recyclability (higher is better)
  if (environmentalMetrics.recyclability !== undefined) {
    score += (environmentalMetrics.recyclability - 50) * 0.3; // 30% weight
  }
  
  // Red List status
  if (environmentalMetrics.redListStatus === 'Free') {
    score += 15; // Bonus
  } else if (environmentalMetrics.redListStatus === 'Contains') {
    score -= 20; // Penalty
  }
  
  // Verification bonus (replaces simple EPD check)
  const verificationScore = calculateVerificationScore(profile);
  score += (verificationScore / 100) * 15; // Up to 15 points for robust verification
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate labor feasibility score (0-100)
 * Based on installation complexity, maintenance requirements, skill level
 */
function calculateLaborScore(profile: MaterialViabilityProfile): number {
  const { laborUnits } = profile;
  let score = 50;
  
  // Installation hours (lower is better)
  // Assume 0.1-2.0 hours per unit is typical range
  const installHoursNormalized = Math.max(0, Math.min(2, laborUnits.installationHoursPerUnit));
  const installScore = 100 - (installHoursNormalized / 2) * 100;
  score += (installScore - 50) * 0.4; // 40% weight
  
  // Maintenance hours (lower is better)
  // Assume 0-10 hours per year is typical
  const maintHoursNormalized = Math.max(0, Math.min(10, laborUnits.maintenanceHoursPerYear));
  const maintScore = 100 - (maintHoursNormalized / 10) * 100;
  score += (maintScore - 50) * 0.3; // 30% weight
  
  // Skill level (lower is better for ease of installation)
  const skillScore = 100 - ((laborUnits.skillLevelRequired - 1) / 4) * 100;
  score += (skillScore - 50) * 0.2; // 20% weight
  
  // Special equipment penalty
  if (laborUnits.specialEquipment && laborUnits.specialEquipment.length > 0) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate standards compliance score (0-100)
 * Based on ASTM standards coverage and compliance
 */
function calculateStandardsScore(profile: MaterialViabilityProfile): number {
  const { astmStandards } = profile;
  
  if (astmStandards.length === 0) {
    return 0; // No standards = no score
  }
  
  // Count compliant standards
  const compliantCount = astmStandards.filter(s => s.compliant).length;
  const complianceRate = compliantCount / astmStandards.length;
  
  // Base score from compliance rate
  let score = complianceRate * 70; // Max 70 points for 100% compliance
  
  // Bonus for number of standards (shows thoroughness)
  const standardsBonus = Math.min(30, astmStandards.length * 5);
  score += standardsBonus;
  
  // Bonus for recent testing (within last year)
  const recentTests = astmStandards.filter(s => {
    if (!s.testDate) return false;
    const ageInDays = (Date.now() - new Date(s.testDate).getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 365;
  });
  if (recentTests.length > 0) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate delivery reliability score (0-100)
 * Based on OTIF metrics
 */
function calculateDeliveryScore(profile: MaterialViabilityProfile): number {
  const { otifMetrics } = profile;
  
  // OTIF score is the primary metric
  let score = otifMetrics.otifScore;
  
  // Adjust for lead time (shorter is better)
  // Penalize long lead times
  if (otifMetrics.averageLeadTimeDays > 30) {
    score -= Math.min(20, (otifMetrics.averageLeadTimeDays - 30) / 2);
  }
  
  // Penalize high variability (high std dev)
  if (otifMetrics.leadTimeStdDev && otifMetrics.leadTimeStdDev > 5) {
    score -= Math.min(15, otifMetrics.leadTimeStdDev);
  }
  
  // Bonus for large sample size (more reliable data)
  if (otifMetrics.sampleSize >= 100) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate cost competitiveness score (0-100)
 * Based on unit price, TCO, and price stability
 */
function calculateCostScore(profile: MaterialViabilityProfile): number {
  const { costMetrics } = profile;
  let score = 50; // Start neutral
  
  // This is relative scoring - would need market benchmarks in production
  // For now, assume moderate pricing is good
  
  // TCO consideration
  if (costMetrics.totalCostPerYear !== undefined && costMetrics.unitPrice > 0) {
    const tcoRatio = costMetrics.totalCostPerYear / costMetrics.unitPrice;
    // Lower TCO ratio is better (less maintenance/operational cost)
    if (tcoRatio < 1.5) {
      score += 20;
    } else if (tcoRatio > 3.0) {
      score -= 15;
    }
  }
  
  // Price volatility (lower is better)
  if (costMetrics.priceVolatility !== undefined) {
    const volatilityPenalty = Math.min(25, costMetrics.priceVolatility * 10);
    score -= volatilityPenalty;
  } else {
    // Bonus for price stability data availability
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate health and safety score (0-100)
 * Based on VOC emissions, health grade, CDPH compliance
 */
function calculateHealthScore(profile: MaterialViabilityProfile): number {
  const { healthMetrics } = profile;
  
  // Calculate base score from health grade (explicit or derived)
  let score = calculateHealthGradeScore(healthMetrics);
  
  // VOC emissions fine-tuning (lower is better)
  if (healthMetrics.vocEmissions !== undefined) {
    // Assume 0-500 μg/m³ range
    const vocScore = Math.max(0, 100 - (healthMetrics.vocEmissions / 5));
    // Weighted average: 70% grade, 30% specific VOC score
    score = (score * 0.7) + (vocScore * 0.3);
  }
  
  // CDPH compliance bonus
  if (healthMetrics.cdphCompliant) {
    score += 10;
  }
  
  // Formaldehyde penalty (severe)
  if (healthMetrics.formaldehydeEmissions !== undefined) {
    if (healthMetrics.formaldehydeEmissions > 50) {
      score -= 20;
    } else if (healthMetrics.formaldehydeEmissions > 10) {
      score -= 5;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate warnings based on profile data
 */
function generateWarnings(
  profile: MaterialViabilityProfile,
  score: ViabilityScore
): string[] {
  const warnings: string[] = [];
  
  // Data quality warnings
  if (profile.dataQuality.completeness < 0.7) {
    warnings.push('Low data completeness may affect score accuracy');
  }
  
  if (profile.dataQuality.freshnessInDays > 365) {
    warnings.push('Data is over 1 year old - consider updating');
  }
  
  // Score warnings
  if (score.standards < 50) {
    warnings.push('Low standards compliance score - missing critical ASTM standards');
  }
  
  if (score.delivery < 60) {
    warnings.push('Below-average delivery reliability - may impact project timelines');
  }
  
  if (score.health < 50) {
    warnings.push('Health and safety concerns detected - review VOC and emissions data');
  }
  
  // Specific metric warnings
  if (profile.environmentalMetrics.redListStatus === 'Contains') {
    warnings.push('Material contains Red List chemicals - may not meet green building standards');
  }
  
  if (profile.laborUnits.skillLevelRequired >= 4) {
    warnings.push('High skill level required - limited contractor availability');
  }
  
  if (profile.otifMetrics.otifScore < 80) {
    warnings.push('OTIF score below 80% - delivery reliability issues');
  }
  
  return warnings;
}

/**
 * Generate recommendations for improving viability score
 */
function generateRecommendations(
  profile: MaterialViabilityProfile,
  score: ViabilityScore,
  persona: UserPersona
): string[] {
  const recommendations: string[] = [];
  
  // Persona-specific recommendations
  const weights = DEFAULT_PERSONA_WEIGHTS[persona];
  
  // Find lowest scoring areas weighted by persona
  const weightedScores = [
    { area: 'environmental', score: score.environmental, weight: weights.environmental },
    { area: 'labor', score: score.labor, weight: weights.labor },
    { area: 'standards', score: score.standards, weight: weights.standards },
    { area: 'delivery', score: score.delivery, weight: weights.delivery },
    { area: 'cost', score: score.cost, weight: weights.cost },
    { area: 'health', score: score.health, weight: weights.health },
    { area: 'physical', score: score.physical ?? 0, weight: weights.physical ?? 0 },
    { area: 'similarity', score: score.similarity ?? 0, weight: weights.similarity ?? 0 },
  ];
  
  weightedScores.sort((a, b) => (a.score * a.weight) - (b.score * b.weight));
  
  // Top 3 improvement areas
  const topAreas = weightedScores.slice(0, 3);
  
  for (const area of topAreas) {
    if (area.score < 70) {
      switch (area.area) {
        case 'environmental':
          recommendations.push('Improve environmental metrics: Obtain EPD, reduce GWP, increase recyclability');
          break;
        case 'labor':
          recommendations.push('Reduce installation complexity: Simplify installation process or provide better training materials');
          break;
        case 'standards':
          recommendations.push('Obtain additional ASTM certifications and update existing test reports');
          break;
        case 'delivery':
          recommendations.push('Improve delivery reliability: Work with logistics partners to improve OTIF performance');
          break;
        case 'cost':
          recommendations.push('Optimize pricing: Review TCO and stabilize pricing to reduce volatility');
          break;
        case 'health':
          recommendations.push('Address health concerns: Reduce VOC emissions and obtain CDPH certification');
          break;
        case 'physical':
          recommendations.push('Material may not meet physical performance requirements (hardness, wear, impact)');
          break;
        case 'similarity':
          recommendations.push('Material substitution match is low - consider materials with closer density or hardness');
          break;
      }
    }
  }
  
  // General recommendations
  if (profile.dataQuality.completeness < 0.9) {
    recommendations.push('Complete missing data fields to improve score accuracy and confidence');
  }
  
  return recommendations;
}

/**
 * Batch calculate scores for multiple personas
 */
export function calculateViabilityScoresForAllPersonas(
  profile: MaterialViabilityProfile
): Record<UserPersona, ViabilityScore> {
  const personas: UserPersona[] = [
    'Architect',
    'GeneralContractor',
    'FacilityManager',
    'InsuranceRiskManager',
    'FlooringSubcontractor',
    'DrywallSubcontractor',
    'Distributor',
  ];
  
  const scores: Record<string, ViabilityScore> = {};
  
  for (const persona of personas) {
    const result = calculateViabilityScore({ profile, persona });
    scores[persona] = result.score;
  }
  
  return scores as Record<UserPersona, ViabilityScore>;
}

/**
 * Calculate GWP (Global Warming Potential) Score
 * Normalizes GWP against a standard baseline (100 kgCO2e implied for now)
 */
function calculateGWPScore(metrics: MaterialViabilityProfile['environmentalMetrics']): number {
  if (metrics.gwp === undefined) return 50; // Neutral if missing

  // Dynamic baseline could be passed here, for now using static 100 kgCO2e
  const baselineGWP = 100;

  // Calculate reduction relative to baseline
  // If GWP is 0, score is 100. If GWP is baseline, score is 50.
  // If GWP is 2x baseline, score is 0.
  const relativeGWP = metrics.gwp / baselineGWP;
  let score = 100 - (relativeGWP * 50);

  // Adjust score curve
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return score;
}

/**
 * Calculate Verification Score based on data sources and quality
 */
function calculateVerificationScore(profile: MaterialViabilityProfile): number {
  let score = 0;
  const { dataQuality, environmentalMetrics } = profile;

  // 1. Data Source Verification (Max 50)
  if (environmentalMetrics.epdSource) {
    const trustedHosts = [
      'environdec.com',
      'www.environdec.com',
      'epd.environdec.com',
      'ul.com',
      'www.ul.com',
      'buildingtransparency.org',
      'www.buildingtransparency.org',
    ];

    let isTrustedEpdsSource = false;
    try {
      const parsed = new URL(environmentalMetrics.epdSource);
      const host = parsed.hostname.toLowerCase();
      isTrustedEpdsSource = trustedHosts.includes(host);
    } catch {
      // Malformed URL; treat as generic link below
      isTrustedEpdsSource = false;
    }

    if (isTrustedEpdsSource) {
      score += 50; // Third-party verified repo
    } else {
      score += 30; // Generic link
    }
  } else if (dataQuality.sources.length > 0) {
    score += 10; // Has some sources
  }

  // 2. Data Quality Attributes (Max 30)
  if (dataQuality.completeness > 0.8) score += 20;
  else if (dataQuality.completeness > 0.5) score += 10;

  if (dataQuality.freshnessInDays < 365) score += 10;

  // 3. Standards Compliance (Max 20)
  if (profile.astmStandards.some(s => s.compliant)) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * Derive Health Grade if missing and calculate score
 */
function calculateHealthGradeScore(metrics: MaterialViabilityProfile['healthMetrics']): number {
  let grade = metrics.healthGrade;

  // Derive grade if missing
  if (!grade) {
    const voc = metrics.vocEmissions ?? 999;
    const formaldehyde = metrics.formaldehydeEmissions ?? 999;

    if (voc < 50 && formaldehyde < 10) grade = 'A';
    else if (voc < 100 && formaldehyde < 50) grade = 'B';
    else if (voc < 300) grade = 'C';
    else grade = 'F';
  }

  const gradeScores = { A: 100, B: 75, C: 50, F: 10 };
  return gradeScores[grade] ?? 50;
}

/**
 * Calculate Physical Properties Score (0-100)
 */
function calculatePhysicalScore(profile: MaterialViabilityProfile): number {
  if (!profile.physicalProperties) return 50; // Neutral default

  let score = 50;
  const props = profile.physicalProperties;
  let components = 0;

  // Hardness (Mohs 1-10) - Context dependent, but higher generally means more durable
  if (props.hardnessMohs) {
    score += (props.hardnessMohs / 10) * 20;
    components++;
  }

  // Scratch Resistance (0-100)
  if (props.scratchResistance) {
    score += (props.scratchResistance - 50) * 0.5;
    components++;
  }

  // Impact Resistance (higher is better, assuming normalized 0-100 input or raw J/m)
  // Simple check for now: bonus if present
  if (props.impactResistance) {
    score += 10;
    components++;
  }

  // Wear Resistance (Taber) - Higher cycles = better
  if (props.wearResistance) {
    if (props.wearResistance > 1000) score += 10;
    if (props.wearResistance > 5000) score += 10;
    components++;
  }

  // Water Absorption (Lower is better)
  if (props.waterAbsorption !== undefined) {
    if (props.waterAbsorption < 0.5) score += 20;
    else if (props.waterAbsorption > 5) score -= 20;
    components++;
  }

  // Return adjusted score clamped 0-100
  // If no components were found, return neutral 50
  return components > 0 ? Math.max(0, Math.min(100, score)) : 50;
}

/**
 * Calculate Similarity Score (0-100) for material substitution
 */
function calculateSimilarityScore(profile: MaterialViabilityProfile): number {
  if (!profile.similarityMetrics) return 100; // Not a substitution scenario -> Perfect score (not a negative factor)

  const sim = profile.similarityMetrics;
  let totalScore = 0;
  let count = 0;

  if (sim.hardnessSimilarity !== undefined) { totalScore += sim.hardnessSimilarity; count++; }
  if (sim.densitySimilarity !== undefined) { totalScore += sim.densitySimilarity; count++; }
  if (sim.colorSimilarity !== undefined) { totalScore += sim.colorSimilarity; count++; }
  if (sim.textureSimilarity !== undefined) { totalScore += sim.textureSimilarity; count++; }
  if (sim.frictionSimilarity !== undefined) { totalScore += sim.frictionSimilarity; count++; }

  return count > 0 ? totalScore / count : 100;
}
