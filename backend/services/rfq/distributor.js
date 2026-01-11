const { pool } = require('../../db');
const { findMatchingSuppliers } = require('./matcher');
const { createDistributionWaves, isShadowTier, ACCESS_LEVELS } = require('./waves');
const entitlements = require('../entitlements');
const { canDistributeRFQ } = require('../linkedinVerification');

/**
 * Calculates the Haversine distance between two points in kilometers.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in km
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

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
 * Tier score mapping for priority calculation.
 * Maps tier codes to scores (0-100).
 * Premium/Enterprise get highest priority, Free/Scraped get lowest.
 */
const TIER_SCORES = {
    'premium': 100,
    'enterprise': 100,
    'standard': 75,
    'pro': 75,
    'claimed': 50,
    'free': 25,
    'scraped': 0
};

/**
 * Gets tier score from entitlements or falls back to legacy tier.
 * @param {object} supplier - Supplier object
 * @param {object} supplierEntitlements - Optional entitlements object
 * @returns {number} Score 0-100
 */
function getTierScore(supplier, supplierEntitlements = null) {
    // If we have entitlements, use the tier code from there
    if (supplierEntitlements?.tierCode) {
        return TIER_SCORES[supplierEntitlements.tierCode.toLowerCase()] ?? 25;
    }
    // Fallback to supplier.tier
    return TIER_SCORES[(supplier.tier || 'free').toLowerCase()] ?? 25;
}

/**
 * Calculates priority score for a supplier.
 * @param {object} supplier - Supplier object with metrics and tier.
 * @param {object} rfq - RFQ object (for location).
 * @param {object} metrics - Metrics object from DB.
 * @param {object} verification - Verification scores from DB.
 * @param {object} supplierEntitlements - Optional entitlements from entitlements service
 * @returns {number} Priority score (0-100).
 */
function calculatePriorityScore(supplier, rfq, metrics, verification, supplierEntitlements = null) {
    // 1. Distance Score (30%)
    // Lower distance is better. < 50km = 100, > 500km = 0.
    let distanceScore = 50; // Default neutral score

    const projectDetails = parseProjectDetails(rfq?.project_details);
    
    if (supplier.latitude && supplier.longitude && projectDetails.latitude && projectDetails.longitude) {
        const dist = haversineDistance(
            supplier.latitude, supplier.longitude,
            projectDetails.latitude, projectDetails.longitude
        );
        if (dist !== null) {
            if (dist <= 50) distanceScore = 100;
            else if (dist >= 500) distanceScore = 0;
            else distanceScore = 100 - ((dist - 50) / 450) * 100;
        }
    }

    // 2. Tier Level (25%) - Now uses entitlements-based scoring
    const tierScore = getTierScore(supplier, supplierEntitlements);

    // 3. Response Rate (20%)
    const responseRate = metrics?.response_rate ? parseFloat(metrics.response_rate) : 0;
    const responseScore = Math.min(Math.max(responseRate, 0), 100); // Clamp 0-100

    // 4. Match Score (15%)
    const matchScore = supplier.matchScore || 0;

    // 5. Verification Score (10%)
    const verificationScore = verification?.verification_score || 0;

    // Weighted Sum
    const totalScore =
        (distanceScore * 0.30) +
        (tierScore * 0.25) +
        (responseScore * 0.20) +
        (matchScore * 0.15) +
        (verificationScore * 0.10);

    return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Main distribution function.
 * Creates distribution waves for matching suppliers with tiered access.
 * 
 * Tiered Access Policy:
 * - Premium suppliers: Wave 1, immediate full access
 * - Standard suppliers: Wave 2, 15-min delay, full access
 * - Free suppliers: Wave 3, 60-min delay, full access
 * - Shadow suppliers: Wave 4, outreach/claim prompts ONLY (no full listing)
 * 
 * Now integrates with the entitlements service to:
 * - Factor subscription tier into priority scoring
 * - Assign waves based on tier entitlements
 * - Enforce RFQ quotas per tier
 * 
 * @param {string} rfqId - The UUID of the RFQ.
 * @param {object} options - Distribution options
 * @param {boolean} options.useEntitlements - Use entitlements service (default: true)
 * @param {boolean} options.enforceQuotas - Enforce RFQ quotas (default: true)
 * @returns {Promise<{success: boolean, supplierCount: number, skippedQuota?: number, error?: string}>}
 * @returns {Promise<{success: boolean, supplierCount: number, shadowCount: number, waveBreakdown: object, error?: string}>}
 */
async function distributeRFQ(rfqId, options = {}) {
    const { useEntitlements = true, enforceQuotas = true, buyerId = null, skipVerification = false } = options;

    if (!rfqId) {
        console.error('distributeRFQ called without rfqId');
        return { success: false, supplierCount: 0, shadowCount: 0, waveBreakdown: {}, error: 'Missing rfqId' };
    }

    const client = await pool.connect();
    try {
        console.log(`[RFQ Distribution] Starting distribution for RFQ ${rfqId}`);

        // Buyer Verification Gate: Require LinkedIn + deposit verification before distribution
        if (!skipVerification && buyerId) {
            const { canDistribute, missing, error } = await canDistributeRFQ(buyerId);
            
            if (error) {
                console.error(`[RFQ Distribution] Verification check failed for buyer ${buyerId}:`, error);
                return { 
                    success: false, 
                    supplierCount: 0, 
                    shadowCount: 0, 
                    waveBreakdown: {}, 
                    error: 'Buyer verification check failed' 
                };
            }

            if (!canDistribute) {
                console.log(`[RFQ Distribution] Buyer ${buyerId} blocked - missing verifications: ${missing.join(', ')}`);
                return { 
                    success: false, 
                    supplierCount: 0, 
                    shadowCount: 0, 
                    waveBreakdown: {}, 
                    error: `Buyer verification required: ${missing.join(', ')}`,
                    missingVerifications: missing
                };
            }
            
            console.log(`[RFQ Distribution] Buyer ${buyerId} verified for distribution`);
        }

        // 1. Find Matching Suppliers
        let candidates = await findMatchingSuppliers(rfqId);
        if (!candidates || candidates.length === 0) {
            console.log(`[RFQ Distribution] No matching suppliers found for RFQ ${rfqId}.`);
            return { success: true, supplierCount: 0, shadowCount: 0, waveBreakdown: {} };
        }

        // 2. Fetch RFQ details
        const rfqRes = await client.query('SELECT * FROM rfqs WHERE id = $1', [rfqId]);
        if (rfqRes.rows.length === 0) {
            console.error(`[RFQ Distribution] RFQ ${rfqId} not found during distribution.`);
            return { success: false, supplierCount: 0, shadowCount: 0, waveBreakdown: {}, error: 'RFQ not found' };
        }
        const rfq = rfqRes.rows[0];

        // 3. Fetch Additional Data (Metrics & Verification) for Candidates in batch
        const supplierIds = candidates.map(s => s.id);
        
        // Batch fetch metrics
        const metricsRes = await client.query(
            `SELECT * FROM "Supplier_Response_Metrics" WHERE supplier_id = ANY($1)`,
            [supplierIds]
        );
        const metricsMap = new Map(metricsRes.rows.map(m => [m.supplier_id, m]));

        // Batch fetch verification scores
        const verifyRes = await client.query(
            `SELECT * FROM "Supplier_Verification_Scores" WHERE supplier_id = ANY($1)`,
            [supplierIds]
        );
        const verifyMap = new Map(verifyRes.rows.map(v => [v.supplier_id, v]));

        // 4. Fetch entitlements for all suppliers (if enabled)
        const entitlementsMap = new Map();
        if (useEntitlements) {
            // Fetch entitlements in parallel for performance
            const entitlementPromises = supplierIds.map(async (id) => {
                const ent = await entitlements.getEntitlements(id);
                return [id, ent];
            });
            const entitlementResults = await Promise.all(entitlementPromises);
            entitlementResults.forEach(([id, ent]) => entitlementsMap.set(id, ent));
        }

        // 5. Calculate Priority Scores and categorize by tier
        let fullAccessCount = 0;
        let shadowAccessCount = 0;
        
        candidates = candidates.map(s => {
            const metrics = metricsMap.get(s.id) || {};
            const verification = verifyMap.get(s.id) || {};
            const supplierEntitlements = entitlementsMap.get(s.id) || null;
            const priorityScore = calculatePriorityScore(s, rfq, metrics, verification, supplierEntitlements);
            const isShadow = isShadowTier(s.tier);
            
            if (isShadow) {
                shadowAccessCount++;
            } else {
                fullAccessCount++;
            }
            
            return { ...s, metrics, verification, entitlements: supplierEntitlements, priorityScore, isShadow };
        });

        // Sort by Priority Score Descending (within tier groups)
        candidates.sort((a, b) => b.priorityScore - a.priorityScore);

        console.log(`[RFQ Distribution] Ranked ${candidates.length} suppliers for RFQ ${rfqId}:`);
        console.log(`  - Full access eligible: ${fullAccessCount}`);
        console.log(`  - Shadow/outreach only: ${shadowAccessCount}`);

        // 6. Limit total candidates if limit option is provided (Avoid Spam Requirement)
        if (options.limit && typeof options.limit === 'number' && options.limit > 0) {
            candidates = candidates.slice(0, options.limit);
            console.log(`[RFQ Distribution] Limited distribution to top ${options.limit} candidates`);
        }

        // 7. Create Distribution Waves with tiered access
        const waveResult = await createDistributionWaves(rfqId, candidates, { 
            useEntitlements, 
            enforceQuotas 
        });

        if (!waveResult.success) {
            console.error(`[RFQ Distribution] Failed to create waves for RFQ ${rfqId}: ${waveResult.error}`);
            return { 
                success: false, 
                supplierCount: 0, 
                shadowCount: 0, 
                waveBreakdown: {},
                error: waveResult.error 
            };
        }

        console.log(`[RFQ Distribution] Waves created for RFQ ${rfqId}:`);
        console.log(`  - Full access: ${waveResult.count} suppliers`);
        console.log(`  - Shadow outreach: ${waveResult.shadowCount} suppliers`);

        return { 
            success: true, 
            supplierCount: waveResult.count,
            skippedQuota: waveResult.skippedQuota || 0,
            shadowCount: waveResult.shadowCount,
            waveBreakdown: waveResult.waveBreakdown || {}
        };

    } catch (err) {
        console.error(`[RFQ Distribution] Error distributing RFQ ${rfqId}:`, err);
        return { success: false, supplierCount: 0, shadowCount: 0, waveBreakdown: {}, error: err.message };
    } finally {
        client.release();
    }
}

module.exports = {
    distributeRFQ,
    calculatePriorityScore,
    haversineDistance,
    getTierScore,
    TIER_SCORES
};
