import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check for your Azure session cookie or auth token
    const token = request.cookies.get('greenchainz-auth-token')?.value

    // Protect internal routes, but allow public ones
    if (request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.startsWith('/architect') ||
        request.nextUrl.pathname.startsWith('/supplier')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
