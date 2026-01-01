-- GreenChainz MVP Core Schema (idempotent)

-- Users (authentication and authorization)
CREATE TABLE IF NOT EXISTS Users (
  UserID BIGSERIAL PRIMARY KEY,
  Email VARCHAR(255) UNIQUE,
  PasswordHash VARCHAR(255),
  FirstName VARCHAR(100),
  LastName VARCHAR(100),
  FullName VARCHAR(255),
  Role VARCHAR(50) NOT NULL DEFAULT 'Buyer' CHECK (Role IN ('Admin', 'Buyer', 'Supplier')),
  CompanyID BIGINT,
  OAuthProvider VARCHAR(50),
  OAuthID VARCHAR(255),
  ResetToken VARCHAR(255),
  ResetTokenExpiresAt TIMESTAMP,
  LastLogin TIMESTAMP,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT oauth_unique UNIQUE (OAuthProvider, OAuthID)
);

-- Add reset token columns if they don't exist (for existing databases)
ALTER TABLE Users ADD COLUMN IF NOT EXISTS ResetToken VARCHAR(255);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS ResetTokenExpiresAt TIMESTAMP;

-- Companies
CREATE TABLE IF NOT EXISTS Companies (
  CompanyID BIGSERIAL PRIMARY KEY,
  CompanyName VARCHAR(255),
  Address TEXT,
  Industry VARCHAR(255),
  Website VARCHAR(255),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for Users.CompanyID
ALTER TABLE Users DROP CONSTRAINT IF EXISTS fk_users_company;
ALTER TABLE Users ADD CONSTRAINT fk_users_company 
  FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID) ON DELETE SET NULL;

-- Suppliers
CREATE TABLE IF NOT EXISTS Suppliers (
  SupplierID BIGSERIAL PRIMARY KEY,
  CompanyID BIGINT REFERENCES Companies(CompanyID)
);

-- Supplier Profiles
CREATE TABLE IF NOT EXISTS Supplier_Profiles (
  ProfileID BIGSERIAL PRIMARY KEY,
  SupplierID BIGINT UNIQUE REFERENCES Suppliers(SupplierID),
  Description TEXT,
  ESG_Summary TEXT
);

-- Certifications (master)
CREATE TABLE IF NOT EXISTS Certifications (
  CertificationID BIGSERIAL PRIMARY KEY,
  Name VARCHAR(255) NOT NULL,
  CertifyingBody VARCHAR(255),
  CONSTRAINT certifications_unique UNIQUE (Name, CertifyingBody)
);

-- Supplier Certifications (link)
CREATE TABLE IF NOT EXISTS Supplier_Certifications (
  SupplierCertificationID BIGSERIAL PRIMARY KEY,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID),
  CertificationID BIGINT REFERENCES Certifications(CertificationID),
  CertificateNumber VARCHAR(255),
  IssueDate DATE,
  ExpiryDate DATE,
  Status VARCHAR(50)
);

-- Product Categories (master)
CREATE TABLE IF NOT EXISTS Product_Categories (
  CategoryID BIGSERIAL PRIMARY KEY,
  CategoryName VARCHAR(255) UNIQUE NOT NULL,
  Description TEXT
);

-- Products
CREATE TABLE IF NOT EXISTS Products (
  ProductID BIGSERIAL PRIMARY KEY,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  ProductName VARCHAR(255) NOT NULL,
  Description TEXT,
  CategoryID BIGINT REFERENCES Product_Categories(CategoryID) ON DELETE SET NULL,
  SKU VARCHAR(100),
  UnitPrice DECIMAL(10, 2),
  Currency VARCHAR(10) DEFAULT 'USD',
  LeadTimeDays INTEGER,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Materials Composition
CREATE TABLE IF NOT EXISTS Product_Materials_Composition (
  CompositionID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  MaterialName VARCHAR(255) NOT NULL,
  Percentage DECIMAL(5, 2),
  IsRecycled BOOLEAN DEFAULT FALSE,
  IsBioBased BOOLEAN DEFAULT FALSE,
  SourceRegion VARCHAR(255)
);

-- ============================================
-- EVENT SOURCING ARCHITECTURE (Blockchain-Ready)
-- ============================================
-- These tables create an immutable audit log that will migrate to Hyperledger Fabric in Phase 2

-- Product Events (Immutable Event Log)
CREATE TABLE IF NOT EXISTS Product_Events (
  EventID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  EventType VARCHAR(100) NOT NULL CHECK (EventType IN (
    'CREATED', 'UPDATED', 'CERTIFIED', 'API_VERIFIED', 
    'MATERIAL_ADDED', 'MATERIAL_UPDATED', 'LISTED', 'DELISTED',
    'SHIPPED', 'RECEIVED', 'BATCH_CREATED', 'BATCH_PROCESSED'
  )),
  EventData JSONB NOT NULL,
  EventHash VARCHAR(64),
  PreviousEventHash VARCHAR(64),
  UserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  IPAddress VARCHAR(45),
  Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  BlockchainSynced BOOLEAN DEFAULT FALSE,
  BlockchainTxID VARCHAR(255)
);

-- Certification Events (Chain of Custody for Certifications)
CREATE TABLE IF NOT EXISTS Certification_Events (
  EventID BIGSERIAL PRIMARY KEY,
  CertificationID BIGINT REFERENCES Certifications(CertificationID) ON DELETE CASCADE,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  EventType VARCHAR(100) NOT NULL CHECK (EventType IN (
    'ISSUED', 'UPLOADED', 'API_VERIFIED', 'VERIFICATION_FAILED',
    'RENEWED', 'EXPIRED', 'REVOKED', 'SUSPENDED'
  )),
  EventData JSONB NOT NULL,
  EventHash VARCHAR(64),
  PreviousEventHash VARCHAR(64),
  VerificationSource VARCHAR(255),
  UserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  IPAddress VARCHAR(45),
  Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  BlockchainSynced BOOLEAN DEFAULT FALSE,
  BlockchainTxID VARCHAR(255)
);

-- Supply Chain Events (Full Provenance Tracking - Phase 2)
CREATE TABLE IF NOT EXISTS Supply_Chain_Events (
  EventID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  BatchNumber VARCHAR(255),
  EventType VARCHAR(100) NOT NULL CHECK (EventType IN (
    'HARVESTED', 'SOURCED', 'PROCESSED', 'MANUFACTURED',
    'QUALITY_CHECKED', 'PACKAGED', 'SHIPPED', 'IN_TRANSIT',
    'RECEIVED', 'DELIVERED', 'INSTALLED'
  )),
  EventData JSONB NOT NULL,
  EventHash VARCHAR(64),
  PreviousEventHash VARCHAR(64),
  GeolocationLat DECIMAL(10, 8),
  GeolocationLon DECIMAL(11, 8),
  UserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  IPAddress VARCHAR(45),
  Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  BlockchainSynced BOOLEAN DEFAULT FALSE,
  BlockchainTxID VARCHAR(255)
);

-- API Verification Log (External Data Source Integration)
CREATE TABLE IF NOT EXISTS API_Verification_Log (
  VerificationID BIGSERIAL PRIMARY KEY,
  EntityType VARCHAR(50) NOT NULL CHECK (EntityType IN ('Certification', 'Supplier', 'Product')),
  EntityID BIGINT NOT NULL,
  APIProvider VARCHAR(100) NOT NULL,
  APIEndpoint VARCHAR(255),
  RequestPayload JSONB,
  ResponsePayload JSONB,
  VerificationStatus VARCHAR(50) CHECK (VerificationStatus IN ('VERIFIED', 'FAILED', 'PENDING', 'ERROR')),
  EventHash VARCHAR(64),
  Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  BlockchainSynced BOOLEAN DEFAULT FALSE
);

-- Materialized View: Current Product State (Fast Queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS Product_Current_State AS
SELECT 
  p.ProductID,
  p.ProductName,
  p.SupplierID,
  p.CategoryID,
  (SELECT COUNT(*) FROM Certification_Events ce 
   JOIN Supplier_Certifications sc ON ce.CertificationID = sc.CertificationID
   WHERE sc.SupplierID = p.SupplierID AND ce.EventType = 'API_VERIFIED'
  ) AS VerifiedCertificationCount,
  (SELECT MAX(pe.Timestamp) FROM Product_Events pe WHERE pe.ProductID = p.ProductID) AS LastEventTimestamp,
  (SELECT pe.EventType FROM Product_Events pe WHERE pe.ProductID = p.ProductID ORDER BY pe.Timestamp DESC LIMIT 1) AS LastEventType
FROM Products p;

-- Materialized View: Certification Verification Status (Fast Queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS Certification_Verification_Status AS
SELECT 
  sc.SupplierCertificationID,
  sc.SupplierID,
  sc.CertificationID,
  c.Name AS CertificationName,
  c.CertifyingBody,
  sc.Status AS CurrentStatus,
  sc.ExpiryDate,
  (SELECT ce.EventType FROM Certification_Events ce 
   WHERE ce.CertificationID = sc.CertificationID 
   ORDER BY ce.Timestamp DESC LIMIT 1) AS LastVerificationEvent,
  (SELECT ce.Timestamp FROM Certification_Events ce 
   WHERE ce.CertificationID = sc.CertificationID 
   ORDER BY ce.Timestamp DESC LIMIT 1) AS LastVerificationTimestamp,
  (SELECT ce.VerificationSource FROM Certification_Events ce 
   WHERE ce.CertificationID = sc.CertificationID AND ce.EventType = 'API_VERIFIED'
   ORDER BY ce.Timestamp DESC LIMIT 1) AS LastVerificationSource
FROM Supplier_Certifications sc
JOIN Certifications c ON sc.CertificationID = c.CertificationID;

-- Subscription Plans (Freemium Model)
CREATE TABLE IF NOT EXISTS Subscription_Plans (
  PlanID BIGSERIAL PRIMARY KEY,
  PlanName VARCHAR(100) UNIQUE NOT NULL,
  PlanType VARCHAR(50) NOT NULL CHECK (PlanType IN ('Free', 'Pro', 'Enterprise')),
  MonthlyPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  AnnualPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  MaxProducts INTEGER,
  MaxCertifications INTEGER,
  Features JSONB,
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS User_Subscriptions (
  SubscriptionID BIGSERIAL PRIMARY KEY,
  UserID BIGINT REFERENCES Users(UserID) ON DELETE CASCADE,
  PlanID BIGINT REFERENCES Subscription_Plans(PlanID),
  StripeCustomerID VARCHAR(255),
  StripeSubscriptionID VARCHAR(255),
  Status VARCHAR(50) NOT NULL CHECK (Status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  CurrentPeriodStart TIMESTAMP,
  CurrentPeriodEnd TIMESTAMP,
  CancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS Payment_Transactions (
  TransactionID BIGSERIAL PRIMARY KEY,
  UserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  StripePaymentIntentID VARCHAR(255),
  Amount DECIMAL(10, 2) NOT NULL,
  Currency VARCHAR(10) DEFAULT 'USD',
  Status VARCHAR(50) NOT NULL CHECK (Status IN ('succeeded', 'pending', 'failed', 'refunded')),
  Description TEXT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal Agreements
CREATE TABLE IF NOT EXISTS Legal_Agreements (
  AgreementID BIGSERIAL PRIMARY KEY,
  AgreementType VARCHAR(100) NOT NULL CHECK (AgreementType IN ('Terms of Service', 'Supplier Agreement', 'Privacy Policy')),
  Version VARCHAR(50) NOT NULL,
  Content TEXT NOT NULL,
  EffectiveDate TIMESTAMP NOT NULL,
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_agreement_version UNIQUE (AgreementType, Version)
);

-- User Agreement Acceptances
CREATE TABLE IF NOT EXISTS User_Agreement_Acceptances (
  AcceptanceID BIGSERIAL PRIMARY KEY,
  UserID BIGINT REFERENCES Users(UserID) ON DELETE CASCADE,
  AgreementID BIGINT REFERENCES Legal_Agreements(AgreementID),
  IPAddress VARCHAR(45),
  UserAgent TEXT,
  AcceptedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_agreement UNIQUE (UserID, AgreementID)
);

-- Founding 50 Supplier Tracking
CREATE TABLE IF NOT EXISTS Supplier_Outreach (
  OutreachID BIGSERIAL PRIMARY KEY,
  CompanyName VARCHAR(255) NOT NULL,
  ContactName VARCHAR(255),
  ContactEmail VARCHAR(255),
  ContactPhone VARCHAR(50),
  Industry VARCHAR(255),
  Status VARCHAR(50) NOT NULL CHECK (Status IN ('Identified', 'Contacted', 'In Discussion', 'MOU Sent', 'MOU Signed', 'Onboarded', 'Declined')) DEFAULT 'Identified',
  Priority VARCHAR(20) CHECK (Priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  Notes TEXT,
  MOUSentDate DATE,
  MOUSignedDate DATE,
  UserID BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DATA PROVIDER INTEGRATION SYSTEM
-- ============================================

-- Data Providers (Master Registry)
CREATE TABLE IF NOT EXISTS Data_Providers (
  ProviderID BIGSERIAL PRIMARY KEY,
  ProviderName VARCHAR(255) UNIQUE NOT NULL,
  ProviderType VARCHAR(100) NOT NULL CHECK (ProviderType IN (
    'Certifications', 'EPD', 'LCA', 'Carbon', 'Construction', 
    'Eco-Labels', 'B-Corp', 'FSC', 'EPD/LCA Database'
  )),
  AccessType VARCHAR(50) NOT NULL CHECK (AccessType IN ('FREE', 'PAID', 'EMAIL/REQUEST', 'PARTNERSHIP')),
  APIEndpoint VARCHAR(500),
  APIKey VARCHAR(500),
  APIDocumentation VARCHAR(500),
  ContactEmail VARCHAR(255),
  Status VARCHAR(50) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive', 'Pending', 'Testing')),
  Priority VARCHAR(20) DEFAULT 'Medium' CHECK (Priority IN ('P0', 'P1', 'P2', 'P3')),
  MonthlyAPICalls INTEGER DEFAULT 0,
  MonthlyCost DECIMAL(10, 2) DEFAULT 0.00,
  LastSyncedAt TIMESTAMP,
  Notes TEXT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Environmental Data (Aggregated from Providers)
CREATE TABLE IF NOT EXISTS Product_Environmental_Data (
  EnvDataID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  DataType VARCHAR(100) NOT NULL CHECK (DataType IN (
    'EmbodiedCarbon', 'EPD', 'LCA', 'CarbonFootprint', 
    'WaterUsage', 'Toxicity', 'Circularity', 'MaterialHealth'
  )),
  DataValue JSONB NOT NULL,
  Unit VARCHAR(50),
  VerificationStatus VARCHAR(50) DEFAULT 'Pending' CHECK (VerificationStatus IN ('Verified', 'Pending', 'Failed', 'Expired')),
  VerifiedAt TIMESTAMP,
  ExpiryDate DATE,
  RawAPIResponse JSONB,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier B Corp Data
CREATE TABLE IF NOT EXISTS Supplier_BCorp_Data (
  BCorpID BIGSERIAL PRIMARY KEY,
  SupplierID BIGINT UNIQUE REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  BCorpCertified BOOLEAN DEFAULT FALSE,
  BCorpScore INTEGER CHECK (BCorpScore >= 0 AND BCorpScore <= 200),
  CertificationDate DATE,
  RecertificationDate DATE,
  ImpactAreas JSONB,
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  LastVerifiedAt TIMESTAMP,
  RawAPIResponse JSONB,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FSC Certification Details
CREATE TABLE IF NOT EXISTS FSC_Certifications (
  FSCCertID BIGSERIAL PRIMARY KEY,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  CertificateNumber VARCHAR(255) UNIQUE NOT NULL,
  CertificateType VARCHAR(100) CHECK (CertificateType IN ('FSC 100%', 'FSC Mix', 'FSC Recycled', 'FSC CoC')),
  CertificateStatus VARCHAR(50) DEFAULT 'Valid' CHECK (CertificateStatus IN ('Valid', 'Expired', 'Suspended', 'Revoked')),
  IssueDate DATE,
  ExpiryDate DATE,
  CertifiedArea DECIMAL(15, 2),
  AreaUnit VARCHAR(20) DEFAULT 'hectares',
  CertifyingBody VARCHAR(255),
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  LastVerifiedAt TIMESTAMP,
  RawAPIResponse JSONB,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cradle to Cradle Certifications
CREATE TABLE IF NOT EXISTS C2C_Certifications (
  C2CCertID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  CertificationLevel VARCHAR(50) CHECK (CertificationLevel IN ('Basic', 'Bronze', 'Silver', 'Gold', 'Platinum')),
  CertificationVersion VARCHAR(20),
  MaterialHealthScore VARCHAR(50),
  MaterialReutilizationScore VARCHAR(50),
  RenewableEnergyScore VARCHAR(50),
  WaterStewardshipScore VARCHAR(50),
  SocialFairnessScore VARCHAR(50),
  IssueDate DATE,
  ExpiryDate DATE,
  CertificateNumber VARCHAR(255),
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  LastVerifiedAt TIMESTAMP,
  RawAPIResponse JSONB,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LEED Credit Eligibility
CREATE TABLE IF NOT EXISTS LEED_Product_Credits (
  LEEDCreditID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  LEEDVersion VARCHAR(50),
  CreditCategory VARCHAR(100),
  CreditNumber VARCHAR(50),
  CreditName VARCHAR(255),
  ContributionType VARCHAR(100),
  ContributionValue DECIMAL(10, 2),
  Documentation TEXT,
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  LastVerifiedAt TIMESTAMP,
  RawAPIResponse JSONB,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EPD (Environmental Product Declaration) Data
CREATE TABLE IF NOT EXISTS Product_EPDs (
  EPDID BIGSERIAL PRIMARY KEY,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
  EPDNumber VARCHAR(255),
  EPDProgramOperator VARCHAR(255),
  EPDType VARCHAR(50) CHECK (EPDType IN ('Product-Specific', 'Industry-Wide', 'Sector')),
  DeclaredUnit VARCHAR(100),
  ReferenceServiceLife INTEGER,
  GlobalWarmingPotential DECIMAL(15, 4),
  AcidificationPotential DECIMAL(15, 4),
  EutrophicationPotential DECIMAL(15, 4),
  OzoneDepletionPotential DECIMAL(15, 8),
  PhotochemicalOzoneCreation DECIMAL(15, 4),
  IssueDate DATE,
  ExpiryDate DATE,
  EPDDocumentURL VARCHAR(500),
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  LastVerifiedAt TIMESTAMP,
  RawAPIResponse JSONB,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Provider Sync Log
CREATE TABLE IF NOT EXISTS Data_Provider_Sync_Log (
  SyncID BIGSERIAL PRIMARY KEY,
  ProviderID BIGINT REFERENCES Data_Providers(ProviderID),
  SyncType VARCHAR(50) CHECK (SyncType IN ('Full', 'Incremental', 'Verification', 'Manual')),
  RecordsProcessed INTEGER DEFAULT 0,
  RecordsCreated INTEGER DEFAULT 0,
  RecordsUpdated INTEGER DEFAULT 0,
  RecordsFailed INTEGER DEFAULT 0,
  ErrorLog JSONB,
  StartedAt TIMESTAMP,
  CompletedAt TIMESTAMP,
  Status VARCHAR(50) DEFAULT 'Running' CHECK (Status IN ('Running', 'Success', 'Failed', 'Partial')),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Data Provider Integration
CREATE INDEX IF NOT EXISTS idx_data_providers_type ON Data_Providers(ProviderType);
CREATE INDEX IF NOT EXISTS idx_data_providers_status ON Data_Providers(Status);
CREATE INDEX IF NOT EXISTS idx_product_env_data_product ON Product_Environmental_Data(ProductID);
CREATE INDEX IF NOT EXISTS idx_product_env_data_provider ON Product_Environmental_Data(ProviderID);
CREATE INDEX IF NOT EXISTS idx_product_env_data_type ON Product_Environmental_Data(DataType);
CREATE INDEX IF NOT EXISTS idx_supplier_bcorp_supplier ON Supplier_BCorp_Data(SupplierID);
CREATE INDEX IF NOT EXISTS idx_fsc_cert_supplier ON FSC_Certifications(SupplierID);
CREATE INDEX IF NOT EXISTS idx_fsc_cert_number ON FSC_Certifications(CertificateNumber);
CREATE INDEX IF NOT EXISTS idx_c2c_cert_product ON C2C_Certifications(ProductID);
CREATE INDEX IF NOT EXISTS idx_leed_credit_product ON LEED_Product_Credits(ProductID);
CREATE INDEX IF NOT EXISTS idx_product_epd_product ON Product_EPDs(ProductID);
CREATE INDEX IF NOT EXISTS idx_sync_log_provider ON Data_Provider_Sync_Log(ProviderID, CreatedAt DESC);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON Users(OAuthProvider, OAuthID);
CREATE INDEX IF NOT EXISTS idx_users_company ON Users(CompanyID);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON Suppliers(CompanyID);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON Products(SupplierID);
CREATE INDEX IF NOT EXISTS idx_products_category ON Products(CategoryID);
CREATE INDEX IF NOT EXISTS idx_materials_product ON Product_Materials_Composition(ProductID);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON User_Subscriptions(UserID);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON User_Subscriptions(StripeSubscriptionID);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON Payment_Transactions(UserID);
CREATE INDEX IF NOT EXISTS idx_agreement_acceptances_user ON User_Agreement_Acceptances(UserID);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON Supplier_Outreach(Status);
CREATE INDEX IF NOT EXISTS idx_outreach_email ON Supplier_Outreach(ContactEmail);

-- Event Sourcing Indexes (Blockchain-Ready Performance)
CREATE INDEX IF NOT EXISTS idx_product_events_product ON Product_Events(ProductID, Timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_type ON Product_Events(EventType);
CREATE INDEX IF NOT EXISTS idx_product_events_timestamp ON Product_Events(Timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_blockchain ON Product_Events(BlockchainSynced) WHERE BlockchainSynced = FALSE;
CREATE INDEX IF NOT EXISTS idx_certification_events_cert ON Certification_Events(CertificationID, Timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_certification_events_supplier ON Certification_Events(SupplierID, Timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_certification_events_type ON Certification_Events(EventType);
CREATE INDEX IF NOT EXISTS idx_certification_events_blockchain ON Certification_Events(BlockchainSynced) WHERE BlockchainSynced = FALSE;
CREATE INDEX IF NOT EXISTS idx_supply_chain_events_product ON Supply_Chain_Events(ProductID, Timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_supply_chain_events_batch ON Supply_Chain_Events(BatchNumber);
CREATE INDEX IF NOT EXISTS idx_supply_chain_events_blockchain ON Supply_Chain_Events(BlockchainSynced) WHERE BlockchainSynced = FALSE;
CREATE INDEX IF NOT EXISTS idx_api_verification_entity ON API_Verification_Log(EntityType, EntityID, Timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_verification_provider ON API_Verification_Log(APIProvider);

-- ============================================
-- RFQ (REQUEST FOR QUOTE) SYSTEM
-- ============================================
-- Buyers (architects, designers) send RFQs to Suppliers for specific products

-- Buyers (extends Users with role='Buyer')
CREATE TABLE IF NOT EXISTS Buyers (
  BuyerID BIGSERIAL PRIMARY KEY,
  UserID BIGINT UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  CompanyID BIGINT REFERENCES Companies(CompanyID) ON DELETE SET NULL,
  JobTitle VARCHAR(255),
  ProjectTypes TEXT[], -- array of project types: ['Commercial', 'Residential', 'Institutional']
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

-- Indexes for RFQ system
CREATE INDEX IF NOT EXISTS idx_buyers_user ON Buyers(UserID);
CREATE INDEX IF NOT EXISTS idx_buyers_company ON Buyers(CompanyID);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer ON RFQs(BuyerID, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier ON RFQs(SupplierID, Status, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_product ON RFQs(ProductID);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON RFQs(Status);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq ON RFQ_Responses(RFQID);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier ON RFQ_Responses(SupplierID, CreatedAt DESC);

-- Email Capture for Marketing (Survey Landing Pages)
CREATE TABLE IF NOT EXISTS Email_Captures (
  CaptureID BIGSERIAL PRIMARY KEY,
  Email VARCHAR(255) NOT NULL,
  Source VARCHAR(100) NOT NULL CHECK (Source IN ('supplier-survey', 'buyer-survey', 'data-provider-survey', 'newsletter', 'waitlist')),
  UserType VARCHAR(50),
  CompanyName VARCHAR(255),
  CapturedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_captures_unique UNIQUE (Email, Source)
);

CREATE INDEX IF NOT EXISTS idx_email_captures_email ON Email_Captures(Email);
CREATE INDEX IF NOT EXISTS idx_email_captures_source ON Email_Captures(Source);

-- Supplier Verification Scores (Persisted cache for metrics/dashboard)
CREATE TABLE IF NOT EXISTS Supplier_Verification_Scores (
  SupplierID BIGINT PRIMARY KEY REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  Score INTEGER CHECK (Score >= 0 AND Score <= 100),
  DistinctBodies INTEGER DEFAULT 0,
  NonExpired INTEGER DEFAULT 0,
  Expired INTEGER DEFAULT 0,
  TotalCerts INTEGER DEFAULT 0,
  CalculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Log (Email audit trail)
CREATE TABLE IF NOT EXISTS Notification_Log (
  NotificationID BIGSERIAL PRIMARY KEY,
  NotificationType VARCHAR(100) NOT NULL,
  Recipient VARCHAR(255) NOT NULL,
  Subject VARCHAR(500),
  MessageBody TEXT,
  Status VARCHAR(50) NOT NULL CHECK (Status IN ('sent', 'failed', 'skipped')),
  ErrorMessage TEXT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_scores_score ON Supplier_Verification_Scores(Score);
CREATE INDEX IF NOT EXISTS idx_supplier_scores_calculated ON Supplier_Verification_Scores(CalculatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_email_captures_date ON Email_Captures(CapturedAt DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON Notification_Log(NotificationType);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON Notification_Log(Status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON Notification_Log(CreatedAt DESC);
