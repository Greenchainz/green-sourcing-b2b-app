import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Scale, Trash2, ArrowLeft, Leaf, Shield, Award, DollarSign, Truck, Heart, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const METRICS = [
  { key: "carbonScore" as const, icon: Leaf, color: "text-green-600", label: "Carbon" },
  { key: "complianceScore" as const, icon: Shield, color: "text-blue-600", label: "Compliance" },
  { key: "certificationScore" as const, icon: Award, color: "text-purple-600", label: "Certification" },
  { key: "costScore" as const, icon: DollarSign, color: "text-yellow-600", label: "Cost" },
  { key: "supplyChainScore" as const, icon: Truck, color: "text-orange-600", label: "Supply Chain" },
  { key: "healthScore" as const, icon: Heart, color: "text-red-600", label: "Health" },
];

export default function Compare() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => { try { setIds(JSON.parse(localStorage.getItem("compare-ids") || "[]")); } catch { setIds([]); } }, []);

  const removeId = (id: number) => { const n = ids.filter((i) => i !== id); setIds(n); localStorage.setItem("compare-ids", JSON.stringify(n)); toast.success("Removed"); };
  const clearAll = () => { setIds([]); localStorage.removeItem("compare-ids"); toast.success("Cleared"); };

  const q1 = trpc.materials.getById.useQuery({ id: ids[0] || 0 }, { enabled: ids.length > 0 });
  const q2 = trpc.materials.getById.useQuery({ id: ids[1] || 0 }, { enabled: ids.length > 1 });
  const q3 = trpc.materials.getById.useQuery({ id: ids[2] || 0 }, { enabled: ids.length > 2 });
  const q4 = trpc.materials.getById.useQuery({ id: ids[3] || 0 }, { enabled: ids.length > 3 });
  const allMats = [q1.data, q2.data, q3.data, q4.data].filter(Boolean) as any[];
  const isLoading = [q1, q2, q3, q4].some((q) => q.isLoading && q.fetchStatus !== "idle");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4"><Link href="/materials" className="hover:text-foreground">Materials</Link><span>/</span><span className="text-foreground">Compare</span></div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-6 h-6" />Compare Materials</h1>
          {ids.length > 0 && <Button variant="outline" size="sm" onClick={clearAll}><Trash2 className="w-3.5 h-3.5 mr-1" />Clear All</Button>}
        </div>
        {ids.length === 0 ? (
          <Card><CardContent className="py-16 text-center"><Scale className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No materials to compare</h3><p className="text-sm text-muted-foreground mb-4">Add materials from the catalog using the Compare button on each card.</p><Link href="/materials"><Button><ArrowLeft className="w-4 h-4 mr-2" />Browse Materials</Button></Link></CardContent></Card>
        ) : isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading materials...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-3 w-40 text-xs text-muted-foreground font-medium">Property</th>
                {allMats.map((m) => (
                  <th key={m.id} className="p-3 text-center min-w-[200px]">
                    <div className="flex items-center justify-between"><Link href={`/materials/${m.id}`}><span className="text-sm font-semibold hover:text-primary cursor-pointer">{m.name}</span></Link><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => removeId(m.id)}><Trash2 className="w-3 h-3" /></Button></div>
                    <p className="text-xs text-muted-foreground">{m.manufacturerName}</p>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                <tr className="border-b border-border bg-muted/20">
                  <td className="p-3 font-semibold text-xs">CCPS Score</td>
                  {allMats.map((m) => { const c = m.ccpsByPersona?.default || m.ccpsByPersona?.[Object.keys(m.ccpsByPersona)[0]] || {}; return <td key={m.id} className="p-3 text-center"><span className={`text-2xl font-bold ${c.ccpsTotal >= 75 ? "text-green-600" : c.ccpsTotal >= 50 ? "text-yellow-600" : "text-red-600"}`}>{c.ccpsTotal || 0}</span></td>; })}
                </tr>
                {METRICS.map((metric) => (
                  <tr key={metric.key} className="border-b border-border/50">
                    <td className="p-3 text-xs flex items-center gap-2"><metric.icon className={`w-3.5 h-3.5 ${metric.color}`} />{metric.label}</td>
                    {allMats.map((m) => { const c = m.ccpsByPersona?.default || m.ccpsByPersona?.[Object.keys(m.ccpsByPersona)[0]] || {}; const v = c[metric.key] || 0; return <td key={m.id} className="p-3"><div className="flex items-center gap-2"><Progress value={v} className="flex-1 h-2" /><span className="text-xs font-medium w-6 text-right">{v}</span></div></td>; })}
                  </tr>
                ))}
                {[
                  { label: "Category", fn: (m: any) => m.category },
                  { label: "GWP", fn: (m: any) => m.gwpValue ? `${Number(m.gwpValue).toFixed(3)} ${m.gwpUnit || ""}` : "—" },
                  { label: "EC/1000 SF", fn: (m: any) => m.embodiedCarbonPer1000sf ? `${Number(m.embodiedCarbonPer1000sf).toFixed(0)} kg` : "—" },
                  { label: "Price", fn: (m: any) => m.pricePerUnit ? `$${Number(m.pricePerUnit).toFixed(2)}/${m.priceUnit || "unit"}` : "—" },
                  { label: "Lead Time", fn: (m: any) => m.leadTimeDays ? `${m.leadTimeDays} days` : "—" },
                  { label: "R-Value", fn: (m: any) => m.rValue ? Number(m.rValue).toFixed(2) : "—" },
                  { label: "Fire Rating", fn: (m: any) => m.fireRating || "—" },
                  { label: "Recycled %", fn: (m: any) => m.recycledContentPct ? `${Number(m.recycledContentPct).toFixed(0)}%` : "—" },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border/30"><td className="p-3 text-xs text-muted-foreground">{row.label}</td>{allMats.map((m) => <td key={m.id} className="p-3 text-xs text-center font-medium">{row.fn(m)}</td>)}</tr>
                ))}
                {["EPD", "HPD", "FSC", "C2C", "GREENGUARD", "Declare"].map((cert) => {
                  const field = `has${cert === "GREENGUARD" ? "Greenguard" : cert === "Declare" ? "Declare" : cert}`;
                  return (
                    <tr key={cert} className="border-b border-border/30"><td className="p-3 text-xs text-muted-foreground">{cert}</td>{allMats.map((m) => <td key={m.id} className="p-3 text-center">{(m as any)[field] ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />}</td>)}</tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
