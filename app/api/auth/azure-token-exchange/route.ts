import { NextResponse } from "next/server";

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
  }
}
