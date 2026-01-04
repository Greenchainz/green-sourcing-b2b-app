const { pool } = require('../../db');

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
 * @param {string} rfqId - The UUID of the RFQ.
 * @returns {Promise<Array>} - List of matching suppliers with calculated match scores.
 */
async function findMatchingSuppliers(rfqId) {
    if (!rfqId) {
        console.error('findMatchingSuppliers called without rfqId');
        return [];
    }

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
                        ORDER BY s.id, CASE WHEN s.id = $2 THEN 0 ELSE 1 END
                        LIMIT 100
                    `;
                    const res = await client.query(supplierQuery, [materialType, directSupplierId]);
                    suppliers = res.rows;
                } else {
                    // No material_type, just get the direct supplier
                    const res = await client.query('SELECT * FROM suppliers WHERE id = $1', [directSupplierId]);
                    suppliers = res.rows;
                }
            }
        } else if (rfq.category) {
            // Match by category if available
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
                WHERE LOWER(p.material_type) LIKE LOWER($1)
                   OR LOWER(p.application) LIKE LOWER($1)
                ORDER BY s.id
                LIMIT 100
            `;
            const res = await client.query(categoryQuery, [`%${rfq.category}%`]);
            suppliers = res.rows;
        }

        // 3. Fallback: If no matches found, get top suppliers by tier
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

        // 4. Calculate match scores
        const matchedSuppliers = suppliers.map(supplier => {
            const matchScore = calculateMatchScore(supplier, rfq);
            return { ...supplier, matchScore };
        });

        // 5. Filter suppliers with minimum viable score (> 25)
        const filtered = matchedSuppliers.filter(s => s.matchScore > 25);
        
        console.log(`Found ${filtered.length} matching suppliers for RFQ ${rfqId}`);
        return filtered;

    } catch (err) {
        console.error(`Error finding matching suppliers for RFQ ${rfqId}:`, err);
        return [];
    } finally {
        client.release();
    }
}

module.exports = {
    findMatchingSuppliers,
    calculateMatchScore
};
