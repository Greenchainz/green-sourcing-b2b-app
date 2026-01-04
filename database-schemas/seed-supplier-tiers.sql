-- Seed Supplier Tiers and Entitlements for Freemium Model
-- Free / Standard / Premium tiers with associated entitlements

-- ============================================
-- SUPPLIER TIERS
-- ============================================
INSERT INTO Supplier_Tiers (TierName, TierCode, Description, MonthlyPrice, AnnualPrice, DisplayOrder, IsActive) 
VALUES 
    (
        'Free', 
        'free', 
        'Basic access for new suppliers. Limited RFQ visibility with delayed access.',
        0.00, 
        0.00, 
        1, 
        TRUE
    ),
    (
        'Standard', 
        'standard', 
        'Enhanced visibility with faster RFQ access and outbound messaging.',
        49.00, 
        490.00, 
        2, 
        TRUE
    ),
    (
        'Premium', 
        'premium', 
        'Priority access to all RFQs, unlimited messaging, and premium features.',
        199.00, 
        1990.00, 
        3, 
        TRUE
    )
ON CONFLICT (TierCode) DO UPDATE SET
    TierName = EXCLUDED.TierName,
    Description = EXCLUDED.Description,
    MonthlyPrice = EXCLUDED.MonthlyPrice,
    AnnualPrice = EXCLUDED.AnnualPrice,
    DisplayOrder = EXCLUDED.DisplayOrder,
    IsActive = EXCLUDED.IsActive;

-- ============================================
-- TIER ENTITLEMENTS
-- ============================================

-- Free Tier Entitlements
-- Wave 3 (30 min delay), 10 RFQs/month, no outbound messaging
INSERT INTO Tier_Entitlements (
    TierID,
    RFQWaveNumber, RFQDelayMinutes, RFQMonthlyQuota,
    CanOutboundMessage, OutboundMonthlyQuota,
    FeaturedListing, VerifiedBadge, AnalyticsDashboard, PrioritySupport, APIAccess,
    ExtraEntitlements
)
SELECT 
    TierID,
    3,      -- Wave 3
    30,     -- 30 min delay
    10,     -- 10 RFQs per month
    FALSE,  -- No outbound messaging
    0,      -- 0 outbound messages
    FALSE, FALSE, FALSE, FALSE, FALSE,
    '{"profile_views_limit": 100}'::jsonb
FROM Supplier_Tiers WHERE TierCode = 'free'
ON CONFLICT (TierID) DO UPDATE SET
    RFQWaveNumber = EXCLUDED.RFQWaveNumber,
    RFQDelayMinutes = EXCLUDED.RFQDelayMinutes,
    RFQMonthlyQuota = EXCLUDED.RFQMonthlyQuota,
    CanOutboundMessage = EXCLUDED.CanOutboundMessage,
    OutboundMonthlyQuota = EXCLUDED.OutboundMonthlyQuota,
    FeaturedListing = EXCLUDED.FeaturedListing,
    VerifiedBadge = EXCLUDED.VerifiedBadge,
    AnalyticsDashboard = EXCLUDED.AnalyticsDashboard,
    PrioritySupport = EXCLUDED.PrioritySupport,
    APIAccess = EXCLUDED.APIAccess,
    ExtraEntitlements = EXCLUDED.ExtraEntitlements;

-- Standard Tier Entitlements
-- Wave 2 (15 min delay), 50 RFQs/month, 25 outbound messages
INSERT INTO Tier_Entitlements (
    TierID,
    RFQWaveNumber, RFQDelayMinutes, RFQMonthlyQuota,
    CanOutboundMessage, OutboundMonthlyQuota,
    FeaturedListing, VerifiedBadge, AnalyticsDashboard, PrioritySupport, APIAccess,
    ExtraEntitlements
)
SELECT 
    TierID,
    2,      -- Wave 2
    15,     -- 15 min delay
    50,     -- 50 RFQs per month
    TRUE,   -- Outbound messaging enabled
    25,     -- 25 outbound messages per month
    FALSE,  -- No featured listing
    TRUE,   -- Verified badge
    TRUE,   -- Analytics dashboard
    FALSE,  -- No priority support
    FALSE,  -- No API access
    '{"profile_views_limit": null, "response_templates": 5}'::jsonb
FROM Supplier_Tiers WHERE TierCode = 'standard'
ON CONFLICT (TierID) DO UPDATE SET
    RFQWaveNumber = EXCLUDED.RFQWaveNumber,
    RFQDelayMinutes = EXCLUDED.RFQDelayMinutes,
    RFQMonthlyQuota = EXCLUDED.RFQMonthlyQuota,
    CanOutboundMessage = EXCLUDED.CanOutboundMessage,
    OutboundMonthlyQuota = EXCLUDED.OutboundMonthlyQuota,
    FeaturedListing = EXCLUDED.FeaturedListing,
    VerifiedBadge = EXCLUDED.VerifiedBadge,
    AnalyticsDashboard = EXCLUDED.AnalyticsDashboard,
    PrioritySupport = EXCLUDED.PrioritySupport,
    APIAccess = EXCLUDED.APIAccess,
    ExtraEntitlements = EXCLUDED.ExtraEntitlements;

-- Premium Tier Entitlements
-- Wave 1 (0 min delay), Unlimited RFQs, Unlimited outbound messages
INSERT INTO Tier_Entitlements (
    TierID,
    RFQWaveNumber, RFQDelayMinutes, RFQMonthlyQuota,
    CanOutboundMessage, OutboundMonthlyQuota,
    FeaturedListing, VerifiedBadge, AnalyticsDashboard, PrioritySupport, APIAccess,
    ExtraEntitlements
)
SELECT 
    TierID,
    1,      -- Wave 1 (immediate)
    0,      -- 0 min delay
    NULL,   -- Unlimited RFQs
    TRUE,   -- Outbound messaging enabled
    NULL,   -- Unlimited outbound messages (NULL = unlimited)
    TRUE,   -- Featured listing
    TRUE,   -- Verified badge
    TRUE,   -- Analytics dashboard
    TRUE,   -- Priority support
    TRUE,   -- API access
    '{"profile_views_limit": null, "response_templates": null, "custom_branding": true, "dedicated_account_manager": true}'::jsonb
FROM Supplier_Tiers WHERE TierCode = 'premium'
ON CONFLICT (TierID) DO UPDATE SET
    RFQWaveNumber = EXCLUDED.RFQWaveNumber,
    RFQDelayMinutes = EXCLUDED.RFQDelayMinutes,
    RFQMonthlyQuota = EXCLUDED.RFQMonthlyQuota,
    CanOutboundMessage = EXCLUDED.CanOutboundMessage,
    OutboundMonthlyQuota = EXCLUDED.OutboundMonthlyQuota,
    FeaturedListing = EXCLUDED.FeaturedListing,
    VerifiedBadge = EXCLUDED.VerifiedBadge,
    AnalyticsDashboard = EXCLUDED.AnalyticsDashboard,
    PrioritySupport = EXCLUDED.PrioritySupport,
    APIAccess = EXCLUDED.APIAccess,
    ExtraEntitlements = EXCLUDED.ExtraEntitlements;

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT st.TierName, st.MonthlyPrice, te.* 
-- FROM Supplier_Tiers st 
-- JOIN Tier_Entitlements te ON st.TierID = te.TierID
-- ORDER BY st.DisplayOrder;
