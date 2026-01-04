-- Migration: Add Stripe RFQ Deposits
-- Created: 2026-01-04 13:00:00
-- Author: GreenChainz DB-SCHEMA Agent
-- 
-- Description:
-- Creates the RFQ deposit system for Stripe payment verification.
-- Buyers must pay a refundable deposit before creating RFQs to
-- reduce tire-kickers and improve supplier response rates.
--
-- Impact:
-- - Performance: Minimal - indexed lookup table
-- - Storage: ~200 bytes per deposit
-- - Downtime: None - additive changes only

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create RFQ Deposits table
CREATE TABLE IF NOT EXISTS rfq_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    
    -- Stripe Payment Intent
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    
    -- Amount
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed')),
    
    -- Refund info
    refund_amount_cents INTEGER DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE rfq_deposits IS 'Tracks RFQ deposit payments via Stripe for buyer verification';

-- Step 2: Add deposit verification columns to RFQs table
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS deposit_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS deposit_id UUID REFERENCES rfq_deposits(id);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS deposit_payment_intent_id VARCHAR(255);

COMMENT ON COLUMN rfqs.deposit_verified IS 'TRUE if buyer has paid and verified the RFQ deposit';

-- Step 3: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_user ON rfq_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_status ON rfq_deposits(status);
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_stripe_pi ON rfq_deposits(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_rfq ON rfq_deposits(rfq_id) WHERE rfq_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_created ON rfq_deposits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfqs_deposit_verified ON rfqs(deposit_verified) WHERE deposit_verified = TRUE;

-- Step 4: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rfq_deposits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_deposits_updated ON rfq_deposits;
CREATE TRIGGER trg_rfq_deposits_updated
    BEFORE UPDATE ON rfq_deposits
    FOR EACH ROW EXECUTE FUNCTION update_rfq_deposits_timestamp();

-- Step 5: Create helper function to check deposit status
CREATE OR REPLACE FUNCTION check_rfq_deposit_status(p_payment_intent_id VARCHAR(255))
RETURNS TABLE (
    deposit_id UUID,
    rfq_id UUID,
    status VARCHAR(50),
    amount_cents INTEGER,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS deposit_id,
        d.rfq_id,
        d.status,
        d.amount_cents,
        (d.status = 'succeeded') AS is_verified
    FROM rfq_deposits d
    WHERE d.stripe_payment_intent_id = p_payment_intent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- DROP FUNCTION IF EXISTS check_rfq_deposit_status(VARCHAR);
-- DROP TRIGGER IF EXISTS trg_rfq_deposits_updated ON rfq_deposits;
-- DROP FUNCTION IF EXISTS update_rfq_deposits_timestamp();
-- DROP INDEX IF EXISTS idx_rfqs_deposit_verified;
-- DROP INDEX IF EXISTS idx_rfq_deposits_created;
-- DROP INDEX IF EXISTS idx_rfq_deposits_rfq;
-- DROP INDEX IF EXISTS idx_rfq_deposits_stripe_pi;
-- DROP INDEX IF EXISTS idx_rfq_deposits_status;
-- DROP INDEX IF EXISTS idx_rfq_deposits_user;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS deposit_payment_intent_id;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS deposit_id;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS deposit_verified;
-- DROP TABLE IF EXISTS rfq_deposits;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run after applying:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'rfq_deposits';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'rfqs' AND column_name LIKE 'deposit%';
