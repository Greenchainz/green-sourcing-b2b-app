"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Image from "next/image";
import TrustBadges from "../components/TrustBadges";

const AZURE_TENANT =
  process.env.NEXT_PUBLIC_AZURE_TENANT || "greenchainz2025.onmicrosoft.com";
const AZURE_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "";
const AZURE_REDIRECT_URI =
  process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ||
  `${typeof window !== "undefined" ? window.location.origin : ""}/login/callback`;

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated() && user) {
      const redirectTo =
        user.role === "supplier"
          ? "/supplier/dashboard"
          : "/architect/dashboard";
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, router]);

  const initiateAzureLogin = () => {
    setIsInitializing(true);

    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);

    // Save state for CSRF protection
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_nonce", nonce);

    const authorizeUrl = new URL(
      `https://login.microsoftonline.com/${AZURE_TENANT}/oauth2/v2.0/authorize`
    );

    authorizeUrl.searchParams.append("client_id", AZURE_CLIENT_ID);
    authorizeUrl.searchParams.append("response_type", "code");
    authorizeUrl.searchParams.append("redirect_uri", AZURE_REDIRECT_URI);
    authorizeUrl.searchParams.append("scope", "openid profile email");
    authorizeUrl.searchParams.append("state", state);
    authorizeUrl.searchParams.append("nonce", nonce);
    authorizeUrl.searchParams.append("prompt", "select_account");

    // Redirect to Azure AD login
    window.location.href = authorizeUrl.toString();
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
              Sign in with your Microsoft account to continue
            </p>
          </div>

          {/* Error Message */}
          {error && <div className="gc-alert gc-alert-error mb-5">{error}</div>}

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

              {/* Divider */}
              <div className="flex items-center gap-4 mb-5">
                <hr className="gc-divider flex-1 m-0" />
                <span className="text-xs font-semibold text-[var(--gc-slate-400)]">
                  OR
                </span>
                <hr className="gc-divider flex-1 m-0" />
              </div>

              {/* Info Text */}
              <div className="gc-alert gc-alert-info">
                <strong>New to GreenChainz?</strong> Sign in with your Microsoft
                account to create an account. You can choose your role as an
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
