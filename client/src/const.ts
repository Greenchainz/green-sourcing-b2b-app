export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string, role?: 'buyer' | 'supplier') => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl) {
    // Fall back to a local login page when the OAuth portal URL is not configured
    const params = new URLSearchParams();
    if (returnPath) params.set("returnPath", returnPath);
    if (role) params.set("role", role);
    return `/login${params.size > 0 ? `?${params}` : ""}`;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  
  // Encode returnPath and role in state
  const stateData = {
    redirectUri,
    returnPath: returnPath || '/',
    role: role || null
  };
  const state = btoa(JSON.stringify(stateData));

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
