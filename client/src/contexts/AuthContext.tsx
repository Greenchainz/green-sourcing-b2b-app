import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'buyer' | 'supplier' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  logout: () => void;
}

const AUTH_CACHE_KEY = 'gc_auth_user';
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const { user, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    return user as User;
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null) {
  try {
    if (user) {
      sessionStorage.setItem(
        AUTH_CACHE_KEY,
        JSON.stringify({ user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS })
      );
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // sessionStorage may be unavailable in some contexts — fail silently
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from cache so the user is available synchronously on first render.
  // This eliminates the blink: cached user → isLoading=false immediately,
  // then we revalidate in the background to keep the session fresh.
  const cached = getCachedUser();
  const [user, setUser] = useState<User | null>(cached);
  const [isLoading, setIsLoading] = useState(cached === null); // only show loading if no cache
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    try {
      setError(null);
      // Only show the loading spinner if we have no cached user to display
      if (!user) setIsLoading(true);
      const userData = await api.getCurrentUser();
      setUser(userData);
      setCachedUser(userData);
    } catch {
      // User not authenticated — expected for public pages
      setUser(null);
      setCachedUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout via Azure Container Apps Easy Auth.
   * The /.auth/logout endpoint clears the auth session cookie and
   * redirects the user back to the home page.
   */
  const logout = () => {
    setCachedUser(null);
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, refetch: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
