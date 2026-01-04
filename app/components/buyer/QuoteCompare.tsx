import React from "react";

interface Quote {
  id: string;
  supplierName: string;
  price: number;
  leadTimeWeeks: number;
  carbonScore: number;
}

interface QuoteCompareProps {
  quotes: Quote[];
  onAward: (quoteId: string) => void;
}

const QuoteCompare: React.FC<QuoteCompareProps> = ({ quotes, onAward }) => {
  if (quotes.length === 0) return null;

  // Find best values for highlighting
  const bestPrice = Math.min(...quotes.map((q) => q.price));
  const bestLeadTime = Math.min(...quotes.map((q) => q.leadTimeWeeks));
  const bestCarbon = Math.min(...quotes.map((q) => q.carbonScore));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider w-1/4">
              Criteria
            </th>
            {quotes.map((quote) => (
              <th key={quote.id} className="p-4 font-bold text-slate-800 w-1/4">
                {quote.supplierName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Price Row */}
          <tr className="border-b border-slate-100 hover:bg-white/40 transition-colors">
            <td className="p-4 font-bold text-slate-700 text-sm">Total Cost</td>
            {quotes.map((quote) => (
              <td key={`price-${quote.id}`} className="p-4 relative">
                <span
                  className={`font-bold ${quote.price === bestPrice ? "text-emerald-700 text-lg" : "text-slate-700"}`}
                >
                  ${quote.price.toLocaleString()}
                </span>
                {quote.price === bestPrice && (
                  <span className="absolute top-2 right-4 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                    Best
                  </span>
                )}
              </td>
            ))}
          </tr>

          {/* Lead Time Row */}
          <tr className="border-b border-slate-100 hover:bg-white/40 transition-colors">
            <td className="p-4 font-bold text-slate-700 text-sm">Lead Time</td>
            {quotes.map((quote) => (
              <td key={`time-${quote.id}`} className="p-4 relative">
                <span
                  className={`font-medium ${quote.leadTimeWeeks === bestLeadTime ? "text-emerald-700" : "text-slate-600"}`}
                >
                  {quote.leadTimeWeeks} weeks
                </span>
                {quote.leadTimeWeeks === bestLeadTime && (
                  <span className="absolute top-2 right-4 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                    Fastest
                  </span>
                )}
              </td>
            ))}
          </tr>

          {/* Carbon Score Row */}
          <tr className="border-b border-slate-100 hover:bg-white/40 transition-colors">
            <td className="p-4 font-bold text-slate-700 text-sm">
              Carbon Impact
            </td>
            {quotes.map((quote) => (
              <td key={`carbon-${quote.id}`} className="p-4 relative">
                <span
                  className={`font-medium ${quote.carbonScore === bestCarbon ? "text-emerald-700" : "text-slate-600"}`}
                >
                  {quote.carbonScore} kgCO2e
                </span>
                {quote.carbonScore === bestCarbon && (
                  <span className="absolute top-2 right-4 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                    Eco Pick
                  </span>
                )}
              </td>
            ))}
          </tr>

          {/* Action Row */}
          <tr>
            <td className="p-4"></td>
            {quotes.map((quote) => (
              <td key={`action-${quote.id}`} className="p-4">
                <button
                  onClick={() => onAward(quote.id)}
                  className="gc-btn gc-btn-primary w-full text-sm py-1.5"
                >
                  Select
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default QuoteCompare;
