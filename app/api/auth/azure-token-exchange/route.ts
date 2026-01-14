import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  // FAILSAFE: Ensure the base URL is absolute. 
  // If this is missing in your Azure Portal settings, the exchange WILL fail.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://greenchainz.com';
  const redirectUri = `${baseUrl}/login/callback`;

  try {
    // Note: Using the variable names injected by Azure
    const tenantId = process.env.AZURE_TENANT_ID; 
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!, // Azure pulls this from Key Vault
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email'
      }).toString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Azure token exchange failed:', errorText);
      return NextResponse.json({ error: 'Token exchange failed', details: errorText }, { status: 401 });
    }

    const tokens = await tokenResponse.json();
    
    return NextResponse.json({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      expires_in: tokens.expires_in
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
