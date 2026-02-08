/**
 * Next.js Middleware for Azure Container Apps Easy Auth
 * 
 * This middleware reads authentication headers injected by Azure Container Apps
 * Easy Auth and protects routes that require authentication.
 * 
 * Easy Auth (App Service Authentication) handles OAuth at the infrastructure level,
 * so we don't need to implement OAuth ourselves - we just read the headers it provides.
 * 
 * Reference: https://learn.microsoft.com/en-us/azure/container-apps/authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, getEasyAuthUser, getLoginUrl } from '@/lib/auth/easy-auth';

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/rfqs',
  '/api', // Protect all API routes by default
];

/**
 * API routes that should remain public (exceptions to /api protection)
 */
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/sentry-example-api',
];

/**
 * Check if a path matches any of the protected routes
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a path is a public API route (exception)
 */
function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Next.js Middleware function
 * 
 * This runs on every request before it reaches the page/API route.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public assets, Next.js internals, and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public API routes to bypass authentication
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  if (isProtectedRoute(pathname)) {
    // Check authentication status using Easy Auth headers
    const authenticated = isAuthenticated(request.headers);

    if (!authenticated) {
      // For API routes, return 401 Unauthorized
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { 
            error: 'Authentication required',
            message: 'Please authenticate with Azure AD to access this resource'
          },
          { status: 401 }
        );
      }

      // For page routes, redirect to Easy Auth login
      const loginUrl = getLoginUrl(pathname);
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }

    // User is authenticated - attach user info to the request
    // This makes it available in the request headers for downstream processing
    try {
      const user = getEasyAuthUser(request.headers);
      
      if (user) {
        // Clone the request headers and add user info
        const requestHeaders = new Headers(request.headers);
        
        // Add custom headers with user info (for API routes to read)
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email);
        requestHeaders.set('x-user-name', user.name);
        requestHeaders.set('x-user-roles', JSON.stringify(user.roles));

        // Continue with modified headers
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (error) {
      console.error('[Middleware] Error processing user info:', error);
      // Continue anyway - the user is authenticated according to Easy Auth
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

/**
 * Middleware configuration
 * 
 * Specify which routes this middleware should run on.
 * Using a matcher is more efficient than checking every route.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
