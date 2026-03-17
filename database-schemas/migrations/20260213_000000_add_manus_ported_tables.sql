-- Migration: Add tables ported from Manus prototype
-- Created: 2026-02-13
-- Description: Adds CCPS scoring, material swaps, messaging, RFQ bidding,
--              supplier filters, usage tracking, decision maker personas,
--              and agent analytics tables.

-- ─── CCPS Baselines (category-level benchmarks for scoring) ──────────────────
CREATE TABLE IF NOT EXISTS ccps_baselines (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(255) NOT NULL UNIQUE,
    baseline_gwp DECIMAL(10,4),
    baseline_ec_per_1000sf DECIMAL(10,4),
    baseline_price_per_unit DECIMAL(10,4),
    baseline_lead_time_days INTEGER DEFAULT 30,
    sample_size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ccps_baselines IS 'Category-level baseline values for CCPS scoring engine';

-- ─── CCPS Scores (cached per-material scores) ───────────────────────────────
CREATE TABLE IF NOT EXISTS ccps_scores (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL,
    persona_key VARCHAR(50) DEFAULT 'default',
    carbon_score INTEGER DEFAULT 0,
    compliance_score INTEGER DEFAULT 0,
    certification_score INTEGER DEFAULT 0,
    cost_score INTEGER DEFAULT 0,
    supply_chain_score INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 0,
    ccps_total INTEGER DEFAULT 0,
    sourcing_difficulty INTEGER DEFAULT 1,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_id, persona_key)
);

CREATE INDEX IF NOT EXISTS idx_ccps_scores_material ON ccps_scores(material_id);
CREATE INDEX IF NOT EXISTS idx_ccps_scores_total ON ccps_scores(ccps_total DESC);

COMMENT ON TABLE ccps_scores IS 'Cached CCPS composite scores per material per persona';

-- ─── Material Swaps (swap recommendations) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS material_swaps (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL,
    swap_material_id BIGINT NOT NULL,
    swap_reason TEXT,
    swap_score INTEGER DEFAULT 0,
    swap_tier VARCHAR(10) DEFAULT 'good' CHECK (swap_tier IN ('good', 'better', 'best')),
    confidence DECIMAL(3,2) DEFAULT 0.50,
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR(20) DEFAULT 'algorithm' CHECK (created_by IN ('algorithm', 'agent', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_id, swap_material_id)
);

CREATE INDEX IF NOT EXISTS idx_material_swaps_material ON material_swaps(material_id);
CREATE INDEX IF NOT EXISTS idx_material_swaps_score ON material_swaps(swap_score DESC);

COMMENT ON TABLE material_swaps IS 'Material swap recommendations with Good/Better/Best tiers';

-- ─── Decision Maker Personas (CCPS weight profiles) ─────────────────────────
CREATE TABLE IF NOT EXISTS decision_maker_personas (
    id BIGSERIAL PRIMARY KEY,
    persona_key VARCHAR(50) NOT NULL UNIQUE,
    persona_name VARCHAR(100) NOT NULL,
    description TEXT,
    carbon_weight DECIMAL(4,2) DEFAULT 0.25,
    compliance_weight DECIMAL(4,2) DEFAULT 0.20,
    certification_weight DECIMAL(4,2) DEFAULT 0.15,
    cost_weight DECIMAL(4,2) DEFAULT 0.15,
    supply_chain_weight DECIMAL(4,2) DEFAULT 0.15,
    health_weight DECIMAL(4,2) DEFAULT 0.10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE decision_maker_personas IS 'Persona-specific CCPS weight profiles for architects, GC PMs, etc.';

-- Seed default personas
INSERT INTO decision_maker_personas (persona_key, persona_name, description, carbon_weight, compliance_weight, certification_weight, cost_weight, supply_chain_weight, health_weight) VALUES
    ('architect', 'Architect', 'Prioritizes compliance and building codes', 0.20, 0.35, 0.15, 0.10, 0.10, 0.10),
    ('leed_ap', 'LEED AP', 'Prioritizes carbon reduction and certifications', 0.30, 0.15, 0.25, 0.10, 0.10, 0.10),
    ('gc_pm', 'GC Project Manager', 'Prioritizes cost and supply chain reliability', 0.10, 0.15, 0.10, 0.35, 0.20, 0.10),
    ('spec_writer', 'Specification Writer', 'Prioritizes compliance and certification documentation', 0.15, 0.30, 0.20, 0.10, 0.15, 0.10),
    ('owner', 'Building Owner', 'Balanced approach with cost emphasis', 0.15, 0.15, 0.15, 0.25, 0.15, 0.15),
    ('facility_manager', 'Facility Manager', 'Prioritizes cost and health/maintenance', 0.10, 0.20, 0.10, 0.25, 0.20, 0.15)
ON CONFLICT (persona_key) DO NOTHING;

-- ─── Supplier Filters (matching preferences) ────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_filters (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL UNIQUE,
    accepted_locations TEXT,
    material_type_preferences JSONB DEFAULT '[]'::jsonb,
    min_order_value DECIMAL(10,2),
    max_distance_miles INTEGER,
    preferred_certifications JSONB DEFAULT '[]'::jsonb,
    auto_bid_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE supplier_filters IS 'Supplier matching preferences and auto-bid settings';

-- ─── Conversations (buyer-supplier messaging threads) ────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT,
    buyer_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rfq_id, buyer_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_supplier ON conversations(supplier_id);

-- ─── Messages (within conversations) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ─── Notifications (in-app) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    related_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ─── RFQ Items (line items within an RFQ) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfq_items (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT NOT NULL,
    material_id BIGINT,
    material_name VARCHAR(500),
    quantity INTEGER,
    unit VARCHAR(50),
    specifications TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq ON rfq_items(rfq_id);

-- ─── RFQ Bids (supplier bids on RFQs) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfq_bids (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    total_price DECIMAL(12,2),
    lead_time_days INTEGER,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    match_score INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_bids_rfq ON rfq_bids(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_bids_supplier ON rfq_bids(supplier_id);

-- ─── Buyer Subscriptions (Microsoft Marketplace integration) ─────────────────
CREATE TABLE IF NOT EXISTS buyer_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'premium')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'canceled', 'suspended')),
    ms_subscription_id VARCHAR(255),
    ms_plan_id VARCHAR(100),
    is_beta BOOLEAN DEFAULT FALSE,
    max_seats INTEGER DEFAULT 1,
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE buyer_subscriptions IS 'Buyer subscription tiers with Microsoft AppSource integration';

-- ─── Usage Tracking (metered billing) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    supplier_id BIGINT,
    dimension VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dimension, period_start),
    UNIQUE(supplier_id, dimension, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_supplier ON usage_tracking(supplier_id);

COMMENT ON TABLE usage_tracking IS 'Per-user/supplier metered usage for subscription enforcement and Microsoft billing';

-- ─── Agent Analytics (ChainBot AI usage tracking) ────────────────────────────
CREATE TABLE IF NOT EXISTS agent_analytics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    session_id VARCHAR(100),
    query_text TEXT,
    response_type VARCHAR(50),
    materials_returned INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    was_helpful BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_analytics_user ON agent_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_session ON agent_analytics(session_id);

COMMENT ON TABLE agent_analytics IS 'ChainBot AI query analytics and feedback tracking';
