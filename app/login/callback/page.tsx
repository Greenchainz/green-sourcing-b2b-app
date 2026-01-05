'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

type PublicConfig = {
  origin?: string;
  backendUrl?: string;
  azureTenant?: string;
  azureClientId?: string;
  redirectUri?: string;
};

function CallbackPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleAzureCallback, setBackendUrl } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Load runtime config first so redirectUri + backendUrl are correct.
        const configRes = await fetch('/api/public-config', { cache: 'no-store' });
        if (!configRes.ok) {
          throw new Error('Failed to load sign-in configuration');
        }
        const config = (await configRes.json()) as PublicConfig;
        setPublicConfig(config);

        if (config.backendUrl) {
          setBackendUrl(config.backendUrl);
        }

        // Get auth code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const sessionState = sessionStorage.getItem('oauth_state');

        // Validate state for CSRF protection
        if (!state || !sessionState || state !== sessionState) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        if (!code) {
          throw new Error('No authorization code received from Azure AD');
        }

        // Sign user in via our backend.
        // Backend performs the secure code exchange using AZURE_CLIENT_SECRET.
        const redirectUri =
          config.redirectUri || `${window.location.origin}/login/callback`;

        await handleAzureCallback(code, redirectUri, config.backendUrl);

        // Clear session storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_nonce');

        // Redirect based on role
        // The auth store will handle the redirect, but we can also do it here
        // Redirect handled by auth store after role is known.
        router.push('/'); // safe fallback
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, handleAzureCallback, router]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Signing you in...</h2>
          <p className="text-slate-600 text-sm mt-2">Completing authentication</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Authentication Error</h2>
              <p className="text-slate-600 text-sm mt-1">Something went wrong during sign-in</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push('/login')}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CallbackPage() {
  // Next.js requires useSearchParams() to be wrapped in Suspense.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Signing you in...</h2>
            <p className="text-slate-600 text-sm mt-2">Completing authentication</p>
          </div>
        </div>
      }
    >
      <CallbackPageInner />
    </Suspense>
  );
}
