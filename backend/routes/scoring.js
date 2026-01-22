/**
 * Scoring API Routes
 * 
 * Endpoints for material/supplier sustainability scoring.
 * Provides explainable scores with "why recommended" breakdowns.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const scoringService = require('../services/scoringService');
const { general: generalRateLimit } = require('../middleware/rateLimit');

// ============================================
// PUBLIC ENDPOINTS (no auth required)
// ============================================

/**
 * GET /api/v1/scoring/product/:productId
 * Get sustainability score for a specific product
 * 
 * Query params:
 * - buyerLat: Buyer latitude for distance calculation
 * - buyerLng: Buyer longitude for distance calculation
 * - refresh: Force recalculation (skip cache)
 */
router.get('/product/:productId', generalRateLimit, async (req, res) => {
    try {
        const { productId } = req.params;
        const { buyerLat, buyerLng, refresh } = req.query;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const buyerLocation = {};
        if (buyerLat && buyerLng) {
            buyerLocation.latitude = parseFloat(buyerLat);
            buyerLocation.longitude = parseFloat(buyerLng);
        }

        // Check cache first (unless refresh requested)
        if (!refresh) {
            const cached = await scoringService.getPersistedScore(pool, 'product', productId);
            if (cached) {
                return res.json({
                    success: true,
                    cached: true,
                    data: cached
                });
            }
        }

        // Calculate fresh score
        const score = await scoringService.scoreProduct(pool, productId, buyerLocation);

        if (!score) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            success: true,
            cached: false,
            data: score
        });
    } catch (error) {
        console.error('Error scoring product:', error);
        res.status(500).json({ error: 'Failed to calculate score', details: error.message });
    }
});

/**
 * GET /api/v1/scoring/supplier/:supplierId
 * Get sustainability score for a specific supplier
 */
router.get('/supplier/:supplierId', generalRateLimit, async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { buyerLat, buyerLng, refresh } = req.query;

        if (!supplierId) {
            return res.status(400).json({ error: 'Supplier ID is required' });
        }

        const buyerLocation = {};
        if (buyerLat && buyerLng) {
            buyerLocation.latitude = parseFloat(buyerLat);
            buyerLocation.longitude = parseFloat(buyerLng);
        }

        // Check cache first
        if (!refresh) {
            const cached = await scoringService.getPersistedScore(pool, 'supplier', supplierId);
            if (cached) {
                return res.json({
                    success: true,
                    cached: true,
                    data: cached
                });
            }
        }

        const score = await scoringService.scoreSupplier(pool, supplierId, buyerLocation);

        if (!score) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json({
            success: true,
            cached: false,
            data: score
        });
    } catch (error) {
        console.error('Error scoring supplier:', error);
        res.status(500).json({ error: 'Failed to calculate score', details: error.message });
    }
});

/**
 * POST /api/v1/scoring/calculate
 * Calculate score for provided data (no persistence)
 * Useful for preview/simulation before saving
 * 
 * Body: {
 *   certifications: ['FSC 100%', 'LEED Gold'],
 *   supplierLocation: { latitude, longitude },
 *   buyerLocation: { latitude, longitude },
 *   productData: { hasEPD, c2cLevel, leedCredits, ... },
 *   supplierData: { bCorpScore }
 * }
 */
router.post('/calculate', generalRateLimit, async (req, res) => {
    try {
        const {
            certifications = [],
            supplierLocation = {},
            buyerLocation = {},
            productData = {},
            supplierData = {}
        } = req.body;

        const score = scoringService.calculateComprehensiveScore({
            certifications,
            supplierLocation,
            buyerLocation,
            productData,
            supplierData
        });

        res.json({
            success: true,
            data: score
        });
    } catch (error) {
        console.error('Error calculating score:', error);
        res.status(500).json({ error: 'Failed to calculate score', details: error.message });
    }
});

/**
 * GET /api/v1/scoring/top-products
 * Get top-scored products, optionally filtered by category
 * 
 * Query params:
 * - category: Filter by material type
 * - limit: Max results (default 20)
 */
router.get('/top-products', generalRateLimit, async (req, res) => {
    try {
        const { category, limit = 20 } = req.query;
        
        const products = await scoringService.getTopScoredProducts(
            pool, 
            category || null, 
            Math.min(parseInt(limit) || 20, 100)
        );

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({ error: 'Failed to fetch top products', details: error.message });
    }
});

/**
 * POST /api/v1/scoring/batch
 * Score multiple products in batch
 * 
 * Body: {
 *   productIds: ['uuid1', 'uuid2', ...],
 *   buyerLocation: { latitude, longitude }
 * }
 */
router.post('/batch', generalRateLimit, async (req, res) => {
    try {
        const { productIds = [], buyerLocation = {} } = req.body;

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'productIds array is required' });
        }

        if (productIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 products per batch' });
        }

        const scores = await scoringService.batchScoreProducts(pool, productIds, buyerLocation);

        res.json({
            success: true,
            requested: productIds.length,
            scored: scores.length,
            data: scores
        });
    } catch (error) {
        console.error('Error batch scoring:', error);
        res.status(500).json({ error: 'Failed to batch score', details: error.message });
    }
});

/**
 * GET /api/v1/scoring/stats
 * Get scoring statistics for dashboard
 */
router.get('/stats', generalRateLimit, async (req, res) => {
    try {
        const stats = await scoringService.getScoringStats(pool);

        res.json({
            success: true,
            data: stats,
            weights: scoringService.WEIGHTS,
            thresholds: {
                excellent: '80-100',
                good: '60-79',
                average: '40-59',
                low: '0-39'
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});

/**
 * GET /api/v1/scoring/config
 * Get scoring configuration (weights, tiers, thresholds)
 * Useful for frontend to explain scoring methodology
 */
router.get('/config', generalRateLimit, (req, res) => {
    res.json({
        success: true,
        data: {
            weights: scoringService.WEIGHTS,
            certificationTiers: scoringService.CERT_TIERS,
            leedCategoryWeights: scoringService.LEED_CATEGORY_WEIGHTS,
            distanceThresholds: scoringService.DISTANCE_THRESHOLDS,
            recommendationTiers: {
                excellent: { min: 80, max: 100, label: 'Highly Recommended' },
                good: { min: 60, max: 79, label: 'Recommended' },
                average: { min: 40, max: 59, label: 'Acceptable' },
                low: { min: 0, max: 39, label: 'Below Average' }
            }
        }
    });
});

/**
 * GET /api/v1/scoring/distance
 * Calculate distance between two points
 * Utility endpoint for frontend
 * 
 * Query params:
 * - lat1, lng1: Point 1 coordinates
 * - lat2, lng2: Point 2 coordinates
 */
router.get('/distance', generalRateLimit, (req, res) => {
    try {
        const { lat1, lng1, lat2, lng2 } = req.query;

        if (!lat1 || !lng1 || !lat2 || !lng2) {
            return res.status(400).json({ 
                error: 'lat1, lng1, lat2, lng2 are all required' 
            });
        }

        const distance = scoringService.calculateDistance(
            parseFloat(lat1),
            parseFloat(lng1),
            parseFloat(lat2),
            parseFloat(lng2)
        );

        // Determine category
        let category;
        const thresholds = scoringService.DISTANCE_THRESHOLDS;
        if (distance <= thresholds.local) {
            category = 'local';
        } else if (distance <= thresholds.regional) {
            category = 'regional';
        } else if (distance <= thresholds.national) {
            category = 'national';
        } else {
            category = 'international';
        }

        res.json({
            success: true,
            data: {
                distanceMiles: Math.round(distance * 10) / 10,
                distanceKm: Math.round(distance * 1.60934 * 10) / 10,
                category,
                shippingImpact: category === 'local' ? 'minimal' : 
                               category === 'regional' ? 'low' :
                               category === 'national' ? 'moderate' : 'high'
            }
        });
    } catch (error) {
        console.error('Error calculating distance:', error);
        res.status(500).json({ error: 'Failed to calculate distance' });
    }
});

module.exports = router;
