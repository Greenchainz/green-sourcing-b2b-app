/**
 * Decision Logic Extractor - Backend Service
 * 
 * Extracts material-specific decision criteria from product documents
 * Integrates with Azure Document Intelligence pipeline
 */

/**
 * Target roles for each material category
 */
const TARGET_ROLES = {
    Flooring: ['Facility Manager', 'Flooring Subcontractor'],
    Insulation: ['Insurance Risk Manager', 'Architect'],
    Facade: ['Insurance Risk Manager', 'Architect'],
    Structure: ['Drywall Subcontractor', 'General Contractor']
};

/**
 * Regex patterns for flooring materials
 */
const FLOORING_PATTERNS = {
    category: [
        /\bflooring\b/i,
        /\bfloor\s+tile/i,
        /\blaminate\b/i,
        /\bvinyl\s+plank/i,
        /\bcarpet/i,
        /\bhardwood/i,
        /\bvct\b/i,
        /\blvt\b/i,
        /\blinoleum/i,
        /\bwax\b.*\bfloor/i,
        /\bpolish\b.*\bfloor/i
    ],
    noStripping: /no\s*strip(?:ping)?|strip[-]?free|never\s+strip/i,
    polishOnly: /polish\s*only|buff\s*only|no\s*wax|wax[-]?free/i,
    adhesiveFree: /adhesive[-]?free|click[-]?lock|floating(?:\s+floor)?|glue[-]?free/i,
    cleaningProtocol: /clean(?:ing)?(?:\s+protocol)?[:\s]+([^.\n]{10,100})/i,
    maintenanceCycle: /maintenance[:\s]+(?:every\s+)?(\d+)[-\s]*(?:month|mo)/i
};

/**
 * Regex patterns for insulation materials
 */
const INSULATION_PATTERNS = {
    category: [
        /\binsulation\b/i,
        /\bmineral\s+wool/i,
        /\brock\s+wool/i,
        /\bstone\s+wool/i,
        /\bfiberglass\s+batt/i,
        /\bspray\s+foam/i,
        /\bcellulose\s+insulation/i,
        /\br-value/i,
        /\bthermal\s+insulation/i
    ],
    nonCombustible: /non[-]?combustible|incombustible|class\s*a(?:1|2)?|fire[-]?proof/i,
    mineralWool: /mineral\s*wool|rock\s*wool|stone\s*wool/i,
    fireResistance: /fire\s*resist(?:ance|ant)?[:\s]*(\d+)[-\s]*(?:min(?:ute)?s?|hour?s?)/i,
    flameSpread: /flame\s*spread(?:\s*index)?[:\s]*(\d+)/i,
    smokeDeveloped: /smoke\s*developed(?:\s*index)?[:\s]*(\d+)/i
};

/**
 * Regex patterns for facade materials
 */
const FACADE_PATTERNS = {
    category: [
        /\bfacade\b/i,
        /\bcladding\b/i,
        /\bcurtain\s+wall/i,
        /\bexterior\s+wall/i,
        /\bsiding\b/i,
        /\bpanel\s+system/i,
        /\bbuilding\s+envelope/i,
        /\brainscreen/i
    ],
    // Facade uses same fire resistance patterns as insulation
    ...INSULATION_PATTERNS
};

/**
 * Regex patterns for structural materials
 */
const STRUCTURAL_PATTERNS = {
    category: [
        /\bdrywall\b/i,
        /\bgypsum\s+board/i,
        /\bsheetrock/i,
        /\bplasterboard/i,
        /\bcement\s+board/i,
        /\bstud\b/i,
        /\bframing/i,
        /\bstructural\s+panel/i,
        /\blightweight.*\bboard/i,
        /\binstallation\s+speed/i
    ],
    lightweight: /light[-]?weight|reduced\s*weight|easy\s*to\s*(?:lift|carry|handle)/i,
    speedOfInstall: /(?:fast|quick|rapid|easy)\s*install(?:ation)?|time[-]?saving|reduced\s*labor/i,
    weightPerSqFt: /(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?\s*(?:per|\/)\s*(?:sq\.?\s*ft|square\s*foot)/i,
    specialTools: /(?:special|specific)\s*(?:tools?|equipment)|requires?\s*(?:special|specific)\s*(?:tools?|equipment)/i,
    toolNames: /(?:using|with|requires?)\s+(?:a\s+)?([a-z]+\s+(?:tool|cutter|saw|driver|knife))/gi
};

/**
 * Detect material category from content
 * @param {string} content - Document content
 * @returns {string} Material category
 */
function detectMaterialCategory(content) {
    const lowerContent = content.toLowerCase();

    const scores = {
        Flooring: FLOORING_PATTERNS.category.filter(p => p.test(lowerContent)).length,
        Insulation: INSULATION_PATTERNS.category.filter(p => p.test(lowerContent)).length,
        Facade: FACADE_PATTERNS.category.filter(p => p.test(lowerContent)).length,
        Structure: STRUCTURAL_PATTERNS.category.filter(p => p.test(lowerContent)).length
    };

    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) {
        return 'Unknown';
    }

    // Find category with highest score
    for (const [category, score] of Object.entries(scores)) {
        if (score === maxScore) {
            return category;
        }
    }

    return 'Unknown';
}

/**
 * Extract flooring-specific criteria
 * @param {string} content - Document content
 * @returns {Object} Maintenance requirements
 */
function extractFlooringCriteria(content) {
    const noStripping = FLOORING_PATTERNS.noStripping.test(content);
    const polishOnly = FLOORING_PATTERNS.polishOnly.test(content);
    const adhesiveFree = FLOORING_PATTERNS.adhesiveFree.test(content);

    let cleaningProtocol = null;
    const cleaningMatch = content.match(FLOORING_PATTERNS.cleaningProtocol);
    if (cleaningMatch) {
        cleaningProtocol = cleaningMatch[1].trim();
    }

    let maintenanceCycleMonths = null;
    const maintenanceMatch = content.match(FLOORING_PATTERNS.maintenanceCycle);
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
 * Extract fire resistance criteria (for insulation/facade)
 * @param {string} content - Document content
 * @returns {Object} Fire resistance data
 */
function extractFireResistanceCriteria(content) {
    const nonCombustible = INSULATION_PATTERNS.nonCombustible.test(content);
    const mineralWool = INSULATION_PATTERNS.mineralWool.test(content);

    let fireResistanceRating = null;
    let fireResistanceMinutes = null;
    
    const ratingMatch = content.match(INSULATION_PATTERNS.fireResistance);
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

    let flameSpreadIndex = null;
    const flameSpreadMatch = content.match(INSULATION_PATTERNS.flameSpread);
    if (flameSpreadMatch) {
        flameSpreadIndex = parseInt(flameSpreadMatch[1], 10);
    }

    let smokeDevelopedIndex = null;
    const smokeMatch = content.match(INSULATION_PATTERNS.smokeDeveloped);
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
 * Extract installation criteria (for structural materials)
 * @param {string} content - Document content
 * @returns {Object} Installation data
 */
function extractInstallationCriteria(content) {
    const lightweight = STRUCTURAL_PATTERNS.lightweight.test(content);
    const speedOfInstall = STRUCTURAL_PATTERNS.speedOfInstall.test(content);

    let weightPerSqFt = null;
    const weightMatch = content.match(STRUCTURAL_PATTERNS.weightPerSqFt);
    if (weightMatch) {
        weightPerSqFt = parseFloat(weightMatch[1]);
    }

    const specialToolsRequired = STRUCTURAL_PATTERNS.specialTools.test(content);
    
    let specialTools = null;
    if (specialToolsRequired) {
        const toolMatches = [...content.matchAll(STRUCTURAL_PATTERNS.toolNames)];
        if (toolMatches.length > 0) {
            specialTools = toolMatches.map(m => 
                m[0].replace(/(?:using|with|requires?)\s+(?:a\s+)?/i, '').trim()
            );
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
 * Extract decision criteria based on category
 * @param {string} content - Document content
 * @param {string} category - Material category
 * @returns {Object} Decision criteria
 */
function extractDecisionCriteria(content, category) {
    const criteria = {};

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
    }

    return criteria;
}

/**
 * Validate decision logic and calculate relevance score
 * @param {string} category - Material category
 * @param {Object} criteria - Extracted criteria
 * @returns {Object} Validation result
 */
function validateDecisionLogic(category, criteria) {
    const missingCriteria = [];
    let criteriaMet = 0;
    let totalCriteria = 0;

    switch (category) {
        case 'Flooring': {
            totalCriteria = 3;
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
            totalCriteria = 3;
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
            totalCriteria = 2;
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
    const completionRatio = totalCriteria > 0 ? criteriaMet / totalCriteria : 0;
    let relevanceScore;

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
 * Main extraction function
 * @param {string} documentContent - Raw document content
 * @returns {Object} Decision logic result
 */
function extractDecisionLogic(documentContent) {
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

module.exports = {
    extractDecisionLogic,
    detectMaterialCategory,
    extractDecisionCriteria,
    validateDecisionLogic
};
