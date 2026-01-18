import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // --- CRITICAL FIX: LOOKING FOR 'greenchainz-auth-token' ---
  const token = request.cookies.get('greenchainz-auth-token')?.value

  // List of paths that REQUIRE login
  const protectedPaths = ['/architect', '/supplier', '/admin', '/dashboard']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
