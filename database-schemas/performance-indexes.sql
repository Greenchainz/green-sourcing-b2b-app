-- Performance Optimization Indexes for GreenChainz Database
-- These indexes improve query performance for common operations
-- Run this script after initial schema setup

-- ============================================
-- USER AND AUTHENTICATION INDEXES
-- ============================================

-- Speed up login queries by email
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);

-- Speed up password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON Users(ResetToken) WHERE ResetToken IS NOT NULL;

-- Speed up user role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(Role);

-- ============================================
-- SUPPLIER AND COMPANY INDEXES
-- ============================================

-- Speed up supplier lookups by company
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON Suppliers(CompanyID);

-- Speed up company name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_companies_name_lower ON Companies(LOWER(CompanyName));

-- Speed up location-based searches
CREATE INDEX IF NOT EXISTS idx_companies_address ON Companies(Address);

-- ============================================
-- CERTIFICATION INDEXES
-- ============================================

-- Speed up certification lookups by supplier
CREATE INDEX IF NOT EXISTS idx_supplier_certs_supplier_id ON Supplier_Certifications(SupplierID);

-- Speed up certification status queries
CREATE INDEX IF NOT EXISTS idx_supplier_certs_status ON Supplier_Certifications(Status);

-- Speed up expiry date filtering
CREATE INDEX IF NOT EXISTS idx_supplier_certs_expiry ON Supplier_Certifications(ExpiryDate);

-- Composite index for certification searches
CREATE INDEX IF NOT EXISTS idx_supplier_certs_supplier_status 
    ON Supplier_Certifications(SupplierID, Status, ExpiryDate);

-- Speed up FSC certification lookups
CREATE INDEX IF NOT EXISTS idx_fsc_certs_supplier_id ON FSC_Certifications(SupplierID);

-- Speed up FSC status queries
CREATE INDEX IF NOT EXISTS idx_fsc_certs_status ON FSC_Certifications(CertificateStatus);

-- Composite index for FSC verification queries
CREATE INDEX IF NOT EXISTS idx_fsc_certs_supplier_status 
    ON FSC_Certifications(SupplierID, CertificateStatus, ExpiryDate);

-- ============================================
-- RFQ (REQUEST FOR QUOTE) INDEXES
-- ============================================

-- Speed up RFQ lookups by buyer
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_id ON RFQs(BuyerID);

-- Speed up RFQ lookups by supplier
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier_id ON RFQs(SupplierID);

-- Speed up RFQ status filtering
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON RFQs(Status);

-- Composite index for supplier dashboard queries
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier_status 
    ON RFQs(SupplierID, Status, CreatedAt DESC);

-- Composite index for buyer dashboard queries
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_status 
    ON RFQs(BuyerID, Status, CreatedAt DESC);

-- Speed up RFQ response lookups
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq_id ON RFQ_Responses(RFQID);

-- Speed up supplier response queries
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier_id ON RFQ_Responses(SupplierID);

-- Speed up response status filtering
CREATE INDEX IF NOT EXISTS idx_rfq_responses_status ON RFQ_Responses(Status);

-- ============================================
-- BUYER INDEXES
-- ============================================

-- Speed up buyer lookups by user
CREATE INDEX IF NOT EXISTS idx_buyers_user_id ON Buyers(UserID);

-- Speed up buyer company associations
CREATE INDEX IF NOT EXISTS idx_buyers_company_id ON Buyers(CompanyID);

-- ============================================
-- PRODUCT INDEXES
-- ============================================

-- Speed up product searches by name
CREATE INDEX IF NOT EXISTS idx_products_name ON Products(Name);

-- Speed up supplier product listings
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON Products(SupplierID);

-- ============================================
-- NOTIFICATION INDEXES
-- ============================================

-- Speed up notification log queries by recipient
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON Notification_Log(Recipient);

-- Speed up notification status filtering
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON Notification_Log(Status);

-- Speed up notification type queries
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON Notification_Log(NotificationType);

-- Composite index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_notification_log_status_created 
    ON Notification_Log(Status, CreatedAt DESC);

-- ============================================
-- VERIFICATION SCORE INDEXES
-- ============================================

-- Speed up score lookups (already has unique constraint on SupplierID)
-- No additional index needed - unique constraint provides index

-- Speed up score ordering queries
CREATE INDEX IF NOT EXISTS idx_verification_scores_score 
    ON Supplier_Verification_Scores(Score DESC);

-- ============================================
-- STATISTICS AND MONITORING
-- ============================================

-- Analyze tables to update query planner statistics
ANALYZE Users;
ANALYZE Companies;
ANALYZE Suppliers;
ANALYZE Supplier_Certifications;
ANALYZE FSC_Certifications;
ANALYZE RFQs;
ANALYZE RFQ_Responses;
ANALYZE Buyers;
ANALYZE Products;
ANALYZE Notification_Log;
ANALYZE Supplier_Verification_Scores;

-- ============================================
-- MAINTENANCE NOTES
-- ============================================
-- 1. Run ANALYZE periodically (weekly or after bulk data changes)
-- 2. Monitor index usage with: 
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
-- 3. Remove unused indexes to save storage and write performance
-- 4. Consider REINDEX if indexes become bloated over time
