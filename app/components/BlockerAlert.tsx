'use client';

import { X } from 'lucide-react';

interface BlockerAlertProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * BlockerAlert - Shown when an ad blocker prevents Intercom from loading
 * 
 * Provides alternative contact methods when the chat widget is blocked.
 */
export function BlockerAlert({ isOpen, onClose }: BlockerAlertProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocker-alert-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '1.5rem',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            padding: '0.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="var(--gc-slate-500)" />
        </button>

        {/* Alert icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--gc-amber-100, #fef3c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gc-amber-600, #d97706)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2
          id="blocker-alert-title"
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.125rem',
            fontWeight: 600,
            textAlign: 'center',
            color: 'var(--gc-slate-900, #0f172a)',
          }}
        >
          Chat Unavailable
        </h2>
        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.875rem',
            textAlign: 'center',
            color: 'var(--gc-slate-600, #475569)',
            lineHeight: 1.6,
          }}
        >
          Our chat widget may be blocked by your browser&apos;s ad blocker or privacy settings.
        </p>

        {/* Alternative contact options */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <a
            href="mailto:support@greenchainz.com"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--gc-emerald-600, #059669)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'background-color 0.2s',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email Support
          </a>
          
          <a
            href="/help"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--gc-slate-100, #f1f5f9)',
              color: 'var(--gc-slate-700, #334155)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'background-color 0.2s',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Visit Help Center
          </a>
        </div>

        {/* Tip */}
        <p
          style={{
            margin: '1rem 0 0',
            fontSize: '0.75rem',
            textAlign: 'center',
            color: 'var(--gc-slate-500, #64748b)',
          }}
        >
          Tip: Try disabling your ad blocker for this site to enable live chat.
        </p>
      </div>
    </div>
  );
}
