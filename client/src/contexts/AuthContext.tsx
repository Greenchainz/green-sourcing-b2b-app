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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (err) {
      // User not authenticated - this is expected for public pages
      setUser(null);
      setError(null); // Don't treat this as an error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, refetch: fetchUser }}>
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
