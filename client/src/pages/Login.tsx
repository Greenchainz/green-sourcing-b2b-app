import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

// SVG icons for providers
const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" className="w-5 h-5" fill="none">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export default function Login() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  // Parse returnPath and role from query string
  const params = new URLSearchParams(window.location.search);
  const returnPath = params.get("returnPath") || "/";
  const role = params.get("role") || "";
  const error = params.get("error");

  // If already logged in, redirect
  useEffect(() => {
    if (!isLoading && user) {
      window.location.href = returnPath;
    }
  }, [user, isLoading, returnPath]);

  const buildProviderUrl = (provider: string) => {
    const url = new URL(`/api/auth/${provider}`, window.location.origin);
    url.searchParams.set("returnPath", returnPath);
    if (role) url.searchParams.set("role", role);
    return url.toString();
  };

  const errorMessages: Record<string, string> = {
    callback_failed: "Sign-in failed. Please try again.",
    missing_code: "Authorization was cancelled. Please try again.",
    access_denied: "Access was denied. Please try again.",
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/brand/greenchainz-icon.png" alt="GreenChainz" className="w-10 h-10" />
            <span className="text-2xl font-bold text-white">GreenChainz</span>
          </div>
          <p className="text-gray-400 text-sm">Verified Sustainable Sourcing</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white text-center mb-2">
            Sign in to your account
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            {role === "supplier"
              ? "Continue as a Supplier"
              : role === "buyer"
              ? "Continue as a Buyer"
              : "Choose how you'd like to sign in"}
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm text-center">
              {errorMessages[error] ?? "An error occurred. Please try again."}
            </div>
          )}

          {/* Provider buttons */}
          <div className="flex flex-col gap-3">
            <a
              href={buildProviderUrl("microsoft")}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-colors duration-200 border border-gray-200"
            >
              <MicrosoftIcon />
              Continue with Microsoft
            </a>

            <a
              href={buildProviderUrl("google")}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-colors duration-200 border border-gray-200"
            >
              <GoogleIcon />
              Continue with Google
            </a>

            <a
              href={buildProviderUrl("linkedin")}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-[#0A66C2] hover:bg-[#0958a8] text-white font-medium rounded-xl transition-colors duration-200"
            >
              <LinkedInIcon />
              Continue with LinkedIn
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{" "}
              <a href="/terms" className="text-emerald-400 hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{" "}
          <a href="/get-started" className="text-emerald-400 hover:underline">
            Get started free
          </a>
        </p>
      </div>
    </div>
  );
}
