"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import TrustBadges from "@/app/components/TrustBadges";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface RFQLineItem {
  id: number;
  rfq_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  specification?: string | null;
  sort_order?: number | null;
}

interface RFQ {
  id: string;
  project_name: string;
  description?: string | null;
  deadline: string;
  budget?: number | null;
  status: string;
  created_at: string;
  materials: RFQLineItem[];
}

interface RFQResponseQuote {
  quote_id: number;
  line_item_id: number;
  price: number;
  availability: "available" | "partial" | "unavailable";
  lead_time_days?: number | null;
}

interface RFQResponse {
  response_id: number;
  supplier_id: number;
  notes?: string | null;
  created_at: string;
  quotes: RFQResponseQuote[];
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
        const response = await fetch(`${BACKEND_URL}/api/v1/rfqs/${rfqId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch RFQ");
        setRfq(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    const fetchResponses = async () => {
      try {
        if (!token) return;
        const response = await fetch(
          `${BACKEND_URL}/api/v1/rfqs/${rfqId}/responses`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        setResponses(data.responses || []);
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
      if (!rfq?.materials?.length)
        throw new Error("RFQ has no line items to quote.");
      const price = parseFloat(bidForm.quotedPrice);
      if (Number.isNaN(price)) throw new Error("Please enter a valid price.");

      const quotes = rfq.materials.map((li) => ({
        rfq_line_item_id: li.id,
        price,
        availability: "available" as const,
      }));

      const response = await fetch(
        `${BACKEND_URL}/api/v1/rfqs/${rfqId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quotes,
            notes: bidForm.notes || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit bid");
      }

      setShowBidForm(false);
      setBidForm({ quotedPrice: "", notes: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
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
                {rfq.deadline && (
                  <span className="gc-rfq-deadline">
                    Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {rfq.budget && (
              <div className="gc-rfq-budget">
                <p className="gc-rfq-budget-value">
                  ${rfq.budget.toLocaleString()}
                </p>
                <p className="gc-rfq-budget-label">Estimated Budget</p>
              </div>
            )}
          </div>

          {rfq.description && (
            <>
              <hr className="gc-divider" />
              <div>
                <h3 className="gc-rfq-description-title">Description</h3>
                <p className="gc-rfq-description-text">{rfq.description}</p>
              </div>
            </>
          )}
        </div>

        {/* Materials Card */}
        <div className="gc-card gc-animate-fade-in gc-stagger-1 gc-card-padding gc-spacing-bottom-sm">
          <h2 className="gc-rfq-section-title">Required Materials</h2>
          <div className="gc-materials-grid">
            {rfq.materials.map((material, idx) => (
              <div key={idx} className="gc-material-item">
                <div>
                  <p className="gc-material-name">{material.material_name}</p>
                  {material.specification && (
                    <p className="gc-material-spec">{material.specification}</p>
                  )}
                </div>
                <p className="gc-material-qty">
                  {material.quantity} {material.unit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bids Card */}
        <div className="gc-card gc-animate-fade-in gc-stagger-2 gc-card-padding">
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
                  Your Quote (USD per line item)
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
                <div key={response.response_id} className="gc-response-card">
                  <div className="gc-response-header">
                    <div>
                      <h3 className="gc-response-supplier">
                        Supplier #{response.supplier_id}
                      </h3>
                      <p className="gc-response-date">
                        {new Date(
                          response.created_at || ""
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {Array.isArray(response.quotes) &&
                    response.quotes.length > 0 && (
                      <div className="gc-quotes-section">
                        <p className="gc-quotes-label">Quotes:</p>
                        <ul className="gc-quotes-list">
                          {response.quotes.map((q) => (
                            <li key={q.quote_id}>
                              Line item #{q.line_item_id}:{" "}
                              <strong className="gc-quote-price">
                                ${q.price}
                              </strong>{" "}
                              ({q.availability})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {response.notes && (
                    <p className="gc-response-notes">
                      &ldquo;{response.notes}&rdquo;
                    </p>
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
