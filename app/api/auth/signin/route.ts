import { NextResponse } from 'next/server';
import { generateTraceId, logAuthEvent } from '@/lib/auth/diagnostics';

export async function GET(request: Request) {
  const traceId = generateTraceId();
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') || '/dashboard';

  logAuthEvent('info', 'Sign-in initiated', {
    traceId,
    step: 'init',
    metadata: { next }
  });

  const tenantId = process.env.AZURE_AD_TENANT_ID || process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_CLIENT_ID;

  // Use logic consistent with callback/route.ts to avoid redirect_uri mismatch
  // Support both custom domain and revision-specific URLs
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const redirectUri = `${cleanBaseUrl}/api/auth/callback`;

  if (!clientId || !tenantId) {
    logAuthEvent('error', 'Azure AD configuration missing', {
      traceId,
      step: 'validate-config',
      statusCode: 500
    });
    return NextResponse.json(
      { error: 'Azure AD configuration missing' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state: next, // Pass the next URL as state to redirect back after login
  });

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

  logAuthEvent('info', 'Redirecting to Azure AD', {
    traceId,
    step: 'redirect',
    metadata: { url, redirectUri }
  });

  return NextResponse.redirect(url);
}
