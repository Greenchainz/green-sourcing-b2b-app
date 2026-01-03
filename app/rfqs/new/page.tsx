'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import TrustBadges from '@/app/components/TrustBadges';

export default function NewRFQPage() {
  const router = useRouter();
  useEffect(() => {
    // Consolidated canonical RFQ creation route:
    // - `/rfqs/create` talks to the Express backend (JWT)
    router.replace('/rfqs/create');
  }, [router]);

  return (
    <div className="gc-page" style={{ padding: 32 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 16 }}>
        <TrustBadges variant="compact" size="sm" />
        <div className="gc-card" style={{ padding: 18, color: 'var(--gc-slate-700)' }}>
          Redirecting to RFQ creation…
        </div>
      </div>
    </div>
  );
}
