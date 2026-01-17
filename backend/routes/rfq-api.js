const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { distributeRFQ } = require('../services/rfq/distributor');
const {
    rfq: rfqRateLimit,
    general: generalRateLimit
} = require('../middleware/rateLimit');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// VALIDATION HELPERS
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
    return str && UUID_REGEX.test(str);
}

async function getSupplierIdByEmail(client, email) {
    if (!email) return null;
    const supplierRes = await client.query('SELECT id FROM suppliers WHERE email = $1', [email]);
    return supplierRes.rows[0]?.id || null;
}

async function supplierHasAccess(client, rfqId, supplierId) {
    const accessRes = await client.query(
        'SELECT 1 FROM "RFQ_Distribution_Queue" WHERE rfq_id = $1 AND supplier_id = $2',
        [rfqId, supplierId]
    );
    return accessRes.rows.length > 0;
}

// ============================================
// POST /api/v2/rfqs - Create RFQ (Architect)
// ============================================
router.post('/', authenticateToken, rfqRateLimit, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            title,
            description,
            category,
            deadline,
            supplier_ids,
            attachments
        } = req.body;

        const buyerEmail = req.user?.email;
        if (!buyerEmail) {
            return res.status(401).json({ error: 'User email required from auth token' });
        }

        if (!title || typeof title !== 'string') {
            return res.status(400).json({ error: 'title is required' });
        }

        const details = {
            deadline: deadline || null,
            attachments: Array.isArray(attachments) ? attachments : [],
            supplier_ids: Array.isArray(supplier_ids) ? supplier_ids : []
        };

        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO rfqs (
                buyer_email,
                project_name,
                category,
                message,
                project_details,
                status
            )
            VALUES ($1, $2, $3, $4, $5, 'open')
            RETURNING id, status, created_at
        `;

        const result = await client.query(insertQuery, [
            buyerEmail,
            title,
            category || null,
            description || null,
            JSON.stringify(details)
        ]);

        const rfqId = result.rows[0].id;

        // Optional: preload supplier invites into queue
        const supplierIds = Array.isArray(supplier_ids)
            ? supplier_ids.filter((id) => isValidUUID(id))
            : [];

        if (supplierIds.length > 0) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            const inviteQueries = supplierIds.map((supplierId) =>
                client.query(
                    `
                        INSERT INTO "RFQ_Distribution_Queue"
                            (rfq_id, supplier_id, wave_number, visible_at, expires_at, status)
                        VALUES ($1, $2, 1, $3, $4, 'pending')
                        ON CONFLICT (rfq_id, supplier_id) DO NOTHING
                    `,
                    [rfqId, supplierId, now, expiresAt]
                )
            );
            await Promise.all(inviteQueries);
        }

        await client.query('COMMIT');

        // Trigger distribution (auto-match) when no supplier_ids provided
        if (!supplierIds.length) {
            distributeRFQ(rfqId, { limit: 5 }).catch((err) => {
                console.error(`Background distribution failed for RFQ ${rfqId}:`, err.message);
            });
        }

        res.status(201).json({
            id: rfqId,
            status: result.rows[0].status,
            created_at: result.rows[0].created_at
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create RFQ Error:', error);
        res.status(500).json({ error: 'Failed to create RFQ' });
    } finally {
        client.release();
    }
});

// ============================================
// GET /api/v2/rfqs/:id - RFQ + bids
// ============================================
router.get('/:id', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const rfqRes = await client.query('SELECT * FROM rfqs WHERE id = $1', [id]);
        if (rfqRes.rows.length === 0) {
            return res.status(404).json({ error: 'RFQ not found' });
        }

        const rfq = rfqRes.rows[0];
        const isBuyer = rfq.buyer_email === req.user.email;

        let supplierId = null;
        let isSupplier = false;

        if (!isBuyer) {
            supplierId = await getSupplierIdByEmail(client, req.user.email);
            if (supplierId) {
                isSupplier = await supplierHasAccess(client, id, supplierId);
            }
        }

        if (!isBuyer && !isSupplier) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const responsesRes = isBuyer
            ? await client.query(
                    `
                        SELECT r.*,
                                     s.name as supplier_name,
                                     s.email as supplier_email,
                                     s.tier as supplier_tier,
                                     s.logo_url
                        FROM rfq_responses r
                        JOIN suppliers s ON r.supplier_id = s.id
                        WHERE r.rfq_id = $1
                        ORDER BY r.created_at DESC
                    `,
                    [id]
                )
            : await client.query(
                    'SELECT * FROM rfq_responses WHERE rfq_id = $1 AND supplier_id = $2 ORDER BY created_at DESC',
                    [id, supplierId]
                );

        res.json({
            rfq,
            responses: responsesRes.rows,
            bids: responsesRes.rows
        });
    } catch (error) {
        console.error('Get RFQ Error:', error);
        res.status(500).json({ error: 'Failed to fetch RFQ' });
    } finally {
        client.release();
    }
});

// ============================================
// POST /api/v2/rfqs/:id/bids - Submit bid
// ============================================
router.post('/:id/bids', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const { supplier_id, total_price, line_items } = req.body;

        const supplierId = await getSupplierIdByEmail(client, req.user.email);
        if (!supplierId) return res.status(403).json({ error: 'Not a registered supplier' });

        if (supplier_id && supplier_id !== supplierId) {
            return res.status(403).json({ error: 'Supplier mismatch' });
        }

        const hasAccess = await supplierHasAccess(client, id, supplierId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'You do not have access to this RFQ' });
        }

        await client.query('BEGIN');

        const insertRes = await client.query(
            `
                INSERT INTO rfq_responses (
                    rfq_id,
                    supplier_id,
                    status,
                    price,
                    attachments
                )
                VALUES ($1, $2, 'submitted', $3, $4)
                RETURNING id, rfq_id, supplier_id, status, created_at
            `,
            [id, supplierId, total_price || null, JSON.stringify({ line_items: line_items || [] })]
        );

        await client.query(
            `
                UPDATE "RFQ_Distribution_Queue"
                SET status = 'responded', responded_at = NOW()
                WHERE rfq_id = $1 AND supplier_id = $2
            `,
            [id, supplierId]
        );

        await client.query('COMMIT');

        res.status(201).json(insertRes.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Submit Bid Error:', error);
        res.status(500).json({ error: 'Failed to submit bid' });
    } finally {
        client.release();
    }
});

// ============================================
// GET /api/v2/rfqs/:id/bids - List bids
// ============================================
router.get('/:id/bids', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const rfqRes = await client.query('SELECT * FROM rfqs WHERE id = $1', [id]);
        if (rfqRes.rows.length === 0) {
            return res.status(404).json({ error: 'RFQ not found' });
        }

        const rfq = rfqRes.rows[0];
        const isBuyer = rfq.buyer_email === req.user.email;
        let supplierId = null;

        if (!isBuyer) {
            supplierId = await getSupplierIdByEmail(client, req.user.email);
            if (!supplierId) return res.status(403).json({ error: 'Access denied' });
            const hasAccess = await supplierHasAccess(client, id, supplierId);
            if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
        }

        const bidsRes = isBuyer
            ? await client.query(
                    `
                        SELECT r.*,
                                     s.name as supplier_name,
                                     s.email as supplier_email,
                                     s.tier as supplier_tier,
                                     s.logo_url
                        FROM rfq_responses r
                        JOIN suppliers s ON r.supplier_id = s.id
                        WHERE r.rfq_id = $1
                        ORDER BY r.created_at DESC
                    `,
                    [id]
                )
            : await client.query(
                    'SELECT * FROM rfq_responses WHERE rfq_id = $1 AND supplier_id = $2 ORDER BY created_at DESC',
                    [id, supplierId]
                );

        res.json(bidsRes.rows);
    } catch (error) {
        console.error('Get Bids Error:', error);
        res.status(500).json({ error: 'Failed to fetch bids' });
    } finally {
        client.release();
    }
});

// ============================================
// DELETE /api/v2/rfqs/:id - Archive RFQ
// ============================================
router.delete('/:id', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const rfqRes = await client.query('SELECT buyer_email FROM rfqs WHERE id = $1', [id]);
        if (rfqRes.rows.length === 0) return res.status(404).json({ error: 'RFQ not found' });
        if (rfqRes.rows[0].buyer_email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updateRes = await client.query(
            'UPDATE rfqs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at',
            ['archived', id]
        );

        res.json(updateRes.rows[0]);
    } catch (error) {
        console.error('Archive RFQ Error:', error);
        res.status(500).json({ error: 'Failed to archive RFQ' });
    } finally {
        client.release();
    }
});

module.exports = router;
