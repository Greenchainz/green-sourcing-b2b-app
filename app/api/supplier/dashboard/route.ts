
import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runQueryOne, runScalar } from '@/lib/azure/config';

// Types for the dashboard response
interface DashboardMetrics {
    active_rfqs: number;
    profile_views: number;
    completion_score: number;
    response_time_hours: number;
}

interface RecentRFQ {
    rfq_id: number;
    project_name: string;
    material_name: string;
    quantity: number;
    unit: string;
    deadline: string; // ISO date
    status: string;
}

export async function GET(req: NextRequest) {
    try {
        // ------------------------------------------------------------------
        // MOCK AUTH: In real app, get user from session/cookie
        // For now, accept ?supplier_id=X or default to 1 (Demo Supplier)
        // ------------------------------------------------------------------
        const { searchParams } = new URL(req.url);
        const supplierIdParam = searchParams.get('supplier_id');
        const supplierId = supplierIdParam ? parseInt(supplierIdParam) : 1;

        // 1. Get Metrics
        // JOINs or multiple queries. For simplicity, we run parallel queries.

        // A. Active RFQs (Status = 'Pending' or 'Viewed' sent to this supplier)
        // Actually, RFQs table links to SupplierID if it's a direct RFQ?
        // Schema: RFQs has SupplierID.
        const activeRfqsQuery = `
      SELECT COUNT(*) as count 
      FROM rfqs 
      WHERE supplier_id = @supplierId 
      AND status IN ('Pending', 'Viewed')
    `;

        // B. Profile Views (Last 30 days)
        const viewsQuery = `
      SELECT COUNT(*) as count 
      FROM analytics_events
      WHERE supplier_id = @supplierId 
      AND event_type = 'ProfileView'
      AND created_at > DATEADD(day, -30, GETDATE())
    `;

        // C. Verification/Completion Score
        // Using cached table or calculating on fly.
        // Schema: supplier_verification_scores
        const scoreQuery = `
      SELECT score, response_rate 
      FROM supplier_verification_scores 
      WHERE supplier_id = @supplierId
    `;

        // D. Recent RFQs List
        const recentRfqsQuery = `
      SELECT TOP 5
        r.rfq_id,
        r.project_name,
        p.name as material_name,
        r.quantity_needed as quantity,
        r.unit,
        r.deadline_date as deadline,
        r.status
      FROM rfqs r
      LEFT JOIN products p ON r.product_id = p.product_id
      WHERE r.supplier_id = @supplierId
      ORDER BY r.created_at DESC
    `;

        const [activeCount, viewsCount, scoreData, recentRfqs] = await Promise.all([
            runScalar<number>(activeRfqsQuery, { supplierId }),
            runScalar<number>(viewsQuery, { supplierId }),
            runQueryOne<{ score: number, response_rate: number }>(scoreQuery, { supplierId }),
            runQuery<RecentRFQ>(recentRfqsQuery, { supplierId })
        ]);

        // Format Data
        const metrics: DashboardMetrics = {
            active_rfqs: activeCount || 0,
            profile_views: viewsCount || 0,
            completion_score: scoreData?.score || 0,
            response_time_hours: 4 // Hardcoded avg for MVP or calc from DB
        };

        return NextResponse.json({
            metrics,
            recent_rfqs: recentRfqs
        });

    } catch (error: unknown) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
