import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code, redirectUri: requestRedirectUri } = await request.json()
    
    // Validate required fields
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }
    
    // 1. These must match your Azure Container App "Environment Variables" names
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    const tenantId = process.env.AZURE_TENANT_ID || 'common'
    
    if (!clientId || !clientSecret) {
      console.error('Missing Azure AD configuration:', { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret 
      })
      return NextResponse.json({ 
        error: 'Azure AD configuration missing. Check AZURE_CLIENT_ID and AZURE_CLIENT_SECRET environment variables.' 
      }, { status: 500 })
    }
    
    // 2. Use dynamic redirect URI from request, with fallback to production URL
    const redirectUri = requestRedirectUri || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.greenchainz.com'}/login/callback`

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'openid profile email'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Microsoft rejected the exchange:', data)
      return NextResponse.json(data, { status: 401 })
    }

    // Success! Return the tokens to the frontend
    return NextResponse.json(data)
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Token exchange crash:', errorMessage)
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}
