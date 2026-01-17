"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { AuthenticationResult } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";

type PublicConfig = {
  origin?: string;
  backendUrl?: string;
  azureTenant?: string;
  azureClientId?: string;
  redirectUri?: string;
};

function CallbackClientInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBackendUrl, setToken, setRefreshToken, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [_traceId, _setTraceId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [, setPublicConfig] = useState<PublicConfig | null>(null);
  const debug = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
  const [steps, setSteps] = useState<string[]>([]);
  const pushStep = (msg: string) => setSteps((prev) => [...prev, msg]);
  const createMsalClient = (options: {
    clientId: string;
    tenant: string;
    redirectUri: string;
  }) => {
    return new PublicClientApplication({
      auth: {
        clientId: options.clientId,
        authority: `https://login.microsoftonline.com/${options.tenant}`,
        redirectUri: options.redirectUri,
        postLogoutRedirectUri:
          typeof window !== "undefined" ? window.location.origin : "/",
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
      },
    });
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Check for OAuth provider callbacks (Google, LinkedIn)
        const provider = searchParams.get("provider");
        const token = searchParams.get("token");
        const refreshToken = searchParams.get("refresh_token");

        if (provider && token && (provider === 'google' || provider === 'linkedin')) {
          pushStep(`Processing ${provider} OAuth callback...`);

          // Set tokens in auth store
          setToken(token);
          if (refreshToken) {
            setRefreshToken(refreshToken);
          }

          // Fetch user data from backend
          pushStep("Fetching user profile...");
          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const userResponse = await fetch(`${backendUrl}/api/v1/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!userResponse.ok) {
              throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            setUser(userData.user);

            pushStep("Sign-in successful! Redirecting...");

            // Redirect to dashboard based on role (normalize to lowercase for comparison)
            setTimeout(() => {
              const redirectTo = userData.user.role?.toLowerCase() === "supplier" ? "/dashboard" : "/dashboard/buyer";
              router.push(redirectTo);
            }, 500);

            return;
          } catch (fetchError) {
            console.error('Error fetching user data:', fetchError);
            throw new Error('Failed to complete authentication. Please try again.');
          }
        }

        // If Azure returned an error, surface it immediately.
        // Example: ?error=access_denied&error_description=...
        const oauthError = searchParams.get("error");
        if (oauthError) {
          const oauthErrorDescription = searchParams.get("error_description");
          const oauthErrorCodes = searchParams.get("error_codes");
          const oauthTraceId = searchParams.get("trace_id");
          const oauthCorrelationId = searchParams.get("correlation_id");

          const parts: string[] = [`Azure sign-in failed: ${oauthError}`];
          if (oauthErrorDescription) {
            parts.push(decodeURIComponent(oauthErrorDescription));
          }
          if (oauthErrorCodes) parts.push(`error_codes: ${oauthErrorCodes}`);
          if (oauthCorrelationId)
            parts.push(`correlation_id: ${oauthCorrelationId}`);
          if (oauthTraceId) parts.push(`trace_id: ${oauthTraceId}`);

          setError(parts.join("\n"));
          setIsProcessing(false);
          return;
        }

        // Load runtime config first so redirectUri + backendUrl are correct.
        if (debug) console.info("[Auth] Loading public config...");
        pushStep("Loading configuration...");
        const configRes = await fetch("/api/public-config", {
          cache: "no-store",
        });
        if (!configRes.ok) {
          const details = await configRes.text().catch(() => "");
          throw new Error(
            `Failed to load sign-in configuration (status ${configRes.status}). ${details}`
          );
        }
        const config = (await configRes.json()) as PublicConfig;
        setPublicConfig(config);

        if (config.backendUrl) {
          if (debug)
            console.info("[Auth] backendUrl from config:", config.backendUrl);
          setBackendUrl(config.backendUrl);
          pushStep(`Backend URL: ${config.backendUrl}`);
        }

        pushStep("Completing Microsoft sign-in...");
        const azureClientId = config.azureClientId || "";
        const azureTenant = config.azureTenant || "common";
        const redirectUri = config.redirectUri || "";

        if (!azureClientId || !redirectUri) {
          throw new Error(
            "Missing Azure sign-in configuration. Please contact support."
          );
        }

        const msalClient = createMsalClient({
          clientId: azureClientId,
          tenant: azureTenant,
          redirectUri,
        });

        const result = (await msalClient.handleRedirectPromise()) as
          | AuthenticationResult
          | null;

        if (!result || !result.idTokenClaims) {
          throw new Error(
            "No sign-in response received. Please try signing in again."
          );
        }

        const claims = result.idTokenClaims as Record<string, unknown>;
        const email =
          (claims.email as string) ||
          (claims.preferred_username as string) ||
          (claims.upn as string) ||
          null;
        const azureId = (claims.oid as string) || (claims.sub as string) || null;
        const firstName = (claims.given_name as string) || null;
        const lastName = (claims.family_name as string) || null;

        if (!email || !azureId) {
          throw new Error("Azure token missing required claims (email or oid)");
        }

        pushStep("Finalizing sign-in on backend...");
        const response = await fetch(`/api/auth/azure-callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName, lastName, azureId }),
        });

        if (!response.ok) {
          let details = "";
          try {
            const errorJson = await response.json();
            details =
              errorJson.error || errorJson.details || JSON.stringify(errorJson);
          } catch {
            details = await response.text().catch(() => "");
          }

          throw new Error(
            details
              ? `Authentication failed: ${details}`
              : `Authentication failed (HTTP ${response.status})`
          );
        }

        const data = await response.json();
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setUser(data.user);

        pushStep("Authentication successful! Redirecting...");
        const userRole = data.user?.role?.toLowerCase();
        const redirectTo = userRole === "supplier" ? "/dashboard" : "/dashboard/buyer";
        setTimeout(() => router.push(redirectTo), 500);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed";
        if (debug) console.error("[Auth] Callback error:", err);
        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, router, setBackendUrl]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            Signing you in...
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Completing authentication
          </p>
          {steps.length > 0 && (
            <div className="mt-4 text-left max-w-md mx-auto">
              <ul className="text-xs text-slate-600 space-y-1">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mt-1" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Authentication Error
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Something went wrong during sign-in
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
              {_traceId && (
                <p className="text-xs text-red-600 mt-2 font-mono">
                  Trace ID: {_traceId}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push("/login")}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CallbackClient() {
  // Next.js requires useSearchParams() to be wrapped in Suspense.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Signing you in...
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Completing authentication
            </p>
          </div>
        </div>
      }
    >
      <CallbackClientInner />
    </Suspense>
  );
}
