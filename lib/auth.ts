/**
 * lib/auth.ts
 * 
 * Stub auth module for build compatibility.
 * The actual auth is handled by Manus OAuth via middleware.
 */

/**
 * Custom useAuth hook stub
 * Returns a consistent interface for client components
 */
export function useAuth() {
  return {
    user: null,
    token: null,
    status: 'unauthenticated' as const,
    isAuthenticated: false,
    isLoading: false,
  };
}

export function auth() {
  return null;
}

export function signIn() {
  return null;
}

export function signOut() {
  return null;
}

export const handlers = {};
