"use client";

import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalConfig";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { instance, accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (accounts.length > 0) {
      router.push("/dashboard");
    }
  }, [accounts, router]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">GreenChainz</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
