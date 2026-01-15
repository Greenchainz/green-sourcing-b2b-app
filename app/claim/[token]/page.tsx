'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Correct hook for App Router params? No, useParams
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function ClaimPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'claimed'>('loading');
  const [supplier, setSupplier] = useState<{
    name?: string;
    claim_email?: string;
  } | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch('/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token })
    })
    .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
    })
    .then(data => {
        setSupplier(data.supplier);
        setStatus('valid');
    })
    .catch(() => {
        setStatus('invalid');
    });
  }, [token]);

  const handleClaim = (e: React.FormEvent) => {
      e.preventDefault();
      // Here we would call the actual Registration API
      // For MVP demo, just redirect to dashboard
      setTimeout(() => {
          router.push('/dashboard/supplier');
      }, 1000);
  };

  if (status === 'loading') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
                  <p className="text-slate-500">Verifying your invitation...</p>
              </div>
          </div>
      );
  }

  if (status === 'invalid') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                      <AlertTriangle size={32} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h1>
                  <p className="text-slate-500 mb-8">This invitation link is no longer valid. It may have already been used or expired.</p>
                  <Link href="/contact" className="text-green-600 font-medium hover:underline">Contact Support</Link>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
       <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-slate-900 font-bold">G</div>
            <span className="text-xl font-bold text-slate-900">GreenChainz</span>
          </div>
       </div>

       <div className="bg-white max-w-lg w-full p-8 rounded-2xl shadow-lg border border-slate-100">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <CheckCircle2 size={32} />
             </div>
             <h1 className="text-2xl font-bold text-slate-900">Claim Your Profile</h1>
             <p className="text-slate-500 mt-2">
                We found <strong className="text-slate-900">{supplier?.name}</strong> in our database.
                Verify your identity to access RFQs.
             </p>
          </div>

          <form onSubmit={handleClaim} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Email</label>
                <input
                    type="email"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    value={supplier?.claim_email || 'email@company.com'} // Mock or real
                    disabled
                />
                <p className="text-xs text-slate-400 mt-1">This email was associated with your public listing.</p>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Create Password</label>
                <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
             </div>

             <div className="pt-4">
                 <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    Create Account & Claim
                    <ArrowRight size={18} />
                 </button>
             </div>

             <p className="text-xs text-center text-slate-400 mt-4">
                By clicking "Create Account", you agree to our Terms of Service and Privacy Policy.
             </p>
          </form>
       </div>
    </div>
  );
}
