"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

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
  const { handleAzureCallback, setBackendUrl } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [, setPublicConfig] = useState<PublicConfig | null>(null);
  const debug = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
  const [steps, setSteps] = useState<string[]>([]);
  const pushStep = (msg: string) => setSteps((prev) => [...prev, msg]);

  useEffect(() => {
    const processCallback = async () => {
      try {
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

        // Get auth code and state from URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const sessionState = sessionStorage.getItem("oauth_state");
        if (debug)
          console.info(
            "[Auth] code present:",
            !!code,
            "state:",
            state,
            "sessionState:",
            sessionState
          );
        pushStep("Validating sign-in state...");

        // Validate state for CSRF protection
        if (!state || !sessionState || state !== sessionState) {
          throw new Error(
            "Sign-in session expired or invalid state returned. Please try signing in again."
          );
        }

        if (!code) {
          throw new Error("No authorization code received from Azure AD");
        }

        // Sign user in via our backend.
        // Backend performs the secure code exchange using AZURE_CLIENT_SECRET.
        const redirectUri =
          config.redirectUri || `${window.location.origin}/login/callback`;
        if (debug) console.info("[Auth] Using redirectUri:", redirectUri);
        pushStep(`Redirect URI: ${redirectUri}`);

        if (debug) console.info("[Auth] Exchanging code via backend...");
        pushStep(`Backend URL: ${config.backendUrl || "default"}`);

        try {
          await handleAzureCallback(code, redirectUri, config.backendUrl, (m) =>
            pushStep(m)
          );
          if (debug)
            console.info("[Auth] Backend exchange complete; routing home");

          // Clear session storage
          sessionStorage.removeItem("oauth_state");
          sessionStorage.removeItem("oauth_nonce");

          // Redirect based on user role or home
          pushStep("Authentication successful! Redirecting...");
          setTimeout(() => {
            router.push("/"); // safe fallback
          }, 500);
        } catch (callbackError) {
          // handleAzureCallback already sets error state, but add more context
          const errorMsg =
            callbackError instanceof Error
              ? callbackError.message
              : "Unknown error";
          if (
            errorMsg.includes("connect") ||
            errorMsg.includes("network") ||
            errorMsg.includes("502")
          ) {
            throw new Error(
              `Cannot connect to backend service. ` +
                `Please ensure the backend is running at ${config.backendUrl || "http://localhost:3001"}. ` +
                `Error: ${errorMsg}`
            );
          }
          throw callbackError;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed";
        if (debug) console.error("[Auth] Callback error:", err);
        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, handleAzureCallback, router, setBackendUrl]);

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
              <p className="text-sm text-red-700">{error}</p>
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
