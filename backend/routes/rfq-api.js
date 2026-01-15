const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { distributeRFQ } = require('../services/rfq/distributor');
const {
    rfq: rfqRateLimit,
    inbox: inboxRateLimit,
    general: generalRateLimit
} = require('../middleware/rateLimit');
const { authenticateToken } = require('../middleware/auth'); // Assuming this exists or using internal key

// Middleware to ensure user is authenticated (can be replaced/augmented with internal key if needed)
// For this v2 API, we assume bearer token auth for architects/suppliers
// If reusing simulator logic which uses internal key, we might need to adjust.
// Assuming we want a proper REST API for the frontend app.

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

// ============================================
// POST /api/v2/rfq - Create RFQ (Architect)
// ============================================
router.post('/', authenticateToken, rfqRateLimit, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            project_name,
            category,
            budget,
            message,
            project_details,
            attachments, // Array of {url, name, type}
            deadline
        } = req.body;

        // User ID from token (assuming middleware populates req.user)
        // In this schema, we use buyer_email mostly, but let's try to map user to buyer_email
        // or store the user_id if we add it to the schema.
        // For now, we'll assume req.user.email is available.
        const buyer_email = req.user.email;

        if (!buyer_email) {
            return res.status(401).json({ error: 'User email required from auth token' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Augment project_details with attachments and deadline if not already there
        const details = {
            ...(project_details || {}),
            attachments: attachments || [],
            deadline: deadline
        };

        await client.query('BEGIN');

        // Insert RFQ
        const insertQuery = `
            INSERT INTO rfqs (
                buyer_email,
                project_name,
                category,
                budget,
                message,
                project_details,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'open')
            RETURNING id, created_at
        `;

        const result = await client.query(insertQuery, [
            buyer_email,
            project_name,
            category,
            budget,
            message,
            JSON.stringify(details)
        ]);

        const rfqId = result.rows[0].id;

        await client.query('COMMIT');

        // Trigger distribution (Auto-match)
        // Limit to top 5 matches to avoid spam as per requirements
        distributeRFQ(rfqId, { limit: 5 }).catch(err => {
            console.error(`Background distribution failed for RFQ ${rfqId}:`, err.message);
        });

        res.status(201).json({
            success: true,
            data: {
                id: rfqId,
                created_at: result.rows[0].created_at,
                message: 'RFQ created and distribution started'
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create RFQ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to create RFQ' });
    } finally {
        client.release();
    }
});

// ============================================
// GET /api/v2/rfq/:id - Get RFQ Details
// ============================================
router.get('/:id', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    try {
        const result = await pool.query(`
            SELECT * FROM rfqs WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'RFQ not found' });
        }

        const rfq = result.rows[0];

        // Access control: Only buyer or matched suppliers should see it.
        // Implementing basic check: if buyer_email matches req.user.email
        // OR if user is a supplier who has this RFQ in their inbox/queue.

        const isBuyer = rfq.buyer_email === req.user.email;
        let isSupplier = false;

        // If not buyer, check if supplier
        if (!isBuyer) {
            // Find supplier by email to get ID
            const supplierRes = await pool.query('SELECT id FROM suppliers WHERE email = $1', [req.user.email]);
            if (supplierRes.rows.length > 0) {
                const supplierId = supplierRes.rows[0].id;
                // Check if they have access (in queue)
                const queueRes = await pool.query(
                    'SELECT 1 FROM "RFQ_Distribution_Queue" WHERE rfq_id = $1 AND supplier_id = $2',
                    [id, supplierId]
                );
                if (queueRes.rows.length > 0) {
                    isSupplier = true;
                }
            }
        }

        if (!isBuyer && !isSupplier) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ success: true, data: rfq });

    } catch (error) {
        console.error('Get RFQ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch RFQ' });
    }
});

// ============================================
// GET /api/v2/rfq/supplier/inbox - Supplier Inbox
// ============================================
router.get('/supplier/inbox', authenticateToken, inboxRateLimit, async (req, res) => {
    try {
        // Get supplier ID from user email
        const supplierRes = await pool.query('SELECT id FROM suppliers WHERE email = $1', [req.user.email]);

        if (supplierRes.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier profile not found for this user' });
        }

        const supplierId = supplierRes.rows[0].id;

        const result = await pool.query(`
            SELECT * FROM rfq_supplier_inbox
            WHERE supplier_id = $1
            ORDER BY visible_at DESC
        `, [supplierId]);

        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Inbox Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inbox' });
    }
});

// ============================================
// POST /api/v2/rfq/:id/quote - Submit Quote (Supplier)
// ============================================
router.post('/:id/quote', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        // Get supplier ID
        const supplierRes = await client.query('SELECT id FROM suppliers WHERE email = $1', [req.user.email]);
        if (supplierRes.rows.length === 0) {
            return res.status(403).json({ error: 'Not a registered supplier' });
        }
        const supplierId = supplierRes.rows[0].id;

        const {
            message,
            price,
            currency,
            lead_time_days,
            min_order_quantity,
            valid_until,
            payment_terms,
            delivery_terms,
            attachments
        } = req.body;

        await client.query('BEGIN');

        // Check if RFQ exists and supplier has access
        const accessCheck = await client.query(`
            SELECT status FROM "RFQ_Distribution_Queue"
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [id, supplierId]);

        if (accessCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You do not have access to this RFQ' });
        }

        // Insert response
        const insertQuery = `
            INSERT INTO rfq_responses (
                rfq_id,
                supplier_id,
                message,
                status,
                price,
                currency,
                lead_time_days,
                min_order_quantity,
                valid_until,
                payment_terms,
                delivery_terms,
                attachments
            )
            VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `;

        await client.query(insertQuery, [
            id,
            supplierId,
            message,
            price,
            currency || 'USD',
            lead_time_days,
            min_order_quantity,
            valid_until,
            payment_terms,
            delivery_terms,
            JSON.stringify(attachments || [])
        ]);

        // Update Queue Status
        await client.query(`
            UPDATE "RFQ_Distribution_Queue"
            SET status = 'responded', responded_at = NOW()
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [id, supplierId]);

        await client.query('COMMIT');

        // TODO: Update metrics async

        res.status(201).json({ success: true, message: 'Quote submitted successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Submit Quote Error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit quote' });
    } finally {
        client.release();
    }
});

// ============================================
// POST /api/v2/rfq/:id/decline - Decline RFQ (Supplier)
// ============================================
router.post('/:id/decline', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const supplierRes = await client.query('SELECT id FROM suppliers WHERE email = $1', [req.user.email]);
        if (supplierRes.rows.length === 0) return res.status(403).json({ error: 'Not a registered supplier' });
        const supplierId = supplierRes.rows[0].id;

        const { message } = req.body;

        await client.query('BEGIN');

        // Check access
        const accessCheck = await client.query(`
            SELECT status FROM "RFQ_Distribution_Queue"
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [id, supplierId]);

        if (accessCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Access denied' });
        }

        // Record decline in rfq_responses
        await client.query(`
            INSERT INTO rfq_responses (rfq_id, supplier_id, message, status)
            VALUES ($1, $2, $3, 'declined')
        `, [id, supplierId, message || 'Declined']);

        // Update queue
        await client.query(`
            UPDATE "RFQ_Distribution_Queue"
            SET status = 'responded', responded_at = NOW()
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [id, supplierId]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'RFQ declined' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Decline RFQ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to decline RFQ' });
    } finally {
        client.release();
    }
});

// ============================================
// POST /api/v2/rfq/:id/award - Award RFQ (Architect)
// ============================================
router.post('/:id/award', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const { supplier_id, response_id } = req.body;
        if (!isValidUUID(supplier_id)) return res.status(400).json({ error: 'Invalid Supplier ID' });

        // Verify ownership
        const rfqRes = await client.query('SELECT buyer_email, status FROM rfqs WHERE id = $1', [id]);
        if (rfqRes.rows.length === 0) return res.status(404).json({ error: 'RFQ not found' });
        if (rfqRes.rows[0].buyer_email !== req.user.email) return res.status(403).json({ error: 'Access denied' });

        await client.query('BEGIN');

        // Update RFQ status
        await client.query(`
            UPDATE rfqs
            SET status = 'closed', supplier_id = $1, updated_at = NOW()
            WHERE id = $2
        `, [supplier_id, id]);

        // Update winning response status
        if (response_id) {
            await client.query(`
                UPDATE rfq_responses SET status = 'accepted' WHERE id = $1
            `, [response_id]);
        } else {
            await client.query(`
                UPDATE rfq_responses SET status = 'accepted' WHERE rfq_id = $1 AND supplier_id = $2
            `, [id, supplier_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'RFQ awarded successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Award RFQ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to award RFQ' });
    } finally {
        client.release();
    }
});

// ============================================
// POST /api/v2/rfq/:id/invite - Manual Supplier Invite (Architect)
// ============================================
router.post('/:id/invite', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const { supplier_ids, message } = req.body;

        if (!Array.isArray(supplier_ids) || supplier_ids.length === 0) {
            return res.status(400).json({ error: 'supplier_ids array is required' });
        }

        // Verify ownership
        const rfqRes = await client.query('SELECT buyer_email FROM rfqs WHERE id = $1', [id]);
        if (rfqRes.rows.length === 0) return res.status(404).json({ error: 'RFQ not found' });
        if (rfqRes.rows[0].buyer_email !== req.user.email) return res.status(403).json({ error: 'Access denied' });

        await client.query('BEGIN');

        // Insert manual invites into queue
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours default

        let inviteCount = 0;
        for (const supplierId of supplier_ids) {
            if (!isValidUUID(supplierId)) continue;

            const query = `
                INSERT INTO "RFQ_Distribution_Queue"
                    (rfq_id, supplier_id, wave_number, visible_at, expires_at, status, wave_reason, access_level)
                VALUES ($1, $2, 0, $3, $4, 'pending', 'Manual invite by architect', 'full')
                ON CONFLICT (rfq_id, supplier_id) DO NOTHING
            `;
            const res = await client.query(query, [id, supplierId, now, expiresAt]);
            if (res.rowCount > 0) inviteCount++;
        }

        await client.query('COMMIT');

        // Trigger notifications (async)
        // Note: Real implementation would queue notifications here

        res.json({ success: true, message: `Invited ${inviteCount} suppliers` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Invite Error:', error);
        res.status(500).json({ success: false, error: 'Failed to invite suppliers' });
    } finally {
        client.release();
    }
});

// ============================================
// POST /api/v2/rfq/:id/clarify - Request Clarification (Supplier)
// ============================================
router.post('/:id/clarify', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    const client = await pool.connect();
    try {
        const supplierRes = await client.query('SELECT id FROM suppliers WHERE email = $1', [req.user.email]);
        if (supplierRes.rows.length === 0) return res.status(403).json({ error: 'Not a registered supplier' });
        const supplierId = supplierRes.rows[0].id;

        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        await client.query('BEGIN');

        // Check access
        const accessCheck = await client.query(`
            SELECT status FROM "RFQ_Distribution_Queue"
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [id, supplierId]);

        if (accessCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Access denied' });
        }

        // Record clarification request in rfq_responses
        await client.query(`
            INSERT INTO rfq_responses (rfq_id, supplier_id, message, status)
            VALUES ($1, $2, $3, 'clarification_requested')
        `, [id, supplierId, message]);

        // Update queue status
        await client.query(`
            UPDATE "RFQ_Distribution_Queue"
            SET status = 'responded', responded_at = NOW()
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [id, supplierId]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Clarification requested' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Clarify RFQ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to request clarification' });
    } finally {
        client.release();
    }
});

// ============================================
// GET /api/v2/rfq/:id/quotes - View Quotes (Architect)
// ============================================
router.get('/:id/quotes', authenticateToken, generalRateLimit, async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid ID' });

    try {
        // Verify ownership
        const rfqRes = await pool.query('SELECT buyer_email FROM rfqs WHERE id = $1', [id]);
        if (rfqRes.rows.length === 0) return res.status(404).json({ error: 'RFQ not found' });

        if (rfqRes.rows[0].buyer_email !== req.user.email) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const quotesRes = await pool.query(`
            SELECT
                r.*,
                s.name as supplier_name,
                s.email as supplier_email,
                s.tier as supplier_tier,
                s.logo_url
            FROM rfq_responses r
            JOIN suppliers s ON r.supplier_id = s.id
            WHERE r.rfq_id = $1
            ORDER BY r.created_at DESC
        `, [id]);

        res.json({ success: true, data: quotesRes.rows });

    } catch (error) {
        console.error('Get Quotes Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quotes' });
    }
});

module.exports = router;
