import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateTraceId, logAuthEvent, incrementAuthMetric } from '@/lib/auth/diagnostics'
import { getClient, query } from '@/lib/db'
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('state') || '/dashboard' // 'state' param from signin is used as 'next'
  const error = requestUrl.searchParams.get('error')
  const traceId = generateTraceId();

  logAuthEvent('info', 'Callback initiated', { traceId, step: 'init', metadata: { code: !!code, error } });

  // Handle OAuth errors from Azure
  if (error) {
    const errorDescription = requestUrl.searchParams.get('error_description')
    logAuthEvent('error', 'Azure AD OAuth error', { traceId, metadata: { error, errorDescription } });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    )
  }

  // No code = invalid callback
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', requestUrl.origin)
    )
  }

  // Validate required environment variables
  const tenantId = process.env.AZURE_AD_TENANT_ID || process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET

  // Use the exact same redirect URI as sent in the authorize request
  // Must match exactly what is in signin/route.ts
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  // Ensure no trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const redirectUri = `${cleanBaseUrl}/api/auth/callback`

  if (!tenantId || !clientId || !clientSecret) {
    logAuthEvent('error', 'Missing Azure AD config', { traceId });
    return NextResponse.redirect(
      new URL('/login?error=config_error', requestUrl.origin)
    )
  }

  try {
    // Exchange the Authorization Code for tokens
    logAuthEvent('info', 'Exchanging code for token', { traceId, metadata: { redirectUri } });
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          scope: 'openid profile email',
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          client_secret: clientSecret,
        }),
      }
    )

    if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        logAuthEvent('error', 'Azure AD token exchange failed', { traceId, metadata: { status: tokenResponse.status, errorData, redirectUri } });
        return NextResponse.redirect(
            new URL(`/login?error=token_exchange_failed`, requestUrl.origin)
        )
    }

    const tokens = await tokenResponse.json()

    if (tokens.error) {
        logAuthEvent('error', 'Azure AD token error response', { traceId, metadata: { error: tokens.error } });
        return NextResponse.redirect(
            new URL(`/login?error=azure_auth_failed`, requestUrl.origin)
        )
    }

    // Decode ID Token to get user info (email, name, oid)
    // Using base64url encoding for correct decoding
    const idTokenParts = tokens.id_token.split('.');
    if (idTokenParts.length !== 3) {
      throw new Error('Invalid ID token format');
    }
    const payload = idTokenParts[1];
    const userData = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // --- Start Internal User Sync Logic (Inlined from azure-callback) ---
    // This avoids self-referential fetch and potential networking issues

    const email = userData.email || userData.preferred_username;
    const firstName = userData.given_name;
    const lastName = userData.family_name;
    const azureId = userData.oid;

    logAuthEvent('info', 'Syncing user internally', {
        traceId,
        metadata: { email, azureId }
    });

    const client = await getClient();
    let appToken, appRefreshToken;

    try {
        await client.query('BEGIN');

        // Check/Update/Create User
        const userCheck = await client.query(
            'SELECT id, email, role, first_name, last_name FROM Users WHERE azure_id = $1 OR email = $2',
            [azureId, email]
        );

        let userId, userRole;

        if (userCheck.rows.length > 0) {
            const user = userCheck.rows[0];
            userId = user.id;
            userRole = user.role;

            await client.query(
                'UPDATE Users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
                [userId]
            );
        } else {
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

        // Generate Tokens
        appToken = generateToken({ userId, email, role: userRole });
        appRefreshToken = generateRefreshToken({ userId, email });

        // Store Refresh Token
        await query(
            `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
             VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
             ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
            [userId, appRefreshToken]
        );

        incrementAuthMetric('auth_success', 'azure', 'callback-inline');

    } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
    } finally {
        client.release();
    }

    // --- End Internal User Sync Logic ---

    // SUCCESS: Set cookies and redirect
    const response = NextResponse.redirect(
      new URL(next, requestUrl.origin)
    )

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    };

    response.cookies.set('greenchainz-auth-token', appToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set('refresh_token', appRefreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });

    // Legacy cookies
    response.cookies.set('token', appToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set('session', appToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });

    logAuthEvent('info', 'Callback complete, redirecting', { traceId });

    return response

  } catch (error) {
    console.error('Auth callback error:', error)
    logAuthEvent('error', 'Auth callback exception', { traceId, error });
    return NextResponse.redirect(
      new URL('/login?error=server_error', requestUrl.origin)
    )
  }
}
