-- Migration: Add Buyer Verification Fields (LinkedIn + Deposit)
-- Date: 2026-01-04
-- Description: Adds LinkedIn verification and deposit verification fields to Buyers table
--              These are required gates before RFQ distribution

-- ============================================
-- BUYER VERIFICATION FIELDS
-- ============================================

-- Add LinkedIn verification columns to Buyers table
ALTER TABLE Buyers
ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linkedin_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_profile_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS linkedin_profile_url VARCHAR(500);

-- Add deposit verification columns to Buyers table
ALTER TABLE Buyers
ADD COLUMN IF NOT EXISTS deposit_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER;

-- ============================================
-- BUYER VERIFICATION LOG (Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS Buyer_Verification_Log (
    log_id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL REFERENCES Buyers(BuyerID) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('linkedin', 'deposit')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'verified', 'failed', 'revoked')),
    profile_id VARCHAR(255),
    profile_url VARCHAR(500),
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_buyers_linkedin_verified ON Buyers(linkedin_verified);
CREATE INDEX IF NOT EXISTS idx_buyers_deposit_verified ON Buyers(deposit_verified);
CREATE INDEX IF NOT EXISTS idx_buyers_both_verified ON Buyers(linkedin_verified, deposit_verified);
CREATE INDEX IF NOT EXISTS idx_buyer_verification_log_buyer ON Buyer_Verification_Log(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_verification_log_type ON Buyer_Verification_Log(verification_type);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN Buyers.linkedin_verified IS 'Whether the buyer has verified their LinkedIn account';
COMMENT ON COLUMN Buyers.linkedin_verified_at IS 'Timestamp when LinkedIn was verified';
COMMENT ON COLUMN Buyers.linkedin_profile_id IS 'LinkedIn member ID from OAuth';
COMMENT ON COLUMN Buyers.linkedin_profile_url IS 'LinkedIn public profile URL';
COMMENT ON COLUMN Buyers.deposit_verified IS 'Whether the buyer has made a deposit';
COMMENT ON COLUMN Buyers.deposit_verified_at IS 'Timestamp when deposit was verified';
COMMENT ON COLUMN Buyers.deposit_amount_cents IS 'Deposit amount in cents';
