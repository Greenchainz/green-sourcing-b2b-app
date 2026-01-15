import { NextResponse } from 'next/server'
import { 
  generateTraceId, 
  logAuthEvent, 
  incrementAuthMetric,
  redactSensitiveData,
  formatUserError 
} from '@/lib/auth/diagnostics'

export async function POST(request: Request) {
  const traceId = generateTraceId();
  
  logAuthEvent('info', 'Azure token exchange initiated', {
    traceId,
    step: 'init',
    metadata: { url: request.url }
  });
  
  incrementAuthMetric('auth_attempt', 'azure', 'token-exchange');
  
  try {
    const { code, redirectUri: requestRedirectUri } = await request.json()
    
    logAuthEvent('info', 'Request parsed', {
      traceId,
      step: 'parse-request',
      metadata: { 
        hasCode: !!code,
        redirectUri: requestRedirectUri 
      }
    });
    
    // Validate required fields
    if (!code) {
      logAuthEvent('error', 'Authorization code missing', {
        traceId,
        step: 'validate-input',
        statusCode: 400
      });
      incrementAuthMetric('auth_failure', 'azure', 'missing-code');
      return NextResponse.json({ 
        error: 'Authorization code is required',
        traceId 
      }, { status: 400 })
    }
    
    // 1. These must match your Azure Container App "Environment Variables" names
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    const tenantId = process.env.AZURE_TENANT_ID || 'common'
    
    if (!clientId || !clientSecret) {
      logAuthEvent('error', 'Azure AD configuration missing', {
        traceId,
        step: 'validate-config',
        statusCode: 500,
        metadata: { 
          hasClientId: !!clientId, 
          hasClientSecret: !!clientSecret,
          tenantId 
        }
      });
      incrementAuthMetric('auth_failure', 'azure', 'missing-config');
      return NextResponse.json({ 
        error: 'Azure AD configuration missing. Check AZURE_CLIENT_ID and AZURE_CLIENT_SECRET environment variables.',
        traceId
      }, { status: 500 })
    }
    
    // 2. Use dynamic redirect URI from request, with fallback to production URL
    const redirectUri = requestRedirectUri || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.greenchainz.com'}/login/callback`

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    logAuthEvent('info', 'Calling Microsoft token endpoint', {
      traceId,
      step: 'token-exchange',
      metadata: {
        tokenEndpoint,
        redirectUri,
        tenantId,
        scope: 'openid profile email'
      }
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'openid profile email'
      })
    })

    const data = await response.json()
    
    logAuthEvent(response.ok ? 'info' : 'error', 'Microsoft token endpoint response', {
      traceId,
      step: 'token-response',
      statusCode: response.status,
      metadata: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get('content-type'),
          correlationId: response.headers.get('x-ms-request-id')
        },
        response: redactSensitiveData(data)
      }
    });

    if (!response.ok) {
      logAuthEvent('error', 'Microsoft rejected the token exchange', {
        traceId,
        step: 'token-rejected',
        statusCode: response.status,
        metadata: { 
          error: data.error,
          errorDescription: data.error_description,
          errorCodes: data.error_codes,
          timestamp: data.timestamp,
          traceId: data.trace_id,
          correlationId: data.correlation_id
        }
      });
      incrementAuthMetric('auth_failure', 'azure', `token-rejected-${response.status}`);
      return NextResponse.json({ 
        ...data, 
        traceId 
      }, { status: 401 })
    }

    logAuthEvent('info', 'Token exchange successful', {
      traceId,
      step: 'token-success',
      statusCode: 200,
      metadata: {
        hasAccessToken: !!data.access_token,
        hasIdToken: !!data.id_token,
        hasRefreshToken: !!data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in
      }
    });
    
    incrementAuthMetric('auth_success', 'azure', 'token-exchange');

    // Success! Return the tokens to the frontend
    return NextResponse.json({ ...data, traceId })
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logAuthEvent('error', 'Token exchange crashed', {
      traceId,
      step: 'exception',
      statusCode: 500,
      error: err,
      metadata: { errorMessage }
    });
    
    incrementAuthMetric('auth_failure', 'azure', 'exception');
    
    const userError = formatUserError(err, traceId, 'Token exchange failed');
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: errorMessage,
      message: userError.message,
      traceId 
    }, { status: 500 })
  }
}
