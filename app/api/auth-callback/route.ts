import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// PostgreSQL connection pool - ONLY in Node.js context
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  ssl: { rejectUnauthorized: false }
});

/**
 * POST /api/auth-callback
 * Called by NextAuth.js signIn callback to handle database operations
 * 
 * Body:
 * {
 *   action: 'check_user' | 'create_user' | 'update_login',
 *   email: string,
 *   name?: string,
 *   entra_id?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, name, entra_id } = body;

    if (!email || !action) {
      return NextResponse.json(
        { error: 'email and action required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      if (action === 'check_user') {
        // Check if user exists
        const result = await client.query(
          'SELECT id, role FROM "Users" WHERE email = $1',
          [email]
        );
        return NextResponse.json({
          exists: result.rows.length > 0,
          user: result.rows[0] || null
        });
      }

      if (action === 'create_user') {
        // Create new user
        const insertResult = await client.query(
          `INSERT INTO "Users" (email, full_name, role, entra_id, created_at, last_login)
           VALUES ($1, $2, 'Buyer', $3, NOW(), NOW())
           RETURNING id`,
          [email, name || 'User', entra_id || null]
        );

        const userId = insertResult.rows[0].id;

        // Create Architects profile
        await client.query(
          'INSERT INTO "Architects" (user_id) VALUES ($1)',
          [userId]
        );

        console.log('✅ New user created via OAuth:', email);
        return NextResponse.json({ success: true, user_id: userId });
      }

      if (action === 'update_login') {
        // Update login timestamp
        await client.query(
          'UPDATE "Users" SET last_login = NOW() WHERE email = $1',
          [email]
        );
        console.log('✅ User login updated:', email);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Auth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
