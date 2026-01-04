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
 * @param {object} supplier - The supplier object.
 * @param {object} rfq - The RFQ object.
 * @returns {number} - The match score.
 */
function calculateMatchScore(supplier, rfq) {
    let score = 0;

    // 1. Product Category Match (40 points)
    // Base score for being in the candidate pool
    score += 40;

    // 2. Certification Requirements (30 points)
    const projectDetails = parseProjectDetails(rfq?.project_details);
    const requiredCerts = projectDetails.certifications || [];
    const supplierCerts = supplier.certifications || [];

    if (Array.isArray(requiredCerts) && requiredCerts.length > 0 && Array.isArray(supplierCerts)) {
        const matchCount = requiredCerts.filter(c => 
            supplierCerts.some(sc => 
                sc && c && sc.toLowerCase() === c.toLowerCase()
            )
        ).length;
        score += (matchCount / requiredCerts.length) * 30;
    } else {
        // No specific requirements or no supplier certs to compare
        score += 30;
    }

    // 3. Location/Service Radius (20 points)
    // If supplier has location data, give full points
    if (supplier.latitude && supplier.longitude) {
        score += 20;
    } else if (supplier.location) {
        score += 10; // Partial credit for text location
    } else {
        score += 5; // Minimal credit
    }

    // 4. Category match bonus (10 points)
    if (rfq.category && supplier.category) {
        if (rfq.category.toLowerCase() === supplier.category.toLowerCase()) {
            score += 10;
        }
    } else {
        score += 10; // No category filter, give full points
    }

    return Math.min(Math.round(score), 100);
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
    anonymizeIfShadow
};
