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
    } catch {
    } catch (err: unknown) {
      setError("Invalid credentials. Try demo@architect.com / demo123");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #f5faf0 0%, #ffffff 50%, #f0fdfa 100%)'
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(113, 179, 64, 0.15)' }}
        ></div>
        <div 
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(13, 148, 136, 0.15)' }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(102, 157, 49, 0.1) 0%, transparent 70%)' }}
        ></div>
      </div>
      
      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <Image
              src="/brand/logo-main.png"
              alt="GreenChainz"
              width={200}
              height={50}
              className="h-14 w-auto mx-auto transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </Link>
        </div>

        {/* Card */}
        <div 
          className="backdrop-blur-xl rounded-2xl p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 25px 50px -12px rgba(17, 39, 11, 0.15), 0 0 0 1px rgba(113, 179, 64, 0.1)',
            border: '1px solid rgba(113, 179, 64, 0.15)'
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-slate-600 mt-2">Sign in to your GreenChainz account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div 
                className="text-sm p-4 rounded-xl"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="demo@architect.com"
                required 
                className="w-full px-4 py-3.5 rounded-xl outline-none transition-all duration-200"
                style={{
                  border: '2px solid #e2e8f0',
                  background: '#fafafa',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#71b340';
                  e.target.style.boxShadow = '0 0 0 4px rgba(113, 179, 64, 0.15)';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#fafafa';
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                required 
                className="w-full px-4 py-3.5 rounded-xl outline-none transition-all duration-200"
                style={{
                  border: '2px solid #e2e8f0',
                  background: '#fafafa',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#71b340';
                  e.target.style.boxShadow = '0 0 0 4px rgba(113, 179, 64, 0.15)';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#fafafa';
                }}
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4 px-4 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-60 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #71b340 0%, #669d31 50%, #0d9488 100%)',
                boxShadow: '0 10px 30px -10px rgba(113, 179, 64, 0.5)'
              }}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link 
                href="/signup" 
                className="font-semibold transition-colors"
                style={{ color: '#71b340' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#569130'}
                onMouseOut={(e) => e.currentTarget.style.color = '#71b340'}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          © {new Date().getFullYear()} GreenChainz, Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
