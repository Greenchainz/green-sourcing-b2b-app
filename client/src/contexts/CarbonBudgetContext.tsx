/**
 * CarbonBudgetContext — Live LEED carbon budget tracker.
 *
 * Lets architects add materials to a "project tray" while browsing
 * MaterialSearch and see in real time how their running total compares
 * to EC3 industry baseline and what LEED MRc1 credits they're on track to earn.
 *
 * Usage:
 *   <CarbonBudgetProvider>
 *     …page content…
 *     <CarbonBudgetBar />
 *   </CarbonBudgetProvider>
 *
 * MaterialCard uses useOptionalCarbonBudget() so it degrades gracefully
 * on pages that don't wrap with the provider.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BudgetItem {
  id: number;
  name: string;
  category: string;
  gwpValue: number;       // kgCO₂e per declared unit
  gwpUnit: string;
  ec3Median: number | null; // EC3 industry average — used to compute LEED % reduction
}

interface CarbonBudgetCtx {
  items: BudgetItem[];
  /** Sum of all gwpValues for tracked materials. */
  totalCarbon: number;
  /** Sum of ec3Median values for tracked materials that have one. */
  totalBaseline: number;
  /**
   * Percentage that the tracked materials sit BELOW the industry baseline.
   * Positive = better than baseline. Negative = worse.
   * null when no tracked items have an EC3 median.
   */
  pctBelowBaseline: number | null;
  /** Estimated LEED v4.1 MRc1 points earned (0–5). */
  leedPoints: number;
  isTracking: (id: number) => boolean;
  /** Toggle a material in/out of the budget tray. */
  toggle: (item: BudgetItem) => void;
  removeItem: (id: number) => void;
  clearAll: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

export const CarbonBudgetContext = createContext<CarbonBudgetCtx | null>(null);

// ── LEED MRc1 point calculation ───────────────────────────────────────────────
// Based on LEED v4.1 Building Products Disclosure and Optimization — Environmental
// Product Declarations credit (Option 1: EPD).
// Reduction vs. industry average baseline:
//   ≥10%  → 1 pt
//   ≥20%  → 2 pts
//   ≥30%  → 3 pts
//   ≥40%  → 4 pts
//   ≥50%  → 5 pts

export function calcLeedPoints(pctBelowBaseline: number): number {
  if (pctBelowBaseline >= 50) return 5;
  if (pctBelowBaseline >= 40) return 4;
  if (pctBelowBaseline >= 30) return 3;
  if (pctBelowBaseline >= 20) return 2;
  if (pctBelowBaseline >= 10) return 1;
  return 0;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CarbonBudgetProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BudgetItem[]>([]);

  const toggle = useCallback((item: BudgetItem) => {
    setItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const isTracking = useCallback(
    (id: number) => items.some((i) => i.id === id),
    [items]
  );

  const { totalCarbon, totalBaseline, pctBelowBaseline, leedPoints } = useMemo(() => {
    const totalCarbon = items.reduce((sum, i) => sum + i.gwpValue, 0);
    const withBaseline = items.filter((i) => i.ec3Median !== null && i.ec3Median > 0);
    const totalBaseline = withBaseline.reduce((sum, i) => sum + (i.ec3Median ?? 0), 0);

    if (withBaseline.length === 0 || totalBaseline === 0) {
      return { totalCarbon, totalBaseline: 0, pctBelowBaseline: null, leedPoints: 0 };
    }

    const carbonFromTracked = withBaseline.reduce((sum, i) => sum + i.gwpValue, 0);
    const pctBelowBaseline = ((totalBaseline - carbonFromTracked) / totalBaseline) * 100;

    return {
      totalCarbon,
      totalBaseline,
      pctBelowBaseline,
      leedPoints: calcLeedPoints(pctBelowBaseline),
    };
  }, [items]);

  return (
    <CarbonBudgetContext.Provider
      value={{
        items,
        totalCarbon,
        totalBaseline,
        pctBelowBaseline,
        leedPoints,
        isTracking,
        toggle,
        removeItem,
        clearAll,
      }}
    >
      {children}
    </CarbonBudgetContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useCarbonBudget(): CarbonBudgetCtx {
  const ctx = useContext(CarbonBudgetContext);
  if (!ctx) throw new Error("useCarbonBudget must be used inside CarbonBudgetProvider");
  return ctx;
}

/**
 * Returns null when outside the provider — used by MaterialCard so it
 * can be rendered on any page without crashing.
 */
export function useOptionalCarbonBudget(): CarbonBudgetCtx | null {
  return useContext(CarbonBudgetContext);
}
