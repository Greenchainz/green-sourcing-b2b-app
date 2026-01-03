'use client';

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
  handleAzureCallback: (
    code: string,
    redirectUri: string
  ) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateRole: (newRole: 'architect' | 'supplier') => Promise<void>;
  logout: () => Promise<void>;

  // Utilities
  isAuthenticated: () => boolean;
  getAuthHeader: () => Record<string, string>;
  clearAuth: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function mirrorJwtTokenToLocalStorage(token: string | null) {
  // Some older pages expect this key; keep it in sync.
  try {
    if (token) localStorage.setItem('jwt_token', token);
    else localStorage.removeItem('jwt_token');
  } catch {
    // ignore (SSR / storage blocked)
  }
}

export const useAuth = create<AuthState>()(
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
      setToken: (token) => {
        mirrorJwtTokenToLocalStorage(token);
        set({ token });
      },
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Exchange Azure auth code for JWT tokens
      handleAzureCallback: async (code, redirectUri) => {
        set({ isLoading: true, error: null });
        try {
          // 1) Exchange code -> ID token via backend (keeps client_secret server-side)
          const exchange = await fetch(`${BACKEND_URL}/api/v1/auth/azure-token-exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
          });

          if (!exchange.ok) {
            throw new Error('Token exchange failed');
          }

          const tokenData = await exchange.json();

          // 2) Create/lookup user + mint our JWT
          const response = await fetch(`${BACKEND_URL}/api/v1/auth/azure-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              email: tokenData.email,
              firstName: tokenData.firstName,
              lastName: tokenData.lastName,
              azureId: tokenData.azureId,
            }),
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();

          // Keep jwt_token in sync for any legacy callers.
          mirrorJwtTokenToLocalStorage(data.token ?? null);

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
            mirrorJwtTokenToLocalStorage(null);
            set({ token: null, refreshToken: null, user: null });
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          mirrorJwtTokenToLocalStorage(data.token ?? null);
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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (!response.ok) {
            throw new Error('Failed to update role');
          }

          const data = await response.json();
          mirrorJwtTokenToLocalStorage(data.token ?? null);
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
                Authorization: `Bearer ${token}`,
              },
            });
          } catch {
            // ignore
          }
        }

        mirrorJwtTokenToLocalStorage(null);
        set({ user: null, token: null, refreshToken: null, error: null });
      },

      // Check if user is authenticated
      isAuthenticated: () => {
        return get().user !== null && get().token !== null;
      },

      // Get Authorization header for API calls
      getAuthHeader: (): Record<string, string> => {
        const token = get().token;
        return { Authorization: token ? `Bearer ${token}` : '' };
      },

      // Clear all auth state
      clearAuth: () => {
        mirrorJwtTokenToLocalStorage(null);
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

