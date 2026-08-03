-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0031: Material Credit Score v2 — tables, columns, views, seed.
--
-- Prerequisite: 0030_mcs_enums.sql (enum types must be COMMITTED first).
--
-- Implements:
--   • GreenChainz Single-Score System (GCS) — Material Credit Score v2.0
--   • Composite Compliance-Performance Score (CCPS) per persona
--   • Supplier Reliability Score (SRS) with response-time tracking
--   • 4-tier paywall pricing seed (FREE / BASIC / STANDARD / PREMIUM)
--   • Lead-credit ledger (architect contact unlocks)
--   • Architect PDF spec ingestion (Azure Document Intelligence)
--   • Company of the Week showcase
--   • Dun & Bradstreet verification
--
-- All ops use IF NOT EXISTS — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Suppliers — denormalized tier + scoring + verification ───────────────

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tier              supplier_tier   NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_updated_at   timestamp,

  -- Lead credits
  ADD COLUMN IF NOT EXISTS lead_credits                  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_lead_credit_allowance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_lead_credit_reset_at     timestamp,

  -- Dun & Bradstreet
  ADD COLUMN IF NOT EXISTS duns_number               varchar(20),
  ADD COLUMN IF NOT EXISTS duns_score                integer,           -- 0..100
  ADD COLUMN IF NOT EXISTS duns_verified_at          timestamp,

  -- Identity verification
  ADD COLUMN IF NOT EXISTS linkedin_url              varchar(500),
  ADD COLUMN IF NOT EXISTS linkedin_verified         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_license_verified boolean NOT NULL DEFAULT false,

  -- SRS inputs (rolling stats; refreshed by background job)
  ADD COLUMN IF NOT EXISTS avg_response_time_hours   decimal(10,2),
  ADD COLUMN IF NOT EXISTS rfq_completion_rate       decimal(5,4),     -- 0..1
  ADD COLUMN IF NOT EXISTS avg_rating                decimal(3,2),     -- 0..5
  ADD COLUMN IF NOT EXISTS rating_count              integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_completeness_pct     decimal(5,4),     -- 0..1

  -- SRS cache
  ADD COLUMN IF NOT EXISTS srs_score                 integer,           -- 0..100
  ADD COLUMN IF NOT EXISTS srs_calculated_at         timestamp,

  -- Speed badges
  ADD COLUMN IF NOT EXISTS top_responder_badge       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lightning_fast_badge      boolean NOT NULL DEFAULT false,

  -- Marketing / showcase
  ADD COLUMN IF NOT EXISTS territory_exclusive_metro varchar(100),
  ADD COLUMN IF NOT EXISTS featured_company_of_week_at timestamp,

  -- Display flags
  ADD COLUMN IF NOT EXISTS hidden_from_search        boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_suppliers_tier               ON suppliers(tier);
CREATE INDEX IF NOT EXISTS idx_suppliers_srs_score          ON suppliers(srs_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_suppliers_state              ON suppliers(state);
CREATE INDEX IF NOT EXISTS idx_suppliers_top_responder      ON suppliers(top_responder_badge) WHERE top_responder_badge = true;

-- ─── 2. epd_materials — full GCS data model from architect spec ──────────────

ALTER TABLE epd_materials
  -- EPD verification
  ADD COLUMN IF NOT EXISTS epd_expiry              date,
  ADD COLUMN IF NOT EXISTS epd_program_operator    varchar(150),

  -- Functional spec
  ADD COLUMN IF NOT EXISTS interior_exterior       varchar(20),         -- INTERIOR / EXTERIOR / CORE
  ADD COLUMN IF NOT EXISTS r_value                 decimal(8,3),
  ADD COLUMN IF NOT EXISTS fire_rating             varchar(50),
  ADD COLUMN IF NOT EXISTS astm_standards          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS msf_factor              decimal(10,4),

  -- Compliance flags (Performance Score)
  ADD COLUMN IF NOT EXISTS title24_compliant       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iecc_compliant          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fire_rating_documented  boolean NOT NULL DEFAULT false,

  -- Health flags (Health subscore)
  ADD COLUMN IF NOT EXISTS voc_compliant           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_on_red_list         boolean NOT NULL DEFAULT false,

  -- Certifications (Sustainability subscore)
  ADD COLUMN IF NOT EXISTS hpd_available           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS c2c_certified           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fsc_certified           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS greenguard_gold         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declare_label           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recycled_content_pct    decimal(5,4),         -- 0..1

  -- Region / supply chain (Supply + Performance)
  ADD COLUMN IF NOT EXISTS regional_availability   jsonb DEFAULT '[]'::jsonb,  -- ["VA","NC",...]
  ADD COLUMN IF NOT EXISTS regional_within_500mi   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_time_days          integer,
  ADD COLUMN IF NOT EXISTS price_per_unit          decimal(12,4),
  ADD COLUMN IF NOT EXISTS price_unit              varchar(50),
  ADD COLUMN IF NOT EXISTS take_back_program       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_order_quantity      decimal(14,2),
  ADD COLUMN IF NOT EXISTS leed_credits            jsonb DEFAULT '[]'::jsonb;  -- ["MR-c2.1","EQ-c4.2"]

CREATE INDEX IF NOT EXISTS idx_epd_materials_assembly_option
  ON epd_materials(assembly_type, core_option);
CREATE INDEX IF NOT EXISTS idx_epd_materials_lead_time
  ON epd_materials(lead_time_days);

-- ─── 3. material_credit_scores (cached GCS per material × persona) ───────────

CREATE TABLE IF NOT EXISTS material_credit_scores (
  id                       serial PRIMARY KEY,
  epd_material_id          integer NOT NULL,
  persona                  architect_persona NOT NULL DEFAULT 'aor',

  -- Headline (rounded whole numbers per spec §9.3)
  gcs                      integer NOT NULL,   -- 0..100  (60% sustainability + 40% performance)
  sustainability_score     integer NOT NULL,   -- 0..100
  performance_score        integer NOT NULL,   -- 0..100

  -- Sustainability breakdown
  carbon_score             integer NOT NULL,
  cert_score               integer NOT NULL,
  recycled_score           integer NOT NULL,
  regional_score           integer NOT NULL,

  -- Performance breakdown
  compliance_score         integer NOT NULL,
  cost_score               integer NOT NULL,
  availability_score       integer NOT NULL,
  health_score             integer NOT NULL,

  -- Top-5 metrics surfaced to architects
  carbon_savings_pct       decimal(6,2),       -- vs assembly baseline
  cost_delta_pct           decimal(6,2),       -- vs category avg
  lead_time_weeks          decimal(5,1),
  compliance_status        jsonb,              -- {"title24":true,"iecc":true,...}

  baseline_gwp             decimal(14,4),
  category_avg_price       decimal(12,4),

  calculated_at            timestamp NOT NULL DEFAULT now(),
  algorithm_version        varchar(20) NOT NULL DEFAULT '2.0',

  CONSTRAINT material_credit_scores_unique UNIQUE (epd_material_id, persona, algorithm_version)
);

CREATE INDEX IF NOT EXISTS idx_mcs_epd       ON material_credit_scores(epd_material_id);
CREATE INDEX IF NOT EXISTS idx_mcs_gcs       ON material_credit_scores(gcs DESC);
CREATE INDEX IF NOT EXISTS idx_mcs_persona   ON material_credit_scores(persona);

-- ─── 4. supplier_reliability_score history (audit + DoorDash leaderboard) ────

CREATE TABLE IF NOT EXISTS supplier_reliability_history (
  id                  serial PRIMARY KEY,
  supplier_id         integer NOT NULL,
  srs                 integer NOT NULL,
  response_score      integer NOT NULL,
  completion_score    integer NOT NULL,
  verification_score  integer NOT NULL,
  review_score        integer NOT NULL,
  data_score          integer NOT NULL,
  speed_bonus         integer NOT NULL DEFAULT 0,   -- ±10 per spec §8
  duns_bonus          integer NOT NULL DEFAULT 0,   -- ±40 per spec §10
  inputs              jsonb,                        -- snapshot for audit
  calculated_at       timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srs_hist_supplier ON supplier_reliability_history(supplier_id, calculated_at DESC);

-- ─── 5. rfq_response_events (input for SRS response-time calc) ───────────────

CREATE TABLE IF NOT EXISTS rfq_response_events (
  id                    serial PRIMARY KEY,
  rfq_id                integer NOT NULL,
  supplier_id           integer NOT NULL,
  event_type            rfq_event_type NOT NULL,
  response_time_hours   decimal(10,2),               -- null for non-response events
  metadata              jsonb,
  created_at            timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_events_supplier ON rfq_response_events(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_events_rfq      ON rfq_response_events(rfq_id);

-- ─── 6. lead_credit_ledger (every grant/spend, with running balance) ─────────

CREATE TABLE IF NOT EXISTS lead_credit_ledger (
  id                serial PRIMARY KEY,
  supplier_id       integer NOT NULL,
  delta             integer NOT NULL,               -- + grant, − spend
  reason            lead_credit_reason NOT NULL,
  related_rfq_id    integer,
  related_user_id   integer,                        -- when used to unlock architect contact
  balance_after     integer NOT NULL,
  metadata          jsonb,
  created_at        timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lcl_supplier ON lead_credit_ledger(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lcl_reason   ON lead_credit_ledger(reason);

-- ─── 7. featured_suppliers (Company of the Week) ─────────────────────────────

CREATE TABLE IF NOT EXISTS featured_suppliers (
  id                  serial PRIMARY KEY,
  supplier_id         integer NOT NULL,
  week_start          date NOT NULL,
  week_end            date NOT NULL,
  headline            varchar(255),
  blurb               text,
  hero_image_url      text,
  featured_metrics    jsonb,                          -- {"gcs":92,"srs":88,"projects":17,...}
  linkedin_post_url   text,
  email_blast_sent_at timestamp,
  views               integer NOT NULL DEFAULT 0,
  rfqs_generated      integer NOT NULL DEFAULT 0,
  created_at          timestamp NOT NULL DEFAULT now(),

  CONSTRAINT featured_suppliers_week_unique UNIQUE (week_start)
);

CREATE INDEX IF NOT EXISTS idx_featured_supplier ON featured_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_featured_week     ON featured_suppliers(week_start DESC);

-- ─── 8. architect_uploaded_specs (PDF/Excel ingestion via Azure Doc Intel) ───

CREATE TABLE IF NOT EXISTS architect_uploaded_specs (
  id                serial PRIMARY KEY,
  architect_id      integer NOT NULL,
  original_filename varchar(500) NOT NULL,
  blob_url          text NOT NULL,
  mime_type         varchar(100),
  file_size_bytes   integer,
  parse_status      spec_parse_status NOT NULL DEFAULT 'pending',
  parse_started_at  timestamp,
  parse_completed_at timestamp,
  total_pages       integer,
  total_assemblies  integer NOT NULL DEFAULT 0,
  raw_extraction    jsonb,                            -- full Azure DI response
  error_message     text,
  project_name      varchar(255),
  project_location  varchar(255),
  estimated_value   decimal(14,2),
  created_at        timestamp NOT NULL DEFAULT now(),
  updated_at        timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_specs_architect ON architect_uploaded_specs(architect_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_specs_status    ON architect_uploaded_specs(parse_status);

-- ─── 9. architect_spec_assemblies (parsed rows out of the architect's PDF) ──

CREATE TABLE IF NOT EXISTS architect_spec_assemblies (
  id                       serial PRIMARY KEY,
  spec_id                  integer NOT NULL,
  assembly_code            varchar(20),                -- "EWS-1A"
  assembly_type            varchar(120),               -- "Unitized Curtain Wall"
  structural_option        integer,                    -- 1, 2, or 3
  declared_unit            varchar(100),
  gwp_value                decimal(14,4),
  gwp_unit                 varchar(50),
  gwp_per_1000sf           decimal(14,4),              -- normalized
  manufacturer_hint        varchar(255),
  product_hint             varchar(255),
  page_number              integer,
  line_number              integer,
  raw_row                  jsonb,                      -- original row dict
  matched_epd_material_id  integer,                    -- nullable; populated by matcher
  match_confidence         decimal(4,3),               -- 0..1
  created_at               timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spec_asm_spec     ON architect_spec_assemblies(spec_id);
CREATE INDEX IF NOT EXISTS idx_spec_asm_code     ON architect_spec_assemblies(assembly_code);
CREATE INDEX IF NOT EXISTS idx_spec_asm_match    ON architect_spec_assemblies(matched_epd_material_id);

-- ─── 10. generated_rfqs (RFQs auto-built from a parsed spec) ─────────────────

CREATE TABLE IF NOT EXISTS generated_rfqs (
  id                serial PRIMARY KEY,
  spec_id           integer NOT NULL,
  rfq_id            integer NOT NULL,                -- FK to rfqs.id
  generated_format  varchar(20) NOT NULL,            -- 'pdf' | 'excel' | 'revit' | 'intercom'
  output_blob_url   text,
  alternative_count integer NOT NULL DEFAULT 0,
  total_carbon_savings_pct decimal(6,2),
  created_at        timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_rfq_spec ON generated_rfqs(spec_id);
CREATE INDEX IF NOT EXISTS idx_generated_rfq_rfq  ON generated_rfqs(rfq_id);

-- ─── 11. Pricing seed (idempotent reference data) ────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_tier_pricing (
  tier                       supplier_tier PRIMARY KEY,
  monthly_price_usd          integer NOT NULL,
  rfq_visibility_delay_hours integer NOT NULL,        -- 0=instant, 168=after 7 days
  monthly_lead_credits       integer NOT NULL,
  features                   jsonb NOT NULL,
  ms_plan_id                 varchar(255)             -- Microsoft Marketplace plan ID
);

INSERT INTO supplier_tier_pricing (tier, monthly_price_usd, rfq_visibility_delay_hours, monthly_lead_credits, features) VALUES
  ('free',     0,   168, 3,
   '{"rfq_access":"7-day delay","messaging":"inbound only","video":false,"placement":"baseline","badge":null}'::jsonb),
  ('basic',    199, 48,  10,
   '{"rfq_access":"48-hour delay","messaging":"reply","video":false,"placement":"+5%","badge":"Verified"}'::jsonb),
  ('standard', 499, 0,   30,
   '{"rfq_access":"instant","messaging":"reply + outbound","video":"30 min/mo","placement":"+10%","badge":"Verified Pro"}'::jsonb),
  ('premium',  999, 0,   100,
   '{"rfq_access":"instant + intercom","messaging":"unlimited","video":"unlimited","placement":"+15%","badge":"Premium","territory_exclusive":true,"company_of_week_priority":true}'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  monthly_price_usd          = EXCLUDED.monthly_price_usd,
  rfq_visibility_delay_hours = EXCLUDED.rfq_visibility_delay_hours,
  monthly_lead_credits       = EXCLUDED.monthly_lead_credits,
  features                   = EXCLUDED.features;

-- ─── 12. Backfill: copy supplierSubscriptions.tier → suppliers.tier ──────────

UPDATE suppliers s
SET tier = sub.tier,
    tier_updated_at = sub.updated_at,
    monthly_lead_credit_allowance = stp.monthly_lead_credits
FROM supplier_subscriptions sub
JOIN supplier_tier_pricing stp ON stp.tier = sub.tier
WHERE sub.supplier_id = s.id
  AND sub.status = 'active';

-- Free defaults for any supplier without a subscription row
UPDATE suppliers s
SET monthly_lead_credit_allowance = 3
WHERE monthly_lead_credit_allowance = 0
  AND NOT EXISTS (SELECT 1 FROM supplier_subscriptions sub WHERE sub.supplier_id = s.id);

-- ─── 13. View: latest GCS per material (architect-facing fast path) ──────────

CREATE OR REPLACE VIEW v_material_latest_gcs AS
SELECT DISTINCT ON (epd_material_id, persona)
  epd_material_id,
  persona,
  gcs,
  sustainability_score,
  performance_score,
  carbon_savings_pct,
  cost_delta_pct,
  lead_time_weeks,
  compliance_status,
  calculated_at
FROM material_credit_scores
ORDER BY epd_material_id, persona, calculated_at DESC;

-- ─── 14. View: supplier scoreboard (DoorDash-style leaderboard) ──────────────

CREATE OR REPLACE VIEW v_supplier_scoreboard AS
SELECT
  s.id,
  s.company_name AS company_name,
  s.tier,
  s.srs_score,
  s.avg_response_time_hours,
  s.rfq_completion_rate,
  s.avg_rating,
  s.lead_credits,
  s.top_responder_badge,
  s.lightning_fast_badge,
  s.duns_score,
  s.linkedin_verified,
  s.featured_company_of_week_at,
  CASE
    WHEN s.tier = 'premium'  THEN 1
    WHEN s.tier = 'standard' THEN 2
    WHEN s.tier = 'basic'    THEN 3
    ELSE 4
  END AS tier_rank,
  COALESCE(s.srs_score, 0) AS srs_for_sort
FROM suppliers s
WHERE s.hidden_from_search = false
ORDER BY tier_rank ASC, srs_for_sort DESC NULLS LAST;

-- NOTE: column quoting — the suppliers table uses camelCase column names ("companyName"),
-- so "company_name" in the view needs to map. Re-create with proper quoting:
DROP VIEW IF EXISTS v_supplier_scoreboard;
CREATE OR REPLACE VIEW v_supplier_scoreboard AS
SELECT
  s.id,
  s."companyName" AS company_name,
  s.tier,
  s.srs_score,
  s.avg_response_time_hours,
  s.rfq_completion_rate,
  s.avg_rating,
  s.lead_credits,
  s.top_responder_badge,
  s.lightning_fast_badge,
  s.duns_score,
  s.linkedin_verified,
  s.featured_company_of_week_at,
  CASE
    WHEN s.tier = 'premium'  THEN 1
    WHEN s.tier = 'standard' THEN 2
    WHEN s.tier = 'basic'    THEN 3
    ELSE 4
  END AS tier_rank,
  COALESCE(s.srs_score, 0) AS srs_for_sort
FROM suppliers s
WHERE s.hidden_from_search = false
ORDER BY tier_rank ASC, srs_for_sort DESC NULLS LAST;

-- ─── DONE ────────────────────────────────────────────────────────────────────
