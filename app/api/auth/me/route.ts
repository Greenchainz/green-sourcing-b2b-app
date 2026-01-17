import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { generateTraceId, logAuthEvent } from '@/lib/auth/diagnostics';

export async function GET(request: Request) {
  const traceId = generateTraceId();
  // Check both cookie names
  const token = request.headers.get('cookie')?.match(/greenchainz-auth-token=([^;]+)/)?.[1] ||
                request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    logAuthEvent('warn', 'Invalid token provided to /me', { traceId });
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const res = await query(
      'SELECT id, email, first_name, last_name, role, oauth_provider, created_at FROM Users WHERE id = $1',
      [decoded.userId]
    );

    if (res.rows.length === 0) {
      logAuthEvent('warn', 'User not found for token', { traceId, metadata: { userId: decoded.userId } });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = res.rows[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: [user.first_name, user.last_name].filter(Boolean).join(' '),
        role: user.role,
        provider: user.oauth_provider
      }
    });
  } catch (error) {
    logAuthEvent('error', 'Database error in /me', { traceId, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
