import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { findMatchingSuppliers, sendInAppNotification } from "@/lib/greenchainz";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

interface MaterialInput {
  material_id: string;
  quantity: number;
  unit: string;
}

const pool = getPool();

/**
 * POST /api/rfqs
 * 
 * Create a new RFQ and automatically match suppliers
 * 
 * Body:
 * - project_name: string
 * - materials: Array<{ material_id: string, quantity: number, unit: string }>
 * - delivery_location: { lat: number, lng: number, address: string }
 * - delivery_date: ISO date string
 * - budget_range?: { min: number, max: number }
 * - required_certifications?: string[]
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_name,
      materials,
      delivery_location,
      delivery_date,
      budget_range,
      required_certifications = [],
      notes = "",
    } = body;

    // Validate required fields
    if (!project_name || !materials || materials.length === 0 || !delivery_location || !delivery_date) {
      return NextResponse.json(
        { error: "Missing required fields: project_name, materials, delivery_location, delivery_date" },
        { status: 400 }
      );
    }

    // Get user from Azure Easy Auth session
    const user = getEasyAuthUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: User information not available" },
        { status: 401 }
      );
    }

    const buyer_id = user.id;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create RFQ
      const rfqResult = await client.query(
        `INSERT INTO RFQs (
          buyer_id,
          project_name,
          delivery_location_lat,
          delivery_location_lng,
          delivery_address,
          delivery_date,
          budget_min,
          budget_max,
          required_certifications,
          notes,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING id, created_at`,
        [
          buyer_id,
          project_name,
          delivery_location.lat,
          delivery_location.lng,
          delivery_location.address,
          delivery_date,
          budget_range?.min || null,
          budget_range?.max || null,
          JSON.stringify(required_certifications),
          notes,
          "draft",
        ]
      );

      const rfq_id = rfqResult.rows[0].id;

      // Insert RFQ items in bulk to avoid N+1 queries
      if (materials.length > 0) {
        await client.query(
          `INSERT INTO rfq_items (
            rfq_id,
            material_id,
            quantity,
            unit,
            created_at
          )
          SELECT $1, t.material_id, t.quantity, t.unit, NOW()
          FROM unnest($2::text[], $3::numeric[], $4::text[]) AS t(material_id, quantity, unit)`,
          [
            rfq_id,
            materials.map((m: MaterialInput) => m.material_id),
            materials.map((m: MaterialInput) => m.quantity),
            materials.map((m: MaterialInput) => m.unit),
          ]
        );
      }

      // Run supplier matching
      const matchedSuppliers = await findMatchingSuppliers(Number(rfq_id), delivery_location.address);

      // Insert matched suppliers into rfq_suppliers junction table in bulk
      if (matchedSuppliers.length > 0) {
        await client.query(
          `INSERT INTO rfq_suppliers (
            rfq_id,
            supplier_id,
            match_score,
            distance_km,
            created_at
          )
          SELECT $1, t.supplier_id, t.match_score, t.distance_km, NOW()
          FROM unnest($2::int[], $3::numeric[], $4::numeric[]) AS t(supplier_id, match_score, distance_km)`,
          [
            rfq_id,
            matchedSuppliers.map((m) => m.supplierId),
            matchedSuppliers.map((m) => m.matchScore),
            matchedSuppliers.map((m) =>
              m.distanceMiles != null ? m.distanceMiles * 1.60934 : null
            ),
          ]
        );

        // Send notifications to suppliers
        for (const match of matchedSuppliers) {
          await sendInAppNotification({
            userId: match.supplierId,
            type: "rfq_match",
            title: "New RFQ Match",
            content: `You've been matched to RFQ: ${project_name}`,
            relatedId: Number(rfq_id),
          });
        }
      }

      // Update RFQ status to "open"
      await client.query(
        `UPDATE RFQs SET status = 'open', published_at = NOW() WHERE id = $1`,
        [rfq_id]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        data: {
          rfq_id,
          matched_suppliers: matchedSuppliers.length,
          top_matches: matchedSuppliers.slice(0, 5).map((m) => ({
            supplier_id: m.supplierId,
            score: m.matchScore,
            distance_km: m.distanceMiles != null ? m.distanceMiles * 1.60934 : null,
          })),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[RFQ API] Error creating RFQ:", error);
    return NextResponse.json(
      { error: "Failed to create RFQ" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfqs
 * 
 * List RFQs for the current user
 * 
 * Query Parameters:
 * - status: Filter by status (draft, open, closed)
 * - limit: Results per page - default: 20
 * - offset: Pagination offset - default: 0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user from Azure Easy Auth session
    const user = getEasyAuthUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: User information not available" },
        { status: 401 }
      );
    }

    const buyer_id = user.id;

    let query = `
      SELECT 
        r.id,
        r.project_name,
        r.delivery_address,
        r.delivery_date,
        r.status,
        r.created_at,
        r.published_at,
        COUNT(DISTINCT rs.supplier_id) as matched_suppliers,
        COUNT(DISTINCT rb.id) as bids_received
      FROM RFQs r
      LEFT JOIN rfq_suppliers rs ON r.id = rs.rfq_id
      LEFT JOIN rfq_bids rb ON r.id = rb.rfq_id
      WHERE r.buyer_id = $1
    `;

    const params: any[] = [buyer_id];
    let paramCount = 2;

    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += `
      GROUP BY r.id, r.project_name, r.delivery_address, r.delivery_date, r.status, r.created_at, r.published_at
      ORDER BY r.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM RFQs WHERE buyer_id = $1`;
    const countParams: any[] = [buyer_id];

    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
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
    console.error("[RFQ API] Error fetching RFQs:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQs" },
      { status: 500 }
    );
  }
}
