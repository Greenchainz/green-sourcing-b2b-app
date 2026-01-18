
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // Access Control
        const supplierCheck = await query(
            'SELECT id, user_id, verification_status FROM suppliers WHERE id = $1',
            [id]
        );

        if (supplierCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }

        const supplier = supplierCheck.rows[0];
        const isAdmin = user.role === 'admin';
        const isOwner = supplier.user_id === user.userId;
        const isArchitect = user.role === 'architect';
        const isVerified = supplier.verification_status === 'verified';

        if (!isAdmin && !isOwner) {
             if (!isArchitect || !isVerified) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const result = await query(
            `SELECT * FROM products WHERE supplier_id = $1 ORDER BY created_at DESC`,
            [id]
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('List Products Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params; // supplier_id
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // Ownership Check
        if (user.role !== 'admin') {
            const ownershipCheck = await query(
                'SELECT id FROM suppliers WHERE id = $1 AND user_id = $2',
                [id, user.userId]
            );
            if (ownershipCheck.rows.length === 0) {
                 return NextResponse.json({ error: 'Forbidden: You do not own this supplier profile' }, { status: 403 });
            }
        }

        const body = await req.json();
        const { name, description, category, price, gwp, epd_url } = body;

        if (!name) {
             return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO products (supplier_id, name, description, category, price, gwp, epd_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, name, description, category, price, gwp, epd_url]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Create Product Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
