// client/src/pages/TCOCalculatorPage.tsx
//
// 25-year Total Cost of Ownership calculator for standard vs. sustainable materials.
// Pure client-side arithmetic — no API calls. Shows payback period, net savings,
// and NOI impact for asset managers ("Lower OpEx increases property valuation").

import { useState, useMemo } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingDown,
  Building2,
  DollarSign,
  Clock,
  Leaf,
  ChevronRight,
  Info,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MaterialInputs {
  name: string;
  installCostPerUnit: string;
  quantity: string;
  annualMaintenanceCost: string;
  majorServiceCost: string;
  majorServiceIntervalYears: string;
  replacementLifespanYears: string;
  replacementCostPerUnit: string;
  annualEnergySavings: string; // vs the other material (positive = this one saves more)
}

interface YearRow {
  year: number;
  cumulativeA: number;
  cumulativeB: number;
  savings: number; // B savings vs A (positive = B is cheaper so far)
}

interface TCOResult {
  totalA: number;
  totalB: number;
  netSavings: number;          // positive = B is cheaper over 25 years
  paybackYears: number | null;
  annualSavings: number;       // average annual savings
  noiImpact: number;           // property value increase = annualSavings / capRate
  yearlyData: YearRow[];
  breakdownA: { label: string; value: number }[];
  breakdownB: { label: string; value: number }[];
}

// ── Math ─────────────────────────────────────────────────────────────────────

const HORIZON = 25;

function runTCO(matA: MaterialInputs, matB: MaterialInputs, capRate: number): TCOResult {
  const energyA = Number(matA.annualEnergySavings);
  const energyB = Number(matB.annualEnergySavings);

  // Remove the "other" energy offset — we want absolute costs for each
  // Re-run cleanly: annual savings reduce the material's running cost
  const aYearlyCosts: number[] = [];
  const bYearlyCosts: number[] = [];

  for (let y = 1; y <= HORIZON; y++) {
    const majorIntervalA = Math.max(1, Number(matA.majorServiceIntervalYears) || 10);
    const majorIntervalB = Math.max(1, Number(matB.majorServiceIntervalYears) || 10);
    const lifespanA = Math.max(1, Number(matA.replacementLifespanYears) || 25);
    const lifespanB = Math.max(1, Number(matB.replacementLifespanYears) || 25);
    const replCostA = Number(matA.replacementCostPerUnit) * Number(matA.quantity);
    const replCostB = Number(matB.replacementCostPerUnit) * Number(matB.quantity);

    let costA = Number(matA.annualMaintenanceCost);
    if (y % majorIntervalA === 0) costA += Number(matA.majorServiceCost);
    if (y > 0 && y % lifespanA === 0 && y < HORIZON) costA += replCostA;
    costA -= energyA;

    let costB = Number(matB.annualMaintenanceCost);
    if (y % majorIntervalB === 0) costB += Number(matB.majorServiceCost);
    if (y > 0 && y % lifespanB === 0 && y < HORIZON) costB += replCostB;
    costB -= energyB;

    aYearlyCosts.push(costA);
    bYearlyCosts.push(costB);
  }

  const installA = Number(matA.installCostPerUnit) * Number(matA.quantity);
  const installB = Number(matB.installCostPerUnit) * Number(matB.quantity);

  const yearlyData: YearRow[] = [];
  let cumA = installA;
  let cumB = installB;
  let paybackYear: number | null = null;
  const installDiff = installB - installA; // positive = B costs more upfront

  for (let y = 1; y <= HORIZON; y++) {
    cumA += aYearlyCosts[y - 1];
    cumB += bYearlyCosts[y - 1];
    const savings = cumA - cumB; // positive = B is saving money vs A
    if (paybackYear === null && savings >= installDiff && installDiff > 0) {
      paybackYear = y;
    }
    yearlyData.push({ year: y, cumulativeA: Math.round(cumA), cumulativeB: Math.round(cumB), savings: Math.round(savings) });
  }

  // If B is cheaper from day 1 (lower install + lower opex), payback is immediate
  if (paybackYear === null && installB <= installA) paybackYear = 0;

  const totalA = installA + aYearlyCosts.reduce((s, c) => s + c, 0);
  const totalB = installB + bYearlyCosts.reduce((s, c) => s + c, 0);
  const netSavings = totalA - totalB;
  const annualSavings = netSavings / HORIZON;
  const noiImpact = capRate > 0 ? annualSavings / (capRate / 100) : 0;

  const totalOpExA = aYearlyCosts.reduce((s, c) => s + c, 0);
  const totalOpExB = bYearlyCosts.reduce((s, c) => s + c, 0);

  const breakdownA = [
    { label: "Installation", value: installA },
    { label: "Annual Maintenance (25yr)", value: Number(matA.annualMaintenanceCost) * HORIZON },
    { label: "Major Service Cycles", value: totalOpExA - Number(matA.annualMaintenanceCost) * HORIZON + energyA * HORIZON },
    { label: "Energy Savings Reduction", value: -energyA * HORIZON },
  ].filter((r) => r.value !== 0);

  const breakdownB = [
    { label: "Installation", value: installB },
    { label: "Annual Maintenance (25yr)", value: Number(matB.annualMaintenanceCost) * HORIZON },
    { label: "Major Service Cycles", value: totalOpExB - Number(matB.annualMaintenanceCost) * HORIZON + energyB * HORIZON },
    { label: "Energy Savings Reduction", value: -energyB * HORIZON },
  ].filter((r) => r.value !== 0);

  return { totalA, totalB, netSavings, paybackYears: paybackYear, annualSavings, noiImpact, yearlyData, breakdownA, breakdownB };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const defaultA: MaterialInputs = {
  name: "Standard Concrete (Type I/II)",
  installCostPerUnit: "12",
  quantity: "5000",
  annualMaintenanceCost: "4000",
  majorServiceCost: "18000",
  majorServiceIntervalYears: "8",
  replacementLifespanYears: "30",
  replacementCostPerUnit: "14",
  annualEnergySavings: "0",
};

const defaultB: MaterialInputs = {
  name: "Supplementary Cementitious (SCM) Mix",
  installCostPerUnit: "14",
  quantity: "5000",
  annualMaintenanceCost: "2500",
  majorServiceCost: "10000",
  majorServiceIntervalYears: "12",
  replacementLifespanYears: "40",
  replacementCostPerUnit: "14",
  annualEnergySavings: "1200",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NumberField({
  label,
  hint,
  value,
  onChange,
  prefix,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={prefix ? "pl-6 h-8 text-sm" : "h-8 text-sm"}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

function MaterialForm({
  label,
  color,
  inputs,
  onChange,
}: {
  label: string;
  color: "slate" | "emerald";
  inputs: MaterialInputs;
  onChange: (updated: MaterialInputs) => void;
}) {
  const set = (key: keyof MaterialInputs) => (v: string) =>
    onChange({ ...inputs, [key]: v });

  const border = color === "emerald" ? "border-emerald-200" : "border-slate-200";
  const badge  = color === "emerald" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800";

  return (
    <Card className={`border-2 ${border}`}>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center gap-2">
          <Badge className={badge + " text-xs font-semibold"}>{label}</Badge>
        </div>
        <Input
          value={inputs.name}
          onChange={(e) => set("name")(e.target.value)}
          placeholder="Material name"
          className="mt-1 font-medium text-sm"
        />
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Install cost / unit" prefix="$" value={inputs.installCostPerUnit} onChange={set("installCostPerUnit")} hint="$/SF, $/LF, etc." />
          <NumberField label="Quantity" value={inputs.quantity} onChange={set("quantity")} hint="Units installed" />
        </div>
        <NumberField label="Annual maintenance cost" prefix="$" value={inputs.annualMaintenanceCost} onChange={set("annualMaintenanceCost")} hint="Routine inspections, cleaning, minor repairs" />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Major service cost" prefix="$" value={inputs.majorServiceCost} onChange={set("majorServiceCost")} hint="Per cycle (refinishing, resealing, etc.)" />
          <NumberField label="Service interval" value={inputs.majorServiceIntervalYears} onChange={set("majorServiceIntervalYears")} hint="Years between major service" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Replacement lifespan" value={inputs.replacementLifespanYears} onChange={set("replacementLifespanYears")} hint="Years before full replacement" />
          <NumberField label="Replacement cost / unit" prefix="$" value={inputs.replacementCostPerUnit} onChange={set("replacementCostPerUnit")} hint="If replaced within 25yr horizon" />
        </div>
        <NumberField
          label="Annual energy savings vs. baseline"
          prefix="$"
          value={inputs.annualEnergySavings}
          onChange={set("annualEnergySavings")}
          hint="HVAC, thermal performance, etc. (0 if none)"
        />
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TCOCalculatorPage() {
  const [matA, setMatA] = useState<MaterialInputs>(defaultA);
  const [matB, setMatB] = useState<MaterialInputs>(defaultB);
  const [capRate, setCapRate] = useState("5");
  const [calculated, setCalculated] = useState(false);

  const result = useMemo<TCOResult>(() => {
    return runTCO(matA, matB, Number(capRate) || 5);
  }, [matA, matB, capRate]);

  const bIsCheaper = result.netSavings > 0;

  const tooltipFormatter = (value: number, name: string) => [
    fmt(value),
    name === "cumulativeA" ? matA.name || "Material A" : matB.name || "Material B",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="25-Year TCO Calculator — Sustainable vs. Standard Materials | GreenChainz"
        description="Compare the 25-year lifecycle cost of sustainable and standard building materials. See payback period, net savings, and NOI impact for asset managers."
        canonicalPath="/tools/tco"
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-12 bg-gradient-to-b from-background to-secondary/20 border-b border-border">
          <div className="container max-w-3xl text-center space-y-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              TCO Calculator
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              25-Year Lifecycle Cost Comparison
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enter installation, maintenance, and replacement costs for two materials.
              See when the sustainable option pays back — and what lower OpEx means for property valuation.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container max-w-5xl">
            {/* Material Inputs */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <MaterialForm label="Material A — Standard" color="slate" inputs={matA} onChange={setMatA} />
              <MaterialForm label="Material B — Sustainable" color="emerald" inputs={matB} onChange={setMatB} />
            </div>

            {/* Cap Rate + Calculate */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10 p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 flex-1">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="space-y-0.5 flex-1 max-w-xs">
                  <Label className="text-xs font-medium">Cap Rate (for NOI → property value conversion)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      value={capRate}
                      onChange={(e) => setCapRate(e.target.value)}
                      className="h-8 w-20 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— typical commercial: 5–7%</span>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-40"
                onClick={() => setCalculated(true)}
              >
                Calculate TCO →
              </Button>
            </div>

            {/* Results */}
            {calculated && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className={`p-4 ${bIsCheaper ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">25-yr Net Savings</span>
                    </div>
                    <p className={`text-2xl font-bold ${bIsCheaper ? "text-emerald-700" : "text-amber-700"}`}>
                      {bIsCheaper ? "+" : "-"}{fmt(Math.abs(result.netSavings))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bIsCheaper ? `${matB.name || "Material B"} is cheaper` : `${matA.name || "Material A"} is cheaper`}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payback Period</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {result.paybackYears === null
                        ? "None"
                        : result.paybackYears === 0
                        ? "Immediate"
                        : `${result.paybackYears} yr`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.paybackYears === null
                        ? "Higher cost never recovered"
                        : result.paybackYears === 0
                        ? "B cheaper from day one"
                        : "Until cumulative savings break even"}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Annual Savings</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {fmt(result.annualSavings)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Per year over 25-yr horizon</p>
                  </Card>

                  <Card className={`p-4 ${result.noiImpact > 0 ? "border-primary/30 bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">NOI → Property Value</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {fmt(result.noiImpact)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      At {capRate}% cap rate — lower OpEx = higher asset value
                    </p>
                  </Card>
                </div>

                {/* NOI explanation */}
                {result.noiImpact > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Asset manager takeaway: </span>
                      Choosing {matB.name || "Material B"} reduces annual operating expenses by{" "}
                      <strong>{fmt(result.annualSavings)}/yr</strong>. At a {capRate}% cap rate, that lower OpEx
                      directly increases the property's net operating income and therefore its valuation by{" "}
                      <strong>{fmt(result.noiImpact)}</strong> — without changing the rent roll.
                    </p>
                  </div>
                )}

                {/* Cumulative Cost Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">25-Year Cumulative Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={result.yearlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 11 }}
                          label={{ value: "Year", position: "insideBottom", offset: -2, fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip formatter={tooltipFormatter} labelFormatter={(v) => `Year ${v}`} />
                        <Legend
                          formatter={(v) =>
                            v === "cumulativeA" ? matA.name || "Material A" : matB.name || "Material B"
                          }
                        />
                        {result.paybackYears !== null && result.paybackYears > 0 && (
                          <ReferenceLine
                            x={result.paybackYears}
                            stroke="hsl(var(--primary))"
                            strokeDasharray="4 2"
                            label={{ value: "Payback", position: "top", fontSize: 10, fill: "hsl(var(--primary))" }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="cumulativeA"
                          stroke="hsl(215 14% 34%)"
                          strokeWidth={2}
                          dot={false}
                          name="cumulativeA"
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulativeB"
                          stroke="hsl(142 76% 36%)"
                          strokeWidth={2.5}
                          dot={false}
                          name="cumulativeB"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: matA.name || "Material A", breakdown: result.breakdownA, total: result.totalA, color: "text-slate-700" },
                    { label: matB.name || "Material B", breakdown: result.breakdownB, total: result.totalB, color: "text-emerald-700" },
                  ].map(({ label, breakdown, total, color }) => (
                    <Card key={label} className="p-4">
                      <p className="text-sm font-semibold text-foreground mb-3">{label} — 25yr Total</p>
                      <div className="space-y-2">
                        {breakdown.map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className={row.value < 0 ? "text-emerald-600 font-medium" : "font-medium"}>
                              {row.value < 0 ? `−${fmt(Math.abs(row.value))}` : fmt(row.value)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Total 25-Year Cost</span>
                          <span className={color}>{fmt(total)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* CTA */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Leaf className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Ready to source {matB.name || "Material B"}?</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        GreenChainz routes your RFQ to verified suppliers with EPD-backed sustainability credentials — and generates the CSI submittal automatically.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href="/rfq/new">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
                        Submit RFQ <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Link href="/materials">
                      <Button variant="outline">Browse Materials</Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Pre-calc placeholder */}
            {!calculated && (
              <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
                <TrendingDown className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm">
                  Adjust the inputs above and click <strong>Calculate TCO</strong> to see the 25-year cost comparison.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
