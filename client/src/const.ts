export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string, role?: 'architect' | 'supplier') => {
  const postLoginRedirect = returnPath
    ? `/login?returnPath=${encodeURIComponent(returnPath)}${role ? `&role=${encodeURIComponent(role)}` : ''}`
    : '/';

  return `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(postLoginRedirect)}`;
};
