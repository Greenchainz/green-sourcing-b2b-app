import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check for the Azure session token in your store's cookie
  const token = request.cookies.get('greenchainz-auth-token')?.value

  // List of paths that REQUIRE login to protect your utilities
  const protectedPaths = ['/architect', '/supplier', '/admin', '/dashboard']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !token) {
    // If no token, bounce them to the login page
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Ignore static files and images
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
