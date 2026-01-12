import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')

  // Handle OAuth errors from Azure
  if (error) {
    const errorDescription = requestUrl.searchParams.get('error_description')
    console.error('Azure AD OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    )
  }

  // No code = invalid callback
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', requestUrl.origin)
    )
  }

  try {
    // Exchange the Authorization Code for tokens with Microsoft Entra ID
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          scope: 'openid profile email',
          code: code,
          redirect_uri: `${requestUrl.origin}/api/auth/callback`,
          grant_type: 'authorization_code',
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        }),
      }
    )

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      console.error('Azure AD token error:', tokens.error, tokens.error_description)
      return NextResponse.redirect(
        new URL(`/login?error=azure_auth_failed`, requestUrl.origin)
      )
    }

    // SUCCESS: Set session cookie and redirect to dashboard
    const response = NextResponse.redirect(
      new URL(next, requestUrl.origin)
    )

    response.cookies.set('session_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expires_in || 3600,
    })

    // Optionally store the ID token for user info
    if (tokens.id_token) {
      response.cookies.set('id_token', tokens.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: tokens.expires_in || 3600,
      })
    }

    return response

  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=server_error', requestUrl.origin)
    )
  }
}
