import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * GET /api/materials
 * 
 * Query materials with search, filtering, and sorting
 * 
 * Query Parameters:
 * - search: Search by material name or description
 * - category: Filter by product category
 * - certification: Filter by certification type (EPD, FSC, C2C, etc)
 * - minGWP: Minimum Global Warming Potential (kg CO2e)
 * - maxGWP: Maximum Global Warming Potential (kg CO2e)
 * - sortBy: Sort field (gwp, name, created_at) - default: gwp
 * - sortOrder: asc or desc - default: asc
 * - limit: Results per page - default: 50, max: 500
 * - offset: Pagination offset - default: 0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const certification = searchParams.get("certification") || "";
    const minGWP = searchParams.get("minGWP") ? parseFloat(searchParams.get("minGWP")!) : null;
    const maxGWP = searchParams.get("maxGWP") ? parseFloat(searchParams.get("maxGWP")!) : null;
    const sortBy = searchParams.get("sortBy") || "gwp";
    const sortOrder = (searchParams.get("sortOrder") || "asc").toUpperCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate sort parameters
    const validSortFields = ["gwp", "name", "created_at"];
    const validSortOrders = ["ASC", "DESC"];
    
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sortBy parameter" },
        { status: 400 }
      );
    }
    
    if (!validSortOrders.includes(sortOrder)) {
      return NextResponse.json(
        { error: "Invalid sortOrder parameter" },
        { status: 400 }
      );
    }

    // Build dynamic query
    let query = `
      SELECT DISTINCT
        m.id,
        m.name,
        m.description,
        m.category,
        m.gwp,
        m.gwp_unit,
        m.epd_url,
        m.manufacturer,
        m.created_at,
        json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as certifications,
        COUNT(DISTINCT pm.product_id) as product_count
      FROM Materials m
      LEFT JOIN Product_Materials_Composition pm ON m.id = pm.material_id
      LEFT JOIN Certifications c ON m.id = c.material_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Search filter
    if (search) {
      query += ` AND (m.name ILIKE $${paramCount} OR m.description ILIKE $${paramCount} OR m.manufacturer ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Category filter
    if (category) {
      query += ` AND m.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    // Certification filter
    if (certification) {
      query += ` AND c.name = $${paramCount}`;
      params.push(certification);
      paramCount++;
    }

    // GWP range filter
    if (minGWP !== null) {
      query += ` AND m.gwp >= $${paramCount}`;
      params.push(minGWP);
      paramCount++;
    }

    if (maxGWP !== null) {
      query += ` AND m.gwp <= $${paramCount}`;
      params.push(maxGWP);
      paramCount++;
    }

    // Group by and sort
    query += `
      GROUP BY m.id, m.name, m.description, m.category, m.gwp, m.gwp_unit, m.epd_url, m.manufacturer, m.created_at
      ORDER BY m.${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit);
    params.push(offset);

    // Execute query
    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM Materials m
      LEFT JOIN Certifications c ON m.id = c.material_id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamCount = 1;

    if (search) {
      countQuery += ` AND (m.name ILIKE $${countParamCount} OR m.description ILIKE $${countParamCount} OR m.manufacturer ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    if (category) {
      countQuery += ` AND m.category = $${countParamCount}`;
      countParams.push(category);
      countParamCount++;
    }

    if (certification) {
      countQuery += ` AND c.name = $${countParamCount}`;
      countParams.push(certification);
      countParamCount++;
    }

    if (minGWP !== null) {
      countQuery += ` AND m.gwp >= $${countParamCount}`;
      countParams.push(minGWP);
      countParamCount++;
    }

    if (maxGWP !== null) {
      countQuery += ` AND m.gwp <= $${countParamCount}`;
      countParams.push(maxGWP);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || "0");

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Materials API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}
