"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================
// Azure AD Configuration for NextAuth.js
// ============================================

/**
 * Azure AD OAuth 2.0 configuration for Microsoft Entra ID
 * Supports multi-tenant + personal Microsoft accounts
 */
export const AZURE_AD_CONFIG = {
  // Use 'common' tenant to support both organizational and personal Microsoft accounts
  // This enables multi-tenant + personal account authentication
  tenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common",
  clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
  
  // OAuth 2.0 endpoints for Microsoft Identity Platform v2.0
  // 'common' tenant allows any Azure AD tenant or personal Microsoft accounts
  get authorizationEndpoint() {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
  },
  get tokenEndpoint() {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
  },
  get userInfoEndpoint() {
    return "https://graph.microsoft.com/oidc/userinfo";
  },
  get logoutEndpoint() {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/logout`;
  },
  
  // OpenID Connect scopes for user authentication
  // These scopes work with both organizational and personal accounts
  scopes: ["openid", "profile", "email", "offline_access"],
} as const;

/**
 * NextAuth.js Azure AD Provider configuration
 * Export this for use in app/api/auth/[...nextauth]/route.ts
 */
export const getAzureADProviderConfig = () => ({
  id: "azure-ad",
  name: "Microsoft",
  type: "oidc" as const,
  issuer: `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}/v2.0`,
  clientId: process.env.AZURE_AD_CLIENT_ID || AZURE_AD_CONFIG.clientId,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
  authorization: {
    url: AZURE_AD_CONFIG.authorizationEndpoint,
    params: {
      scope: AZURE_AD_CONFIG.scopes.join(" "),
      // Enable prompt=select_account to allow users to switch accounts
      prompt: "select_account",
    },
  },
  token: AZURE_AD_CONFIG.tokenEndpoint,
  userinfo: AZURE_AD_CONFIG.userInfoEndpoint,
  profile(profile: AzureADProfile) {
    return {
      id: profile.sub || profile.oid,
      name: profile.name,
      email: profile.email || profile.preferred_username || profile.upn,
      image: null,
    };
  },
});

// ============================================
// Types and Interfaces
// ============================================

/**
 * Azure AD profile claims from ID token
 */
export interface AzureADProfile {
  sub: string;           // Subject identifier (unique user ID)
  oid?: string;          // Object ID in Azure AD
  name?: string;         // Display name
  email?: string;        // Email address
  preferred_username?: string; // User principal name (UPN)
  upn?: string;          // Alternative UPN field
  given_name?: string;   // First name
  family_name?: string;  // Last name
  tid?: string;          // Tenant ID
  iss?: string;          // Issuer
  aud?: string;          // Audience
  exp?: number;          // Expiration time (Unix timestamp)
  iat?: number;          // Issued at time
  nbf?: number;          // Not before time
}

/**
 * JWT payload structure for application tokens
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;   // Expiration time
  iat?: number;   // Issued at time
}

/**
 * Custom error class for token expiration
 */
export class TokenExpiredError extends Error {
  constructor(message = "Token has expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "AUTH_ERROR", statusCode = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

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
  tokenExpiresAt: number | null;  // Token expiration timestamp
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
  isTokenExpired: () => boolean;
  getAuthHeader: () => Record<string, string>;
  clearAuth: () => void;
  
  // Session management
  checkAndRefreshToken: () => Promise<boolean>;
  getValidToken: () => Promise<string | null>;
}

// ============================================
// Constants
// ============================================

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// Token refresh buffer: refresh 5 minutes before expiration
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ============================================
// Helper Functions
// ============================================

function mirrorJwtTokenToLocalStorage(token: string | null) {
  // Some older pages expect these keys; keep them in sync.
  try {
    if (token) {
      localStorage.setItem("jwt_token", token);
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("accessToken");
    }
  } catch {
    // ignore (SSR / storage blocked)
  }
}

/**
 * Parse JWT token and extract payload
 * Works in browser environment only
 */
function parseJwt(token: string): JWTPayload | AzureADProfile | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT:", e);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token - JWT token string
 * @param bufferMs - Buffer time in milliseconds before actual expiration
 * @returns true if token is expired or will expire within buffer time
 */
export function isJwtExpired(token: string, bufferMs = 0): boolean {
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) {
      return true; // Treat tokens without exp as expired
    }
    
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime >= expirationTime - bufferMs;
  } catch {
    return true; // Treat parse errors as expired
  }
}

/**
 * Get token expiration timestamp from JWT
 * @param token - JWT token string
 * @returns Expiration timestamp in milliseconds, or null if not available
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return payload.exp * 1000; // Convert to milliseconds
  } catch {
    return null;
  }
}

/**
 * Extract Azure AD claims from ID token
 */
export function extractAzureADClaims(idToken: string): AzureADProfile | null {
  return parseJwt(idToken) as AzureADProfile | null;
}

/**
 * Validate Azure AD token issuer for multi-tenant support
 * Accepts tokens from any Azure AD tenant or personal Microsoft accounts
 */
export function validateAzureIssuer(issuer: string): boolean {
  // Valid issuers:
  // - https://login.microsoftonline.com/{tenant-id}/v2.0 (organizational)
  // - https://login.microsoftonline.com/common/v2.0 (multi-tenant)
  // - https://login.microsoftonline.com/consumers/v2.0 (personal)
  // - https://login.microsoftonline.com/organizations/v2.0 (organizations only)
  const validIssuers = [
    /^https:\/\/login\.microsoftonline\.com\/[a-f0-9-]+\/v2\.0$/,
    /^https:\/\/login\.microsoftonline\.com\/(common|consumers|organizations)\/v2\.0$/,
    /^https:\/\/sts\.windows\.net\/[a-f0-9-]+\/$/,
  ];
  
  return validIssuers.some((pattern) => pattern.test(issuer));
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      backendUrl: DEFAULT_BACKEND_URL,
      isLoading: false,
      error: null,

      // State setters
      setUser: (user) => set({ user }),
      setToken: (token) => {
        mirrorJwtTokenToLocalStorage(token);
        const expiresAt = token ? getTokenExpiration(token) : null;
        set({ token, tokenExpiresAt: expiresAt });
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

            // Handle expired tokens specifically
            if (details.toLowerCase().includes("expired")) {
              throw new TokenExpiredError("Authorization code has expired. Please try signing in again.");
            }

            // Provide helpful error messages
            if (exchange.status === 502) {
              throw new AuthenticationError(
                `Backend service unavailable. ` +
                `Please ensure the backend is running at ${backendUrl}. ` +
                `Details: ${details || "Connection failed"}`,
                "BACKEND_UNAVAILABLE",
                502
              );
            }

            throw new AuthenticationError(
              details
                ? `Token exchange failed: ${details}`
                : `Token exchange failed (HTTP ${exchange.status})`,
              "TOKEN_EXCHANGE_FAILED",
              exchange.status
            );
          }

          onStep?.(
            `[2/3] Token exchange OK. Parsing Azure identity...`
          );
          const tokenData = await exchange.json();

          // Parse the ID token to get user info
          const idToken = tokenData.id_token;
          if (!idToken) {
            throw new AuthenticationError(
              "Invalid response from Azure: Missing ID token",
              "MISSING_ID_TOKEN",
              400
            );
          }

          // Validate the Azure AD token hasn't expired
          if (isJwtExpired(idToken)) {
            throw new TokenExpiredError("Azure ID token has expired. Please sign in again.");
          }

          const claims = parseJwt(idToken) as AzureADProfile | null;
          if (!claims) {
            throw new AuthenticationError(
              "Failed to decode Azure ID token",
              "TOKEN_DECODE_FAILED",
              400
            );
          }

          // Validate issuer for multi-tenant support
          if (claims.iss && !validateAzureIssuer(claims.iss)) {
            throw new AuthenticationError(
              "Invalid token issuer. Token must be from Microsoft Identity Platform.",
              "INVALID_ISSUER",
              401
            );
          }

          // Extract standard Azure AD claims
          // Support both organizational accounts (email, upn) and personal accounts (preferred_username)
          const email = claims.email || claims.preferred_username || claims.upn;
          const firstName = claims.given_name || "User";
          const lastName = claims.family_name || "";
          const azureId = claims.oid || claims.sub;

          if (!email || !azureId) {
            throw new AuthenticationError(
              "Azure token missing required claims (email or oid)",
              "MISSING_CLAIMS",
              400
            );
          }

          // 2) Create/lookup user + mint our JWT
          onStep?.(`[3/3] Finalizing sign-in on backend...`);
          const response = await fetch(`/api/auth/azure-callback`, {
            method: "POST",
            headers: proxyHeaders,
            body: JSON.stringify({
              code,
              email,
              firstName,
              lastName,
              azureId,
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
              throw new AuthenticationError(
                `Backend service unavailable. ` +
                `Please ensure the backend is running at ${backendUrl}. ` +
                `Details: ${details || "Connection failed"}`,
                "BACKEND_UNAVAILABLE",
                502
              );
            }

            throw new AuthenticationError(
              details
                ? `Authentication failed: ${details}`
                : `Authentication failed (HTTP ${response.status})`,
              "AUTH_CALLBACK_FAILED",
              response.status
            );
          }

          onStep?.(
            `Backend callback OK. Creating session...`
          );
          const data = await response.json();

          // Keep jwt_token in sync for any legacy callers.
          mirrorJwtTokenToLocalStorage(data.token ?? null);

          // Extract token expiration time for session management
          const tokenExpiresAt = data.token ? getTokenExpiration(data.token) : null;

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
            tokenExpiresAt,
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
          const error = new AuthenticationError(
            "No refresh token available",
            "NO_REFRESH_TOKEN",
            401
          );
          set({ error: error.message });
          throw error;
        }

        // Check if refresh token is expired
        if (isJwtExpired(refreshToken)) {
          mirrorJwtTokenToLocalStorage(null);
          set({ token: null, refreshToken: null, tokenExpiresAt: null, user: null });
          throw new TokenExpiredError("Refresh token has expired. Please sign in again.");
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
            set({ token: null, refreshToken: null, tokenExpiresAt: null, user: null });
            
            if (response.status === 401) {
              throw new TokenExpiredError("Session expired. Please sign in again.");
            }
            throw new AuthenticationError(
              "Token refresh failed",
              "REFRESH_FAILED",
              response.status
            );
          }

          const data = await response.json();
          mirrorJwtTokenToLocalStorage(data.token ?? null);
          const tokenExpiresAt = data.token ? getTokenExpiration(data.token) : null;
          set({ token: data.token, tokenExpiresAt, error: null });
        } catch (error) {
          if (error instanceof TokenExpiredError || error instanceof AuthenticationError) {
            throw error;
          }
          const errorMessage =
            error instanceof Error ? error.message : "Token refresh failed";
          set({ error: errorMessage });
          throw new AuthenticationError(errorMessage, "REFRESH_FAILED", 500);
        }
      },

      // Update user role (architect ↔ supplier)
      updateRole: async (newRole) => {
        const { token } = get();
        if (!token) {
          throw new AuthenticationError("Not authenticated", "NOT_AUTHENTICATED", 401);
        }

        // Check if token is expired before making the request
        if (isJwtExpired(token)) {
          // Try to refresh the token first
          try {
            await get().refreshAccessToken();
          } catch {
            throw new TokenExpiredError("Session expired. Please sign in again.");
          }
        }

        set({ isLoading: true, error: null });
        try {
          const backendUrl = get().backendUrl || DEFAULT_BACKEND_URL;
          const currentToken = get().token; // Get potentially refreshed token
          const response = await fetch(`${backendUrl}/api/v1/auth/role`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new TokenExpiredError("Session expired. Please sign in again.");
            }
            throw new AuthenticationError(
              "Failed to update role",
              "ROLE_UPDATE_FAILED",
              response.status
            );
          }

          const data = await response.json();
          mirrorJwtTokenToLocalStorage(data.token ?? null);
          const tokenExpiresAt = data.token ? getTokenExpiration(data.token) : null;
          set({
            user: {
              ...get().user!,
              role: data.user.role,
            },
            token: data.token, // New token with updated role
            tokenExpiresAt,
            isLoading: false,
          });
        } catch (error) {
          if (error instanceof TokenExpiredError || error instanceof AuthenticationError) {
            set({ error: error.message, isLoading: false });
            throw error;
          }
          const errorMessage =
            error instanceof Error ? error.message : "Role update failed";
          set({ error: errorMessage, isLoading: false });
          throw new AuthenticationError(errorMessage, "ROLE_UPDATE_FAILED", 500);
        }
      },

      // Logout: clear tokens and user
      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            // Get post-logout redirect URI for Azure AD
            const postLogoutRedirectUri = typeof window !== "undefined" 
              ? window.location.origin 
              : "";
            
            // Try to logout from backend first
            await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            // Optionally redirect to Azure AD logout endpoint
            // This ensures the user is logged out from Azure AD as well
            if (typeof window !== "undefined" && postLogoutRedirectUri) {
              // Note: buildAzureLogoutUrl can be used here if needed for federated logout
              // For now, we just clear local state - calling code can use buildAzureLogoutUrl
              // to redirect to Azure AD logout if federated logout is needed
              void 0; // No-op placeholder
            }
          } catch {
            // ignore logout errors - still clear local state
          }
        }

        mirrorJwtTokenToLocalStorage(null);
        set({ 
          user: null, 
          token: null, 
          refreshToken: null, 
          tokenExpiresAt: null,
          error: null 
        });
      },

      // Check if user is authenticated
      isAuthenticated: () => {
        const { user, token } = get();
        if (!user || !token) return false;
        
        // Also check if token is expired
        return !isJwtExpired(token);
      },

      // Check if token is expired
      isTokenExpired: () => {
        const { token } = get();
        if (!token) return true;
        return isJwtExpired(token);
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
          tokenExpiresAt: null,
          error: null,
          isLoading: false,
        });
      },

      // Session management: check token expiration and refresh if needed
      checkAndRefreshToken: async () => {
        const { token, refreshToken } = get();
        
        // No token at all - not authenticated
        if (!token) return false;
        
        // Check if token will expire soon (within buffer time)
        if (!isJwtExpired(token, TOKEN_REFRESH_BUFFER_MS)) {
          return true; // Token is still valid
        }
        
        // Token expired or expiring soon - try to refresh
        if (!refreshToken) {
          // No refresh token - clear auth
          get().clearAuth();
          return false;
        }
        
        try {
          await get().refreshAccessToken();
          return true;
        } catch (error) {
          console.error("Token refresh failed:", error);
          get().clearAuth();
          return false;
        }
      },

      // Get a valid token, refreshing if necessary
      getValidToken: async () => {
        const isValid = await get().checkAndRefreshToken();
        if (!isValid) return null;
        return get().token;
      },
    }),
    {
      name: "greenchainz-auth", // LocalStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
      }),
    }
  )
);

// ============================================
// NextAuth.js Session Utilities
// ============================================

/**
 * NextAuth.js compatible session type
 */
export interface NextAuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  expires: string;
  accessToken?: string;
}

/**
 * Convert Zustand auth state to NextAuth.js compatible session format
 */
export function toNextAuthSession(authState: Pick<AuthState, 'user' | 'token' | 'tokenExpiresAt'>): NextAuthSession | null {
  if (!authState.user || !authState.token) return null;
  
  return {
    user: {
      id: authState.user.id,
      name: authState.user.fullName || `${authState.user.firstName || ''} ${authState.user.lastName || ''}`.trim() || null,
      email: authState.user.email,
      image: null,
      role: authState.user.role,
    },
    expires: authState.tokenExpiresAt 
      ? new Date(authState.tokenExpiresAt).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
    accessToken: authState.token,
  };
}

/**
 * Build Azure AD authorization URL for login
 * Supports multi-tenant + personal Microsoft accounts
 */
export function buildAzureAuthUrl(options: {
  redirectUri: string;
  state?: string;
  nonce?: string;
  prompt?: "login" | "select_account" | "consent" | "none";
}): string {
  const { redirectUri, state, nonce, prompt = "select_account" } = options;
  
  const authUrl = new URL(AZURE_AD_CONFIG.authorizationEndpoint);
  authUrl.searchParams.set("client_id", AZURE_AD_CONFIG.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", AZURE_AD_CONFIG.scopes.join(" "));
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("prompt", prompt);
  
  if (state) authUrl.searchParams.set("state", state);
  if (nonce) authUrl.searchParams.set("nonce", nonce);
  
  return authUrl.toString();
}

/**
 * Build Azure AD logout URL
 */
export function buildAzureLogoutUrl(postLogoutRedirectUri?: string): string {
  const logoutUrl = new URL(AZURE_AD_CONFIG.logoutEndpoint);
  
  if (postLogoutRedirectUri) {
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  }
  
  return logoutUrl.toString();
}
