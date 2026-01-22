import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth/jwt';

// Use Node.js runtime to support jsonwebtoken library
export const runtime = 'nodejs';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check for the EXACT cookie name we set in the API
  const token = request.cookies.get('greenchainz-auth-token')?.value;

  // 2. Define protected paths
  const protectedPaths = ['/architect', '/supplier', '/admin', '/dashboard'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  // 3. Handle dashboard-specific logic with role-based redirects
  if (pathname.startsWith('/dashboard')) {
    // If no token on dashboard route, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify token and extract role
    const payload = verifyToken(token);
    
    // If token is invalid, redirect to login
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Normalize role (handle case variations)
    const role = payload.role?.toLowerCase();

    // Redirect /dashboard to role-specific dashboard
    if (pathname === '/dashboard') {
      if (role === 'supplier') {
        return NextResponse.redirect(new URL('/dashboard/supplier', request.url));
      } else if (role === 'buyer') {
        return NextResponse.redirect(new URL('/dashboard/buyer', request.url));
      }
      // If role is neither supplier nor buyer, continue (may be admin or other roles)
    }

    // Prevent cross-dashboard access
    if (role === 'supplier' && pathname.startsWith('/dashboard/buyer')) {
      return NextResponse.redirect(new URL('/dashboard/supplier', request.url));
    }
    
    if (role === 'buyer' && pathname.startsWith('/dashboard/supplier')) {
      return NextResponse.redirect(new URL('/dashboard/buyer', request.url));
    }

    // User is authenticated with valid token for their dashboard
    return NextResponse.next();
  }

  // 4. If protected (non-dashboard) and no token, redirect to login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static files, images, and API routes from middleware to prevent bugs
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
