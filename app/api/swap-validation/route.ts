import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const pool = getPool();

/**
 * GET /api/swap-validation
 * 
 * Get validation history with optional filters
 * Query params: status, incumbentMaterialId, sustainableMaterialId, projectId, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const incumbentMaterialId = searchParams.get("incumbentMaterialId");
    const sustainableMaterialId = searchParams.get("sustainableMaterialId");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = `
      SELECT sv.*,
        m1.name as incumbent_name, m1.category as incumbent_category,
        m2.name as sustainable_name, m2.category as sustainable_category
      FROM swap_validations sv
      LEFT JOIN materials m1 ON sv.incumbent_material_id = m1.id
      LEFT JOIN materials m2 ON sv.sustainable_material_id = m2.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND sv.validation_status = $${paramIdx++}`;
      params.push(status);
    }
    if (incumbentMaterialId) {
      query += ` AND sv.incumbent_material_id = $${paramIdx++}`;
      params.push(parseInt(incumbentMaterialId));
    }
    if (sustainableMaterialId) {
      query += ` AND sv.sustainable_material_id = $${paramIdx++}`;
      params.push(parseInt(sustainableMaterialId));
    }

    query += ` ORDER BY sv.validated_at DESC LIMIT $${paramIdx++}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching validation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch validation history" },
      { status: 500 }
    );
  }
}
