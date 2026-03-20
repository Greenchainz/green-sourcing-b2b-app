"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface RFQItem {
  id: string;
  material_id: string;
  quantity: number;
  unit: string;
  material_name?: string;
}

interface MatchedSupplier {
  supplier_id: string;
  match_score: number;
  company_name?: string;
}


interface MatchedSupplier {
  supplier_id: string;
  match_score: number;
  company_name?: string;
}

interface RFQData {
  id: string;
  project_name: string;
  status: string;
  delivery_address?: string;
  delivery_date?: string;
  notes?: string;
  items: RFQItem[];
  matched_suppliers: MatchedSupplier[];
}

// Helper to get status badge class
const getStatusClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case "open":
      return "gc-status-badge--open";
    case "closed":
      return "gc-status-badge--closed";
    case "awarded":
      return "gc-status-badge--awarded";
    default:
      return "gc-status-badge--default";
  }
};

export default function RFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params.rfqId as string;
  const { user, loading: authLoading } = useAuth();

  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Wait for the auth state to resolve before deciding whether the user
    // is authenticated. Without this guard the effect runs while user is
    // still null, incorrectly producing an "Not authenticated" error for
    // users who are actually logged in.
    if (authLoading) return;

    const fetchRFQ = async () => {
      setLoading(true);
      setError(""); // Clear any previous error before each attempt
      try {
        if (!user) throw new Error("Not authenticated. Please log in first.");
        const response = await fetch(`/api/rfqs/${rfqId}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error("Failed to fetch RFQ");
        const json = await response.json();

        if (json.success && json.data) {
          setRfq(json.data);
        } else {
          throw new Error(json.error || "Failed to parse RFQ data");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchRFQ();
  }, [rfqId, user, authLoading]);

  if (loading) {
    return (
      <div className="gc-page gc-rfq-page--centered">
        <div className="gc-loading-center">
          <div className="gc-spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gc-page gc-rfq-page--centered">
        <div className="gc-container gc-rfq-container--narrow">
          <div className="gc-card gc-card-padding-lg">
            <h1 className="gc-not-found-title">Error</h1>
            <p className="gc-alert gc-alert-error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="gc-page gc-rfq-page--centered">
        <div className="gc-container gc-rfq-container--narrow">
          <div className="gc-card gc-card-padding-lg">
            <h1 className="gc-not-found-title">RFQ Not Found</h1>
            <p className="gc-not-found-text">
              The requested RFQ could not be found or you don&apos;t have
              access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-page gc-rfq-page">
      <div className="gc-container gc-rfq-container">
        {/* Navigation & Header Card */}
        <div className="gc-spacing-bottom-sm">
          <button
            onClick={() => router.push('/rfq-dashboard')}
            className="gc-btn gc-btn-secondary gc-btn-compact"
          >
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="gc-card gc-animate-fade-in gc-card-padding gc-spacing-bottom-sm">
          <div className="gc-rfq-header">
            <div>
              <h1 className="gc-title-lg">{rfq.project_name}</h1>
              <div className="gc-rfq-meta">
                <span
                  className={`gc-status-badge ${getStatusClass(rfq.status)}`}
                >
                  {rfq.status}
                </span>
              </div>
            </div>
          </div>

          <hr className="gc-divider" />

          <div className="gc-spacing-bottom-sm">
            <h3 className="gc-label">Delivery Address</h3>
            <p className="gc-rfq-description-text">{rfq.delivery_address || 'Not specified'}</p>
          </div>

          <div className="gc-spacing-bottom-sm">
            <h3 className="gc-label">Delivery Date</h3>
            <p className="gc-rfq-description-text">
              {rfq.delivery_date ? new Date(rfq.delivery_date).toLocaleDateString() : 'Not specified'}
            </p>
          </div>

          <div className="gc-spacing-bottom-sm">
            <h3 className="gc-label">Notes</h3>
            <p className="gc-rfq-description-text">{rfq.notes || 'No notes provided'}</p>
          </div>
        </div>

        {/* Materials List Card */}
        <div className="gc-card gc-animate-fade-in gc-stagger-1 gc-card-padding gc-spacing-bottom-sm">
          <h2 className="gc-title-lg gc-spacing-bottom-sm">Materials List</h2>
          {rfq.items && rfq.items.length > 0 ? (
            <div className="gc-responses-grid">
              {rfq.items.map((item, index) => (
                <div key={item.id || index} className="gc-response-card">
                  <div className="gc-response-header">
                    <div>
                      <h3 className="gc-label">Material ID</h3>
                      <p className="gc-response-supplier">{item.material_id}</p>
                    </div>
                  </div>
                  <div className="gc-quotes-section">
                    <p className="gc-quotes-label">Quantity:</p>
                    <p className="gc-quote-price">{item.quantity} {item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="gc-empty-state">No materials found for this RFQ.</p>
          )}
        </div>

        {/* Matched Suppliers Card */}
        <div className="gc-card gc-animate-fade-in gc-stagger-2 gc-card-padding">
          <h2 className="gc-title-lg gc-spacing-bottom-sm">
            Matched Suppliers ({rfq.matched_suppliers?.length || 0})
          </h2>
          {rfq.matched_suppliers && rfq.matched_suppliers.length > 0 ? (
            <div className="gc-responses-grid">
              {rfq.matched_suppliers.map((supplier, index) => (
                <div key={supplier.supplier_id || index} className="gc-response-card">
                  <div className="gc-response-header">
                    <div>
                      <h3 className="gc-label">Supplier ID</h3>
                      <p className="gc-response-supplier">{supplier.supplier_id}</p>
                    </div>
                  </div>
                  <div className="gc-quotes-section">
                    <p className="gc-quotes-label">Match Score:</p>
                    <p className="gc-quote-price">{supplier.match_score}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="gc-empty-state">No matched suppliers yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
