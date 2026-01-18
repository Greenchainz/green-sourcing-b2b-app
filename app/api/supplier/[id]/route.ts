
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

// Helper to handle params
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // Fetch supplier first to check permissions
        const supplierCheck = await query(
            'SELECT id, user_id, verification_status FROM suppliers WHERE id = $1',
            [id]
        );

        if (supplierCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }

        const supplier = supplierCheck.rows[0];

        // Access Control
        const isAdmin = user.role === 'admin';
        const isOwner = supplier.user_id === user.userId;
        const isArchitect = user.role === 'architect';
        const isVerified = supplier.verification_status === 'verified';

        if (!isAdmin && !isOwner) {
            // If not admin or owner, must be architect AND supplier must be verified
            if (!isArchitect || !isVerified) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const result = await query(
            `SELECT s.*, c.name as company_name, c.description as company_description, c.logo_url as company_logo
             FROM suppliers s
             JOIN companies c ON s.company_id = c.id
             WHERE s.id = $1`,
            [id]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Get Supplier Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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
        const { name, phone, website, company } = body;

        // Update Supplier
        const supplierRes = await query(
            `UPDATE suppliers
             SET name = COALESCE($1, name),
                 phone = COALESCE($2, phone),
                 website = COALESCE($3, website),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [name, phone, website, id]
        );

        if (supplierRes.rows.length === 0) {
            return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }

        // Update Company if provided
        if (company) {
             const supplier = supplierRes.rows[0];
             await query(
                 `UPDATE companies
                  SET name = COALESCE($1, name),
                      description = COALESCE($2, description),
                      logo_url = COALESCE($3, logo_url),
                      updated_at = NOW()
                  WHERE id = $4`,
                 [company.name, company.description, company.logo_url, supplier.company_id]
             );
        }

        // Return updated full object
        const result = await query(
            `SELECT s.*, c.name as company_name, c.description as company_description, c.logo_url as company_logo
             FROM suppliers s
             JOIN companies c ON s.company_id = c.id
             WHERE s.id = $1`,
            [id]
        );

        return NextResponse.json(result.rows[0]);

    } catch (error) {
        console.error('Update Supplier Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // Allow Admin OR Owner to soft delete
        if (user.role !== 'admin') {
            const ownershipCheck = await query(
                'SELECT id FROM suppliers WHERE id = $1 AND user_id = $2',
                [id, user.userId]
            );
            if (ownershipCheck.rows.length === 0) {
                 return NextResponse.json({ error: 'Forbidden: You do not own this supplier profile' }, { status: 403 });
            }
        }

        // Soft Delete: Set verification_status to 'rejected'
        const result = await query(
            `UPDATE suppliers
             SET verification_status = 'rejected', updated_at = NOW()
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
             return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Supplier soft deleted (rejected)' });
    } catch (error) {
        console.error('Delete Supplier Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
