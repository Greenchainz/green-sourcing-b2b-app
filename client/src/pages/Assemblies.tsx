import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Leaf, ArrowRight, Building2 } from "lucide-react";
import { Link } from "wouter";

const TIER_COLORS: Record<string, string> = { good: "bg-yellow-100 text-yellow-800 border-yellow-300", better: "bg-blue-100 text-blue-800 border-blue-300", best: "bg-green-100 text-green-800 border-green-300" };
const TIER_LABELS: Record<string, string> = { good: "Good", better: "Better", best: "Best" };

export default function Assemblies() {
  const [typeFilter, setTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const { data: assemblies, isLoading } = trpc.assemblies.list.useQuery({ assemblyType: typeFilter || undefined, tier: (tierFilter as "good"|"better"|"best") || undefined });
  const assemblyTypes = Array.from(new Set(assemblies?.map((a) => a.assemblyType) || []));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building2 className="w-6 h-6" />Assembly Systems</h1><p className="text-sm text-muted-foreground">Pre-configured building assemblies with embedded carbon calculations per 1,000 SF</p></div>
          </div>
          <div className="mt-4 flex gap-3">
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Types</SelectItem>{assemblyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={tierFilter || "all"} onValueChange={(v) => setTierFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36 text-xs"><SelectValue placeholder="All Tiers" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Tiers</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="better">Better</SelectItem><SelectItem value="best">Best</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </section>
      <div className="container py-6 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}</div>
        ) : assemblies && assemblies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assemblies.map((assembly) => (
              <Card key={assembly.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{assembly.assemblyType}</Badge>
                        <Badge className={`text-[10px] ${TIER_COLORS[assembly.sustainabilityTier || "good"]}`}>{TIER_LABELS[assembly.sustainabilityTier || "good"]}</Badge>
                      </div>
                      <CardTitle className="text-sm leading-tight">{assembly.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{assembly.code}</p>
                    </div>
                    <Layers className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assembly.description && <p className="text-xs text-muted-foreground line-clamp-2">{assembly.description}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-green-50 rounded-lg"><p className="text-[9px] text-green-700">Embodied Carbon</p><p className="text-sm font-bold text-green-800">{assembly.totalGwpPer1000Sqft ? `${Number(assembly.totalGwpPer1000Sqft).toLocaleString()} kg` : "—"}</p><p className="text-[9px] text-green-600">CO₂e / 1000 SF</p></div>
                    <div className="p-2 bg-blue-50 rounded-lg"><p className="text-[9px] text-blue-700">R-Value</p><p className="text-sm font-bold text-blue-800">{assembly.totalRValue ? `R-${Number(assembly.totalRValue).toFixed(1)}` : "—"}</p><p className="text-[9px] text-blue-600">Thermal</p></div>
                  </div>
                  {assembly.estimatedCostPer1000Sqft && <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Est. Cost / 1000 SF</span><span className="font-semibold">${Number(assembly.estimatedCostPer1000Sqft).toLocaleString()}</span></div>}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Leaf className="w-3 h-3 text-green-500" /><span>Assembly</span></div>
                    <Link href={`/assemblies/${assembly.id}`}><Button variant="ghost" size="sm" className="text-xs h-7">View Details <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16"><Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No assemblies found</h3><p className="text-sm text-muted-foreground">Try adjusting your filters.</p></div>
        )}
      </div>
      <Footer />
    </div>
  );
}
