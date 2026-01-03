-- ============================================
-- GreenChainz Database Schema
-- PostgreSQL 15+
-- ============================================

-- Users table (base for auth)
CREATE TABLE IF NOT EXISTS Users (
    UserID SERIAL PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255),
    FirstName VARCHAR(100),
    LastName VARCHAR(100),
    Role VARCHAR(50) DEFAULT 'Buyer', -- 'Buyer', 'Supplier', 'Admin'
    AzureID VARCHAR(255) UNIQUE, -- Linked to Azure AD
    CompanyID INTEGER,
    LastLogin TIMESTAMP,
    ResetToken VARCHAR(255),
    ResetTokenExpiresAt TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON Users(Email);
CREATE INDEX idx_users_azure_id ON Users(AzureID);

-- Companies table
CREATE TABLE IF NOT EXISTS Companies (
    CompanyID SERIAL PRIMARY KEY,
    CompanyName VARCHAR(255) NOT NULL,
    Address TEXT,
    Website VARCHAR(255),
    Industry VARCHAR(100),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_name ON Companies(CompanyName);

-- Link User to Company
ALTER TABLE Users ADD CONSTRAINT fk_users_company 
    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID) ON DELETE SET NULL;

-- Suppliers table
CREATE TABLE IF NOT EXISTS Suppliers (
    SupplierID SERIAL PRIMARY KEY,
    CompanyID INTEGER NOT NULL UNIQUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID) ON DELETE CASCADE
);

CREATE INDEX idx_suppliers_company ON Suppliers(CompanyID);

-- Supplier Profiles (extended supplier data)
CREATE TABLE IF NOT EXISTS Supplier_Profiles (
    ProfileID SERIAL PRIMARY KEY,
    SupplierID INTEGER NOT NULL UNIQUE,
    Description TEXT,
    ESG_Summary TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);

-- Buyers table (extends Users with Buyer-specific data)
CREATE TABLE IF NOT EXISTS Buyers (
    BuyerID SERIAL PRIMARY KEY,
    UserID INTEGER NOT NULL UNIQUE,
    CompanyID INTEGER,
    JobTitle VARCHAR(100),
    ProjectTypes TEXT, -- JSON array or comma-separated
    PreferredContactMethod VARCHAR(50) DEFAULT 'Email',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID) ON DELETE SET NULL
);

CREATE INDEX idx_buyers_user ON Buyers(UserID);
CREATE INDEX idx_buyers_company ON Buyers(CompanyID);

-- Certifications (standard certifications)
CREATE TABLE IF NOT EXISTS Certifications (
    CertificationID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    CertifyingBody VARCHAR(255),
    UNIQUE(Name, CertifyingBody)
);

-- Supplier Certifications (supplier's certs)
CREATE TABLE IF NOT EXISTS Supplier_Certifications (
    SupplierCertificationID SERIAL PRIMARY KEY,
    SupplierID INTEGER NOT NULL,
    CertificationID INTEGER NOT NULL,
    CertificateNumber VARCHAR(255),
    IssueDate DATE,
    ExpiryDate DATE,
    Status VARCHAR(50) DEFAULT 'Valid', -- 'Valid', 'Expired', 'Pending'
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
    FOREIGN KEY (CertificationID) REFERENCES Certifications(CertificationID) ON DELETE CASCADE
);

CREATE INDEX idx_supplier_certs_supplier ON Supplier_Certifications(SupplierID);
CREATE INDEX idx_supplier_certs_cert ON Supplier_Certifications(CertificationID);

-- FSC Certifications (external FSC data)
CREATE TABLE IF NOT EXISTS FSC_Certifications (
    FSCCertID SERIAL PRIMARY KEY,
    SupplierID INTEGER NOT NULL,
    CertificateNumber VARCHAR(255) UNIQUE,
    CertificateType VARCHAR(100), -- 'CoC', 'FM', 'OrganiC'
    CertificateStatus VARCHAR(50), -- 'Valid', 'Expired', 'Suspended'
    IssueDate DATE,
    ExpiryDate DATE,
    CertifyingBody VARCHAR(255),
    SyncedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);

CREATE INDEX idx_fsc_certs_supplier ON FSC_Certifications(SupplierID);
CREATE INDEX idx_fsc_certs_number ON FSC_Certifications(CertificateNumber);

-- Products (building materials)
CREATE TABLE IF NOT EXISTS Products (
    ProductID SERIAL PRIMARY KEY,
    SupplierID INTEGER NOT NULL,
    Name VARCHAR(255) NOT NULL,
    Category VARCHAR(100), -- 'Wood', 'Steel', 'Concrete', etc.
    Description TEXT,
    Unit VARCHAR(50), -- 'ton', 'board-foot', 'sqm', etc.
    PricePerUnit DECIMAL(10, 2),
    Currency VARCHAR(3) DEFAULT 'USD',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);

CREATE INDEX idx_products_supplier ON Products(SupplierID);
CREATE INDEX idx_products_category ON Products(Category);

-- RFQs (Request for Quote - buyer initiated)
CREATE TABLE IF NOT EXISTS RFQs (
    RFQID SERIAL PRIMARY KEY,
    BuyerID INTEGER NOT NULL,
    SupplierID INTEGER NOT NULL,
    ProductID INTEGER,
    ProjectName VARCHAR(255),
    Message TEXT,
    QuantityNeeded DECIMAL(10, 2),
    Unit VARCHAR(50),
    BudgetRange VARCHAR(100), -- e.g., "$1000-$5000"
    DeadlineDate DATE,
    Status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Responded', 'Accepted', 'Cancelled', 'Expired'
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BuyerID) REFERENCES Buyers(BuyerID) ON DELETE CASCADE,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE SET NULL
);

CREATE INDEX idx_rfqs_buyer ON RFQs(BuyerID);
CREATE INDEX idx_rfqs_supplier ON RFQs(SupplierID);
CREATE INDEX idx_rfqs_status ON RFQs(Status);
CREATE INDEX idx_rfqs_created ON RFQs(CreatedAt);

-- RFQ Responses (supplier's quotes)
CREATE TABLE IF NOT EXISTS RFQ_Responses (
    ResponseID SERIAL PRIMARY KEY,
    RFQID INTEGER NOT NULL,
    SupplierID INTEGER NOT NULL,
    QuotedPrice DECIMAL(10, 2) NOT NULL,
    Currency VARCHAR(3) DEFAULT 'USD',
    LeadTimeDays INTEGER,
    Message TEXT,
    AttachmentURLs TEXT[], -- Array of URLs
    Status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Declined'
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (RFQID) REFERENCES RFQs(RFQID) ON DELETE CASCADE,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);

CREATE INDEX idx_rfq_responses_rfq ON RFQ_Responses(RFQID);
CREATE INDEX idx_rfq_responses_supplier ON RFQ_Responses(SupplierID);
CREATE INDEX idx_rfq_responses_status ON RFQ_Responses(Status);

-- Supplier Verification Scores (cached)
CREATE TABLE IF NOT EXISTS Supplier_Verification_Scores (
    ScoreID SERIAL PRIMARY KEY,
    SupplierID INTEGER NOT NULL UNIQUE,
    Score DECIMAL(5, 2), -- 0-100
    Certifications INTEGER DEFAULT 0,
    ResponseRate DECIMAL(5, 2) DEFAULT 0,
    QuoteAccuracy DECIMAL(5, 2) DEFAULT 0,
    OnTimeDelivery DECIMAL(5, 2) DEFAULT 0,
    LastComputedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);

CREATE INDEX idx_verification_scores_supplier ON Supplier_Verification_Scores(SupplierID);
CREATE INDEX idx_verification_scores_score ON Supplier_Verification_Scores(Score);

-- Notification Log (email/message tracking)
CREATE TABLE IF NOT EXISTS Notification_Log (
    NotificationID SERIAL PRIMARY KEY,
    NotificationType VARCHAR(100), -- 'rfq_new', 'rfq_response', 'buyer_confirmation', etc.
    Recipient VARCHAR(255) NOT NULL,
    Subject VARCHAR(255),
    MessageBody TEXT,
    Status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'skipped'
    ErrorMessage TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    SentAt TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON Notification_Log(Recipient);
CREATE INDEX idx_notifications_status ON Notification_Log(Status);
CREATE INDEX idx_notifications_created ON Notification_Log(CreatedAt);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with UpdatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON Users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON Companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON Suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_profiles_updated_at BEFORE UPDATE ON Supplier_Profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyers_updated_at BEFORE UPDATE ON Buyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON Products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON RFQs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfq_responses_updated_at BEFORE UPDATE ON RFQ_Responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - remove for production)
-- ============================================

-- INSERT INTO Companies (CompanyName, Address) VALUES ('GreenMaterials Inc', '123 Oak St, Portland, OR');
-- INSERT INTO Suppliers (CompanyID) VALUES (1);
-- INSERT INTO Users (Email, PasswordHash, FirstName, LastName, Role, CompanyID) VALUES ('admin@greenchainz.com', 'hashed_pwd', 'Green', 'Admin', 'Admin', NULL);

COMMIT;
