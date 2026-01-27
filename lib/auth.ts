/**
 * lib/auth.ts
 * 
 * Re-exports NextAuth configuration from app/app.auth.ts
 * This file exists to maintain compatibility with existing imports
 * that reference @/lib/auth instead of @/app/app.auth
 * 
 * 🚨 EDGE RUNTIME SAFE: Only re-exports from edge-compatible modules
 */

import { useSession } from 'next-auth/react';

// Re-export NextAuth handlers, utilities, and config
export { handlers, auth, signIn, signOut, authConfig } from '@/app/app.auth';

/**
 * Custom useAuth hook that wraps next-auth's useSession
 * Returns a consistent interface for client components
 */
export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user || null,
    token: null, // NextAuth uses cookies for session, no token needed
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}
