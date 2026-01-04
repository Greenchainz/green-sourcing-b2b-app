# Agent 5: BACKEND-CATALOG

## Copy-Paste Prompt

```
You are the Backend Catalog Agent for GreenChainz.

LANE: Catalog API and material search services.

FILES YOU OWN (exclusive write access):
- backend/routes/catalog.js (create new)
- backend/services/catalog/** (create new directory)
- backend/routes/scoring.js

FILES YOU MAY READ (but not modify):
- backend/services/shadow/** (for visibility rules)
- database-schemas/** (to understand schema)
- backend/services/rfq/matcher.js (for scoring patterns)

FILES ABSOLUTELY FORBIDDEN:
- backend/routes/rfqs.js
- database-schemas/** (write)
- app/**
- backend/services/rfq/**
- package*.json

YOUR IMMEDIATE TASKS:

1. Create backend/services/catalog/search.js:

/**
 * Catalog Search Service
 * Provides full-text search with filtering for materials catalog
 */

const { pool } = require('../../db');

/**
 * Search materials with filters
 * @param {object} params - Search parameters
 * @returns {Promise<{materials: Array, total: number, facets: object}>}
 */
async function searchMaterials({
  query,
  category,
  certifications = [],
  sustainabilityScoreMin = 0,
  materialType,
  limit = 24,
  offset = 0,
  sortBy = 'sustainability_score',
  sortOrder = 'desc'
}) {
  const params = [];
  let paramIndex = 1;
  const whereClauses = ['1=1'];

  // Full-text search
  if (query) {
    whereClauses.push(`m.search_vector @@ plainto_tsquery('english', $${paramIndex})`);
    params.push(query);
    paramIndex++;
  }

  // Category filter
  if (category) {
    whereClauses.push(`(mc.slug = $${paramIndex} OR mc.parent_id IN (SELECT id FROM material_categories WHERE slug = $${paramIndex}))`);
    params.push(category);
    paramIndex++;
  }

  // Certifications filter (any match)
  if (certifications.length > 0) {
    whereClauses.push(`EXISTS (
      SELECT 1 FROM material_certifications cert 
      WHERE cert.material_id = m.id 
      AND cert.certification_type = ANY($${paramIndex})
    )`);
    params.push(certifications);
    paramIndex++;
  }

  // Sustainability score minimum
  if (sustainabilityScoreMin > 0) {
    whereClauses.push(`m.sustainability_score >= $${paramIndex}`);
    params.push(sustainabilityScoreMin);
    paramIndex++;
  }

  // Material type
  if (materialType) {
    whereClauses.push(`m.material_type = $${paramIndex}`);
    params.push(materialType);
    paramIndex++;
  }

  // Build query
  const validSortColumns = ['sustainability_score', 'name', 'created_at'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'sustainability_score';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const sql = `
    SELECT 
      m.id,
      m.name,
      m.slug,
      m.description,
      m.material_type,
      m.sustainability_score,
      m.carbon_footprint_kg,
      m.leed_points_potential,
      m.image_urls,
      mc.name as category_name,
      mc.slug as category_slug,
      (
        SELECT json_agg(json_build_object(
          'type', cert.certification_type,
          'id', cert.certification_id,
          'verified_at', cert.verified_at
        ))
        FROM material_certifications cert
        WHERE cert.material_id = m.id
      ) as certifications,
      (
        SELECT COUNT(*) 
        FROM material_suppliers ms 
        WHERE ms.material_id = m.id AND ms.supplier_id IS NOT NULL
      ) as verified_supplier_count,
      (
        SELECT COUNT(*) 
        FROM material_suppliers ms 
        WHERE ms.material_id = m.id AND ms.shadow_supplier_id IS NOT NULL
      ) as shadow_supplier_count
    FROM materials m
    LEFT JOIN material_categories mc ON m.category_id = mc.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY m.${sortColumn} ${order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const result = await pool.query(sql, params);

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total
    FROM materials m
    LEFT JOIN material_categories mc ON m.category_id = mc.id
    WHERE ${whereClauses.join(' AND ')}
  `;
  const countResult = await pool.query(countSql, params.slice(0, -2));

  return {
    materials: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
}

module.exports = { searchMaterials };


2. Create backend/services/catalog/scoring.js:

/**
 * Sustainability Scoring Service
 * Calculates and explains sustainability scores for materials
 */

/**
 * Calculate sustainability score breakdown
 * @param {object} material - Material with certifications and metrics
 * @returns {object} Score breakdown with explanations
 */
function calculateSustainabilityBreakdown(material) {
  const breakdown = {
    total: 0,
    certifications: { score: 0, max: 40, items: [] },
    carbon: { score: 0, max: 25, gwp_kg: null, category_avg: null },
    transparency: { score: 0, max: 15, missing: [] },
    leed: { contribution: 0, credits: [] }
  };

  // Certification scoring (40 points max)
  const certTypes = material.certifications?.map(c => c.type) || [];
  const certScores = {
    'FSC': 15,
    'EPD': 12,
    'C2C': 10,
    'GREENGUARD': 8,
    'LEED': 10,
    'ENERGY_STAR': 5
  };

  for (const cert of certTypes) {
    if (certScores[cert]) {
      breakdown.certifications.score += certScores[cert];
      breakdown.certifications.items.push(cert);
    }
  }
  breakdown.certifications.score = Math.min(breakdown.certifications.score, 40);

  // Carbon scoring (25 points max)
  if (material.carbon_footprint_kg !== null) {
    // Lower carbon = higher score
    const carbonScore = Math.max(0, 25 - (material.carbon_footprint_kg / 2));
    breakdown.carbon.score = Math.min(Math.round(carbonScore), 25);
    breakdown.carbon.gwp_kg = material.carbon_footprint_kg;
  } else {
    breakdown.carbon.score = 10; // Default mid-score if unknown
  }

  // Transparency scoring (15 points max)
  const requiredFields = ['description', 'material_type', 'carbon_footprint_kg', 'image_urls'];
  let transparencyScore = 15;
  for (const field of requiredFields) {
    if (!material[field] || (Array.isArray(material[field]) && material[field].length === 0)) {
      transparencyScore -= 3;
      breakdown.transparency.missing.push(field);
    }
  }
  breakdown.transparency.score = Math.max(transparencyScore, 0);

  // LEED contribution
  if (certTypes.includes('FSC')) {
    breakdown.leed.credits.push({ id: 'MRc3', name: 'FSC Certified Wood', points: 1 });
    breakdown.leed.contribution += 1;
  }
  if (certTypes.includes('EPD')) {
    breakdown.leed.credits.push({ id: 'MRc2', name: 'EPD Product', points: 1 });
    breakdown.leed.contribution += 1;
  }

  // Total
  breakdown.total = breakdown.certifications.score + breakdown.carbon.score + breakdown.transparency.score;

  return breakdown;
}

module.exports = { calculateSustainabilityBreakdown };


3. Create backend/routes/catalog.js:

const express = require('express');
const router = express.Router();
const { searchMaterials } = require('../services/catalog/search');
const { calculateSustainabilityBreakdown } = require('../services/catalog/scoring');
const { pool } = require('../db');

/**
 * GET /api/v1/catalog/materials
 * Search and filter materials catalog
 */
router.get('/materials', async (req, res) => {
  try {
    const {
      q: query,
      category,
      certifications,
      min_score: sustainabilityScoreMin,
      type: materialType,
      limit = 24,
      offset = 0,
      sort = 'sustainability_score',
      order = 'desc'
    } = req.query;

    const certArray = certifications ? certifications.split(',') : [];

    const result = await searchMaterials({
      query,
      category,
      certifications: certArray,
      sustainabilityScoreMin: parseInt(sustainabilityScoreMin) || 0,
      materialType,
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      sortBy: sort,
      sortOrder: order
    });

    res.json({
      materials: result.materials,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.materials.length < result.total
      }
    });
  } catch (error) {
    console.error('Catalog search error:', error);
    res.status(500).json({ error: 'Failed to search materials' });
  }
});

/**
 * GET /api/v1/catalog/materials/:materialId
 * Get single material with full details
 */
router.get('/materials/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;

    // Get material with category
    const materialResult = await pool.query(`
      SELECT m.*, mc.name as category_name, mc.slug as category_slug
      FROM materials m
      LEFT JOIN material_categories mc ON m.category_id = mc.id
      WHERE m.id = $1 OR m.slug = $1
    `, [materialId]);

    if (materialResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materialResult.rows[0];

    // Get certifications
    const certsResult = await pool.query(`
      SELECT * FROM material_certifications WHERE material_id = $1
    `, [material.id]);

    // Get verified suppliers (not shadow)
    const suppliersResult = await pool.query(`
      SELECT s.id, s.name, s.tier, s.location
      FROM material_suppliers ms
      JOIN suppliers s ON ms.supplier_id = s.id
      WHERE ms.material_id = $1 AND ms.supplier_id IS NOT NULL
      ORDER BY ms.is_primary DESC, s.tier
    `, [material.id]);

    // Count shadow suppliers (anonymized)
    const shadowCount = await pool.query(`
      SELECT COUNT(*) FROM material_suppliers 
      WHERE material_id = $1 AND shadow_supplier_id IS NOT NULL
    `, [material.id]);

    // Calculate sustainability breakdown
    material.certifications = certsResult.rows;
    const sustainabilityBreakdown = calculateSustainabilityBreakdown(material);

    res.json({
      material: {
        ...material,
        certifications: certsResult.rows
      },
      sustainability: sustainabilityBreakdown,
      suppliers: {
        verified: suppliersResult.rows,
        shadow_count: parseInt(shadowCount.rows[0].count),
        message: parseInt(shadowCount.rows[0].count) > 0 
          ? `+${shadowCount.rows[0].count} more suppliers available`
          : null
      }
    });
  } catch (error) {
    console.error('Material detail error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

/**
 * GET /api/v1/catalog/categories
 * Get category tree for filtering
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, parent_id, icon, sort_order,
             (SELECT COUNT(*) FROM materials WHERE category_id = mc.id) as material_count
      FROM material_categories mc
      ORDER BY sort_order, name
    `);

    // Build tree structure
    const categories = result.rows;
    const tree = buildCategoryTree(categories);

    res.json({ categories: tree });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter(c => c.parent_id === parentId)
    .map(c => ({
      ...c,
      children: buildCategoryTree(categories, c.id)
    }));
}

/**
 * POST /api/v1/catalog/compare
 * Compare multiple materials side by side
 */
router.post('/compare', async (req, res) => {
  try {
    const { material_ids } = req.body;

    if (!Array.isArray(material_ids) || material_ids.length < 2 || material_ids.length > 5) {
      return res.status(400).json({ error: 'Provide 2-5 material IDs to compare' });
    }

    const result = await pool.query(`
      SELECT m.*, mc.name as category_name
      FROM materials m
      LEFT JOIN material_categories mc ON m.category_id = mc.id
      WHERE m.id = ANY($1)
    `, [material_ids]);

    const materials = await Promise.all(result.rows.map(async (m) => {
      const certs = await pool.query(
        'SELECT * FROM material_certifications WHERE material_id = $1', [m.id]
      );
      m.certifications = certs.rows;
      return {
        material: m,
        sustainability: calculateSustainabilityBreakdown(m)
      };
    }));

    res.json({
      comparison: materials,
      dimensions: ['sustainability_score', 'carbon_footprint_kg', 'leed_points_potential', 'certifications']
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Failed to compare materials' });
  }
});

module.exports = router;


4. IMPORTANT: After creating these files, submit a LOCKED FILE CHANGE REQUEST:

{
  "agent": "BACKEND-CATALOG",
  "file": "backend/index.js",
  "change": "Add catalog routes registration",
  "code": "const catalogRoutes = require('./routes/catalog');\n// Add after scoringRoutes\napp.use('/api/v1/catalog', catalogRoutes);"
}

CONSTRAINTS:
- Do NOT modify database schemas
- Do NOT modify RFQ routes
- Do NOT modify frontend files
- Submit locked file change request for index.js

OUTPUT FORMAT:
Only catalog-related backend JavaScript files.
```

## Verification Checklist
- [ ] New files in `backend/routes/catalog.js`, `backend/services/catalog/**`
- [ ] No modifications to RFQ routes
- [ ] No schema modifications
- [ ] Locked file change request submitted for `index.js`
