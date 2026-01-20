"use client";

import { useState } from "react";
import { useAuth } from "@/app/hooks/useAuth"; 
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(formData);
    } catch (err: unknown) {
      setError("Invalid credentials. Try demo@architect.com / demo123");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gc-fern-50 via-white to-gc-teal-50 p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gc-fern/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gc-teal-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/brand/logo-main.png"
              alt="GreenChainz"
              width={180}
              height={45}
              className="h-12 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gc-fern/10 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-slate-600 mt-1">Sign in to your GreenChainz account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="demo@architect.com"
                required 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-gc-fern focus:ring-2 focus:ring-gc-fern/20 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                required 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-gc-fern focus:ring-2 focus:ring-gc-fern/20 outline-none transition-all"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #71b340 0%, #669d31 50%, #0d9488 100%)',
              }}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-gc-fern hover:text-gc-fern-dark transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          © {new Date().getFullYear()} GreenChainz, Inc.
        </p>
      </div>
    </div>
  );
}
