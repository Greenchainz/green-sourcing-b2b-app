import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    // 1. MATCH PORTAL NAMES: Using the names you set in the Containers menu
    const tenantId = process.env.AZURE_TENANT_ID; 
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    // 2. FORCE STABLE URL: This matches your DNS and App Registration
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.greenchainz.com';
    const redirectUri = `${baseUrl}/login/callback`;

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri, // Using the stable URI here
        grant_type: 'authorization_code',
        scope: 'openid profile email'
      }).toString()
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Azure exchange rejected:', errorData);
      return NextResponse.json({ error: 'Exchange failed', detail: errorData }, { status: 401 })
    }

    const tokens = await tokenResponse.json()
    return NextResponse.json(tokens)

  } catch (error: any) {
    console.error('Token exchange error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
