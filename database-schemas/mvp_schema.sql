-- GreenChainz MVP Core Schema (idempotent)
-- Aligned with schema.sql

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

-- Add reset token columns if they don't exist
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

-- Materials (Sustainable Materials Library)
CREATE TABLE IF NOT EXISTS Materials (
  MaterialID BIGSERIAL PRIMARY KEY,
  AssemblyCode VARCHAR(50),
  AssemblyName VARCHAR(255),
  Location VARCHAR(50),
  MaterialType VARCHAR(255),
  Manufacturer VARCHAR(255) NOT NULL,
  ProductName VARCHAR(500) NOT NULL,
  EPDNumber VARCHAR(100),
  Dimension VARCHAR(50),
  GWP DECIMAL(10,2),
  GWPUnits VARCHAR(50),
  DeclaredUnit VARCHAR(100),
  MSFFactor DECIMAL(10,3),
  EmbodiedCarbonPer1000sf DECIMAL(10,2),
  Notes TEXT,
  Source VARCHAR(50) DEFAULT 'manual',
  IsVerified BOOLEAN DEFAULT FALSE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT materials_unique UNIQUE(Manufacturer, ProductName, EPDNumber)
);

-- Buyers
CREATE TABLE IF NOT EXISTS Buyers (
  BuyerID BIGSERIAL PRIMARY KEY,
  UserID BIGINT UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  CompanyID BIGINT REFERENCES Companies(CompanyID) ON DELETE SET NULL,
  JobTitle VARCHAR(255),
  ProjectTypes TEXT[],
  PreferredContactMethod VARCHAR(50) DEFAULT 'Email' CHECK (PreferredContactMethod IN ('Email', 'Phone', 'Both')),
  LinkedInVerified BOOLEAN DEFAULT FALSE,
  LinkedInVerifiedAt TIMESTAMP,
  LinkedInProfileID VARCHAR(255),
  LinkedInProfileURL VARCHAR(500),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RFQ Deposits
CREATE TABLE IF NOT EXISTS RFQ_Deposits (
  DepositID BIGSERIAL PRIMARY KEY,
  RFQID BIGINT,
  UserID BIGINT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
  PaymentIntentID VARCHAR(255) UNIQUE NOT NULL,
  AmountCents INTEGER NOT NULL DEFAULT 500 CHECK (AmountCents > 0),
  Currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  Status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded')),
  RefundReason TEXT,
  RefundID VARCHAR(255),
  Metadata JSONB DEFAULT '{}'::jsonb,
  IPAddress VARCHAR(45),
  UserAgent TEXT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  SucceededAt TIMESTAMP,
  RefundedAt TIMESTAMP
);

-- RFQs
CREATE TABLE IF NOT EXISTS RFQs (
  RFQID BIGSERIAL PRIMARY KEY,
  BuyerID BIGINT REFERENCES Buyers(BuyerID) ON DELETE CASCADE,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  ProductID BIGINT REFERENCES Products(ProductID) ON DELETE SET NULL,
  ProjectName VARCHAR(255),
  Message TEXT NOT NULL,
  QuantityNeeded INTEGER,
  Unit VARCHAR(50),
  BudgetRange VARCHAR(100),
  DeadlineDate DATE,
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Responded', 'Accepted', 'Declined', 'Expired', 'Cancelled')),
  DepositVerified BOOLEAN DEFAULT FALSE,
  DepositID BIGINT REFERENCES RFQ_Deposits(DepositID) ON DELETE SET NULL,
  DepositVerifiedAt TIMESTAMP,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE RFQ_Deposits ADD CONSTRAINT fk_rfq_deposits_rfq FOREIGN KEY (RFQID) REFERENCES RFQs(RFQID) ON DELETE SET NULL;

-- RFQ Responses
CREATE TABLE IF NOT EXISTS RFQ_Responses (
  ResponseID BIGSERIAL PRIMARY KEY,
  RFQID BIGINT REFERENCES RFQs(RFQID) ON DELETE CASCADE,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  QuotedPrice DECIMAL(10, 2) NOT NULL,
  Currency VARCHAR(10) DEFAULT 'USD',
  LeadTimeDays INTEGER,
  Message TEXT,
  AttachmentURLs TEXT[],
  Status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Accepted', 'Declined')),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RFQ Distribution Queue
CREATE TABLE IF NOT EXISTS RFQ_Distribution_Queue (
    QueueID BIGSERIAL PRIMARY KEY,
    RFQID BIGINT NOT NULL REFERENCES RFQs(RFQID) ON DELETE CASCADE,
    SupplierID BIGINT NOT NULL REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
    WaveNumber INTEGER NOT NULL DEFAULT 1 CHECK (WaveNumber >= 1),
    ScheduledFor TIMESTAMP NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'processed', 'failed', 'cancelled')),
    WaveReason TEXT,
    AccessLevel VARCHAR(50) DEFAULT 'full' CHECK (AccessLevel IN ('full', 'outreach_only')),
    TierSnapshot VARCHAR(50),
    ErrorMessage TEXT,
    ProcessedAt TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance (aligned with schema.sql)
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);
CREATE INDEX IF NOT EXISTS idx_users_company ON Users(CompanyID);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON Suppliers(CompanyID);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON Products(SupplierID);
CREATE INDEX IF NOT EXISTS idx_products_category ON Products(CategoryID);
CREATE INDEX IF NOT EXISTS idx_materials_product ON Product_Materials_Composition(ProductID);
CREATE INDEX IF NOT EXISTS idx_materials_manufacturer ON Materials(Manufacturer);
CREATE INDEX IF NOT EXISTS idx_materials_epd ON Materials(EPDNumber);
CREATE INDEX IF NOT EXISTS idx_materials_gwp ON Materials(GWP);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer ON RFQs(BuyerID, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier ON RFQs(SupplierID, Status, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON RFQs(Status);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq ON RFQ_Responses(RFQID);
