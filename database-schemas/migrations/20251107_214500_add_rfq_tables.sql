-- Migration: Add RFQ System Tables
-- Created: 2025-11-07 21:45:00
-- Author: GreenChainz Team
-- 
-- Description:
-- Adds three tables to support the Request for Quote (RFQ) workflow:
-- 1. Buyers - Extends Users table with buyer-specific profile data
-- 2. RFQs - Quote requests from buyers to suppliers
-- 3. RFQ_Responses - Supplier quotes in response to RFQs
--
-- This enables architects/designers (buyers) to request quotes from
-- sustainable material suppliers, creating the transaction workflow
-- that is core to the GreenChainz value proposition.

-- ============================================
-- UP MIGRATION
-- ============================================

-- Buyers table (extends Users with role='Buyer')
CREATE TABLE IF NOT EXISTS Buyers (
  BuyerID BIGSERIAL PRIMARY KEY,
  UserID BIGINT UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  CompanyID BIGINT REFERENCES Companies(CompanyID) ON DELETE SET NULL,
  JobTitle VARCHAR(255),
  ProjectTypes TEXT[], -- array: ['Commercial', 'Residential', 'Institutional']
  PreferredContactMethod VARCHAR(50) DEFAULT 'Email' CHECK (PreferredContactMethod IN ('Email', 'Phone', 'Both')),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RFQs (Request for Quote)
CREATE TABLE IF NOT EXISTS RFQs (
  RFQID BIGSERIAL PRIMARY KEY,
  BuyerID BIGINT REFERENCES Buyers(BuyerID) ON DELETE CASCADE,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE SET NULL, -- optional: specific product
  ProjectName VARCHAR(255),
  Message TEXT NOT NULL, -- buyer's detailed request
  QuantityNeeded INTEGER,
  Unit VARCHAR(50), -- 'sqft', 'board feet', 'pieces', etc.
  BudgetRange VARCHAR(100), -- e.g., "$5,000-$10,000"
  DeadlineDate DATE,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Responded', 'Accepted', 'Declined', 'Expired', 'Cancelled')),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RFQ Responses (Supplier quotes)
CREATE TABLE IF NOT EXISTS RFQ_Responses (
  ResponseID BIGSERIAL PRIMARY KEY,
  RFQID BIGINT REFERENCES RFQs(RFQID) ON DELETE CASCADE,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  QuotedPrice DECIMAL(10, 2) NOT NULL,
  Currency VARCHAR(10) DEFAULT 'USD',
  LeadTimeDays INTEGER,
  Message TEXT, -- supplier's response notes
  AttachmentURLs TEXT[], -- links to quote PDFs, spec sheets
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Accepted', 'Declined')),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for RFQ system performance
CREATE INDEX IF NOT EXISTS idx_buyers_user ON Buyers(UserID);
CREATE INDEX IF NOT EXISTS idx_buyers_company ON Buyers(CompanyID);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer ON RFQs(BuyerID, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier ON RFQs(SupplierID, Status, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_product ON RFQs(ProductID);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON RFQs(Status);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq ON RFQ_Responses(RFQID);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier ON RFQ_Responses(SupplierID, CreatedAt DESC);

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback:
--
-- DROP INDEX IF EXISTS idx_rfq_responses_supplier;
-- DROP INDEX IF EXISTS idx_rfq_responses_rfq;
-- DROP INDEX IF EXISTS idx_rfqs_status;
-- DROP INDEX IF EXISTS idx_rfqs_product;
-- DROP INDEX IF EXISTS idx_rfqs_supplier;
-- DROP INDEX IF EXISTS idx_rfqs_buyer;
-- DROP INDEX IF EXISTS idx_buyers_company;
-- DROP INDEX IF EXISTS idx_buyers_user;
-- DROP TABLE IF EXISTS RFQ_Responses;
-- DROP TABLE IF EXISTS RFQs;
-- DROP TABLE IF EXISTS Buyers;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after migration to verify success:
--
-- Check tables exist:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('buyers', 'rfqs', 'rfq_responses');
--
-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('buyers', 'rfqs', 'rfq_responses');
--
-- Verify constraints:
-- \d+ Buyers
-- \d+ RFQs
-- \d+ RFQ_Responses
