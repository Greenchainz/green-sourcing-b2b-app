import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    // 1. FAILSAFE URL LOGIC: If the env var is missing, we use the real domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.greenchainz.com';
    const redirectUri = `${baseUrl}/login/callback`;

    // 2. SECRET CHECK: Ensure these match your Container App "Configuration" keys
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        console.error('CRITICAL ERROR: Azure credentials missing from Environment Variables');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email'
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const responseData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Microsoft Token Exchange Rejected:', JSON.stringify(responseData));
      return NextResponse.json(responseData, { status: 401 });
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Token Exchange System Failure:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
