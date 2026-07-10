// client/src/components/SupplierROICalculator.tsx
//
// Shared supplier ROI calculator. Used on both the Pricing page and the
// /for-suppliers landing page so the math stays identical in one place.

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SupplierROICalculator() {
  const [plan, setPlan] = useState<'standard' | 'premium'>('standard');
  const [avgOrder, setAvgOrder] = useState('50000');
  const [monthlyRfqs, setMonthlyRfqs] = useState('8');
  const [convRate, setConvRate] = useState('12');

  const annualSub = plan === 'standard' ? 99 * 12 : 299 * 12;
  const txFee = 3;

  const result = useMemo(() => {
    const order = Number(avgOrder) || 0;
    const rfqs  = Number(monthlyRfqs) || 0;
    const conv  = (Number(convRate) || 0) / 100;
    const monthlyWins = rfqs * conv;
    const annualWins  = monthlyWins * 12;
    const annualRev   = annualWins * order;
    const annualTxFees = annualRev * (txFee / 100);
    const totalCost    = annualSub + annualTxFees;
    const roi          = totalCost > 0 ? annualRev / totalCost : 0;
    return { annualWins, annualRev, annualTxFees, totalCost, roi };
  }, [avgOrder, monthlyRfqs, convRate, annualSub]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Supplier ROI Calculator</p>
        <div className="ml-auto flex gap-1">
          {(['standard', 'premium'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={cn(
                'text-[11px] font-medium px-2.5 py-1 rounded border transition-colors capitalize',
                plan === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {p === 'standard' ? 'Standard $99/mo' : 'Premium $299/mo'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Avg order size ($)</Label>
          <Input type="number" value={avgOrder} onChange={e => setAvgOrder(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">RFQs / month</Label>
          <Input type="number" value={monthlyRfqs} onChange={e => setMonthlyRfqs(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Conversion rate (%)</Label>
          <Input type="number" value={convRate} onChange={e => setConvRate(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {[
          { label: 'Annual orders won', value: result.annualWins.toFixed(1) },
          { label: 'Annual revenue', value: fmt(result.annualRev) },
          { label: 'Total platform cost', value: fmt(result.totalCost) },
          { label: 'Expected ROI', value: `${result.roi.toFixed(0)}x`, highlight: true },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-lg p-3 text-center ${highlight ? 'bg-primary text-primary-foreground' : 'bg-background border border-border'}`}>
            <p className={`text-lg font-bold ${highlight ? '' : 'text-foreground'}`}>{value}</p>
            <p className={`text-[10px] mt-0.5 ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Based on {convRate}% conversion of {monthlyRfqs} monthly inbound RFQs at ${Number(avgOrder).toLocaleString()} avg order.
        Platform cost = ${annualSub.toLocaleString()}/yr subscription + {txFee}% transaction fee on won orders.
        Industry avg conversion for verified B2B suppliers: 10–15%.
      </p>
    </div>
  );
}

export default SupplierROICalculator;
