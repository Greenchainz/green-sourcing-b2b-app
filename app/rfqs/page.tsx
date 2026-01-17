"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { RFQCard, RFQSummary } from "@/app/components/dashboard/RFQCard";
import { useRouter } from "next/navigation";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface BackendRFQ {
  id: string;
  project_name: string;
  deadline?: string;
  status: string;
  created_at: string;
  user?: {
    company_name?: string;
    oauth_provider?: string;
  };
  rfq_items?: any[];
  wave?: number;
  minutes_until_visible?: number;
  deposit_verified?: boolean;
}

export default function RFQsListingPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [rfqs, setRfqs] = useState<RFQSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "my">("all");

  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        if (!token) return;

        // Determine endpoint based on filter
        // "my" -> fetch user's own RFQs
        // "all" -> fetch all open RFQs (for suppliers to browse)
        const endpoint = filter === "my"
          ? `${BACKEND_URL}/api/v2/rfqs`
          : `${BACKEND_URL}/api/v2/rfqs?status=open`;

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch RFQs");

        const data = await response.json();
        // Assume data is { rfqs: [...] } or just [...]
        const rfqList: BackendRFQ[] = data.rfqs || data || [];

        const mappedRfqs: RFQSummary[] = rfqList.map((rfq) => {
          let status = (rfq.status as any) || "pending";
          if (status === "open") status = "pending";
          if (status === "closed") status = "awarded"; // Mapping closed to awarded for now as closest UI match

          return {
            id: rfq.id,
            projectName: rfq.project_name,
            materialsCount: rfq.rfq_items?.length || 0,
            deadline: rfq.deadline ? new Date(rfq.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week if missing
            wave: (rfq.wave as 1 | 2 | 3) || 1,
            minutesUntilVisible: rfq.minutes_until_visible || 0,
            depositVerified: rfq.deposit_verified || false,
            buyerLinkedInVerified: rfq.user?.oauth_provider === "linkedin",
            buyerCompany: rfq.user?.company_name || "Unknown Company",
            status: status,
            createdAt: new Date(rfq.created_at),
          };
        });

        setRfqs(mappedRfqs);
      } catch (err) {
        console.error("Fetch RFQs error:", err);
        setError("Failed to load RFQs");
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchRFQs();
    } else {
       setLoading(false); // Stop loading if not auth
    }
  }, [user, token, filter]);

  const handleRespond = (rfqId: string) => {
    router.push(`/rfqs/${rfqId}`);
  };

  if (loading) {
    return (
      <div className="gc-page gc-rfq-page--centered">
        <div className="gc-loading-center">
          <div className="gc-spinner" />
        </div>
      </div>
    );
  }

  if (!user) {
      return (
          <div className="gc-page py-12 text-center">
               <div className="gc-container">
                   <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
                   <p className="mb-6">You need to be logged in to view RFQs.</p>
                   <Link href="/login" className="gc-btn gc-btn-primary">Log In</Link>
               </div>
          </div>
      )
  }

  return (
    <div className="gc-page py-8">
      <div className="gc-container">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-[var(--gc-slate-900)] mb-2">
              RFQs
            </h1>
            <p className="text-[var(--gc-slate-600)]">
              Manage your requests and quotes
            </p>
          </div>

          <div className="flex gap-4">
             {/* Only show Create button if Architect (or allowed role) */}
             {user.role !== 'supplier' && (
                <Link href="/rfqs/create" className="gc-btn gc-btn-primary">
                    + New RFQ
                </Link>
             )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 border-b border-[var(--gc-slate-200)] pb-1">
             <button
                onClick={() => setFilter("all")}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${filter === 'all' ? 'border-[var(--gc-primary)] text-[var(--gc-primary)]' : 'border-transparent text-[var(--gc-slate-500)] hover:text-[var(--gc-slate-700)]'}`}
             >
                Open Market
             </button>
             <button
                onClick={() => setFilter("my")}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${filter === 'my' ? 'border-[var(--gc-primary)] text-[var(--gc-primary)]' : 'border-transparent text-[var(--gc-slate-500)] hover:text-[var(--gc-slate-700)]'}`}
             >
                My RFQs
             </button>
        </div>

        {error && (
            <div className="gc-alert gc-alert-error mb-6">{error}</div>
        )}

        {rfqs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-lg text-gray-500 mb-4">No RFQs found.</p>
                {user.role !== 'supplier' && (
                    <Link href="/rfqs/create" className="gc-btn gc-btn-primary">
                        Create your first RFQ
                    </Link>
                )}
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rfqs.map(rfq => (
                    <RFQCard
                        key={rfq.id}
                        rfq={rfq}
                        onRespond={handleRespond}
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
