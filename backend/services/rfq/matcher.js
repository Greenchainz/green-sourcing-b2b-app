const { pool } = require('../../db');
const { visibility } = require('../shadow');

/**
 * Safely parse project_details which may be a string or object.
 * @param {string|object} projectDetails
 * @returns {object}
 */
function parseProjectDetails(projectDetails) {
    if (!projectDetails) return {};
    if (typeof projectDetails === 'object') return projectDetails;
    try {
        return JSON.parse(projectDetails);
    } catch (e) {
        return {};
    }
}

/**
 * Converts degrees to radians.
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
function toRadians(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Calculates distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers.
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

/**
 * Calculates a distance score (0-100) based on how close supplier is to RFQ location.
 * Closer suppliers get higher scores.
 * 
 * Score bands:
 * - Within 50km: 100 points
 * - 50-100km: 90 points
 * - 100-250km: 75 points
 * - 250-500km: 50 points
 * - 500-1000km: 25 points
 * - >1000km: 10 points
 * - No location data: 50 points (neutral)
 * 
 * @param {object} supplier - Supplier object with latitude/longitude
 * @param {object} rfq - RFQ object with project location data
 * @returns {{score: number, distance_km: number|null, has_location: boolean}}
 */
function calculateDistanceScore(supplier, rfq) {
    const projectDetails = parseProjectDetails(rfq?.project_details);
    
    // Get supplier coordinates
    const supplierLat = parseFloat(supplier?.latitude);
    const supplierLon = parseFloat(supplier?.longitude);
    
    // Get RFQ/project coordinates (could be in project_details or directly on rfq)
    const rfqLat = parseFloat(projectDetails?.latitude || rfq?.latitude);
    const rfqLon = parseFloat(projectDetails?.longitude || rfq?.longitude);
    
    // Check if we have valid coordinates for both
    const hasSupplierLocation = !isNaN(supplierLat) && !isNaN(supplierLon);
    const hasRfqLocation = !isNaN(rfqLat) && !isNaN(rfqLon);
    
    // If either location is missing, return neutral score
    if (!hasSupplierLocation || !hasRfqLocation) {
        return {
            score: 50, // Neutral score when location data unavailable
            distance_km: null,
            has_location: false,
            reason: hasSupplierLocation ? 'RFQ location not specified' : 
                    hasRfqLocation ? 'Supplier location not specified' : 
                    'No location data available'
        };
    }
    
    // Calculate actual distance
    const distanceKm = haversineDistance(supplierLat, supplierLon, rfqLat, rfqLon);
    
    // Score based on distance bands
    let score;
    let reason;
    
    if (distanceKm <= 50) {
        score = 100;
        reason = 'Local supplier (within 50km)';
    } else if (distanceKm <= 100) {
        score = 90;
        reason = 'Regional supplier (50-100km)';
    } else if (distanceKm <= 250) {
        score = 75;
        reason = 'Near-regional supplier (100-250km)';
    } else if (distanceKm <= 500) {
        score = 50;
        reason = 'National supplier (250-500km)';
    } else if (distanceKm <= 1000) {
        score = 25;
        reason = 'Extended national supplier (500-1000km)';
    } else {
        score = 10;
        reason = 'International/distant supplier (>1000km)';
    }
    
    return {
        score,
        distance_km: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
        has_location: true,
        reason
    };
}

/**
 * Anonymize supplier data for shadow/unclaimed suppliers.
 * Ensures scraped supplier identities are never revealed in RFQ matching.
 * @param {object} supplier - The supplier object
 * @returns {object} - Supplier with anonymized info if shadow
 */
function anonymizeIfShadow(supplier) {
    if (!supplier) return supplier;
    
    // If supplier tier is 'scraped', anonymize identifying info
    if (supplier.tier === 'scraped') {
        return {
            ...supplier,
            name: 'Anonymous Supplier',
            email: null,
            description: supplier.description ? 'Verified supplier with sustainable products' : null,
            is_shadow: true,
            can_receive_rfq: false // Shadow suppliers cannot receive RFQs directly
        };
    }
    
    return {
        ...supplier,
        is_shadow: false,
        can_receive_rfq: true
    };
}

/**
 * Calculates a match score (0-100) for a supplier against an RFQ.
 * Returns both total score and component breakdown for explainability.
 * 
 * Score Weight Distribution:
 * - Product Category Match: 35% (35 points max)
 * - Certification Match: 25% (25 points max)
 * - Distance/Location: 20% (20 points max)
 * - Category Match: 10% (10 points max)
 * - Tier Bonus: 10% (10 points max)
 * 
 * @param {object} supplier - The supplier object.
 * @param {object} rfq - The RFQ object.
 * @param {object} options - Options (e.g., { returnBreakdown: false })
 * @returns {number|{score: number, breakdown: object}} - The match score or score with breakdown
 */
function calculateMatchScore(supplier, rfq, options = {}) {
    const { returnBreakdown = false } = options;
    
    const breakdown = {
        product_category: { score: 0, max: 35, weight: '35%', reason: '' },
        certifications: { score: 0, max: 25, weight: '25%', reason: '' },
        distance: { score: 0, max: 20, weight: '20%', reason: '', distance_km: null },
        category: { score: 0, max: 10, weight: '10%', reason: '' },
        tier_bonus: { score: 0, max: 10, weight: '10%', reason: '' }
    };

    // 1. Product Category Match (35 points max)
    // Base score for being in the candidate pool
    breakdown.product_category.score = 35;
    breakdown.product_category.reason = 'Matched to candidate pool by product/material type';

    // 2. Certification Requirements (25 points max)
    const projectDetails = parseProjectDetails(rfq?.project_details);
    const requiredCerts = projectDetails.certifications || [];
    const supplierCerts = supplier.certifications || [];

    if (Array.isArray(requiredCerts) && requiredCerts.length > 0 && Array.isArray(supplierCerts)) {
        const matchedCerts = requiredCerts.filter(c => 
            supplierCerts.some(sc => 
                sc && c && sc.toLowerCase() === c.toLowerCase()
            )
        );
        const matchCount = matchedCerts.length;
        breakdown.certifications.score = Math.round((matchCount / requiredCerts.length) * 25);
        breakdown.certifications.reason = matchCount > 0 
            ? `Matched ${matchCount}/${requiredCerts.length} required certifications: ${matchedCerts.join(', ')}`
            : `No matching certifications (required: ${requiredCerts.join(', ')})`;
        breakdown.certifications.matched = matchedCerts;
        breakdown.certifications.required = requiredCerts;
    } else {
        // No specific requirements or no supplier certs to compare
        breakdown.certifications.score = 25;
        breakdown.certifications.reason = 'No specific certification requirements';
    }

    // 3. Distance/Location Score (20 points max) - Now using actual distance calculation
    const distanceResult = calculateDistanceScore(supplier, rfq);
    // Scale the 0-100 distance score to 0-20 points
    breakdown.distance.score = Math.round((distanceResult.score / 100) * 20);
    breakdown.distance.reason = distanceResult.reason;
    breakdown.distance.distance_km = distanceResult.distance_km;
    breakdown.distance.has_location = distanceResult.has_location;

    // 4. Category match (10 points max)
    if (rfq.category && supplier.category) {
        if (rfq.category.toLowerCase() === supplier.category.toLowerCase()) {
            breakdown.category.score = 10;
            breakdown.category.reason = `Exact category match: ${rfq.category}`;
        } else {
            breakdown.category.score = 0;
            breakdown.category.reason = `Category mismatch: RFQ(${rfq.category}) vs Supplier(${supplier.category})`;
        }
    } else {
        breakdown.category.score = 10; // No category filter, give full points
        breakdown.category.reason = 'No category filter applied';
    }

    // 5. Tier bonus (10 points max) - Premium suppliers get preference
    const tierBonuses = {
        enterprise: 10,
        premium: 10,
        pro: 7,
        standard: 5,
        claimed: 3,
        free: 2,
        scraped: 0
    };
    const tier = (supplier.tier || 'free').toLowerCase();
    breakdown.tier_bonus.score = tierBonuses[tier] || 2;
    breakdown.tier_bonus.reason = `Tier: ${tier} (${breakdown.tier_bonus.score}/10 bonus)`;
    breakdown.tier_bonus.tier = tier;

    // Calculate total score
    const totalScore = Math.min(
        breakdown.product_category.score +
        breakdown.certifications.score +
        breakdown.distance.score +
        breakdown.category.score +
        breakdown.tier_bonus.score,
        100
    );

    if (returnBreakdown) {
        return {
            score: totalScore,
            breakdown,
            calculated_at: new Date().toISOString()
        };
    }

    return totalScore;
}

/**
 * Finds suppliers that match the RFQ criteria.
 * Uses the canonical schema with lowercase table names.
 * 
 * IMPORTANT: This function EXCLUDES shadow/scraped suppliers from results.
 * Shadow suppliers cannot receive RFQs until they claim their profile.
 * Use findMatchingMaterials() to include anonymous shadow supplier materials.
 * 
 * @param {string} rfqId - The UUID of the RFQ.
 * @param {object} options - Options for matching
 * @returns {Promise<Array>} - List of matching suppliers with calculated match scores.
 */
async function findMatchingSuppliers(rfqId, options = {}) {
    if (!rfqId) {
        console.error('findMatchingSuppliers called without rfqId');
        return [];
    }
    
    const { includeShadow = false } = options;

    const client = await pool.connect();
    try {
        // 1. Get RFQ details (lowercase table name per canonical schema)
        const rfqResult = await client.query('SELECT * FROM rfqs WHERE id = $1', [rfqId]);
        if (rfqResult.rows.length === 0) {
            console.log(`RFQ ${rfqId} not found.`);
            return [];
        }
        const rfq = rfqResult.rows[0];

        let suppliers = [];
        
        // Shadow supplier filter - exclude 'scraped' tier unless explicitly included
        const shadowFilter = includeShadow ? '' : `AND s.tier != 'scraped'`;

        // 2. Find candidate suppliers based on product or category
        if (rfq.product_id) {
            // Find suppliers who supply this product or similar products by material_type
            const productResult = await client.query(
                'SELECT supplier_id, material_type FROM products WHERE id = $1',
                [rfq.product_id]
            );
            
            if (productResult.rows.length > 0) {
                const { supplier_id: directSupplierId, material_type: materialType } = productResult.rows[0];

                if (materialType) {
                    // Find all suppliers with products of same material_type
                    // EXCLUDES shadow/scraped suppliers by default
                    const supplierQuery = `
                        SELECT DISTINCT ON (s.id)
                            s.*,
                            COALESCE(
                                (SELECT array_agg(DISTINCT cert) 
                                 FROM products p2, unnest(COALESCE(p2.certifications, ARRAY[]::text[])) AS cert
                                 WHERE p2.supplier_id = s.id AND cert IS NOT NULL),
                                ARRAY[]::text[]
                            ) AS certifications
                        FROM suppliers s
                        JOIN products p ON s.id = p.supplier_id
                        WHERE p.material_type = $1
                            ${shadowFilter}
                        ORDER BY s.id, CASE WHEN s.id = $2 THEN 0 ELSE 1 END
                        LIMIT 100
                    `;
                    const res = await client.query(supplierQuery, [materialType, directSupplierId]);
                    suppliers = res.rows;
                } else {
                    // No material_type, just get the direct supplier (if not shadow)
                    const res = await client.query(
                        `SELECT * FROM suppliers WHERE id = $1 ${shadowFilter}`,
                        [directSupplierId]
                    );
                    suppliers = res.rows;
                }
            }
        } else if (rfq.category) {
            // Match by category if available - EXCLUDES shadow suppliers
            const categoryQuery = `
                SELECT DISTINCT ON (s.id)
                    s.*,
                    COALESCE(
                        (SELECT array_agg(DISTINCT cert)
                         FROM products p2, unnest(COALESCE(p2.certifications, ARRAY[]::text[])) AS cert
                         WHERE p2.supplier_id = s.id AND cert IS NOT NULL),
                        ARRAY[]::text[]
                    ) AS certifications
                FROM suppliers s
                JOIN products p ON s.id = p.supplier_id
                WHERE (LOWER(p.material_type) LIKE LOWER($1)
                   OR LOWER(p.application) LIKE LOWER($1))
                   ${shadowFilter}
                ORDER BY s.id
                LIMIT 100
            `;
            const res = await client.query(categoryQuery, [`%${rfq.category}%`]);
            suppliers = res.rows;
        }

        // 3. Fallback: If no matches found, get top suppliers by tier
        // NEVER includes 'scraped' tier in fallback
        if (suppliers.length === 0) {
            console.log(`No product/category matches for RFQ ${rfqId}, using tier fallback.`);
            const fallbackQuery = `
                SELECT s.*,
                       ARRAY[]::text[] AS certifications
                FROM suppliers s
                WHERE s.tier IN ('enterprise', 'pro', 'claimed')
                ORDER BY 
                    CASE s.tier 
                        WHEN 'enterprise' THEN 1 
                        WHEN 'pro' THEN 2 
                        WHEN 'claimed' THEN 3 
                        ELSE 4 
                    END
                LIMIT 50
            `;
            const res = await client.query(fallbackQuery);
            suppliers = res.rows;
        }

        // 4. Calculate match scores and mark shadow status
        const matchedSuppliers = suppliers.map(supplier => {
            const matchScore = calculateMatchScore(supplier, rfq);
            return anonymizeIfShadow({ ...supplier, matchScore });
        });

        // 5. Filter suppliers with minimum viable score (> 25)
        // Also filter out any shadow suppliers that can't receive RFQs
        const filtered = matchedSuppliers.filter(s => 
            s.matchScore > 25 && s.can_receive_rfq !== false
        );
        
        console.log(`Found ${filtered.length} matching suppliers for RFQ ${rfqId}`);
        return filtered;

    } catch (err) {
        console.error(`Error finding matching suppliers for RFQ ${rfqId}:`, err);
        return [];
    } finally {
        client.release();
    }
}

/**
 * Find matching materials from all sources (verified + shadow suppliers).
 * Shadow supplier identities are anonymized in results.
 * Use this for catalog/search functionality that recommends materials
 * without revealing supplier identities.
 * 
 * @param {object} criteria - Search criteria (materialType, category, certifications)
 * @param {object} options - Query options
 * @returns {Promise<Array>} - List of matching materials with anonymized suppliers
 */
async function findMatchingMaterials(criteria = {}, options = {}) {
    const { materialType, category, certifications, limit = 50 } = { ...criteria, ...options };
    
    const client = await pool.connect();
    try {
        const params = [];
        let paramIndex = 1;
        const whereClauses = [];
        
        if (materialType) {
            whereClauses.push(`material_type ILIKE $${paramIndex}`);
            params.push(`%${materialType}%`);
            paramIndex++;
        }
        
        if (category) {
            whereClauses.push(`(material_type ILIKE $${paramIndex} OR application ILIKE $${paramIndex})`);
            params.push(`%${category}%`);
            paramIndex++;
        }
        
        if (certifications && certifications.length > 0) {
            whereClauses.push(`certifications && $${paramIndex}`);
            params.push(certifications);
            paramIndex++;
        }
        
        const whereClause = whereClauses.length > 0 
            ? `AND ${whereClauses.join(' AND ')}`
            : '';
        
        // Combined query for verified products + anonymous shadow products
        const query = `
            -- Verified products from claimed suppliers (full supplier info)
            SELECT
                p.id AS material_id,
                p.name AS material_name,
                p.material_type,
                p.certifications,
                s.id AS supplier_id,
                s.name AS supplier_name,
                s.email AS supplier_email,
                s.tier AS supplier_tier,
                FALSE AS is_anonymous,
                TRUE AS can_contact
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE s.tier != 'scraped'
                ${whereClause}
            
            UNION ALL
            
            -- Anonymous products from shadow suppliers (masked supplier info)
            SELECT
                sp.id AS material_id,
                sp.name AS material_name,
                sp.material_type,
                sp.certifications,
                NULL::UUID AS supplier_id,
                'Anonymous Supplier' AS supplier_name,
                NULL::TEXT AS supplier_email,
                'scraped' AS supplier_tier,
                TRUE AS is_anonymous,
                FALSE AS can_contact
            FROM shadow_products sp
            JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
            WHERE sp.visibility = 'anonymous'
                AND ssd.opt_out_status = 'active'
                AND ssd.claimed_status = 'unclaimed'
                ${whereClause}
            
            ORDER BY material_name
            LIMIT $${paramIndex}
        `;
        
        params.push(limit);
        const result = await client.query(query, params);
        
        return result.rows;
        
    } catch (err) {
        console.error('Error finding matching materials:', err);
        return [];
    } finally {
        client.release();
    }
}

module.exports = {
    findMatchingSuppliers,
    findMatchingMaterials,
    calculateMatchScore,
    calculateDistanceScore,
    haversineDistance,
    anonymizeIfShadow
};
