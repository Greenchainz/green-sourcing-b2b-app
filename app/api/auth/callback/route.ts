import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Default token expiration time in seconds (1 hour)
const DEFAULT_TOKEN_EXPIRATION = 3600

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

  // Validate required environment variables
  const tenantId = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    console.error('Missing required Azure AD environment variables')
    return NextResponse.redirect(
      new URL('/login?error=config_error', requestUrl.origin)
    )
  }

  try {
    // Exchange the Authorization Code for tokens with Microsoft Entra ID
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          scope: 'openid profile email',
          code: code,
          redirect_uri: `${requestUrl.origin}/api/auth/callback`,
          grant_type: 'authorization_code',
          client_secret: clientSecret,
        }),
      }
    )

    if (!tokenResponse.ok) {
      console.error('Azure AD token exchange failed:', tokenResponse.status)
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed`, requestUrl.origin)
      )
    }

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

    // Use 'session' cookie name for consistency with existing auth routes
    // Prioritize ID token (contains user claims) over access token
    response.cookies.set('session', tokens.id_token || tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expires_in || DEFAULT_TOKEN_EXPIRATION,
    })

    return response

  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=server_error', requestUrl.origin)
    )
  }
}
