/**
 * Materials API Routes
 * 
 * Provides REST API endpoints for searching sustainable materials
 * with EPD data, manufacturers, and carbon metrics.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { search: searchRateLimit, general: generalRateLimit } = require('../middleware/rateLimit');

/**
 * GET /api/v1/materials/search
 * Search materials with filters, pagination, and sorting
 * 
 * Query parameters:
 *   - query: Search term (full-text search on product name, manufacturer, material type)
 *   - manufacturer: Filter by manufacturer (exact match)
 *   - assemblyCode: Filter by assembly code
 *   - materialType: Filter by material type (partial match)
 *   - minGWP: Minimum Global Warming Potential
 *   - maxGWP: Maximum Global Warming Potential
 *   - hasEPD: Filter by EPD availability (true/false)
 *   - isVerified: Filter by verification status (true/false)
 *   - page: Page number (default: 1)
 *   - limit: Results per page (default: 20)
 *   - sortBy: Sort field (gwp, product_name, manufacturer, created_at) (default: gwp)
 *   - sortOrder: Sort direction (asc/desc) (default: asc)
 */
router.get('/search', authenticateToken, searchRateLimit, async (req, res) => {
  try {
    const {
      query = '',
      manufacturer,
      assemblyCode,
      materialType,
      minGWP,
      maxGWP,
      hasEPD,
      isVerified,
      page = 1,
      limit = 20,
      sortBy = 'gwp',
      sortOrder = 'asc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build dynamic query
    let sql = `
      SELECT 
        id,
        assembly_code,
        assembly_name,
        material_type,
        manufacturer,
        product_name,
        epd_number,
        gwp,
        gwp_units,
        dimension,
        embodied_carbon_per_1000sf,
        is_verified,
        notes
      FROM materials
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Full-text search
    if (query.trim()) {
      paramCount++;
      params.push(query.trim());
      sql += ` AND (
        to_tsvector('english', 
          COALESCE(product_name, '') || ' ' || 
          COALESCE(manufacturer, '') || ' ' || 
          COALESCE(material_type, '')
        ) @@ plainto_tsquery('english', $${paramCount})
        OR product_name ILIKE $${paramCount + 1}
        OR manufacturer ILIKE $${paramCount + 1}
        OR material_type ILIKE $${paramCount + 1}
      )`;
      params.push(`%${query.trim()}%`);
      paramCount++;
    }

    // Manufacturer filter
    if (manufacturer) {
      paramCount++;
      params.push(manufacturer);
      sql += ` AND manufacturer = $${paramCount}`;
    }

    // Assembly code filter
    if (assemblyCode) {
      paramCount++;
      params.push(assemblyCode);
      sql += ` AND assembly_code = $${paramCount}`;
    }

    // Material type filter
    if (materialType) {
      paramCount++;
      params.push(`%${materialType}%`);
      sql += ` AND material_type ILIKE $${paramCount}`;
    }

    // GWP filters
    if (minGWP) {
      paramCount++;
      params.push(parseFloat(minGWP));
      sql += ` AND gwp >= $${paramCount}`;
    }

    if (maxGWP) {
      paramCount++;
      params.push(parseFloat(maxGWP));
      sql += ` AND gwp <= $${paramCount}`;
    }

    // EPD filter
    if (hasEPD === 'true') {
      sql += ` AND epd_number IS NOT NULL AND epd_number != ''`;
    } else if (hasEPD === 'false') {
      sql += ` AND (epd_number IS NULL OR epd_number = '')`;
    }

    // Verification filter
    if (isVerified === 'true') {
      sql += ` AND is_verified = true`;
    } else if (isVerified === 'false') {
      sql += ` AND is_verified = false`;
    }

    // Validate sortBy
    const validSortFields = ['gwp', 'product_name', 'manufacturer', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'gwp';
    const sortDir = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    sql += ` ORDER BY ${sortField} ${sortDir}`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(sql, params);

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM materials
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (query.trim()) {
      countParamCount++;
      countParams.push(query.trim());
      countSql += ` AND (
        to_tsvector('english', 
          COALESCE(product_name, '') || ' ' || 
          COALESCE(manufacturer, '') || ' ' || 
          COALESCE(material_type, '')
        ) @@ plainto_tsquery('english', $${countParamCount})
        OR product_name ILIKE $${countParamCount + 1}
        OR manufacturer ILIKE $${countParamCount + 1}
        OR material_type ILIKE $${countParamCount + 1}
      )`;
      countParams.push(`%${query.trim()}%`);
      countParamCount++;
    }

    if (manufacturer) {
      countParamCount++;
      countParams.push(manufacturer);
      countSql += ` AND manufacturer = $${countParamCount}`;
    }

    if (assemblyCode) {
      countParamCount++;
      countParams.push(assemblyCode);
      countSql += ` AND assembly_code = $${countParamCount}`;
    }

    if (materialType) {
      countParamCount++;
      countParams.push(`%${materialType}%`);
      countSql += ` AND material_type ILIKE $${countParamCount}`;
    }

    if (minGWP) {
      countParamCount++;
      countParams.push(parseFloat(minGWP));
      countSql += ` AND gwp >= $${countParamCount}`;
    }

    if (maxGWP) {
      countParamCount++;
      countParams.push(parseFloat(maxGWP));
      countSql += ` AND gwp <= $${countParamCount}`;
    }

    if (hasEPD === 'true') {
      countSql += ` AND epd_number IS NOT NULL AND epd_number != ''`;
    } else if (hasEPD === 'false') {
      countSql += ` AND (epd_number IS NULL OR epd_number = '')`;
    }

    if (isVerified === 'true') {
      countSql += ` AND is_verified = true`;
    } else if (isVerified === 'false') {
      countSql += ` AND is_verified = false`;
    }

    const countResult = await pool.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        materials: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Material search error:', error);
    res.status(500).json({
      success: false,
      error: 'Material search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/materials/meta/assemblies
 * Get unique assembly types with material counts
 * 
 * NOTE: This route must be defined BEFORE /:id to avoid route conflicts
 */
router.get('/meta/assemblies', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        assembly_code, 
        assembly_name, 
        COUNT(*) as material_count
      FROM materials
      WHERE assembly_code IS NOT NULL
      GROUP BY assembly_code, assembly_name
      ORDER BY assembly_code
    `);

    res.json({
      success: true,
      data: { assemblies: result.rows }
    });

  } catch (error) {
    console.error('Assembly fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assemblies',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/materials/meta/manufacturers
 * Get unique manufacturers with product counts and stats
 * 
 * NOTE: This route must be defined BEFORE /:id to avoid route conflicts
 */
router.get('/meta/manufacturers', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        manufacturer, 
        COUNT(*) as product_count,
        COUNT(CASE WHEN epd_number IS NOT NULL AND epd_number != '' THEN 1 END) as epd_count,
        AVG(gwp) as avg_gwp
      FROM materials
      GROUP BY manufacturer
      ORDER BY manufacturer
    `);

    res.json({
      success: true,
      data: { manufacturers: result.rows }
    });

  } catch (error) {
    console.error('Manufacturer fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch manufacturers',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/materials/:id
 * Get single material details
 * 
 * NOTE: This route must be defined AFTER /meta/* routes to avoid conflicts
 */
router.get('/:id', authenticateToken, generalRateLimit, async (req, res) => {
  try {
    const materialId = parseInt(req.params.id);

    if (isNaN(materialId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid material ID'
      });
    }

    const result = await pool.query(
      'SELECT * FROM materials WHERE id = $1',
      [materialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }

    res.json({
      success: true,
      data: { material: result.rows[0] }
    });

  } catch (error) {
    console.error('Material fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch material',
      message: error.message
    });
  }
});

module.exports = router;
