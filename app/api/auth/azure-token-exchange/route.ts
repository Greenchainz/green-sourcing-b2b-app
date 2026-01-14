import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    // 1. Using names that match your Azure Portal exactly
    const tenantId = process.env.AZURE_TENANT_ID; 
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.greenchainz.com';

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: `${baseUrl}/login/callback`,
        grant_type: 'authorization_code',
        scope: 'openid profile email'
      }).toString()
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Azure exchange rejected:', errorData);
      return NextResponse.json({ error: 'Exchange failed' }, { status: 401 })
    }

    return NextResponse.json(await tokenResponse.json())
  } catch (error: any) {
    console.error('Token exchange crash:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
