import React from "react";

interface QuoteCardProps {
  quote: {
    id: string;
    supplierName: string;
    supplierTier: "free" | "standard" | "premium";
    supplierVerified: boolean;
    price: number;
    leadTimeWeeks: number;
    carbonScore: number; // e.g., kgCO2e/unit
    productName: string;
  };
  onAward: (quoteId: string) => void;
  onViewDetails: (quoteId: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onAward,
  onViewDetails,
}) => {
  return (
    <div className="gc-card p-5 hover:transform hover:-translate-y-1 transition-transform duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            {quote.productName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-600 text-sm font-medium">
              {quote.supplierName}
            </span>
            {quote.supplierVerified && (
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified
              </span>
            )}
            {quote.supplierTier !== "free" && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  quote.supplierTier === "premium"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {quote.supplierTier}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-700">
            ${quote.price.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wide">
            Total Estimate
          </div>
        </div>
      </div>

      <div className="gc-divider my-4"></div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <div className="text-slate-500 font-semibold text-xs uppercase tracking-wide mb-1">
            Lead Time
          </div>
          <div className="font-bold text-slate-700">
            {quote.leadTimeWeeks} weeks
          </div>
        </div>
        <div>
          <div className="text-slate-500 font-semibold text-xs uppercase tracking-wide mb-1">
            Carbon Impact
          </div>
          <div className="font-bold text-slate-700 flex items-center gap-1">
            {quote.carbonScore}{" "}
            <span className="text-xs font-normal text-slate-500">kgCO2e</span>
            {quote.carbonScore < 50 && (
              <span className="ml-1 text-emerald-600" title="Low Carbon">
                🌿
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-auto">
        <button
          onClick={() => onViewDetails(quote.id)}
          className="gc-btn gc-btn-secondary flex-1 text-center justify-center text-sm"
        >
          View Details
        </button>
        <button
          onClick={() => onAward(quote.id)}
          className="gc-btn gc-btn-primary flex-1 text-center justify-center text-sm"
        >
          Award
        </button>
      </div>
    </div>
  );
};

export default QuoteCard;
