"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Image from "next/image";
import TrustBadges from "../components/TrustBadges";

const AZURE_TENANT = process.env.NEXT_PUBLIC_AZURE_TENANT || "common";
const AZURE_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "";
const AZURE_REDIRECT_URI =
  process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ||
  `${typeof window !== "undefined" ? window.location.origin : ""}/login/callback`;

type PublicConfig = {
  origin?: string;
  backendUrl?: string;
  azureTenant?: string;
  azureClientId?: string;
  redirectUri?: string;
};

export default function LoginClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Check for OAuth errors in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      
      if (errorParam) {
        const errorMessages: Record<string, string> = {
          google_auth_failed: "Google sign-in failed. Please try again.",
          google_callback_failed: "Google authentication completed but user creation failed. Please contact support.",
          linkedin_auth_failed: "LinkedIn sign-in failed. Please try again.",
          linkedin_callback_failed: "LinkedIn authentication completed but user creation failed. Please contact support."
        };
        
        setOauthError(errorMessages[errorParam] || "Authentication failed. Please try again.");
        
        // Clear error from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    const loadConfig = async () => {
      try {
        const res = await fetch("/api/public-config", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load sign-in configuration");
        const data = (await res.json()) as PublicConfig;
        if (!canceled) setPublicConfig(data);
      } catch (e) {
        if (!canceled) {
          const message =
            e instanceof Error ? e.message : "Failed to load configuration";
          setConfigError(message);
        }
      }
    };

    loadConfig();
    return () => {
      canceled = true;
    };
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated() && user) {
      const redirectTo =
        user.role === "supplier" ? "/dashboard" : "/dashboard/buyer";
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, router]);

  const initiateAzureLogin = () => {
    setIsInitializing(true);

    const azureTenant = publicConfig?.azureTenant || AZURE_TENANT;
    const azureClientId = publicConfig?.azureClientId || AZURE_CLIENT_ID;
    const redirectUri = publicConfig?.redirectUri || AZURE_REDIRECT_URI;

    if (!azureClientId) {
      setIsInitializing(false);
      setConfigError(
        "Missing Azure Client ID. Set AZURE_CLIENT_ID (or NEXT_PUBLIC_AZURE_CLIENT_ID) on the frontend container app."
      );
      return;
    }

    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);

    // Save state for CSRF protection
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_nonce", nonce);

    const authorizeUrl = new URL(
      `https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/authorize`
    );

    authorizeUrl.searchParams.append("client_id", azureClientId);
    authorizeUrl.searchParams.append("response_type", "code");
    authorizeUrl.searchParams.append("redirect_uri", redirectUri);
    authorizeUrl.searchParams.append("scope", "openid profile email");
    authorizeUrl.searchParams.append("state", state);
    authorizeUrl.searchParams.append("nonce", nonce);
    authorizeUrl.searchParams.append("prompt", "select_account");

    // Redirect to Azure AD login
    window.location.href = authorizeUrl.toString();
  };

  const initiateGoogleLogin = () => {
    const backendUrl = publicConfig?.backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    window.location.href = `${backendUrl}/auth/google`;
  };

  const initiateLinkedInLogin = () => {
    const backendUrl = publicConfig?.backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    window.location.href = `${backendUrl}/auth/linkedin`;
  };

  return (
    <div className="gc-page py-14">
      <div className="gc-container max-w-[480px]">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Image
            src="/brand/logo-main.png"
            alt="GreenChainz"
            width={190}
            height={44}
            priority
            className="h-11 w-auto mx-auto"
          />
          <p className="mt-2.5 mb-0 text-[15px] text-[var(--gc-slate-600)]">
            Verified Sustainable Building Materials
          </p>
        </div>

        {/* Login Card */}
        <div className="gc-card gc-animate-fade-in p-8">
          {/* Title */}
          <div className="mb-6">
            <h1 className="m-0 text-2xl font-black text-[var(--gc-slate-900)]">
              Sign In
            </h1>
            <p className="mt-1.5 mb-0 text-sm text-[var(--gc-slate-600)]">
              Choose your preferred sign-in method
            </p>
          </div>

          {/* Error Message */}
          {(error || configError || oauthError) && (
            <div className="gc-alert gc-alert-error mb-5">
              {error || configError || oauthError}
            </div>
          )}

          {/* Loading State */}
          {isLoading || isInitializing ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center">
                <div className="gc-spinner" />
              </div>
              <p className="text-sm text-[var(--gc-slate-600)] mt-4">
                {isInitializing ? "Redirecting to login..." : "Signing in..."}
              </p>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              <button
                onClick={initiateGoogleLogin}
                disabled={isLoading || isInitializing}
                className="gc-btn gc-btn-outline w-full py-3.5 px-4 text-[15px] mb-3"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>

              {/* LinkedIn Sign In Button */}
              <button
                onClick={initiateLinkedInLogin}
                disabled={isLoading || isInitializing}
                className="gc-btn gc-btn-outline w-full py-3.5 px-4 text-[15px] mb-5"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="#0A66C2"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Sign in with LinkedIn
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-5">
                <hr className="gc-divider flex-1 m-0" />
                <span className="text-xs font-semibold text-[var(--gc-slate-400)]">
                  OR
                </span>
                <hr className="gc-divider flex-1 m-0" />
              </div>

              {/* Microsoft Sign In Button */}
              <button
                onClick={initiateAzureLogin}
                disabled={isLoading || isInitializing}
                className="gc-btn gc-btn-primary w-full py-3.5 px-4 text-[15px] mb-5"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Sign in with Microsoft
              </button>

              {/* Info Text */}
              <div className="gc-alert gc-alert-info">
                <strong>New to GreenChainz?</strong> Sign in with Google, LinkedIn, or Microsoft
                to create an account. You can choose your role as an
                architect or supplier after signing in.
              </div>
            </>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-5 pt-4 border-t border-[var(--gc-slate-200)] text-center">
          <p className="text-xs text-[var(--gc-slate-500)] m-0">
            By signing in, you agree to our{" "}
            <a
              href="/legal/terms"
              className="text-[var(--gc-emerald-600)] font-semibold"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/legal/privacy"
              className="text-[var(--gc-emerald-600)] font-semibold"
            >
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-8">
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--gc-slate-600)] m-0">
            Need help?{" "}
            <a
              href="mailto:support@greenchainz.com"
              className="text-[var(--gc-emerald-600)] font-semibold"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
