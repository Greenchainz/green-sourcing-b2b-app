'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';

const AZURE_TENANT = process.env.NEXT_PUBLIC_AZURE_TENANT || 'greenchainz2025.onmicrosoft.com';
const AZURE_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '';
const AZURE_REDIRECT_URI = process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || `${typeof window !== 'undefined' ? window.location.origin : ''}/login/callback`;

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, handleAzureCallback, isLoading, error } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated() && user) {
      const redirectTo = user.role === 'supplier' ? '/supplier/dashboard' : '/architect/dashboard';
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, router]);

  const initiateAzureLogin = () => {
    setIsInitializing(true);
    
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);
    
    // Save state for CSRF protection
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_nonce', nonce);

    const authorizeUrl = new URL(`https://login.microsoftonline.com/${AZURE_TENANT}/oauth2/v2.0/authorize`);
    
    authorizeUrl.searchParams.append('client_id', AZURE_CLIENT_ID);
    authorizeUrl.searchParams.append('response_type', 'code');
    authorizeUrl.searchParams.append('redirect_uri', AZURE_REDIRECT_URI);
    authorizeUrl.searchParams.append('scope', 'openid profile email');
    authorizeUrl.searchParams.append('state', state);
    authorizeUrl.searchParams.append('nonce', nonce);
    authorizeUrl.searchParams.append('prompt', 'select_account');

    // Redirect to Azure AD login
    window.location.href = authorizeUrl.toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">GreenChainz</h1>
          <p className="text-slate-600">Verified Sustainable Building Materials</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Sign In</h2>
            <p className="text-slate-600 text-sm mt-1">Sign in with your Microsoft account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading || isInitializing ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-600 text-sm mt-4">
                {isInitializing ? 'Redirecting to login...' : 'Signing in...'}
              </p>
            </div>
          ) : (
            <>
              {/* Microsoft Sign In Button */}
              <button
                onClick={initiateAzureLogin}
                disabled={isLoading || isInitializing}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Sign in with Microsoft
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">or</span>
                </div>
              </div>

              {/* Info Text */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>New to GreenChainz?</strong> Sign in with your Microsoft account to create an account. You can choose your role as an architect or supplier after signing in.
                </p>
              </div>
            </>
          )}

          {/* Footer Links */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-teal-600 hover:text-teal-700 font-medium">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" className="text-teal-600 hover:text-teal-700 font-medium">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Need help?{' '}
            <a href="mailto:support@greenchainz.com" className="text-teal-600 hover:text-teal-700 font-medium">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
