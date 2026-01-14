import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    // 1. STANDARD NAMES (Matching your Pure Azure Report)
    const tenantId = process.env.AZURE_TENANT_ID; 
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    // 2. DIAGNOSTIC: Catch the missing variables before they cause a 500 crash
    if (!tenantId || !clientId || !clientSecret) {
      console.error('CRITICAL: Missing environment variables in Container App');
      return NextResponse.json({ 
        error: 'Configuration Missing',
        check: { tenantId: !!tenantId, clientId: !!clientId, clientSecret: !!clientSecret }
      }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.greenchainz.com';
    const redirectUri = `${baseUrl}/login/callback`;

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email'
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: 'Microsoft rejected exchange', details: data }, { status: 401 });
    }

    return NextResponse.json(data);

  } catch (err: any) {
    // This block prevents the "InternalServerError" generic page
    console.error('Exchange Route Crash:', err.message);
    return NextResponse.json({ error: 'Server Exception', message: err.message }, { status: 500 });
  }
}
