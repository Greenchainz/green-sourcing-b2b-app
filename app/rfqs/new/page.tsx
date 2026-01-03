'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewRFQPage() {
  const router = useRouter();
  useEffect(() => {
    // Consolidated canonical RFQ creation route:
    // - `/rfqs/create` talks to the Express backend (JWT)
    router.replace('/rfqs/create');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">Redirecting to RFQ creation…</div>
    </div>
  );
}
