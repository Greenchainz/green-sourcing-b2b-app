import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const pool = getPool();

/**
 * GET /api/swap-validation/stats
 * 
 * Get validation statistics summary
 */
export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE validation_status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE validation_status = 'EXPERIMENTAL') as experimental,
        COUNT(*) FILTER (WHERE validation_status = 'REJECTED') as rejected,
        COALESCE(AVG(overall_score), 0) as average_score
      FROM swap_validations
    `);

    const stats = result.rows[0];

    // Get recent validations
    const recentResult = await pool.query(`
      SELECT sv.*,
        m1.name as incumbent_name,
        m2.name as sustainable_name
      FROM swap_validations sv
      LEFT JOIN materials m1 ON sv.incumbent_material_id = m1.id
      LEFT JOIN materials m2 ON sv.sustainable_material_id = m2.id
      ORDER BY sv.validated_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      total: parseInt(stats.total),
      approved: parseInt(stats.approved),
      experimental: parseInt(stats.experimental),
      rejected: parseInt(stats.rejected),
      averageScore: parseFloat(stats.average_score),
      recentValidations: recentResult.rows,
    });
  } catch (error) {
    console.error("Error fetching validation stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch validation stats" },
      { status: 500 }
    );
  }
}
