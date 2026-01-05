const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { distributeRFQ } = require('../services/rfq/distributor');
const { updateResponseMetrics } = require('../services/rfq/metrics');
const rateLimit = require('../middleware/rateLimit');
const requireInternalKey = require('../middleware/internalKey');

// Apply internal key protection to all routes
router.use(requireInternalKey);

// ============================================
// VALIDATION HELPERS
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return str && UUID_REGEX.test(str);
}

function isValidEmail(email) {
  return email && typeof email === 'string' && email.includes('@') && email.length <= 255;
}

function sanitizeBudget(budget) {
  if (budget === null || budget === undefined) return null;
  const num = Number(budget);
  return isNaN(num) || num < 0 ? null : num;
}

// ============================================
// POST /rfqs - Create RFQ and distribute
// ============================================

router.post('/rfqs', rateLimit.simulator, async (req, res) => {
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

  // Validate required fields
  if (!isValidEmail(buyer_email)) {
    return res.status(400).json({ error: 'Valid buyer_email is required' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'message is required' });
  }

  // Validate optional UUIDs
  if (product_id && !isValidUUID(product_id)) {
    return res.status(400).json({ error: 'Invalid product_id format (must be UUID)' });
  }
  if (supplier_id && !isValidUUID(supplier_id)) {
    return res.status(400).json({ error: 'Invalid supplier_id format (must be UUID)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert RFQ into canonical schema (lowercase table name)
    const insert = await client.query(
      `INSERT INTO rfqs (buyer_email, product_id, supplier_id, project_name, category, budget, message, project_details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
       RETURNING id, created_at`,
      [
        buyer_email.trim().toLowerCase(),
        product_id || null,
        supplier_id || null,
        project_name ? project_name.trim() : null,
        category ? category.trim() : null,
        sanitizeBudget(budget),
        message.trim(),
        project_details ? JSON.stringify(project_details) : null
      ]
    );

    const rfqId = insert.rows[0].id;
    const createdAt = insert.rows[0].created_at;

    await client.query('COMMIT');

    // Distribute RFQ asynchronously (don't block response)
    distributeRFQ(rfqId).catch(err => {
      console.error(`Background distribution failed for RFQ ${rfqId}:`, err.message);
    });

    return res.status(201).json({
      id: rfqId,
      status: 'open',
      created_at: createdAt,
      distributed: true
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to create RFQ:', e);
    return res.status(500).json({ error: 'Failed to create RFQ', details: e.message });
  } finally {
    client.release();
  }
});

// ============================================
// GET /rfqs/:rfqId - Get RFQ details
// ============================================

router.get('/rfqs/:rfqId', rateLimit.simulator, async (req, res) => {
  const { rfqId } = req.params;

  if (!isValidUUID(rfqId)) {
    return res.status(400).json({ error: 'Invalid rfqId format (must be UUID)' });
  }

  try {
    const result = await pool.query(
      `SELECT id, buyer_email, product_id, supplier_id, project_name, category, 
              budget, message, project_details, status, created_at, updated_at
       FROM rfqs
       WHERE id = $1`,
      [rfqId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    return res.json(result.rows[0]);
  } catch (e) {
    console.error('Failed to fetch RFQ:', e);
    return res.status(500).json({ error: 'Failed to fetch RFQ', details: e.message });
  }
});

// ============================================
// GET /suppliers/:supplierId/inbox - Supplier's visible RFQs
// ============================================

router.get('/suppliers/:supplierId/inbox', rateLimit.inbox, async (req, res) => {
  const { supplierId } = req.params;

  if (!isValidUUID(supplierId)) {
    return res.status(400).json({ error: 'Invalid supplierId format (must be UUID)' });
  }

  try {
    // Use the rfq_supplier_inbox view (created by canonical schema)
    const result = await pool.query(
      `SELECT supplier_id, rfq_id, wave_number, visible_at, expires_at,
              queue_status, project_name, category, budget, rfq_created_at
       FROM rfq_supplier_inbox
       WHERE supplier_id = $1
       ORDER BY visible_at DESC
       LIMIT 200`,
      [supplierId]
    );
    return res.json({ count: result.rows.length, items: result.rows });
  } catch (e) {
    console.error('Failed to fetch inbox:', e);
    return res.status(500).json({ error: 'Failed to fetch inbox', details: e.message });
  }
});

// ============================================
// POST /queue/claim - Claim due notifications (worker endpoint)
// ============================================

router.post('/queue/claim', rateLimit.queueClaim, async (req, res) => {
  const rawLimit = req.body?.limit;
  const limit = Math.min(Math.max(Number(rawLimit) || 100, 1), 500); // Clamp between 1-500

  try {
    // Use the gc_claim_due_notifications function (atomic, safe for concurrent workers)
    const result = await pool.query(
      'SELECT * FROM gc_claim_due_notifications($1)',
      [limit]
    );
    return res.json({
      count: result.rows.length,
      claimed: result.rows
    });
  } catch (e) {
    console.error('Failed to claim due notifications:', e);
    return res.status(500).json({ error: 'Failed to claim', details: e.message });
  }
});

// ============================================
// POST /queue/expire - Expire old queue entries (worker endpoint)
// ============================================

router.post('/queue/expire', rateLimit.queueClaim, async (req, res) => {
  try {
    const result = await pool.query('SELECT gc_expire_queue_entries() AS expired_count');
    return res.json({
      expired: result.rows[0]?.expired_count || 0
    });
  } catch (e) {
    console.error('Failed to expire queue entries:', e);
    return res.status(500).json({ error: 'Failed to expire', details: e.message });
  }
});

// ============================================
// POST /suppliers/:supplierId/respond - Mark supplier responded
// ============================================

router.post('/suppliers/:supplierId/respond', rateLimit.simulator, async (req, res) => {
  const { supplierId } = req.params;
  const { rfq_id } = req.body || {};

  if (!isValidUUID(supplierId)) {
    return res.status(400).json({ error: 'Invalid supplierId format (must be UUID)' });
  }
  if (!isValidUUID(rfq_id)) {
    return res.status(400).json({ error: 'Invalid rfq_id format (must be UUID)' });
  }

  try {
    // Use atomic function to mark as responded
    const result = await pool.query(
      'SELECT gc_mark_queue_responded($1, $2) AS success',
      [rfq_id, supplierId]
    );

    const success = result.rows[0]?.success === true;

    if (success) {
      // Update metrics asynchronously
      updateResponseMetrics(supplierId).catch(err => {
        console.error(`Background metrics update failed for supplier ${supplierId}:`, err.message);
      });
    }

    return res.json({
      success,
      message: success ? 'Response recorded' : 'No matching queue entry found or already responded'
    });
  } catch (e) {
    console.error('Failed to record response:', e);
    return res.status(500).json({ error: 'Failed to record response', details: e.message });
  }
});

// ============================================
// GET /metrics/:supplierId - Get supplier response metrics
// ============================================

router.get('/metrics/:supplierId', rateLimit.inbox, async (req, res) => {
  const { supplierId } = req.params;

  if (!isValidUUID(supplierId)) {
    return res.status(400).json({ error: 'Invalid supplierId format (must be UUID)' });
  }

  try {
    const result = await pool.query(
      `SELECT supplier_id, response_rate, avg_response_time_minutes,
              win_rate, total_rfqs_received, total_responses, last_updated
       FROM "Supplier_Response_Metrics"
       WHERE supplier_id = $1`,
      [supplierId]
    );

    if (result.rows.length === 0) {
      return res.json({
        supplier_id: supplierId,
        response_rate: 0,
        avg_response_time_minutes: 0,
        total_rfqs_received: 0,
        total_responses: 0
      });
    }

    return res.json(result.rows[0]);
  } catch (e) {
    console.error('Failed to fetch metrics:', e);
    return res.status(500).json({ error: 'Failed to fetch metrics', details: e.message });
  }
});

// ============================================
// POST /metrics/:supplierId/refresh - Refresh supplier metrics
// ============================================

router.post('/metrics/:supplierId/refresh', rateLimit.simulator, async (req, res) => {
  const { supplierId } = req.params;

  if (!isValidUUID(supplierId)) {
    return res.status(400).json({ error: 'Invalid supplierId format (must be UUID)' });
  }

  try {
    await updateResponseMetrics(supplierId);
    return res.json({ success: true, message: 'Metrics refreshed' });
  } catch (e) {
    console.error('Failed to refresh metrics:', e);
    return res.status(500).json({ error: 'Failed to refresh metrics', details: e.message });
  }
});

module.exports = router;

