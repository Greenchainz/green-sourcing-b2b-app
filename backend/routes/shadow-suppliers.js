/**
 * Shadow Supplier Routes
 * 
 * API endpoints for shadow supplier management:
 * - Claim token validation and consumption
 * - Opt-in/opt-out flows
 * - Anonymous material catalog access
 * 
 * These routes are for internal/admin use and claim flow processing.
 * Public catalog access uses the catalog service directly.
 * 
 * @module routes/shadow-suppliers
 */

const express = require('express');
const router = express.Router();
const shadowService = require('../services/shadow');
const { claimFlow, catalog, ingestion, visibility } = shadowService;
const internalApiKeyMiddleware = require('../middleware/internalKey');
const { general: generalRateLimit } = require('../middleware/rateLimit');

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Extract client IP for audit logging
 */
const extractIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket?.remoteAddress || 
           'unknown';
};

// ============================================
// CLAIM FLOW ROUTES
// ============================================

/**
 * POST /api/internal/shadow/claim/validate
 * Validate a claim token (without consuming it)
 * 
 * Body: { token: string }
 * Response: { valid: boolean, supplier?: { company_name, email, category } }
 */
router.post('/claim/validate', generalRateLimit, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        const result = await claimFlow.validateClaimToken(token, {
            consumeToken: false,
            ipAddress: extractIp(req)
        });
        
        if (!result.valid) {
            return res.status(400).json({ 
                valid: false, 
                error: result.error 
            });
        }
        
        res.json({
            valid: true,
            supplier: result.supplierData
        });
        
    } catch (error) {
        console.error('Error validating claim token:', error);
        res.status(500).json({ error: 'Validation failed' });
    }
});

/**
 * POST /api/internal/shadow/claim/complete
 * Complete the claim process - link shadow supplier to new supplier account
 * 
 * Body: { token: string, newSupplierId: string, userId?: string }
 * Response: { success: boolean }
 */
router.post('/claim/complete', generalRateLimit, async (req, res) => {
    try {
        const { token, newSupplierId, userId } = req.body;
        
        if (!token || !newSupplierId) {
            return res.status(400).json({ 
                error: 'Token and newSupplierId are required' 
            });
        }
        
        // First validate and consume the token
        const validation = await claimFlow.validateClaimToken(token, {
            consumeToken: true,
            ipAddress: extractIp(req)
        });
        
        if (!validation.valid) {
            return res.status(400).json({ 
                success: false, 
                error: validation.error 
            });
        }
        
        // Complete the claim
        const result = await claimFlow.completeClaim(
            validation.supplierId,
            newSupplierId,
            {
                userId,
                ipAddress: extractIp(req)
            }
        );
        
        if (!result.success) {
            return res.status(400).json({ 
                success: false, 
                error: result.error 
            });
        }
        
        res.json({ success: true, shadowSupplierId: validation.supplierId });
        
    } catch (error) {
        console.error('Error completing claim:', error);
        res.status(500).json({ error: 'Claim processing failed' });
    }
});

/**
 * POST /api/internal/shadow/claim/generate-token
 * Generate a new claim token for a shadow supplier (admin only)
 * 
 * Body: { shadowSupplierId: string, expiryHours?: number }
 * Response: { success: boolean, token?: string, expiresAt?: string }
 */
router.post('/claim/generate-token', internalApiKeyMiddleware, generalRateLimit, async (req, res) => {
    try {
        const { shadowSupplierId, expiryHours } = req.body;
        
        if (!shadowSupplierId) {
            return res.status(400).json({ error: 'shadowSupplierId is required' });
        }
        
        const result = await claimFlow.generateClaimToken(shadowSupplierId, {
            expiryHours: expiryHours || 72,
            ipAddress: extractIp(req)
        });
        
        if (!result.success) {
            return res.status(400).json({ 
                success: false, 
                error: result.error,
                retryAfter: result.retryAfter
            });
        }
        
        res.json({
            success: true,
            token: result.token,
            expiresAt: result.expiresAt
        });
        
    } catch (error) {
        console.error('Error generating claim token:', error);
        res.status(500).json({ error: 'Token generation failed' });
    }
});

/**
 * GET /api/internal/shadow/claim/status/:shadowSupplierId
 * Get claim status for a shadow supplier
 * 
 * Response: { found: boolean, claimed_status?, opt_out_status?, ... }
 */
router.get('/claim/status/:shadowSupplierId', internalApiKeyMiddleware, generalRateLimit, async (req, res) => {
    try {
        const { shadowSupplierId } = req.params;
        
        const status = await claimFlow.getClaimStatus(shadowSupplierId);
        res.json(status);
        
    } catch (error) {
        console.error('Error getting claim status:', error);
        res.status(500).json({ error: 'Status check failed' });
    }
});

// ============================================
// OPT-OUT ROUTES
// ============================================

/**
 * POST /api/internal/shadow/opt-out
 * Process an opt-out request for a shadow supplier
 * 
 * Body: { token: string, reason?: string } OR { shadowSupplierId: string, reason?: string }
 * Response: { success: boolean }
 */
router.post('/opt-out', generalRateLimit, async (req, res) => {
    try {
        const { token, shadowSupplierId, reason } = req.body;
        
        let supplierId = shadowSupplierId;
        
        // If token provided, validate it first
        if (token) {
            const validation = await claimFlow.validateClaimToken(token, {
                consumeToken: true,
                ipAddress: extractIp(req)
            });
            
            if (!validation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: validation.error 
                });
            }
            
            supplierId = validation.supplierId;
        }
        
        if (!supplierId) {
            return res.status(400).json({ 
                error: 'Either token or shadowSupplierId is required' 
            });
        }
        
        const result = await claimFlow.processOptOut(supplierId, {
            reason,
            ipAddress: extractIp(req)
        });
        
        if (!result.success) {
            return res.status(400).json({ 
                success: false, 
                error: result.error 
            });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error processing opt-out:', error);
        res.status(500).json({ error: 'Opt-out processing failed' });
    }
});

// ============================================
// INGESTION ROUTES (Admin only)
// ============================================

/**
 * POST /api/internal/shadow/ingest/supplier
 * Ingest a single shadow supplier
 * 
 * Body: { company_name, email, category?, source?, source_url? }
 * Response: { success: boolean, id?: string, action?: string }
 */
router.post('/ingest/supplier', internalApiKeyMiddleware, generalRateLimit, async (req, res) => {
    try {
        const result = await ingestion.ingestShadowSupplier(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.status(201).json(result);
        
    } catch (error) {
        console.error('Error ingesting supplier:', error);
        res.status(500).json({ error: 'Ingestion failed' });
    }
});

/**
 * POST /api/internal/shadow/ingest/suppliers
 * Ingest multiple shadow suppliers in batch
 * 
 * Body: { suppliers: Array<{ company_name, email, ... }> }
 * Response: { success: number, failed: number, created: number, updated: number }
 */
router.post('/ingest/suppliers', internalApiKeyMiddleware, generalRateLimit, async (req, res) => {
    try {
        const { suppliers } = req.body;
        
        if (!Array.isArray(suppliers)) {
            return res.status(400).json({ error: 'suppliers must be an array' });
        }
        
        const result = await ingestion.ingestShadowSupplierBatch(suppliers);
        res.json(result);
        
    } catch (error) {
        console.error('Error batch ingesting suppliers:', error);
        res.status(500).json({ error: 'Batch ingestion failed' });
    }
});

/**
 * POST /api/internal/shadow/ingest/product
 * Ingest a shadow product
 * 
 * Body: { shadow_supplier_id, name, material_type?, certifications?, ... }
 * Response: { success: boolean, id?: string }
 */
router.post('/ingest/product', internalApiKeyMiddleware, generalRateLimit, async (req, res) => {
    try {
        const result = await ingestion.ingestShadowProduct(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.status(201).json(result);
        
    } catch (error) {
        console.error('Error ingesting product:', error);
        res.status(500).json({ error: 'Product ingestion failed' });
    }
});

/**
 * POST /api/internal/shadow/ingest/complete
 * Import a supplier with all their products in one call
 * 
 * Body: { supplier: {...}, products: [{...}, ...] }
 * Response: { success: boolean, supplierId?: string, productIds?: string[] }
 */
router.post('/ingest/complete', internalApiKeyMiddleware, generalRateLimit, async (req, res) => {
    try {
        const result = await ingestion.importSupplierWithProducts(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.status(201).json(result);
        
    } catch (error) {
        console.error('Error importing supplier with products:', error);
        res.status(500).json({ error: 'Import failed' });
    }
});

// ============================================
// CATALOG ROUTES (Public-facing)
// ============================================

/**
 * GET /api/internal/shadow/catalog/search
 * Search materials (includes anonymous shadow products)
 * 
 * Query: materialType?, category?, certifications[]?, query?, limit?, offset?
 * Response: { materials: Array, total: number }
 */
router.get('/catalog/search', generalRateLimit, async (req, res) => {
    try {
        const { 
            materialType, 
            application,
            certifications, 
            query,
            minGwp,
            maxGwp,
            limit = 50, 
            offset = 0,
            includeAnonymous = 'true',
            includeVerified = 'true'
        } = req.query;
        
        const criteria = {
            materialType,
            application,
            certifications: certifications ? 
                (Array.isArray(certifications) ? certifications : [certifications]) : 
                undefined,
            query,
            minGwp: minGwp ? parseFloat(minGwp) : undefined,
            maxGwp: maxGwp ? parseFloat(maxGwp) : undefined
        };
        
        const options = {
            limit: Math.min(parseInt(limit, 10), 100),
            offset: parseInt(offset, 10),
            includeAnonymous: includeAnonymous !== 'false',
            includeVerified: includeVerified !== 'false'
        };
        
        const result = await catalog.searchMaterials(criteria, options);
        res.json(result);
        
    } catch (error) {
        console.error('Error searching catalog:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/internal/shadow/catalog/material/:materialId
 * Get a specific anonymous material
 * 
 * Response: { material_id, material_name, ... } or 404
 */
router.get('/catalog/material/:materialId', async (req, res) => {
    try {
        const { materialId } = req.params;
        
        const material = await catalog.getAnonymousMaterial(materialId);
        
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        
        res.json(material);
        
    } catch (error) {
        console.error('Error getting material:', error);
        res.status(500).json({ error: 'Failed to get material' });
    }
});

/**
 * GET /api/internal/shadow/catalog/low-carbon
 * Get low-carbon materials sorted by GWP
 * 
 * Query: limit?
 * Response: Array of materials
 */
router.get('/catalog/low-carbon', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const materials = await catalog.getLowCarbonMaterials({
            limit: Math.min(parseInt(limit, 10), 100)
        });
        
        res.json({ materials });
        
    } catch (error) {
        console.error('Error getting low-carbon materials:', error);
        res.status(500).json({ error: 'Failed to get materials' });
    }
});

/**
 * GET /api/internal/shadow/catalog/certified/:certification
 * Get materials with a specific certification
 * 
 * Response: Array of materials
 */
router.get('/catalog/certified/:certification', async (req, res) => {
    try {
        const { certification } = req.params;
        const { limit = 50 } = req.query;
        
        const materials = await catalog.getCertifiedMaterials(certification, {
            limit: Math.min(parseInt(limit, 10), 100)
        });
        
        res.json({ materials, certification });
        
    } catch (error) {
        console.error('Error getting certified materials:', error);
        res.status(500).json({ error: 'Failed to get materials' });
    }
});

/**
 * GET /api/internal/shadow/catalog/stats
 * Get catalog statistics
 * 
 * Response: { verified_materials, anonymous_materials, total_materials }
 */
router.get('/catalog/stats', async (req, res) => {
    try {
        const stats = await catalog.getCatalogStats();
        res.json(stats);
        
    } catch (error) {
        console.error('Error getting catalog stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * GET /api/internal/shadow/catalog/material-types
 * Get available material types from shadow products
 * 
 * Response: { types: string[] }
 */
router.get('/catalog/material-types', async (req, res) => {
    try {
        const types = await catalog.getAnonymousMaterialTypes();
        res.json({ types });
        
    } catch (error) {
        console.error('Error getting material types:', error);
        res.status(500).json({ error: 'Failed to get material types' });
    }
});

// ============================================
// STATS ROUTES (Admin only)
// ============================================

/**
 * GET /api/internal/shadow/stats
 * Get shadow supplier statistics
 * 
 * Response: { suppliers: {...}, products: {...} }
 */
router.get('/stats', internalApiKeyMiddleware, async (req, res) => {
    try {
        const [supplierStats, productStats, catalogStats] = await Promise.all([
            shadowService.getShadowSupplierStats(),
            shadowService.getShadowProductStats(),
            catalog.getCatalogStats()
        ]);
        
        res.json({
            suppliers: supplierStats,
            products: productStats,
            catalog: catalogStats
        });
        
    } catch (error) {
        console.error('Error getting shadow stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * GET /api/internal/shadow/supplier/:shadowSupplierId
 * Get shadow supplier details (admin only)
 * 
 * Response: { id, company_name, email, ... }
 */
router.get('/supplier/:shadowSupplierId', internalApiKeyMiddleware, async (req, res) => {
    try {
        const { shadowSupplierId } = req.params;
        
        const supplier = await shadowService.getShadowSupplier(shadowSupplierId);
        
        if (!supplier) {
            return res.status(404).json({ error: 'Shadow supplier not found' });
        }
        
        // Get associated products
        const products = await shadowService.getShadowProducts(shadowSupplierId, {
            visibility: 'all'
        });
        
        res.json({
            supplier,
            products,
            productCount: products.length
        });
        
    } catch (error) {
        console.error('Error getting shadow supplier:', error);
        res.status(500).json({ error: 'Failed to get supplier' });
    }
});

// ============================================
// VISIBILITY ROUTES (Admin only)
// ============================================

/**
 * POST /api/internal/shadow/visibility/hide-all
 * Hide all products for a shadow supplier
 * 
 * Body: { shadowSupplierId: string }
 * Response: { success: boolean, count: number }
 */
router.post('/visibility/hide-all', internalApiKeyMiddleware, async (req, res) => {
    try {
        const { shadowSupplierId } = req.body;
        
        if (!shadowSupplierId) {
            return res.status(400).json({ error: 'shadowSupplierId is required' });
        }
        
        const result = await visibility.hideAllProducts(shadowSupplierId);
        res.json(result);
        
    } catch (error) {
        console.error('Error hiding products:', error);
        res.status(500).json({ error: 'Failed to hide products' });
    }
});

/**
 * POST /api/internal/shadow/visibility/show-all
 * Show all products for a shadow supplier (make anonymous)
 * 
 * Body: { shadowSupplierId: string }
 * Response: { success: boolean, count: number }
 */
router.post('/visibility/show-all', internalApiKeyMiddleware, async (req, res) => {
    try {
        const { shadowSupplierId } = req.body;
        
        if (!shadowSupplierId) {
            return res.status(400).json({ error: 'shadowSupplierId is required' });
        }
        
        const result = await visibility.showAllProducts(shadowSupplierId);
        res.json(result);
        
    } catch (error) {
        console.error('Error showing products:', error);
        res.status(500).json({ error: 'Failed to show products' });
    }
});

module.exports = router;
