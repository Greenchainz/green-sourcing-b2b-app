"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "already_claimed"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No claim token provided.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/claim/verify?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setCompanyName(data.companyName);
          setStatus("success");
          // Wait 2s then redirect to setup
          setTimeout(() => {
            router.push(`/claim/setup?token=${token}`);
          }, 2000);
        } else {
          if (res.status === 409) {
            setCompanyName(data.companyName);
            setStatus("already_claimed");
          } else {
            setStatus("error");
            setErrorMessage(data.error || "Invalid or expired token.");
          }
        }
      } catch (_err) {
        setStatus("error");
        setErrorMessage("Failed to connect to verification server.");
      }
    };

    verifyToken();
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-forest-600 mb-4" />
        <h2 className="text-xl font-medium text-slate-800">
          Verifying your profile link...
        </h2>
      </div>
    );
  }

  if (status === "already_claimed") {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg border border-slate-200 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-amber-100 p-3">
            <CheckCircle className="h-10 w-10 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {companyName} is already active!
        </h1>
        <p className="text-slate-600 mb-8">
          This profile has already been claimed. If you need access, please
          contact your team admin or our support.
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Login
          </Link>
          <Link
            href="/"
            className="block text-slate-500 hover:text-slate-800 text-sm"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg border border-rose-100 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-rose-100 p-3">
            <AlertCircle className="h-10 w-10 text-rose-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Invalid</h1>
        <p className="text-slate-600 mb-8">{errorMessage}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 hover:bg-slate-900"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg border border-forest-100 text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-forest-100 p-3">
          <CheckCircle className="h-10 w-10 text-forest-600" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Welcome, {companyName}!
      </h1>
      <p className="text-slate-600 mb-6">
        Verification successful. redirecting you to account setup...
      </p>
      <Loader2 className="h-6 w-6 animate-spin text-forest-600 mx-auto" />
    </div>
  );
}

export default function ClaimPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-center">
        <span className="text-xl font-bold text-forest-700">GreenChainz</span>
      </nav>
      <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
        <ClaimContent />
      </Suspense>
    </div>
  );
}
