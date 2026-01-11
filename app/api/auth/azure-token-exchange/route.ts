import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Get secrets from Azure Key Vault via environment variables
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!
const TENANT_ID = process.env.AZURE_AD_TENANT_ID!
const REDIRECT_URI = 'https://greenchainz.com/api/auth/azure-callback'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      )
    }

    // Exchange authorization code for access token
    const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'openid profile email'
    })

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: response.status }
      )
    }

    const tokens = await response.json()

    return NextResponse.json({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      expires_in: tokens.expires_in
    })

  } catch (error) {
    console.error('Token exchange error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
