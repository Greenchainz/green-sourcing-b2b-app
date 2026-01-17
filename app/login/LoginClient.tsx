"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Image from "next/image";
import TrustBadges from "../components/TrustBadges";
import { Sparkles, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "@/lib/auth/msalConfig";

const AZURE_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "";
const AZURE_TENANT = process.env.NEXT_PUBLIC_AZURE_TENANT || "common";
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

    const azureClientId = publicConfig?.azureClientId || AZURE_CLIENT_ID;
    const azureTenant = publicConfig?.azureTenant || AZURE_TENANT;
    const redirectUri = publicConfig?.redirectUri || AZURE_REDIRECT_URI;

    if (!azureClientId) {
      setIsInitializing(false);
      setConfigError(
        "Missing Azure Client ID. Set AZURE_CLIENT_ID (or NEXT_PUBLIC_AZURE_CLIENT_ID) on the frontend container app."
      );
      return;
    }

    const msalClient = createMsalClient({
      clientId: azureClientId,
      tenant: azureTenant,
      redirectUri,
    });

    msalClient
      .loginRedirect({
        ...loginRequest,
        redirectUri,
        prompt: "select_account",
      })
      .catch((err) => {
        console.error("Microsoft login failed:", err);
        setIsInitializing(false);
        setConfigError("Microsoft sign-in failed. Please try again.");
      });
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
    <div className="auth-page-premium">
      {/* Animated gradient background */}
      <div className="auth-bg-gradient" />

      {/* Floating decorative orbs */}
      <div className="auth-deco-orb auth-deco-orb-1" />
      <div className="auth-deco-orb auth-deco-orb-2" />
      <div className="auth-deco-orb auth-deco-orb-3" />

      {/* Floating particles */}
      <div className="floating-particles">
        <div className="floating-particle" />
        <div className="floating-particle" />
        <div className="floating-particle" />
        <div className="floating-particle" />
      </div>

      <div className="relative z-10 py-14">
        <div className="gc-container max-w-[520px]">
          {/* Logo / Header */}
          <div className="text-center mb-10 section-fade-in">
            <div className="logo-glow-container inline-block mb-4">
              <Image
                src="/brand/logo-main.png"
                alt="GreenChainz"
                width={220}
                height={52}
                priority
                className="h-14 w-auto mx-auto drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-2">
              <span className="text-aurora">Welcome Back</span>
            </h1>
            <p className="text-base text-slate-600">
              The trust layer for sustainable commerce
            </p>
          </div>

          {/* Login Card */}
          <div className="auth-card-premium p-8 md:p-10 section-fade-in section-delay-1">
            {/* Title */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">Secure Sign In</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Choose Your Sign-In Method
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quick, secure access to your sustainability dashboard
              </p>
            </div>

            {/* Error Message */}
            {(error || configError || oauthError) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
                {error || configError || oauthError}
              </div>
            )}

            {/* Loading State */}
            {isLoading || isInitializing ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-slate-600 mt-4">
                  {isInitializing ? "Redirecting to login..." : "Signing in..."}
                </p>
              </div>
            ) : (
              <>
                {/* Google Sign In Button */}
                <button
                  onClick={initiateGoogleLogin}
                  disabled={isLoading || isInitializing}
                  className="auth-btn-premium auth-btn-google mb-4"
                >
                  <svg
                    width="22"
                    height="22"
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
                  <span>Continue with Google</span>
                </button>

                {/* LinkedIn Sign In Button */}
                <button
                  onClick={initiateLinkedInLogin}
                  disabled={isLoading || isInitializing}
                  className="auth-btn-premium auth-btn-linkedin mb-6"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="#0A66C2"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span>Continue with LinkedIn</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Or use
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                </div>

                {/* Microsoft Sign In Button - Primary */}
                <button
                  onClick={initiateAzureLogin}
                  disabled={isLoading || isInitializing}
                  className="auth-btn-premium auth-btn-microsoft group mb-6"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                  </svg>
                  <span>Continue with Microsoft</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>

                {/* Benefits */}
                <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-800">Why GreenChainz?</span>
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      50,000+ verified EPD products
                    </p>
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      AI-powered sustainability scoring
                    </p>
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
                      LEED & Buy Clean compliance tools
                    </p>
                  </div>
                </div>

                {/* New user info */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold text-emerald-600">New to GreenChainz?</span>{" "}
                    Sign in to create your account instantly.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer Links */}
          <div className="mt-6 pt-5 border-t border-white/50 text-center section-fade-in section-delay-2">
            <p className="text-xs text-slate-500">
              By signing in, you agree to our{" "}
              <a
                href="/legal/terms"
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/legal/privacy"
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 section-fade-in section-delay-3">
            <TrustBadges variant="compact" size="sm" />
          </div>

          {/* Support Link */}
          <div className="mt-6 text-center section-fade-in section-delay-4">
            <p className="text-sm text-slate-600">
              Need help?{" "}
              <a
                href="mailto:support@greenchainz.com"
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
