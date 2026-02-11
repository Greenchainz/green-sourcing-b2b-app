'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Login Page
 * 
 * Redirects to Manus OAuth login portal which handles:
 * - Google OAuth
 * - Microsoft OAuth
 * - Email/password (if enabled)
 * 
 * After successful login, user is redirected back to the app
 */
export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    
    // Get the Manus OAuth login URL from the environment
    const oauthPortalUrl = process.env.NEXT_PUBLIC_OAUTH_PORTAL_URL || 'https://auth.manus.im';
    const appId = process.env.NEXT_PUBLIC_APP_ID;
    
    if (!appId) {
      console.error('NEXT_PUBLIC_APP_ID is not configured');
      return;
    }

    // Construct the OAuth login URL with redirect
    const loginUrl = new URL(`${oauthPortalUrl}/login`);
    loginUrl.searchParams.set('appId', appId);
    loginUrl.searchParams.set('redirectUri', `${window.location.origin}/api/oauth/callback`);
    loginUrl.searchParams.set('state', btoa(redirectTo)); // Encode redirect target in state

    // Redirect to Manus OAuth portal
    window.location.href = loginUrl.toString();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '10px',
          textAlign: 'center',
          color: '#333',
        }}>
          GreenChainz
        </h1>
        
        <p style={{
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          Sign in to your account to continue
        </p>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: isLoading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#0051cc')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#0070f3')}
        >
          {isLoading ? 'Redirecting...' : 'Sign in with Manus'}
        </button>

        <p style={{
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
          marginTop: '20px',
        }}>
          Secure login powered by Manus
        </p>
      </div>
    </div>
  );
}
