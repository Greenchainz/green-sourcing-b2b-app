const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { pool } = require('./db');

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3001); // Port for our backend API

// Initialize database schema on startup (idempotent)
async function initSchema() {
  const schemaPath = path.resolve(__dirname, '../database-schemas/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Database schema ensured.');
  } finally {
    client.release();
  }
}

// Routes
app.get('/', (req, res) => {
  res.send('GreenChainz Backend API is running!');
});

// POST /api/v1/suppliers - create Company, Supplier, Supplier_Profile in a single transaction
app.post('/api/v1/suppliers', async (req, res) => {
  const { companyName, address, description, esgSummary } = req.body || {};
  if (!companyName) {
    return res.status(400).json({ error: 'companyName is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const companyResult = await client.query(
      'INSERT INTO Companies (CompanyName, Address) VALUES ($1, $2) RETURNING CompanyID',
      [companyName, address || null]
    );
    const companyId = companyResult.rows[0].companyid;

    const supplierResult = await client.query(
      'INSERT INTO Suppliers (CompanyID) VALUES ($1) RETURNING SupplierID',
      [companyId]
    );
    const supplierId = supplierResult.rows[0].supplierid;

    const profileResult = await client.query(
      'INSERT INTO Supplier_Profiles (SupplierID, Description, ESG_Summary) VALUES ($1, $2, $3) RETURNING ProfileID',
      [supplierId, description || null, esgSummary || null]
    );
    const profileId = profileResult.rows[0].profileid;

    await client.query('COMMIT');

    return res.status(201).json({
      companyId,
      supplierId,
      profileId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating supplier onboarding entities:', err);
    return res.status(500).json({ error: 'Failed to create supplier' });
  } finally {
    client.release();
  }
});

// GET /api/v1/suppliers/:supplierId/profile - sustainability passport
app.get('/api/v1/suppliers/:supplierId/profile', async (req, res) => {
  const supplierId = Number(req.params.supplierId);
  if (!Number.isFinite(supplierId)) {
    return res.status(400).json({ error: 'Invalid supplierId' });
  }

  const client = await pool.connect();
  try {
    const details = await client.query(
      `SELECT s.SupplierID, c.CompanyID, c.CompanyName, c.Address,
              p.ProfileID, p.Description, p.ESG_Summary
       FROM Suppliers s
       JOIN Companies c ON s.CompanyID = c.CompanyID
       LEFT JOIN Supplier_Profiles p ON p.SupplierID = s.SupplierID
       WHERE s.SupplierID = $1`,
      [supplierId]
    );

    if (details.rowCount === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const row = details.rows[0];

    const certs = await client.query(
      `SELECT sc.SupplierCertificationID, sc.CertificateNumber, sc.IssueDate, sc.ExpiryDate, sc.Status,
              cert.CertificationID, cert.Name, cert.CertifyingBody
       FROM Supplier_Certifications sc
       JOIN Certifications cert ON cert.CertificationID = sc.CertificationID
       WHERE sc.SupplierID = $1
       ORDER BY sc.IssueDate NULLS LAST`,
      [supplierId]
    );

    const payload = {
      supplierId: row.supplierid,
      company: {
        companyId: row.companyid,
        name: row.companyname,
        address: row.address
      },
      profile: row.profileid
        ? {
          profileId: row.profileid,
          description: row.description,
          esgSummary: row.esg_summary
        }
        : null,
      certifications: certs.rows.map((r) => ({
        supplierCertificationId: r.suppliercertificationid,
        certificationId: r.certificationid,
        name: r.name,
        certifyingBody: r.certifyingbody,
        certificateNumber: r.certificatenumber,
        issueDate: r.issuedate,
        expiryDate: r.expirydate,
        status: r.status
      }))
    };

    return res.json(payload);
  } catch (err) {
    console.error('Error fetching supplier profile:', err);
    return res.status(500).json({ error: 'Failed to fetch supplier profile' });
  } finally {
    client.release();
  }
});

// POST /api/v1/suppliers/:supplierId/certifications - add or link certification
app.post('/api/v1/suppliers/:supplierId/certifications', async (req, res) => {
  const supplierId = Number(req.params.supplierId);
  if (!Number.isFinite(supplierId)) {
    return res.status(400).json({ error: 'Invalid supplierId' });
  }

  const {
    certificationId,
    certificationName,
    certifyingBody,
    certificateNumber,
    issueDate,
    expiryDate,
    status
  } = req.body || {};

  if (!certificationId && !(certificationName && certifyingBody)) {
    return res.status(400).json({
      error: 'Provide certificationId or (certificationName and certifyingBody)'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure supplier exists
    const exists = await client.query('SELECT 1 FROM Suppliers WHERE SupplierID = $1', [supplierId]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Supplier not found' });
    }

    let effectiveCertificationId = certificationId;
    if (!effectiveCertificationId) {
      const upsert = await client.query(
        `INSERT INTO Certifications (Name, CertifyingBody)
         VALUES ($1, $2)
         ON CONFLICT (Name, CertifyingBody)
         DO UPDATE SET Name = EXCLUDED.Name
         RETURNING CertificationID`,
        [certificationName, certifyingBody]
      );
      effectiveCertificationId = upsert.rows[0].certificationid;
    }

    const inserted = await client.query(
      `INSERT INTO Supplier_Certifications
         (SupplierID, CertificationID, CertificateNumber, IssueDate, ExpiryDate, Status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING SupplierCertificationID`,
      [
        supplierId,
        effectiveCertificationId,
        certificateNumber || null,
        issueDate || null,
        expiryDate || null,
        status || null
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      supplierCertificationId: inserted.rows[0].suppliercertificationid,
      supplierId,
      certificationId: effectiveCertificationId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding supplier certification:', err);
    return res.status(500).json({ error: 'Failed to add certification' });
  } finally {
    client.release();
  }
});

// Start server after ensuring schema
initSchema()
  .catch((err) => {
    console.error('Schema init failed:', err);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
    });
  });

