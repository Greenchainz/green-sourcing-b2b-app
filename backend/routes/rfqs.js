const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { rfq: rfqRateLimit, general: generalRateLimit } = require('../middleware/rateLimit');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createRFQSchema = Joi.object({
  project_name: Joi.string().required().max(255),
  project_location: Joi.string().max(255).allow('', null),
  project_timeline: Joi.string().max(100).allow('', null),
  material_type: Joi.string().required().max(255),
  quantity: Joi.string().max(100).allow('', null),
  specifications: Joi.string().allow('', null),
  certifications_required: Joi.array().items(Joi.string()).allow(null),
  budget_range: Joi.string().max(100).allow('', null),
  deadline: Joi.date().iso().allow(null),
  supplier_id: Joi.number().integer().allow(null) // Optional: for direct RFQ
});

const respondToRFQSchema = Joi.object({
  message: Joi.string().required(),
  quoted_price: Joi.number().positive().allow(null),
  delivery_timeline: Joi.string().max(100).allow('', null),
  certifications_provided: Joi.array().items(Joi.string()).allow(null),
  attachments: Joi.object().allow(null)
});

// ============================================
// POST /api/v1/rfqs/create
// Create new RFQ (architects only)
// ============================================

router.post('/create', authenticateToken, rfqRateLimit, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createRFQSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check user is architect/buyer
    // Use lowercase table/column names per schema.sql
    const userCheck = await pool.query(
      'SELECT user_id, role, azure_id FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (!userCheck.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userCheck.rows[0];
    const role = (user.role || '').toLowerCase();

    if (role !== 'architect' && role !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only architects/buyers can create RFQs'
      });
    }

    // Geocode project location if provided
    const { geocodeAddress, findSuppliersNearby } = require('../services/geocoding');
    let projectGeo = null;
    
    if (value.project_location) {
      projectGeo = await geocodeAddress(value.project_location);
      if (projectGeo) {
        console.log(`📍 Geocoded "${value.project_location}" to (${projectGeo.latitude}, ${projectGeo.longitude})`);
      }
    }

    // Insert RFQ with geocoded location
    // Using schema.sql + rfq-broadcast.sql columns
    // Note: buyer_id is the column name in schema.sql (not architect_id)
    const result = await pool.query(`
      INSERT INTO rfqs (
        buyer_id, project_name, project_location,
        project_latitude, project_longitude,
        project_timeline, material_type, quantity, 
        specifications, certifications_required,
        budget_range, deadline, supplier_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *, rfq_id as id
    `, [
      req.user.userId,
      value.project_name,
      value.project_location || null,
      projectGeo?.latitude || null,
      projectGeo?.longitude || null,
      value.project_timeline || null,
      value.material_type,
      value.quantity || null,
      value.specifications || null,
      value.certifications_required || null,
      value.budget_range || null,
      value.deadline || null,
      value.supplier_id || null // Can be null for broadcast
    ]);

    const rfq = result.rows[0];
    const rfqId = rfq.rfq_id || rfq.id;

    // Distribution Logic:
    // 1. Direct RFQ: If supplier_id is provided, match only that supplier
    // 2. Broadcast RFQ: If no supplier_id, find nearby suppliers

    let matchedSuppliers = [];

    if (value.supplier_id) {
       // Direct RFQ
       matchedSuppliers.push({ id: value.supplier_id, distance: 0 });
    } else if (projectGeo) {
      // Broadcast RFQ - Find nearby suppliers (within 100 miles by default)
      matchedSuppliers = await findSuppliersNearby(
        projectGeo.latitude,
        projectGeo.longitude,
        100 // radius in miles
      );
      console.log(`📍 Found ${matchedSuppliers.length} suppliers within 100 miles of project`);
    }

    // Store matched suppliers in rfq_supplier_matches table
    if (matchedSuppliers.length > 0) {
        try {
          const insertMatches = matchedSuppliers.map(supplier =>
            pool.query(`
              INSERT INTO rfq_supplier_matches (rfq_id, supplier_id, distance_miles)
              VALUES ($1, $2, $3)
              ON CONFLICT (rfq_id, supplier_id) DO UPDATE
              SET distance_miles = EXCLUDED.distance_miles
            `, [rfqId, supplier.id, supplier.distance])
          );

          await Promise.all(insertMatches);
          console.log(`✅ Stored ${matchedSuppliers.length} supplier matches for RFQ ${rfqId}`);
        } catch (error) {
          // Table might not exist yet - log but don't fail
          console.warn('⚠️  Could not store supplier matches (table may not exist):', error.message);
        }
    }

    // TODO: Send email notifications to matched suppliers

    res.status(201).json({
      success: true,
      data: {
        rfq: rfq,
        message: 'RFQ created successfully'
      }
    });

  } catch (error) {
    console.error('RFQ creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create RFQ',
      message: error.message
    });
  }
});

// ============================================
// GET /api/v1/rfqs/list
// List RFQs (filtered by role)
// 
// NOTE: This route must be defined BEFORE /:id to avoid conflicts
// ============================================

router.get('/list', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user role
    const userResult = await pool.query(
      'SELECT user_id, role, company_id FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    
    if (!userResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const userRole = (user.role || '').toLowerCase();

    let query;
    let params;

    if (userRole === 'architect' || userRole === 'buyer') {
      // Architects/Buyers see only their RFQs
      // Using buyer_id as per schema.sql
      if (status) {
        query = `
          SELECT 
            r.*,
            r.rfq_id as id,
            COUNT(rr.response_id) as response_count
          FROM rfqs r
          LEFT JOIN rfq_responses rr ON r.rfq_id = rr.rfq_id
          WHERE r.buyer_id = $1 AND r.status = $2
          GROUP BY r.rfq_id
          ORDER BY r.created_at DESC
          LIMIT $3 OFFSET $4
        `;
        params = [req.user.userId, status, parseInt(limit), offset];
      } else {
        query = `
          SELECT 
            r.*,
            r.rfq_id as id,
            COUNT(rr.response_id) as response_count
          FROM rfqs r
          LEFT JOIN rfq_responses rr ON r.rfq_id = rr.rfq_id
          WHERE r.buyer_id = $1
          GROUP BY r.rfq_id
          ORDER BY r.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [req.user.userId, parseInt(limit), offset];
      }
    } else if (userRole === 'supplier') {
      // Get supplier's location and service radius
      // Try company table first
      let hasSupplierLocation = false;
      let serviceRadius = 100;
      let supplierLat = null;
      let supplierLong = null;

      if (user.company_id) {
         const companyRes = await pool.query('SELECT latitude, longitude FROM companies WHERE company_id = $1', [user.company_id]);
         if (companyRes.rows.length > 0) {
             supplierLat = companyRes.rows[0].latitude;
             supplierLong = companyRes.rows[0].longitude;
         }
      }

      // Fallback to user table
      if (!supplierLat) {
         const userLoc = await pool.query('SELECT latitude, longitude FROM users WHERE user_id = $1', [req.user.userId]);
         if (userLoc.rows.length > 0) {
             supplierLat = userLoc.rows[0].latitude;
             supplierLong = userLoc.rows[0].longitude;
         }
      }

      if (supplierLat && supplierLong) {
          hasSupplierLocation = true;
      }

      // Use rfq_supplier_matches table if supplier has location, otherwise show all
      if (hasSupplierLocation) {
        query = `
          SELECT 
            r.*,
            r.rfq_id as id,
            rsm.distance_miles,
            EXISTS(
              SELECT 1 FROM rfq_responses 
              WHERE rfq_id = r.rfq_id AND supplier_id = $1
            ) as has_responded
          FROM rfqs r
          LEFT JOIN rfq_supplier_matches rsm 
            ON r.rfq_id = rsm.rfq_id AND rsm.supplier_id = $1
          WHERE r.status = 'open' OR r.status = 'Open'
            AND (rsm.distance_miles <= $2 OR rsm.distance_miles IS NULL OR r.supplier_id = $1)
          ORDER BY COALESCE(rsm.distance_miles, 9999) ASC, r.created_at DESC
          LIMIT $3 OFFSET $4
        `;
        params = [req.user.userId, serviceRadius, parseInt(limit), offset];
      } else {
        // No supplier location - show all RFQs (fallback) or Direct ones
        query = `
          SELECT 
            r.*,
            r.rfq_id as id,
            NULL as distance_miles,
            EXISTS(
              SELECT 1 FROM rfq_responses 
              WHERE rfq_id = r.rfq_id AND supplier_id = $1
            ) as has_responded
          FROM rfqs r
          WHERE (r.status = 'open' OR r.status = 'Open')
             AND (r.supplier_id IS NULL OR r.supplier_id = $1)
          ORDER BY r.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [req.user.userId, parseInt(limit), offset];
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'Invalid user role'
      });
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        rfqs: result.rows,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('RFQ list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RFQs',
      message: error.message
    });
  }
});

// ============================================
// GET /api/v1/rfqs/supplier/:supplierId
// Get all RFQs for a specific supplier
// 
// NOTE: This route must be defined BEFORE /:id to avoid conflicts
// ============================================

router.get('/supplier/:supplierId', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const supplierId = parseInt(req.params.supplierId);

    if (isNaN(supplierId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid supplier ID'
      });
    }

    // Check permission (suppliers can only see their own RFQs)
    const userResult = await pool.query(
      'SELECT user_id, role FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userRole = (userResult.rows[0].role || '').toLowerCase();
    const isSupplier = userRole === 'supplier';
    const isAdmin = userRole === 'admin';

    // Access control: Admins can see any supplier's RFQs, suppliers can only see their own
    if (!isAdmin && (!isSupplier || req.user.userId !== supplierId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Suppliers can only view their own RFQ responses.'
      });
    }

    // Get all RFQs this supplier has responded to
    const result = await pool.query(`
      SELECT 
        r.*,
        r.rfq_id as id,
        rr.response_id,
        rr.message as response_message,
        rr.quoted_price,
        rr.delivery_timeline,
        rr.status as response_status,
        rr.created_at as response_created_at
      FROM rfqs r
      INNER JOIN rfq_responses rr ON r.rfq_id = rr.rfq_id
      WHERE rr.supplier_id = $1
      ORDER BY rr.created_at DESC
    `, [supplierId]);

    res.json({
      success: true,
      data: {
        rfqs: result.rows,
        count: result.rows.length
      }
    });

  } catch (error) {
    console.error('Supplier RFQ fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supplier RFQs',
      message: error.message
    });
  }
});

// ============================================
// GET /api/v1/rfqs/:id
// Get single RFQ with responses
// 
// NOTE: This route must be defined AFTER /list and /supplier/:supplierId to avoid conflicts
// ============================================

router.get('/:id', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.id);

    if (isNaN(rfqId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RFQ ID'
      });
    }

    // Get RFQ details
    // Joining users to get buyer details
    const rfqResult = await pool.query(`
      SELECT 
        r.*,
        r.rfq_id as id,
        u.email as architect_email,
        u.first_name as architect_first_name,
        u.last_name as architect_last_name
      FROM rfqs r
      JOIN users u ON r.buyer_id = u.user_id
      WHERE r.rfq_id = $1
    `, [rfqId]);

    if (rfqResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'RFQ not found'
      });
    }

    const rfq = rfqResult.rows[0];

    // Check permission (architect who created OR suppliers)
    // Note: buyer_id matches schema.sql
    const isOwner = rfq.buyer_id === req.user.userId;
    
    const userRoleResult = await pool.query(
      'SELECT role FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    const userRole = (userRoleResult.rows[0]?.role || '').toLowerCase();
    const isSupplier = userRole === 'supplier';

    if (!isOwner && !isSupplier) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get responses
    let responses = [];
    if (isOwner) {
      // Architect sees all responses
      const responsesResult = await pool.query(`
        SELECT 
          rr.*,
          u.email as supplier_email,
          u.first_name as supplier_first_name,
          u.last_name as supplier_last_name,
          c.company_name
        FROM rfq_responses rr
        JOIN users u ON rr.supplier_id = u.user_id
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE rr.rfq_id = $1
        ORDER BY rr.created_at DESC
      `, [rfqId]);
      responses = responsesResult.rows;
    } else if (isSupplier) {
      // Supplier sees only their own response
      const responsesResult = await pool.query(`
        SELECT * FROM rfq_responses
        WHERE rfq_id = $1 AND supplier_id = $2
        ORDER BY created_at DESC
      `, [rfqId, req.user.userId]);
      responses = responsesResult.rows;
    }

    res.json({
      success: true,
      data: {
        rfq,
        responses
      }
    });

  } catch (error) {
    console.error('RFQ fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RFQ',
      message: error.message
    });
  }
});

// ============================================
// POST /api/v1/rfqs/:id/respond
// Supplier responds to RFQ
// ============================================

router.post('/:id/respond', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.id);

    if (isNaN(rfqId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RFQ ID'
      });
    }

    // Validate input
    const { error, value } = respondToRFQSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check user is supplier
    const userCheck = await pool.query(
      'SELECT user_id, role FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (!userCheck.rows.length || (userCheck.rows[0].role || '').toLowerCase() !== 'supplier') {
      return res.status(403).json({
        success: false,
        error: 'Only suppliers can respond to RFQs'
      });
    }

    // Check RFQ exists and is open
    const rfqCheck = await pool.query(
      'SELECT rfq_id, status, buyer_id FROM rfqs WHERE rfq_id = $1',
      [rfqId]
    );

    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'RFQ not found'
      });
    }

    // Status casing check
    const status = (rfqCheck.rows[0].status || 'open').toLowerCase();

    if (status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'RFQ is no longer open'
      });
    }

    // Check if already responded
    const existingResponse = await pool.query(
      'SELECT response_id FROM rfq_responses WHERE rfq_id = $1 AND supplier_id = $2',
      [rfqId, req.user.userId]
    );

    if (existingResponse.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have already responded to this RFQ'
      });
    }

    // Insert response
    const result = await pool.query(`
      INSERT INTO rfq_responses (
        rfq_id, supplier_id, message, quoted_price,
        delivery_timeline, certifications_provided, attachment_urls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      rfqId,
      req.user.userId,
      value.message,
      value.quoted_price || null,
      value.delivery_timeline || null,
      value.certifications_provided || null,
      value.attachments ? Object.values(value.attachments) : null // Schema has text[] for attachments
    ]);

    // TODO: Send email notification to architect

    res.status(201).json({
      success: true,
      data: {
        response: result.rows[0],
        message: 'Response submitted successfully'
      }
    });

  } catch (error) {
    console.error('RFQ response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit response',
      message: error.message
    });
  }
});

// ============================================
// PUT /api/v1/rfqs/:id/status
// Update RFQ status (close, reopen)
// ============================================

router.put('/:id/status', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(rfqId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RFQ ID'
      });
    }

    const validStatuses = ['open', 'closed', 'awarded', 'Open', 'Closed', 'Awarded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Check ownership
    const rfqCheck = await pool.query(
      'SELECT rfq_id, buyer_id FROM rfqs WHERE rfq_id = $1',
      [rfqId]
    );

    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'RFQ not found'
      });
    }

    if (rfqCheck.rows[0].buyer_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the RFQ owner can update status'
      });
    }

    // Update status
    const result = await pool.query(
      'UPDATE rfqs SET status = $1, updated_at = NOW() WHERE rfq_id = $2 RETURNING rfq_id as id, status, updated_at',
      [status, rfqId]
    );

    res.json({
      success: true,
      data: {
        rfq: result.rows[0],
        message: `RFQ status updated to ${status}`
      }
    });

  } catch (error) {
    console.error('RFQ status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      message: error.message
    });
  }
});

module.exports = router;
