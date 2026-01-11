
import { NextRequest, NextResponse } from 'next/server';
import { runQueryOne } from '@/lib/azure/config';

interface SupplierClaim {
    profile_id: number;
    supplier_id: number;
    email: string;
    company_name: string;
    is_claimed: boolean;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // Check if token exists and is not yet claimed
        // We join with Companies and Users to get context for the frontend (e.g. "Welcome back, [Company]!")
        const query = `
            SELECT 
                sp.profile_id,
                sp.supplier_id,
                u.email,
                c.companyname as company_name,
                sp.is_claimed
            FROM supplier_profiles sp
            JOIN suppliers s ON sp.supplier_id = s.supplierid
            JOIN companies c ON s.companyid = c.companyid
            JOIN users u ON u.companyid = c.companyid
            WHERE sp.claim_token = @token
        `;

        const result = await runQueryOne<SupplierClaim>(query, { token });

        if (!result) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
        }

        if (result.is_claimed) {
            return NextResponse.json({
                error: 'Profile already claimed',
                alreadyClaimed: true,
                companyName: result.company_name
            }, { status: 409 });
        }

        return NextResponse.json({
            valid: true,
            companyName: result.company_name,
            email: result.email
        });

    } catch (error: unknown) {
        console.error('Verify token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
