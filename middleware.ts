import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, getLoginUrl } from '@/lib/auth/easy-auth';

// Routes that require authentication (pages - will redirect to login)
const PROTECTED_PAGE_ROUTES = ['/dashboard', '/rfqs', '/supplier'];

// API routes that require authentication (will return 401)
const PROTECTED_API_ROUTES = ['/api/'];

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = ['/api/health', '/api/auth/debug', '/api/public-config', '/api/sentry-example-api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Check if it's a protected page route
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(route => pathname.startsWith(route));
  
  // Check if it's a protected API route (all /api/* except public ones)
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedApiRoute = isApiRoute && !isPublicApiRoute;

  // Handle unauthenticated requests
  if (!isAuthenticated(request.headers)) {
    if (isProtectedPage) {
      // Redirect pages to Easy Auth login
      const loginUrl = getLoginUrl(pathname);
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
    
    if (isProtectedApiRoute) {
      // Return 401 for protected API routes
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please login to access this resource' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  // Exclude .auth paths (Azure Easy Auth), static assets, and favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/|\\.auth).*)'],
};
