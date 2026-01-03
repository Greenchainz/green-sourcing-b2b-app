'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Image from 'next/image'
import TrustBadges from '../components/TrustBadges'

const AZURE_TENANT =
  process.env.NEXT_PUBLIC_AZURE_TENANT || 'greenchainz2025.onmicrosoft.com'
const AZURE_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || ''
const AZURE_REDIRECT_URI =
  process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ||
  `${typeof window !== 'undefined' ? window.location.origin : ''}/login/callback`

export default function LoginPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, error } = useAuth()
  const [isInitializing, setIsInitializing] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated() && user) {
      const redirectTo =
        user.role === 'supplier' ? '/supplier/dashboard' : '/architect/dashboard'
      router.push(redirectTo)
    }
  }, [isAuthenticated, user, router])

  const initiateAzureLogin = () => {
    setIsInitializing(true)

    const state = Math.random().toString(36).substring(7)
    const nonce = Math.random().toString(36).substring(7)

    // Save state for CSRF protection
    sessionStorage.setItem('oauth_state', state)
    sessionStorage.setItem('oauth_nonce', nonce)

    const authorizeUrl = new URL(
      `https://login.microsoftonline.com/${AZURE_TENANT}/oauth2/v2.0/authorize`
    )

    authorizeUrl.searchParams.append('client_id', AZURE_CLIENT_ID)
    authorizeUrl.searchParams.append('response_type', 'code')
    authorizeUrl.searchParams.append('redirect_uri', AZURE_REDIRECT_URI)
    authorizeUrl.searchParams.append('scope', 'openid profile email')
    authorizeUrl.searchParams.append('state', state)
    authorizeUrl.searchParams.append('nonce', nonce)
    authorizeUrl.searchParams.append('prompt', 'select_account')

    // Redirect to Azure AD login
    window.location.href = authorizeUrl.toString()
  }

  return (
    <div className="gc-page" style={{ padding: '56px 0' }}>
      <div className="gc-container" style={{ maxWidth: 480 }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image
            src="/brand/logo-main.png"
            alt="GreenChainz"
            width={190}
            height={44}
            priority
            style={{ height: 44, width: 'auto', margin: '0 auto' }}
          />
          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              color: 'var(--gc-slate-600)',
              fontSize: 15,
            }}
          >
            Verified Sustainable Building Materials
          </p>
        </div>

        {/* Login Card */}
        <div className="gc-card gc-animate-fade-in" style={{ padding: 32 }}>
          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: 'var(--gc-slate-900)',
              }}
            >
              Sign In
            </h1>
            <p
              style={{
                margin: '6px 0 0 0',
                color: 'var(--gc-slate-600)',
                fontSize: 14,
              }}
            >
              Sign in with your Microsoft account to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="gc-alert gc-alert-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading || isInitializing ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="gc-spinner" />
              </div>
              <p
                style={{
                  color: 'var(--gc-slate-600)',
                  fontSize: 14,
                  marginTop: 16,
                }}
              >
                {isInitializing ? 'Redirecting to login...' : 'Signing in...'}
              </p>
            </div>
          ) : (
            <>
              {/* Microsoft Sign In Button */}
              <button
                onClick={initiateAzureLogin}
                disabled={isLoading || isInitializing}
                className="gc-btn gc-btn-primary"
                style={{
                  width: '100%',
                  padding: '0.9rem 1rem',
                  fontSize: 15,
                  marginBottom: 20,
                }}
              >
                <svg
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Sign in with Microsoft
              </button>

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <hr className="gc-divider" style={{ flex: 1, margin: 0 }} />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--gc-slate-400)',
                    fontWeight: 600,
                  }}
                >
                  OR
                </span>
                <hr className="gc-divider" style={{ flex: 1, margin: 0 }} />
              </div>

              {/* Info Text */}
              <div className="gc-alert gc-alert-info">
                <strong>New to GreenChainz?</strong> Sign in with your Microsoft account
                to create an account. You can choose your role as an architect or
                supplier after signing in.
              </div>
            </>
          )}
        </div>

        {/* Footer Links */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--gc-slate-200)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--gc-slate-500)', margin: 0 }}>
            By signing in, you agree to our{' '}
            <a
              href="/legal/terms"
              style={{ color: 'var(--gc-emerald-600)', fontWeight: 600 }}
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/legal/privacy"
              style={{ color: 'var(--gc-emerald-600)', fontWeight: 600 }}
            >
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Trust Badges */}
        <div style={{ marginTop: 32 }}>
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Support Link */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--gc-slate-600)', margin: 0 }}>
            Need help?{' '}
            <a
              href="mailto:support@greenchainz.com"
              style={{ color: 'var(--gc-emerald-600)', fontWeight: 600 }}
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
