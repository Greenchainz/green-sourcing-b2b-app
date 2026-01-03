const { pool } = require('../db');
const { distributeRFQ } = require('../services/rfq/distributor');

async function seedRfqSimulator() {
  const client = await pool.connect();
  try {
    console.log('Seeding RFQ simulator (UUID schema)...');
    await client.query('BEGIN');

    // 1) Suppliers (tiers for wave simulation)
    const s1 = await client.query(
      `INSERT INTO suppliers (name, email, tier, latitude, longitude, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Evergreen Timber Co', 'sales@evergreen.example', 'enterprise', 47.6062, -122.3321, 'Seattle, WA']
    );
    const s2 = await client.query(
      `INSERT INTO suppliers (name, email, tier, latitude, longitude, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Cascade Materials', 'quotes@cascade.example', 'pro', 45.5152, -122.6784, 'Portland, OR']
    );
    const s3 = await client.query(
      `INSERT INTO suppliers (name, email, tier, latitude, longitude, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Local Salvage Supply', 'hello@salvage.example', 'free', 37.7749, -122.4194, 'San Francisco, CA']
    );

    const supplierIds = [s1.rows[0].id, s2.rows[0].id, s3.rows[0].id];

    // 2) Products
    const p1 = await client.query(
      `INSERT INTO products (supplier_id, name, material_type, certifications, verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [supplierIds[0], 'FSC Douglas Fir Glulam', 'wood', ['FSC', 'EPD'], true]
    );
    await client.query(
      `INSERT INTO products (supplier_id, name, material_type, certifications, verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [supplierIds[1], 'Low-Carbon CLT Panels', 'wood', ['FSC', 'EPD'], true]
    );
    await client.query(
      `INSERT INTO products (supplier_id, name, material_type, certifications, verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [supplierIds[2], 'Reclaimed Structural Lumber', 'wood', ['FSC'], false]
    );

    const productId = p1.rows[0].id;

    // 3) RFQ (with location + certification requirements in JSONB)
    const rfq = await client.query(
      `INSERT INTO rfqs (buyer_email, product_id, message, project_name, category, budget, status, project_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        'architect@demo.example',
        productId,
        'Need 1,000 sqft of engineered wood with FSC + EPD for a mid-rise project.',
        'Downtown Mid-Rise',
        'wood',
        250000,
        'open',
        {
          certifications: ['FSC', 'EPD'],
          latitude: 47.61,
          longitude: -122.33
        }
      ]
    );

    const rfqId = rfq.rows[0].id;

    await client.query('COMMIT');

    // 4) Create distribution waves (outside transaction)
    await distributeRFQ(rfqId);

    console.log('✅ Seed complete.');
    console.log('RFQ ID:', rfqId);
    process.exit(0);
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    console.error('❌ Seed failed:', e);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedRfqSimulator();

