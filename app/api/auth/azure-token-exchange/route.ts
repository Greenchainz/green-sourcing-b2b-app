import { NextResponse } from 'next/server'

function resolveBackendUrl(req: Request): string {
    const headerValue = req.headers.get('x-backend-url')
    const envValue = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || ''

    const candidate = headerValue || envValue
    if (!candidate) return ''

    let url: URL
    try {
        url = new URL(candidate)
    } catch {
        return ''
    }

    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const isAzureContainerApps = url.hostname.endsWith('.azurecontainerapps.io')
    const isProductionDomain = url.hostname === 'greenchainz.com' ||
        url.hostname === 'www.greenchainz.com' ||
        url.hostname === 'api.greenchainz.com'

    const protocolOk = isLocalhost ? url.protocol === 'http:' || url.protocol === 'https:' : url.protocol === 'https:'
    if (!protocolOk) return ''

    if (!(isLocalhost || isAzureContainerApps || isProductionDomain)) return ''

    return url.origin
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const backendUrl = resolveBackendUrl(req)
    if (!backendUrl) {
        return NextResponse.json(
            { error: 'Missing or invalid BACKEND_URL for auth proxy' },
            { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        )
    }

    const body = await req.json().catch(() => null)
    if (!body) {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        )
    }

    const upstream = await fetch(`${backendUrl}/api/v1/auth/azure-token-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
    })

    const text = await upstream.text()
    return new NextResponse(text, {
        status: upstream.status,
        headers: {
            'Content-Type': upstream.headers.get('content-type') || 'application/json',
            'Cache-Control': 'no-store, max-age=0',
        },
    })
}
