import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const pool = getPool();

/**
 * GET /api/rfqs/[rfqId]
 * 
 * Get RFQ details with matched suppliers and bids
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfqId: string } }
) {
  try {
    const { rfqId } = params;

    // Get RFQ details
    const rfqResult = await pool.query(
      `SELECT 
        r.*,
        u.name as buyer_name,
        u.email as buyer_email
      FROM RFQs r
      LEFT JOIN Users u ON r.buyer_id = u.id
      WHERE r.id = $1`,
      [rfqId]
    );

    if (rfqResult.rows.length === 0) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    const rfq = rfqResult.rows[0];

    // Get RFQ items (materials requested)
    const itemsResult = await pool.query(
      `SELECT 
        ri.*,
        m.name as material_name,
        m.category,
        m.manufacturer
      FROM rfq_items ri
      LEFT JOIN Materials m ON ri.material_id = m.id
      WHERE ri.rfq_id = $1`,
      [rfqId]
    );

    // Get matched suppliers with scores
    const suppliersResult = await pool.query(
      `SELECT 
        rs.*,
        s.company_name,
        s.contact_name,
        s.email,
        s.phone,
        s.location_lat,
        s.location_lng,
        s.certifications,
        s.premium_tier
      FROM rfq_suppliers rs
      LEFT JOIN Suppliers s ON rs.supplier_id = s.id
      WHERE rs.rfq_id = $1
      ORDER BY rs.match_score DESC`,
      [rfqId]
    );

    // Get bids submitted
    const bidsResult = await pool.query(
      `SELECT 
        rb.*,
        s.company_name as supplier_name
      FROM rfq_bids rb
      LEFT JOIN Suppliers s ON rb.supplier_id = s.id
      WHERE rb.rfq_id = $1
      ORDER BY rb.total_price ASC`,
      [rfqId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...rfq,
        items: itemsResult.rows,
        matched_suppliers: suppliersResult.rows,
        bids: bidsResult.rows,
      },
    });
  } catch (error) {
    console.error("[RFQ API] Error fetching RFQ details:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQ details" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rfqs/[rfqId]
 * 
 * Update RFQ status or details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { rfqId: string } }
) {
  try {
    const { rfqId } = params;
    const body = await request.json();
    const { status, notes } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;

      if (status === "closed") {
        updates.push(`closed_at = NOW()`);
      }
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    values.push(rfqId);

    const query = `
      UPDATE RFQs
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[RFQ API] Error updating RFQ:", error);
    return NextResponse.json(
      { error: "Failed to update RFQ" },
      { status: 500 }
    );
  }
}
