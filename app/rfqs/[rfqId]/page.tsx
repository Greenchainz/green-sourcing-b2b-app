"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import TrustBadges from "@/app/components/TrustBadges";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface RFQ {
  id: string;
  user_id: string;
  project_name: string;
  category?: string | null;
  message?: string | null;
  status: string;
  created_at: string;
  project_details?: {
    deadline?: string | null;
    attachments?: Array<{ url?: string; name?: string; type?: string }>;
  } | null;
}

interface RFQResponse {
  id?: string;
  response_id?: number;
  supplier_id: string | number;
  supplier_name?: string | null;
  price?: number | null;
  status?: string;
  created_at: string;
  quotes?: RFQResponseQuote[];
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
  const rfqId = params.rfqId as string;
  const { user, token } = useAuth();

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [responses, setResponses] = useState<RFQResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBidForm, setShowBidForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bidForm, setBidForm] = useState({
    quotedPrice: "",
    notes: "",
  });

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        if (!token) throw new Error("Not authenticated. Please log in first.");
        const response = await fetch(`${BACKEND_URL}/api/v2/rfqs/${rfqId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch RFQ");
        const data = await response.json();
        setRfq(data.rfq);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    const fetchResponses = async () => {
      try {
        if (!token) return;
        const response = await fetch(`${BACKEND_URL}/api/v2/rfqs/${rfqId}/bids`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setResponses(data || []);
      } catch (err) {
        console.error("Failed to fetch responses:", err);
      }
    };

    (async () => {
      setLoading(true);
      await fetchRFQ();
      await fetchResponses();
      setLoading(false);
    })();
  }, [rfqId, token]);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!token) throw new Error("Not authenticated. Please log in first.");
      const price = parseFloat(bidForm.quotedPrice);
      if (Number.isNaN(price)) throw new Error("Please enter a valid price.");

      const response = await fetch(
        `${BACKEND_URL}/api/v2/rfqs/${rfqId}/bids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            total_price: price,
            line_items: [],
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit bid");
      }

      setShowBidForm(false);
      setBidForm({ quotedPrice: "", notes: "" });
      // Refresh responses
      const refreshResponse = await fetch(`${BACKEND_URL}/api/v2/rfqs/${rfqId}/bids`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setResponses(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBidAction = async (bidId: string | number, action: "accept" | "reject") => {
    try {
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(
        `${BACKEND_URL}/api/v2/rfqs/${rfqId}/bids/${bidId}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Failed to ${action} bid`);

      // Refresh responses
      const refreshResponse = await fetch(`${BACKEND_URL}/api/v2/rfqs/${rfqId}/bids`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setResponses(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
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
        {/* Trust Badges */}
        <div className="gc-spacing-bottom-sm">
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Header Card */}
        <div className="gc-card gc-animate-fade-in gc-card-padding gc-spacing-bottom-sm">
          <div className="gc-rfq-header">
            <div>
              <h1 className="gc-rfq-title">{rfq.project_name}</h1>
              <div className="gc-rfq-meta">
                <span
                  className={`gc-status-badge ${getStatusClass(rfq.status)}`}
                >
                  {rfq.status}
                </span>
                {rfq.project_details?.deadline && (
                  <span className="gc-rfq-deadline">
                    Deadline: {new Date(rfq.project_details.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {rfq.message && (
            <>
              <hr className="gc-divider" />
              <div>
                <h3 className="gc-rfq-description-title">Description</h3>
                <p className="gc-rfq-description-text">{rfq.message}</p>
              </div>
            </>
          )}
        </div>

        {/* Bids Card */}
        <div className="gc-card gc-animate-fade-in gc-stagger-1 gc-card-padding">
          <div className="gc-bids-header">
            <h2 className="gc-bids-title">
              Bids Received ({responses.length})
            </h2>
            {user && rfq.status === "open" && (
              <button
                onClick={() => setShowBidForm(!showBidForm)}
                className="gc-btn gc-btn-primary gc-btn-compact"
              >
                {showBidForm ? "Cancel" : "Submit Bid"}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="gc-alert gc-alert-error gc-spacing-bottom-sm">
              {error}
            </div>
          )}

          {/* Bid Form */}
          {showBidForm && user && (
            <form onSubmit={handleSubmitBid} className="gc-card gc-bid-form">
              <div className="gc-form-group">
                <label className="gc-label gc-label-required">
                  Your Quote (USD total)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={bidForm.quotedPrice}
                  onChange={(e) =>
                    setBidForm({ ...bidForm, quotedPrice: e.target.value })
                  }
                  className="gc-input"
                  placeholder="0.00"
                />
              </div>
              <div className="gc-form-group gc-form-group--no-margin">
                <label className="gc-label">Notes</label>
                <textarea
                  value={bidForm.notes}
                  onChange={(e) =>
                    setBidForm({ ...bidForm, notes: e.target.value })
                  }
                  rows={3}
                  className="gc-textarea"
                  placeholder="Special conditions, certifications, lead time, etc."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="gc-btn gc-btn-primary gc-btn-full-width"
              >
                {submitting ? "Submitting..." : "Submit Bid"}
              </button>
            </form>
          )}

          {/* Responses List */}
          <div className="gc-responses-grid">
            {responses.length === 0 ? (
              <p className="gc-empty-state">
                No bids yet. Be the first to submit!
              </p>
            ) : (
              responses.map((response) => (
                <div key={response.response_id || response.id} className="gc-response-card">
                  <div className="gc-response-header">
                    <div>
                      <h3 className="gc-response-supplier">
                        {response.supplier_name || `Supplier #${response.supplier_id}`}
                      </h3>
                      <p className="gc-response-date">
                        {new Date(
                          response.created_at || ""
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {response.status && (
                      <span className={`gc-status-badge gc-status-badge--${response.status.toLowerCase()}`}>
                        {response.status}
                      </span>
                    )}
                  </div>

                  {typeof response.price === "number" && (
                    <div className="gc-quotes-section">
                      <p className="gc-quotes-label">Total Price:</p>
                      <p className="gc-quote-price">${response.price}</p>
                    </div>
                  )}

                  {/* Actions for RFQ Owner */}
                  {user && rfq.user_id === user.id && response.status !== "accepted" && response.status !== "rejected" && (
                    <div className="gc-response-actions mt-4 flex gap-2">
                      <button
                        onClick={() => handleBidAction(response.id || response.response_id!, "accept")}
                        className="gc-btn gc-btn-primary gc-btn-compact"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleBidAction(response.id || response.response_id!, "reject")}
                        className="gc-btn gc-btn-secondary gc-btn-compact"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
