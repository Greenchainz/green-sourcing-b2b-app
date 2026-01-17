import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  // Check both cookie names
  const token = request.headers.get('cookie')?.match(/greenchainz-auth-token=([^;]+)/)?.[1] ||
                request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  // Session is valid
  return NextResponse.json({
    authenticated: true,
    user: {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    },
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Approximate based on token validity
  });
}
