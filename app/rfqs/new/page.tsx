"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewRFQPage() {
  const router = useRouter();

  useEffect(() => {
    // Canonical RFQ creation route
    router.replace("/rfqs/create");
  }, [router]);

  return (
    <div className="gc-page gc-rfq-page--centered">
      <div className="gc-container gc-rfq-container--narrow">
        <div className="gc-card gc-animate-fade-in gc-card-padding-lg gc-text-center">
          <div className="gc-loading-center gc-spacing-bottom-sm">
            <div className="gc-spinner" />
          </div>
          <p className="gc-redirect-text">Redirecting to RFQ creation…</p>
        </div>
      </div>
    </div>
  );
}
