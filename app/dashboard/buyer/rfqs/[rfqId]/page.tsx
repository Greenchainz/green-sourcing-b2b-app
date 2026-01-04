"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QuoteCard from "../../../../components/buyer/QuoteCard";
import QuoteCompare from "../../../../components/buyer/QuoteCompare";

// Mock Data
const MOCK_QUOTES = [
  {
    id: "Q-101",
    supplierName: "EcoSteel Corp",
    supplierTier: "premium",
    supplierVerified: true,
    price: 45000,
    leadTimeWeeks: 4,
    carbonScore: 120,
    productName: "Recycled Steel Beams (Type A)",
  },
  {
    id: "Q-102",
    supplierName: "BuildGreen Supplies",
    supplierTier: "standard",
    supplierVerified: true,
    price: 42500,
    leadTimeWeeks: 6,
    carbonScore: 140,
    productName: "Standard Steel Beams",
  },
  {
    id: "Q-103",
    supplierName: "Generic Materials Inc",
    supplierTier: "free",
    supplierVerified: false,
    price: 41000,
    leadTimeWeeks: 8,
    carbonScore: 180,
    productName: "Steel Beams Basic",
  },
] as const;

export default function RFQDetailPage() {
  const params = useParams();
  const rfqId = params.rfqId;

  const handleAward = (quoteId: string) => {
    alert(`Awarding quote ${quoteId} (Demo Action)`);
  };

  const handleViewDetails = (quoteId: string) => {
    console.log(`View detail ${quoteId}`);
  };

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Breadcrumb / Back */}
        <Link
          href="/dashboard/buyer/rfqs"
          className="inline-flex items-center text-slate-500 hover:text-emerald-600 mb-6 text-sm font-medium transition-colors"
        >
          &larr; Back to RFQs
        </Link>

        {/* Header */}
        <div className="gc-card p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Recycled Steel Beams for Office Complex
              </h1>
              <div className="flex gap-3 text-sm text-slate-500">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {rfqId}
                </span>
                <span>•</span>
                <span>Created Jan 01, 2025</span>
                <span>•</span>
                <span className="text-emerald-600 font-bold">
                  Open for Bidding
                </span>
              </div>
            </div>
            <button className="gc-btn gc-btn-secondary text-sm">
              Download Specs
            </button>
          </div>
          <div className="gc-divider my-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                Quantity
              </div>
              <div className="font-bold text-slate-800">50 Tons</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                Delivery Loc
              </div>
              <div className="font-bold text-slate-800">New York, NY</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                Required By
              </div>
              <div className="font-bold text-slate-800">Mar 01, 2025</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                Budget
              </div>
              <div className="font-bold text-slate-800">$40k - $50k</div>
            </div>
          </div>
        </div>

        {/* Analysis / Compare Section */}
        <div className="mb-10 animate-fade-in-up">
          <h2 className="gc-section-title mb-4">Quote Comparison</h2>
          {/* Cast mock data to match component props loosely for demo */}
          <QuoteCompare quotes={MOCK_QUOTES as any} onAward={handleAward} />
        </div>

        {/* Detailed Quote Cards */}
        <div>
          <h2 className="gc-section-title mb-4">
            Received Quotes ({MOCK_QUOTES.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_QUOTES.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote as any}
                onAward={handleAward}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
