/**
 * Middleware.ts
 * 
 * 🚨 CRITICAL: Middleware runs in Edge Runtime
 * - NO imports of Node.js modules (pg, prisma, bcrypt, etc.)
 * - NO NextAuth auth() wrapper - it triggers schema loading
 * - Simple redirect logic ONLY
 * 
 * Authentication check happens in API routes and pages via /api/auth
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Get session token from cookies
  const sessionToken = req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value;

  const isLoggedIn = !!sessionToken;
  const isProtectedRoute = 
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/suppliers') ||
    req.nextUrl.pathname.startsWith('/architects') ||
    req.nextUrl.pathname.startsWith('/api/communications') ||
    req.nextUrl.pathname.startsWith('/api/support') ||
    req.nextUrl.pathname.startsWith('/api/rfq');

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/suppliers/:path*',
    '/architects/:path*',
    '/api/communications/:path*',
    '/api/support/:path*',
    '/api/rfq/:path*',
  ],
};
