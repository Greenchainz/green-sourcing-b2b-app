import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getOriginFromHeaders(): Promise<string> {
    const headerList = await headers()
    const forwardedProto = headerList.get('x-forwarded-proto')
    const forwardedHost = headerList.get('x-forwarded-host')
    const host = forwardedHost || headerList.get('host')

    if (!host) return ''

    // Default to http for localhost, https for everything else
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
    const proto = forwardedProto || (isLocalhost ? 'http' : 'https')
    return `${proto}://${host}`
}

export async function GET() {
    const origin = await getOriginFromHeaders()

    const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || ''

    // These are NOT secrets. They’re safe to expose to the client.
    const azureTenant =
        process.env.NEXT_PUBLIC_AZURE_TENANT || process.env.AZURE_TENANT || process.env.AZURE_TENANT_ID || 'common'
    const azureClientId =
        process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID || ''

    const redirectUri = origin ? `${origin}/login/callback` : ''

    return NextResponse.json(
        {
            origin,
            backendUrl,
            azureTenant,
            azureClientId,
            redirectUri,
        },
        {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        }
    )
}
