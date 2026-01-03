const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { distributeRFQ } = require('../services/rfq/distributor');
const RateLimit = require('express-rate-limit');

const rfqLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 RFQ creation requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Optional protection: if INTERNAL_API_KEY is set, require it.
function requireInternalKey(req, res, next) {
  const required = process.env.INTERNAL_API_KEY;
  if (!required) return next();
  const provided = req.header('x-internal-key');
  if (!provided || provided !== required) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

router.use(requireInternalKey);

// Create an RFQ in the UUID simulator schema and distribute it.
router.post('/rfqs', rfqLimiter, async (req, res) => {
  const {
    buyer_email,
    product_id,
    supplier_id,
    project_name,
    category,
    budget,
    message,
    project_details
  } = req.body || {};

  if (!buyer_email) return res.status(400).json({ error: 'buyer_email is required' });
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const insert = await pool.query(
      `INSERT INTO rfqs (buyer_email, product_id, supplier_id, project_name, category, budget, message, project_details, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open')
       RETURNING id`,
      [
        buyer_email,
        product_id || null,
        supplier_id || null,
        project_name || null,
        category || null,
        budget ?? null,
        message,
        project_details || null
      ]
    );

    const rfqId = insert.rows[0].id;
    await distributeRFQ(rfqId);
    return res.status(201).json({ id: rfqId, status: 'open' });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to create/distribute RFQ:', e);
    return res.status(500).json({ error: 'Failed to create RFQ', details: e.message });
  }
});

// Get the supplier inbox based on the view (what is visible now)
router.get('/suppliers/:supplierId/inbox', async (req, res) => {
  const { supplierId } = req.params;
  try {
    const result = await pool.query(
      `SELECT *
       FROM rfq_supplier_inbox
       WHERE supplier_id = $1
       ORDER BY visible_at DESC
       LIMIT 200`,
      [supplierId]
    );
    return res.json({ count: result.rows.length, items: result.rows });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch inbox:', e);
    return res.status(500).json({ error: 'Failed to fetch inbox', details: e.message });
  }
});

// Claim due notifications (worker-friendly endpoint)
router.post('/queue/claim', async (req, res) => {
  const limit = Number(req.body?.limit ?? 100);
  try {
    const result = await pool.query('SELECT * FROM gc_claim_due_notifications($1)', [limit]);
    return res.json({ count: result.rows.length, claimed: result.rows });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to claim due notifications:', e);
    return res.status(500).json({ error: 'Failed to claim', details: e.message });
  }
});

module.exports = router;

