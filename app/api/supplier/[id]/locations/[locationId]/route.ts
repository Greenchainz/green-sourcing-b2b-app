
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; locationId: string }> }) {
    const { id, locationId } = await params;
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
        const { address, city, state, zip, latitude, longitude } = body;

        const result = await query(
            `UPDATE locations
             SET address = COALESCE($1, address),
                 city = COALESCE($2, city),
                 state = COALESCE($3, state),
                 zip = COALESCE($4, zip),
                 latitude = COALESCE($5, latitude),
                 longitude = COALESCE($6, longitude),
                 updated_at = NOW()
             WHERE id = $7 AND supplier_id = $8
             RETURNING *`,
            [address, city, state, zip, latitude, longitude, locationId, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Location not found or access denied' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Update Location Error:', error);
        if (error instanceof Error && error.message.includes('updated_at')) {
             return NextResponse.json({ error: 'Database schema mismatch: updated_at missing on locations' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; locationId: string }> }) {
    const { id, locationId } = await params;
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
            `DELETE FROM locations WHERE id = $1 AND supplier_id = $2 RETURNING id`,
            [locationId, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Location not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Delete Location Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
