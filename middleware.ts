import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, getLoginUrl } from '@/lib/auth/easy-auth';

const PROTECTED_ROUTES = ['/dashboard', '/rfqs'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Check protected routes
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtected && !isAuthenticated(request.headers)) {
    // ALWAYS redirect to Easy Auth login
    const loginUrl = getLoginUrl(pathname);
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
