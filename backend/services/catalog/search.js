/**
 * Catalog Search Service
 * 
 * Full-text search for materials/products with PostgreSQL tsvector
 * Supports filtering by category, certifications, min sustainability score
 * Returns materials with certification counts and supplier info
 */

const { pool } = require('../../db');

// Default search configuration
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_OFFSET = 0;

// Valid sort options
const SORT_OPTIONS = {
    'relevance': 'rank DESC',
    'score': 'sustainability_score DESC NULLS LAST',
    'price_asc': 'p."UnitPrice" ASC NULLS LAST',
    'price_desc': 'p."UnitPrice" DESC NULLS LAST',
    'newest': 'p."CreatedAt" DESC',
    'name': 'p."ProductName" ASC'
};

/**
 * Build full-text search query with tsvector
 * @param {string} query - Search text
 * @returns {Object} - { condition, rank, params }
 */
function buildSearchCondition(query) {
    if (!query || query.trim() === '') {
        return { condition: '1=1', rank: '1', params: [], paramOffset: 0 };
    }

    // Normalize query for tsquery - handle special characters
    const normalizedQuery = query
        .trim()
        .replace(/[^\w\s]/g, ' ')  // Remove special chars
        .split(/\s+/)
        .filter(Boolean)
        .map(word => `${word}:*`)   // Prefix matching
        .join(' & ');

    if (!normalizedQuery) {
        return { condition: '1=1', rank: '1', params: [], paramOffset: 0 };
    }

    return {
        condition: `search_vector @@ to_tsquery('english', $1)`,
        rank: `ts_rank_cd(search_vector, to_tsquery('english', $1))`,
        params: [normalizedQuery],
        paramOffset: 1
    };
}

/**
 * Build certification filter condition
 * @param {Array} certifications - Array of certification names
 * @param {number} paramStart - Starting parameter number
 * @returns {Object} - { condition, params }
 */
function buildCertificationFilter(certifications, paramStart) {
    if (!certifications || certifications.length === 0) {
        return { condition: null, params: [] };
    }

    const placeholders = certifications.map((_, i) => `$${paramStart + i}`);
    
    return {
        condition: `EXISTS (
            SELECT 1 FROM Supplier_Certifications sc
            JOIN Certifications c ON sc."CertificationID" = c."CertificationID"
            WHERE sc."SupplierID" = p."SupplierID"
            AND c."Name" = ANY(ARRAY[${placeholders.join(',')}])
        )`,
        params: certifications
    };
}

/**
 * Search materials/products with full-text search and filters
 * 
 * @param {Object} options - Search options
 * @param {string} options.query - Search query text
 * @param {string|number} options.category - Category ID or name
 * @param {Array<string>} options.certifications - Required certifications
 * @param {number} options.minScore - Minimum sustainability score (0-100)
 * @param {number} options.limit - Max results (default 20, max 100)
 * @param {number} options.offset - Pagination offset
 * @param {string} options.sortBy - Sort option (relevance, score, price_asc, price_desc, newest, name)
 * @returns {Object} - { materials, total, pagination, filters }
 */
async function searchMaterials({
    query = '',
    category = null,
    certifications = [],
    minScore = null,
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    sortBy = 'relevance'
} = {}) {
    // Validate and sanitize inputs
    limit = Math.min(Math.max(1, parseInt(limit) || DEFAULT_LIMIT), MAX_LIMIT);
    offset = Math.max(0, parseInt(offset) || DEFAULT_OFFSET);
    
    const sortOrder = SORT_OPTIONS[sortBy] || SORT_OPTIONS.relevance;
    
    // Build search condition
    const search = buildSearchCondition(query);
    let paramIndex = search.paramOffset + 1;
    const params = [...search.params];
    
    // Build WHERE clauses
    const conditions = [search.condition];
    
    // Category filter
    if (category) {
        if (typeof category === 'number' || /^\d+$/.test(category)) {
            conditions.push(`p."CategoryID" = $${paramIndex}`);
            params.push(parseInt(category));
            paramIndex++;
        } else {
            conditions.push(`pc."CategoryName" ILIKE $${paramIndex}`);
            params.push(`%${category}%`);
            paramIndex++;
        }
    }
    
    // Certifications filter
    if (certifications.length > 0) {
        const certFilter = buildCertificationFilter(certifications, paramIndex);
        if (certFilter.condition) {
            conditions.push(certFilter.condition);
            params.push(...certFilter.params);
            paramIndex += certFilter.params.length;
        }
    }
    
    // Minimum score filter
    if (minScore !== null && minScore > 0) {
        conditions.push(`COALESCE(mss.total_score, 0) >= $${paramIndex}`);
        params.push(parseInt(minScore));
        paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Main query with aggregations
    const searchQuery = `
        WITH product_certs AS (
            SELECT 
                sc."SupplierID",
                COUNT(DISTINCT c."CertificationID") AS cert_count,
                array_agg(DISTINCT c."Name") FILTER (WHERE c."Name" IS NOT NULL) AS cert_names
            FROM Supplier_Certifications sc
            JOIN Certifications c ON sc."CertificationID" = c."CertificationID"
            WHERE sc."Status" = 'Valid' OR sc."ExpiryDate" > NOW() OR sc."ExpiryDate" IS NULL
            GROUP BY sc."SupplierID"
        ),
        search_vector AS (
            SELECT 
                p."ProductID",
                setweight(to_tsvector('english', COALESCE(p."ProductName", '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(p."Description", '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(pc."CategoryName", '')), 'C') ||
                setweight(to_tsvector('english', COALESCE(cp."CompanyName", '')), 'D') AS search_vector
            FROM Products p
            LEFT JOIN Product_Categories pc ON p."CategoryID" = pc."CategoryID"
            LEFT JOIN Suppliers s ON p."SupplierID" = s."SupplierID"
            LEFT JOIN Companies cp ON s."CompanyID" = cp."CompanyID"
        )
        SELECT 
            p."ProductID" AS id,
            p."ProductName" AS name,
            p."Description" AS description,
            p."SKU" AS sku,
            p."UnitPrice" AS unit_price,
            p."Currency" AS currency,
            p."LeadTimeDays" AS lead_time_days,
            p."CreatedAt" AS created_at,
            pc."CategoryID" AS category_id,
            pc."CategoryName" AS category_name,
            cp."CompanyID" AS supplier_id,
            cp."CompanyName" AS supplier_name,
            COALESCE(pcert.cert_count, 0) AS certification_count,
            COALESCE(pcert.cert_names, ARRAY[]::text[]) AS certifications,
            COALESCE(mss.total_score, 0) AS sustainability_score,
            mss.recommendation_tier,
            mss.why_recommended,
            ${search.rank} AS rank,
            COUNT(*) OVER() AS total_count
        FROM Products p
        LEFT JOIN search_vector sv ON p."ProductID" = sv."ProductID"
        LEFT JOIN Product_Categories pc ON p."CategoryID" = pc."CategoryID"
        LEFT JOIN Suppliers s ON p."SupplierID" = s."SupplierID"
        LEFT JOIN Companies cp ON s."CompanyID" = cp."CompanyID"
        LEFT JOIN product_certs pcert ON s."SupplierID" = pcert."SupplierID"
        LEFT JOIN material_sustainability_scores mss 
            ON mss.entity_type = 'product' AND mss.entity_id = p."ProductID"::text
        WHERE ${whereClause}
        ORDER BY ${sortOrder}, p."ProductID" ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    try {
        const result = await pool.query(searchQuery, params);
        
        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
        
        const materials = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            sku: row.sku,
            unitPrice: parseFloat(row.unit_price) || null,
            currency: row.currency,
            leadTimeDays: row.lead_time_days,
            createdAt: row.created_at,
            category: {
                id: row.category_id,
                name: row.category_name
            },
            supplier: {
                id: row.supplier_id,
                name: row.supplier_name
            },
            certificationCount: parseInt(row.certification_count),
            certifications: row.certifications || [],
            sustainabilityScore: parseInt(row.sustainability_score),
            recommendationTier: row.recommendation_tier,
            whyRecommended: row.why_recommended,
            relevanceScore: parseFloat(row.rank) || 0
        }));
        
        return {
            materials,
            total,
            pagination: {
                limit,
                offset,
                hasMore: offset + materials.length < total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit)
            },
            filters: {
                query,
                category,
                certifications,
                minScore,
                sortBy
            }
        };
    } catch (error) {
        console.error('Search query failed:', error);
        throw new Error(`Material search failed: ${error.message}`);
    }
}

/**
 * Get material by ID with full details and suppliers
 * 
 * @param {string|number} materialId - Product ID
 * @returns {Object|null} - Material with full details or null if not found
 */
async function getMaterialById(materialId) {
    const query = `
        SELECT 
            p."ProductID" AS id,
            p."ProductName" AS name,
            p."Description" AS description,
            p."SKU" AS sku,
            p."UnitPrice" AS unit_price,
            p."Currency" AS currency,
            p."LeadTimeDays" AS lead_time_days,
            p."CreatedAt" AS created_at,
            p."UpdatedAt" AS updated_at,
            pc."CategoryID" AS category_id,
            pc."CategoryName" AS category_name,
            pc."Description" AS category_description,
            s."SupplierID" AS supplier_id,
            cp."CompanyName" AS supplier_name,
            cp."Address" AS supplier_address,
            cp."Website" AS supplier_website,
            sp."Description" AS supplier_description,
            sp."ESG_Summary" AS supplier_esg_summary,
            -- Certifications
            (
                SELECT json_agg(json_build_object(
                    'id', c."CertificationID",
                    'name', c."Name",
                    'certifyingBody', c."CertifyingBody",
                    'status', sc."Status",
                    'expiryDate', sc."ExpiryDate"
                ))
                FROM Supplier_Certifications sc
                JOIN Certifications c ON sc."CertificationID" = c."CertificationID"
                WHERE sc."SupplierID" = s."SupplierID"
            ) AS certifications,
            -- EPD Data
            (
                SELECT json_agg(json_build_object(
                    'epdNumber', epd."EPDNumber",
                    'programOperator', epd."EPDProgramOperator",
                    'type', epd."EPDType",
                    'declaredUnit', epd."DeclaredUnit",
                    'globalWarmingPotential', epd."GlobalWarmingPotential",
                    'issueDate', epd."IssueDate",
                    'expiryDate', epd."ExpiryDate",
                    'documentUrl', epd."EPDDocumentURL"
                ))
                FROM Product_EPDs epd
                WHERE epd."ProductID" = p."ProductID"
            ) AS epd_data,
            -- C2C Certification
            (
                SELECT json_build_object(
                    'level', c2c."CertificationLevel",
                    'version', c2c."CertificationVersion",
                    'materialHealth', c2c."MaterialHealthScore",
                    'materialReutilization', c2c."MaterialReutilizationScore",
                    'renewableEnergy', c2c."RenewableEnergyScore",
                    'waterStewardship', c2c."WaterStewardshipScore",
                    'socialFairness', c2c."SocialFairnessScore",
                    'expiryDate', c2c."ExpiryDate"
                )
                FROM C2C_Certifications c2c
                WHERE c2c."ProductID" = p."ProductID"
                LIMIT 1
            ) AS c2c_data,
            -- LEED Credits
            (
                SELECT json_agg(json_build_object(
                    'version', lc."LEEDVersion",
                    'category', lc."CreditCategory",
                    'creditNumber', lc."CreditNumber",
                    'creditName', lc."CreditName",
                    'contributionType', lc."ContributionType",
                    'contributionValue', lc."ContributionValue"
                ))
                FROM LEED_Product_Credits lc
                WHERE lc."ProductID" = p."ProductID"
            ) AS leed_credits,
            -- Materials Composition
            (
                SELECT json_agg(json_build_object(
                    'materialName', pmc."MaterialName",
                    'percentage', pmc."Percentage",
                    'isRecycled', pmc."IsRecycled",
                    'isBioBased', pmc."IsBioBased",
                    'sourceRegion', pmc."SourceRegion"
                ))
                FROM Product_Materials_Composition pmc
                WHERE pmc."ProductID" = p."ProductID"
            ) AS materials_composition,
            -- Sustainability Score
            mss.total_score AS sustainability_score,
            mss.recommendation_tier,
            mss.components AS score_components,
            mss.why_recommended,
            mss.calculated_at AS score_calculated_at,
            -- B Corp Data
            bcorp."BCorpScore" AS bcorp_score,
            bcorp."ImpactAreas" AS bcorp_impact_areas
        FROM Products p
        LEFT JOIN Product_Categories pc ON p."CategoryID" = pc."CategoryID"
        LEFT JOIN Suppliers s ON p."SupplierID" = s."SupplierID"
        LEFT JOIN Companies cp ON s."CompanyID" = cp."CompanyID"
        LEFT JOIN Supplier_Profiles sp ON s."SupplierID" = sp."SupplierID"
        LEFT JOIN material_sustainability_scores mss 
            ON mss.entity_type = 'product' AND mss.entity_id = p."ProductID"::text
        LEFT JOIN Supplier_BCorp_Data bcorp ON s."SupplierID" = bcorp."SupplierID"
        WHERE p."ProductID" = $1
    `;

    try {
        const result = await pool.query(query, [materialId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const row = result.rows[0];
        
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            sku: row.sku,
            unitPrice: parseFloat(row.unit_price) || null,
            currency: row.currency,
            leadTimeDays: row.lead_time_days,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            category: {
                id: row.category_id,
                name: row.category_name,
                description: row.category_description
            },
            supplier: {
                id: row.supplier_id,
                name: row.supplier_name,
                address: row.supplier_address,
                website: row.supplier_website,
                description: row.supplier_description,
                esgSummary: row.supplier_esg_summary,
                bCorpScore: row.bcorp_score,
                bCorpImpactAreas: row.bcorp_impact_areas
            },
            certifications: row.certifications || [],
            epd: row.epd_data || [],
            c2c: row.c2c_data,
            leedCredits: row.leed_credits || [],
            materialsComposition: row.materials_composition || [],
            sustainability: {
                score: row.sustainability_score || 0,
                tier: row.recommendation_tier,
                components: row.score_components,
                whyRecommended: row.why_recommended,
                calculatedAt: row.score_calculated_at
            }
        };
    } catch (error) {
        console.error('Get material failed:', error);
        throw new Error(`Failed to get material: ${error.message}`);
    }
}

/**
 * Get category tree with material counts
 * 
 * @returns {Array} - Category tree with counts
 */
async function getCategoryTree() {
    const query = `
        SELECT 
            pc."CategoryID" AS id,
            pc."CategoryName" AS name,
            pc."Description" AS description,
            COUNT(p."ProductID") AS material_count,
            COALESCE(AVG(mss.total_score), 0) AS avg_sustainability_score
        FROM Product_Categories pc
        LEFT JOIN Products p ON pc."CategoryID" = p."CategoryID"
        LEFT JOIN material_sustainability_scores mss 
            ON mss.entity_type = 'product' AND mss.entity_id = p."ProductID"::text
        GROUP BY pc."CategoryID", pc."CategoryName", pc."Description"
        ORDER BY pc."CategoryName" ASC
    `;

    try {
        const result = await pool.query(query);
        
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            materialCount: parseInt(row.material_count),
            avgSustainabilityScore: Math.round(parseFloat(row.avg_sustainability_score) || 0)
        }));
    } catch (error) {
        console.error('Get categories failed:', error);
        throw new Error(`Failed to get categories: ${error.message}`);
    }
}

/**
 * Compare multiple materials side-by-side
 * 
 * @param {Array<string|number>} materialIds - Array of 2-5 material IDs
 * @returns {Object} - Comparison data
 */
async function compareMaterials(materialIds) {
    if (!Array.isArray(materialIds) || materialIds.length < 2 || materialIds.length > 5) {
        throw new Error('Must compare between 2 and 5 materials');
    }
    
    const placeholders = materialIds.map((_, i) => `$${i + 1}`).join(',');
    
    const query = `
        SELECT 
            p."ProductID" AS id,
            p."ProductName" AS name,
            p."Description" AS description,
            p."SKU" AS sku,
            p."UnitPrice" AS unit_price,
            p."Currency" AS currency,
            p."LeadTimeDays" AS lead_time_days,
            pc."CategoryName" AS category_name,
            cp."CompanyName" AS supplier_name,
            -- Certifications count
            (
                SELECT COUNT(*)
                FROM Supplier_Certifications sc
                WHERE sc."SupplierID" = s."SupplierID"
                AND (sc."Status" = 'Valid' OR sc."ExpiryDate" > NOW() OR sc."ExpiryDate" IS NULL)
            ) AS certification_count,
            -- Certification names
            (
                SELECT array_agg(DISTINCT c."Name")
                FROM Supplier_Certifications sc
                JOIN Certifications c ON sc."CertificationID" = c."CertificationID"
                WHERE sc."SupplierID" = s."SupplierID"
            ) AS certifications,
            -- EPD GWP
            (
                SELECT epd."GlobalWarmingPotential"
                FROM Product_EPDs epd
                WHERE epd."ProductID" = p."ProductID"
                ORDER BY epd."CreatedAt" DESC
                LIMIT 1
            ) AS global_warming_potential,
            -- C2C Level
            (
                SELECT c2c."CertificationLevel"
                FROM C2C_Certifications c2c
                WHERE c2c."ProductID" = p."ProductID"
                LIMIT 1
            ) AS c2c_level,
            -- LEED credits count
            (
                SELECT COUNT(*)
                FROM LEED_Product_Credits lc
                WHERE lc."ProductID" = p."ProductID"
            ) AS leed_credits_count,
            -- Recycled content
            (
                SELECT SUM(pmc."Percentage")
                FROM Product_Materials_Composition pmc
                WHERE pmc."ProductID" = p."ProductID" AND pmc."IsRecycled" = true
            ) AS recycled_content_percent,
            -- Sustainability scores
            mss.total_score AS sustainability_score,
            mss.sustainability_score AS cert_score,
            mss.distance_score,
            mss.leed_score,
            mss.recommendation_tier,
            mss.why_recommended,
            -- B Corp
            bcorp."BCorpScore" AS bcorp_score
        FROM Products p
        LEFT JOIN Product_Categories pc ON p."CategoryID" = pc."CategoryID"
        LEFT JOIN Suppliers s ON p."SupplierID" = s."SupplierID"
        LEFT JOIN Companies cp ON s."CompanyID" = cp."CompanyID"
        LEFT JOIN material_sustainability_scores mss 
            ON mss.entity_type = 'product' AND mss.entity_id = p."ProductID"::text
        LEFT JOIN Supplier_BCorp_Data bcorp ON s."SupplierID" = bcorp."SupplierID"
        WHERE p."ProductID" IN (${placeholders})
        ORDER BY mss.total_score DESC NULLS LAST
    `;

    try {
        const result = await pool.query(query, materialIds);
        
        if (result.rows.length === 0) {
            return { materials: [], comparison: null };
        }
        
        const materials = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            sku: row.sku,
            unitPrice: parseFloat(row.unit_price) || null,
            currency: row.currency,
            leadTimeDays: row.lead_time_days,
            categoryName: row.category_name,
            supplierName: row.supplier_name,
            certificationCount: parseInt(row.certification_count) || 0,
            certifications: row.certifications || [],
            globalWarmingPotential: parseFloat(row.global_warming_potential) || null,
            c2cLevel: row.c2c_level,
            leedCreditsCount: parseInt(row.leed_credits_count) || 0,
            recycledContentPercent: parseFloat(row.recycled_content_percent) || 0,
            sustainability: {
                total: parseInt(row.sustainability_score) || 0,
                certifications: parseInt(row.cert_score) || 0,
                distance: parseInt(row.distance_score) || 0,
                leed: parseInt(row.leed_score) || 0,
                tier: row.recommendation_tier,
                whyRecommended: row.why_recommended
            },
            bCorpScore: row.bcorp_score
        }));
        
        // Calculate comparison metrics
        const comparison = {
            // Best/worst for each metric
            bestSustainabilityScore: Math.max(...materials.map(m => m.sustainability.total)),
            lowestGWP: Math.min(...materials.filter(m => m.globalWarmingPotential).map(m => m.globalWarmingPotential)) || null,
            mostCertifications: Math.max(...materials.map(m => m.certificationCount)),
            lowestPrice: Math.min(...materials.filter(m => m.unitPrice).map(m => m.unitPrice)) || null,
            highestRecycledContent: Math.max(...materials.map(m => m.recycledContentPercent)),
            // Recommended choice (highest sustainability score)
            recommended: materials[0] ? {
                id: materials[0].id,
                name: materials[0].name,
                reason: `Highest sustainability score (${materials[0].sustainability.total}/100)`
            } : null
        };
        
        return { materials, comparison };
    } catch (error) {
        console.error('Compare materials failed:', error);
        throw new Error(`Failed to compare materials: ${error.message}`);
    }
}

/**
 * Get available certifications for filtering
 * 
 * @returns {Array} - List of certifications with counts
 */
async function getAvailableCertifications() {
    const query = `
        SELECT 
            c."CertificationID" AS id,
            c."Name" AS name,
            c."CertifyingBody" AS certifying_body,
            COUNT(DISTINCT sc."SupplierID") AS supplier_count
        FROM Certifications c
        LEFT JOIN Supplier_Certifications sc ON c."CertificationID" = sc."CertificationID"
        WHERE sc."Status" = 'Valid' OR sc."ExpiryDate" > NOW() OR sc."ExpiryDate" IS NULL
        GROUP BY c."CertificationID", c."Name", c."CertifyingBody"
        HAVING COUNT(sc."SupplierID") > 0
        ORDER BY COUNT(sc."SupplierID") DESC, c."Name" ASC
    `;

    try {
        const result = await pool.query(query);
        
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            certifyingBody: row.certifying_body,
            supplierCount: parseInt(row.supplier_count)
        }));
    } catch (error) {
        console.error('Get certifications failed:', error);
        throw new Error(`Failed to get certifications: ${error.message}`);
    }
}

module.exports = {
    searchMaterials,
    getMaterialById,
    getCategoryTree,
    compareMaterials,
    getAvailableCertifications,
    // Constants for external use
    SORT_OPTIONS,
    DEFAULT_LIMIT,
    MAX_LIMIT
};
