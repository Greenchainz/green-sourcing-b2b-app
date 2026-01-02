'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithAzure, getCurrentUser } from '../../lib/auth-azure';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Redirect to dashboard
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router]);

  const handleAzureLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithAzure();
      // Supabase will handle the redirect
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Azure');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            GreenChainz
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the platform
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleAzureLogin}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in with Microsoft Azure AD'}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
