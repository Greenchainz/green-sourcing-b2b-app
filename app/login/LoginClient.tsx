"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      setError(result?.error || "Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  const handleOAuthLogin = (provider: string) => {
    setError("");
    setLoading(true);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-3">
          Welcome Back
        </h1>
        <p className="text-gray-600 text-lg">
          Sign in to access verified sustainable materials
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* OAuth Buttons - Priority positioning */}
        <div className="space-y-3 mb-6">
          {/* Google Sign-In */}
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            type="button"
            className="w-full h-12 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            <Image
              src="/images/oauth/google-signin.svg"
              alt="Sign in with Google"
              width={191}
              height={46}
              className="h-10 w-auto pointer-events-none"
            />
          </button>

          {/* Microsoft Sign-In */}
          <button
            onClick={() => handleOAuthLogin("microsoft-entra-id")}
            disabled={loading}
            type="button"
            className="w-full h-12 flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
            </svg>
            <span className="font-medium text-gray-700">Sign in with Microsoft</span>
          </button>

          {/* LinkedIn Sign-In */}
          <button
            onClick={() => handleOAuthLogin("linkedin")}
            disabled={loading}
            type="button"
            className="w-full h-12 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group cursor-pointer"
          >
            <Image
              src="/images/oauth/linkedin-signin-default.png"
              alt="Sign in with LinkedIn"
              width={191}
              height={33}
              className="h-10 w-auto block group-hover:hidden pointer-events-none"
            />
            <Image
              src="/images/oauth/linkedin-signin-hover.png"
              alt="Sign in with LinkedIn"
              width={191}
              height={33}
              className="h-10 w-auto hidden group-hover:block pointer-events-none"
            />
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">Or sign in with email</span>
          </div>
        </div>

        {/* Credentials Login */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={loading}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-green-600 hover:text-green-700 font-medium">
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/signup" className="text-green-600 hover:text-green-700 font-semibold">
          Create one now
        </Link>
      </p>
    </div>
  );
}
