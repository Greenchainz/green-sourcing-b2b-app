import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    
    // 1. These must match your Azure Container App "Environment Variables" names
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    const tenantId = process.env.AZURE_TENANT_ID
    
    // 2. This must match the Redirect URI you saved in Entra ID
    const redirectUri = "https://www.greenchainz.com/login/callback"

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    // THE FIX: We use URLSearchParams and include 'grant_type'
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        grant_type: 'authorization_code', // <--- THIS WAS MISSING
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
    
  } catch (err: any) {
    console.error('Token exchange crash:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
