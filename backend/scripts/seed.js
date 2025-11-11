const { pool } = require('../db');

async function seed() {
    try {
        console.log('Seeding demo data...');

        // 1) Create a company
        const companyRes = await pool.query(
            `INSERT INTO Companies (CompanyName, Address) VALUES ($1, $2) RETURNING CompanyID`,
            ['EcoTimber Northwest', '456 Timber Rd, Eugene, OR']
        );
        const companyId = companyRes.rows[0].companyid;

        // 2) Create supplier
        const supplierRes = await pool.query(
            `INSERT INTO Suppliers (CompanyID) VALUES ($1) RETURNING SupplierID`,
            [companyId]
        );
        const supplierId = supplierRes.rows[0].supplierid;

        // 3) Supplier profile
        await pool.query(
            `INSERT INTO Supplier_Profiles (SupplierID, Description, ESG_Summary) VALUES ($1, $2, $3)`,
            [supplierId, 'Regional sustainable wood products supplier', 'FSC sourcing, low-waste milling, local sourcing']
        );

        // 4) Insert certification (upsert) and link
        const certRes = await pool.query(
            `INSERT INTO Certifications (Name, CertifyingBody)
       VALUES ($1, $2)
       ON CONFLICT (Name, CertifyingBody) DO UPDATE SET Name = EXCLUDED.Name
       RETURNING CertificationID`,
            ['FSC Certified', 'Forest Stewardship Council']
        );
        const certId = certRes.rows[0].certificationid;

        await pool.query(
            `INSERT INTO Supplier_Certifications (SupplierID, CertificationID, IssueDate, ExpiryDate, Status)
       VALUES ($1, $2, $3, $4, 'Valid')`,
            [supplierId, certId, '2024-01-15', '2026-01-15']
        );

        console.log('Seed complete. CompanyID:', companyId, 'SupplierID:', supplierId);
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

seed();
