-- Migration: 20260803_revoked_jtis_table
-- Stores revoked JWT IDs (jti) in a shared PostgreSQL table so that logout
-- revocations are enforced across all backend replicas. A replica that did not
-- handle the logout request will still correctly reject the stale token.
-- Rows are pruned by periodic cleanup once expiresAt is in the past.

CREATE TABLE IF NOT EXISTS revoked_jtis (
  jti        TEXT        PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_jtis_expires_at ON revoked_jtis(expires_at);
