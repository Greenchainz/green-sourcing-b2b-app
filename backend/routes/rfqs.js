const express = require('express');
const router = express.Router();
const { pool } = require('../index');

// ============================================
// MIDDLEWARE
// ============================================

// Auth middleware - extract user from JWT or session
const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = { id: userId, role: userRole || 'architect' };
  next();
};

router.use(authMiddleware);

// ============================================
// VALIDATION
// ============================================

const validateRFQCreation = (data) => {
  const errors = [];
  
  if (!data.project_name || data.project_name.trim() === '') {
    errors.push('Project name is required');
  }
  if (!data.deadline || isNaN(new Date(data.deadline))) {
    errors.push('Valid deadline date is required');
  }
  if (!Array.isArray(data.materials) || data.materials.length === 0) {
    errors.push('At least one material is required');
  }
  
  // Validate each material
  data.materials?.forEach((material, idx) => {
    if (!material.name || material.name.trim() === '') {
      errors.push(`Material ${idx + 1}: name is required`);
    }
    if (!material.quantity || material.quantity <= 0) {
      errors.push(`Material ${idx + 1}: quantity must be > 0`);
    }
    if (!material.unit || material.unit.trim() === '') {
      errors.push(`Material ${idx + 1}: unit is required (e.g., kg, m, pcs)`);
    }
  });
  
  return errors;
};

const validateQuoteSubmission = (data) => {
  const errors = [];
  
  if (!Array.isArray(data.quotes) || data.quotes.length === 0) {
    errors.push('At least one quote is required');
  }
  
  data.quotes?.forEach((quote, idx) => {
    if (!quote.rfq_line_item_id) {
      errors.push(`Quote ${idx + 1}: rfq_line_item_id is required`);
    }
    if (quote.price === undefined || quote.price < 0) {
      errors.push(`Quote ${idx + 1}: valid price is required`);
    }
    if (quote.availability === undefined || !['available', 'partial', 'unavailable'].includes(quote.availability)) {
      errors.push(`Quote ${idx + 1}: availability must be one of: available, partial, unavailable`);
    }
  });
  
  return errors;
};

// ============================================
// POST /api/v1/rfqs - Create new RFQ (Architect only)
// ============================================

router.post('/', async (req, res) => {
  try {
    // Check user is architect
    if (req.user.role !== 'architect') {
      return res.status(403).json({ error: 'Only architects can create RFQs' });
    }
    
    const { project_name, description, deadline, budget, materials, certifications_required } = req.body;
    
    // Validate
    const validationErrors = validateRFQCreation(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Create RFQ
      const rfqResult = await client.query(
        `INSERT INTO RFQs (architect_id, project_name, description, deadline, budget, certifications_required, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW())
         RETURNING id, created_at`,
        [req.user.id, project_name, description || null, deadline, budget || null, certifications_required || null]
      );
      
      const rfqId = rfqResult.rows[0].id;
      
      // 2. Create RFQ line items for each material
      const lineItemInserts = materials.map((material, idx) =>
        client.query(
          `INSERT INTO RFQ_Line_Items (rfq_id, material_name, quantity, unit, specification, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [rfqId, material.name, material.quantity, material.unit, material.specification || null, idx]
        )
      );
      
      await Promise.all(lineItemInserts);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        id: rfqId,
        project_name,
        deadline,
        materials_count: materials.length,
        status: 'open',
        created_at: rfqResult.rows[0].created_at
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating RFQ:', error);
    res.status(500).json({ error: 'Failed to create RFQ', details: error.message });
  }
});

// ============================================
// GET /api/v1/rfqs - List RFQs
// ============================================
// Architects: see their own RFQs
// Suppliers: see all open RFQs

router.get('/', async (req, res) => {
  try {
    let query;
    let params;
    
    if (req.user.role === 'architect') {
      // Architects see only their RFQs
      query = `
        SELECT id, project_name, deadline, status, created_at,
               (SELECT COUNT(*) FROM RFQ_Line_Items WHERE rfq_id = RFQs.id) as materials_count
        FROM RFQs
        WHERE architect_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      params = [req.user.id];
    } else if (req.user.role === 'supplier') {
      // Suppliers see all open RFQs
      query = `
        SELECT id, project_name, deadline, status, created_at,
               (SELECT COUNT(*) FROM RFQ_Line_Items WHERE rfq_id = RFQs.id) as materials_count
        FROM RFQs
        WHERE status = 'open'
        AND deadline > NOW()
        ORDER BY created_at DESC
        LIMIT 50
      `;
      params = [];
    } else {
      return res.status(403).json({ error: 'Invalid user role' });
    }
    
    const result = await pool.query(query, params);
    res.json({ count: result.rows.length, rfqs: result.rows });
  } catch (error) {
    console.error('Error fetching RFQs:', error);
    res.status(500).json({ error: 'Failed to fetch RFQs', details: error.message });
  }
});

// ============================================
// GET /api/v1/rfqs/:rfqId - Get single RFQ with all line items
// ============================================

router.get('/:rfqId', async (req, res) => {
  try {
    const { rfqId } = req.params;
    
    // Get RFQ
    const rfqResult = await pool.query(
      'SELECT * FROM RFQs WHERE id = $1',
      [rfqId]
    );
    
    if (rfqResult.rows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }
    
    const rfq = rfqResult.rows[0];
    
    // Check permissions: architect sees own, supplier sees open
    if (req.user.role === 'architect' && rfq.architect_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'supplier' && rfq.status !== 'open') {
      return res.status(403).json({ error: 'RFQ is no longer accepting quotes' });
    }
    
    // Get line items
    const lineItemsResult = await pool.query(
      'SELECT * FROM RFQ_Line_Items WHERE rfq_id = $1 ORDER BY sort_order ASC',
      [rfqId]
    );
    
    res.json({
      ...rfq,
      materials: lineItemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching RFQ:', error);
    res.status(500).json({ error: 'Failed to fetch RFQ', details: error.message });
  }
});

// ============================================
// POST /api/v1/rfqs/:rfqId/respond - Supplier submits quote
// ============================================

router.post('/:rfqId/respond', async (req, res) => {
  try {
    // Check user is supplier
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Only suppliers can submit quotes' });
    }
    
    const { rfqId } = req.params;
    const { quotes, notes } = req.body; // quotes = [{rfq_line_item_id, price, availability, lead_time}, ...]
    
    // Validate
    const validationErrors = validateQuoteSubmission(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }
    
    // Check RFQ exists and is open
    const rfqCheck = await pool.query(
      'SELECT id FROM RFQs WHERE id = $1 AND status = \'open\' AND deadline > NOW()',
      [rfqId]
    );
    
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found or no longer accepting quotes' });
    }
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Create RFQ response
      const responseResult = await client.query(
        `INSERT INTO RFQ_Responses (rfq_id, supplier_id, notes, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, created_at`,
        [rfqId, req.user.id, notes || null]
      );
      
      const responseId = responseResult.rows[0].id;
      
      // 2. Create quote for each line item
      const quoteInserts = quotes.map(quote =>
        client.query(
          `INSERT INTO RFQ_Response_Quotes (rfq_response_id, rfq_line_item_id, price, availability, lead_time_days)
           VALUES ($1, $2, $3, $4, $5)`,
          [responseId, quote.rfq_line_item_id, quote.price, quote.availability, quote.lead_time_days || null]
        )
      );
      
      await Promise.all(quoteInserts);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        response_id: responseId,
        rfq_id: rfqId,
        quotes_submitted: quotes.length,
        created_at: responseResult.rows[0].created_at
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error submitting quote:', error);
    res.status(500).json({ error: 'Failed to submit quote', details: error.message });
  }
});

// ============================================
// GET /api/v1/rfqs/:rfqId/responses - Get all responses (Architect only)
// ============================================

router.get('/:rfqId/responses', async (req, res) => {
  try {
    const { rfqId } = req.params;
    
    // Check user owns the RFQ
    const rfqCheck = await pool.query(
      'SELECT architect_id FROM RFQs WHERE id = $1',
      [rfqId]
    );
    
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }
    
    if (rfqCheck.rows[0].architect_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all responses with their quotes
    const result = await pool.query(
      `SELECT 
        r.id as response_id,
        r.supplier_id,
        r.notes,
        r.created_at,
        json_agg(
          json_build_object(
            'quote_id', q.id,
            'line_item_id', q.rfq_line_item_id,
            'price', q.price,
            'availability', q.availability,
            'lead_time_days', q.lead_time_days
          ) ORDER BY q.rfq_line_item_id
        ) as quotes
       FROM RFQ_Responses r
       LEFT JOIN RFQ_Response_Quotes q ON r.id = q.rfq_response_id
       WHERE r.rfq_id = $1
       GROUP BY r.id, r.supplier_id, r.notes, r.created_at
       ORDER BY r.created_at DESC`,
      [rfqId]
    );
    
    res.json({
      rfq_id: rfqId,
      response_count: result.rows.length,
      responses: result.rows
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses', details: error.message });
  }
});

// ============================================
// PATCH /api/v1/rfqs/:rfqId - Update RFQ status (Architect only)
// ============================================

router.patch('/:rfqId', async (req, res) => {
  try {
    const { rfqId } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['open', 'closed', 'awarded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    
    // Check ownership
    const rfqCheck = await pool.query(
      'SELECT architect_id FROM RFQs WHERE id = $1',
      [rfqId]
    );
    
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }
    
    if (rfqCheck.rows[0].architect_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update
    const result = await pool.query(
      'UPDATE RFQs SET status = $1 WHERE id = $2 RETURNING id, status, updated_at',
      [status, rfqId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating RFQ:', error);
    res.status(500).json({ error: 'Failed to update RFQ', details: error.message });
  }
});

module.exports = router;
