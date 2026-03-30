import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, ExternalLink, CheckCircle2, XCircle, ArrowDownRight, ArrowUpRight, Sparkles, ArrowRight, ShieldCheck, ShieldAlert, BarChart3, Download } from "lucide-react";
import MaterialSwapCard from "@/components/MaterialSwapCard";
import { EpdPanel } from "@/components/EpdPanel";
import { CcpsScoreCard } from "@/components/CcpsScoreCard";
import { ScoreRing } from "@/components/MaterialCreditScore/ScoreRing";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { PaywallGate } from "@/components/paywall/PaywallGate";


export default function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: m, isLoading } = trpc.materials.getById.useQuery({ id }, { enabled: !!id });
  const { data: swaps, isLoading: swapsLoading } = trpc.materialSwaps.getSavedSwaps.useQuery({ materialId: id }, { enabled: !!id });
  const [swapAnalysisAttempted, setSwapAnalysisAttempted] = useState(false);
  const [, navigate] = useLocation();

  const requestQuote = () => {
    const params = new URLSearchParams({
      materialId: String(id),
      category: m?.category ?? "",
      epdRequired: m?.hasEpd ? "true" : "false",
    });
    navigate(`/rfq/new?${params.toString()}`);
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
            {/* ── Hero card ── */}
            <Card>
              <CardContent className="p-6">
                {/* Category + badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="secondary">{m.category}</Badge>
                  {m.subcategory && <Badge variant="outline" className="text-xs">{m.subcategory}</Badge>}
                  {m.usManufactured && <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">🇺🇸 US Made</Badge>}
                  {m.verified && <Badge className="text-xs bg-green-600">Verified</Badge>}
                  {m.complianceGrade && <Badge className="text-xs font-bold bg-lime-600">Grade {m.complianceGrade}</Badge>}
                </div>

                {/* Name + score ring side-by-side */}
                <div className="flex items-start gap-5">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-foreground leading-tight">{m.name}</h1>
                    {m.productName && m.productName !== m.name && (
                      <p className="text-sm text-muted-foreground mt-0.5">{m.productName}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      by <span className="font-medium text-foreground">{m.manufacturerName}</span>
                    </p>
                    {m.description && (
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">
                        {m.description}
                      </p>
                    )}

                    {/* EPD quick status */}
                    <div className="mt-3 flex items-center gap-1.5">
                      {m.hasEpd ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />EPD Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <ShieldAlert className="w-3 h-3" />No EPD — get one to boost score
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score ring */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <ScoreRing score={defaultCcps.ccpsTotal || 0} size="md" showLabel />
                    <Link href={`/materials/${id}/score`}>
                      <button className="text-[10px] text-primary hover:underline">Full score →</button>
                    </Link>
                  </div>
                </div>

                {/* Primary CTAs */}
                <div className="flex flex-wrap gap-2 mt-5">
                  <Button
                    className="bg-green-700 hover:bg-green-800 text-white gap-1.5"
                    onClick={requestQuote}
                  >
                    Request a Quote
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  {m.specSheetUrl && (
                    <a href={m.specSheetUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-1.5">
                        <FileText className="w-4 h-4" />Spec Sheet
                      </Button>
                    </a>
                  )}
                  {m.epdUrl && (
                    <a href={m.epdUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-1.5">
                        <ExternalLink className="w-4 h-4" />EPD Document
                      </Button>
                    </a>
                  )}
                  <a href={`/api/materials/${id}/spec-sheet`} download>
                    <Button variant="outline" className="gap-1.5">
                      <Download className="w-4 h-4" />Download Spec Sheet
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="scores">
              <TabsList className="flex-wrap h-auto gap-0.5">
                <TabsTrigger value="scores">Credit Score</TabsTrigger>
                <TabsTrigger value="epd">EPD / Carbon</TabsTrigger>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                <TabsTrigger value="certs">Certifications</TabsTrigger>
                <TabsTrigger value="leed">LEED Context</TabsTrigger>
                <TabsTrigger value="swaps"><Sparkles className="w-3.5 h-3.5 mr-1 inline" />Swaps</TabsTrigger>
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
              </TabsList>
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
              <TabsContent value="epd">
                <EpdPanel
                  materialId={id}
                  gwpValue={m.gwpValue}
                  gwpUnit={m.gwpUnit}
                  declaredUnit={m.declaredUnit}
                  epdNumber={m.epdNumber}
                  epdUrl={m.epdUrl}
                  epdExpiry={m.epdExpiry ? String(m.epdExpiry) : null}
                  epdProgramOperator={m.epdProgramOperator}
                  ec3IndustryMedian={m.ec3IndustryMedian}
                  ec3BestPractice={m.ec3BestPractice}
                  ec3ConservativeEstimate={m.ec3ConservativeEstimate}
                  hasEpd={m.hasEpd}
                />
              </TabsContent>
              <TabsContent value="scores">
                <CcpsScoreCard ccpsByPersona={m.ccpsByPersona} />
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
              {/* ── LEED context tab ── */}
              <TabsContent value="leed">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">LEED Credit Context</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Credit areas this material commonly contributes to. Confirm applicability
                      with your LEED AP — project-specific factors apply.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {m.leedCredits ? (
                      <div className="space-y-3">
                        {/* leedCredits is a text field; render as line-separated entries */}
                        {m.leedCredits.split(/[,\n]+/).map((credit) => credit.trim()).filter(Boolean).map((credit) => (
                          <div key={credit} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <p className="text-sm">{credit}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Infer from cert/EPD data */}
                        {m.hasEpd && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">MR Credit: Building Product Disclosure & Optimization (EPD)</p>
                              <p className="text-xs text-muted-foreground">Verified EPD contributes toward MR Credit 2 or 4 disclosure points.</p>
                            </div>
                          </div>
                        )}
                        {m.usManufactured && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">MR Credit: Sourcing of Raw Materials (regional)</p>
                              <p className="text-xs text-muted-foreground">US manufactured materials may qualify for regional sourcing credits depending on project location.</p>
                            </div>
                          </div>
                        )}
                        {m.recycledContentPct && Number(m.recycledContentPct) > 0 && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">MR Credit: Recycled Content</p>
                              <p className="text-xs text-muted-foreground">{Number(m.recycledContentPct).toFixed(0)}% recycled content — contributes to LEED v4 MR sourcing credits.</p>
                            </div>
                          </div>
                        )}
                        {m.hasHpd && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">EQ Credit: Low-Emitting Materials</p>
                              <p className="text-xs text-muted-foreground">HPD documentation supports LEED EQ credit ingredient transparency requirements.</p>
                            </div>
                          </div>
                        )}
                        {!m.hasEpd && !m.usManufactured && !m.recycledContentPct && !m.hasHpd && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No LEED credit data available. Add EPD, HPD, or recycled content to unlock LEED contributions.
                          </p>
                        )}
                      </div>
                    )}
                    {m.meetsTitle24 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                          ✓ Meets Title 24 energy efficiency requirements
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
            <Card>
              <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full bg-green-700 hover:bg-green-800 text-white gap-1.5"
                  onClick={requestQuote}
                >
                  Request a Quote
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Link href={`/materials/${id}/score`}>
                  <Button variant="outline" className="w-full gap-1.5">
                    Full Credit Score
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {m.gwpValue && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">GWP</p>
                  <p className="text-2xl font-bold text-green-600 mt-0.5">{Number(m.gwpValue).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{m.gwpUnit || "kgCO₂e"} / {m.declaredUnit || "unit"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
