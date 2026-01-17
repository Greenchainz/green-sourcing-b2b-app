-- Migration: Add Stripe RFQ Deposits System
-- Created: 2026-01-04 13:00:00
-- Author: Database Schema Agent
--
-- Description:
-- Creates the RFQ_Deposits table for tracking Stripe PaymentIntent deposits
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

-- Step 1: Create RFQ_Deposits table for Stripe payment tracking
CREATE TABLE IF NOT EXISTS RFQ_Deposits (
    DepositID BIGSERIAL PRIMARY KEY,
    RFQID BIGINT REFERENCES RFQs(RFQID) ON DELETE SET NULL,
    UserID BIGINT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    StripePaymentIntentID VARCHAR(255) NOT NULL UNIQUE,
    AmountCents INTEGER NOT NULL DEFAULT 500 CHECK (AmountCents > 0),
    Currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    Status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (Status IN (
        'pending',           -- PaymentIntent created, awaiting payment
        'processing',        -- Payment is being processed
        'succeeded',         -- Payment completed successfully
        'failed',            -- Payment failed
        'canceled',          -- Payment was canceled
        'refunded',          -- Full refund issued
        'partially_refunded' -- Partial refund issued
    )),
    RefundReason TEXT,
    StripeRefundID VARCHAR(255),
    Metadata JSONB DEFAULT '{}'::jsonb,
    IPAddress VARCHAR(45),
    UserAgent TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UpdatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    SucceededAt TIMESTAMPTZ,
    RefundedAt TIMESTAMPTZ
);

-- Step 2: Add deposit verification columns to RFQs table
ALTER TABLE RFQs
ADD COLUMN IF NOT EXISTS DepositVerified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS DepositID BIGINT REFERENCES RFQ_Deposits(DepositID) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS DepositVerifiedAt TIMESTAMPTZ;

-- Circular Reference Update (safe to run if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfq_deposits_rfq') THEN
        ALTER TABLE RFQ_Deposits ADD CONSTRAINT fk_rfq_deposits_rfq FOREIGN KEY (RFQID) REFERENCES RFQs(RFQID) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Create indexes for efficient queries
-- Primary lookup by Stripe PaymentIntent ID (webhook handling)
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_stripe_pi
    ON RFQ_Deposits(StripePaymentIntentID);

-- User's deposit history
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_user
    ON RFQ_Deposits(UserID, CreatedAt DESC);

-- Status-based queries (pending deposits, failed payments, etc.)
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_status
    ON RFQ_Deposits(Status);

-- RFQ association lookup
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_rfq
    ON RFQ_Deposits(RFQID) WHERE RFQID IS NOT NULL;

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_user_status
    ON RFQ_Deposits(UserID, Status, CreatedAt DESC);

-- Pending deposits older than 24h (cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_rfq_deposits_pending_created
    ON RFQ_Deposits(CreatedAt) WHERE Status = 'pending';

-- Index on RFQs deposit verification status
CREATE INDEX IF NOT EXISTS idx_rfqs_deposit_verified
    ON RFQs(DepositVerified) WHERE DepositVerified = TRUE;

-- Step 4: Create trigger to update UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_rfq_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_deposits_updated_at ON RFQ_Deposits;
CREATE TRIGGER trg_rfq_deposits_updated_at
    BEFORE UPDATE ON RFQ_Deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_rfq_deposits_updated_at();

-- Step 5: Create trigger to auto-set DepositVerified on RFQs when deposit succeeds
CREATE OR REPLACE FUNCTION sync_rfq_deposit_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- When a deposit transitions to 'succeeded' and has an RFQID, update the RFQ
    IF NEW.Status = 'succeeded' AND NEW.RFQID IS NOT NULL THEN
        UPDATE RFQs
        SET DepositVerified = TRUE,
            DepositID = NEW.DepositID,
            DepositVerifiedAt = CURRENT_TIMESTAMP,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RFQID = NEW.RFQID
          AND (DepositVerified = FALSE OR DepositVerified IS NULL);
    END IF;

    -- If deposit is refunded, mark RFQ as unverified
    IF NEW.Status IN ('refunded', 'canceled') AND NEW.RFQID IS NOT NULL THEN
        UPDATE RFQs
        SET DepositVerified = FALSE,
            DepositVerifiedAt = NULL,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RFQID = NEW.RFQID
          AND DepositID = NEW.DepositID;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_rfq_deposit_verification ON RFQ_Deposits;
CREATE TRIGGER trg_sync_rfq_deposit_verification
    AFTER INSERT OR UPDATE OF Status ON RFQ_Deposits
    FOR EACH ROW
    EXECUTE FUNCTION sync_rfq_deposit_verification();

-- Step 6: Add helpful comments
COMMENT ON TABLE RFQ_Deposits IS 'Tracks Stripe PaymentIntent deposits for RFQ submissions ($5 deposit requirement)';
COMMENT ON COLUMN RFQ_Deposits.StripePaymentIntentID IS 'Stripe PaymentIntent ID (pi_xxx format)';
COMMENT ON COLUMN RFQ_Deposits.AmountCents IS 'Deposit amount in cents (default 500 = $5.00)';
COMMENT ON COLUMN RFQ_Deposits.Status IS 'Payment status synced from Stripe webhooks';
COMMENT ON COLUMN RFQ_Deposits.Metadata IS 'Additional Stripe metadata and internal tracking data';
COMMENT ON COLUMN RFQs.DepositVerified IS 'True when a successful $5 deposit has been made for this RFQ';
COMMENT ON COLUMN RFQs.DepositID IS 'Reference to the successful deposit record';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- -- Rollback Step 6: Remove comments (optional, comments don't affect functionality)
--
-- -- Rollback Step 5: Drop deposit verification sync trigger
-- DROP TRIGGER IF EXISTS trg_sync_rfq_deposit_verification ON RFQ_Deposits;
-- DROP FUNCTION IF EXISTS sync_rfq_deposit_verification();
--
-- -- Rollback Step 4: Drop UpdatedAt trigger
-- DROP TRIGGER IF EXISTS trg_rfq_deposits_updated_at ON RFQ_Deposits;
-- DROP FUNCTION IF EXISTS update_rfq_deposits_updated_at();
--
-- -- Rollback Step 3: Drop indexes
-- DROP INDEX IF EXISTS idx_rfqs_deposit_verified;
-- DROP INDEX IF EXISTS idx_rfq_deposits_pending_created;
-- DROP INDEX IF EXISTS idx_rfq_deposits_user_status;
-- DROP INDEX IF EXISTS idx_rfq_deposits_rfq;
-- DROP INDEX IF EXISTS idx_rfq_deposits_status;
-- DROP INDEX IF EXISTS idx_rfq_deposits_user;
-- DROP INDEX IF EXISTS idx_rfq_deposits_stripe_pi;
--
-- -- Rollback Step 2: Drop RFQs columns
-- ALTER TABLE RFQs DROP COLUMN IF EXISTS DepositVerifiedAt;
-- ALTER TABLE RFQs DROP COLUMN IF EXISTS DepositID;
-- ALTER TABLE RFQs DROP COLUMN IF EXISTS DepositVerified;
--
-- -- Rollback Step 1: Drop RFQ_Deposits table
-- DROP TABLE IF EXISTS RFQ_Deposits;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check RFQ_Deposits table was created:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'rfq_deposits'; -- Note: Postgres stores table names in lowercase unless quoted
--
-- -- Check columns on RFQ_Deposits:
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
-- - Stripe webhook handler should update status via: UPDATE RFQ_Deposits SET Status = $1 WHERE StripePaymentIntentID = $2
-- - The sync trigger automatically marks RFQs as verified when deposit succeeds
-- - Refunds should update both Status and RefundedAt columns
-- - Consider adding a cleanup job for stale 'pending' deposits after 24 hours
