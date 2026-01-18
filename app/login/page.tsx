"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth"; // IMPORT THIS
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FiEye, FiEyeOff, FiCheckSquare } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaLinkedin, FaMicrosoft } from "react-icons/fa";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { login } = useAuth(); // GET LOGIN FUNCTION
  
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Pass the raw form data to our Auth Hook
      await login(formData); 
      // If login throws, it will be caught below. If successful, useAuth handles redirect.
    } catch (err: any) {
      console.error("Login failed", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ... Keep your fillDemo and OAuth functions as they were ...
  const fillDemo = (type: "architect" | "supplier") => {
    setFormData({
      email: type === "architect" ? "demo@architect.com" : "demo@supplier.com",
      password: "demo123",
    });
  };

  // ... (Keep the rest of your JSX exactly as it was, just ensure the form uses handleSubmit above)
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* ... (Your existing UI code) ... */}
        
          <form onSubmit={handleSubmit} className="space-y-4">
             {/* ... Inputs ... */}
             <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="demo@architect.com"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
                 {/* ... Eye icon ... */}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 text-lg">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        {/* ... */}
    </div>
  );
}
