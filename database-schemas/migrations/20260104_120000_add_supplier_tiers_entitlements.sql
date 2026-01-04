-- Migration: Add Supplier Tiers and Entitlements
-- Created: 2026-01-04 12:00:00
-- Author: GreenChainz Platform
-- 
-- Description:
-- Creates the pricing tier system for suppliers with Free/Standard/Premium tiers.
-- Each tier has associated entitlements that control:
-- - RFQ priority timing (wave placement)
-- - RFQ quota (monthly limit)
-- - Outbound messaging capability
-- 
-- This enables the freemium business model where higher tiers get faster
-- access to RFQs and more capabilities.
--
-- Impact:
-- - Performance: Minimal - small lookup tables
-- - Storage: ~1KB per supplier subscription
-- - Downtime: None - additive changes only
-- - Dependencies: Suppliers table must exist

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create Supplier_Tiers table (defines available tiers)
CREATE TABLE IF NOT EXISTS Supplier_Tiers (
    TierID SERIAL PRIMARY KEY,
    TierName VARCHAR(50) UNIQUE NOT NULL,
    TierCode VARCHAR(20) UNIQUE NOT NULL,
    Description TEXT,
    MonthlyPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    AnnualPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    DisplayOrder INTEGER DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Supplier_Tiers IS 'Defines pricing tiers for suppliers (Free, Standard, Premium)';

-- Step 2: Create Tier_Entitlements table (defines what each tier gets)
CREATE TABLE IF NOT EXISTS Tier_Entitlements (
    EntitlementID SERIAL PRIMARY KEY,
    TierID INTEGER NOT NULL REFERENCES Supplier_Tiers(TierID) ON DELETE CASCADE,
    
    -- RFQ Priority: Which wave the supplier is placed in (1=fastest, 4=slowest)
    RFQWaveNumber INTEGER NOT NULL DEFAULT 3 CHECK (RFQWaveNumber >= 1 AND RFQWaveNumber <= 4),
    RFQDelayMinutes INTEGER NOT NULL DEFAULT 30,
    
    -- RFQ Quota: Monthly limit on RFQs received (NULL = unlimited)
    RFQMonthlyQuota INTEGER DEFAULT NULL,
    
    -- Messaging Entitlements
    CanOutboundMessage BOOLEAN NOT NULL DEFAULT FALSE,
    OutboundMonthlyQuota INTEGER DEFAULT 0,
    
    -- Profile Features
    FeaturedListing BOOLEAN NOT NULL DEFAULT FALSE,
    VerifiedBadge BOOLEAN NOT NULL DEFAULT FALSE,
    AnalyticsDashboard BOOLEAN NOT NULL DEFAULT FALSE,
    PrioritySupport BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- API Access
    APIAccess BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Custom/Extra entitlements as JSON for flexibility
    ExtraEntitlements JSONB DEFAULT '{}'::jsonb,
    
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_tier_entitlements UNIQUE (TierID)
);

COMMENT ON TABLE Tier_Entitlements IS 'Defines entitlements per tier: RFQ priority, quotas, messaging';

-- Step 3: Create Supplier_Subscriptions table (links suppliers to their tier)
CREATE TABLE IF NOT EXISTS Supplier_Subscriptions (
    SubscriptionID BIGSERIAL PRIMARY KEY,
    SupplierID BIGINT NOT NULL,
    TierID INTEGER NOT NULL REFERENCES Supplier_Tiers(TierID),
    
    -- Subscription status
    Status VARCHAR(50) NOT NULL DEFAULT 'active' 
        CHECK (Status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'pending')),
    
    -- Billing info
    BillingCycle VARCHAR(20) DEFAULT 'monthly' CHECK (BillingCycle IN ('monthly', 'annual', 'lifetime')),
    StripeCustomerID VARCHAR(255),
    StripeSubscriptionID VARCHAR(255),
    
    -- Period tracking
    CurrentPeriodStart TIMESTAMP,
    CurrentPeriodEnd TIMESTAMP,
    TrialEndsAt TIMESTAMP,
    CanceledAt TIMESTAMP,
    CancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking (for quota enforcement)
    RFQsReceivedThisMonth INTEGER DEFAULT 0,
    OutboundMessagesSentThisMonth INTEGER DEFAULT 0,
    UsageResetAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_supplier_subscription UNIQUE (SupplierID)
);

COMMENT ON TABLE Supplier_Subscriptions IS 'Tracks supplier tier subscriptions and usage';

-- Step 4: Create Supplier_Usage_Log for audit trail
CREATE TABLE IF NOT EXISTS Supplier_Usage_Log (
    LogID BIGSERIAL PRIMARY KEY,
    SupplierID BIGINT NOT NULL,
    UsageType VARCHAR(50) NOT NULL CHECK (UsageType IN ('rfq_received', 'outbound_message', 'api_call')),
    ReferenceID VARCHAR(255), -- rfq_id, message_id, etc.
    Metadata JSONB DEFAULT '{}'::jsonb,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Supplier_Usage_Log IS 'Audit log of supplier tier usage for billing and analytics';

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_supplier ON Supplier_Subscriptions(SupplierID);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_tier ON Supplier_Subscriptions(TierID);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_status ON Supplier_Subscriptions(Status);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_period ON Supplier_Subscriptions(CurrentPeriodEnd);
CREATE INDEX IF NOT EXISTS idx_tier_entitlements_tier ON Tier_Entitlements(TierID);
CREATE INDEX IF NOT EXISTS idx_supplier_usage_log_supplier ON Supplier_Usage_Log(SupplierID, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_usage_log_type ON Supplier_Usage_Log(UsageType, CreatedAt DESC);

-- Step 6: Create function to get supplier entitlements (for easy querying)
CREATE OR REPLACE FUNCTION get_supplier_entitlements(p_supplier_id BIGINT)
RETURNS TABLE (
    tier_name VARCHAR(50),
    tier_code VARCHAR(20),
    subscription_status VARCHAR(50),
    rfq_wave_number INTEGER,
    rfq_delay_minutes INTEGER,
    rfq_monthly_quota INTEGER,
    rfqs_used_this_month INTEGER,
    can_outbound_message BOOLEAN,
    outbound_monthly_quota INTEGER,
    outbound_used_this_month INTEGER,
    featured_listing BOOLEAN,
    verified_badge BOOLEAN,
    analytics_dashboard BOOLEAN,
    priority_support BOOLEAN,
    api_access BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.TierName,
        st.TierCode,
        ss.Status,
        te.RFQWaveNumber,
        te.RFQDelayMinutes,
        te.RFQMonthlyQuota,
        ss.RFQsReceivedThisMonth,
        te.CanOutboundMessage,
        te.OutboundMonthlyQuota,
        ss.OutboundMessagesSentThisMonth,
        te.FeaturedListing,
        te.VerifiedBadge,
        te.AnalyticsDashboard,
        te.PrioritySupport,
        te.APIAccess
    FROM Supplier_Subscriptions ss
    JOIN Supplier_Tiers st ON ss.TierID = st.TierID
    JOIN Tier_Entitlements te ON st.TierID = te.TierID
    WHERE ss.SupplierID = p_supplier_id
    AND ss.Status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_supplier_entitlements IS 'Returns all entitlements for a supplier based on their active subscription';

-- Step 7: Create trigger to update UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_tiers_updated ON Supplier_Tiers;
CREATE TRIGGER trg_supplier_tiers_updated
    BEFORE UPDATE ON Supplier_Tiers
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

DROP TRIGGER IF EXISTS trg_tier_entitlements_updated ON Tier_Entitlements;
CREATE TRIGGER trg_tier_entitlements_updated
    BEFORE UPDATE ON Tier_Entitlements
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

DROP TRIGGER IF EXISTS trg_supplier_subscriptions_updated ON Supplier_Subscriptions;
CREATE TRIGGER trg_supplier_subscriptions_updated
    BEFORE UPDATE ON Supplier_Subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- DROP TRIGGER IF EXISTS trg_supplier_subscriptions_updated ON Supplier_Subscriptions;
-- DROP TRIGGER IF EXISTS trg_tier_entitlements_updated ON Tier_Entitlements;
-- DROP TRIGGER IF EXISTS trg_supplier_tiers_updated ON Supplier_Tiers;
-- DROP FUNCTION IF EXISTS update_modified_timestamp();
-- DROP FUNCTION IF EXISTS get_supplier_entitlements(BIGINT);
-- DROP INDEX IF EXISTS idx_supplier_usage_log_type;
-- DROP INDEX IF EXISTS idx_supplier_usage_log_supplier;
-- DROP INDEX IF EXISTS idx_tier_entitlements_tier;
-- DROP INDEX IF EXISTS idx_supplier_subscriptions_period;
-- DROP INDEX IF EXISTS idx_supplier_subscriptions_status;
-- DROP INDEX IF EXISTS idx_supplier_subscriptions_tier;
-- DROP INDEX IF EXISTS idx_supplier_subscriptions_supplier;
-- DROP TABLE IF EXISTS Supplier_Usage_Log;
-- DROP TABLE IF EXISTS Supplier_Subscriptions;
-- DROP TABLE IF EXISTS Tier_Entitlements;
-- DROP TABLE IF EXISTS Supplier_Tiers;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('supplier_tiers', 'tier_entitlements', 'supplier_subscriptions', 'supplier_usage_log');
--
-- -- Check function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'get_supplier_entitlements';
--
-- -- Test function (after seeding):
-- SELECT * FROM get_supplier_entitlements(1);
