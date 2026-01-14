import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName, azureId } = await req.json();

    if (!email || !azureId) {
      return NextResponse.json({ error: 'Email and Azure ID required' }, { status: 400 });
    }

    // Get a database client for transaction
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Check if user exists by azure_id or email
      const userCheck = await client.query(
        'SELECT id, email, role, first_name, last_name FROM Users WHERE azure_id = $1 OR email = $2',
        [azureId, email]
      );

      let userId: string;
      let userRole: string;
      let userFirstName: string | null = firstName || null;
      let userLastName: string | null = lastName || null;

      if (userCheck.rows.length > 0) {
        // User exists - update last login
        const user = userCheck.rows[0];
        userId = user.id;
        userRole = user.role;
        userFirstName = user.first_name || firstName || null;
        userLastName = user.last_name || lastName || null;

        await client.query(
          'UPDATE Users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
          [userId]
        );
      } else {
        // Create new user - default role is 'architect'
        const result = await client.query(
          `INSERT INTO Users (email, first_name, last_name, azure_id, role, oauth_provider, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id, role`,
          [email, firstName || null, lastName || null, azureId, 'architect', 'azure']
        );

        userId = result.rows[0].id;
        userRole = result.rows[0].role;
      }

      await client.query('COMMIT');

      // Generate JWT token
      const token = generateToken({ userId, email, role: userRole });

      // Generate refresh token (valid for 30 days)
      const refreshToken = generateRefreshToken({ userId, email });

      // Store refresh token in database
      await query(
        `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [userId, refreshToken]
      );

      // Build full name
      const fullName = [userFirstName, userLastName].filter(Boolean).join(' ') || null;

      // Return user data and tokens
      const response = NextResponse.json({
        token,
        refreshToken,
        user: {
          id: userId,
          email,
          firstName: userFirstName,
          lastName: userLastName,
          fullName,
          role: userRole,
          oauthProvider: 'azure'
        }
      });

      // Also set HTTP-only cookie for security
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Azure Callback Exception:', errorMessage);
    return NextResponse.json({ 
      error: 'Authentication failed', 
      details: errorMessage 
    }, { status: 500 });
  }
}
