
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; productId: string }> }) {
    const { id, productId } = await params;
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

        const result = await query(
            `UPDATE products
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 category = COALESCE($3, category),
                 price = COALESCE($4, price),
                 gwp = COALESCE($5, gwp),
                 epd_url = COALESCE($6, epd_url),
                 updated_at = NOW()
             WHERE id = $7 AND supplier_id = $8
             RETURNING *`,
            [name, description, category, price, gwp, epd_url, productId, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Update Product Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; productId: string }> }) {
    const { id, productId } = await params;
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

        const result = await query(
            `DELETE FROM products WHERE id = $1 AND supplier_id = $2 RETURNING id`,
            [productId, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete Product Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
