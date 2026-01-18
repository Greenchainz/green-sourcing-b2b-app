
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Supplier } from './types';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { name, email, phone, website, company } = body;

        // Basic validation
        if (!name || !email) {
            return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
        }

        // Check if supplier already exists
        const existingSupplier = await query(
            'SELECT id FROM suppliers WHERE email = $1',
            [email]
        );

        if (existingSupplier.rows.length > 0) {
            return NextResponse.json({ error: 'Supplier with this email already exists' }, { status: 409 });
        }

        // 1. Create or Find Company
        let companyId = body.company_id; // If provided

        if (!companyId && company) {
            const companyRes = await query(
                `INSERT INTO companies (name, description, logo_url)
                 VALUES ($1, $2, $3)
                 RETURNING id`, // FIXED: returning id, not company_id as id
                [company.name, company.description, company.logo_url]
            );
            companyId = companyRes.rows[0].id;
        }

        if (!companyId) {
             return NextResponse.json({ error: 'Company information or company_id is required' }, { status: 400 });
        }

        // 2. Create Supplier
        // FIXED: Added user_id to INSERT
        const supplierRes = await query(
            `INSERT INTO suppliers (company_id, user_id, name, email, phone, website, verification_status)
             VALUES ($1, $2, $3, $4, $5, $6, 'unverified')
             RETURNING *`,
            [companyId, user.userId, name, email, phone, website]
        );

        const newSupplier = supplierRes.rows[0] as unknown as Supplier;

        return NextResponse.json(newSupplier, { status: 201 });

    } catch (error: unknown) {
        console.error('Create Supplier Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
