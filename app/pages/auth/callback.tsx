'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getSessionToken, getCurrentUser } from '../../lib/auth-azure';

export default function AuthCallback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase handles the OAuth callback automatically
        // Wait for session to be established
        const user = await getCurrentUser();
        
        if (!user) {
          setError('Authentication failed. Please try again.');
          setLoading(false);
          return;
        }

        // Get session token for backend API calls
        const token = await getSessionToken();

        if (!token) {
          setError('Failed to obtain session token.');
          setLoading(false);
          return;
        }

        // Store token in localStorage for API calls
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Call backend to sync user
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const response = await fetch(`${apiUrl}/api/v1/auth/sync-azure-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: user.email,
              firstName: user.user_metadata?.name?.split(' ')[0] || '',
              lastName: user.user_metadata?.name?.split(' ')[1] || '',
              azureId: user.id,
              role: 'Buyer', // Default role, can be changed later
            }),
          });

          if (!response.ok) {
            console.warn('Failed to sync user with backend:', response.statusText);
          }
        } catch (syncError) {
          console.warn('Backend sync failed (non-critical):', syncError);
        }

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Authentication error');
        setLoading(false);
      }
    };

    handleCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
