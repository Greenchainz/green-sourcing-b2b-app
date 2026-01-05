import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

function getOriginFromHeaders(): string {
    const headerList = headers()
    const forwardedProto = headerList.get('x-forwarded-proto')
    const forwardedHost = headerList.get('x-forwarded-host')
    const host = forwardedHost || headerList.get('host')

    if (!host) return ''

    const proto = forwardedProto || 'https'
    return `${proto}://${host}`
}

export async function GET() {
    const origin = getOriginFromHeaders()

    const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || ''

    // These are NOT secrets. They’re safe to expose to the client.
    const azureTenant =
        process.env.NEXT_PUBLIC_AZURE_TENANT || process.env.AZURE_TENANT || ''
    const azureClientId =
        process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID || ''

    const redirectUri = origin ? `${origin}/login/callback` : ''

    return NextResponse.json({
        origin,
        backendUrl,
        azureTenant,
        azureClientId,
        redirectUri,
    })
}
