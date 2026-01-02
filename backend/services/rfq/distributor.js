const { pool } = require('../../db');
const { findMatchingSuppliers } = require('./matcher');
const { createDistributionWaves } = require('./waves');
const { updateResponseMetrics } = require('./metrics');

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
 * Calculates priority score for a supplier.
 * @param {object} supplier - Supplier object with metrics and tier.
 * @param {object} rfq - RFQ object (for location).
 * @param {object} metrics - Metrics object from DB.
 * @param {object} verification - Verification scores from DB.
 * @returns {number} Priority score (0-100).
 */
function calculatePriorityScore(supplier, rfq, metrics, verification) {
    // 1. Distance Score (30%)
    // Lower distance is better. Let's say < 50km is 100, > 500km is 0.
    let distanceScore = 0;
    // Assuming RFQ might have project location. If not, we skip or default.
    // RFQ schema has project_details which might contain location or we use buyer location?
    // Let's assume rfq has latitude/longitude or we can't calculate.
    // Ideally RFQ or Project has location. Let's assume we pass it or it's on RFQ.
    // If not available, we give a neutral score.

    if (supplier.latitude && supplier.longitude && rfq.project_details && rfq.project_details.latitude) {
        const dist = haversineDistance(
            supplier.latitude, supplier.longitude,
            rfq.project_details.latitude, rfq.project_details.longitude
        );
        if (dist <= 50) distanceScore = 100;
        else if (dist >= 500) distanceScore = 0;
        else distanceScore = 100 - ((dist - 50) / 450) * 100;
    } else {
        distanceScore = 50; // Neutral
    }

    // 2. Tier Level (25%)
    const tiers = {
        'enterprise': 100,
        'pro': 75,
        'claimed': 50,
        'free': 25,
        'scraped': 0
    };
    const tierScore = tiers[(supplier.tier || 'free').toLowerCase()] || 25;

    // 3. Response Rate (20%)
    const responseRate = metrics ? parseFloat(metrics.response_rate) : 0;
    const responseScore = responseRate; // 0-100 already

    // 4. Match Score (15%)
    // Passed in supplier object from matcher
    const matchScore = supplier.matchScore || 0;

    // 5. Verification Score (10%)
    const verificationScore = verification ? verification.verification_score : 0;

    // Weighted Sum
    const totalScore =
        (distanceScore * 0.30) +
        // Formula in prompt: "Tier level: 25% weight"
        (tierScore * 0.25) +
        (responseScore * 0.20) +
        (matchScore * 0.15) +
        (verificationScore * 0.10);

    return totalScore;
}

/**
 * Main distribution function.
 * @param {string} rfqId - The UUID of the RFQ.
 */
async function distributeRFQ(rfqId) {
    const client = await pool.connect();
    try {
        console.log(`Starting distribution for RFQ ${rfqId}`);

        // 1. Find Matching Suppliers
        let candidates = await findMatchingSuppliers(rfqId);
        if (candidates.length === 0) {
            console.log('No matching suppliers found.');
            return;
        }

        // 2. Fetch Additional Data (Metrics & Verification) for Candidates
        // Use a loop or IN query. For simplicity, loop.
        for (const supplier of candidates) {
            // Get Metrics
            const metricsRes = await client.query('SELECT * FROM "Supplier_Response_Metrics" WHERE supplier_id = $1', [supplier.id]);
            supplier.metrics = metricsRes.rows[0] || {};

            // Get Verification
            const verifyRes = await client.query('SELECT * FROM "Supplier_Verification_Scores" WHERE supplier_id = $1', [supplier.id]);
            supplier.verification = verifyRes.rows[0] || {};

            // Get RFQ details for distance calc (if needed inside calculation)
            // findMatchingSuppliers doesn't return RFQ object, so fetch it once.
        }

        const rfqRes = await client.query('SELECT * FROM rfqs WHERE id = $1', [rfqId]);
        const rfq = rfqRes.rows[0];

        // 3. Calculate Priority Scores
        candidates = candidates.map(s => {
            const score = calculatePriorityScore(s, rfq, s.metrics, s.verification);
            return { ...s, priorityScore: score };
        });

        // Sort by Priority Score Descending
        candidates.sort((a, b) => b.priorityScore - a.priorityScore);

        console.log(`Ranked ${candidates.length} suppliers for RFQ ${rfqId}`);

        // 4. Create Distribution Waves
        await createDistributionWaves(rfqId, candidates);

        // 5. Trigger Initial Notifications (for Wave 1)
        // This might be done by a separate job runner that checks the queue,
        // but we can trigger immediate ones here if their start time is now.
        // For MVP, we'll let a cron job or similar handle "NotifiedAt" updates based on VisibleAt.
        // But the prompt asks for "notifySupplier" in notifications.js.
        // We assume an external process calls notifySupplier based on queue.

        console.log('Distribution waves created.');

    } catch (err) {
        console.error('Error distributing RFQ:', err);
    } finally {
        client.release();
    }
}

module.exports = {
    distributeRFQ
};
