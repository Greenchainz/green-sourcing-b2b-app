-- Migration: 0032_audit_logs
-- Creates the audit_logs table for immutable security and business event recording.
-- NEVER add UPDATE or DELETE permissions on this table in production.

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"            serial PRIMARY KEY,
  "actorUserId"   integer,
  "actorEmail"    varchar(320),
  "actorRole"     varchar(32),
  "action"        varchar(64) NOT NULL,
  "resourceType"  varchar(64),
  "resourceId"    varchar(128),
  "metadata"      json,
  "outcome"       varchar(16) NOT NULL DEFAULT 'success',
  "ipAddress"     varchar(64),
  "userAgent"     text,
  "createdAt"     timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx"      ON "audit_logs" ("actorUserId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx"     ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx"   ON "audit_logs" ("resourceType", "resourceId");
