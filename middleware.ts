import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME } from '@shared/const';

const PROTECTED_ROUTES = ['/dashboard', '/rfqs'];

/**
 * Middleware to check Manus OAuth session cookie
 * 
 * This replaces Azure Easy Auth which only works in Azure Container Apps.
 * Now we check for the Manus session cookie which works everywhere:
 * - Local development ✓
 * - Azure production ✓
 * - Any other deployment ✓
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check protected routes
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtected) {
    // Check for Manus OAuth session cookie
    const sessionCookie = request.cookies.get(COOKIE_NAME);
    
    if (!sessionCookie) {
      // No session cookie - redirect to login
      // The login page will show the Manus OAuth login button
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static assets, Next.js internals, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/|api/).*)'],
};
