/**
 * Shadow Catalog Service
 * 
 * Provides catalog/search functionality that can recommend materials
 * from shadow suppliers without revealing supplier identities.
 * This enables buyers to discover materials while maintaining
 * supplier anonymity until the supplier claims their profile.
 * 
 * @module services/shadow/catalog
 */

const { pool } = require('../../db');

/**
 * Search options defaults
 */
const DEFAULT_OPTIONS = {
    limit: 50,
    offset: 0,
    includeAnonymous: true,
    includeVerified: true
};

/**
 * Anonymize supplier data in product results
 * @param {object} product - Product with supplier data
 * @returns {object} - Product with anonymized supplier
 */
function anonymizeSupplier(product) {
    return {
        ...product,
        supplier_name: 'Anonymous Supplier',
        supplier_email: null,
        supplier_id: null,
        is_anonymous: true,
        claim_status: 'available_to_claim'
    };
}

/**
 * Search materials from both verified and shadow suppliers
 * Shadow supplier identities are masked in results
 * @param {object} criteria - Search criteria
 * @param {object} options - Search options
 * @returns {Promise<{materials: Array, total: number}>}
 */
async function searchMaterials(criteria = {}, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const {
        materialType,
        application,
        certifications,
        minGwp,
        maxGwp,
        query
    } = criteria;
    
    const params = [];
    let paramIndex = 1;
    
    // Build WHERE clauses
    const whereClauses = [];
    
    if (materialType) {
        whereClauses.push(`material_type ILIKE $${paramIndex}`);
        params.push(`%${materialType}%`);
        paramIndex++;
    }
    
    if (application) {
        whereClauses.push(`application ILIKE $${paramIndex}`);
        params.push(`%${application}%`);
        paramIndex++;
    }
    
    if (certifications && certifications.length > 0) {
        whereClauses.push(`certifications && $${paramIndex}`);
        params.push(certifications);
        paramIndex++;
    }
    
    if (query) {
        whereClauses.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${query}%`);
        paramIndex++;
    }
    
    const whereClause = whereClauses.length > 0 
        ? `AND ${whereClauses.join(' AND ')}`
        : '';
    
    // GWP filters for shadow products only
    let gwpWhere = '';
    if (minGwp !== undefined || maxGwp !== undefined) {
        if (minGwp !== undefined) {
            gwpWhere += ` AND (gwp_value >= ${minGwp} OR gwp_value IS NULL)`;
        }
        if (maxGwp !== undefined) {
            gwpWhere += ` AND (gwp_value <= ${maxGwp} OR gwp_value IS NULL)`;
        }
    }
    
    try {
        // Combined query for verified + anonymous products
        const query = `
            WITH all_materials AS (
                ${opts.includeVerified ? `
                -- Verified products from claimed suppliers
                SELECT
                    p.id AS material_id,
                    p.name AS material_name,
                    p.description,
                    p.material_type,
                    p.application,
                    p.certifications,
                    p.sustainability_data,
                    p.specs,
                    NULL::JSONB AS epd_data,
                    NULL::DECIMAL AS gwp_value,
                    NULL::TEXT AS gwp_unit,
                    'verified' AS source,
                    s.name AS supplier_name,
                    s.email AS supplier_email,
                    s.id AS supplier_id,
                    FALSE AS is_anonymous,
                    'verified' AS claim_status,
                    p.created_at,
                    p.updated_at
                FROM products p
                JOIN suppliers s ON p.supplier_id = s.id
                WHERE s.tier != 'scraped'
                    ${whereClause}
                ` : 'SELECT NULL WHERE FALSE'}
                
                ${opts.includeVerified && opts.includeAnonymous ? 'UNION ALL' : ''}
                
                ${opts.includeAnonymous ? `
                -- Anonymous products from shadow suppliers
                SELECT
                    sp.id AS material_id,
                    sp.name AS material_name,
                    sp.description,
                    sp.material_type,
                    sp.application,
                    sp.certifications,
                    sp.sustainability_data,
                    sp.specs,
                    sp.epd_data,
                    sp.gwp_value,
                    sp.gwp_unit,
                    sp.source,
                    'Anonymous Supplier' AS supplier_name,
                    NULL::TEXT AS supplier_email,
                    NULL::UUID AS supplier_id,
                    TRUE AS is_anonymous,
                    'available_to_claim' AS claim_status,
                    sp.created_at,
                    sp.updated_at
                FROM shadow_products sp
                JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
                WHERE sp.visibility = 'anonymous'
                    AND ssd.opt_out_status = 'active'
                    AND ssd.claimed_status = 'unclaimed'
                    ${whereClause}
                    ${gwpWhere}
                ` : ''}
            )
            SELECT * FROM all_materials
            ORDER BY created_at DESC
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
        `;
        
        params.push(opts.limit, opts.offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total FROM (
                ${opts.includeVerified ? `
                SELECT p.id FROM products p
                JOIN suppliers s ON p.supplier_id = s.id
                WHERE s.tier != 'scraped'
                    ${whereClause}
                ` : 'SELECT NULL WHERE FALSE'}
                
                ${opts.includeVerified && opts.includeAnonymous ? 'UNION ALL' : ''}
                
                ${opts.includeAnonymous ? `
                SELECT sp.id FROM shadow_products sp
                JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
                WHERE sp.visibility = 'anonymous'
                    AND ssd.opt_out_status = 'active'
                    AND ssd.claimed_status = 'unclaimed'
                    ${whereClause}
                    ${gwpWhere}
                ` : ''}
            ) combined
        `;
        
        const countParams = params.slice(0, -2); // Remove limit/offset
        const countResult = await pool.query(countQuery, countParams);
        
        return {
            materials: result.rows,
            total: parseInt(countResult.rows[0].total, 10),
            limit: opts.limit,
            offset: opts.offset
        };
        
    } catch (error) {
        console.error('Error searching materials:', error);
        return { materials: [], total: 0 };
    }
}

/**
 * Get anonymous material by ID
 * Returns material without revealing shadow supplier identity
 * @param {string} materialId - UUID of the shadow product
 * @returns {Promise<object|null>}
 */
async function getAnonymousMaterial(materialId) {
    if (!materialId) return null;
    
    try {
        const result = await pool.query(
            `SELECT
                sp.id AS material_id,
                sp.name AS material_name,
                sp.description,
                sp.material_type,
                sp.application,
                sp.certifications,
                sp.sustainability_data,
                sp.specs,
                sp.epd_data,
                sp.gwp_value,
                sp.gwp_unit,
                sp.source,
                'Anonymous Supplier' AS supplier_name,
                ssd.category AS supplier_category,
                NULL::TEXT AS supplier_email,
                NULL::UUID AS supplier_id,
                TRUE AS is_anonymous,
                'available_to_claim' AS claim_status,
                sp.created_at,
                sp.updated_at
             FROM shadow_products sp
             JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
             WHERE sp.id = $1
               AND sp.visibility = 'anonymous'
               AND ssd.opt_out_status = 'active'
               AND ssd.claimed_status = 'unclaimed'`,
            [materialId]
        );
        
        return result.rows[0] || null;
        
    } catch (error) {
        console.error('Error getting anonymous material:', error);
        return null;
    }
}

/**
 * Get materials by category with anonymous supplier handling
 * @param {string} category - Material type/category
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
async function getMaterialsByCategory(category, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    if (!category) {
        return [];
    }
    
    try {
        const result = await pool.query(
            `SELECT
                sp.id AS material_id,
                sp.name AS material_name,
                sp.description,
                sp.material_type,
                sp.application,
                sp.certifications,
                sp.gwp_value,
                sp.gwp_unit,
                'Anonymous Supplier' AS supplier_name,
                TRUE AS is_anonymous,
                'available_to_claim' AS claim_status,
                sp.created_at
             FROM shadow_products sp
             JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
             WHERE sp.visibility = 'anonymous'
               AND ssd.opt_out_status = 'active'
               AND ssd.claimed_status = 'unclaimed'
               AND (sp.material_type ILIKE $1 OR ssd.category ILIKE $1)
             ORDER BY sp.gwp_value ASC NULLS LAST
             LIMIT $2
             OFFSET $3`,
            [`%${category}%`, opts.limit, opts.offset]
        );
        
        return result.rows;
        
    } catch (error) {
        console.error('Error getting materials by category:', error);
        return [];
    }
}

/**
 * Get low-carbon materials (sorted by GWP)
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
async function getLowCarbonMaterials(options = {}) {
    const opts = { limit: 20, ...options };
    
    try {
        const result = await pool.query(
            `SELECT
                sp.id AS material_id,
                sp.name AS material_name,
                sp.description,
                sp.material_type,
                sp.certifications,
                sp.gwp_value,
                sp.gwp_unit,
                'Anonymous Supplier' AS supplier_name,
                TRUE AS is_anonymous,
                sp.created_at
             FROM shadow_products sp
             JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
             WHERE sp.visibility = 'anonymous'
               AND ssd.opt_out_status = 'active'
               AND ssd.claimed_status = 'unclaimed'
               AND sp.gwp_value IS NOT NULL
             ORDER BY sp.gwp_value ASC
             LIMIT $1`,
            [opts.limit]
        );
        
        return result.rows;
        
    } catch (error) {
        console.error('Error getting low-carbon materials:', error);
        return [];
    }
}

/**
 * Get certified materials by certification type
 * @param {string} certification - Certification name (e.g., 'FSC', 'LEED')
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
async function getCertifiedMaterials(certification, options = {}) {
    const opts = { limit: 50, ...options };
    
    if (!certification) {
        return [];
    }
    
    try {
        const result = await pool.query(
            `SELECT
                sp.id AS material_id,
                sp.name AS material_name,
                sp.description,
                sp.material_type,
                sp.certifications,
                sp.gwp_value,
                sp.gwp_unit,
                'Anonymous Supplier' AS supplier_name,
                TRUE AS is_anonymous,
                sp.created_at
             FROM shadow_products sp
             JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
             WHERE sp.visibility = 'anonymous'
               AND ssd.opt_out_status = 'active'
               AND ssd.claimed_status = 'unclaimed'
               AND sp.certifications @> ARRAY[$1]::TEXT[]
             ORDER BY sp.created_at DESC
             LIMIT $2`,
            [certification, opts.limit]
        );
        
        return result.rows;
        
    } catch (error) {
        console.error('Error getting certified materials:', error);
        return [];
    }
}

/**
 * Get catalog statistics
 * @returns {Promise<object>}
 */
async function getCatalogStats() {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE is_anonymous = FALSE) AS verified_materials,
                COUNT(*) FILTER (WHERE is_anonymous = TRUE) AS anonymous_materials,
                COUNT(*) AS total_materials,
                COUNT(DISTINCT material_type) FILTER (WHERE is_anonymous = TRUE) AS anonymous_categories
            FROM (
                SELECT FALSE AS is_anonymous, material_type
                FROM products p
                JOIN suppliers s ON p.supplier_id = s.id
                WHERE s.tier != 'scraped'
                
                UNION ALL
                
                SELECT TRUE AS is_anonymous, material_type
                FROM shadow_products sp
                JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
                WHERE sp.visibility = 'anonymous'
                    AND ssd.opt_out_status = 'active'
                    AND ssd.claimed_status = 'unclaimed'
            ) combined
        `);
        
        return result.rows[0];
        
    } catch (error) {
        console.error('Error getting catalog stats:', error);
        return {
            verified_materials: 0,
            anonymous_materials: 0,
            total_materials: 0,
            anonymous_categories: 0
        };
    }
}

/**
 * Get available material types from shadow products
 * @returns {Promise<Array<string>>}
 */
async function getAnonymousMaterialTypes() {
    try {
        const result = await pool.query(`
            SELECT DISTINCT sp.material_type
            FROM shadow_products sp
            JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
            WHERE sp.visibility = 'anonymous'
                AND ssd.opt_out_status = 'active'
                AND ssd.claimed_status = 'unclaimed'
                AND sp.material_type IS NOT NULL
            ORDER BY sp.material_type
        `);
        
        return result.rows.map(r => r.material_type);
        
    } catch (error) {
        console.error('Error getting material types:', error);
        return [];
    }
}

module.exports = {
    searchMaterials,
    getAnonymousMaterial,
    getMaterialsByCategory,
    getLowCarbonMaterials,
    getCertifiedMaterials,
    getCatalogStats,
    getAnonymousMaterialTypes,
    anonymizeSupplier
};
