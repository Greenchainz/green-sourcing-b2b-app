/**
 * Debug endpoint for Azure Easy Auth troubleshooting
 * 
 * This endpoint returns diagnostic information about the authentication
 * headers received from Azure Container Apps Easy Auth.
 * 
 * ⚠️ WARNING: This endpoint should be disabled in production or protected
 * by additional authentication checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEasyAuthUser, isAuthenticated, getAccessToken } from '@/lib/auth/easy-auth';

export const dynamic = 'force-dynamic'; // Disable caching

/**
 * GET /api/auth/debug
 * 
 * Returns diagnostic information about Easy Auth headers.
 * Useful for debugging authentication issues.
 */
export async function GET(request: NextRequest) {
  try {
    // Get all Easy Auth related headers
    const easyAuthHeaders: Record<string, string | null> = {
      'x-ms-client-principal': request.headers.get('x-ms-client-principal'),
      'x-ms-client-principal-id': request.headers.get('x-ms-client-principal-id'),
      'x-ms-client-principal-name': request.headers.get('x-ms-client-principal-name'),
      'x-ms-client-principal-idp': request.headers.get('x-ms-client-principal-idp'),
      'x-ms-token-aad-access-token': request.headers.get('x-ms-token-aad-access-token') ? '[PRESENT - REDACTED]' : null,
      'x-ms-token-aad-id-token': request.headers.get('x-ms-token-aad-id-token') ? '[PRESENT - REDACTED]' : null,
      'x-ms-token-aad-refresh-token': request.headers.get('x-ms-token-aad-refresh-token') ? '[PRESENT - REDACTED]' : null,
    };

    // Check authentication status
    const authenticated = isAuthenticated(request.headers);
    const user = getEasyAuthUser(request.headers);
    const accessToken = getAccessToken(request.headers);

    // Decode the principal header if present (for debugging)
    let decodedPrincipal: object | null = null;
    const principalHeader = request.headers.get('x-ms-client-principal');
    if (principalHeader) {
      try {
        const decoded = Buffer.from(principalHeader, 'base64').toString('utf-8');
        decodedPrincipal = JSON.parse(decoded);
      } catch {
        decodedPrincipal = { error: 'Failed to decode principal header' };
      }
    }

    // Get request metadata
    const requestInfo = {
      url: request.url,
      method: request.method,
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      diagnostics: {
        isAuthenticated: authenticated,
        hasUser: user !== null,
        hasAccessToken: accessToken !== null,
      },
      easyAuthHeaders,
      decodedPrincipal,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        claimCount: user.claims ? Object.keys(user.claims).length : 0,
      } : null,
      requestInfo,
      troubleshooting: {
        noHeaders: !principalHeader ? 'Easy Auth headers are missing. Ensure Easy Auth is enabled in Azure Container Apps.' : null,
        notAuthenticated: !authenticated ? 'User is not authenticated. Check Azure AD configuration and login flow.' : null,
        noUser: authenticated && !user ? 'Authenticated but user data could not be parsed. Check x-ms-client-principal format.' : null,
        allGood: authenticated && user ? 'Authentication is working correctly!' : null,
      },
    });
  } catch (error) {
    console.error('[API] Error in /api/auth/debug:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
