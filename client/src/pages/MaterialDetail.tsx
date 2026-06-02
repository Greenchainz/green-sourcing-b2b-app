import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Download,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
} from "lucide-react";
import MaterialSwapCard from "@/components/MaterialSwapCard";
import { EpdPanel } from "@/components/EpdPanel";
import { CcpsScoreCard } from "@/components/CcpsScoreCard";
import { ScoreRing } from "@/components/MaterialCreditScore/ScoreRing";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { PaywallGate } from "@/components/paywall/PaywallGate";
import { PriceTrendBadge } from "@/components/PriceTrendBadge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

export default function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: m, isLoading } = trpc.materials.getById.useQuery(
    { id },
    { enabled: !!id }
  );
  const { data: swaps, isLoading: swapsLoading } =
    trpc.materialSwaps.getSavedSwaps.useQuery(
      { materialId: id },
      { enabled: !!id }
    );

  // Live alternatives from findAlternatives — enabled once material data is loaded
  const { data: alternatives, isLoading: alternativesLoading } =
    trpc.materialSwap.findAlternatives.useQuery(
      {
        materialName: m?.name ?? "",
        category: m?.category ?? "",
        specs: {
          gwp: m?.gwpValue ? Number(m.gwpValue) : undefined,
          compressiveStrength: (m as any)?.compressiveStrength
            ? Number((m as any).compressiveStrength)
            : undefined,
          tensileStrength: (m as any)?.tensileStrength
            ? Number((m as any).tensileStrength)
            : undefined,
          fireRating: (m as any)?.fireRating ?? undefined,
          density: (m as any)?.density ? Number((m as any).density) : undefined,
        },
      },
      { enabled: !!m?.name && !!m?.category }
    );

  const [isSaved, setIsSaved] = useState(false);
  const [, navigate] = useLocation();

  // Initialise saved state from localStorage on mount / when id changes
  useEffect(() => {
    if (!id) return;
    const saved = JSON.parse(localStorage.getItem("gc_saved_materials") || "[]");
    setIsSaved(saved.includes(id));
  }, [id]);

  const requestQuote = () => {
    const urlParams = new URLSearchParams({
      materialId: String(id),
      category: m?.category ?? "",
      epdRequired: m?.hasEpd ? "true" : "false",
    });
    navigate(`/rfq/new?${urlParams.toString()}`);
  };

  // ── Requirement 4: Add to RFQ Cart ──────────────────────────────────────────
  const addToRfqCart = () => {
    const existing = JSON.parse(localStorage.getItem("rfq-items") || "[]");
    if (existing.some((item: any) => item.materialId === id)) {
      toast.info("Already in RFQ cart");
      return;
    }
    existing.push({
      materialId: id,
      name: m?.name,
      manufacturerName: m?.manufacturerName,
      quantity: 1,
      quantityUnit: "unit",
    });
    localStorage.setItem("rfq-items", JSON.stringify(existing));
    toast.success("Added to RFQ cart");
  };

  // ── Requirement 5: Save / unsave material ───────────────────────────────────
  const toggleSaved = () => {
    const saved = JSON.parse(localStorage.getItem("gc_saved_materials") || "[]");
    if (saved.includes(id)) {
      localStorage.setItem(
        "gc_saved_materials",
        JSON.stringify(saved.filter((x: number) => x !== id))
      );
      toast.success("Removed from saved");
      setIsSaved(false);
    } else {
      saved.push(id);
      localStorage.setItem("gc_saved_materials", JSON.stringify(saved));
      toast.success("Saved to your collection");
      setIsSaved(true);
    }
  };

  function isCalgreenCompliant(material: any) {
    return !!material?.meetsTitle24;
  }

  function downloadSpecSheet(material: any) {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text("GreenChainz Material Spec Sheet", 20, 20);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Generated: ${now}`, 20, 30);

    doc.setFontSize(14);
    doc.text(material.name ?? "Material", 20, 45);

    doc.setFontSize(10);
    const rows: [string, string][] = [
      ["Manufacturer", material.manufacturerName ?? "—"],
      ["Category", material.category ?? "—"],
      ["Subcategory", material.subcategory ?? "—"],
      [
        "Price",
        material.pricePerUnit
          ? `$${Number(material.pricePerUnit).toFixed(2)}/${material.priceUnit ?? "unit"}`
          : "—",
      ],
      ["Lead Time", material.leadTimeDays ? `${material.leadTimeDays} days` : "—"],
      ["GWP (kgCO₂e)", material.gwpValue != null ? String(material.gwpValue) : "—"],
      ["EPD Number", material.epdNumber ?? "—"],
      ["US Manufactured", material.usManufactured ? "Yes" : "No"],
      [
        "Certifications",
        [
          material.hasEpd && "EPD",
          material.hasHpd && "HPD",
          material.hasFsc && "FSC",
          material.hasC2c && "Cradle to Cradle",
          material.hasGreenguard && "GREENGUARD",
          material.hasDeclare && "Declare",
        ]
          .filter(Boolean)
          .join(", ") || "None",
      ],
      [
        "CALGreen Compliant",
        isCalgreenCompliant(material) ? "Yes — Title 24 Part 11 (2026)" : "No",
      ],
      ["EPD URL", material.epdUrl ?? "—"],
      ["Spec Sheet URL", material.specSheetUrl ?? "—"],
    ];

    let y = 58;
    for (const [label, value] of rows) {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 20, y);
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(String(value), 110);
      doc.text(lines, 80, y);
      y += 8 * lines.length;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "Data sourced via GreenChainz.com — Verified sustainable building materials platform.",
      20,
      280
    );

    const filenameBase = (material.name ?? "material").replace(/\s+/g, "_");
    doc.save(`${filenameBase}_GreenChainz_Spec.pdf`);
  }

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-8">
          <Skeleton className="h-96" />
        </div>
      </div>
    );

  if (!m)
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Material not found</h2>
          <Link href="/materials">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );

  const defaultCcps =
    m.ccpsByPersona?.default ||
    m.ccpsByPersona?.[Object.keys(m.ccpsByPersona)[0]] ||
    {};

  // Map findAlternatives results → MaterialSwapCard shape
  const liveSwapCards = (alternatives ?? []).slice(0, 6).map((alt) => {
    const pct = alt.gwpReductionPercent ?? 0;
    const tier: "good" | "better" | "best" =
      pct >= 30 ? "best" : pct >= 15 ? "better" : "good";
    const score = Math.min(100, Math.round(pct * 2));
    const confidence = Math.min(95, 65 + Math.round(pct / 2));
    const gwp = alt.specs?.gwp;
    return {
      id: alt.materialId,
      name: alt.materialName,
      manufacturer: alt.supplier ?? null,
      tier,
      score,
      confidence: `${confidence}%`,
      reason: `Reduces embodied carbon by ${pct.toFixed(1)}% versus this material in the same category.`,
      embodiedCarbon: gwp != null ? `${gwp.toFixed(4)} kgCO₂e` : "—",
      price: alt.pricePerUnit != null ? `$${alt.pricePerUnit.toFixed(2)}` : "—",
      leadTime: "—",
      source: "ec3",
    };
  });

  // ── Derived display values (safe helpers) ──────────────────────────────────
  const gwpUnit = m.gwpUnit || "kgCO₂e";
  const embodiedCarbon = m.embodiedCarbonPer1000sf
    ? `${Number(m.embodiedCarbonPer1000sf).toFixed(2)} kgCO₂e`
    : "—";

  // ── Carbon comparison chart data ───────────────────────────────────────────
  const gwpNum = m.gwpValue ? Number(m.gwpValue) : null;
  const medianNum = m.ec3IndustryMedian ? Number(m.ec3IndustryMedian) : null;
  const isBelowMedian = gwpNum !== null && medianNum !== null && gwpNum <= medianNum;
  const carbonPctDiff =
    gwpNum !== null && medianNum !== null && medianNum !== 0
      ? Math.abs(((gwpNum - medianNum) / medianNum) * 100).toFixed(1)
      : null;

  const carbonChartData =
    gwpNum !== null && medianNum !== null
      ? [
          { name: "This Material", value: gwpNum },
          { name: "Category Average", value: medianNum },
        ]
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link href="/materials" className="hover:text-foreground">
            Materials
          </Link>
          <span>/</span>
          <span className="text-foreground">{m.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main content column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Hero card ── */}
            <Card>
              <CardContent className="p-6">
                {/* Category + badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="secondary">{m.category}</Badge>
                  {m.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {m.subcategory}
                    </Badge>
                  )}
                  {m.usManufactured && (
                    <Badge
                      variant="outline"
                      className="text-xs border-blue-200 text-blue-700 bg-blue-50"
                    >
                      🇺🇸 US Made
                    </Badge>
                  )}
                  {m.verified && <Badge className="text-xs bg-green-600">Verified</Badge>}
                  {m.complianceGrade && (
                    <Badge className="text-xs font-bold bg-lime-600">
                      Grade {m.complianceGrade}
                    </Badge>
                  )}
                </div>

                {/* Name + score ring side-by-side */}
                <div className="flex items-start gap-5">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-foreground leading-tight">
                      {m.name}
                    </h1>
                    {m.productName && m.productName !== m.name && (
                      <p className="text-sm text-muted-foreground mt-0.5">{m.productName}</p>
                    )}
                    {m.manufacturerName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        by <span className="font-medium text-foreground">{m.manufacturerName}</span>
                      </p>
                    )}
                    {m.description && (
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">
                        {m.description}
                      </p>
                    )}

                    {/* EPD quick status */}
                    <div className="mt-3 flex items-center gap-1.5">
                      {m.hasEpd ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          EPD Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <ShieldAlert className="w-3 h-3" />
                          No EPD — get one to boost score
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score ring */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <ScoreRing score={defaultCcps.ccpsTotal || 0} size="md" showLabel />
                    <Link href={`/materials/${id}/score`}>
                      <button className="text-[10px] text-primary hover:underline">
                        Full score →
                      </button>
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

                  {/* ── Requirement 4: Add to RFQ Cart button ── */}
                  <Button
                    variant="outline"
                    className="gap-1.5 border-green-600 text-green-700 hover:bg-green-50"
                    onClick={addToRfqCart}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to RFQ Cart
                  </Button>

                  {/* ── Requirement 5: Save Material button ── */}
                  <Button
                    variant="outline"
                    className={`gap-1.5 ${
                      isSaved ? "border-amber-500 text-amber-600 hover:bg-amber-50" : ""
                    }`}
                    onClick={toggleSaved}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        Save Material
                      </>
                    )}
                  </Button>

                  {m.specSheetUrl && (
                    <a href={m.specSheetUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-1.5">
                        <FileText className="w-4 h-4" />
                        Spec Sheet
                      </Button>
                    </a>
                  )}
                  {m.epdUrl && (
                    <a href={m.epdUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-1.5">
                        <ExternalLink className="w-4 h-4" />
                        EPD Document
                      </Button>
                    </a>
                  )}

                  {/* Updated: client-side PDF download via jsPDF */}
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => downloadSpecSheet(m)}
                  >
                    <Download className="w-4 h-4" />
                    Download Spec Sheet
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Tabs ── */}
            <Tabs defaultValue="scores">
              <TabsList className="flex-wrap h-auto gap-0.5">
                <TabsTrigger value="scores">Credit Score</TabsTrigger>
                <TabsTrigger value="epd">EPD / Carbon</TabsTrigger>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                <TabsTrigger value="certs">Certifications</TabsTrigger>
                <TabsTrigger value="leed">LEED Context</TabsTrigger>
                <TabsTrigger value="swaps">
                  <Sparkles className="w-3.5 h-3.5 mr-1 inline" />
                  Swaps
                </TabsTrigger>
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
              </TabsList>

              {/* ── Swaps tab ── */}
              <TabsContent value="swaps">
                <PaywallGate dimension="swap_analysis" mode="soft">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Sustainable Swap Recommendations
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Intelligent material swaps ranked by sustainability, performance, and cost.
                        Good/Better/Best tiers help you make informed decisions.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {swapsLoading || alternativesLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Skeleton className="h-64" />
                          <Skeleton className="h-64" />
                        </div>
                      ) : liveSwapCards.length > 0 ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            {liveSwapCards.length} lower-carbon alternative
                            {liveSwapCards.length !== 1 ? "s" : ""} found in the same category,
                            ranked by GWP reduction.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {liveSwapCards.map((swap) => (
                              <MaterialSwapCard
                                key={swap.id}
                                swap={swap}
                                originalCarbon={Number(m?.gwpValue) || 0}
                                originalPrice={
                                  m?.pricePerUnit ? Number(m.pricePerUnit) : undefined
                                }
                                onAddToRfq={(materialId) => {
                                  try {
                                    const existing = JSON.parse(
                                      localStorage.getItem("rfq-items") || "[]"
                                    );
                                    if (existing.some((item: any) => item.materialId === materialId)) {
                                      toast.info("Already in RFQ cart");
                                      return;
                                    }
                                    existing.push({
                                      materialId,
                                      name: swap.name,
                                      manufacturerName: swap.manufacturer ?? "Unknown",
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
                        </>
                      ) : swaps && swaps.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {swaps.map((swap: any) => (
                            <MaterialSwapCard
                              key={swap.swapId}
                              swap={{
                                id: swap.materialId,
                                name: swap.materialName,
                                manufacturer: null,
                                tier: swap.swapTier,
                                score: swap.swapScore,
                                confidence: `${swap.confidence}%`,
                                reason: swap.swapReason,
                                embodiedCarbon: swap.embodiedCarbonPer1000sf
                                  ? `${Number(swap.embodiedCarbonPer1000sf).toFixed(
                                      2
                                    )} kgCO₂e/1000SF`
                                  : "—",
                                price: swap.pricePerUnit
                                  ? `$${Number(swap.pricePerUnit).toFixed(2)}`
                                  : "—",
                                leadTime: "—",
                                source: "saved",
                              }}
                              originalCarbon={Number(m?.embodiedCarbonPer1000sf) || 0}
                              originalPrice={Number(m?.pricePerUnit) || undefined}
                              onAddToRfq={(materialId) => {
                                try {
                                  const existing = JSON.parse(
                                    localStorage.getItem("rfq-items") || "[]"
                                  );
                                  if (existing.some((item: any) => item.materialId === materialId)) {
                                    toast.info("Already in RFQ cart");
                                    return;
                                  }
                                  const swapMaterial = swaps.find(
                                    (s: any) => s.materialId === materialId
                                  );
                                  existing.push({
                                    materialId,
                                    name: swapMaterial?.materialName,
                                    manufacturerName: "Unknown",
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
                          <p className="text-sm text-muted-foreground mb-2">
                            No lower-carbon alternatives found in this category yet.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            EC3 data syncs daily — check back as more EPDs are published.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </PaywallGate>
              </TabsContent>

              {/* ── EPD / Carbon tab ── */}
              <TabsContent value="epd">
                <div className="space-y-4">
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

                  {/* ── Requirement 3: Carbon Comparison bar chart ── */}
                  {carbonChartData && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-green-600" />
                          Carbon Comparison
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          GWP vs. category average ({gwpUnit} / {m.declaredUnit || "unit"})
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={carbonChartData}
                              layout="vertical"
                              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                            >
                              <XAxis
                                type="number"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v) => Number(v).toFixed(3)}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={110}
                                tick={{ fontSize: 11 }}
                              />
                              <Tooltip
                                formatter={(value: any) => [
                                  `${Number(value).toFixed(4)} ${gwpUnit}`,
                                  "GWP",
                                ]}
                              />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {carbonChartData.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      index === 0
                                        ? isBelowMedian
                                          ? "#16a34a" /* green-600 */
                                          : "#ef4444" /* red-500 */
                                        : "#9ca3af" /* gray-400 */
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {carbonPctDiff !== null && (
                          <p
                            className={`text-sm font-medium mt-3 text-center ${
                              isBelowMedian ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {carbonPctDiff}%{" "}
                            <span className="font-normal text-muted-foreground">
                              {isBelowMedian ? "below" : "above"} category average
                            </span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* ── Credit scores tab ── */}
              <TabsContent value="scores">
                <CcpsScoreCard ccpsByPersona={m.ccpsByPersona} />
              </TabsContent>

              {/* ── Specifications tab ── */}
              <TabsContent value="specs">
                <Card>
                  <CardContent className="p-6">
                    {/* ── Requirement 2: Proper specs table ── */}
                    <div className="overflow-x-auto rounded-lg border border-border/40">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border/40">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-1/2">
                              Property
                            </th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {
                              property: "Compressive Strength",
                              value: (m as any).compressiveStrength ?? "—",
                            },
                            { property: "Density", value: (m as any).density ?? "—" },
                            { property: "Fire Rating", value: m.fireRating || "—" },
                            {
                              property: "Thermal Conductivity",
                              value: (m as any).thermalConductivity ?? "—",
                            },
                            {
                              property: "R-Value",
                              value: m.rValue ? Number(m.rValue).toFixed(2) : "—",
                            },
                            {
                              property: "GWP",
                              value: m.gwpValue
                                ? `${Number(m.gwpValue).toFixed(4)} ${m.gwpUnit || "kgCO₂e"}`
                                : "—",
                            },
                            { property: "Embodied Carbon / 1000 SF", value: embodiedCarbon },
                            { property: "VOC Level", value: m.vocLevel || "—" },
                            {
                              property: "Recycled Content",
                              value: m.recycledContentPct
                                ? `${Number(m.recycledContentPct).toFixed(0)}%`
                                : "—",
                            },
                            {
                              property: "Lead Time",
                              value: m.leadTimeDays ? `${m.leadTimeDays} days` : "—",
                            },
                            {
                              property: "Price",
                              value: m.pricePerUnit
                                ? `$${Number(m.pricePerUnit).toFixed(2)} / ${m.priceUnit || "unit"}`
                                : "—",
                            },
                            {
                              property: "Warranty",
                              value: m.warrantyYears ? `${m.warrantyYears} years` : "—",
                            },
                            { property: "Data Source", value: m.dataSource || "—" },
                          ].map((row, idx) => (
                            <tr
                              key={row.property}
                              className={`border-b border-border/30 last:border-0 ${
                                idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                              }`}
                            >
                              <td className="px-4 py-2.5 text-xs text-muted-foreground font-medium">
                                {row.property}
                              </td>
                              <td className="px-4 py-2.5 text-sm font-semibold text-foreground">
                                {String(row.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/30">
                      <PriceTrendBadge category={m.category} mode="full" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Certifications tab ── */}
              <TabsContent value="certs">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {[
                        { label: "EPD (Environmental Product Declaration)", active: !!m.hasEpd },
                        { label: "HPD (Health Product Declaration)", active: !!m.hasHpd },
                        { label: "FSC (Forest Stewardship Council)", active: !!m.hasFsc },
                        { label: "Cradle to Cradle (C2C)", active: !!m.hasC2c },
                        { label: "GREENGUARD", active: !!m.hasGreenguard },
                        { label: "Declare Label", active: !!m.hasDeclare },
                      ].map((cert) => (
                        <div
                          key={cert.label}
                          className="flex items-center gap-3 py-2 border-b border-border/30"
                        >
                          {cert.active ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground/30" />
                          )}
                          <span
                            className={`text-sm ${
                              cert.active ? "font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {cert.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── LEED context tab ── */}
              <TabsContent value="leed">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">LEED Credit Context</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Credit areas this material commonly contributes to. Confirm applicability with
                      your LEED AP — project-specific factors apply.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {m.leedCredits ? (
                      <div className="space-y-3">
                        {m.leedCredits
                          .split(/[,\n]+/)
                          .map((credit) => credit.trim())
                          .filter(Boolean)
                          .map((credit) => (
                            <div
                              key={credit}
                              className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                              <p className="text-sm">{credit}</p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {m.hasEpd && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">
                                MR Credit: Building Product Disclosure &amp; Optimization (EPD)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Verified EPD contributes toward MR Credit 2 or 4 disclosure points.
                              </p>
                            </div>
                          </div>
                        )}
                        {m.usManufactured && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">
                                MR Credit: Sourcing of Raw Materials (regional)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                US manufactured materials may qualify for regional sourcing credits
                                depending on project location.
                              </p>
                            </div>
                          </div>
                        )}
                        {m.recycledContentPct && Number(m.recycledContentPct) > 0 && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">MR Credit: Recycled Content</p>
                              <p className="text-xs text-muted-foreground">
                                {Number(m.recycledContentPct).toFixed(0)}% recycled content —
                                contributes to LEED v4 MR sourcing credits.
                              </p>
                            </div>
                          </div>
                        )}
                        {m.hasHpd && (
                          <div className="flex items-start gap-3 py-2 border-b border-border/30">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">EQ Credit: Low-Emitting Materials</p>
                              <p className="text-xs text-muted-foreground">
                                HPD documentation supports LEED EQ credit ingredient transparency
                                requirements.
                              </p>
                            </div>
                          </div>
                        )}
                        {!m.hasEpd && !m.usManufactured && !m.recycledContentPct && !m.hasHpd && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No LEED credit data available. Add EPD, HPD, or recycled content to
                            unlock LEED contributions.
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

              {/* ── Alternatives tab ── */}
              <TabsContent value="alternatives">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Alternative Materials (Same Category)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {m.alternatives && m.alternatives.length > 0 ? (
                      <div className="space-y-3">
                        {m.alternatives.map((alt: any) => (
                          <div
                            key={alt.id}
                            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30"
                          >
                            <div className="flex-1">
                              <Link href={`/materials/${alt.id}`}>
                                <p className="text-sm font-semibold hover:text-primary cursor-pointer">
                                  {alt.name}
                                </p>
                              </Link>
                              <p className="text-xs text-muted-foreground">{alt.manufacturerName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">CCPS</p>
                                <p
                                  className={`text-lg font-bold ${
                                    alt.ccps.ccpsTotal >= 75
                                      ? "text-green-600"
                                      : alt.ccps.ccpsTotal >= 50
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {alt.ccps.ccpsTotal}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Carbon Δ</p>
                                <div
                                  className={`flex items-center gap-1 ${
                                    alt.carbonDelta.delta > 0
                                      ? "text-green-600"
                                      : alt.carbonDelta.delta < 0
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {alt.carbonDelta.delta > 0 ? (
                                    <ArrowDownRight className="w-3 h-3" />
                                  ) : alt.carbonDelta.delta < 0 ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : null}
                                  <span className="text-sm font-semibold">
                                    {alt.carbonDelta.deltaPct > 0 ? "+" : ""}
                                    {alt.carbonDelta.deltaPct}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No alternatives found in this category.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Manufacturer card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Manufacturer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base font-semibold">{m.manufacturerName ?? "—"}</p>
                {m.manufacturerWebsite && (
                  <a
                    href={m.manufacturerWebsite}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Website
                  </a>
                )}
                {m.manufacturerPhone && (
                  <p className="text-xs text-muted-foreground mt-1">{m.manufacturerPhone}</p>
                )}
                {m.manufacturerEmail && (
                  <p className="text-xs text-muted-foreground">{m.manufacturerEmail}</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full bg-green-700 hover:bg-green-800 text-white gap-1.5"
                  onClick={requestQuote}
                >
                  Request a Quote
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* ── Requirement 4: Add to RFQ Cart (sidebar) ── */}
                <Button
                  variant="outline"
                  className="w-full gap-1.5 border-green-600 text-green-700 hover:bg-green-50"
                  onClick={addToRfqCart}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to RFQ Cart
                </Button>

                {/* ── Requirement 5: Save Material (sidebar) ── */}
                <Button
                  variant="outline"
                  className={`w-full gap-1.5 ${
                    isSaved ? "border-amber-500 text-amber-600 hover:bg-amber-50" : ""
                  }`}
                  onClick={toggleSaved}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      Save Material
                    </>
                  )}
                </Button>

                <Link href={`/materials/${id}/score`}>
                  <Button variant="outline" className="w-full gap-1.5">
                    Full Credit Score
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* GWP quick stat */}
            {m.gwpValue && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">GWP</p>
                  <p className="text-2xl font-bold text-green-600 mt-0.5">
                    {Number(m.gwpValue).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.gwpUnit || "kgCO₂e"} / {m.declaredUnit || "unit"}
                  </p>
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
