const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { general: generalRateLimit } = require('../middleware/rateLimit');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
    return str && UUID_REGEX.test(str);
}

// ============================================
// GET /api/v2/suppliers/:supplierId/inbox
// ============================================
router.get('/:supplierId/inbox', authenticateToken, generalRateLimit, async (req, res) => {
    const { supplierId } = req.params;
    if (!isValidUUID(supplierId)) return res.status(400).json({ error: 'Invalid supplier ID' });

    const client = await pool.connect();
    try {
        const supplierRes = await client.query('SELECT id, email FROM suppliers WHERE id = $1', [supplierId]);
        if (supplierRes.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const supplier = supplierRes.rows[0];
        if (supplier.email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const inboxRes = await client.query(
            `
        SELECT q.*, d.visible_at, d.status as queue_status
        FROM "RFQ_Distribution_Queue" d
        JOIN rfqs q ON q.id = d.rfq_id
        WHERE d.supplier_id = $1
        ORDER BY d.visible_at DESC
      `,
            [supplierId]
        );

        res.json({ success: true, inbox: inboxRes.rows });
    } catch (error) {
        console.error('Supplier Inbox Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inbox' });
    } finally {
        client.release();
    }
});

module.exports = router;
