/**
 * Material/Supplier Scoring Service
 * 
 * Implements explainable scoring that prioritizes:
 * 1. Sustainability certifications (FSC, C2C, B-Corp, EPDs)
 * 2. Distance/shipping impact (proximity = lower carbon footprint)
 * 3. LEED impact proxy (credits, EPD GWP values, certification levels)
 * 
 * Outputs a score breakdown object suitable for UI ("why recommended")
 * Persists computed scores for caching/dashboard.
 */

const MAX_SCORE = 100;
const MIN_SCORE = 0;

// Scoring weights (total = 100)
const WEIGHTS = {
    sustainability: 45,  // Certifications & eco-credentials
    distance: 25,        // Proximity/shipping impact
    leed: 30             // LEED credit contribution potential
};

// Certification tier values (gold standard = third-party verified)
const CERT_TIERS = {
    // Tier 1: Gold standard third-party certifications (highest value)
    tier1: {
        weight: 10,
        certs: ['FSC 100%', 'FSC FM', 'Cradle to Cradle Platinum', 'Cradle to Cradle Gold', 'LEED Platinum', 'Living Building Challenge']
    },
    // Tier 2: Strong third-party certifications
    tier2: {
        weight: 7,
        certs: ['FSC Mix', 'FSC CoC', 'Cradle to Cradle Silver', 'Cradle to Cradle Bronze', 'LEED Gold', 'B Corp Certified', 'GREENGUARD Gold']
    },
    // Tier 3: Standard eco-certifications
    tier3: {
        weight: 5,
        certs: ['FSC Recycled', 'Cradle to Cradle Basic', 'LEED Silver', 'GREENGUARD', 'EPD Verified', 'SCS Certified', 'FloorScore']
    },
    // Tier 4: Self-declared or basic certifications
    tier4: {
        weight: 2,
        certs: ['LEED Certified', 'Recycled Content', 'Low VOC', 'Energy Star']
    }
};

// LEED credit category weights
const LEED_CATEGORY_WEIGHTS = {
    'Materials and Resources': 10,
    'MR': 10,
    'Indoor Environmental Quality': 8,
    'EQ': 8,
    'Energy and Atmosphere': 7,
    'EA': 7,
    'Sustainable Sites': 6,
    'SS': 6,
    'Water Efficiency': 5,
    'WE': 5,
    'Innovation': 4,
    'IN': 4,
    'Regional Priority': 3,
    'RP': 3
};

// Distance thresholds in miles (for shipping carbon impact)
const DISTANCE_THRESHOLDS = {
    local: 100,       // <100 miles: local sourcing bonus
    regional: 500,    // <500 miles: regional advantage
    national: 1500,   // <1500 miles: national standard
    international: Infinity // >1500 miles: international penalty
};

/**
 * Haversine formula to calculate distance between two lat/lng points
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Calculate sustainability score based on certifications
 * @param {Array} certifications - Array of certification names or objects
 * @param {Object} additionalData - EPD, B-Corp, C2C data
 * @returns {Object} - Score breakdown
 */
function calculateSustainabilityScore(certifications = [], additionalData = {}) {
    const breakdown = {
        score: 0,
        maxScore: WEIGHTS.sustainability,
        factors: [],
        certificationDetails: []
    };

    let certPoints = 0;
    const normalizedCerts = certifications.map(c => 
        typeof c === 'string' ? c : c?.name || c?.CertificationName || ''
    ).filter(Boolean);

    // Score each certification by tier
    const scoredCerts = [];
    for (const cert of normalizedCerts) {
        const certUpper = cert.toUpperCase();
        let tierFound = null;
        let points = 1; // Base points for any certification

        for (const [tierName, tierData] of Object.entries(CERT_TIERS)) {
            if (tierData.certs.some(tc => certUpper.includes(tc.toUpperCase()))) {
                tierFound = tierName;
                points = tierData.weight;
                break;
            }
        }

        scoredCerts.push({ name: cert, tier: tierFound || 'tier4', points });
        certPoints += points;
        breakdown.certificationDetails.push({
            name: cert,
            tier: tierFound || 'unranked',
            points,
            verified: true
        });
    }

    // EPD bonus (Environmental Product Declaration = transparency)
    if (additionalData.hasEPD || additionalData.epd) {
        const epdBonus = 5;
        certPoints += epdBonus;
        breakdown.factors.push({
            factor: 'EPD Published',
            description: 'Environmental Product Declaration provides transparency',
            points: epdBonus,
            icon: '📊'
        });
    }

    // B-Corp bonus
    if (additionalData.bCorpScore) {
        const bCorpBonus = Math.min(additionalData.bCorpScore / 20, 5); // Max 5 points for 100+ score
        certPoints += bCorpBonus;
        breakdown.factors.push({
            factor: 'B Corp Certified',
            description: `B Corp score: ${additionalData.bCorpScore}`,
            points: Math.round(bCorpBonus * 10) / 10,
            icon: '🌱'
        });
    }

    // C2C level bonus
    if (additionalData.c2cLevel) {
        const c2cPoints = {
            'Platinum': 10,
            'Gold': 8,
            'Silver': 6,
            'Bronze': 4,
            'Basic': 2
        };
        const bonus = c2cPoints[additionalData.c2cLevel] || 0;
        certPoints += bonus;
        breakdown.factors.push({
            factor: 'Cradle to Cradle Certified',
            description: `${additionalData.c2cLevel} level certification`,
            points: bonus,
            icon: '♻️'
        });
    }

    // Normalize to weight scale (cap at max)
    const rawScore = Math.min(certPoints, 50); // Cap raw points
    breakdown.score = Math.round((rawScore / 50) * WEIGHTS.sustainability);
    
    // Add summary factors
    if (scoredCerts.length > 0) {
        const tier1Count = scoredCerts.filter(c => c.tier === 'tier1').length;
        const tier2Count = scoredCerts.filter(c => c.tier === 'tier2').length;
        
        if (tier1Count > 0) {
            breakdown.factors.push({
                factor: 'Gold Standard Certifications',
                description: `${tier1Count} top-tier third-party certifications`,
                points: tier1Count * CERT_TIERS.tier1.weight,
                icon: '🏆'
            });
        }
        if (tier2Count > 0) {
            breakdown.factors.push({
                factor: 'Strong Certifications',
                description: `${tier2Count} verified eco-certifications`,
                points: tier2Count * CERT_TIERS.tier2.weight,
                icon: '✅'
            });
        }
    }

    return breakdown;
}

/**
 * Calculate distance/shipping impact score
 * @param {Object} supplierLocation - {latitude, longitude, location}
 * @param {Object} buyerLocation - {latitude, longitude, location}
 * @returns {Object} - Score breakdown
 */
function calculateDistanceScore(supplierLocation = {}, buyerLocation = {}) {
    const breakdown = {
        score: 0,
        maxScore: WEIGHTS.distance,
        factors: [],
        distance: null,
        distanceCategory: null
    };

    const distance = calculateDistance(
        supplierLocation.latitude,
        supplierLocation.longitude,
        buyerLocation.latitude,
        buyerLocation.longitude
    );

    breakdown.distance = distance;

    if (distance === null) {
        // No geo data available - give median score
        breakdown.score = Math.round(WEIGHTS.distance * 0.5);
        breakdown.distanceCategory = 'unknown';
        breakdown.factors.push({
            factor: 'Location Unknown',
            description: 'Distance cannot be calculated without location data',
            points: breakdown.score,
            icon: '📍'
        });
        return breakdown;
    }

    // Score based on distance thresholds
    let scoreMultiplier;
    let category;
    let description;

    if (distance <= DISTANCE_THRESHOLDS.local) {
        scoreMultiplier = 1.0;
        category = 'local';
        description = `Local sourcing (${Math.round(distance)} miles) - minimal shipping carbon`;
    } else if (distance <= DISTANCE_THRESHOLDS.regional) {
        scoreMultiplier = 0.8;
        category = 'regional';
        description = `Regional supplier (${Math.round(distance)} miles) - low shipping impact`;
    } else if (distance <= DISTANCE_THRESHOLDS.national) {
        scoreMultiplier = 0.5;
        category = 'national';
        description = `National supplier (${Math.round(distance)} miles) - moderate shipping`;
    } else {
        scoreMultiplier = 0.2;
        category = 'international';
        description = `International/distant (${Math.round(distance)} miles) - high shipping carbon`;
    }

    breakdown.distanceCategory = category;
    breakdown.score = Math.round(WEIGHTS.distance * scoreMultiplier);

    const icons = {
        local: '🏠',
        regional: '🚚',
        national: '✈️',
        international: '🌍'
    };

    breakdown.factors.push({
        factor: `${category.charAt(0).toUpperCase() + category.slice(1)} Sourcing`,
        description,
        points: breakdown.score,
        icon: icons[category]
    });

    // Bonus for very local (<50 miles)
    if (distance <= 50) {
        const localBonus = 3;
        breakdown.score = Math.min(breakdown.score + localBonus, WEIGHTS.distance);
        breakdown.factors.push({
            factor: 'Ultra-Local Bonus',
            description: 'Within 50 miles - supports local economy & minimal transport',
            points: localBonus,
            icon: '⭐'
        });
    }

    return breakdown;
}

/**
 * Calculate LEED impact proxy score
 * @param {Object} productData - Product with LEED credits, EPD data, environmental data
 * @returns {Object} - Score breakdown
 */
function calculateLEEDScore(productData = {}) {
    const breakdown = {
        score: 0,
        maxScore: WEIGHTS.leed,
        factors: [],
        credits: [],
        gwpImpact: null
    };

    let leedPoints = 0;

    // LEED credits contribution
    const leedCredits = productData.leedCredits || [];
    for (const credit of leedCredits) {
        const categoryWeight = LEED_CATEGORY_WEIGHTS[credit.creditCategory] || 
                              LEED_CATEGORY_WEIGHTS[credit.CreditCategory] || 3;
        const contributionValue = Number(credit.contributionValue || credit.ContributionValue || 1);
        const creditPoints = categoryWeight * Math.min(contributionValue, 2);
        
        leedPoints += creditPoints;
        breakdown.credits.push({
            category: credit.creditCategory || credit.CreditCategory,
            creditName: credit.creditName || credit.CreditName,
            contribution: contributionValue,
            points: Math.round(creditPoints * 10) / 10
        });
    }

    if (leedCredits.length > 0) {
        breakdown.factors.push({
            factor: 'LEED Credit Eligible',
            description: `Contributes to ${leedCredits.length} LEED credit categories`,
            points: Math.round(leedPoints),
            icon: '🏢'
        });
    }

    // EPD/GWP scoring (lower GWP = better)
    const gwp = productData.globalWarmingPotential || 
                productData.gwp || 
                productData.epd?.globalWarmingPotential;
    
    if (gwp !== undefined && gwp !== null) {
        breakdown.gwpImpact = gwp;
        
        // Industry benchmarks vary by material, use general thresholds
        // Lower GWP = more points (inverse relationship)
        let gwpScore;
        if (gwp < 100) {
            gwpScore = 10; // Excellent - low carbon
        } else if (gwp < 500) {
            gwpScore = 7; // Good
        } else if (gwp < 1000) {
            gwpScore = 4; // Average
        } else {
            gwpScore = 1; // High carbon
        }
        
        leedPoints += gwpScore;
        breakdown.factors.push({
            factor: 'Low Carbon Footprint',
            description: `GWP: ${gwp} kg CO2e - ${gwpScore >= 7 ? 'excellent' : gwpScore >= 4 ? 'average' : 'high'} for building materials`,
            points: gwpScore,
            icon: '🌿'
        });
    }

    // Recycled content bonus (LEED MR credits)
    if (productData.recycledContent || productData.isRecycled) {
        const recycledPct = productData.recycledContentPercent || 50;
        const recycledBonus = Math.min(recycledPct / 10, 5);
        leedPoints += recycledBonus;
        breakdown.factors.push({
            factor: 'Recycled Content',
            description: `Contains ${recycledPct}% recycled materials`,
            points: Math.round(recycledBonus * 10) / 10,
            icon: '♻️'
        });
    }

    // Regional materials bonus (LEED MR credit)
    if (productData.isRegional || productData.regionallySourced) {
        leedPoints += 4;
        breakdown.factors.push({
            factor: 'Regionally Sourced',
            description: 'Extracted and manufactured within 500 miles',
            points: 4,
            icon: '📍'
        });
    }

    // Rapidly renewable materials bonus
    if (productData.isRapidlyRenewable) {
        leedPoints += 3;
        breakdown.factors.push({
            factor: 'Rapidly Renewable',
            description: 'Made from materials that regenerate within 10 years',
            points: 3,
            icon: '🌱'
        });
    }

    // Normalize to weight scale
    const rawScore = Math.min(leedPoints, 40); // Cap raw points
    breakdown.score = Math.round((rawScore / 40) * WEIGHTS.leed);

    return breakdown;
}

/**
 * Calculate comprehensive material/supplier score
 * @param {Object} params - Scoring parameters
 * @param {Array} params.certifications - List of certifications
 * @param {Object} params.supplierLocation - Supplier lat/lng
 * @param {Object} params.buyerLocation - Buyer/project lat/lng
 * @param {Object} params.productData - Product environmental data
 * @param {Object} params.supplierData - B-Corp, additional supplier data
 * @returns {Object} - Complete score breakdown
 */
function calculateComprehensiveScore({
    certifications = [],
    supplierLocation = {},
    buyerLocation = {},
    productData = {},
    supplierData = {}
}) {
    // Calculate individual components
    const sustainabilityBreakdown = calculateSustainabilityScore(certifications, {
        hasEPD: productData.hasEPD || productData.epd,
        bCorpScore: supplierData.bCorpScore,
        c2cLevel: productData.c2cLevel || productData.c2c?.level
    });

    const distanceBreakdown = calculateDistanceScore(supplierLocation, buyerLocation);

    const leedBreakdown = calculateLEEDScore(productData);

    // Calculate total score
    const totalScore = Math.min(
        sustainabilityBreakdown.score + 
        distanceBreakdown.score + 
        leedBreakdown.score,
        MAX_SCORE
    );

    // Determine recommendation tier
    let recommendationTier;
    let recommendationLabel;
    if (totalScore >= 80) {
        recommendationTier = 'excellent';
        recommendationLabel = 'Highly Recommended';
    } else if (totalScore >= 60) {
        recommendationTier = 'good';
        recommendationLabel = 'Recommended';
    } else if (totalScore >= 40) {
        recommendationTier = 'average';
        recommendationLabel = 'Acceptable';
    } else {
        recommendationTier = 'low';
        recommendationLabel = 'Below Average';
    }

    // Build "why recommended" summary
    const topFactors = [
        ...sustainabilityBreakdown.factors,
        ...distanceBreakdown.factors,
        ...leedBreakdown.factors
    ]
        .filter(f => f.points > 0)
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

    const whyRecommended = topFactors.map(f => ({
        reason: f.factor,
        description: f.description,
        icon: f.icon
    }));

    return {
        // Overall score
        totalScore,
        maxScore: MAX_SCORE,
        recommendationTier,
        recommendationLabel,
        
        // Why this is recommended (for UI)
        whyRecommended,
        
        // Component breakdowns
        components: {
            sustainability: {
                score: sustainabilityBreakdown.score,
                maxScore: sustainabilityBreakdown.maxScore,
                weight: WEIGHTS.sustainability,
                factors: sustainabilityBreakdown.factors,
                certifications: sustainabilityBreakdown.certificationDetails
            },
            distance: {
                score: distanceBreakdown.score,
                maxScore: distanceBreakdown.maxScore,
                weight: WEIGHTS.distance,
                distanceMiles: distanceBreakdown.distance,
                category: distanceBreakdown.distanceCategory,
                factors: distanceBreakdown.factors
            },
            leed: {
                score: leedBreakdown.score,
                maxScore: leedBreakdown.maxScore,
                weight: WEIGHTS.leed,
                credits: leedBreakdown.credits,
                gwpImpact: leedBreakdown.gwpImpact,
                factors: leedBreakdown.factors
            }
        },
        
        // Metadata
        weights: WEIGHTS,
        calculatedAt: new Date().toISOString()
    };
}

// ============================================
// Database Persistence Functions
// ============================================

const UPSERT_SCORE_SQL = `
INSERT INTO material_sustainability_scores (
    entity_type, entity_id, total_score, sustainability_score, distance_score, leed_score,
    recommendation_tier, components, why_recommended, calculated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    total_score = EXCLUDED.total_score,
    sustainability_score = EXCLUDED.sustainability_score,
    distance_score = EXCLUDED.distance_score,
    leed_score = EXCLUDED.leed_score,
    recommendation_tier = EXCLUDED.recommendation_tier,
    components = EXCLUDED.components,
    why_recommended = EXCLUDED.why_recommended,
    calculated_at = NOW()
RETURNING *`;

/**
 * Persist a computed score to the database
 * @param {Pool} pool - pg Pool
 * @param {string} entityType - 'product' or 'supplier'
 * @param {string|number} entityId - UUID or BIGINT ID
 * @param {Object} scoreData - Output from calculateComprehensiveScore
 */
async function persistScore(pool, entityType, entityId, scoreData) {
    const result = await pool.query(UPSERT_SCORE_SQL, [
        entityType,
        String(entityId),
        scoreData.totalScore,
        scoreData.components.sustainability.score,
        scoreData.components.distance.score,
        scoreData.components.leed.score,
        scoreData.recommendationTier,
        JSON.stringify(scoreData.components),
        JSON.stringify(scoreData.whyRecommended)
    ]);
    
    return {
        entityType,
        entityId,
        persisted: true,
        ...result.rows[0]
    };
}

/**
 * Get persisted score from database (with optional fresh calculation)
 * @param {Pool} pool - pg Pool
 * @param {string} entityType - 'product' or 'supplier'
 * @param {string|number} entityId - UUID or BIGINT ID
 * @param {number} maxAgeMinutes - Max age before recalculation (default 60)
 */
async function getPersistedScore(pool, entityType, entityId, maxAgeMinutes = 60) {
    const result = await pool.query(
        `SELECT * FROM material_sustainability_scores 
         WHERE entity_type = $1 AND entity_id = $2 
         AND calculated_at > NOW() - INTERVAL '${maxAgeMinutes} minutes'`,
        [entityType, String(entityId)]
    );
    
    if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
            totalScore: row.total_score,
            recommendationTier: row.recommendation_tier,
            components: row.components,
            whyRecommended: row.why_recommended,
            calculatedAt: row.calculated_at,
            cached: true
        };
    }
    
    return null;
}

/**
 * Score a product with all available data from the database
 * @param {Pool} pool - pg Pool
 * @param {string} productId - Product UUID or ID
 * @param {Object} buyerLocation - Optional buyer location {latitude, longitude}
 */
async function scoreProduct(pool, productId, buyerLocation = {}) {
    // Fetch product with related data
    const productQuery = `
        SELECT 
            p.*,
            s.latitude AS supplier_latitude,
            s.longitude AS supplier_longitude,
            s.location AS supplier_location,
            COALESCE(
                (SELECT json_agg(json_build_object(
                    'creditCategory', lc."CreditCategory",
                    'creditName', lc."CreditName",
                    'contributionValue', lc."ContributionValue"
                ))
                FROM "LEED_Product_Credits" lc WHERE lc."ProductID" = p.id::text::bigint),
                '[]'
            ) AS leed_credits,
            (SELECT row_to_json(epd) FROM "Product_EPDs" epd 
             WHERE epd."ProductID" = p.id::text::bigint LIMIT 1) AS epd_data,
            (SELECT row_to_json(c2c) FROM "C2C_Certifications" c2c 
             WHERE c2c."ProductID" = p.id::text::bigint LIMIT 1) AS c2c_data,
            (SELECT "BCorpScore" FROM "Supplier_BCorp_Data" bd 
             WHERE bd."SupplierID" = p.supplier_id::text::bigint) AS bcorp_score
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = $1
    `;

    const result = await pool.query(productQuery, [productId]);
    
    if (result.rows.length === 0) {
        return null;
    }

    const product = result.rows[0];
    
    // Calculate comprehensive score
    const scoreData = calculateComprehensiveScore({
        certifications: product.certifications || [],
        supplierLocation: {
            latitude: product.supplier_latitude,
            longitude: product.supplier_longitude,
            location: product.supplier_location
        },
        buyerLocation,
        productData: {
            leedCredits: product.leed_credits || [],
            hasEPD: !!product.epd_data,
            epd: product.epd_data,
            globalWarmingPotential: product.epd_data?.GlobalWarmingPotential,
            c2cLevel: product.c2c_data?.CertificationLevel,
            recycledContent: product.sustainability_data?.recycledContent,
            recycledContentPercent: product.sustainability_data?.recycledContentPercent,
            isRegional: product.sustainability_data?.isRegional,
            isRapidlyRenewable: product.sustainability_data?.isRapidlyRenewable
        },
        supplierData: {
            bCorpScore: product.bcorp_score
        }
    });

    // Persist score
    await persistScore(pool, 'product', productId, scoreData);

    return {
        productId,
        productName: product.name,
        ...scoreData
    };
}

/**
 * Score a supplier with aggregated product/certification data
 * @param {Pool} pool - pg Pool
 * @param {string} supplierId - Supplier UUID or ID
 * @param {Object} buyerLocation - Optional buyer location
 */
async function scoreSupplier(pool, supplierId, buyerLocation = {}) {
    // Fetch supplier with certifications and aggregated data
    const supplierQuery = `
        SELECT 
            s.*,
            (SELECT array_agg(DISTINCT cert) 
             FROM products p, unnest(COALESCE(p.certifications, ARRAY[]::text[])) AS cert
             WHERE p.supplier_id = s.id AND cert IS NOT NULL) AS all_certifications,
            (SELECT "BCorpScore" FROM "Supplier_BCorp_Data" bd 
             WHERE bd."SupplierID" = s.id::text::bigint) AS bcorp_score,
            (SELECT COUNT(*) FROM "Product_EPDs" epd 
             JOIN products p ON epd."ProductID" = p.id::text::bigint
             WHERE p.supplier_id = s.id) AS epd_count,
            (SELECT AVG(COALESCE(epd."GlobalWarmingPotential", 0))
             FROM "Product_EPDs" epd 
             JOIN products p ON epd."ProductID" = p.id::text::bigint
             WHERE p.supplier_id = s.id AND epd."GlobalWarmingPotential" IS NOT NULL) AS avg_gwp
        FROM suppliers s
        WHERE s.id = $1
    `;

    const result = await pool.query(supplierQuery, [supplierId]);
    
    if (result.rows.length === 0) {
        return null;
    }

    const supplier = result.rows[0];
    
    const scoreData = calculateComprehensiveScore({
        certifications: supplier.all_certifications || [],
        supplierLocation: {
            latitude: supplier.latitude,
            longitude: supplier.longitude,
            location: supplier.location
        },
        buyerLocation,
        productData: {
            hasEPD: supplier.epd_count > 0,
            globalWarmingPotential: supplier.avg_gwp
        },
        supplierData: {
            bCorpScore: supplier.bcorp_score
        }
    });

    // Persist score
    await persistScore(pool, 'supplier', supplierId, scoreData);

    return {
        supplierId,
        supplierName: supplier.name,
        ...scoreData
    };
}

/**
 * Batch score multiple products efficiently
 * @param {Pool} pool - pg Pool
 * @param {Array} productIds - Array of product IDs
 * @param {Object} buyerLocation - Buyer location for distance calc
 */
async function batchScoreProducts(pool, productIds, buyerLocation = {}) {
    const results = [];
    
    // Process in batches of 50 to avoid overwhelming the DB
    const batchSize = 50;
    for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const promises = batch.map(id => scoreProduct(pool, id, buyerLocation));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter(Boolean));
    }
    
    return results;
}

/**
 * Get top scored products for a category
 * @param {Pool} pool - pg Pool
 * @param {string} category - Material type or category
 * @param {number} limit - Max results
 */
async function getTopScoredProducts(pool, category = null, limit = 20) {
    let query = `
        SELECT 
            mss.*,
            p.name AS product_name,
            p.material_type,
            s.name AS supplier_name
        FROM material_sustainability_scores mss
        JOIN products p ON mss.entity_id = p.id::text AND mss.entity_type = 'product'
        LEFT JOIN suppliers s ON p.supplier_id = s.id
    `;
    
    const params = [];
    if (category) {
        query += ` WHERE p.material_type ILIKE $1`;
        params.push(`%${category}%`);
    }
    
    query += ` ORDER BY mss.total_score DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    return result.rows.map(row => ({
        productId: row.entity_id,
        productName: row.product_name,
        materialType: row.material_type,
        supplierName: row.supplier_name,
        totalScore: row.total_score,
        recommendationTier: row.recommendation_tier,
        whyRecommended: row.why_recommended,
        components: {
            sustainability: row.sustainability_score,
            distance: row.distance_score,
            leed: row.leed_score
        },
        calculatedAt: row.calculated_at
    }));
}

/**
 * Get scoring statistics for dashboard
 * @param {Pool} pool - pg Pool
 */
async function getScoringStats(pool) {
    const statsQuery = `
        SELECT 
            entity_type,
            COUNT(*) AS total_scored,
            ROUND(AVG(total_score), 1) AS avg_score,
            MIN(total_score) AS min_score,
            MAX(total_score) AS max_score,
            COUNT(*) FILTER (WHERE recommendation_tier = 'excellent') AS excellent_count,
            COUNT(*) FILTER (WHERE recommendation_tier = 'good') AS good_count,
            COUNT(*) FILTER (WHERE recommendation_tier = 'average') AS average_count,
            COUNT(*) FILTER (WHERE recommendation_tier = 'low') AS low_count
        FROM material_sustainability_scores
        GROUP BY entity_type
    `;
    
    const result = await pool.query(statsQuery);
    
    return result.rows.reduce((acc, row) => {
        acc[row.entity_type] = {
            totalScored: Number(row.total_scored),
            avgScore: Number(row.avg_score),
            minScore: Number(row.min_score),
            maxScore: Number(row.max_score),
            distribution: {
                excellent: Number(row.excellent_count),
                good: Number(row.good_count),
                average: Number(row.average_count),
                low: Number(row.low_count)
            }
        };
        return acc;
    }, {});
}

module.exports = {
    // Core scoring functions
    calculateComprehensiveScore,
    calculateSustainabilityScore,
    calculateDistanceScore,
    calculateLEEDScore,
    
    // Distance utility
    calculateDistance,
    
    // Database operations
    persistScore,
    getPersistedScore,
    scoreProduct,
    scoreSupplier,
    batchScoreProducts,
    getTopScoredProducts,
    getScoringStats,
    
    // Constants for external use
    WEIGHTS,
    CERT_TIERS,
    LEED_CATEGORY_WEIGHTS,
    DISTANCE_THRESHOLDS
};
