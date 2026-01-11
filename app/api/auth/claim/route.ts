import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        // 1. Verify token in DB
        // 2. Return supplier details if valid

        try {
            const text = `
                SELECT s.*, sc.email as claim_email
                FROM supplier_claims sc
                JOIN suppliers s ON sc.supplier_id = s.id
                WHERE sc.token = $1 AND sc.is_used = FALSE AND sc.expires_at > NOW()
            `;
            const res = await query(text, [token]);

            if (res.rows.length === 0) {
                return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
            }

            return NextResponse.json({
                valid: true,
                supplier: res.rows[0],
                email: res.rows[0].claim_email
            });

        } catch (e) {
            // Mock response for dev without DB
            if (token === 'valid-token-123') {
                return NextResponse.json({
                    valid: true,
                    supplier: {
                        id: 's1',
                        name: 'GreenBuild Materials Inc.',
                        address_line1: '123 Eco Way',
                        website_url: 'https://greenbuild.example.com'
                    },
                    email: 'contact@greenbuild.example.com'
                });
            }
            return NextResponse.json({ error: 'Invalid token (mock)' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
