import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const MOCK_RFQS = [
  {
    id: '101',
    project_name: 'Skyline Office Tower',
    buyer_name: 'Studio Alpha Architects',
    product_name: 'Eco-Batt Insulation',
    quantity: 5000,
    unit: 'sqm',
    status: 'pending',
    received_at: '2023-10-25T10:00:00Z',
    message: 'We are looking for LEED Gold compatible insulation.'
  },
  {
    id: '102',
    project_name: 'Residential Complex B',
    buyer_name: 'BuildRight Construction',
    product_name: 'Bamboo Flooring',
    quantity: 1200,
    unit: 'sqm',
    status: 'quoted',
    received_at: '2023-10-24T14:30:00Z',
    message: 'Please provide pricing for bulk order.'
  }
];

export async function GET() {
  try {
    try {
        const text = `
            SELECT r.*, p.name as product_name, u.full_name as buyer_name
            FROM rfqs r
            LEFT JOIN products p ON r.product_id = p.id
            LEFT JOIN users u ON r.buyer_user_id = u.id
            ORDER BY r.created_at DESC
        `;
        const res = await query(text);
        if (res.rows.length > 0) {
            return NextResponse.json(res.rows);
        }
    } catch (_e) {
        console.warn("DB failed, using mock RFQs");
    }
    return NextResponse.json(MOCK_RFQS);
  } catch (_error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
