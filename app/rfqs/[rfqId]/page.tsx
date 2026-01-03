'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
  availability: 'available' | 'partial' | 'unavailable';
  lead_time_days?: number | null;
}

interface RFQResponse {
  response_id: number;
  supplier_id: number;
  notes?: string | null;
  created_at: string;
  quotes: RFQResponseQuote[];
}

export default function RFQDetailPage() {
  const params = useParams();
  const rfqId = params.rfqId as string;
  const { user, token } = useAuth();

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [responses, setResponses] = useState<RFQResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBidForm, setShowBidForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bidForm, setBidForm] = useState({
    quotedPrice: '',
    notes: '',
  });

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        if (!token) throw new Error('Not authenticated. Please log in first.');
        const response = await fetch(`${BACKEND_URL}/api/v1/rfqs/${rfqId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch RFQ');
        setRfq(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    const fetchResponses = async () => {
      try {
        if (!token) return;
        const response = await fetch(`${BACKEND_URL}/api/v1/rfqs/${rfqId}/responses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return; // suppliers will get 403 here; that's fine
        const data = await response.json();
        setResponses(data.responses || []);
      } catch (err) {
        console.error('Failed to fetch responses:', err);
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
    setError('');

    try {
      if (!token) throw new Error('Not authenticated. Please log in first.');
      if (!rfq?.materials?.length) throw new Error('RFQ has no line items to quote.');
      const price = parseFloat(bidForm.quotedPrice);
      if (Number.isNaN(price)) throw new Error('Please enter a valid price.');

      // Backend expects per-line-item quotes.
      const quotes = rfq.materials.map((li) => ({
        rfq_line_item_id: li.id,
        price,
        availability: 'available' as const,
      }));

      const response = await fetch(`${BACKEND_URL}/api/v1/rfqs/${rfqId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quotes,
          notes: bidForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit bid');
      }

      // Suppliers won't see responses list via /responses (architect-only), so just close form.
      setShowBidForm(false);
      setBidForm({ quotedPrice: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!rfq) return <div className="p-8">RFQ not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{rfq.project_name}</h1>
              <p className="text-gray-600">
                Status: <span className="font-medium capitalize">{rfq.status}</span>
              </p>
            </div>
            <div className="text-right">
              {rfq.budget && (
                <p className="text-2xl font-bold text-green-600">
                  ${rfq.budget.toLocaleString()}
                </p>
              )}
              {rfq.deadline && (
                <p className="text-sm text-gray-600 mt-2">
                  Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {rfq.description && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{rfq.description}</p>
            </div>
          )}
        </div>

        {/* Materials */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Required Materials</h2>
          <div className="space-y-3">
            {rfq.materials.map((material, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{material.material_name}</p>
                  {material.specification && (
                    <p className="text-sm text-gray-600">{material.specification}</p>
                  )}
                </div>
                <p className="font-semibold">
                  {material.quantity} {material.unit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier Responses */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              Bids Received ({responses.length})
            </h2>
            {user && rfq.status === 'open' && (
              <button
                onClick={() => setShowBidForm(!showBidForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {showBidForm ? 'Cancel' : 'Submit Bid'}
              </button>
            )}
          </div>

          {/* Bid Form */}
          {showBidForm && user && (
            <form onSubmit={handleSubmitBid} className="p-4 bg-blue-50 rounded mb-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={bidForm.notes}
                    onChange={(e) =>
                      setBidForm({ ...bidForm, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Special conditions, certifications, etc."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? 'Submitting...' : 'Submit Bid'}
              </button>
            </form>
          )}

          {/* Responses List */}
          <div className="space-y-4">
            {responses.length === 0 ? (
              <p className="text-gray-600">No bids yet</p>
            ) : (
              responses.map((response) => (
                <div
                  key={response.response_id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold">
                        Supplier #{response.supplier_id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(response.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {Array.isArray(response.quotes) && response.quotes.length > 0 && (
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Quotes:</p>
                      <ul className="list-disc pl-5">
                        {response.quotes.map((q) => (
                          <li key={q.quote_id}>
                            Line item #{q.line_item_id}: ${q.price} ({q.availability})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {response.notes && <p className="text-sm text-gray-700 mt-2">{response.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
