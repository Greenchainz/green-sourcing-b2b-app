"use client";

import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initial check (Optional: You can disable this if /api/auth/me isn't ready)
  useEffect(() => {
    // For now, we assume not logged in on refresh to verify the explicit login flow first
    setLoading(false);
  }, []);

  const login = async (formData: any) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login failed");

      // Success
      setUser(data.user);
      
      // Force a hard refresh/redirect to ensure middleware sees the new cookie
      if (data.user.role === 'supplier') {
        window.location.href = '/supplier/dashboard';
      } else {
        window.location.href = '/architect/dashboard';
      }
    } catch (error) {
      console.error("Login Hook Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
