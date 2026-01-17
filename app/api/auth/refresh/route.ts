import { NextResponse } from 'next/server';
import { generateToken, generateRefreshToken, verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { generateTraceId, logAuthEvent } from '@/lib/auth/diagnostics';

export async function POST(request: Request) {
  const traceId = generateTraceId();
  let refreshToken: string | undefined;

  // Try to get refresh token from cookie first
  const cookieHeader = request.headers.get('cookie');
  refreshToken = cookieHeader?.match(/refresh_token=([^;]+)/)?.[1];

  // If not in cookie, check body
  if (!refreshToken) {
    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // Ignore body parsing error
    }
  }

  if (!refreshToken) {
    return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
  }

  // Verify the refresh token structure first (to get userId)
  const decoded = verifyToken(refreshToken); // Using verifyToken which checks JWT signature.
  // Note: jwt.ts `verifyToken` uses JWT_SECRET. Refresh tokens are also signed with JWT_SECRET in `jwt.ts`.

  if (!decoded) {
    logAuthEvent('warn', 'Invalid refresh token signature', { traceId });
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  try {
    // Check if refresh token is in database and valid
    const res = await query(
      'SELECT user_id, token, expires_at FROM RefreshTokens WHERE user_id = $1 AND token = $2',
      [decoded.userId, refreshToken]
    );

    if (res.rows.length === 0) {
      logAuthEvent('warn', 'Refresh token not found in DB or mismatch', { traceId, metadata: { userId: decoded.userId } });
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const storedToken = res.rows[0];

    if (new Date(storedToken.expires_at) < new Date()) {
        logAuthEvent('warn', 'Refresh token expired', { traceId, metadata: { userId: decoded.userId } });
        return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 });
    }

    // Get fresh user info to ensure role/permissions are up to date
    const userRes = await query('SELECT role, email FROM Users WHERE id = $1', [decoded.userId]);
    if (userRes.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userRes.rows[0];

    // Generate new tokens
    const newAccessToken = generateToken({
      userId: decoded.userId,
      email: user.email,
      role: user.role
    });

    const newRefreshToken = generateRefreshToken({
      userId: decoded.userId,
      email: user.email
    });

    // Rotate refresh token in DB
    await query(
      `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
      [decoded.userId, newRefreshToken]
    );

    logAuthEvent('info', 'Token refreshed successfully', { traceId, metadata: { userId: decoded.userId } });

    const response = NextResponse.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });

    // Update cookies
    response.cookies.set('greenchainz-auth-token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days (match JWT expiry)
      path: '/'
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return response;

  } catch (error) {
    logAuthEvent('error', 'Token refresh error', { traceId, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
