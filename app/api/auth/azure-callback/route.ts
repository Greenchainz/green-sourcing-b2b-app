import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt';
import {
  generateTraceId,
  logAuthEvent,
  incrementAuthMetric,
  formatUserError
} from '@/lib/auth/diagnostics';

export async function POST(req: NextRequest) {
  const traceId = generateTraceId();

  logAuthEvent('info', 'Azure callback initiated', {
    traceId,
    step: 'init',
    metadata: { url: req.url }
  });

  try {
    // Ensure required server-side config is present (helps avoid silent 500s)
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logAuthEvent('error', 'DATABASE_URL missing for Azure callback', {
        traceId,
        step: 'validate-config',
        statusCode: 500,
      });
      return NextResponse.json({
        error: 'Server authentication config missing',
        message: `DATABASE_URL is not configured (Trace ID: ${traceId})`,
        traceId,
      }, { status: 500 });
    }

    const { email, firstName, lastName, azureId } = await req.json();

    logAuthEvent('info', 'Request body parsed', {
      traceId,
      step: 'parse-body',
      metadata: {
        hasEmail: !!email,
        hasAzureId: !!azureId,
        hasFirstName: !!firstName,
        hasLastName: !!lastName
      }
    });

    if (!email || !azureId) {
      logAuthEvent('error', 'Missing required fields', {
        traceId,
        step: 'validate-input',
        statusCode: 400,
        metadata: { hasEmail: !!email, hasAzureId: !!azureId }
      });
      incrementAuthMetric('auth_failure', 'azure', 'missing-fields');
      return NextResponse.json({
        error: 'Email and Azure ID required',
        traceId
      }, { status: 400 });
    }

    // Get a database client for transaction
    logAuthEvent('info', 'Acquiring database connection', {
      traceId,
      step: 'db-connect'
    });

    const client = await getClient();

    try {
      await client.query('BEGIN');

      logAuthEvent('info', 'Database transaction started', {
        traceId,
        step: 'db-begin'
      });

      // Check if user exists by azure_id or email
      logAuthEvent('info', 'Checking for existing user', {
        traceId,
        step: 'db-user-check',
        metadata: { email, azureId: `${azureId.substring(0, 8)}...` }
      });

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

        logAuthEvent('info', 'Existing user found, updating last login', {
          traceId,
          step: 'db-update-user',
          metadata: { userId, userRole }
        });

        await client.query(
          'UPDATE Users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
          [userId]
        );
      } else {
        // Create new user - default role is 'architect'
        logAuthEvent('info', 'Creating new user', {
          traceId,
          step: 'db-create-user',
          metadata: { email, role: 'architect' }
        });

        const result = await client.query(
          `INSERT INTO Users (email, first_name, last_name, azure_id, role, oauth_provider, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id, role`,
          [email, firstName || null, lastName || null, azureId, 'architect', 'azure']
        );

        userId = result.rows[0].id;
        userRole = result.rows[0].role;

        logAuthEvent('info', 'New user created', {
          traceId,
          step: 'db-user-created',
          metadata: { userId, userRole }
        });
      }

      await client.query('COMMIT');

      logAuthEvent('info', 'Database transaction committed', {
        traceId,
        step: 'db-commit'
      });

      // Generate JWT token
      logAuthEvent('info', 'Generating JWT tokens', {
        traceId,
        step: 'generate-tokens'
      });

      const token = generateToken({ userId, email, role: userRole });

      // Generate refresh token (valid for 30 days)
      const refreshToken = generateRefreshToken({ userId, email });

      // Store refresh token in database
      logAuthEvent('info', 'Storing refresh token', {
        traceId,
        step: 'store-refresh-token'
      });

      await query(
        `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [userId, refreshToken]
      );

      // Build full name
      const fullName = [userFirstName, userLastName].filter(Boolean).join(' ') || null;

      logAuthEvent('info', 'Authentication successful', {
        traceId,
        step: 'success',
        statusCode: 200,
        metadata: { userId, userRole }
      });

      incrementAuthMetric('auth_success', 'azure', 'callback');

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
        },
        traceId
      });

      // Also set HTTP-only cookie for security
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      };

      response.cookies.set('greenchainz-auth-token', token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
      response.cookies.set('refresh_token', refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
      response.cookies.set('token', token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 }); // Legacy

      return response;

    } catch (dbError) {
      await client.query('ROLLBACK');
      logAuthEvent('error', 'Database transaction rolled back', {
        traceId,
        step: 'db-rollback',
        error: dbError
      });
      throw dbError;
    } finally {
      client.release();
      logAuthEvent('info', 'Database connection released', {
        traceId,
        step: 'db-release'
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide clearer hints for common backend issues (e.g., missing tables)
    let hint: string | undefined;
    if (errorMessage.toLowerCase().includes('refreshtokens')) {
      hint = 'RefreshTokens table is missing; run the 20260107_* migration.';
    } else if (errorMessage.toLowerCase().includes('users')) {
      hint = 'Users table/columns missing expected fields (email, azure_id).';
    }

    logAuthEvent('error', 'Azure callback exception', {
      traceId,
      step: 'exception',
      statusCode: 500,
      error
    });

    incrementAuthMetric('auth_failure', 'azure', 'callback-exception');

    const userError = formatUserError(error, traceId, 'Authentication failed');
    return NextResponse.json({
      error: 'Authentication failed',
      details: errorMessage,
      hint,
      message: userError.message,
      traceId
    }, { status: 500 });
  }
}
