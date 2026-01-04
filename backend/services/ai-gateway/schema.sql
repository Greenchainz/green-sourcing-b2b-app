-- ============================================
-- AI GATEWAY SCHEMA
-- Agent Gateway + Azure Foundry Integration
-- ============================================

-- AI Workflow Registry (Versioned Agents/Workflows)
CREATE TABLE IF NOT EXISTS AI_Workflows (
  WorkflowID BIGSERIAL PRIMARY KEY,
  Name VARCHAR(255) UNIQUE NOT NULL,
  Version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  Description TEXT,
  WorkflowType VARCHAR(100) NOT NULL CHECK (WorkflowType IN (
    'compliance', 'alternatives', 'materials', 'certifications',
    'carbon', 'rfq_assist', 'document_analysis', 'custom'
  )),
  AzureEndpoint VARCHAR(500),
  AzureDeploymentName VARCHAR(255),
  -- Caching configuration
  IsCacheable BOOLEAN DEFAULT FALSE,
  CacheTTLSeconds INTEGER DEFAULT 3600,
  -- Safety classification
  SafetyLevel VARCHAR(50) DEFAULT 'standard' CHECK (SafetyLevel IN ('safe', 'standard', 'restricted', 'admin_only')),
  -- Tier restrictions
  MinimumTier VARCHAR(50) DEFAULT 'free' CHECK (MinimumTier IN ('free', 'pro', 'enterprise', 'admin')),
  -- Rate limits per tier (calls per hour)
  FreeTierLimit INTEGER DEFAULT 10,
  ProTierLimit INTEGER DEFAULT 100,
  EnterpriseTierLimit INTEGER DEFAULT 1000,
  -- Metadata
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Gateway Call Log (Audit trail with redacted inputs)
CREATE TABLE IF NOT EXISTS AI_Gateway_Calls (
  CallID BIGSERIAL PRIMARY KEY,
  WorkflowID BIGINT REFERENCES AI_Workflows(WorkflowID),
  UserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  -- Request metadata (inputs are redacted)
  InputHash VARCHAR(64) NOT NULL, -- SHA256 of original input for deduplication
  InputSummary TEXT, -- Redacted/sanitized summary of input
  InputByteSize INTEGER,
  -- Response metadata
  OutputHash VARCHAR(64),
  OutputSummary TEXT,
  OutputByteSize INTEGER,
  -- Performance
  LatencyMs INTEGER,
  TokensUsed INTEGER,
  CacheHit BOOLEAN DEFAULT FALSE,
  -- Status
  Status VARCHAR(50) NOT NULL CHECK (Status IN ('success', 'error', 'rate_limited', 'unauthorized', 'cached')),
  ErrorCode VARCHAR(100),
  ErrorMessage TEXT,
  -- Context
  SessionID VARCHAR(255),
  IPAddress VARCHAR(45),
  UserAgent TEXT,
  -- Timestamps
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User AI Quota Tracking
CREATE TABLE IF NOT EXISTS AI_User_Quotas (
  QuotaID BIGSERIAL PRIMARY KEY,
  UserID BIGINT UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  Tier VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (Tier IN ('free', 'pro', 'enterprise', 'admin')),
  -- Current period usage
  PeriodStartsAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PeriodEndsAt TIMESTAMP NOT NULL,
  CallsUsed INTEGER DEFAULT 0,
  TokensUsed BIGINT DEFAULT 0,
  -- Limits (can be overridden per user)
  CustomCallLimit INTEGER,
  CustomTokenLimit BIGINT,
  -- Overage tracking
  OverageCallsAllowed INTEGER DEFAULT 0,
  OverageCallsUsed INTEGER DEFAULT 0,
  -- Timestamps
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Cache (For safe/cacheable workflows)
CREATE TABLE IF NOT EXISTS AI_Workflow_Cache (
  CacheID BIGSERIAL PRIMARY KEY,
  WorkflowID BIGINT REFERENCES AI_Workflows(WorkflowID) ON DELETE CASCADE,
  InputHash VARCHAR(64) NOT NULL,
  OutputData JSONB NOT NULL,
  -- Cache metadata
  HitCount INTEGER DEFAULT 0,
  LastHitAt TIMESTAMP,
  ExpiresAt TIMESTAMP NOT NULL,
  -- Size tracking
  ByteSize INTEGER,
  -- Timestamps
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cache_unique UNIQUE (WorkflowID, InputHash)
);

-- Intercom Draft Messages (AI-generated, pending approval)
CREATE TABLE IF NOT EXISTS Intercom_Drafts (
  DraftID BIGSERIAL PRIMARY KEY,
  WorkflowID BIGINT REFERENCES AI_Workflows(WorkflowID) ON DELETE SET NULL,
  CreatedByUserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  TargetUserID BIGINT REFERENCES Users(UserID) ON DELETE CASCADE,
  -- Message content
  MessageType VARCHAR(100) NOT NULL CHECK (MessageType IN (
    'single', 'sequence', 'campaign', 'onboarding', 'rfq_follow_up',
    'certification_reminder', 'upsell', 'reactivation'
  )),
  Subject VARCHAR(500),
  Body TEXT NOT NULL,
  SequenceOrder INTEGER DEFAULT 1,
  SequenceTotal INTEGER DEFAULT 1,
  -- Personalization data (for sequences)
  PersonalizationData JSONB,
  -- Approval workflow
  Status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (Status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 
    'scheduled', 'sent', 'failed', 'cancelled'
  )),
  -- Legal Guardian approval (required for Premium tier sending)
  RequiresLegalApproval BOOLEAN DEFAULT TRUE,
  LegalApprovedByUserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  LegalApprovedAt TIMESTAMP,
  LegalApprovalNotes TEXT,
  -- Scheduling
  ScheduledAt TIMESTAMP,
  SentAt TIMESTAMP,
  -- Opt-out tracking
  OptOutChecked BOOLEAN DEFAULT FALSE,
  TargetOptedOut BOOLEAN DEFAULT FALSE,
  -- Intercom integration
  IntercomMessageID VARCHAR(255),
  IntercomConversationID VARCHAR(255),
  -- Error tracking
  SendAttempts INTEGER DEFAULT 0,
  LastError TEXT,
  -- Timestamps
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Intercom Opt-Out Registry
CREATE TABLE IF NOT EXISTS Intercom_Opt_Outs (
  OptOutID BIGSERIAL PRIMARY KEY,
  UserID BIGINT UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  Email VARCHAR(255),
  OptOutReason VARCHAR(255),
  OptOutSource VARCHAR(100) CHECK (OptOutSource IN ('user_request', 'unsubscribe_link', 'admin', 'bounce', 'complaint')),
  OptOutAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Partial opt-out options
  OptOutMarketing BOOLEAN DEFAULT TRUE,
  OptOutTransactional BOOLEAN DEFAULT FALSE,
  OptOutAIMessages BOOLEAN DEFAULT TRUE
);

-- Legal Guardians (Users authorized to approve AI-generated messages)
CREATE TABLE IF NOT EXISTS AI_Legal_Guardians (
  GuardianID BIGSERIAL PRIMARY KEY,
  UserID BIGINT UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  -- Permissions
  CanApproveMarketing BOOLEAN DEFAULT TRUE,
  CanApproveCampaigns BOOLEAN DEFAULT TRUE,
  CanApproveSequences BOOLEAN DEFAULT TRUE,
  MaxDailyApprovals INTEGER DEFAULT 100,
  -- Tracking
  ApprovalsToday INTEGER DEFAULT 0,
  LastApprovalReset DATE DEFAULT CURRENT_DATE,
  -- Timestamps
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_workflows_name ON AI_Workflows(Name, Version);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_type ON AI_Workflows(WorkflowType);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_active ON AI_Workflows(IsActive);
CREATE INDEX IF NOT EXISTS idx_ai_calls_user ON AI_Gateway_Calls(UserID, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_calls_workflow ON AI_Gateway_Calls(WorkflowID, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_calls_status ON AI_Gateway_Calls(Status);
CREATE INDEX IF NOT EXISTS idx_ai_calls_date ON AI_Gateway_Calls(CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_quotas_user ON AI_User_Quotas(UserID);
CREATE INDEX IF NOT EXISTS idx_ai_quotas_period ON AI_User_Quotas(PeriodEndsAt);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON AI_Workflow_Cache(WorkflowID, InputHash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expiry ON AI_Workflow_Cache(ExpiresAt);
CREATE INDEX IF NOT EXISTS idx_intercom_drafts_status ON Intercom_Drafts(Status);
CREATE INDEX IF NOT EXISTS idx_intercom_drafts_target ON Intercom_Drafts(TargetUserID);
CREATE INDEX IF NOT EXISTS idx_intercom_drafts_pending ON Intercom_Drafts(Status) WHERE Status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_intercom_drafts_scheduled ON Intercom_Drafts(ScheduledAt) WHERE Status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_intercom_opt_outs_user ON Intercom_Opt_Outs(UserID);
CREATE INDEX IF NOT EXISTS idx_intercom_opt_outs_email ON Intercom_Opt_Outs(Email);
CREATE INDEX IF NOT EXISTS idx_legal_guardians_user ON AI_Legal_Guardians(UserID);

-- Insert default workflows
INSERT INTO AI_Workflows (Name, Version, Description, WorkflowType, IsCacheable, CacheTTLSeconds, SafetyLevel, MinimumTier, FreeTierLimit, ProTierLimit, EnterpriseTierLimit)
VALUES
  ('compliance-checker', '1.0.0', 'Check product compliance with LEED, BREEAM, WELL standards', 'compliance', TRUE, 86400, 'safe', 'free', 20, 200, 2000),
  ('alternative-finder', '1.0.0', 'Find sustainable alternatives for materials', 'alternatives', TRUE, 43200, 'safe', 'free', 15, 150, 1500),
  ('carbon-calculator', '1.0.0', 'Calculate embodied carbon for materials', 'carbon', TRUE, 86400, 'safe', 'free', 25, 250, 2500),
  ('certification-analyzer', '1.0.0', 'Analyze and validate certifications from documents', 'certifications', FALSE, 0, 'standard', 'pro', 0, 50, 500),
  ('rfq-assistant', '1.0.0', 'AI-assisted RFQ generation and optimization', 'rfq_assist', FALSE, 0, 'standard', 'pro', 0, 100, 1000),
  ('document-analyzer', '1.0.0', 'Extract data from EPDs, spec sheets, certificates', 'document_analysis', FALSE, 0, 'standard', 'pro', 0, 75, 750),
  ('supplier-outreach', '1.0.0', 'Generate personalized supplier outreach messages', 'custom', FALSE, 0, 'restricted', 'enterprise', 0, 0, 200),
  ('market-insights', '1.0.0', 'Generate market insights and trends analysis', 'custom', TRUE, 3600, 'standard', 'enterprise', 0, 0, 100)
ON CONFLICT (Name) DO NOTHING;
