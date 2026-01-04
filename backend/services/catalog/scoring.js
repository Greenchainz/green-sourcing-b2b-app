/**
 * Catalog Sustainability Scoring Service
 * 
 * Provides explainable sustainability scoring with breakdown
 * for materials in the catalog. Designed for UI display with
 * "why is this sustainable?" explanations.
 */

const { pool } = require('../../db');

// Scoring weights (aligned with main scoringService)
const WEIGHTS = {
    certifications: 35,   // Gold-standard third-party certifications
    carbon: 25,           // Carbon footprint / GWP
    transparency: 20,     // EPDs, data disclosure, B-Corp
    leed: 20              // LEED credit contribution
};

const TOTAL_WEIGHT = 100;

// Certification tiers with points (gold standard = highest)
const CERT_TIERS = {
    gold: {
        multiplier: 10,
        certifications: [
            'FSC 100%', 'FSC FM', 'Cradle to Cradle Platinum', 'Cradle to Cradle Gold',
            'LEED Platinum', 'Living Building Challenge', 'Declare Red List Free'
        ]
    },
    silver: {
        multiplier: 7,
        certifications: [
            'FSC Mix', 'FSC CoC', 'Cradle to Cradle Silver', 'Cradle to Cradle Bronze',
            'LEED Gold', 'B Corp Certified', 'GREENGUARD Gold', 'EPD Verified'
        ]
    },
    bronze: {
        multiplier: 4,
        certifications: [
            'FSC Recycled', 'Cradle to Cradle Basic', 'LEED Silver', 'GREENGUARD',
            'SCS Certified', 'FloorScore', 'UL Environment'
        ]
    },
    basic: {
        multiplier: 2,
        certifications: [
            'LEED Certified', 'Recycled Content', 'Low VOC', 'Energy Star',
            'Green Seal', 'EcoLogo'
        ]
    }
};

// GWP (Global Warming Potential) thresholds in kg CO2e
const GWP_THRESHOLDS = {
    excellent: { max: 50, score: 25, label: 'Very Low Carbon' },
    good: { max: 200, score: 20, label: 'Low Carbon' },
    average: { max: 500, score: 12, label: 'Moderate Carbon' },
    high: { max: 1000, score: 5, label: 'High Carbon' },
    veryHigh: { max: Infinity, score: 0, label: 'Very High Carbon' }
};

/**
 * Calculate certification score with explainable breakdown
 * @param {Array} certifications - Array of certification names/objects
 * @param {Object} additionalData - B-Corp, C2C level data
 * @returns {Object} - { score, maxScore, factors, tier }
 */
function calculateCertificationScore(certifications = [], additionalData = {}) {
    const factors = [];
    let points = 0;
    const certsByTier = { gold: [], silver: [], bronze: [], basic: [], unranked: [] };
    
    // Normalize certifications
    const normalizedCerts = certifications
        .map(c => typeof c === 'string' ? c : c?.name || c?.Name || '')
        .filter(Boolean);
    
    // Score each certification
    for (const cert of normalizedCerts) {
        const certUpper = cert.toUpperCase();
        let tierFound = null;
        
        for (const [tierName, tierData] of Object.entries(CERT_TIERS)) {
            if (tierData.certifications.some(tc => certUpper.includes(tc.toUpperCase()))) {
                tierFound = tierName;
                points += tierData.multiplier;
                certsByTier[tierName].push(cert);
                break;
            }
        }
        
        if (!tierFound) {
            points += 1; // Base point for any certification
            certsByTier.unranked.push(cert);
        }
    }
    
    // Add factors for each tier found
    if (certsByTier.gold.length > 0) {
        factors.push({
            type: 'certification',
            tier: 'gold',
            label: 'Gold Standard Certifications',
            description: `${certsByTier.gold.length} top-tier third-party verified certifications`,
            certifications: certsByTier.gold,
            points: certsByTier.gold.length * CERT_TIERS.gold.multiplier,
            icon: '🏆'
        });
    }
    
    if (certsByTier.silver.length > 0) {
        factors.push({
            type: 'certification',
            tier: 'silver',
            label: 'Strong Certifications',
            description: `${certsByTier.silver.length} verified eco-certifications`,
            certifications: certsByTier.silver,
            points: certsByTier.silver.length * CERT_TIERS.silver.multiplier,
            icon: '✅'
        });
    }
    
    if (certsByTier.bronze.length > 0) {
        factors.push({
            type: 'certification',
            tier: 'bronze',
            label: 'Standard Certifications',
            description: `${certsByTier.bronze.length} recognized eco-certifications`,
            certifications: certsByTier.bronze,
            points: certsByTier.bronze.length * CERT_TIERS.bronze.multiplier,
            icon: '🌿'
        });
    }
    
    // B-Corp bonus
    if (additionalData.bCorpScore && additionalData.bCorpScore > 0) {
        const bCorpBonus = Math.min(Math.round(additionalData.bCorpScore / 20), 5);
        points += bCorpBonus;
        factors.push({
            type: 'bcorp',
            label: 'B Corp Certified Supplier',
            description: `Supplier B Corp Impact Score: ${additionalData.bCorpScore}`,
            points: bCorpBonus,
            icon: '🌱'
        });
    }
    
    // Normalize to weight scale
    const maxRawPoints = 50;
    const score = Math.min(Math.round((points / maxRawPoints) * WEIGHTS.certifications), WEIGHTS.certifications);
    
    return {
        score,
        maxScore: WEIGHTS.certifications,
        rawPoints: points,
        factors,
        certificationCount: normalizedCerts.length
    };
}

/**
 * Calculate carbon/GWP score with breakdown
 * @param {Object} epdData - EPD data with GWP
 * @returns {Object} - { score, maxScore, factors, gwpValue }
 */
function calculateCarbonScore(epdData = {}) {
    const factors = [];
    
    const gwp = epdData.globalWarmingPotential || 
                epdData.GlobalWarmingPotential || 
                epdData.gwp;
    
    if (gwp === undefined || gwp === null) {
        return {
            score: Math.round(WEIGHTS.carbon * 0.3), // Neutral score when no data
            maxScore: WEIGHTS.carbon,
            factors: [{
                type: 'carbon',
                label: 'Carbon Data Unavailable',
                description: 'No EPD or GWP data available for this product',
                points: Math.round(WEIGHTS.carbon * 0.3),
                icon: '❓'
            }],
            gwpValue: null
        };
    }
    
    // Find the GWP threshold
    let threshold;
    for (const [key, value] of Object.entries(GWP_THRESHOLDS)) {
        if (gwp <= value.max) {
            threshold = { key, ...value };
            break;
        }
    }
    
    const score = Math.round((threshold.score / 25) * WEIGHTS.carbon);
    
    factors.push({
        type: 'carbon',
        label: threshold.label,
        description: `Global Warming Potential: ${gwp.toFixed(2)} kg CO2e`,
        points: score,
        threshold: threshold.key,
        icon: threshold.key === 'excellent' ? '🌿' : 
              threshold.key === 'good' ? '🍃' : 
              threshold.key === 'average' ? '🌫️' : '🏭'
    });
    
    return {
        score,
        maxScore: WEIGHTS.carbon,
        factors,
        gwpValue: gwp
    };
}

/**
 * Calculate transparency score (EPDs, data disclosure)
 * @param {Object} materialData - Material data including EPDs, documentation
 * @returns {Object} - { score, maxScore, factors }
 */
function calculateTransparencyScore(materialData = {}) {
    const factors = [];
    let points = 0;
    
    // EPD published
    if (materialData.hasEPD || (materialData.epd && materialData.epd.length > 0)) {
        points += 8;
        factors.push({
            type: 'transparency',
            label: 'EPD Published',
            description: 'Environmental Product Declaration provides full transparency',
            points: 8,
            icon: '📊'
        });
    }
    
    // Multiple EPDs (product-specific > industry average)
    if (materialData.epdType === 'Product-Specific') {
        points += 4;
        factors.push({
            type: 'transparency',
            label: 'Product-Specific EPD',
            description: 'Product-specific EPD (more accurate than industry average)',
            points: 4,
            icon: '🎯'
        });
    }
    
    // Materials composition disclosed
    if (materialData.materialsComposition && materialData.materialsComposition.length > 0) {
        points += 3;
        factors.push({
            type: 'transparency',
            label: 'Materials Disclosed',
            description: 'Full material composition transparency',
            points: 3,
            icon: '🔍'
        });
    }
    
    // Health Product Declaration
    if (materialData.hasHPD) {
        points += 3;
        factors.push({
            type: 'transparency',
            label: 'Health Product Declaration',
            description: 'Material health and chemical disclosure',
            points: 3,
            icon: '❤️'
        });
    }
    
    // Declare label (Living Building Challenge)
    if (materialData.hasDeclareLabel) {
        points += 5;
        factors.push({
            type: 'transparency',
            label: 'Declare Label',
            description: 'Living Building Challenge Declare transparency label',
            points: 5,
            icon: '🏷️'
        });
    }
    
    // Normalize to weight
    const maxRawPoints = 20;
    const score = Math.min(Math.round((points / maxRawPoints) * WEIGHTS.transparency), WEIGHTS.transparency);
    
    // Add neutral factor if no transparency data
    if (factors.length === 0) {
        factors.push({
            type: 'transparency',
            label: 'Limited Transparency Data',
            description: 'No EPD or material disclosure available',
            points: 0,
            icon: '❓'
        });
    }
    
    return {
        score,
        maxScore: WEIGHTS.transparency,
        factors
    };
}

/**
 * Calculate LEED contribution score
 * @param {Object} leedData - LEED credits data
 * @returns {Object} - { score, maxScore, factors, credits }
 */
function calculateLEEDScore(leedData = {}) {
    const factors = [];
    const credits = [];
    let points = 0;
    
    const leedCredits = leedData.leedCredits || leedData.credits || [];
    
    // Category weights for LEED
    const categoryWeights = {
        'Materials and Resources': 10,
        'MR': 10,
        'Indoor Environmental Quality': 8,
        'EQ': 8,
        'Energy and Atmosphere': 7,
        'EA': 7,
        'Sustainable Sites': 6,
        'SS': 6,
        'Water Efficiency': 5,
        'WE': 5
    };
    
    for (const credit of leedCredits) {
        const category = credit.creditCategory || credit.CreditCategory || credit.category;
        const weight = categoryWeights[category] || 3;
        const contribution = parseFloat(credit.contributionValue || credit.ContributionValue || 1);
        
        const creditPoints = Math.min(weight * contribution, 10);
        points += creditPoints;
        
        credits.push({
            category,
            name: credit.creditName || credit.CreditName || credit.name,
            contribution,
            points: Math.round(creditPoints * 10) / 10
        });
    }
    
    if (leedCredits.length > 0) {
        // Group by category for summary
        const categories = [...new Set(credits.map(c => c.category))];
        factors.push({
            type: 'leed',
            label: 'LEED Credit Eligible',
            description: `Contributes to ${leedCredits.length} LEED credits across ${categories.length} categories`,
            points: Math.round(points),
            categories,
            icon: '🏢'
        });
    }
    
    // Recycled content bonus
    if (leedData.recycledContent || leedData.recycledContentPercent > 0) {
        const recycledPct = leedData.recycledContentPercent || 50;
        const recycledBonus = Math.min(Math.round(recycledPct / 10), 5);
        points += recycledBonus;
        factors.push({
            type: 'leed',
            label: 'Recycled Content',
            description: `Contains ${recycledPct}% recycled materials (LEED MR credit)`,
            points: recycledBonus,
            icon: '♻️'
        });
    }
    
    // Regional materials
    if (leedData.isRegional) {
        points += 4;
        factors.push({
            type: 'leed',
            label: 'Regionally Sourced',
            description: 'Extracted and manufactured within 500 miles (LEED MR credit)',
            points: 4,
            icon: '📍'
        });
    }
    
    // Rapidly renewable
    if (leedData.isRapidlyRenewable) {
        points += 3;
        factors.push({
            type: 'leed',
            label: 'Rapidly Renewable',
            description: 'Made from materials that regenerate within 10 years',
            points: 3,
            icon: '🌱'
        });
    }
    
    // Normalize
    const maxRawPoints = 30;
    const score = Math.min(Math.round((points / maxRawPoints) * WEIGHTS.leed), WEIGHTS.leed);
    
    if (factors.length === 0) {
        factors.push({
            type: 'leed',
            label: 'No LEED Credit Data',
            description: 'LEED contribution not yet assessed',
            points: 0,
            icon: '❓'
        });
    }
    
    return {
        score,
        maxScore: WEIGHTS.leed,
        factors,
        credits
    };
}

/**
 * Calculate full sustainability breakdown for a material
 * 
 * @param {Object} material - Material/product data with all related info
 * @returns {Object} - Complete sustainability breakdown for UI display
 */
function calculateSustainabilityBreakdown(material) {
    if (!material) {
        return null;
    }
    
    // Extract relevant data
    const certifications = material.certifications || [];
    const additionalData = {
        bCorpScore: material.bCorpScore || material.supplier?.bCorpScore
    };
    
    const epdData = {
        globalWarmingPotential: material.epd?.[0]?.GlobalWarmingPotential || 
                               material.epd?.[0]?.globalWarmingPotential ||
                               material.globalWarmingPotential
    };
    
    const materialData = {
        hasEPD: material.epd && material.epd.length > 0,
        epdType: material.epd?.[0]?.EPDType || material.epd?.[0]?.type,
        materialsComposition: material.materialsComposition,
        hasHPD: material.hasHPD,
        hasDeclareLabel: material.hasDeclareLabel
    };
    
    const leedData = {
        leedCredits: material.leedCredits || [],
        recycledContent: material.recycledContent,
        recycledContentPercent: material.recycledContentPercent,
        isRegional: material.isRegional,
        isRapidlyRenewable: material.isRapidlyRenewable
    };
    
    // Calculate component scores
    const certScore = calculateCertificationScore(certifications, additionalData);
    const carbonScore = calculateCarbonScore(epdData);
    const transparencyScore = calculateTransparencyScore(materialData);
    const leedScore = calculateLEEDScore(leedData);
    
    // Calculate total
    const total = certScore.score + carbonScore.score + transparencyScore.score + leedScore.score;
    
    // Determine tier
    let tier, tierLabel;
    if (total >= 80) {
        tier = 'excellent';
        tierLabel = 'Highly Sustainable';
    } else if (total >= 60) {
        tier = 'good';
        tierLabel = 'Sustainable Choice';
    } else if (total >= 40) {
        tier = 'average';
        tierLabel = 'Moderate Sustainability';
    } else {
        tier = 'low';
        tierLabel = 'Below Average';
    }
    
    // Collect all factors and sort by points
    const allFactors = [
        ...certScore.factors,
        ...carbonScore.factors,
        ...transparencyScore.factors,
        ...leedScore.factors
    ].sort((a, b) => b.points - a.points);
    
    // Top reasons for sustainability (or lack thereof)
    const topReasons = allFactors
        .filter(f => f.points > 0)
        .slice(0, 5)
        .map(f => ({
            reason: f.label,
            description: f.description,
            icon: f.icon
        }));
    
    // Areas for improvement
    const improvements = allFactors
        .filter(f => f.points === 0 || f.label.includes('Unavailable') || f.label.includes('Limited'))
        .map(f => ({
            area: f.label,
            suggestion: f.type === 'transparency' ? 'Encourage supplier to publish EPD' :
                        f.type === 'carbon' ? 'Request EPD with GWP data' :
                        f.type === 'leed' ? 'Verify LEED credit eligibility' :
                        'Seek third-party certification'
        }));
    
    return {
        // Overall score
        total,
        maxScore: TOTAL_WEIGHT,
        tier,
        tierLabel,
        
        // Component breakdown (for UI charts)
        components: {
            certifications: {
                score: certScore.score,
                maxScore: certScore.maxScore,
                weight: WEIGHTS.certifications,
                percentage: Math.round((certScore.score / certScore.maxScore) * 100),
                factors: certScore.factors,
                certificationCount: certScore.certificationCount
            },
            carbon: {
                score: carbonScore.score,
                maxScore: carbonScore.maxScore,
                weight: WEIGHTS.carbon,
                percentage: Math.round((carbonScore.score / carbonScore.maxScore) * 100),
                factors: carbonScore.factors,
                gwpValue: carbonScore.gwpValue
            },
            transparency: {
                score: transparencyScore.score,
                maxScore: transparencyScore.maxScore,
                weight: WEIGHTS.transparency,
                percentage: Math.round((transparencyScore.score / transparencyScore.maxScore) * 100),
                factors: transparencyScore.factors
            },
            leed: {
                score: leedScore.score,
                maxScore: leedScore.maxScore,
                weight: WEIGHTS.leed,
                percentage: Math.round((leedScore.score / leedScore.maxScore) * 100),
                factors: leedScore.factors,
                credits: leedScore.credits
            }
        },
        
        // For quick UI display
        topReasons,
        improvements,
        
        // All factors for detailed view
        allFactors,
        
        // Weights for reference
        weights: WEIGHTS,
        
        // Metadata
        calculatedAt: new Date().toISOString()
    };
}

/**
 * Calculate and persist sustainability breakdown for a material
 * 
 * @param {string|number} materialId - Product ID
 * @returns {Object} - Sustainability breakdown
 */
async function calculateAndPersistBreakdown(materialId) {
    // Fetch material with all related data
    const query = `
        SELECT 
            p."ProductID" AS id,
            p."ProductName" AS name,
            -- Certifications
            (
                SELECT array_agg(c."Name")
                FROM Supplier_Certifications sc
                JOIN Certifications c ON sc."CertificationID" = c."CertificationID"
                WHERE sc."SupplierID" = p."SupplierID"
            ) AS certifications,
            -- EPD
            (
                SELECT json_agg(json_build_object(
                    'GlobalWarmingPotential', epd."GlobalWarmingPotential",
                    'EPDType', epd."EPDType"
                ))
                FROM Product_EPDs epd
                WHERE epd."ProductID" = p."ProductID"
            ) AS epd,
            -- LEED Credits
            (
                SELECT json_agg(json_build_object(
                    'creditCategory', lc."CreditCategory",
                    'creditName', lc."CreditName",
                    'contributionValue', lc."ContributionValue"
                ))
                FROM LEED_Product_Credits lc
                WHERE lc."ProductID" = p."ProductID"
            ) AS leed_credits,
            -- Materials Composition
            (
                SELECT json_agg(json_build_object(
                    'materialName', pmc."MaterialName",
                    'isRecycled', pmc."IsRecycled",
                    'percentage', pmc."Percentage"
                ))
                FROM Product_Materials_Composition pmc
                WHERE pmc."ProductID" = p."ProductID"
            ) AS materials_composition,
            -- B Corp Score
            bcorp."BCorpScore" AS bcorp_score
        FROM Products p
        LEFT JOIN Suppliers s ON p."SupplierID" = s."SupplierID"
        LEFT JOIN Supplier_BCorp_Data bcorp ON s."SupplierID" = bcorp."SupplierID"
        WHERE p."ProductID" = $1
    `;
    
    const result = await pool.query(query, [materialId]);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    const row = result.rows[0];
    
    // Calculate recycled content percent
    let recycledContentPercent = 0;
    if (row.materials_composition) {
        const recycledMaterials = row.materials_composition.filter(m => m.isRecycled);
        recycledContentPercent = recycledMaterials.reduce((sum, m) => sum + (parseFloat(m.percentage) || 0), 0);
    }
    
    const material = {
        id: row.id,
        name: row.name,
        certifications: row.certifications || [],
        epd: row.epd || [],
        leedCredits: row.leed_credits || [],
        materialsComposition: row.materials_composition || [],
        bCorpScore: row.bcorp_score,
        recycledContentPercent
    };
    
    const breakdown = calculateSustainabilityBreakdown(material);
    
    // Persist to database
    if (breakdown) {
        const upsertQuery = `
            INSERT INTO material_sustainability_scores (
                entity_type, entity_id, total_score, sustainability_score, 
                distance_score, leed_score, recommendation_tier, 
                components, why_recommended, calculated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                total_score = EXCLUDED.total_score,
                sustainability_score = EXCLUDED.sustainability_score,
                leed_score = EXCLUDED.leed_score,
                recommendation_tier = EXCLUDED.recommendation_tier,
                components = EXCLUDED.components,
                why_recommended = EXCLUDED.why_recommended,
                calculated_at = NOW()
        `;
        
        await pool.query(upsertQuery, [
            'product',
            String(materialId),
            breakdown.total,
            breakdown.components.certifications.score,
            breakdown.components.carbon.score, // Using carbon as "distance" proxy
            breakdown.components.leed.score,
            breakdown.tier,
            JSON.stringify(breakdown.components),
            JSON.stringify(breakdown.topReasons)
        ]);
    }
    
    return {
        materialId,
        materialName: material.name,
        ...breakdown
    };
}

/**
 * Get pre-calculated breakdown from database
 * 
 * @param {string|number} materialId - Product ID
 * @returns {Object|null} - Cached breakdown or null
 */
async function getCachedBreakdown(materialId) {
    const query = `
        SELECT 
            entity_id AS material_id,
            total_score,
            recommendation_tier AS tier,
            components,
            why_recommended AS top_reasons,
            calculated_at
        FROM material_sustainability_scores
        WHERE entity_type = 'product' AND entity_id = $1
        AND calculated_at > NOW() - INTERVAL '1 hour'
    `;
    
    const result = await pool.query(query, [String(materialId)]);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    const row = result.rows[0];
    
    return {
        materialId: row.material_id,
        total: row.total_score,
        tier: row.tier,
        components: row.components,
        topReasons: row.top_reasons,
        calculatedAt: row.calculated_at,
        cached: true
    };
}

module.exports = {
    // Main scoring function
    calculateSustainabilityBreakdown,
    
    // Component scoring (for testing/extension)
    calculateCertificationScore,
    calculateCarbonScore,
    calculateTransparencyScore,
    calculateLEEDScore,
    
    // Database operations
    calculateAndPersistBreakdown,
    getCachedBreakdown,
    
    // Constants
    WEIGHTS,
    CERT_TIERS,
    GWP_THRESHOLDS
};
