/**
 * Shadow Supplier Service
 * 
 * Handles ingestion, visibility rules, and claim primitives for
 * scraped/unclaimed suppliers. Shadow suppliers are never publicly
 * listed until they claim their profile via the opt-in flow.
 * 
 * @module services/shadow
 */

const { pool } = require('../../db');
const crypto = require('crypto');

// Re-export sub-modules
const ingestion = require('./ingestion');
const visibility = require('./visibility');
const claimFlow = require('./claimFlow');
const catalog = require('./catalog');

/**
 * Shadow supplier status constants
 */
const CLAIM_STATUS = {
    UNCLAIMED: 'unclaimed',
    CLAIMED: 'claimed'
};

const OPT_OUT_STATUS = {
    ACTIVE: 'active',
    OPTED_OUT: 'opted_out',
    PENDING_REMOVAL: 'pending_removal'
};

const PRODUCT_VISIBILITY = {
    ANONYMOUS: 'anonymous',
    HIDDEN: 'hidden',
    CLAIMED: 'claimed'
};

const TOKEN_TYPES = {
    CLAIM: 'claim',
    VERIFICATION: 'verification',
    PASSWORD_RESET: 'password_reset'
};

const INGESTION_SOURCES = {
    MANUAL: 'manual',
    SCRAPER: 'scraper',
    API: 'api',
    PARTNER: 'partner',
    EC3: 'ec3',
    FSC: 'fsc',
    BCORP: 'bcorp'
};

/**
 * Check if a supplier is a shadow supplier (scraped/unclaimed)
 * @param {string} supplierId - UUID of the supplier
 * @returns {Promise<boolean>}
 */
async function isShadowSupplier(supplierId) {
    if (!supplierId) return false;
    
    try {
        const result = await pool.query(
            `SELECT tier FROM suppliers WHERE id = $1`,
            [supplierId]
        );
        
        if (result.rows.length === 0) return false;
        return result.rows[0].tier === 'scraped';
    } catch (error) {
        console.error('Error checking shadow supplier status:', error);
        return false;
    }
}

/**
 * Check if a shadow supplier entry exists by email
 * @param {string} email - Email to check
 * @returns {Promise<{exists: boolean, data?: object}>}
 */
async function findShadowSupplierByEmail(email) {
    if (!email) return { exists: false };
    
    try {
        const result = await pool.query(
            `SELECT id, company_name, email, category, claimed_status, opt_out_status
             FROM scraped_supplier_data
             WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        
        if (result.rows.length === 0) {
            return { exists: false };
        }
        
        return { exists: true, data: result.rows[0] };
    } catch (error) {
        console.error('Error finding shadow supplier by email:', error);
        return { exists: false };
    }
}

/**
 * Get shadow supplier by ID with full details
 * @param {string} shadowSupplierId - UUID of the shadow supplier
 * @returns {Promise<object|null>}
 */
async function getShadowSupplier(shadowSupplierId) {
    if (!shadowSupplierId) return null;
    
    try {
        const result = await pool.query(
            `SELECT 
                id,
                company_name,
                email,
                category,
                claimed_status,
                opt_out_status,
                source,
                source_url,
                claim_token_expires_at,
                linked_supplier_id,
                created_at,
                updated_at
             FROM scraped_supplier_data
             WHERE id = $1`,
            [shadowSupplierId]
        );
        
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting shadow supplier:', error);
        return null;
    }
}

/**
 * Get products associated with a shadow supplier
 * @param {string} shadowSupplierId - UUID of the shadow supplier
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
async function getShadowProducts(shadowSupplierId, options = {}) {
    if (!shadowSupplierId) return [];
    
    const { visibility: vis = 'anonymous', limit = 100 } = options;
    
    try {
        const result = await pool.query(
            `SELECT 
                id,
                name,
                description,
                material_type,
                application,
                certifications,
                sustainability_data,
                specs,
                epd_data,
                gwp_value,
                gwp_unit,
                visibility,
                created_at
             FROM shadow_products
             WHERE shadow_supplier_id = $1
               AND ($2 = 'all' OR visibility = $2)
             ORDER BY created_at DESC
             LIMIT $3`,
            [shadowSupplierId, vis, limit]
        );
        
        return result.rows;
    } catch (error) {
        console.error('Error getting shadow products:', error);
        return [];
    }
}

/**
 * Count shadow suppliers by status
 * @returns {Promise<object>}
 */
async function getShadowSupplierStats() {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE claimed_status = 'unclaimed' AND opt_out_status = 'active') AS active_unclaimed,
                COUNT(*) FILTER (WHERE claimed_status = 'claimed') AS claimed,
                COUNT(*) FILTER (WHERE opt_out_status = 'opted_out') AS opted_out,
                COUNT(*) FILTER (WHERE opt_out_status = 'pending_removal') AS pending_removal,
                COUNT(*) AS total
            FROM scraped_supplier_data
        `);
        
        return result.rows[0];
    } catch (error) {
        console.error('Error getting shadow supplier stats:', error);
        return { active_unclaimed: 0, claimed: 0, opted_out: 0, pending_removal: 0, total: 0 };
    }
}

/**
 * Count shadow products by visibility
 * @returns {Promise<object>}
 */
async function getShadowProductStats() {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE visibility = 'anonymous') AS anonymous,
                COUNT(*) FILTER (WHERE visibility = 'hidden') AS hidden,
                COUNT(*) FILTER (WHERE visibility = 'claimed') AS claimed,
                COUNT(*) AS total
            FROM shadow_products
        `);
        
        return result.rows[0];
    } catch (error) {
        console.error('Error getting shadow product stats:', error);
        return { anonymous: 0, hidden: 0, claimed: 0, total: 0 };
    }
}

module.exports = {
    // Constants
    CLAIM_STATUS,
    OPT_OUT_STATUS,
    PRODUCT_VISIBILITY,
    TOKEN_TYPES,
    INGESTION_SOURCES,
    
    // Core functions
    isShadowSupplier,
    findShadowSupplierByEmail,
    getShadowSupplier,
    getShadowProducts,
    getShadowSupplierStats,
    getShadowProductStats,
    
    // Sub-modules
    ingestion,
    visibility,
    claimFlow,
    catalog
};
