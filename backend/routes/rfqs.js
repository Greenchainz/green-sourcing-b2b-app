const express = require('express');
const router = express.Router();
const { pool } = require('../db');
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
  deadline: Joi.date().iso().allow(null)
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

router.post('/create', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createRFQSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check user is architect and signed up with LinkedIn
    const userCheck = await pool.query(
      'SELECT UserID, Role, OAuthProvider FROM Users WHERE UserID = $1',
      [req.user.userId]
    );

    if (!userCheck.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userCheck.rows[0];

    if (user.role !== 'architect' && user.role !== 'Buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only architects/buyers can create RFQs'
      });
    }

    // Require LinkedIn signup for RFQ creation
    if (user.oauthprovider !== 'linkedin') {
      return res.status(403).json({
        success: false,
        error: 'You must sign up with LinkedIn to create RFQs. Please sign out and sign up using LinkedIn.'
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
    const result = await pool.query(`
      INSERT INTO rfqs (
        architect_id, project_name, project_location, 
        project_latitude, project_longitude,
        project_timeline, material_type, quantity, 
        specifications, certifications_required,
        budget_range, deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
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
      value.deadline || null
    ]);

    const rfqId = result.rows[0].id;

    // Find nearby suppliers (within 100 miles by default)
    let nearbySuppliers = [];
    if (projectGeo) {
      nearbySuppliers = await findSuppliersNearby(
        projectGeo.latitude,
        projectGeo.longitude,
        100 // radius in miles
      );

      console.log(`📍 Found ${nearbySuppliers.length} suppliers within 100 miles of project`);

      // Store matched suppliers in rfq_supplier_matches table
      if (nearbySuppliers.length > 0) {
        try {
          // Insert matches (handle potential table not existing yet)
          const insertMatches = nearbySuppliers.map(supplier => 
            pool.query(`
              INSERT INTO rfq_supplier_matches (rfq_id, supplier_id, distance_miles)
              VALUES ($1, $2, $3)
              ON CONFLICT (rfq_id, supplier_id) DO UPDATE
              SET distance_miles = EXCLUDED.distance_miles
            `, [rfqId, supplier.id, supplier.distance])
          );

          await Promise.all(insertMatches);
          console.log(`✅ Stored ${nearbySuppliers.length} supplier matches for RFQ ${rfqId}`);
        } catch (error) {
          // Table might not exist yet - log but don't fail
          console.warn('⚠️  Could not store supplier matches (table may not exist):', error.message);
        }
      }
    }

    // TODO: Send email notifications to nearby suppliers only

    res.status(201).json({
      success: true,
      data: {
        rfq: result.rows[0],
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

router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user role
    const userResult = await pool.query(
      'SELECT id, role FROM Users WHERE id = $1',
      [req.user.userId]
    );
    
    if (!userResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userRole = userResult.rows[0].role;
    let query;
    let params;

    if (userRole === 'architect') {
      // Architects see only their RFQs
      if (status) {
        query = `
          SELECT 
            r.*,
            COUNT(rr.id) as response_count
          FROM rfqs r
          LEFT JOIN rfq_responses rr ON r.id = rr.rfq_id
          WHERE r.architect_id = $1 AND r.status = $2
          GROUP BY r.id
          ORDER BY r.created_at DESC
          LIMIT $3 OFFSET $4
        `;
        params = [req.user.userId, status, parseInt(limit), offset];
      } else {
        query = `
          SELECT 
            r.*,
            COUNT(rr.id) as response_count
          FROM rfqs r
          LEFT JOIN rfq_responses rr ON r.id = rr.rfq_id
          WHERE r.architect_id = $1
          GROUP BY r.id
          ORDER BY r.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [req.user.userId, parseInt(limit), offset];
      }
    } else if (userRole === 'supplier') {
      // Get supplier's location and service radius
      const supplierLoc = await pool.query(
        'SELECT latitude, longitude, service_radius FROM Users WHERE UserID = $1',
        [req.user.userId]
      );

      const supplier = supplierLoc.rows[0];
      const hasSupplierLocation = supplier && supplier.latitude && supplier.longitude;
      const serviceRadius = supplier?.service_radius || 100;

      // Use rfq_supplier_matches table if supplier has location, otherwise show all
      if (hasSupplierLocation) {
        query = `
          SELECT 
            r.*,
            rsm.distance_miles,
            EXISTS(
              SELECT 1 FROM rfq_responses 
              WHERE rfq_id = r.id AND supplier_id = $1
            ) as has_responded
          FROM rfqs r
          LEFT JOIN rfq_supplier_matches rsm 
            ON r.id = rsm.rfq_id AND rsm.supplier_id = $1
          WHERE r.status = 'open'
            AND (rsm.distance_miles <= $2 OR rsm.distance_miles IS NULL)
          ORDER BY COALESCE(rsm.distance_miles, 9999) ASC, r.created_at DESC
          LIMIT $3 OFFSET $4
        `;
        params = [req.user.userId, serviceRadius, parseInt(limit), offset];
      } else {
        // No supplier location - show all RFQs (fallback)
        query = `
          SELECT 
            r.*,
            NULL as distance_miles,
            EXISTS(
              SELECT 1 FROM rfq_responses 
              WHERE rfq_id = r.id AND supplier_id = $1
            ) as has_responded
          FROM rfqs r
          WHERE r.status = 'open'
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

router.get('/supplier/:supplierId', authenticateToken, async (req, res) => {
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
      'SELECT id, role FROM Users WHERE id = $1',
      [req.user.userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userRole = userResult.rows[0].role;
    const isSupplier = userRole === 'supplier';
    const isAdmin = userRole === 'Admin';

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
        rr.id as response_id,
        rr.message as response_message,
        rr.quoted_price,
        rr.delivery_timeline,
        rr.status as response_status,
        rr.created_at as response_created_at
      FROM rfqs r
      INNER JOIN rfq_responses rr ON r.id = rr.rfq_id
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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.id);

    if (isNaN(rfqId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RFQ ID'
      });
    }

    // Get RFQ details
    const rfqResult = await pool.query(`
      SELECT 
        r.*,
        u.email as architect_email,
        u.first_name as architect_first_name,
        u.last_name as architect_last_name
      FROM rfqs r
      JOIN Users u ON r.architect_id = u.id
      WHERE r.id = $1
    `, [rfqId]);

    if (rfqResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'RFQ not found'
      });
    }

    const rfq = rfqResult.rows[0];

    // Check permission (architect who created OR suppliers)
    const isOwner = rfq.architect_id === req.user.userId;
    
    const userRoleResult = await pool.query(
      'SELECT role FROM Users WHERE id = $1',
      [req.user.userId]
    );
    const userRole = userRoleResult.rows[0]?.role;
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
          u.last_name as supplier_last_name
        FROM rfq_responses rr
        JOIN Users u ON rr.supplier_id = u.id
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

router.post('/:id/respond', authenticateToken, async (req, res) => {
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
      'SELECT id, role FROM Users WHERE id = $1',
      [req.user.userId]
    );

    if (!userCheck.rows.length || userCheck.rows[0].role !== 'supplier') {
      return res.status(403).json({
        success: false,
        error: 'Only suppliers can respond to RFQs'
      });
    }

    // Check RFQ exists and is open
    const rfqCheck = await pool.query(
      'SELECT id, status, architect_id FROM rfqs WHERE id = $1',
      [rfqId]
    );

    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'RFQ not found'
      });
    }

    if (rfqCheck.rows[0].status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'RFQ is no longer open'
      });
    }

    // Check if already responded
    const existingResponse = await pool.query(
      'SELECT id FROM rfq_responses WHERE rfq_id = $1 AND supplier_id = $2',
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
        delivery_timeline, certifications_provided, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      rfqId,
      req.user.userId,
      value.message,
      value.quoted_price || null,
      value.delivery_timeline || null,
      value.certifications_provided || null,
      value.attachments ? JSON.stringify(value.attachments) : null
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

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(rfqId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RFQ ID'
      });
    }

    if (!['open', 'closed', 'awarded'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: open, closed, awarded'
      });
    }

    // Check ownership
    const rfqCheck = await pool.query(
      'SELECT id, architect_id FROM rfqs WHERE id = $1',
      [rfqId]
    );

    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'RFQ not found'
      });
    }

    if (rfqCheck.rows[0].architect_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the RFQ owner can update status'
      });
    }

    // Update status
    const result = await pool.query(
      'UPDATE rfqs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at',
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
