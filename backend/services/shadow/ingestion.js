/**
 * Shadow Supplier Ingestion Service
 * 
 * Handles ingestion of scraped/external supplier data into the
 * shadow supplier system. Ensures deduplication, validation,
 * and proper state initialization.
 * 
 * @module services/shadow/ingestion
 */

const { pool } = require('../../db');

/**
 * Ingestion source types
 */
const SOURCES = {
    MANUAL: 'manual',
    SCRAPER: 'scraper',
    API: 'api',
    PARTNER: 'partner',
    EC3: 'ec3',
    FSC: 'fsc',
    BCORP: 'bcorp'
};

/**
 * Validate supplier data before ingestion
 * @param {object} data - Supplier data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateSupplierData(data) {
    const errors = [];
    
    if (!data) {
        return { valid: false, errors: ['No data provided'] };
    }
    
    if (!data.company_name || typeof data.company_name !== 'string' || data.company_name.trim() === '') {
        errors.push('company_name is required');
    }
    
    if (!data.email || typeof data.email !== 'string') {
        errors.push('email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('email format is invalid');
    }
    
    if (data.source && !Object.values(SOURCES).includes(data.source)) {
        errors.push(`source must be one of: ${Object.values(SOURCES).join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Validate product data before ingestion
 * @param {object} data - Product data to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateProductData(data) {
    const errors = [];
    
    if (!data) {
        return { valid: false, errors: ['No data provided'] };
    }
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        errors.push('name is required');
    }
    
    if (data.shadow_supplier_id && typeof data.shadow_supplier_id !== 'string') {
        errors.push('shadow_supplier_id must be a string UUID');
    }
    
    if (data.gwp_value !== undefined && (typeof data.gwp_value !== 'number' || data.gwp_value < 0)) {
        errors.push('gwp_value must be a non-negative number');
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Ingest a single shadow supplier
 * @param {object} supplierData - Supplier data to ingest
 * @returns {Promise<{success: boolean, id?: string, error?: string, action?: string}>}
 */
async function ingestShadowSupplier(supplierData) {
    const validation = validateSupplierData(supplierData);
    if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
    }
    
    const {
        company_name,
        email,
        category,
        source = 'manual',
        source_url,
        metadata = {}
    } = supplierData;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check for existing entry by email
        const existingResult = await client.query(
            `SELECT id, claimed_status, opt_out_status 
             FROM scraped_supplier_data 
             WHERE email = $1 
             FOR UPDATE`,
            [email.toLowerCase().trim()]
        );
        
        let supplierId;
        let action;
        
        if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0];
            
            // Don't update opted-out or claimed suppliers
            if (existing.opt_out_status === 'opted_out') {
                await client.query('ROLLBACK');
                return { 
                    success: false, 
                    error: 'Supplier has opted out',
                    id: existing.id 
                };
            }
            
            if (existing.claimed_status === 'claimed') {
                await client.query('ROLLBACK');
                return { 
                    success: false, 
                    error: 'Supplier already claimed',
                    id: existing.id 
                };
            }
            
            // Update existing unclaimed supplier with new data
            await client.query(
                `UPDATE scraped_supplier_data
                 SET company_name = COALESCE($2, company_name),
                     category = COALESCE($3, category),
                     source = COALESCE($4, source),
                     source_url = COALESCE($5, source_url),
                     source_scraped_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1`,
                [existing.id, company_name, category, source, source_url]
            );
            
            supplierId = existing.id;
            action = 'updated';
        } else {
            // Insert new shadow supplier
            const insertResult = await client.query(
                `INSERT INTO scraped_supplier_data (
                    company_name, 
                    email, 
                    category, 
                    source, 
                    source_url,
                    source_scraped_at,
                    claimed_status,
                    opt_out_status
                 ) VALUES ($1, $2, $3, $4, $5, NOW(), 'unclaimed', 'active')
                 RETURNING id`,
                [company_name, email.toLowerCase().trim(), category, source, source_url]
            );
            
            supplierId = insertResult.rows[0].id;
            action = 'created';
        }
        
        await client.query('COMMIT');
        
        console.log(`Shadow supplier ${action}: ${company_name} (${email})`);
        return { success: true, id: supplierId, action };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error ingesting shadow supplier:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Ingest multiple shadow suppliers in batch
 * @param {Array<object>} suppliersData - Array of supplier data
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function ingestShadowSupplierBatch(suppliersData) {
    if (!Array.isArray(suppliersData)) {
        return { success: 0, failed: 0, errors: ['Input must be an array'] };
    }
    
    const results = {
        success: 0,
        failed: 0,
        errors: [],
        created: 0,
        updated: 0
    };
    
    for (const supplierData of suppliersData) {
        const result = await ingestShadowSupplier(supplierData);
        
        if (result.success) {
            results.success++;
            if (result.action === 'created') results.created++;
            if (result.action === 'updated') results.updated++;
        } else {
            results.failed++;
            results.errors.push({
                email: supplierData.email,
                error: result.error
            });
        }
    }
    
    console.log(`Batch ingestion complete: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Ingest a shadow product for an existing shadow supplier
 * @param {object} productData - Product data to ingest
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function ingestShadowProduct(productData) {
    const validation = validateProductData(productData);
    if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
    }
    
    const {
        shadow_supplier_id,
        name,
        description,
        material_type,
        application,
        certifications = [],
        sustainability_data = {},
        specs = {},
        epd_data,
        gwp_value,
        gwp_unit = 'kgCO2e',
        source = 'scraped',
        source_url,
        source_product_id
    } = productData;
    
    if (!shadow_supplier_id) {
        return { success: false, error: 'shadow_supplier_id is required' };
    }
    
    try {
        // Verify shadow supplier exists and is active
        const supplierCheck = await pool.query(
            `SELECT id, opt_out_status, claimed_status 
             FROM scraped_supplier_data 
             WHERE id = $1`,
            [shadow_supplier_id]
        );
        
        if (supplierCheck.rows.length === 0) {
            return { success: false, error: 'Shadow supplier not found' };
        }
        
        if (supplierCheck.rows[0].opt_out_status === 'opted_out') {
            return { success: false, error: 'Shadow supplier has opted out' };
        }
        
        // Insert product
        const insertResult = await pool.query(
            `INSERT INTO shadow_products (
                shadow_supplier_id,
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
                source,
                source_url,
                source_product_id,
                visibility
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'anonymous')
             RETURNING id`,
            [
                shadow_supplier_id,
                name,
                description,
                material_type,
                application,
                certifications,
                JSON.stringify(sustainability_data),
                JSON.stringify(specs),
                epd_data ? JSON.stringify(epd_data) : null,
                gwp_value,
                gwp_unit,
                source,
                source_url,
                source_product_id
            ]
        );
        
        console.log(`Shadow product created: ${name} for supplier ${shadow_supplier_id}`);
        return { success: true, id: insertResult.rows[0].id };
        
    } catch (error) {
        console.error('Error ingesting shadow product:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Ingest multiple shadow products in batch
 * @param {Array<object>} productsData - Array of product data
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function ingestShadowProductBatch(productsData) {
    if (!Array.isArray(productsData)) {
        return { success: 0, failed: 0, errors: ['Input must be an array'] };
    }
    
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const productData of productsData) {
        const result = await ingestShadowProduct(productData);
        
        if (result.success) {
            results.success++;
        } else {
            results.failed++;
            results.errors.push({
                name: productData.name,
                error: result.error
            });
        }
    }
    
    console.log(`Product batch ingestion: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Import supplier and products together
 * @param {object} data - Combined supplier and products data
 * @returns {Promise<{success: boolean, supplierId?: string, productIds?: string[], error?: string}>}
 */
async function importSupplierWithProducts(data) {
    const { supplier, products = [] } = data;
    
    if (!supplier) {
        return { success: false, error: 'Supplier data is required' };
    }
    
    // First ingest the supplier
    const supplierResult = await ingestShadowSupplier(supplier);
    if (!supplierResult.success) {
        return { success: false, error: `Supplier ingestion failed: ${supplierResult.error}` };
    }
    
    // Then ingest products with the supplier ID
    const productIds = [];
    for (const product of products) {
        const productWithSupplier = {
            ...product,
            shadow_supplier_id: supplierResult.id
        };
        
        const productResult = await ingestShadowProduct(productWithSupplier);
        if (productResult.success) {
            productIds.push(productResult.id);
        }
    }
    
    return {
        success: true,
        supplierId: supplierResult.id,
        productIds,
        productsCreated: productIds.length,
        productsFailed: products.length - productIds.length
    };
}

module.exports = {
    SOURCES,
    validateSupplierData,
    validateProductData,
    ingestShadowSupplier,
    ingestShadowSupplierBatch,
    ingestShadowProduct,
    ingestShadowProductBatch,
    importSupplierWithProducts
};
