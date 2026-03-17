"use client";

import React from "react";
import Link from "next/link";
import { Building2, Users, ShoppingCart, ArrowRight } from "lucide-react";

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-600 mb-4">
            Join GreenChainz
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose your account type to get started with sustainable material sourcing
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Buyer Card */}
          <Link
            href="/login?role=buyer"
            className="group bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all p-8 cursor-pointer"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-10 h-10 text-emerald-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                I'm a Buyer
              </h2>
              
              <p className="text-slate-600 mb-6">
                Architects, contractors, and procurement professionals sourcing sustainable materials
              </p>

              <ul className="text-left text-sm text-slate-700 space-y-3 mb-6 w-full">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Search verified sustainable materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Generate automated RFQs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Compare suppliers and quotes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Track compliance and certifications</span>
                </li>
              </ul>

              <div className="flex items-center gap-2 text-emerald-600 font-semibold group-hover:gap-4 transition-all">
                Continue as Buyer
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* Supplier Card */}
          <Link
            href="/login?role=supplier"
            className="group bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:border-teal-400 hover:shadow-xl transition-all p-8 cursor-pointer"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-10 h-10 text-teal-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                I'm a Supplier
              </h2>
              
              <p className="text-slate-600 mb-6">
                Material suppliers and manufacturers offering sustainable building products
              </p>

              <ul className="text-left text-sm text-slate-700 space-y-3 mb-6 w-full">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">✓</span>
                  <span>List your sustainable products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">✓</span>
                  <span>Receive qualified RFQs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">✓</span>
                  <span>Connect with verified buyers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">✓</span>
                  <span>Showcase certifications and EPDs</span>
                </li>
              </ul>

              <div className="flex items-center gap-2 text-teal-600 font-semibold group-hover:gap-4 transition-all">
                Continue as Supplier
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
