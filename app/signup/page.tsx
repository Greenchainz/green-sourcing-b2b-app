"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  AlertCircle,
  Briefcase
} from "lucide-react";
import TrustBadges from "../components/TrustBadges";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("type") === "supplier" ? "supplier" : "architect";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole as "architect" | "supplier"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (role: "architect" | "supplier") => {
    setFormData(prev => ({ ...prev, role }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
      const response = await fetch(`${backendUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Registration failed");
      }

      // If registration successful, sign them in with NextAuth
      if (data.user) {
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false
        });

        if (result?.ok) {
          const redirectTo = data.user.role === "supplier" ? "/dashboard" : "/dashboard/buyer";
          router.push(redirectTo);
        } else {
          router.push("/login?registered=true");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-premium">
      {/* Animated gradient background */}
      <div className="auth-bg-gradient" />

      {/* Floating decorative orbs */}
      <div className="auth-deco-orb auth-deco-orb-1" />
      <div className="auth-deco-orb auth-deco-orb-2" />
      <div className="auth-deco-orb auth-deco-orb-3" />

      <div className="relative z-10 py-10 min-h-screen flex flex-col justify-center">
        <div className="gc-container max-w-[580px]">
          {/* Logo / Header */}
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
              Create your account to start verified green sourcing
            </p>
          </div>

          {/* Signup Card */}
          <div className="auth-card-premium p-8 md:p-10 section-fade-in section-delay-1">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-red-700 text-sm animate-fade-in-up">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("architect")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    formData.role === "architect"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 bg-white hover:border-emerald-200 text-slate-500"
                  }`}
                >
                  <Building className={`w-6 h-6 mb-2 ${formData.role === "architect" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="font-bold text-sm">Architect / Buyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("supplier")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    formData.role === "supplier"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 bg-white hover:border-emerald-200 text-slate-500"
                  }`}
                >
                  <Briefcase className={`w-6 h-6 mb-2 ${formData.role === "supplier" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="font-bold text-sm">Supplier</span>
                </button>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 ml-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      name="firstName"
                      type="text"
                      required
                      placeholder="Jane"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input-vibrant pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      name="lastName"
                      type="text"
                      required
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input-vibrant pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-vibrant pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-vibrant pl-10"
                    minLength={8}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-vibrant pl-10"
                    minLength={8}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-aurora w-full flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-xs text-slate-500 mt-4">
                By creating an account, you agree to our{" "}
                <Link href="/legal/terms" className="text-emerald-600 hover:text-emerald-700 font-semibold">Terms</Link>
                {" "}and{" "}
                <Link href="/legal/privacy" className="text-emerald-600 hover:text-emerald-700 font-semibold">Privacy Policy</Link>
              </div>

            </form>
          </div>

          {/* Login Link */}
          <div className="mt-8 text-center section-fade-in section-delay-2">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-10 section-fade-in section-delay-3">
            <TrustBadges variant="compact" size="sm" />
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
