-- GreenChainz MVP Core Schema (idempotent)
-- Companies
CREATE TABLE IF NOT EXISTS Companies (
  CompanyID BIGSERIAL PRIMARY KEY,
  CompanyName VARCHAR(255),
  Address TEXT
);

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
