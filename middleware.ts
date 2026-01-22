import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip auth for public routes
  const publicPaths = ['/login', '/signup', '/about', '/api/auth'];
  const path = request.nextUrl.pathname;
  
  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Get session token from cookies (adjust based on your auth setup)
  const sessionToken = request.cookies.get('session')?.value;
  
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Decode JWT token to extract user info
    // This assumes you're using Microsoft Entra ID tokens
    const tokenPayload = JSON.parse(
      Buffer.from(sessionToken.split('.')[1], 'base64').toString()
    );

    const userId = tokenPayload.oid || tokenPayload.sub; // Object ID from Entra
    const userRole = tokenPayload.extension_Role || 'user'; // Custom claim

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-user-email', tokenPayload.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/rfq/:path*',
    '/rfqs/:path*',
    '/api/rfq/:path*',
    '/supplier/:path*',
  ],
};
