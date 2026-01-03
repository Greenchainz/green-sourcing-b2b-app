const { pool } = require('../../db');

/**
 * Calculates a match score (0-100) for a supplier against an RFQ.
 * @param {object} supplier - The supplier object.
 * @param {object} rfq - The RFQ object.
 * @returns {number} - The match score.
 */
function calculateMatchScore(supplier, rfq) {
    let score = 0;

    // 1. Product Category Match (40 points)
    // Assuming supplier has a 'categories' or similar field, or we check if they sell the product type requested
    // For MVP, we might rely on the fact that we selected them because they have the product.
    // So we give a base score.
    score += 40;

    // 2. Certification Requirements (30 points)
    // Check if supplier has certifications requested in RFQ
    // Assuming rfq.requirements.certifications is an array and supplier.certifications is an array
    if (rfq.project_details && rfq.project_details.certifications && supplier.certifications) {
        const required = rfq.project_details.certifications;
        const available = supplier.certifications;
        // Simple overlap check
        const matchCount = required.filter(c => available.includes(c)).length;
        if (required.length > 0) {
            score += (matchCount / required.length) * 30;
        } else {
            score += 30; // No specific requirements, full points
        }
    } else {
        score += 30; // Default if no data
    }

    // 3. Location/Service Radius (20 points)
    // We already do distance in priority score, but this is for capability match.
    // If within reasonable distance, full points.
    score += 20;

    // 4. Price Range Compatibility (10 points)
    // If known.
    score += 10;

    return Math.min(Math.round(score), 100);
}

/**
 * Finds suppliers that match the RFQ criteria.
 * @param {string} rfqId - The UUID of the RFQ.
 * @returns {Promise<Array>} - List of matching suppliers with calculated match scores.
 */
async function findMatchingSuppliers(rfqId) {
    const client = await pool.connect();
    try {
        // 1. Get RFQ details
        const rfqResult = await client.query('SELECT * FROM rfqs WHERE id = $1', [rfqId]);
        if (rfqResult.rows.length === 0) return [];
        const rfq = rfqResult.rows[0];

        // 2. Find candidate suppliers
        // For MVP, we might just look for suppliers who have the product_id or similar material_type
        // Or if product_id is NULL, we match by text/category.
        // Assuming RFQ has a product_id for now as per schema.

        let suppliers = [];
        if (rfq.product_id) {
            // Find suppliers who supply this product or similar products
            // MVP: Get the supplier of the product if it's a specific product request,
            // OR find other suppliers with same material_type.

            // Get product details to find category
            const productResult = await client.query('SELECT material_type FROM products WHERE id = $1', [rfq.product_id]);
            const materialType = productResult.rows[0]?.material_type;

            if (materialType) {
                const supplierQuery = `
                    SELECT s.*, array_agg(p.certifications) as certifications
                    FROM suppliers s
                    JOIN products p ON s.id = p.supplier_id
                    WHERE p.material_type = $1
                    GROUP BY s.id
                `;
                const res = await client.query(supplierQuery, [materialType]);
                suppliers = res.rows;
            }
        } else {
            // Fallback: fetch all suppliers for now or filter by some other means
             const res = await client.query('SELECT * FROM suppliers');
             suppliers = res.rows;
        }

        // 3. Calculate match scores
        const matchedSuppliers = suppliers.map(supplier => {
            const score = calculateMatchScore(supplier, rfq);
            return { ...supplier, matchScore: score };
        });

        // Filter out very low matches if needed (e.g. score < 50)
        return matchedSuppliers.filter(s => s.matchScore > 0);

    } catch (err) {
        console.error('Error finding matching suppliers:', err);
        return [];
    } finally {
        client.release();
    }
}

module.exports = {
    findMatchingSuppliers,
    calculateMatchScore
};
