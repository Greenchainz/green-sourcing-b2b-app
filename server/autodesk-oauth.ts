/**
 * Autodesk Platform Services (APS) OAuth 2.0 Token Service
 * 
 * Implements 2-legged OAuth flow for server-to-server authentication
 * with Autodesk Sustainability Data (SDA) API.
 * 
 * Reference: https://aps.autodesk.com/en/docs/oauth/v2/developers_guide
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Get valid APS access token using 2-legged OAuth
 * Caches token until expiration to avoid repeated requests
 */
export async function getApsAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.AUTODESK_CLIENT_ID;
  const clientSecret = process.env.AUTODESK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Autodesk credentials: AUTODESK_CLIENT_ID or AUTODESK_CLIENT_SECRET');
  }

  try {
    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'data:read', // Scope for reading sustainability data
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`APS OAuth failed: ${response.status} - ${errorText}`);
    }

    const data: TokenResponse = await response.json();

    // Cache token with 5-minute buffer before expiration
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    console.log('[Autodesk OAuth] Token obtained, expires in', data.expires_in, 'seconds');
    return data.access_token;
  } catch (error) {
    console.error('[Autodesk OAuth] Failed to get token:', error);
    throw error;
  }
}

/**
 * Clear cached token (useful for testing or forcing refresh)
 */
export function clearCachedToken(): void {
  cachedToken = null;
}
