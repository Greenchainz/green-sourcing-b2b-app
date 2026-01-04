/**
 * Shadow Supplier Visibility Service
 * 
 * Manages visibility rules for shadow suppliers and their products.
 * Ensures unclaimed suppliers are never publicly visible while
 * allowing anonymous material recommendations in catalog/search.
 * 
 * @module services/shadow/visibility
 */

const { pool } = require('../../db');

/**
 * Visibility levels
 */
const VISIBILITY = {
    // Product is shown anonymously (supplier hidden)
    ANONYMOUS: 'anonymous',
    // Product is completely hidden
    HIDDEN: 'hidden',
    // Product is linked to claimed supplier
    CLAIMED: 'claimed'
};

/**
 * Check if a supplier's products should be visible anonymously
 * @param {string} shadowSupplierId - UUID of the shadow supplier
 * @returns {Promise<{visible: boolean, reason?: string}>}
 */
async function canShowAnonymously(shadowSupplierId) {
    if (!shadowSupplierId) {
        return { visible: false, reason: 'No supplier ID provided' };
    }
    
    try {
        const result = await pool.query(
            `SELECT claimed_status, opt_out_status 
             FROM scraped_supplier_data 
             WHERE id = $1`,
            [shadowSupplierId]
        );
        
        if (result.rows.length === 0) {
            return { visible: false, reason: 'Supplier not found' };
        }
        
        const supplier = result.rows[0];
        
        // Opted out suppliers are never shown
        if (supplier.opt_out_status === 'opted_out') {
            return { visible: false, reason: 'Supplier opted out' };
        }
        
        // Claimed suppliers should use the real supplier visibility
        if (supplier.claimed_status === 'claimed') {
            return { visible: false, reason: 'Supplier has been claimed' };
        }
        
        // Active unclaimed suppliers can be shown anonymously
        return { visible: true };
        
    } catch (error) {
        console.error('Error checking anonymous visibility:', error);
        return { visible: false, reason: 'Database error' };
    }
}

/**
 * Get visibility status for a shadow product
 * @param {string} productId - UUID of the shadow product
 * @returns {Promise<{visibility: string, canShow: boolean}>}
 */
async function getProductVisibility(productId) {
    if (!productId) {
        return { visibility: 'hidden', canShow: false };
    }
    
    try {
        const result = await pool.query(
            `SELECT sp.visibility, ssd.claimed_status, ssd.opt_out_status
             FROM shadow_products sp
             JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
             WHERE sp.id = $1`,
            [productId]
        );
        
        if (result.rows.length === 0) {
            return { visibility: 'hidden', canShow: false };
        }
        
        const row = result.rows[0];
        
        // Can only show if visibility is anonymous and supplier is active
        const canShow = row.visibility === 'anonymous' && 
                       row.opt_out_status === 'active' &&
                       row.claimed_status === 'unclaimed';
        
        return { visibility: row.visibility, canShow };
        
    } catch (error) {
        console.error('Error getting product visibility:', error);
        return { visibility: 'hidden', canShow: false };
    }
}

/**
 * Update product visibility
 * @param {string} productId - UUID of the shadow product
 * @param {string} visibility - New visibility level
 * @returns {Promise<boolean>}
 */
async function setProductVisibility(productId, visibility) {
    if (!productId || !Object.values(VISIBILITY).includes(visibility)) {
        return false;
    }
    
    try {
        const result = await pool.query(
            `UPDATE shadow_products 
             SET visibility = $2, updated_at = NOW()
             WHERE id = $1`,
            [productId, visibility]
        );
        
        return result.rowCount > 0;
        
    } catch (error) {
        console.error('Error setting product visibility:', error);
        return false;
    }
}

/**
 * Hide all products for a shadow supplier
 * @param {string} shadowSupplierId - UUID of the shadow supplier
 * @returns {Promise<{success: boolean, count: number}>}
 */
async function hideAllProducts(shadowSupplierId) {
    if (!shadowSupplierId) {
        return { success: false, count: 0 };
    }
    
    try {
        const result = await pool.query(
            `UPDATE shadow_products 
             SET visibility = 'hidden', updated_at = NOW()
             WHERE shadow_supplier_id = $1 AND visibility != 'hidden'`,
            [shadowSupplierId]
        );
        
        console.log(`Hidden ${result.rowCount} products for shadow supplier ${shadowSupplierId}`);
        return { success: true, count: result.rowCount };
        
    } catch (error) {
        console.error('Error hiding products:', error);
        return { success: false, count: 0 };
    }
}

/**
 * Show all products for a shadow supplier (make them anonymous)
 * @param {string} shadowSupplierId - UUID of the shadow supplier
 * @returns {Promise<{success: boolean, count: number}>}
 */
async function showAllProducts(shadowSupplierId) {
    if (!shadowSupplierId) {
        return { success: false, count: 0 };
    }
    
    try {
        // First check if supplier is allowed to have visible products
        const canShow = await canShowAnonymously(shadowSupplierId);
        if (!canShow.visible) {
            return { success: false, count: 0, reason: canShow.reason };
        }
        
        const result = await pool.query(
            `UPDATE shadow_products 
             SET visibility = 'anonymous', updated_at = NOW()
             WHERE shadow_supplier_id = $1 AND visibility = 'hidden'`,
            [shadowSupplierId]
        );
        
        console.log(`Made ${result.rowCount} products visible for shadow supplier ${shadowSupplierId}`);
        return { success: true, count: result.rowCount };
        
    } catch (error) {
        console.error('Error showing products:', error);
        return { success: false, count: 0 };
    }
}

/**
 * Mark products as claimed (linked to real supplier)
 * @param {string} shadowSupplierId - UUID of the shadow supplier
 * @param {string} realSupplierId - UUID of the claimed supplier
 * @returns {Promise<{success: boolean, count: number}>}
 */
async function markProductsAsClaimed(shadowSupplierId, realSupplierId) {
    if (!shadowSupplierId) {
        return { success: false, count: 0 };
    }
    
    try {
        const result = await pool.query(
            `UPDATE shadow_products 
             SET visibility = 'claimed', 
                 updated_at = NOW()
             WHERE shadow_supplier_id = $1`,
            [shadowSupplierId]
        );
        
        console.log(`Marked ${result.rowCount} products as claimed for shadow supplier ${shadowSupplierId}`);
        return { success: true, count: result.rowCount };
        
    } catch (error) {
        console.error('Error marking products as claimed:', error);
        return { success: false, count: 0 };
    }
}

/**
 * Get count of visible anonymous products
 * @returns {Promise<number>}
 */
async function countAnonymousProducts() {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as count
            FROM shadow_products sp
            JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
            WHERE sp.visibility = 'anonymous'
              AND ssd.opt_out_status = 'active'
              AND ssd.claimed_status = 'unclaimed'
        `);
        
        return parseInt(result.rows[0].count, 10);
        
    } catch (error) {
        console.error('Error counting anonymous products:', error);
        return 0;
    }
}

/**
 * Filter a list of supplier IDs to exclude shadow/scraped suppliers
 * Used to ensure scraped suppliers aren't returned in public queries
 * @param {Array<string>} supplierIds - Array of supplier UUIDs
 * @returns {Promise<Array<string>>} - Filtered array without scraped suppliers
 */
async function filterOutShadowSuppliers(supplierIds) {
    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
        return [];
    }
    
    try {
        const result = await pool.query(
            `SELECT id FROM suppliers 
             WHERE id = ANY($1) 
             AND tier != 'scraped'`,
            [supplierIds]
        );
        
        return result.rows.map(r => r.id);
        
    } catch (error) {
        console.error('Error filtering shadow suppliers:', error);
        return supplierIds; // Return original on error to avoid breaking
    }
}

/**
 * Build a WHERE clause to exclude shadow suppliers in SQL queries
 * @returns {string} - SQL WHERE clause fragment
 */
function excludeShadowSuppliersClause() {
    return `tier != 'scraped'`;
}

/**
 * Build a WHERE clause to only include active shadow suppliers
 * @returns {string} - SQL WHERE clause fragment
 */
function activeOnlyClause() {
    return `opt_out_status = 'active' AND claimed_status = 'unclaimed'`;
}

module.exports = {
    VISIBILITY,
    canShowAnonymously,
    getProductVisibility,
    setProductVisibility,
    hideAllProducts,
    showAllProducts,
    markProductsAsClaimed,
    countAnonymousProducts,
    filterOutShadowSuppliers,
    excludeShadowSuppliersClause,
    activeOnlyClause
};
