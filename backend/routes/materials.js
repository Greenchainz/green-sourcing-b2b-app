/**
 * Materials API Routes
 * 
 * Provides REST API endpoints for searching and managing EWS materials
 * with EPD data, manufacturers, and carbon metrics.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/v1/materials/search
 * Search materials from EWS sheet
 * 
 * Query parameters:
 *   - query: Search term (searches product name, manufacturer, assembly name)
 *   - manufacturer: Filter by manufacturer
 *   - assemblyCode: Filter by assembly code (e.g., EWS-001)
 *   - maxGWP: Maximum Global Warming Potential
 *   - hasEPD: Filter by EPD availability (true/false)
 *   - limit: Results limit (default: 100)
 *   - offset: Pagination offset (default: 0)
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { 
      query, 
      manufacturer, 
      assemblyCode, 
      maxGWP,
      hasEPD,
      limit = 100,
      offset = 0
    } = req.query;
    
    let sql = `
      SELECT 
        id,
        assembly_code,
        assembly_name,
        location,
        manufacturer,
        product_name,
        epd_number,
        gwp,
        gwp_units,
        dimension,
        declared_unit,
        embodied_carbon_per_1000sf,
        notes,
        source,
        created_at,
        updated_at
      FROM ews_materials
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    // Search query (searches multiple fields)
    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (
        product_name ILIKE $${paramIndex} 
        OR manufacturer ILIKE $${paramIndex}
        OR assembly_name ILIKE $${paramIndex}
        OR epd_number ILIKE $${paramIndex}
      )`;
      paramIndex++;
    }
    
    // Filter by manufacturer
    if (manufacturer) {
      params.push(manufacturer);
      sql += ` AND manufacturer = $${paramIndex}`;
      paramIndex++;
    }
    
    // Filter by assembly code
    if (assemblyCode) {
      params.push(assemblyCode);
      sql += ` AND assembly_code = $${paramIndex}`;
      paramIndex++;
    }
    
    // Filter by maximum GWP
    if (maxGWP) {
      params.push(parseFloat(maxGWP));
      sql += ` AND gwp <= $${paramIndex}`;
      paramIndex++;
    }
    
    // Filter by EPD availability
    if (hasEPD === 'true') {
      sql += ` AND epd_number IS NOT NULL AND epd_number != ''`;
    } else if (hasEPD === 'false') {
      sql += ` AND (epd_number IS NULL OR epd_number = '')`;
    }
    
    // Order by GWP (ascending - lower carbon first)
    sql += ` ORDER BY gwp ASC NULLS LAST, product_name ASC`;
    
    // Add pagination
    params.push(parseInt(limit));
    sql += ` LIMIT $${paramIndex}`;
    paramIndex++;
    
    params.push(parseInt(offset));
    sql += ` OFFSET $${paramIndex}`;
    
    const result = await pool.query(sql, params);
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM ews_materials
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;
    
    if (query) {
      countParams.push(`%${query}%`);
      countSql += ` AND (
        product_name ILIKE $${countParamIndex} 
        OR manufacturer ILIKE $${countParamIndex}
        OR assembly_name ILIKE $${countParamIndex}
        OR epd_number ILIKE $${countParamIndex}
      )`;
      countParamIndex++;
    }
    
    if (manufacturer) {
      countParams.push(manufacturer);
      countSql += ` AND manufacturer = $${countParamIndex}`;
      countParamIndex++;
    }
    
    if (assemblyCode) {
      countParams.push(assemblyCode);
      countSql += ` AND assembly_code = $${countParamIndex}`;
      countParamIndex++;
    }
    
    if (maxGWP) {
      countParams.push(parseFloat(maxGWP));
      countSql += ` AND gwp <= $${countParamIndex}`;
      countParamIndex++;
    }
    
    if (hasEPD === 'true') {
      countSql += ` AND epd_number IS NOT NULL AND epd_number != ''`;
    } else if (hasEPD === 'false') {
      countSql += ` AND (epd_number IS NULL OR epd_number = '')`;
    }
    
    const countResult = await pool.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      count: result.rows.length,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      materials: result.rows
    });
  } catch (error) {
    console.error('Material search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Search failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/materials/assemblies
 * Get unique assembly types with counts
 */
router.get('/assemblies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        assembly_code,
        assembly_name,
        COUNT(*) as material_count,
        MIN(gwp) as min_gwp,
        MAX(gwp) as max_gwp,
        AVG(gwp) as avg_gwp
      FROM ews_materials
      GROUP BY assembly_code, assembly_name
      ORDER BY assembly_code
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      assemblies: result.rows
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
 * GET /api/v1/materials/manufacturers
 * Get unique manufacturers with product counts
 */
router.get('/manufacturers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        manufacturer,
        COUNT(*) as product_count,
        COUNT(DISTINCT assembly_code) as assembly_count,
        MIN(gwp) as min_gwp,
        MAX(gwp) as max_gwp,
        AVG(gwp) as avg_gwp,
        COUNT(CASE WHEN epd_number IS NOT NULL AND epd_number != '' THEN 1 END) as products_with_epd
      FROM ews_materials
      GROUP BY manufacturer
      ORDER BY manufacturer
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      manufacturers: result.rows
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
 * Get a specific material by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT *
      FROM ews_materials
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }
    
    res.json({
      success: true,
      material: result.rows[0]
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

/**
 * GET /api/v1/materials/stats
 * Get material statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_materials,
        COUNT(DISTINCT manufacturer) as total_manufacturers,
        COUNT(DISTINCT assembly_code) as total_assemblies,
        COUNT(CASE WHEN epd_number IS NOT NULL AND epd_number != '' THEN 1 END) as materials_with_epd,
        MIN(gwp) as min_gwp,
        MAX(gwp) as max_gwp,
        AVG(gwp) as avg_gwp,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gwp) as median_gwp
      FROM ews_materials
    `);
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch stats',
      message: error.message 
    });
  }
});

module.exports = router;
