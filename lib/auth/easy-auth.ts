/**
 * Azure Container Apps Easy Auth Utilities
 * 
 * These utilities parse authentication headers injected by Azure Container Apps
 * Easy Auth (App Service Authentication). Easy Auth handles OAuth at the 
 * infrastructure level, and we just read the headers it provides.
 * 
 * Reference: https://learn.microsoft.com/en-us/azure/container-apps/authentication
 */

/**
 * User information from Easy Auth headers
 */
export interface EasyAuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  claims?: Record<string, any>;
}

/**
 * Full principal object from x-ms-client-principal header (base64 encoded)
 */
interface ClientPrincipal {
  auth_typ?: string; // Authentication provider type (e.g., "aad")
  claims?: Array<{
    typ: string;
    val: string;
  }>;
  name_typ?: string;
  role_typ?: string;
}

/**
 * Parse Easy Auth user from request headers
 * 
 * Reads and decodes the x-ms-client-principal header injected by Azure Container Apps.
 * This header contains base64-encoded JSON with user information.
 * 
 * @param request - Next.js Request object or Headers object
 * @returns User object if authenticated, null otherwise
 */
export function getEasyAuthUser(request: Request | Headers): EasyAuthUser | null {
  try {
    const headers = request instanceof Headers ? request : request.headers;
    
    // Get the base64-encoded principal header
    const principalHeader = headers.get('x-ms-client-principal');
    
    if (!principalHeader) {
      return null;
    }

    // Decode base64 → JSON
    const principalJson = Buffer.from(principalHeader, 'base64').toString('utf-8');
    const principal: ClientPrincipal = JSON.parse(principalJson);

    // Extract claims into a more usable format
    const claims: Record<string, any> = {};
    const roles: string[] = [];

    if (principal.claims) {
      principal.claims.forEach((claim) => {
        claims[claim.typ] = claim.val;
        
        // Collect roles
        if (claim.typ === 'roles' || claim.typ.endsWith('/role')) {
          roles.push(claim.val);
        }
      });
    }

    // Get fallback values from individual headers
    const userId = headers.get('x-ms-client-principal-id') || claims.oid || claims.sub || '';
    const userEmail = headers.get('x-ms-client-principal-name') || claims.email || claims.preferred_username || '';
    const userName = claims.name || userEmail.split('@')[0] || 'User';

    return {
      id: userId,
      email: userEmail,
      name: userName,
      roles,
      claims,
    };
  } catch (error) {
    console.error('[Easy Auth] Error parsing user from headers:', error);
    return null;
  }
}

/**
 * Check if the request is authenticated
 * 
 * @param request - Next.js Request object or Headers object
 * @returns true if user is authenticated, false otherwise
 */
export function isAuthenticated(request: Request | Headers): boolean {
  const headers = request instanceof Headers ? request : request.headers;
  
  // Check for the presence of the principal ID header
  // This is the simplest way to check authentication status
  const principalId = headers.get('x-ms-client-principal-id');
  return !!principalId;
}

/**
 * Get the access token for calling Microsoft Graph or other APIs
 * 
 * Easy Auth can provide access tokens for downstream API calls.
 * This token can be used to call Microsoft Graph, Azure APIs, etc.
 * 
 * @param request - Next.js Request object or Headers object
 * @returns Access token string if available, null otherwise
 */
export function getAccessToken(request: Request | Headers): string | null {
  const headers = request instanceof Headers ? request : request.headers;
  return headers.get('x-ms-token-aad-access-token');
}

/**
 * Get the logout URL
 * 
 * Easy Auth provides a built-in logout endpoint that clears the session
 * and redirects to the provider's logout page.
 * 
 * @param postLogoutRedirect - Optional URL to redirect to after logout (defaults to home page)
 * @returns Logout URL
 */
export function getLogoutUrl(postLogoutRedirect: string = '/'): string {
  // Encode the redirect URL
  const encodedRedirect = encodeURIComponent(postLogoutRedirect);
  return `/.auth/logout?post_logout_redirect_uri=${encodedRedirect}`;
}

/**
 * Get the login URL for Azure AD
 * 
 * Easy Auth provides a built-in login endpoint that initiates OAuth flow.
 * 
 * @param postLoginRedirect - Optional URL to redirect to after login (defaults to home page)
 * @returns Login URL
 */
export function getLoginUrl(postLoginRedirect: string = '/'): string {
  const encodedRedirect = encodeURIComponent(postLoginRedirect);
  return `/.auth/login/aad?post_login_redirect_uri=${encodedRedirect}`;
}

/**
 * Check if user has a specific role
 * 
 * @param user - User object from getEasyAuthUser()
 * @param role - Role name to check
 * @returns true if user has the role, false otherwise
 */
export function hasRole(user: EasyAuthUser | null, role: string): boolean {
  if (!user) return false;
  return user.roles.some(r => r.toLowerCase() === role.toLowerCase());
}

/**
 * Check if user has any of the specified roles
 * 
 * @param user - User object from getEasyAuthUser()
 * @param roles - Array of role names to check
 * @returns true if user has at least one of the roles, false otherwise
 */
export function hasAnyRole(user: EasyAuthUser | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.some(role => hasRole(user, role));
}
