"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const handleSignUp = () => {
    signIn("microsoft-entra-id", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="auth-page-premium">
      <div className="auth-bg-gradient" />

      <div className="auth-deco-orb auth-deco-orb-1" />
      <div className="auth-deco-orb auth-deco-orb-2" />
      <div className="auth-deco-orb auth-deco-orb-3" />

      <div className="relative z-10 py-10 min-h-screen flex flex-col justify-center">
        <div className="gc-container max-w-[580px]">
          <div className="text-center mb-8 section-fade-in">
            <div className="logo-glow-container inline-block mb-4">
              <Image
                src="/brand/logo-main.png"
                alt="GreenChainz"
                width={220}
                height={52}
                priority
                className="h-12 w-auto mx-auto drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-2">
              <span className="text-aurora">Join GreenChainz</span>
            </h1>
            <p className="text-base text-slate-600">
              Create your account through Microsoft Entra External ID
            </p>
          </div>

          <div className="auth-card-premium p-8 md:p-10 section-fade-in section-delay-1">
            <button
              type="button"
              onClick={handleSignUp}
              className="btn-aurora w-full h-10 flex items-center justify-center gap-2 group"
            >
              <span className="text-sm font-semibold">Create Account</span>
            </button>

            <div className="text-center text-xs text-slate-500 mt-4">
              By creating an account, you agree to our{" "}
              <Link href="/legal/terms" className="text-emerald-600 hover:text-emerald-700 font-semibold">Terms</Link>
              {" "}and{" "}
              <Link href="/legal/privacy" className="text-emerald-600 hover:text-emerald-700 font-semibold">Privacy Policy</Link>
            </div>
          </div>

          <div className="mt-8 text-center section-fade-in section-delay-2">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
