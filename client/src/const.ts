export { ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string, role?: 'architect' | 'supplier') => {
  const query = returnPath
    ? `?returnPath=${encodeURIComponent(returnPath)}${role ? `&role=${encodeURIComponent(role)}` : ''}`
    : '';

  return `/login${query}`;
};

export const getMicrosoftLoginUrl = (returnPath?: string, role?: 'architect' | 'supplier') => {
  const query = returnPath
    ? `?returnPath=${encodeURIComponent(returnPath)}${role ? `&role=${encodeURIComponent(role)}` : ''}`
    : '';

  return `/api/auth/microsoft${query}`;
};
