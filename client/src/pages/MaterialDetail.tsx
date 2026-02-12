import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Shield, Award, DollarSign, Truck, Heart, ArrowLeft, ShoppingCart, Scale, ExternalLink, CheckCircle2, XCircle, ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import MaterialSwapCard from "@/components/MaterialSwapCard";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { PaywallGate } from "@/components/paywall/PaywallGate";

const SCORE_ROWS = [
  { key: "carbonScore" as const, icon: Leaf, color: "text-green-600", label: "Carbon" },
  { key: "complianceScore" as const, icon: Shield, color: "text-blue-600", label: "Compliance" },
  { key: "certificationScore" as const, icon: Award, color: "text-purple-600", label: "Certification" },
  { key: "costScore" as const, icon: DollarSign, color: "text-yellow-600", label: "Cost" },
  { key: "supplyChainScore" as const, icon: Truck, color: "text-orange-600", label: "Supply Chain" },
  { key: "healthScore" as const, icon: Heart, color: "text-red-600", label: "Health" },
];

export default function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: m, isLoading } = trpc.materials.getById.useQuery({ id }, { enabled: !!id });
  const { data: swaps, isLoading: swapsLoading } = trpc.materialSwaps.getSavedSwaps.useQuery({ materialId: id }, { enabled: !!id });
  const [swapAnalysisAttempted, setSwapAnalysisAttempted] = useState(false);

  const addToRfq = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("rfq-items") || "[]");
      if (existing.some((item: any) => item.materialId === id)) { toast.info("Already in RFQ cart"); return; }
      existing.push({ materialId: id, name: m?.name, manufacturerName: m?.manufacturerName, quantity: 1, quantityUnit: m?.priceUnit || "unit" });
      localStorage.setItem("rfq-items", JSON.stringify(existing));
      toast.success("Added to RFQ cart");
    } catch { toast.error("Failed to add"); }
  };

  if (isLoading) return (<div className="min-h-screen flex flex-col bg-background"><Header /><div className="container py-8"><Skeleton className="h-96" /></div></div>);
  if (!m) return (<div className="min-h-screen flex flex-col bg-background"><Header /><div className="container py-16 text-center"><h2 className="text-xl font-semibold mb-2">Material not found</h2><Link href="/materials"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Catalog</Button></Link></div></div>);

  const defaultCcps = m.ccpsByPersona?.default || m.ccpsByPersona?.[Object.keys(m.ccpsByPersona)[0]] || {};

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link href="/materials" className="hover:text-foreground">Materials</Link><span>/</span><span className="text-foreground">{m.name}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{m.category}</Badge>
                      {m.subcategory && <Badge variant="outline" className="text-xs">{m.subcategory}</Badge>}
                      {m.usManufactured ? <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">🇺🇸 US Made</Badge> : null}
                      {m.verified ? <Badge className="text-xs bg-green-600">Verified</Badge> : null}
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">{m.name}</h1>
                    {m.productName && <p className="text-sm text-muted-foreground mt-1">{m.productName}</p>}
                    <p className="text-sm text-muted-foreground mt-1">by <span className="font-medium text-foreground">{m.manufacturerName}</span></p>
                    {m.description && <p className="text-sm text-muted-foreground mt-3">{m.description}</p>}
                  </div>
                  <div className="flex flex-col items-center ml-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${defaultCcps.ccpsTotal >= 75 ? "border-green-500 bg-green-50" : defaultCcps.ccpsTotal >= 50 ? "border-yellow-500 bg-yellow-50" : "border-red-500 bg-red-50"}`}>
                      <span className="text-2xl font-bold">{defaultCcps.ccpsTotal || 0}</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">CCPS Score</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={addToRfq}><ShoppingCart className="w-4 h-4 mr-2" />Add to RFQ</Button>
                  {m.specSheetUrl && <a href={m.specSheetUrl} target="_blank" rel="noopener"><Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" />Spec Sheet</Button></a>}
                  {m.epdUrl && <a href={m.epdUrl} target="_blank" rel="noopener"><Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" />EPD</Button></a>}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="scores">
              <TabsList><TabsTrigger value="scores">CCPS Breakdown</TabsTrigger><TabsTrigger value="swaps"><Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />Sustainable Swaps</TabsTrigger><TabsTrigger value="specs">Specifications</TabsTrigger><TabsTrigger value="certs">Certifications</TabsTrigger><TabsTrigger value="alternatives">Alternatives</TabsTrigger></TabsList>
              <TabsContent value="swaps">
                <PaywallGate dimension="swap_analyses" mode="soft">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Sustainable Swap Recommendations
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Intelligent material swaps ranked by sustainability, performance, and cost. Good/Better/Best tiers help you make informed decisions.
                      </p>
                    </CardHeader>
                    <CardContent>
                    {swapsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-64" />
                        <Skeleton className="h-64" />
                      </div>
                    ) : swaps && swaps.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {swaps.map((swap: any) => (
                          <MaterialSwapCard
                            key={swap.swapId}
                            swap={{
                              id: swap.materialId,
                              name: swap.materialName,
                              manufacturer: null, // TODO: Join with manufacturers table
                              tier: swap.swapTier,
                              score: swap.swapScore,
                              confidence: `${swap.confidence}%`,
                              reason: swap.swapReason,
                              embodiedCarbon: swap.embodiedCarbonPer1000sf ? `${Number(swap.embodiedCarbonPer1000sf).toFixed(2)} kgCO₂e/1000SF` : "—",
                              price: swap.pricePerUnit ? `$${Number(swap.pricePerUnit).toFixed(2)}` : "—",
                              leadTime: "—", // TODO: Add leadTime to swap query
                              source: "saved",
                            }}
                            originalCarbon={Number(m?.embodiedCarbonPer1000sf) || 0}
                            originalPrice={Number(m?.pricePerUnit) || undefined}
                            onAddToRfq={(materialId) => {
                              try {
                                const existing = JSON.parse(localStorage.getItem("rfq-items") || "[]");
                                if (existing.some((item: any) => item.materialId === materialId)) {
                                  toast.info("Already in RFQ cart");
                                  return;
                                }
                                const swapMaterial = swaps.find((s: any) => s.materialId === materialId);
                                existing.push({
                                  materialId,
                                  name: swapMaterial?.materialName,
                                  manufacturerName: "Unknown", // TODO: Join with manufacturers
                                  quantity: 1,
                                  quantityUnit: "unit",
                                });
                                localStorage.setItem("rfq-items", JSON.stringify(existing));
                                toast.success("Added to RFQ cart");
                              } catch {
                                toast.error("Failed to add");
                              }
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">No swap recommendations available yet.</p>
                        <p className="text-xs text-muted-foreground">Our Material Intelligence system is analyzing this material. Check back soon!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </PaywallGate>
              </TabsContent>
              <TabsContent value="scores">
                <Card><CardHeader><CardTitle className="text-base">CCPS Score Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {SCORE_ROWS.map((row) => (<div key={row.key} className="flex items-center gap-3"><row.icon className={`w-4 h-4 ${row.color} shrink-0`} /><span className="text-sm font-medium w-28">{row.label}</span><Progress value={defaultCcps[row.key] || 0} className="flex-1 h-2.5" /><span className="text-sm font-bold w-8 text-right">{defaultCcps[row.key] || 0}</span></div>))}
                  </CardContent>
                </Card>
                {m.ccpsByPersona && Object.keys(m.ccpsByPersona).length > 1 && (
                  <Card className="mt-4"><CardHeader><CardTitle className="text-base">Score by Decision-Maker Persona</CardTitle></CardHeader>
                    <CardContent><div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(m.ccpsByPersona).map(([key, ccps]: [string, any]) => (
                        <div key={key} className="p-3 bg-muted/30 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                          <p className={`text-2xl font-bold ${ccps.ccpsTotal >= 75 ? "text-green-600" : ccps.ccpsTotal >= 50 ? "text-yellow-600" : "text-red-600"}`}>{ccps.ccpsTotal}</p>
                        </div>
                      ))}
                    </div></CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="specs">
                <Card><CardContent className="p-6"><div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "GWP", value: m.gwpValue ? `${Number(m.gwpValue).toFixed(4)} ${m.gwpUnit || "kgCO₂e"}` : "—" },
                    { label: "Embodied Carbon/1000 SF", value: m.embodiedCarbonPer1000sf ? `${Number(m.embodiedCarbonPer1000sf).toFixed(2)} kgCO₂e` : "—" },
                    { label: "R-Value", value: m.rValue ? Number(m.rValue).toFixed(2) : "—" },
                    { label: "Fire Rating", value: m.fireRating || "—" },
                    { label: "VOC Level", value: m.vocLevel || "—" },
                    { label: "Recycled Content", value: m.recycledContentPct ? `${Number(m.recycledContentPct).toFixed(0)}%` : "—" },
                    { label: "Lead Time", value: m.leadTimeDays ? `${m.leadTimeDays} days` : "—" },
                    { label: "Price", value: m.pricePerUnit ? `$${Number(m.pricePerUnit).toFixed(2)} / ${m.priceUnit || "unit"}` : "—" },
                    { label: "Warranty", value: m.warrantyYears ? `${m.warrantyYears} years` : "—" },
                    { label: "Data Source", value: m.dataSource || "—" },
                  ].map((spec) => (<div key={spec.label} className="py-2 border-b border-border/30"><p className="text-xs text-muted-foreground">{spec.label}</p><p className="text-sm font-semibold">{spec.value}</p></div>))}
                </div></CardContent></Card>
              </TabsContent>
              <TabsContent value="certs">
                <Card><CardContent className="p-6"><div className="space-y-3">
                  {[
                    { label: "EPD (Environmental Product Declaration)", active: !!m.hasEpd },
                    { label: "HPD (Health Product Declaration)", active: !!m.hasHpd },
                    { label: "FSC (Forest Stewardship Council)", active: !!m.hasFsc },
                    { label: "Cradle to Cradle (C2C)", active: !!m.hasC2c },
                    { label: "GREENGUARD", active: !!m.hasGreenguard },
                    { label: "Declare Label", active: !!m.hasDeclare },
                  ].map((cert) => (<div key={cert.label} className="flex items-center gap-3 py-2 border-b border-border/30">{cert.active ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-muted-foreground/30" />}<span className={`text-sm ${cert.active ? "font-medium" : "text-muted-foreground"}`}>{cert.label}</span></div>))}
                </div></CardContent></Card>
              </TabsContent>
              <TabsContent value="alternatives">
                <Card><CardHeader><CardTitle className="text-base">Alternative Materials (Same Category)</CardTitle></CardHeader>
                  <CardContent>
                    {m.alternatives && m.alternatives.length > 0 ? (
                      <div className="space-y-3">
                        {m.alternatives.map((alt: any) => (
                          <div key={alt.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                            <div className="flex-1"><Link href={`/materials/${alt.id}`}><p className="text-sm font-semibold hover:text-primary cursor-pointer">{alt.name}</p></Link><p className="text-xs text-muted-foreground">{alt.manufacturerName}</p></div>
                            <div className="flex items-center gap-4">
                              <div className="text-center"><p className="text-xs text-muted-foreground">CCPS</p><p className={`text-lg font-bold ${alt.ccps.ccpsTotal >= 75 ? "text-green-600" : alt.ccps.ccpsTotal >= 50 ? "text-yellow-600" : "text-red-600"}`}>{alt.ccps.ccpsTotal}</p></div>
                              <div className="text-center"><p className="text-xs text-muted-foreground">Carbon Δ</p><div className={`flex items-center gap-1 ${alt.carbonDelta.delta > 0 ? "text-green-600" : alt.carbonDelta.delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>{alt.carbonDelta.delta > 0 ? <ArrowDownRight className="w-3 h-3" /> : alt.carbonDelta.delta < 0 ? <ArrowUpRight className="w-3 h-3" /> : null}<span className="text-sm font-semibold">{alt.carbonDelta.deltaPct > 0 ? "+" : ""}{alt.carbonDelta.deltaPct}%</span></div></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">No alternatives found in this category.</p>}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">Manufacturer</CardTitle></CardHeader><CardContent><p className="text-base font-semibold">{m.manufacturerName}</p>{m.manufacturerWebsite && <a href={m.manufacturerWebsite} target="_blank" rel="noopener" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />Website</a>}{m.manufacturerPhone && <p className="text-xs text-muted-foreground mt-1">{m.manufacturerPhone}</p>}{m.manufacturerEmail && <p className="text-xs text-muted-foreground">{m.manufacturerEmail}</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader><CardContent className="space-y-2"><Button className="w-full" onClick={addToRfq}><ShoppingCart className="w-4 h-4 mr-2" />Request Quote (RFQ)</Button><Link href="/compare"><Button variant="outline" className="w-full"><Scale className="w-4 h-4 mr-2" />Compare Materials</Button></Link></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">EPD Information</CardTitle></CardHeader><CardContent className="text-xs space-y-1"><p><span className="text-muted-foreground">EPD Number:</span> {m.epdNumber || "—"}</p><p><span className="text-muted-foreground">Program Operator:</span> {m.epdProgramOperator || "—"}</p><p><span className="text-muted-foreground">Declared Unit:</span> {m.declaredUnit || "—"}</p></CardContent></Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
