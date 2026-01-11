
import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runQueryOne } from '@/lib/azure/config';

// Simple hash function for development (replace with proper bcrypt in production)
function simpleHash(password: string): string {
    // This is a basic hash - in production, use proper bcrypt
    return Buffer.from(password).toString('base64');
}

interface SupplierProfile {
    user_id: string;
}

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = simpleHash(password);

        // 1. Get user_id from token (Azure SQL)
        const profileData = await runQueryOne<SupplierProfile>(
            `SELECT user_id FROM supplier_profiles 
             WHERE claim_token = @token AND is_claimed = 0`,
            { token }
        );

        if (!profileData) {
            throw new Error('Invalid token or already claimed');
        }

        const userId = profileData.user_id;

        // 2. Update User password (Azure SQL)
        await runQuery(
            `UPDATE users SET password_hash = @hashedPassword WHERE id = @userId`,
            { hashedPassword, userId }
        );

        // 3. Update Profile status (Azure SQL)
        await runQuery(
            `UPDATE supplier_profiles 
             SET is_claimed = 1, 
                 claimed_at = @claimedAt, 
                 verification_status = 'verified', 
                 claim_token = NULL 
             WHERE user_id = @userId`,
            { claimedAt: new Date().toISOString(), userId }
        );

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        console.error('Claim complete error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
