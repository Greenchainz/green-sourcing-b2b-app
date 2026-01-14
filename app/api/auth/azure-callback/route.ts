import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('Azure OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${error}`, requestUrl.origin)
    )
  }

  // No code = invalid callback
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', requestUrl.origin)
    )
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('/api/auth/azure-token-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state })
    })

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed')
    }

    const { access_token, id_token } = await tokenResponse.json()

    // SUCCESS: Set session cookie and redirect
    const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    
    response.cookies.set('session', id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    })

    return response

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=callback_failed', requestUrl.origin)
    )
  }
}

