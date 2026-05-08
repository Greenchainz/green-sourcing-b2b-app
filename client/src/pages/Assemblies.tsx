import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Leaf, ArrowRight, Building2, ArrowLeft, Plus, Save, Trash2, Calculator, Flame, Package, LogIn, FileSpreadsheet, Search, SlidersHorizontal, X, Volume2, Wind, ShieldCheck, Zap, Ruler } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getLoginUrl } from "@/const";
import { Switch } from "@/components/ui/switch";
import type { AppRouter } from "../../../server/routers";

const TIER_COLORS: Record<string, string> = {
  good: "bg-yellow-100 text-yellow-800 border-yellow-300",
  better: "bg-blue-100 text-blue-800 border-blue-300",
  best: "bg-green-100 text-green-800 border-green-300",
};
const TIER_LABELS: Record<string, string> = { good: "Good", better: "Better", best: "Best" };

type AssemblyTier = "good" | "better" | "best";
type RouterOutput = inferRouterOutputs<AppRouter>;
type CatalogMaterial = RouterOutput["materials"]["list"]["items"][number];

type MaterialPickerFilters = {
  search: string;
  manufacturer: string;
  category: string;
  categorySearch: string;
  hasEpd: boolean;
  usManufactured: boolean;
  fireRatedOnly: boolean;
  maxPrice: string;
  maxLeadTime: string;
};

const CSI_DIVISIONS = [
  { code: "03", label: "Concrete", keyword: "concrete" },
  { code: "04", label: "Masonry", keyword: "mason" },
  { code: "05", label: "Metals", keyword: "steel" },
  { code: "06", label: "Wood", keyword: "wood" },
  { code: "07", label: "Insulation", keyword: "insul" },
  { code: "07", label: "Roofing", keyword: "roofing" },
  { code: "08", label: "Glazing", keyword: "glaz" },
  { code: "09", label: "Flooring", keyword: "floor" },
  { code: "09", label: "Drywall", keyword: "drywall" },
] as const;

const DEFAULT_MATERIAL_PICKER_FILTERS: MaterialPickerFilters = {
  search: "",
  manufacturer: "",
  category: "",
  categorySearch: "",
  hasEpd: false,
  usManufactured: false,
  fireRatedOnly: false,
  maxPrice: "",
  maxLeadTime: "",
};

type LayerDraft = {
  layerOrder: number;
  layerName: string;
  thickness: string;
  materialId: number | null;
  materialName: string;
  notes: string;
  gwpContribution: string;
  materialRValue: number;
  materialEmbodiedCarbonPer1000sf: number;
  materialPricePerUnit: number;
  materialPriceUnit: string;
  materialFireRating: string;
};

function parseNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMetric(value: number, digits = 2) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function materialDisplayName(material: Pick<CatalogMaterial, "productName" | "name">) {
  return material.productName || material.name || "Unnamed material";
}

function applyMaterialToLayer(layer: LayerDraft, material: CatalogMaterial | null): LayerDraft {
  if (!material) {
    return {
      ...layer,
      materialId: null,
      materialName: "Manual layer",
      materialRValue: 0,
      materialEmbodiedCarbonPer1000sf: 0,
      materialPricePerUnit: 0,
      materialPriceUnit: "unit",
      materialFireRating: "",
      gwpContribution: "",
    };
  }

  return {
    ...layer,
    materialId: material.id,
    materialName: materialDisplayName(material),
    materialRValue: parseNumber(material.rValue),
    materialEmbodiedCarbonPer1000sf: parseNumber(material.embodiedCarbonPer1000sf),
    materialPricePerUnit: parseNumber(material.pricePerUnit),
    materialPriceUnit: material.priceUnit || "unit",
    materialFireRating: material.fireRating || "",
    gwpContribution:
      layer.gwpContribution.trim() && Number(layer.gwpContribution) !== parseNumber(layer.materialEmbodiedCarbonPer1000sf)
        ? layer.gwpContribution
        : material.embodiedCarbonPer1000sf !== null && material.embodiedCarbonPer1000sf !== undefined
          ? String(material.embodiedCarbonPer1000sf)
          : "",
  };
}

function toLayerDraft(component: any, index: number): LayerDraft {
  return {
    layerOrder: component.component.layerOrder ?? index + 1,
    layerName: component.component.layerName ?? `Layer ${index + 1}`,
    thickness: component.component.thickness ?? "",
    materialId: component.component.materialId ?? null,
    materialName: component.materialProductName || component.materialName || "Unlinked material",
    notes: component.component.notes ?? "",
    gwpContribution:
      component.component.gwpContribution !== null && component.component.gwpContribution !== undefined
        ? String(component.component.gwpContribution)
        : component.materialEmbodiedCarbonPer1000sf !== null && component.materialEmbodiedCarbonPer1000sf !== undefined
          ? String(component.materialEmbodiedCarbonPer1000sf)
          : "",
    materialRValue: parseNumber(component.materialRValue),
    materialEmbodiedCarbonPer1000sf: parseNumber(component.materialEmbodiedCarbonPer1000sf),
    materialPricePerUnit: parseNumber(component.materialPricePerUnit),
    materialPriceUnit: component.materialPriceUnit || "unit",
    materialFireRating: component.materialFireRating || "",
  };
}

function AssemblyListPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const { data: assemblies, isLoading } = trpc.assemblies.list.useQuery({
    assemblyType: typeFilter || undefined,
    tier: (tierFilter as AssemblyTier) || undefined,
  });
  const assemblyTypes = Array.from(new Set(assemblies?.map((a) => a.assemblyType).filter((t): t is string => !!t && t.trim() !== "") || []));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6" />Assembly Systems
              </h1>
              <p className="text-sm text-muted-foreground">Pre-configured building assemblies with embedded carbon calculations per 1,000 SF</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 flex-wrap">
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assemblyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tierFilter || "all"} onValueChange={(v) => setTierFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36 text-xs"><SelectValue placeholder="All Tiers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="better">Better</SelectItem>
                <SelectItem value="best">Best</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
      <div className="container py-6 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
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
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-[9px] text-green-700">Embodied Carbon</p>
                      <p className="text-sm font-bold text-green-800">{assembly.totalGwpPer1000Sqft ? `${Number(assembly.totalGwpPer1000Sqft).toLocaleString()} kg` : "—"}</p>
                      <p className="text-[9px] text-green-600">CO₂e / 1000 SF</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-[9px] text-blue-700">R-Value</p>
                      <p className="text-sm font-bold text-blue-800">{assembly.totalRValue ? `R-${Number(assembly.totalRValue).toFixed(1)}` : "—"}</p>
                      <p className="text-[9px] text-blue-600">Thermal</p>
                    </div>
                  </div>
                  {assembly.estimatedCostPer1000Sqft && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Est. Cost / 1000 SF</span>
                      <span className="font-semibold">${Number(assembly.estimatedCostPer1000Sqft).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Leaf className="w-3 h-3 text-green-500" /><span>Assembly</span></div>
                    <Link href={`/assemblies/${assembly.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs h-7">View Details <ArrowRight className="w-3 h-3 ml-1" /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assemblies found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function AssemblyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [materialFilters, setMaterialFilters] = useState<MaterialPickerFilters>(DEFAULT_MATERIAL_PICKER_FILTERS);
  const { data: assembly, isLoading } = trpc.assemblies.getById.useQuery({ id }, { enabled: !!id });
  const { data: materialResults, isLoading: materialsLoading } = trpc.materials.list.useQuery({
    category: materialFilters.category || undefined,
    categorySearch: materialFilters.categorySearch || undefined,
    hasEpd: materialFilters.hasEpd || undefined,
    usManufactured: materialFilters.usManufactured || undefined,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const { data: rawCategories } = trpc.materials.categories.useQuery();

  const [name, setName] = useState("");
  const materialOptions = materialResults?.items || [];
  const categories = rawCategories ?? [];
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [fireRating, setFireRating] = useState("");
  const [tier, setTier] = useState<AssemblyTier>("good");
  const [layers, setLayers] = useState<LayerDraft[]>([]);

  useEffect(() => {
    if (!assembly) return;
    setName(assembly.name || "");
    setCode(assembly.code || "");
    setDescription(assembly.description || "");
    setFireRating(assembly.fireRating || "");
    setTier((assembly.sustainabilityTier as AssemblyTier) || "good");
    setLayers((assembly.components || []).map((component: any, index: number) => toLayerDraft(component, index)));
  }, [assembly]);

  const updateMaterialFilters = (patch: Partial<MaterialPickerFilters>) => {
    setMaterialFilters((current) => ({ ...current, ...patch }));
  };

  const filteredMaterialOptions = useMemo(() => {
    const searchNeedle = materialFilters.search.trim().toLowerCase();
    const manufacturerNeedle = materialFilters.manufacturer.trim().toLowerCase();
    const maxPrice = materialFilters.maxPrice.trim() ? parseNumber(materialFilters.maxPrice) : null;
    const maxLeadTime = materialFilters.maxLeadTime.trim() ? parseNumber(materialFilters.maxLeadTime) : null;

    return materialOptions.filter((material) => {
      const displayName = materialDisplayName(material).toLowerCase();
      const manufacturerName = String(material.manufacturerName || "").toLowerCase();
      const categoryName = String(material.category || "").toLowerCase();
      const hasFireRating = !!String(material.fireRating || "").trim();
      const materialPrice = parseNumber(material.pricePerUnit);
      const materialLeadTime = parseNumber(material.leadTimeDays);

      if (searchNeedle && ![displayName, manufacturerName, categoryName].some((value) => value.includes(searchNeedle))) {
        return false;
      }
      if (manufacturerNeedle && !manufacturerName.includes(manufacturerNeedle)) {
        return false;
      }
      if (materialFilters.fireRatedOnly && !hasFireRating) {
        return false;
      }
      if (maxPrice !== null && materialPrice > maxPrice) {
        return false;
      }
      if (maxLeadTime !== null && materialLeadTime > maxLeadTime) {
        return false;
      }
      return true;
    });
  }, [materialOptions, materialFilters]);

  const totals = useMemo(() => {
    const totalGwpPer1000Sqft = layers.reduce((sum, layer) => sum + parseNumber(layer.gwpContribution || layer.materialEmbodiedCarbonPer1000sf), 0);
    const totalRValue = layers.reduce((sum, layer) => sum + parseNumber(layer.materialRValue), 0);
    const estimatedCostPer1000Sqft = layers.reduce((sum, layer) => sum + parseNumber(layer.materialPricePerUnit), 0);
    const derivedFireRating = fireRating || layers.map((layer) => layer.materialFireRating).find(Boolean) || assembly?.fireRating || "—";
    return { totalGwpPer1000Sqft, totalRValue, estimatedCostPer1000Sqft, derivedFireRating };
  }, [layers, fireRating, assembly?.fireRating]);

  const updateMutation = trpc.assemblies.update.useMutation({
    onSuccess: async () => {
      await utils.assemblies.getById.invalidate({ id });
      await utils.assemblies.list.invalidate();
      toast.success("Assembly saved");
    },
    onError: (error) => toast.error(error.message || "Failed to save assembly"),
  });

  const addLayer = () => {
    setLayers((current) => [
      ...current,
      {
        layerOrder: current.length + 1,
        layerName: `Layer ${current.length + 1}`,
        thickness: "",
        materialId: null,
        materialName: "Manual layer",
        notes: "",
        gwpContribution: "",
        materialRValue: 0,
        materialEmbodiedCarbonPer1000sf: 0,
        materialPricePerUnit: 0,
        materialPriceUnit: "unit",
        materialFireRating: "",
      },
    ]);
  };

  const removeLayer = (index: number) => {
    setLayers((current) => current.filter((_, currentIndex) => currentIndex !== index).map((layer, nextIndex) => ({ ...layer, layerOrder: nextIndex + 1 })));
  };

  const updateLayer = (index: number, patch: Partial<LayerDraft>) => {
    setLayers((current) => current.map((layer, currentIndex) => currentIndex === index ? { ...layer, ...patch } : layer));
  };

  const selectLayerMaterial = (index: number, value: string) => {
    setLayers((current) => current.map((layer, currentIndex) => {
      if (currentIndex !== index) return layer;
      if (value === "manual") {
        return applyMaterialToLayer(layer, null);
      }
      const materialId = Number(value);
      const selectedMaterial = materialOptions.find((material) => material.id === materialId) || null;
      return applyMaterialToLayer(layer, selectedMaterial);
    }));
  };

  const saveAssembly = () => {
    if (!assembly) return;
    if (!name.trim()) {
      toast.error("Assembly name is required");
      return;
    }
    if (layers.length === 0) {
      toast.error("Add at least one layer");
      return;
    }
    if (layers.some((layer) => !layer.layerName.trim())) {
      toast.error("Every layer needs a name");
      return;
    }

    updateMutation.mutate({
      id: assembly.id,
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
      fireRating: fireRating.trim() || null,
      sustainabilityTier: tier,
      components: layers.map((layer, index) => ({
        materialId: layer.materialId,
        layerOrder: index + 1,
        layerName: layer.layerName.trim(),
        thickness: layer.thickness.trim() || null,
        gwpContribution: layer.gwpContribution.trim() ? Number(layer.gwpContribution) : null,
        notes: layer.notes.trim() || null,
      })),
    });
  };

  const sendToRfq = () => {
    if (!assembly) return;
    const payload = [{
      assemblyId: assembly.id,
      name: name.trim() || assembly.name,
      manufacturerName: "Assembly system",
      quantity: 1,
      quantityUnit: "assembly",
      itemType: "assembly",
    }];
    localStorage.setItem("rfq-items", JSON.stringify(payload));
    toast.success("Assembly added to RFQ cart");
    navigate("/rfq");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-8"><Skeleton className="h-[600px]" /></div>
        <Footer />
      </div>
    );
  }

  if (!assembly) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Assembly not found</h2>
          <Link href="/assemblies"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Assemblies</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1 space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/assemblies" className="hover:text-foreground">Assemblies</Link>
          <span>/</span>
          <span className="text-foreground">{assembly.name}</span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="text-[10px]">{assembly.assemblyType}</Badge>
              <Badge className={`text-[10px] ${TIER_COLORS[tier]}`}>{TIER_LABELS[tier]}</Badge>
              <Badge variant="secondary" className="text-[10px]">{layers.length} layers</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6" />Worksheet-style Assembly Editor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Edit layers directly on the detail page, narrow the catalog with architect-first filters, and watch totals update immediately.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/assemblies"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
            <Button variant="outline" onClick={sendToRfq}><FileSpreadsheet className="w-4 h-4 mr-2" />Send to RFQ</Button>
            {user ? (
              <Button onClick={saveAssembly} disabled={updateMutation.isPending}><Save className="w-4 h-4 mr-2" />{updateMutation.isPending ? "Saving..." : "Save Assembly"}</Button>
            ) : (
              <a href={getLoginUrl()}><Button><LogIn className="w-4 h-4 mr-2" />Sign in to Save</Button></a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assembly Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Assembly Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tier</Label>
                  <Select value={tier} onValueChange={(value) => setTier(value as AssemblyTier)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="better">Better</SelectItem>
                      <SelectItem value="best">Best</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assembly Fire Rating</Label>
                  <Input value={fireRating} onChange={(e) => setFireRating(e.target.value)} placeholder="1 HR, 2 HR, UL Design, etc." className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" />Layer Material Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Search</Label>
                    <div className="relative mt-1">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input value={materialFilters.search} onChange={(e) => updateMaterialFilters({ search: e.target.value })} placeholder="Name, category, manufacturer" className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Manufacturer</Label>
                    <Input value={materialFilters.manufacturer} onChange={(e) => updateMaterialFilters({ manufacturer: e.target.value })} placeholder="Filter manufacturer" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={materialFilters.category || "all"} onValueChange={(value) => updateMaterialFilters({ category: value === "all" ? "" : value, categorySearch: "" })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="All categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.filter((cat) => !!cat.category && cat.category.trim() !== "").map((category) => (
                          <SelectItem key={category.category} value={category.category}>{category.category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Max price / unit</Label>
                    <Input type="number" min="0" step="0.01" value={materialFilters.maxPrice} onChange={(e) => updateMaterialFilters({ maxPrice: e.target.value })} placeholder="Any" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Max lead time (days)</Label>
                    <Input type="number" min="0" step="1" value={materialFilters.maxLeadTime} onChange={(e) => updateMaterialFilters({ maxLeadTime: e.target.value })} placeholder="Any" className="mt-1" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button variant="outline" className="w-full" onClick={() => setMaterialFilters(DEFAULT_MATERIAL_PICKER_FILTERS)}><X className="w-4 h-4 mr-2" />Reset filters</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CSI_DIVISIONS.map((division) => {
                    const active = materialFilters.categorySearch === division.keyword;
                    return (
                      <button
                        key={division.keyword}
                        onClick={() => updateMaterialFilters({ categorySearch: active ? "" : division.keyword, category: "" })}
                        className={`text-[11px] px-2 py-1 rounded border transition-colors ${active ? "border-green-600 bg-green-50 text-green-700 font-medium" : "border-border text-muted-foreground hover:border-green-400 hover:text-foreground"}`}
                      >
                        <span className="opacity-50 mr-1">{division.code}</span>
                        {division.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Verified EPD only</p>
                      <p className="text-xs text-muted-foreground">Keep documented materials first</p>
                    </div>
                    <Switch checked={materialFilters.hasEpd} onCheckedChange={(checked) => updateMaterialFilters({ hasEpd: checked })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">US manufactured</p>
                      <p className="text-xs text-muted-foreground">Favor easier sourcing</p>
                    </div>
                    <Switch checked={materialFilters.usManufactured} onCheckedChange={(checked) => updateMaterialFilters({ usManufactured: checked })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Fire-rated only</p>
                      <p className="text-xs text-muted-foreground">Show materials with fire data</p>
                    </div>
                    <Switch checked={materialFilters.fireRatedOnly} onCheckedChange={(checked) => updateMaterialFilters({ fireRatedOnly: checked })} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{materialsLoading ? "Loading materials..." : `${filteredMaterialOptions.length} matching materials`}</span>
                  <span>Top 100 catalog results in current filter set</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Editable Layers</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Edit the architect worksheet rows in place, link each layer to a catalog material, and keep manual carbon overrides when needed.</p>
                </div>
                <Button variant="outline" size="sm" onClick={addLayer}><Plus className="w-4 h-4 mr-2" />Add Layer</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Layer</TableHead>
                      <TableHead>Thickness</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Carbon / 1000 SF</TableHead>
                      <TableHead>R-Value</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-14" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {layers.map((layer, index) => (
                      <TableRow key={`${layer.layerOrder}-${index}`}>
                        <TableCell className="font-medium text-xs">{index + 1}</TableCell>
                        <TableCell>
                          <Input value={layer.layerName} onChange={(e) => updateLayer(index, { layerName: e.target.value })} className="min-w-[180px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={layer.thickness} onChange={(e) => updateLayer(index, { thickness: e.target.value })} placeholder='e.g. 3", 6 mil' className="min-w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[220px] space-y-2">
                            <Select value={layer.materialId ? String(layer.materialId) : "manual"} onValueChange={(value) => selectLayerMaterial(index, value)}>
                              <SelectTrigger>
                                <SelectValue placeholder={materialsLoading ? "Loading materials..." : "Select a material"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual layer</SelectItem>
                                {(layer.materialId && !filteredMaterialOptions.some((material) => material.id === layer.materialId)
                                  ? [materialOptions.find((material) => material.id === layer.materialId)].filter(Boolean) as CatalogMaterial[]
                                  : []
                                ).concat(filteredMaterialOptions).map((material) => (
                                  <SelectItem key={material.id} value={String(material.id)}>
                                    {materialDisplayName(material)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div>
                              <p className="text-sm font-medium leading-tight">{layer.materialName || "Manual layer"}</p>
                              <p className="text-[11px] text-muted-foreground">{layer.materialFireRating ? `Fire: ${layer.materialFireRating}` : "No linked fire data"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={layer.gwpContribution} onChange={(e) => updateLayer(index, { gwpContribution: e.target.value })} placeholder={String(layer.materialEmbodiedCarbonPer1000sf || "0")} className="min-w-[120px]" />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm min-w-[90px]">R-{formatMetric(layer.materialRValue, 1)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm min-w-[110px]">${formatMetric(layer.materialPricePerUnit)} <span className="text-xs text-muted-foreground">/ {layer.materialPriceUnit}</span></div>
                        </TableCell>
                        <TableCell>
                          <Textarea value={layer.notes} onChange={(e) => updateLayer(index, { notes: e.target.value })} rows={2} className="min-w-[180px]" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeLayer(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />Live Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-green-700">Embodied Carbon</p>
                  <p className="text-2xl font-bold text-green-800">{formatMetric(totals.totalGwpPer1000Sqft)}</p>
                  <p className="text-xs text-green-700">kg CO₂e / 1000 SF</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">Thermal Performance</p>
                  <p className="text-2xl font-bold text-blue-800">R-{formatMetric(totals.totalRValue, 1)}</p>
                  <p className="text-xs text-blue-700">combined layer value</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700">Estimated Cost</p>
                  <p className="text-2xl font-bold text-amber-800">${formatMetric(totals.estimatedCostPer1000Sqft)}</p>
                  <p className="text-xs text-amber-700">per 1000 SF</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Flame className="w-4 h-4" />Architect Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Installability</span>
                  <span className="font-medium text-right">{layers.length} sequenced layers</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Linked materials</span>
                  <span className="font-medium text-right">{layers.filter((layer) => !!layer.materialId).length} / {layers.length}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Filter match set</span>
                  <span className="font-medium text-right">{filteredMaterialOptions.length} materials</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Fire rating</span>
                  <span className="font-medium text-right">{totals.derivedFireRating}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Layer count</span>
                  <span className="font-medium text-right">{layers.length}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Worksheet state</span>
                  <span className="font-medium text-right">Editable in detail view</span>
                </div>
              </CardContent>
            </Card>

            {/* ── Performance Metrics ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y divide-border text-sm">
                {/* Acoustics */}
                {(assembly.stcRating || assembly.iicRating) && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1"><Volume2 className="w-3 h-3" />Acoustics</p>
                    <div className="space-y-1">
                      {assembly.stcRating && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">STC Rating</span>
                          <span className="font-semibold text-xs">{assembly.stcRating}</span>
                        </div>
                      )}
                      {assembly.iicRating && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">IIC Rating</span>
                          <span className="font-semibold text-xs">{assembly.iicRating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Fire & Flame */}
                {(assembly.flameSpreadIndex !== null || assembly.smokeDevelopmentIndex !== null || assembly.ulDesignNumber) && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1"><Flame className="w-3 h-3" />Fire / ASTM E84</p>
                    <div className="space-y-1">
                      {assembly.flameSpreadIndex !== null && assembly.flameSpreadIndex !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Flame Spread (FSI)</span>
                          <span className={`font-semibold text-xs ${Number(assembly.flameSpreadIndex) <= 25 ? "text-green-700" : Number(assembly.flameSpreadIndex) <= 75 ? "text-amber-700" : "text-red-700"}`}>
                            {assembly.flameSpreadIndex} {Number(assembly.flameSpreadIndex) <= 25 ? "Class A" : Number(assembly.flameSpreadIndex) <= 75 ? "Class B" : "Class C"}
                          </span>
                        </div>
                      )}
                      {assembly.smokeDevelopmentIndex !== null && assembly.smokeDevelopmentIndex !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Smoke Dev. (SDI)</span>
                          <span className="font-semibold text-xs">{assembly.smokeDevelopmentIndex}</span>
                        </div>
                      )}
                      {assembly.ulDesignNumber && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground text-xs shrink-0">UL Design</span>
                          <span className="font-semibold text-xs text-right">{assembly.ulDesignNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Air & Vapor */}
                {(assembly.airPermeance || assembly.vaporPermeance) && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1"><Wind className="w-3 h-3" />Air & Vapor</p>
                    <div className="space-y-1">
                      {assembly.airPermeance && assembly.airPermeance !== "N/A" && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground text-xs">Air Permeance</span>
                          <span className="font-semibold text-xs">{assembly.airPermeance}</span>
                        </div>
                      )}
                      {assembly.vaporPermeance && assembly.vaporPermeance !== "N/A" && (
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-muted-foreground text-xs">Vapor Permeance</span>
                          <span className="font-semibold text-xs">{assembly.vaporPermeance}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Wind & Impact */}
                {(assembly.windUpliftRating || assembly.impactResistance) && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />Wind & Impact</p>
                    <div className="space-y-1">
                      {assembly.windUpliftRating && assembly.windUpliftRating !== "N/A" && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground text-xs">Wind Uplift</span>
                          <span className="font-semibold text-xs">{assembly.windUpliftRating}</span>
                        </div>
                      )}
                      {assembly.impactResistance && (
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-muted-foreground text-xs">Impact Resistance</span>
                          <span className="font-semibold text-xs">{assembly.impactResistance}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Load & Structural */}
                {assembly.loadCapacityPsf && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1"><Ruler className="w-3 h-3" />Structural</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Load Capacity</span>
                      <span className="font-semibold text-xs">{assembly.loadCapacityPsf} psf</span>
                    </div>
                  </div>
                )}
                {/* LEED Credits */}
                {assembly.leedCredits && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1"><Leaf className="w-3 h-3 text-green-600" />LEED v4.1 Credits</p>
                    <div className="flex flex-wrap gap-1">
                      {assembly.leedCredits.split(",").map((credit) => (
                        <span key={credit.trim()} className="text-[10px] bg-green-50 border border-green-200 text-green-800 rounded px-1.5 py-0.5">
                          {credit.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />Next Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={sendToRfq}><ArrowRight className="w-4 h-4 mr-2" />Use this assembly in RFQ</Button>
                {user ? (
                  <Button className="w-full justify-start" onClick={saveAssembly} disabled={updateMutation.isPending}><Save className="w-4 h-4 mr-2" />Save recalculated totals</Button>
                ) : (
                  <a href={getLoginUrl()} className="block"><Button className="w-full justify-start"><LogIn className="w-4 h-4 mr-2" />Sign in to save edits</Button></a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function Assemblies() {
  const params = useParams<{ id?: string }>();
  if (params?.id) {
    return <AssemblyDetailPage />;
  }
  return <AssemblyListPage />;
}
