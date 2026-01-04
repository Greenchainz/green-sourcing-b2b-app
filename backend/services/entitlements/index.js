/**
 * Entitlements Service
 * 
 * Central service for querying and enforcing supplier tier entitlements.
 * Provides functions that other services can use to check:
 * - canOutbound(supplierId) - can send outbound messages
 * - getRfqPriority(supplierId) - returns wave number and delay
 * - getQuotas(supplierId) - returns quota limits and usage
 * - getEntitlements(supplierId) - returns all entitlements
 * 
 * @module services/entitlements
 */

const { pool } = require('../../db');

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const entitlementCache = new Map();

/**
 * Default entitlements for suppliers without a subscription (treated as Free tier)
 */
const DEFAULT_ENTITLEMENTS = {
    tierName: 'Free',
    tierCode: 'free',
    subscriptionStatus: 'active',
    rfqWaveNumber: 3,
    rfqDelayMinutes: 30,
    rfqMonthlyQuota: 10,
    rfqsUsedThisMonth: 0,
    canOutboundMessage: false,
    outboundMonthlyQuota: 0,
    outboundUsedThisMonth: 0,
    featuredListing: false,
    verifiedBadge: false,
    analyticsDashboard: false,
    prioritySupport: false,
    apiAccess: false
};

/**
 * Clears cached entitlements for a supplier
 * @param {string|number} supplierId 
 */
function clearCache(supplierId) {
    entitlementCache.delete(String(supplierId));
}

/**
 * Clears all cached entitlements
 */
function clearAllCache() {
    entitlementCache.clear();
}

/**
 * Fetches entitlements from database and caches result
 * @param {string|number} supplierId 
 * @returns {Promise<object>} Entitlements object
 */
async function fetchEntitlements(supplierId) {
    if (!supplierId) {
        console.warn('fetchEntitlements called without supplierId');
        return { ...DEFAULT_ENTITLEMENTS };
    }

    const cacheKey = String(supplierId);
    const cached = entitlementCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }

    try {
        // Use the database function for efficient lookup
        const result = await pool.query(
            `SELECT * FROM get_supplier_entitlements($1)`,
            [supplierId]
        );

        if (result.rows.length === 0) {
            // No subscription found - return default (Free tier) entitlements
            const defaultData = { ...DEFAULT_ENTITLEMENTS };
            entitlementCache.set(cacheKey, { data: defaultData, timestamp: Date.now() });
            return defaultData;
        }

        const row = result.rows[0];
        const entitlements = {
            tierName: row.tier_name,
            tierCode: row.tier_code,
            subscriptionStatus: row.subscription_status,
            rfqWaveNumber: row.rfq_wave_number,
            rfqDelayMinutes: row.rfq_delay_minutes,
            rfqMonthlyQuota: row.rfq_monthly_quota, // null = unlimited
            rfqsUsedThisMonth: row.rfqs_used_this_month || 0,
            canOutboundMessage: row.can_outbound_message,
            outboundMonthlyQuota: row.outbound_monthly_quota, // null = unlimited
            outboundUsedThisMonth: row.outbound_used_this_month || 0,
            featuredListing: row.featured_listing,
            verifiedBadge: row.verified_badge,
            analyticsDashboard: row.analytics_dashboard,
            prioritySupport: row.priority_support,
            apiAccess: row.api_access
        };

        entitlementCache.set(cacheKey, { data: entitlements, timestamp: Date.now() });
        return entitlements;

    } catch (error) {
        console.error(`Error fetching entitlements for supplier ${supplierId}:`, error.message);
        // Return defaults on error
        return { ...DEFAULT_ENTITLEMENTS };
    }
}

/**
 * Gets all entitlements for a supplier
 * @param {string|number} supplierId 
 * @returns {Promise<object>} Full entitlements object
 */
async function getEntitlements(supplierId) {
    return await fetchEntitlements(supplierId);
}

/**
 * Checks if a supplier can send outbound messages
 * @param {string|number} supplierId 
 * @returns {Promise<{allowed: boolean, reason?: string, remaining?: number}>}
 */
async function canOutbound(supplierId) {
    const entitlements = await fetchEntitlements(supplierId);

    if (!entitlements.canOutboundMessage) {
        return {
            allowed: false,
            reason: `Outbound messaging is not available on the ${entitlements.tierName} tier. Upgrade to Standard or Premium.`
        };
    }

    // Check quota (null = unlimited)
    if (entitlements.outboundMonthlyQuota !== null) {
        const remaining = entitlements.outboundMonthlyQuota - entitlements.outboundUsedThisMonth;
        if (remaining <= 0) {
            return {
                allowed: false,
                reason: `Monthly outbound message quota exceeded (${entitlements.outboundMonthlyQuota}/${entitlements.outboundMonthlyQuota}).`,
                remaining: 0
            };
        }
        return { allowed: true, remaining };
    }

    return { allowed: true, remaining: null }; // null = unlimited
}

/**
 * Gets RFQ priority settings for a supplier
 * @param {string|number} supplierId 
 * @returns {Promise<{waveNumber: number, delayMinutes: number, tierCode: string}>}
 */
async function getRfqPriority(supplierId) {
    const entitlements = await fetchEntitlements(supplierId);
    
    return {
        waveNumber: entitlements.rfqWaveNumber,
        delayMinutes: entitlements.rfqDelayMinutes,
        tierCode: entitlements.tierCode
    };
}

/**
 * Gets quota information for a supplier
 * @param {string|number} supplierId 
 * @returns {Promise<object>} Quota information
 */
async function getQuotas(supplierId) {
    const entitlements = await fetchEntitlements(supplierId);

    return {
        rfq: {
            limit: entitlements.rfqMonthlyQuota, // null = unlimited
            used: entitlements.rfqsUsedThisMonth,
            remaining: entitlements.rfqMonthlyQuota !== null 
                ? Math.max(0, entitlements.rfqMonthlyQuota - entitlements.rfqsUsedThisMonth)
                : null
        },
        outbound: {
            limit: entitlements.outboundMonthlyQuota, // null = unlimited
            used: entitlements.outboundUsedThisMonth,
            remaining: entitlements.outboundMonthlyQuota !== null
                ? Math.max(0, entitlements.outboundMonthlyQuota - entitlements.outboundUsedThisMonth)
                : null
        }
    };
}

/**
 * Checks if a supplier can receive more RFQs this month
 * @param {string|number} supplierId 
 * @returns {Promise<{allowed: boolean, reason?: string, remaining?: number}>}
 */
async function canReceiveRfq(supplierId) {
    const entitlements = await fetchEntitlements(supplierId);

    // Check quota (null = unlimited)
    if (entitlements.rfqMonthlyQuota !== null) {
        const remaining = entitlements.rfqMonthlyQuota - entitlements.rfqsUsedThisMonth;
        if (remaining <= 0) {
            return {
                allowed: false,
                reason: `Monthly RFQ quota exceeded (${entitlements.rfqMonthlyQuota}/${entitlements.rfqMonthlyQuota}). Upgrade to receive more RFQs.`,
                remaining: 0
            };
        }
        return { allowed: true, remaining };
    }

    return { allowed: true, remaining: null }; // null = unlimited
}

/**
 * Increments RFQ usage counter for a supplier
 * @param {string|number} supplierId 
 * @param {string} rfqId - For audit logging
 * @returns {Promise<boolean>}
 */
async function incrementRfqUsage(supplierId, rfqId = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Increment counter
        await client.query(
            `UPDATE Supplier_Subscriptions 
             SET RFQsReceivedThisMonth = RFQsReceivedThisMonth + 1,
                 UpdatedAt = CURRENT_TIMESTAMP
             WHERE SupplierID = $1`,
            [supplierId]
        );

        // Log usage
        await client.query(
            `INSERT INTO Supplier_Usage_Log (SupplierID, UsageType, ReferenceID, Metadata)
             VALUES ($1, 'rfq_received', $2, $3)`,
            [supplierId, rfqId, JSON.stringify({ timestamp: new Date().toISOString() })]
        );

        await client.query('COMMIT');
        
        // Clear cache to reflect new usage
        clearCache(supplierId);
        
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error incrementing RFQ usage for supplier ${supplierId}:`, error.message);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Increments outbound message usage counter for a supplier
 * @param {string|number} supplierId 
 * @param {string} messageId - For audit logging
 * @returns {Promise<boolean>}
 */
async function incrementOutboundUsage(supplierId, messageId = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Increment counter
        await client.query(
            `UPDATE Supplier_Subscriptions 
             SET OutboundMessagesSentThisMonth = OutboundMessagesSentThisMonth + 1,
                 UpdatedAt = CURRENT_TIMESTAMP
             WHERE SupplierID = $1`,
            [supplierId]
        );

        // Log usage
        await client.query(
            `INSERT INTO Supplier_Usage_Log (SupplierID, UsageType, ReferenceID, Metadata)
             VALUES ($1, 'outbound_message', $2, $3)`,
            [supplierId, messageId, JSON.stringify({ timestamp: new Date().toISOString() })]
        );

        await client.query('COMMIT');
        
        // Clear cache to reflect new usage
        clearCache(supplierId);
        
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error incrementing outbound usage for supplier ${supplierId}:`, error.message);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Resets monthly usage counters (run this on a monthly cron)
 * @returns {Promise<number>} Number of subscriptions reset
 */
async function resetMonthlyUsage() {
    try {
        const result = await pool.query(
            `UPDATE Supplier_Subscriptions 
             SET RFQsReceivedThisMonth = 0,
                 OutboundMessagesSentThisMonth = 0,
                 UsageResetAt = CURRENT_TIMESTAMP,
                 UpdatedAt = CURRENT_TIMESTAMP
             WHERE Status IN ('active', 'trialing')
             RETURNING SubscriptionID`
        );

        // Clear all cache
        clearAllCache();

        console.log(`Reset monthly usage for ${result.rowCount} subscriptions`);
        return result.rowCount;
    } catch (error) {
        console.error('Error resetting monthly usage:', error.message);
        throw error;
    }
}

/**
 * Gets tier information by tier code
 * @param {string} tierCode - 'free', 'standard', or 'premium'
 * @returns {Promise<object|null>}
 */
async function getTierByCode(tierCode) {
    try {
        const result = await pool.query(
            `SELECT st.*, te.*
             FROM Supplier_Tiers st
             JOIN Tier_Entitlements te ON st.TierID = te.TierID
             WHERE st.TierCode = $1 AND st.IsActive = TRUE`,
            [tierCode]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            tierId: row.tierid,
            tierName: row.tiername,
            tierCode: row.tiercode,
            description: row.description,
            monthlyPrice: parseFloat(row.monthlyprice),
            annualPrice: parseFloat(row.annualprice),
            entitlements: {
                rfqWaveNumber: row.rfqwavenumber,
                rfqDelayMinutes: row.rfqdelayminutes,
                rfqMonthlyQuota: row.rfqmonthlyquota,
                canOutboundMessage: row.canoutboundmessage,
                outboundMonthlyQuota: row.outboundmonthlyquota,
                featuredListing: row.featuredlisting,
                verifiedBadge: row.verifiedbadge,
                analyticsDashboard: row.analyticsdashboard,
                prioritySupport: row.prioritysupport,
                apiAccess: row.apiaccess
            }
        };
    } catch (error) {
        console.error(`Error fetching tier ${tierCode}:`, error.message);
        return null;
    }
}

/**
 * Gets all available tiers
 * @returns {Promise<Array>}
 */
async function getAllTiers() {
    try {
        const result = await pool.query(
            `SELECT st.*, te.*
             FROM Supplier_Tiers st
             JOIN Tier_Entitlements te ON st.TierID = te.TierID
             WHERE st.IsActive = TRUE
             ORDER BY st.DisplayOrder`
        );

        return result.rows.map(row => ({
            tierId: row.tierid,
            tierName: row.tiername,
            tierCode: row.tiercode,
            description: row.description,
            monthlyPrice: parseFloat(row.monthlyprice),
            annualPrice: parseFloat(row.annualprice),
            entitlements: {
                rfqWaveNumber: row.rfqwavenumber,
                rfqDelayMinutes: row.rfqdelayminutes,
                rfqMonthlyQuota: row.rfqmonthlyquota,
                canOutboundMessage: row.canoutboundmessage,
                outboundMonthlyQuota: row.outboundmonthlyquota,
                featuredListing: row.featuredlisting,
                verifiedBadge: row.verifiedbadge,
                analyticsDashboard: row.analyticsdashboard,
                prioritySupport: row.prioritysupport,
                apiAccess: row.apiaccess
            }
        }));
    } catch (error) {
        console.error('Error fetching all tiers:', error.message);
        return [];
    }
}

/**
 * Creates or updates a supplier subscription
 * @param {string|number} supplierId 
 * @param {string} tierCode - 'free', 'standard', or 'premium'
 * @param {object} options - Additional subscription options
 * @returns {Promise<object>}
 */
async function setSupplierTier(supplierId, tierCode, options = {}) {
    const { 
        billingCycle = 'monthly',
        stripeCustomerId = null,
        stripeSubscriptionId = null,
        trialDays = 0
    } = options;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get tier ID
        const tierResult = await client.query(
            `SELECT TierID FROM Supplier_Tiers WHERE TierCode = $1 AND IsActive = TRUE`,
            [tierCode]
        );

        if (tierResult.rows.length === 0) {
            throw new Error(`Tier ${tierCode} not found`);
        }

        const tierId = tierResult.rows[0].tierid;
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'annual' ? 12 : 1));

        const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
        const status = trialDays > 0 ? 'trialing' : 'active';

        // Upsert subscription
        const result = await client.query(
            `INSERT INTO Supplier_Subscriptions (
                SupplierID, TierID, Status, BillingCycle,
                StripeCustomerID, StripeSubscriptionID,
                CurrentPeriodStart, CurrentPeriodEnd, TrialEndsAt,
                RFQsReceivedThisMonth, OutboundMessagesSentThisMonth, UsageResetAt
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, $7)
            ON CONFLICT (SupplierID) DO UPDATE SET
                TierID = EXCLUDED.TierID,
                Status = EXCLUDED.Status,
                BillingCycle = EXCLUDED.BillingCycle,
                StripeCustomerID = COALESCE(EXCLUDED.StripeCustomerID, Supplier_Subscriptions.StripeCustomerID),
                StripeSubscriptionID = COALESCE(EXCLUDED.StripeSubscriptionID, Supplier_Subscriptions.StripeSubscriptionID),
                CurrentPeriodStart = EXCLUDED.CurrentPeriodStart,
                CurrentPeriodEnd = EXCLUDED.CurrentPeriodEnd,
                TrialEndsAt = EXCLUDED.TrialEndsAt,
                CanceledAt = NULL,
                CancelAtPeriodEnd = FALSE,
                UpdatedAt = CURRENT_TIMESTAMP
            RETURNING *`,
            [supplierId, tierId, status, billingCycle, stripeCustomerId, stripeSubscriptionId, now, periodEnd, trialEnd]
        );

        await client.query('COMMIT');

        // Clear cache
        clearCache(supplierId);

        return {
            success: true,
            subscription: result.rows[0]
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error setting tier for supplier ${supplierId}:`, error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    // Core entitlement queries
    getEntitlements,
    canOutbound,
    getRfqPriority,
    getQuotas,
    canReceiveRfq,
    
    // Usage tracking
    incrementRfqUsage,
    incrementOutboundUsage,
    resetMonthlyUsage,
    
    // Tier management
    getTierByCode,
    getAllTiers,
    setSupplierTier,
    
    // Cache management
    clearCache,
    clearAllCache,
    
    // Constants
    DEFAULT_ENTITLEMENTS
};
