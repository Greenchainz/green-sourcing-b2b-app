import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    
    // 1. These names must match your Container App "Environment Variables" exactly
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    const tenantId = process.env.AZURE_TENANT_ID
    
    // 2. We are hard-coding this to match your Step 1 Portal setting exactly
    // Use 'www' if that is your primary domain
    const redirectUri = "https://www.greenchainz.com/login/callback"

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Microsoft Token Error:', data)
      return NextResponse.json(data, { status: 401 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
