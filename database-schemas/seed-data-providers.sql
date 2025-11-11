-- ============================================
-- SEED DATA FOR DATA PROVIDER INTEGRATION
-- Insert 10 priority data providers
-- ============================================

-- Priority P0 Providers (Free, Critical)
INSERT INTO Data_Providers (ProviderName, ProviderType, AccessType, APIEndpoint, APIDocumentation, ContactEmail, Priority, Status, MonthlyCost, Notes)
VALUES 
(
  'Building Transparency (EC3)',
  'Carbon',
  'FREE',
  'https://api.buildingtransparency.org',
  'https://buildingtransparency.org/ec3/api',
  'info@buildingtransparency.org',
  'P0',
  'Active',
  0.00,
  'Free API access. Embodied carbon database (EC3) with 15,000+ materials. Real-time carbon lookups. CRITICAL for architect workflows.'
),
(
  'EPD International',
  'EPD',
  'FREE',
  'https://www.environdec.com',
  'https://www.environdec.com/resources',
  'info@environdec.com',
  'P0',
  'Active',
  0.00,
  'Free EPD database. Industry standard. 2,000+ EPDs. Bulk CSV download available. Email for API access.'
),
(
  'Forest Stewardship Council (FSC)',
  'FSC',
  'FREE',
  'https://fsc.org/en/certificate-search',
  'https://fsc.org/en/resources/data',
  'info@us.fsc.org',
  'P0',
  'Active',
  0.00,
  'Free public certificate directory. Real-time verification. Group certification program for suppliers (40% discount). Email for bulk access.'
);

-- Priority P1 Providers (Free, High Value)
INSERT INTO Data_Providers (ProviderName, ProviderType, AccessType, APIEndpoint, APIDocumentation, ContactEmail, Priority, Status, MonthlyCost, Notes)
VALUES 
(
  'B Corporation',
  'B-Corp',
  'EMAIL/REQUEST',
  NULL,
  'https://www.bcorporation.net/en-us/find-a-b-corp',
  'data@bcorporation.net',
  'P1',
  'Active',
  0.00,
  'Free B Corp directory. Request CSV export. Impact scores + certification status. Supplier differentiation.'
),
(
  'USGBC / LEED',
  'Construction',
  'FREE',
  'https://www.usgbc.org',
  'https://www.usgbc.org/resources',
  'leedinfo@usgbc.org',
  'P1',
  'Active',
  0.00,
  'Free LEED credit documentation. Material health declarations. Credit contribution calculator. Email for product database access.'
),
(
  'Cradle to Cradle Products Innovation Institute',
  'Certifications',
  'FREE',
  'https://www.c2ccertified.org',
  'https://www.c2ccertified.org/resources',
  'info@c2ccertified.org',
  'P1',
  'Active',
  0.00,
  'Free certified product registry. Material health scores. 5-level certification (Basic to Platinum). Request bulk data export.'
),
(
  'Green Seal',
  'Eco-Labels',
  'FREE',
  'https://greenseal.org',
  'https://greenseal.org/certified-products-services',
  'greenseal@greenseal.org',
  'P1',
  'Active',
  0.00,
  'Free certified product database. Focus on cleaning, paints, building products. Download product list.'
);

-- Priority P2 Providers (Paid, Defer to Month 6+)
INSERT INTO Data_Providers (ProviderName, ProviderType, AccessType, APIEndpoint, APIDocumentation, ContactEmail, Priority, Status, MonthlyCost, Notes)
VALUES 
(
  'WAP Sustainability',
  'LCA',
  'PAID',
  'https://www.wapsustainability.com',
  'https://www.wapsustainability.com/api-docs',
  'info@wapsustainability.com',
  'P2',
  'Pending',
  500.00,
  'Comprehensive LCA database. $500/month (defer to Month 6 post-break-even). 50,000+ products. Full lifecycle data.'
);

-- Priority P3 Providers (Paid/Partnership, Long-term)
INSERT INTO Data_Providers (ProviderName, ProviderType, AccessType, APIEndpoint, APIDocumentation, ContactEmail, Priority, Status, MonthlyCost, Notes)
VALUES 
(
  'Autodesk Construction Cloud',
  'Construction',
  'PARTNERSHIP',
  'https://forge.autodesk.com',
  'https://forge.autodesk.com/en/docs/',
  'forge.help@autodesk.com',
  'P3',
  'Pending',
  0.00,
  'BIM integration via Forge API. Partnership opportunity. Material specs sync. Potential co-marketing. Long-term strategic.'
),
(
  'SimaPro / Ecochain',
  'EPD/LCA Database',
  'PAID',
  'https://ecochain.com',
  'https://ecochain.com/api',
  'info@ecochain.com',
  'P3',
  'Pending',
  1200.00,
  'Most comprehensive LCA database. $1,200+/month. 10,000+ datasets. Enterprise-grade. Defer to Year 2 (established revenue).'
);

-- ============================================
-- VERIFICATION: Check inserted providers
-- ============================================
-- Run this query to verify:
-- SELECT ProviderID, ProviderName, ProviderType, AccessType, Priority, MonthlyCost, Status 
-- FROM Data_Providers 
-- ORDER BY 
--   CASE Priority 
--     WHEN 'P0' THEN 1 
--     WHEN 'P1' THEN 2 
--     WHEN 'P2' THEN 3 
--     WHEN 'P3' THEN 4 
--   END, 
--   ProviderName;

-- ============================================
-- BUDGET SUMMARY
-- ============================================
-- Year 1 Total: $500 (WAP Sustainability from Month 6 only)
-- P0 (3 providers): $0 - Building Transparency, EPD International, FSC
-- P1 (4 providers): $0 - B Corp, LEED, C2C, Green Seal  
-- P2 (1 provider): $500/mo starting Month 6 - WAP Sustainability
-- P3 (2 providers): $0 Year 1 - Autodesk (partnership), SimaPro (defer to Year 2)
--
-- Month 1-5: $0/month (7 free providers)
-- Month 6-12: $500/month (WAP only, post-break-even)
-- Year 2+: $1,700/month (add SimaPro when revenue stabilizes)
