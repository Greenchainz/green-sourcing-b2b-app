/**
 * Client-side React hook for accessing Easy Auth user information
 * 
 * This hook fetches user information from the /api/auth/me endpoint,
 * which reads Easy Auth headers on the server side.
 */

'use client';

import { useEffect, useState } from 'react';

export interface EasyAuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isAdmin: boolean;
  isSupplier: boolean;
}

interface UseAuthResult {
  user: EasyAuthUser | null;
  token: string | null; // For compatibility with existing code (not used with Easy Auth)
  loading: boolean;
  error: string | null;
}

/**
 * React hook to access authenticated user information from Easy Auth
 * 
 * Usage:
 * ```tsx
 * const { user, loading, error } = useAuth();
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!user) return <div>Not authenticated</div>;
 * 
 * return <div>Welcome, {user.name}!</div>;
 * ```
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<EasyAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Include cookies if any
        });

        if (!response.ok) {
          if (response.status === 401) {
            // User is not authenticated - this is normal for public pages
            setUser(null);
            setLoading(false);
            return;
          }
          throw new Error(`Failed to fetch user: ${response.status}`);
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        console.error('[useAuth] Error fetching user:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    user,
    token: null, // Easy Auth doesn't use JWT tokens in the same way
    loading,
    error,
  };
}

/**
 * Alias for useAuth to maintain compatibility with existing code
 */
export default useAuth;
