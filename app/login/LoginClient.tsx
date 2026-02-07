"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginClient() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setError("");
    setLoading(true);
    signIn("microsoft-entra-id", { callbackUrl: "/dashboard" });
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

        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={loading}
            type="button"
            className="w-full h-10 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-md hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Continue with Microsoft</span>
          </button>
        </div>
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
