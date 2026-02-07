/**
 * Proxy.ts (Next.js 16+)
 * 
 * 🚨 CRITICAL: Proxy runs in Edge Runtime
 * - NO imports of Node.js modules (pg, prisma, bcrypt, etc.)
 * - NO NextAuth auth() wrapper - it triggers schema loading
 * - Simple redirect logic ONLY
 * 
 * Authentication check happens in API routes and pages via /api/auth
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Define public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/login/callback',
    '/signup',
    '/api/auth',
    '/api/public-config'
  ];
  
  // Check if current path is public
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
  
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
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

  if (req.nextUrl.pathname.startsWith('/dashboard') && token) {
    const role = (token as { role?: string }).role || 'buyer';

    if (req.nextUrl.pathname === '/dashboard') {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, req.url));
    }

    if (req.nextUrl.pathname.startsWith('/dashboard/supplier') && role !== 'supplier') {
      return NextResponse.redirect(new URL('/dashboard/buyer', req.url));
    }

    if (req.nextUrl.pathname.startsWith('/dashboard/buyer') && role !== 'buyer') {
      return NextResponse.redirect(new URL('/dashboard/supplier', req.url));
    }
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
