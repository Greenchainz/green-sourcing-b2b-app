/**
 * Catalog API Routes
 * 
 * RESTful API for material catalog search, filtering, and comparison.
 * Provides sustainability-focused material discovery for architects and buyers.
 * 
 * Routes:
 * - GET  /api/v1/catalog/materials          - Search materials with filters
 * - GET  /api/v1/catalog/materials/:id      - Get material details with suppliers
 * - GET  /api/v1/catalog/categories         - Get category tree
 * - GET  /api/v1/catalog/certifications     - Get available certifications for filtering
 * - POST /api/v1/catalog/compare            - Compare 2-5 materials side-by-side
 * - GET  /api/v1/catalog/materials/:id/score - Get sustainability breakdown
 */

const express = require('express');
const router = express.Router();

const catalogService = require('../services/catalog');
const { authenticateToken } = require('../middleware/auth');
const { general: generalRateLimit, search: searchRateLimit } = require('../middleware/rateLimit');

// Shadow supplier visibility service for anonymization
let shadowVisibility;
try {
    shadowVisibility = require('../services/shadow/visibility');
} catch (e) {
    // Shadow module may not be available in all environments
    shadowVisibility = null;
}

/**
 * Anonymize shadow supplier data in material response
 * Removes identifying supplier information for unclaimed shadow suppliers
 * 
 * @param {Object} material - Material object with supplier data
 * @returns {Object} - Material with anonymized supplier if needed
 */
function anonymizeShadowSupplier(material) {
    if (!material || !material.supplier) {
        return material;
    }
    
    // Check if this is a shadow/scraped supplier that needs anonymization
    // Shadow suppliers have tier='scraped' or come from scraped_supplier_data
    const supplier = material.supplier;
    
    // If supplier has a shadow flag or is not claimed, anonymize
    if (supplier.isShadow || supplier.tier === 'scraped') {
        return {
            ...material,
            supplier: {
                id: null, // Hide real ID
                name: 'Verified Supplier', // Generic name
                isAnonymized: true,
                // Keep non-identifying sustainability data
                bCorpScore: supplier.bCorpScore,
                certificationCount: supplier.certificationCount
            },
            // Add note about why supplier is hidden
            supplierNote: 'Supplier identity will be revealed upon RFQ submission'
        };
    }
    
    return material;
}

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

/**
 * GET /api/v1/catalog/materials
 * 
 * Search materials with full-text search and filters.
 * 
 * Query Parameters:
 * - q (string): Search query text
 * - category (string|number): Category ID or name
 * - certifications (string): Comma-separated certification names
 * - minScore (number): Minimum sustainability score (0-100)
 * - limit (number): Max results (default 20, max 100)
 * - offset (number): Pagination offset
 * - sortBy (string): Sort option (relevance, score, price_asc, price_desc, newest, name)
 * 
 * Response:
 * {
 *   materials: [...],
 *   total: number,
 *   pagination: { limit, offset, hasMore, page, totalPages },
 *   filters: { query, category, certifications, minScore, sortBy }
 * }
 */
router.get('/materials', searchRateLimit, async (req, res) => {
    try {
        const {
            q: query,
            category,
            certifications,
            minScore,
            limit,
            offset,
            sortBy
        } = req.query;

        // Parse certifications from comma-separated string
        const certList = certifications
            ? certifications.split(',').map(c => c.trim()).filter(Boolean)
            : [];

        const result = await catalogService.searchMaterials({
            query,
            category,
            certifications: certList,
            minScore: minScore ? parseInt(minScore) : null,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            sortBy
        });

        res.json(result);
    } catch (error) {
        console.error('Material search error:', error);
        res.status(500).json({
            error: 'Failed to search materials',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/catalog/materials/:materialId
 * 
 * Get detailed material information including:
 * - Full product details
 * - Supplier information (anonymized for shadow suppliers)
 * - All certifications
 * - EPD data
 * - C2C certification
 * - LEED credits
 * - Materials composition
 * - Sustainability score breakdown
 * 
 * Note: Shadow suppliers are anonymized until they claim their profile
 * or until an RFQ is submitted.
 */
router.get('/materials/:materialId', generalRateLimit, async (req, res) => {
    try {
        const { materialId } = req.params;

        if (!materialId || isNaN(parseInt(materialId))) {
            return res.status(400).json({
                error: 'Invalid material ID',
                message: 'Material ID must be a valid number'
            });
        }

        let material = await catalogService.getMaterialById(parseInt(materialId));

        if (!material) {
            return res.status(404).json({
                error: 'Material not found',
                message: `No material found with ID ${materialId}`
            });
        }

        // Anonymize shadow supplier data for public responses
        material = anonymizeShadowSupplier(material);

        res.json(material);
    } catch (error) {
        console.error('Get material error:', error);
        res.status(500).json({
            error: 'Failed to get material',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/catalog/materials/:materialId/score
 * 
 * Get detailed sustainability score breakdown for a material.
 * Includes explainable scoring with "why is this sustainable?" factors.
 * 
 * Query Parameters:
 * - refresh (boolean): Force recalculation (default: false)
 */
router.get('/materials/:materialId/score', generalRateLimit, async (req, res) => {
    try {
        const { materialId } = req.params;
        const refresh = req.query.refresh === 'true';

        if (!materialId || isNaN(parseInt(materialId))) {
            return res.status(400).json({
                error: 'Invalid material ID',
                message: 'Material ID must be a valid number'
            });
        }

        // Try to get cached score first (unless refresh requested)
        let breakdown = null;
        if (!refresh) {
            breakdown = await catalogService.getCachedBreakdown(parseInt(materialId));
        }

        // Calculate fresh if no cache or refresh requested
        if (!breakdown) {
            breakdown = await catalogService.calculateAndPersistBreakdown(parseInt(materialId));
        }

        if (!breakdown) {
            return res.status(404).json({
                error: 'Material not found',
                message: `No material found with ID ${materialId}`
            });
        }

        res.json(breakdown);
    } catch (error) {
        console.error('Get score breakdown error:', error);
        res.status(500).json({
            error: 'Failed to get sustainability score',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/catalog/categories
 * 
 * Get all product categories with material counts and average sustainability scores.
 * Useful for building category navigation and filters.
 */
router.get('/categories', generalRateLimit, async (req, res) => {
    try {
        const categories = await catalogService.getCategoryTree();

        res.json({
            categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            error: 'Failed to get categories',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/catalog/certifications
 * 
 * Get all available certifications with supplier counts.
 * Useful for building certification filter dropdowns.
 */
router.get('/certifications', generalRateLimit, async (req, res) => {
    try {
        const certifications = await catalogService.getAvailableCertifications();

        res.json({
            certifications,
            total: certifications.length
        });
    } catch (error) {
        console.error('Get certifications error:', error);
        res.status(500).json({
            error: 'Failed to get certifications',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/catalog/compare
 * 
 * Compare 2-5 materials side-by-side.
 * Returns comparison data including:
 * - All material details
 * - Sustainability scores
 * - Certifications
 * - Pricing
 * - Carbon footprint
 * - Recommended choice
 * 
 * Note: Shadow suppliers are anonymized in comparison results.
 * 
 * Request Body:
 * {
 *   materialIds: [1, 2, 3] // Array of 2-5 material IDs
 * }
 */
router.post('/compare', generalRateLimit, async (req, res) => {
    try {
        const { materialIds } = req.body;

        // Validate input
        if (!materialIds) {
            return res.status(400).json({
                error: 'Missing materialIds',
                message: 'Request body must include materialIds array'
            });
        }

        if (!Array.isArray(materialIds)) {
            return res.status(400).json({
                error: 'Invalid materialIds',
                message: 'materialIds must be an array'
            });
        }

        if (materialIds.length < 2) {
            return res.status(400).json({
                error: 'Too few materials',
                message: 'Must compare at least 2 materials'
            });
        }

        if (materialIds.length > 5) {
            return res.status(400).json({
                error: 'Too many materials',
                message: 'Cannot compare more than 5 materials at once'
            });
        }

        // Validate all IDs are numbers
        const validIds = materialIds.map(id => parseInt(id)).filter(id => !isNaN(id));
        if (validIds.length !== materialIds.length) {
            return res.status(400).json({
                error: 'Invalid material IDs',
                message: 'All material IDs must be valid numbers'
            });
        }

        const result = await catalogService.compareMaterials(validIds);

        // Anonymize shadow suppliers in comparison results
        if (result.materials && Array.isArray(result.materials)) {
            result.materials = result.materials.map(material => {
                // Check if supplier is a shadow/scraped supplier
                if (material.supplierTier === 'scraped' || material.isShadowSupplier) {
                    return {
                        ...material,
                        supplierName: 'Verified Supplier',
                        supplierId: null,
                        isAnonymized: true
                    };
                }
                return material;
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Compare materials error:', error);
        res.status(500).json({
            error: 'Failed to compare materials',
            message: error.message
        });
    }
});

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * POST /api/v1/catalog/materials/:materialId/favorite
 * 
 * Add material to user's favorites (requires authentication).
 * Future enhancement for user personalization.
 */
router.post('/materials/:materialId/favorite', generalRateLimit, authenticateToken, async (req, res) => {
    try {
        const { materialId } = req.params;
        const userId = req.user.id || req.user.userId;

        // This is a placeholder for future implementation
        // Would need a user_favorites table

        res.json({
            success: true,
            materialId: parseInt(materialId),
            userId,
            message: 'Material added to favorites'
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({
            error: 'Failed to add favorite',
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/catalog/materials/:materialId/favorite
 * 
 * Remove material from user's favorites (requires authentication).
 */
router.delete('/materials/:materialId/favorite', generalRateLimit, authenticateToken, async (req, res) => {
    try {
        const { materialId } = req.params;
        const userId = req.user.id || req.user.userId;

        // This is a placeholder for future implementation

        res.json({
            success: true,
            materialId: parseInt(materialId),
            userId,
            message: 'Material removed from favorites'
        });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({
            error: 'Failed to remove favorite',
            message: error.message
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/v1/catalog/health
 * 
 * Health check for catalog service.
 */
router.get('/health', generalRateLimit, (req, res) => {
    res.json({
        status: 'ok',
        service: 'catalog',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
