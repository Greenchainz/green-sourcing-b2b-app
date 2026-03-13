export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string, role?: 'buyer' | 'supplier') => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Fallback to /login if OAuth portal URL is not configured
  if (!oauthPortalUrl) {
    return '/login';
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  
  // Encode returnPath and role in state
  const stateData = {
    redirectUri,
    returnPath: returnPath || '/',
    role: role || null
  };
  const state = btoa(JSON.stringify(stateData));

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return '/login';
  }
};
