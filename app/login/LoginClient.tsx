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

  const handleOAuthLogin = async (provider: string) => {
    setError("");
    setLoading(true);

    // Use NextAuth's built-in provider for Microsoft Entra ID
    await signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Welcome to GreenChainz
      </h1>
      <p className="text-gray-600 mb-6">
        Sign in to access verified sustainable materials
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Credentials Login */}
      <form onSubmit={handleCredentialsLogin} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-md transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        {/* Google Sign-In - Official Button */}
        <button
          onClick={() => handleOAuthLogin("google")}
          disabled={loading}
          className="w-full flex items-center justify-center disabled:opacity-50 transition hover:opacity-90 cursor-pointer"
          type="button"
        >
          <Image
            src="/images/oauth/google-signin.svg"
            alt="Sign in with Google"
            width={191}
            height={46}
            className="h-11 w-auto pointer-events-none"
          />
        </button>

        {/* Microsoft Sign-In */}
        <button
          onClick={() => handleOAuthLogin("microsoft-entra-id")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 font-medium text-gray-700 transition cursor-pointer"
          type="button"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
          </svg>
          Sign in with Microsoft
        </button>

        {/* LinkedIn Sign-In - Official Button with Hover */}
        <button
          onClick={() => handleOAuthLogin("linkedin")}
          disabled={loading}
          className="w-full flex items-center justify-center disabled:opacity-50 transition relative group cursor-pointer"
          type="button"
        >
          <Image
            src="/images/oauth/linkedin-signin-default.png"
            alt="Sign in with LinkedIn"
            width={191}
            height={33}
            className="h-11 w-auto block group-hover:hidden pointer-events-none"
          />
          <Image
            src="/images/oauth/linkedin-signin-hover.png"
            alt="Sign in with LinkedIn"
            width={191}
            height={33}
            className="h-11 w-auto hidden group-hover:block pointer-events-none"
          />
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
