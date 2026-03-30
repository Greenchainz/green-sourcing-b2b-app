// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAME } from '@shared/const'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/about',
  '/blog',
  '/careers',
  '/contact',
  '/how-it-works',
  '/pricing',
  '/help-center',
  '/api-docs',
  '/partner-program',
  '/privacy',
  '/terms',
  '/supplier-agreement',
]

const PUBLIC_PREFIXES = ['/blog/', '/legal/', '/terms/', '/privacy/']

// Add to .env:
// NEXT_PUBLIC_ALLOWED_ORIGINS=https://greenchainz.com,https://app.greenchainz.com,http://localhost:3000,http://localhost:5173
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function getCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  return ALLOWED_ORIGINS.includes(origin) ? origin : null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/.auth')
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api')) {
    const corsOrigin = getCorsOrigin(request)
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    }

    if (corsOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = corsOrigin
      corsHeaders['Access-Control-Allow-Credentials'] = 'true'
      corsHeaders['Vary'] = 'Origin'
    }

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: corsHeaders })
    }

    const response = NextResponse.next()
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }

  const sessionToken =
    request.cookies.get(COOKIE_NAME)?.value ??
    request.cookies.get(`__Secure-${COOKIE_NAME}`)?.value

  const hasSession = !!sessionToken

  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => pathname === route) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|\\.auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
