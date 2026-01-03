import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'architect' | 'supplier';
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Auth methods
  handleAzureCallback: (code: string, email: string, firstName?: string, lastName?: string, azureId?: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateRole: (newRole: 'architect' | 'supplier') => Promise<void>;
  logout: () => Promise<void>;
  
  // Utilities
  isAuthenticated: () => boolean;
  getAuthHeader: () => Record<string, string>;
  clearAuth: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const useAuth = create<AuthState>(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // State setters
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Exchange Azure auth code for JWT tokens
      handleAzureCallback: async (code, email, firstName, lastName, azureId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${BACKEND_URL}/api/v1/auth/azure-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              email,
              firstName: firstName || null,
              lastName: lastName || null,
              azureId: azureId || email, // Fallback to email if azureId not provided
            }),
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();
          set({
            user: {
              id: data.user.id,
              email: data.user.email,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              role: data.user.role,
            },
            token: data.token,
            refreshToken: data.refreshToken,
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Refresh JWT token using refresh token
      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          set({ error: 'No refresh token available' });
          return;
        }

        try {
          const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            // Refresh failed, clear auth
            set({ token: null, refreshToken: null, user: null });
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          set({ token: data.token, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Update user role (architect ↔ supplier)
      updateRole: async (newRole) => {
        const { token } = get();
        if (!token) {
          throw new Error('Not authenticated');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${BACKEND_URL}/api/v1/auth/role`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (!response.ok) {
            throw new Error('Failed to update role');
          }

          const data = await response.json();
          set({
            user: {
              ...get().user!,
              role: data.user.role,
            },
            token: data.token, // New token with updated role
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Role update failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Logout: clear tokens and user
      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }
        set({ user: null, token: null, refreshToken: null, error: null });
      },

      // Check if user is authenticated
      isAuthenticated: () => {
        return get().user !== null && get().token !== null;
      },

      // Get Authorization header for API calls
      getAuthHeader: () => {
        const token = get().token;
        if (!token) return {};
        return { 'Authorization': `Bearer ${token}` };
      },

      // Clear all auth state
      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          error: null,
          isLoading: false,
        });
      },
    }),
    {
      name: 'greenchainz-auth', // LocalStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
