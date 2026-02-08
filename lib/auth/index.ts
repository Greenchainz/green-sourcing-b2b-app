/**
 * Authentication utilities for Azure Container Apps Easy Auth
 * 
 * This module provides both server-side and client-side authentication utilities:
 * 
 * Server-side (API routes, Server Components):
 * - Use functions from @/lib/auth/easy-auth
 * - getEasyAuthUser(), isAuthenticated(), etc.
 * 
 * Client-side (React Components):
 * - Use the useAuth() hook
 * - Returns user info from /api/auth/me endpoint
 */

// Re-export server-side utilities
export {
  getEasyAuthUser,
  isAuthenticated,
  getAccessToken,
  getLoginUrl,
  getLogoutUrl,
  hasRole,
  hasAnyRole,
  type EasyAuthUser,
} from './easy-auth';

// Re-export client-side hook
export { useAuth } from './use-easy-auth';
