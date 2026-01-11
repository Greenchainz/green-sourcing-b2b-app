/**
 * Decision Logic Extractor Agent
 * 
 * Extracts material-specific decision criteria from product content
 * to enhance Azure Document Intelligence pipeline with role-based filtering
 */

import type {
  MaterialCategory,
  DecisionCriteria,
  DecisionLogicResult,
  RelevanceScore,
  MaintenanceRequirements,
  FireResistanceData,
  InstallationData
} from '../types/decision-logic';

import { TARGET_ROLES } from '../types/decision-logic';

/**
 * Detect the material category from document content
 * @param content - Raw text content from document
 * @returns Material category or 'Unknown'
 */
export function detectMaterialCategory(content: string): MaterialCategory {
  const lowerContent = content.toLowerCase();

  // Flooring detection patterns
  const flooringPatterns = [
    /\bflooring\b/,
    /\bfloor\s+tile/,
    /\blaminate\b/,
    /\bvinyl\s+plank/,
    /\bcarpet/,
    /\bhardwood/,
    /\bvct\b/,
    /\blvt\b/,
    /\blinoleum/,
    /\bwax\b.*\bfloor/,
    /\bpolish\b.*\bfloor/
  ];

  // Insulation detection patterns
  const insulationPatterns = [
    /\binsulation\b/,
    /\bmineral\s+wool/,
    /\brock\s+wool/,
    /\bstone\s+wool/,
    /\bfiberglass\s+batt/,
    /\bspray\s+foam/,
    /\bcellulose\s+insulation/,
    /\br-value/,
    /\bthermal\s+insulation/
  ];

  // Facade detection patterns
  const facadePatterns = [
    /\bfacade\b/,
    /\bcladding\b/,
    /\bcurtain\s+wall/,
    /\bexterior\s+wall/,
    /\bsiding\b/,
    /\bpanel\s+system/,
    /\bbuilding\s+envelope/,
    /\brainscreen/
  ];

  // Structural detection patterns
  const structuralPatterns = [
    /\bdrywall\b/,
    /\bgypsum\s+board/,
    /\bsheetrock/,
    /\bplasterboard/,
    /\bcement\s+board/,
    /\bstud\b/,
    /\bframing/,
    /\bstructural\s+panel/,
    /\blightweight.*\bboard/,
    /\binstallation\s+speed/
  ];

  // Check patterns in order of specificity
  const flooringScore = flooringPatterns.filter(p => p.test(lowerContent)).length;
  const insulationScore = insulationPatterns.filter(p => p.test(lowerContent)).length;
  const facadeScore = facadePatterns.filter(p => p.test(lowerContent)).length;
  const structuralScore = structuralPatterns.filter(p => p.test(lowerContent)).length;

  // Return category with highest score
  const scores = {
    Flooring: flooringScore,
    Insulation: insulationScore,
    Facade: facadeScore,
    Structure: structuralScore
  };

  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore === 0) {
    return 'Unknown';
  }

  // Find category with max score
  for (const [category, score] of Object.entries(scores)) {
    if (score === maxScore) {
      return category as MaterialCategory;
    }
  }

  return 'Unknown';
}

/**
 * Extract flooring-specific decision criteria
 */
function extractFlooringCriteria(content: string): MaintenanceRequirements {
  const lowerContent = content.toLowerCase();

  // No stripping pattern
  const noStripping = /no\s*strip(?:ping)?|strip[-]?free|never\s+strip/i.test(content);
  
  // Polish only pattern
  const polishOnly = /polish\s*only|buff\s*only|no\s*wax|wax[-]?free/i.test(content);
  
  // Adhesive-free pattern
  const adhesiveFree = /adhesive[-]?free|click[-]?lock|floating(?:\s+floor)?|glue[-]?free/i.test(content);

  // Cleaning protocol extraction
  let cleaningProtocol: string | undefined;
  const cleaningMatch = content.match(/clean(?:ing)?(?:\s+protocol)?[:\s]+([^.\n]{10,100})/i);
  if (cleaningMatch) {
    cleaningProtocol = cleaningMatch[1].trim();
  }

  // Maintenance cycle extraction
  let maintenanceCycleMonths: number | undefined;
  const maintenanceMatch = content.match(/maintenance[:\s]+(?:every\s+)?(\d+)[-\s]*(?:month|mo)/i);
  if (maintenanceMatch) {
    maintenanceCycleMonths = parseInt(maintenanceMatch[1], 10);
  }

  return {
    noStripping,
    polishOnly,
    adhesiveFree,
    cleaningProtocol,
    maintenanceCycleMonths
  };
}

/**
 * Extract insulation/facade fire resistance criteria
 */
function extractFireResistanceCriteria(content: string): FireResistanceData {
  const lowerContent = content.toLowerCase();

  // Non-combustible pattern
  const nonCombustible = /non[-]?combustible|incombustible|class\s*a(?:1|2)?|fire[-]?proof/i.test(content);
  
  // Mineral wool pattern
  const mineralWool = /mineral\s*wool|rock\s*wool|stone\s*wool/i.test(content);

  // Fire resistance rating extraction
  let fireResistanceRating: string | undefined;
  let fireResistanceMinutes: number | undefined;
  
  const ratingMatch = content.match(/fire\s*resist(?:ance|ant)?[:\s]*(\d+)[-\s]*(?:min(?:ute)?s?|hour?s?)/i);
  if (ratingMatch) {
    const value = parseInt(ratingMatch[1], 10);
    const unit = ratingMatch[0].toLowerCase();
    
    if (unit.includes('hour')) {
      fireResistanceMinutes = value * 60;
      fireResistanceRating = `${value} hour${value > 1 ? 's' : ''}`;
    } else {
      fireResistanceMinutes = value;
      fireResistanceRating = `${value} minute${value > 1 ? 's' : ''}`;
    }
  }

  // Flame spread index
  let flameSpreadIndex: number | undefined;
  const flameSpreadMatch = content.match(/flame\s*spread(?:\s*index)?[:\s]*(\d+)/i);
  if (flameSpreadMatch) {
    flameSpreadIndex = parseInt(flameSpreadMatch[1], 10);
  }

  // Smoke developed index
  let smokeDevelopedIndex: number | undefined;
  const smokeMatch = content.match(/smoke\s*developed(?:\s*index)?[:\s]*(\d+)/i);
  if (smokeMatch) {
    smokeDevelopedIndex = parseInt(smokeMatch[1], 10);
  }

  return {
    nonCombustible,
    mineralWool,
    fireResistanceRating,
    fireResistanceMinutes,
    flameSpreadIndex,
    smokeDevelopedIndex
  };
}

/**
 * Extract structural material installation criteria
 */
function extractInstallationCriteria(content: string): InstallationData {
  const lowerContent = content.toLowerCase();

  // Lightweight pattern
  const lightweight = /light[-]?weight|reduced\s*weight|easy\s*to\s*(?:lift|carry|handle)/i.test(content);
  
  // Speed of install pattern
  const speedOfInstall = /(?:fast|quick|rapid|easy)\s*install(?:ation)?|time[-]?saving|reduced\s*labor/i.test(content);

  // Weight per square foot extraction
  let weightPerSqFt: number | undefined;
  const weightMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?\s*(?:per|\/)\s*(?:sq\.?\s*ft|square\s*foot)/i);
  if (weightMatch) {
    weightPerSqFt = parseFloat(weightMatch[1]);
  }

  // Special tools detection
  const specialToolsRequired = /(?:special|specific)\s*(?:tools?|equipment)|requires?\s*(?:special|specific)\s*(?:tools?|equipment)/i.test(content);
  
  let specialTools: string[] | undefined;
  if (specialToolsRequired) {
    specialTools = [];
    // Try to extract tool names
    const toolMatches = content.match(/(?:using|with|requires?)\s+(?:a\s+)?([a-z]+\s+(?:tool|cutter|saw|driver|knife))/gi);
    if (toolMatches) {
      specialTools = toolMatches.map(m => m.replace(/(?:using|with|requires?)\s+(?:a\s+)?/i, '').trim());
    }
  }

  return {
    lightweight,
    speedOfInstall,
    weightPerSqFt,
    specialToolsRequired,
    specialTools
  };
}

/**
 * Extract decision criteria based on material category
 * @param content - Document content
 * @param category - Detected material category
 * @returns Category-specific decision criteria
 */
export function extractDecisionCriteria(
  content: string,
  category: MaterialCategory
): DecisionCriteria {
  const criteria: DecisionCriteria = {};

  switch (category) {
    case 'Flooring':
      criteria.maintenanceRequirements = extractFlooringCriteria(content);
      break;
    
    case 'Insulation':
    case 'Facade':
      criteria.fireResistanceData = extractFireResistanceCriteria(content);
      break;
    
    case 'Structure':
      criteria.installationData = extractInstallationCriteria(content);
      break;
    
    default:
      // Unknown category - no specific criteria
      break;
  }

  return criteria;
}

/**
 * Validate decision logic and calculate relevance score
 * @param category - Material category
 * @param criteria - Extracted criteria
 * @returns Relevance score and missing criteria list
 */
export function validateDecisionLogic(
  category: MaterialCategory,
  criteria: DecisionCriteria
): { relevanceScore: RelevanceScore; missingCriteria: string[]; validationNotes: string } {
  const missingCriteria: string[] = [];
  let criteriaMet = 0;
  let totalCriteria = 0;

  switch (category) {
    case 'Flooring': {
      totalCriteria = 3; // noStripping, polishOnly, adhesiveFree
      const maint = criteria.maintenanceRequirements;
      
      if (!maint) {
        missingCriteria.push('All maintenance requirements');
        break;
      }
      
      if (!maint.noStripping) missingCriteria.push('No Stripping requirement');
      else criteriaMet++;
      
      if (!maint.polishOnly) missingCriteria.push('Polish Only requirement');
      else criteriaMet++;
      
      if (!maint.adhesiveFree) missingCriteria.push('Adhesive-free requirement');
      else criteriaMet++;
      
      if (!maint.cleaningProtocol && !maint.maintenanceCycleMonths) {
        missingCriteria.push('Maintenance cycle data');
      }
      break;
    }

    case 'Insulation':
    case 'Facade': {
      totalCriteria = 3; // nonCombustible, mineralWool, fireResistance
      const fire = criteria.fireResistanceData;
      
      if (!fire) {
        missingCriteria.push('All fire resistance data');
        break;
      }
      
      if (!fire.nonCombustible) missingCriteria.push('Non-combustible classification');
      else criteriaMet++;
      
      if (!fire.mineralWool) missingCriteria.push('Mineral Wool composition');
      else criteriaMet++;
      
      if (!fire.fireResistanceRating) missingCriteria.push('Fire Resistance rating');
      else criteriaMet++;
      
      if (!fire.flameSpreadIndex && !fire.smokeDevelopedIndex) {
        missingCriteria.push('Flame spread or smoke developed index');
      }
      break;
    }

    case 'Structure': {
      totalCriteria = 2; // lightweight, speedOfInstall
      const install = criteria.installationData;
      
      if (!install) {
        missingCriteria.push('All installation data');
        break;
      }
      
      if (!install.lightweight) missingCriteria.push('Lightweight specification');
      else criteriaMet++;
      
      if (!install.speedOfInstall) missingCriteria.push('Speed of install data');
      else criteriaMet++;
      
      if (!install.weightPerSqFt) {
        missingCriteria.push('Weight per square foot');
      }
      break;
    }

    case 'Unknown':
      return {
        relevanceScore: 'Low',
        missingCriteria: ['Material category could not be determined'],
        validationNotes: 'Unable to classify material category - flagged as Low Relevance'
      };
  }

  // Calculate relevance score
  let relevanceScore: RelevanceScore;
  const completionRatio = totalCriteria > 0 ? criteriaMet / totalCriteria : 0;

  if (completionRatio >= 0.8) {
    relevanceScore = 'High';
  } else if (completionRatio >= 0.5) {
    relevanceScore = 'Medium';
  } else {
    relevanceScore = 'Low';
  }

  const targetRoles = TARGET_ROLES[category] || [];
  const validationNotes = missingCriteria.length === 0
    ? `All key decision criteria present for ${targetRoles.join(', ')}`
    : `Missing ${missingCriteria.length} criteria - flagged as ${relevanceScore} Relevance`;

  return { relevanceScore, missingCriteria, validationNotes };
}

/**
 * Main orchestrator function for decision logic extraction
 * @param documentContent - Raw document content from Azure Document Intelligence
 * @returns Complete decision logic result
 */
export function extractDecisionLogic(documentContent: string): DecisionLogicResult {
  // Step 1: Detect material category
  const materialCategory = detectMaterialCategory(documentContent);

  // Step 2: Extract category-specific criteria
  const decisionCriteria = extractDecisionCriteria(documentContent, materialCategory);

  // Step 3: Validate and score
  const { relevanceScore, missingCriteria, validationNotes } = validateDecisionLogic(
    materialCategory,
    decisionCriteria
  );

  // Step 4: Get target roles
  const targetRoles = materialCategory !== 'Unknown' 
    ? TARGET_ROLES[materialCategory] 
    : [];

  return {
    materialCategory,
    targetRoles,
    decisionCriteria,
    relevanceScore,
    missingCriteria,
    validationNotes
  };
}
