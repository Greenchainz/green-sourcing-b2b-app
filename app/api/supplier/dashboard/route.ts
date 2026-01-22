
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

// Types for the dashboard response
interface DashboardMetrics {
    active_rfqs: number;
    profile_views: number;
    completion_score: number;
    response_time_hours: number;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const supplierId = searchParams.get('supplier_id');

        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        if (!supplierId) {
             return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
        }

        // Ownership Check
        if (user.role !== 'admin') {
            const ownershipCheck = await query(
                'SELECT id FROM suppliers WHERE id = $1 AND user_id = $2',
                [supplierId, user.userId]
            );
            if (ownershipCheck.rows.length === 0) {
                 return NextResponse.json({ error: 'Forbidden: You do not own this supplier profile' }, { status: 403 });
            }
        }

        // 1. Get Metrics

        // A. Active RFQs
        const activeRfqsResult = await query(
            `SELECT COUNT(*) as count
             FROM rfqs
             WHERE supplier_id = $1
             AND status IN ('Pending', 'Viewed')`,
            [supplierId]
        );
        const activeCount = parseInt(activeRfqsResult.rows[0]?.count || '0');

        // B. Profile Views (Last 30 days)
        const viewsResult = await query(
            `SELECT COUNT(*) as count
             FROM analytics_events
             WHERE supplier_id = $1
             AND event_type = 'ProfileView'
             AND created_at > NOW() - INTERVAL '30 days'`,
            [supplierId]
        );
        const viewsCount = parseInt(viewsResult.rows[0]?.count || '0');

        // C. Verification/Completion Score
        const scoreResult = await query(
            `SELECT score, response_rate
             FROM supplier_verification_scores
             WHERE supplier_id = $1`,
            [supplierId]
        );
        const scoreData = scoreResult.rows[0] || { score: 0, response_rate: 0 };

        // D. Recent RFQs List
        const recentRfqsResult = await query(
            `SELECT
                r.rfq_id,
                r.project_name,
                p.name as material_name,
                r.quantity_needed as quantity,
                r.unit,
                r.deadline_date as deadline,
                r.status
             FROM rfqs r
             LEFT JOIN products p ON r.product_id = p.product_id
             WHERE r.supplier_id = $1
             ORDER BY r.created_at DESC
             LIMIT 5`,
            [supplierId]
        );

        // Format Data
        const metrics: DashboardMetrics = {
            active_rfqs: activeCount,
            profile_views: viewsCount,
            completion_score: parseFloat(scoreData.score || '0'),
            response_time_hours: 4 // Hardcoded avg for MVP
        };

        return NextResponse.json({
            metrics,
            recent_rfqs: recentRfqsResult.rows
        });

    } catch (error: unknown) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
