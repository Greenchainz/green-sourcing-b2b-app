"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewRFQPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/rfqs/create");
  }, [router]);

  return (
    <div className="gc-page gc-rfq-page--centered">
      <div className="gc-loading-center">
        <div className="gc-spinner" />
      </div>
    </div>
  );
}
