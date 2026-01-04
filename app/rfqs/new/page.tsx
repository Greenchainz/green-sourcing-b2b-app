'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function NewRFQPage() {
  const router = useRouter()

  useEffect(() => {
    // Canonical RFQ creation route
    router.replace('/rfqs/create')
  }, [router])

  return (
    <div className="gc-page" style={{ padding: 48 }}>
      <div className="gc-container" style={{ maxWidth: 480 }}>
        <div
          className="gc-card gc-animate-fade-in"
          style={{
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="gc-spinner" />
          </div>
          <p
            style={{
              margin: 0,
              color: 'var(--gc-slate-600)',
              fontSize: 14,
            }}
          >
            Redirecting to RFQ creation…
          </p>
        </div>
      </div>
    </div>
  )
}
