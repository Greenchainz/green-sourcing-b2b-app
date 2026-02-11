"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Get role from URL parameter (e.g., /login?role=buyer)
    const roleParam = searchParams.get("role");
    if (roleParam) {
      setRole(roleParam);
      // Store role in sessionStorage so we can use it after OAuth callback
      sessionStorage.setItem("pendingUserRole", roleParam);
    }
  }, [searchParams]);

  const handleSignIn = (provider: string) => {
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="GreenChainz"
          width={200}
          height={80}
          className="h-20 w-auto"
        />
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {role === "buyer"
            ? "Buyer Sign In"
            : role === "supplier"
            ? "Supplier Sign In"
            : "Welcome Back"}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {role === "buyer"
            ? "Access your buyer dashboard and RFQs"
            : role === "supplier"
            ? "Manage your products and quotes"
            : "Sign in to access your GreenChainz dashboard"}
        </p>

        {/* OAuth Buttons */}
        <div className="space-y-4">
          {/* Google */}
          <button
            onClick={() => handleSignIn("google")}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Microsoft */}
          <button
            onClick={() => handleSignIn("microsoft-entra-id")}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23">
              <path fill="#f3f3f3" d="M0 0h23v23H0z" />
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            Continue with Microsoft
          </button>

          {/* LinkedIn */}
          <button
            onClick={() => handleSignIn("linkedin")}
            className="w-full flex items-center justify-center gap-3 bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Continue with LinkedIn
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Secure authentication powered by NextAuth
            </span>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-sm text-gray-600">
          By signing in, you agree to our{" "}
          <a href="/terms" className="text-[#66BB6A] hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-[#66BB6A] hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>

      {/* Bottom Text */}
      <p className="mt-8 text-center text-gray-700">
        Don't have an account?{" "}
        <a href="/signup" className="text-[#66BB6A] font-semibold hover:underline">
          Get started for free
        </a>
      </p>
    </div>
  );
}
