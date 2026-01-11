"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  role: "architect" | "supplier";
  oauthProvider?: string | null;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  backendUrl: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setBackendUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth methods
  handleAzureCallback: (
    code: string,
    redirectUri: string,
    backendUrlOverride?: string,
    onStep?: (message: string) => void
  ) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateRole: (newRole: "architect" | "supplier") => Promise<void>;
  logout: () => Promise<void>;

  // Utilities
  isAuthenticated: () => boolean;
  getAuthHeader: () => Record<string, string>;
  clearAuth: () => void;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function mirrorJwtTokenToLocalStorage(token: string | null) {
  // Some older pages expect this key; keep it in sync.
  try {
    if (token) localStorage.setItem("jwt_token", token);
    else localStorage.removeItem("jwt_token");
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
      backendUrl: DEFAULT_BACKEND_URL,
      isLoading: false,
      error: null,

      // State setters
      setUser: (user) => set({ user }),
      setToken: (token) => {
        mirrorJwtTokenToLocalStorage(token);
        set({ token });
      },
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setBackendUrl: (backendUrl) => set({ backendUrl }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Exchange Azure auth code for JWT tokens
      handleAzureCallback: async (
        code,
        redirectUri,
        backendUrlOverride,
        onStep
      ) => {
        set({ isLoading: true, error: null });
        try {
          const backendUrl =
            backendUrlOverride || get().backendUrl || DEFAULT_BACKEND_URL;
          // Use same-origin API proxy to avoid cross-origin browser failures.
          // The proxy forwards to BACKEND_URL server-side.
          const proxyHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (backendUrl) proxyHeaders["x-backend-url"] = backendUrl;

          // 1) Exchange code -> ID token via backend (keeps client_secret server-side)
          onStep?.(`[1/3] Exchanging code with Azure via backend...`);
          const exchange = await fetch(`/api/auth/azure-token-exchange`, {
            method: "POST",
            headers: proxyHeaders,
            body: JSON.stringify({ code, redirectUri }),
          });

          if (!exchange.ok) {
            let details = "";
            try {
              const errorJson = await exchange.json();
              details =
                errorJson.error ||
                errorJson.details ||
                JSON.stringify(errorJson);
            } catch {
              details = await exchange.text().catch(() => "");
            }

            onStep?.(`Token exchange failed (status ${exchange.status}).`);

            // Provide helpful error messages
            if (exchange.status === 502) {
              throw new Error(
                `Backend service unavailable. ` +
                  `Please ensure the backend is running at ${backendUrl}. ` +
                  `Details: ${details || "Connection failed"}`
              );
            }

            throw new Error(
              details
                ? `Token exchange failed: ${details}`
                : `Token exchange failed (HTTP ${exchange.status})`
            );
          }

          onStep?.(
            `[2/3] Token exchange OK (status ${exchange.status}). Parsing response...`
          );
          const tokenData = await exchange.json();

          // 2) Create/lookup user + mint our JWT
          onStep?.(`[3/3] Finalizing sign-in on backend...`);
          const response = await fetch(`/api/auth/azure-callback`, {
            method: "POST",
            headers: proxyHeaders,
            body: JSON.stringify({
              code,
              email: tokenData.email,
              firstName: tokenData.firstName,
              lastName: tokenData.lastName,
              azureId: tokenData.azureId,
            }),
          });

          if (!response.ok) {
            let details = "";
            try {
              const errorJson = await response.json();
              details =
                errorJson.error ||
                errorJson.details ||
                JSON.stringify(errorJson);
            } catch {
              details = await response.text().catch(() => "");
            }

            onStep?.(`Backend callback failed (status ${response.status}).`);

            // Provide helpful error messages
            if (response.status === 502) {
              throw new Error(
                `Backend service unavailable. ` +
                  `Please ensure the backend is running at ${backendUrl}. ` +
                  `Details: ${details || "Connection failed"}`
              );
            }

            throw new Error(
              details
                ? `Authentication failed: ${details}`
                : `Authentication failed (HTTP ${response.status})`
            );
          }

          onStep?.(
            `Backend callback OK (status ${response.status}). Creating session...`
          );
          const data = await response.json();

          // Keep jwt_token in sync for any legacy callers.
          mirrorJwtTokenToLocalStorage(data.token ?? null);

          set({
            user: {
              id: data.user.id,
              email: data.user.email,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              fullName: data.user.fullName,
              role: data.user.role,
              oauthProvider: data.user.oauthProvider,
            },
            token: data.token,
            refreshToken: data.refreshToken,
            isLoading: false,
          });
          onStep?.(`Sign-in complete. Redirecting...`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Authentication failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Refresh JWT token using refresh token
      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          set({ error: "No refresh token available" });
          return;
        }

        try {
          const backendUrl = get().backendUrl || DEFAULT_BACKEND_URL;
          const response = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            // Refresh failed, clear auth
            mirrorJwtTokenToLocalStorage(null);
            set({ token: null, refreshToken: null, user: null });
            throw new Error("Token refresh failed");
          }

          const data = await response.json();
          mirrorJwtTokenToLocalStorage(data.token ?? null);
          set({ token: data.token, error: null });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Token refresh failed";
          set({ error: errorMessage });
          throw error;
        }
      },

      // Update user role (architect ↔ supplier)
      updateRole: async (newRole) => {
        const { token } = get();
        if (!token) {
          throw new Error("Not authenticated");
        }

        set({ isLoading: true, error: null });
        try {
          const backendUrl = get().backendUrl || DEFAULT_BACKEND_URL;
          const response = await fetch(`${backendUrl}/api/v1/auth/role`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (!response.ok) {
            throw new Error("Failed to update role");
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
          const errorMessage =
            error instanceof Error ? error.message : "Role update failed";
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
              method: "POST",
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
        return { Authorization: token ? `Bearer ${token}` : "" };
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
      name: "greenchainz-auth", // LocalStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
