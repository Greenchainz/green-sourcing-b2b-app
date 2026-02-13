import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const pool = getPool();

/**
 * GET /api/admin/analytics
 * 
 * Get platform analytics for admin dashboard
 * 
 * Query Parameters:
 * - period: 'day' | 'week' | 'month' | 'year' - default: 'month'
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Verify admin role from auth session
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "month";

    const intervals: Record<string, string> = {
      day: "1 day",
      week: "7 days",
      month: "30 days",
      year: "365 days",
    };

    const interval = intervals[period] || intervals.month;

    // Get key metrics
    const [
      totalUsers,
      totalSuppliers,
      totalRFQs,
      totalMaterials,
      activeRFQs,
      revenueData,
      userGrowth,
      rfqStats,
      supplierStats,
      topMaterials,
    ] = await Promise.all([
      // Total users
      pool.query(`SELECT COUNT(*) as count FROM Users`),

      // Total suppliers
      pool.query(`SELECT COUNT(*) as count FROM Suppliers WHERE onboarding_completed = true`),

      // Total RFQs
      pool.query(`SELECT COUNT(*) as count FROM RFQs`),

      // Total materials
      pool.query(`SELECT COUNT(*) as count FROM Materials`),

      // Active RFQs
      pool.query(`SELECT COUNT(*) as count FROM RFQs WHERE status = 'open'`),

      // Revenue data (from subscriptions)
      pool.query(
        `SELECT 
          tier,
          COUNT(*) as subscriber_count,
          SUM(CASE 
            WHEN tier = 'standard' THEN 99
            WHEN tier = 'premium' THEN 299
            ELSE 0
          END) as monthly_revenue
        FROM user_subscriptions
        WHERE status = 'active'
        GROUP BY tier`
      ),

      // User growth over time
      pool.query(
        `SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users
        FROM Users
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC`
      ),

      // RFQ statistics
      pool.query(
        `SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/86400) as avg_days_to_close
        FROM RFQs
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY status`
      ),

      // Supplier statistics
      pool.query(
        `SELECT 
          COUNT(*) as total_suppliers,
          COUNT(CASE WHEN premium_tier = true THEN 1 END) as premium_suppliers,
          AVG(service_radius_km) as avg_service_radius,
          COUNT(DISTINCT location_lat || ',' || location_lng) as unique_locations
        FROM Suppliers
        WHERE onboarding_completed = true`
      ),

      // Top materials by RFQ requests
      pool.query(
        `SELECT 
          m.name,
          m.category,
          COUNT(ri.id) as request_count
        FROM Materials m
        LEFT JOIN rfq_items ri ON m.id = ri.material_id
        LEFT JOIN RFQs r ON ri.rfq_id = r.id
        WHERE r.created_at > NOW() - INTERVAL '${interval}'
        GROUP BY m.id, m.name, m.category
        ORDER BY request_count DESC
        LIMIT 10`
      ),
    ]);

    // Calculate total MRR (Monthly Recurring Revenue)
    const totalMRR = revenueData.rows.reduce(
      (sum, row) => sum + parseFloat(row.monthly_revenue || "0"),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_users: parseInt(totalUsers.rows[0]?.count || "0"),
          total_suppliers: parseInt(totalSuppliers.rows[0]?.count || "0"),
          total_rfqs: parseInt(totalRFQs.rows[0]?.count || "0"),
          total_materials: parseInt(totalMaterials.rows[0]?.count || "0"),
          active_rfqs: parseInt(activeRFQs.rows[0]?.count || "0"),
          monthly_recurring_revenue: totalMRR,
        },
        revenue: {
          by_tier: revenueData.rows,
          total_mrr: totalMRR,
        },
        growth: {
          user_signups: userGrowth.rows,
        },
        rfqs: {
          by_status: rfqStats.rows,
        },
        suppliers: supplierStats.rows[0] || {},
        top_materials: topMaterials.rows,
      },
      period,
    });
  } catch (error) {
    console.error("[Admin Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
