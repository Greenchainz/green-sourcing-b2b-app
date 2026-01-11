import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// MOCK DATA for when DB is empty or connection fails (for demo purposes)
const MOCK_STATS = {
  profileViews: 1240,
  rfqsReceived: 12,
  responseRate: 85,
  actionItems: [
    { type: 'rfq', message: 'New RFQ from Studio Alpha', id: '1', priority: 'high' },
    { type: 'cert', message: 'ISO 9001 expiring in 30 days', id: '2', priority: 'medium' },
    { type: 'profile', message: 'Complete your profile (80%)', id: '3', priority: 'low' }
  ]
};

export async function GET() {
  try {
    // In a real scenario, we would get the supplier_id from the session
    // const session = await getSession();
    // const supplierId = session.supplierId;

    // For now, let's try to query. If it fails (no DB), return mock.
    try {
        const text = `
        SELECT
            profile_views,
            rfqs_received,
            response_rate_percent
        FROM supplier_analytics
        LIMIT 1`; // Just getting the first one for MVP/Demo

        const res = await query(text);

        if (res.rows.length > 0) {
            return NextResponse.json({
                ...res.rows[0],
                actionItems: MOCK_STATS.actionItems // Still mocking action items for now
            });
        }
    } catch (dbError) {
        console.warn("Database query failed, returning mock data", dbError);
    }

    return NextResponse.json(MOCK_STATS);

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
