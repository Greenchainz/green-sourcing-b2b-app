-- Migration: Add Stripe RFQ Deposits System
-- Created: 2026-01-04 13:00:00
-- Author: Database Schema Agent
-- 
-- Description:
-- Creates the rfq_deposits table for tracking Stripe PaymentIntent deposits
-- associated with RFQ submissions. Adds deposit verification columns to RFQs table.
-- This enables the $5 deposit requirement before RFQ distribution to suppliers.
--
-- Impact:
-- - Performance: Minimal - new table with proper indexes
-- - Storage: ~100 bytes per deposit record
-- - Downtime: None - additive changes only
-- - Dependencies: Requires RFQs table from core schema

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create RFQ Deposits table for Stripe payment tracking
CREATE TABLE IF NOT EXISTS rfq_deposits (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT REFERENCES RFQs(RFQID) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL DEFAULT 500 CHECK (amount_cents > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- PaymentIntent created, awaiting payment
        'processing',        -- Payment is being processed
        'succeeded',         -- Payment completed successfully
        'failed',            -- Payment failed
        'canceled',          -- Payment was canceled
        'refunded',          -- Full refund issued
        'partially_refunded' -- Partial refund issued
    )),
    refund_reason TEXT,
    stripe_refund_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    succeeded_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

-- Step 2: Add deposit verification columns to RFQs table
ALTER TABLE RFQs
ADD COLUMN IF NOT EXISTS deposit_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_id BIGINT REFERENCES rfq_deposits(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMPTZ;

-- Step 3: Create indexes for efficient queries
-- Primary lookup by Stripe PaymentIntent ID (webhook handling)
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_stripe_payment_intent 
    ON rfq_deposits(stripe_payment_intent_id);

-- User's deposit history
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_user_id 
    ON rfq_deposits(user_id, created_at DESC);

-- Status-based queries (pending deposits, failed payments, etc.)
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_status 
    ON rfq_deposits(status);

-- RFQ association lookup
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_rfq_id 
    ON rfq_deposits(rfq_id) WHERE rfq_id IS NOT NULL;

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_user_status 
    ON rfq_deposits(user_id, status, created_at DESC);

-- Pending deposits older than 24h (cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_pending_created 
    ON rfq_deposits(created_at) WHERE status = 'pending';

-- Index on RFQs deposit verification status
CREATE INDEX IF NOT EXISTS idx_rfqs_deposit_verified 
    ON RFQs(deposit_verified) WHERE deposit_verified = TRUE;

-- Step 4: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rfq_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_deposits_updated_at ON rfq_deposits;
CREATE TRIGGER trg_rfq_deposits_updated_at
    BEFORE UPDATE ON rfq_deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_rfq_deposits_updated_at();

-- Step 5: Create trigger to auto-set deposit_verified on RFQs when deposit succeeds
CREATE OR REPLACE FUNCTION sync_rfq_deposit_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- When a deposit transitions to 'succeeded' and has an rfq_id, update the RFQ
    IF NEW.status = 'succeeded' AND NEW.rfq_id IS NOT NULL THEN
        UPDATE RFQs
        SET deposit_verified = TRUE,
            deposit_id = NEW.id,
            deposit_verified_at = CURRENT_TIMESTAMP,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RFQID = NEW.rfq_id
          AND (deposit_verified = FALSE OR deposit_verified IS NULL);
    END IF;
    
    -- If deposit is refunded, mark RFQ as unverified
    IF NEW.status IN ('refunded', 'canceled') AND NEW.rfq_id IS NOT NULL THEN
        UPDATE RFQs
        SET deposit_verified = FALSE,
            deposit_verified_at = NULL,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RFQID = NEW.rfq_id
          AND deposit_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_rfq_deposit_verification ON rfq_deposits;
CREATE TRIGGER trg_sync_rfq_deposit_verification
    AFTER INSERT OR UPDATE OF status ON rfq_deposits
    FOR EACH ROW
    EXECUTE FUNCTION sync_rfq_deposit_verification();

-- Step 6: Add helpful comments
COMMENT ON TABLE rfq_deposits IS 'Tracks Stripe PaymentIntent deposits for RFQ submissions ($5 deposit requirement)';
COMMENT ON COLUMN rfq_deposits.stripe_payment_intent_id IS 'Stripe PaymentIntent ID (pi_xxx format)';
COMMENT ON COLUMN rfq_deposits.amount_cents IS 'Deposit amount in cents (default 500 = $5.00)';
COMMENT ON COLUMN rfq_deposits.status IS 'Payment status synced from Stripe webhooks';
COMMENT ON COLUMN rfq_deposits.metadata IS 'Additional Stripe metadata and internal tracking data';
COMMENT ON COLUMN RFQs.deposit_verified IS 'True when a successful $5 deposit has been made for this RFQ';
COMMENT ON COLUMN RFQs.deposit_id IS 'Reference to the successful deposit record';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- -- Rollback Step 6: Remove comments (optional, comments don't affect functionality)
--
-- -- Rollback Step 5: Drop deposit verification sync trigger
-- DROP TRIGGER IF EXISTS trg_sync_rfq_deposit_verification ON rfq_deposits;
-- DROP FUNCTION IF EXISTS sync_rfq_deposit_verification();
--
-- -- Rollback Step 4: Drop updated_at trigger
-- DROP TRIGGER IF EXISTS trg_rfq_deposits_updated_at ON rfq_deposits;
-- DROP FUNCTION IF EXISTS update_rfq_deposits_updated_at();
--
-- -- Rollback Step 3: Drop indexes
-- DROP INDEX IF EXISTS idx_rfqs_deposit_verified;
-- DROP INDEX IF EXISTS idx_rfq_deposits_pending_created;
-- DROP INDEX IF EXISTS idx_rfq_deposits_user_status;
-- DROP INDEX IF EXISTS idx_rfq_deposits_rfq_id;
-- DROP INDEX IF EXISTS idx_rfq_deposits_status;
-- DROP INDEX IF EXISTS idx_rfq_deposits_user_id;
-- DROP INDEX IF EXISTS idx_rfq_deposits_stripe_payment_intent;
--
-- -- Rollback Step 2: Drop RFQs columns
-- ALTER TABLE RFQs DROP COLUMN IF EXISTS deposit_verified_at;
-- ALTER TABLE RFQs DROP COLUMN IF EXISTS deposit_id;
-- ALTER TABLE RFQs DROP COLUMN IF EXISTS deposit_verified;
--
-- -- Rollback Step 1: Drop rfq_deposits table
-- DROP TABLE IF EXISTS rfq_deposits;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check rfq_deposits table was created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'rfq_deposits';
--
-- -- Check columns on rfq_deposits:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'rfq_deposits'
-- ORDER BY ordinal_position;
--
-- -- Check RFQs columns were added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'rfqs' AND column_name IN ('deposit_verified', 'deposit_id', 'deposit_verified_at');
--
-- -- Check indexes exist:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'rfq_deposits';
--
-- -- Check triggers exist:
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'rfq_deposits';

-- ============================================
-- NOTES
-- ============================================
-- - The $5 deposit amount is set as default but can be overridden per deposit
-- - Stripe webhook handler should update status via: UPDATE rfq_deposits SET status = $1 WHERE stripe_payment_intent_id = $2
-- - The sync trigger automatically marks RFQs as verified when deposit succeeds
-- - Refunds should update both status and refunded_at columns
-- - Consider adding a cleanup job for stale 'pending' deposits after 24 hours
