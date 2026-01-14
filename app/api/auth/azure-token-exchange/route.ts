import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

<<<<<<< HEAD
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const { code } = json;

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Azure AD Token Endpoint
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    // Standardized Azure params
    const body = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      client_secret: process.env.AZURE_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/login/callback`,
      grant_type: "authorization_code",
      scope: "openid profile email",
    });

    console.log("[Auth] Exchanging code for token with Azure AD...");

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Auth] Azure Token Exchange Failed:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Auth] Token exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
=======
export async function POST(request: NextRequest) {
  const { code, state } = await request.json()

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    // Exchange code for token with Azure AD
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/login/callback`,
        grant_type: 'authorization_code',
        scope: 'openid profile email'
      }).toString()
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Azure token exchange failed:', error)
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 401 })
    }

    const tokens = await tokenResponse.json()
    
    return NextResponse.json({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      expires_in: tokens.expires_in
    })

  } catch (error) {
    console.error('Token exchange error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
>>>>>>> 16c15596d6cb9dc911a791a59d0d98d4fcb4ab1a
  }
}
