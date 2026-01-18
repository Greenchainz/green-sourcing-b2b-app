import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Check for the EXACT cookie name we set in the API
  const token = request.cookies.get('greenchainz-auth-token')?.value;

  // 2. Define protected paths
  const protectedPaths = ['/architect', '/supplier', '/admin', '/dashboard'];
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // 3. If protected and no token, Redirect to Login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static files, images, and API routes from middleware to prevent bugs
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
