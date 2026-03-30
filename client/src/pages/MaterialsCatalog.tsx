/**
 * MaterialsCatalog — Sweets-style architect-grade material browser.
 *
 * Layout (app-shell, not page-scroll):
 *   - Outer: h-screen flex-col overflow-hidden
 *   - Hero bar: shrink-0, search + view controls
 *   - Body: flex-1 overflow-hidden → sidebar + main each scroll independently
 *   - Desktop: persistent left-rail FilterPanel (w-64)
 *   - Mobile: Sheet drawer triggered by filter button
 *
 * Filter state lives in React; URL params are serialized on every change so
 * views are shareable by copying the browser address bar.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaterialCard from "@/components/MaterialCard";
import { InsiderDashboard } from "@/components/InsiderDashboard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  X,
  Link2,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// ── CSI division quick-filter definitions ─────────────────────────────────────
// `keyword` is sent as `categorySearch` → ILIKE match on the category field.

const CSI_DIVISIONS = [
  { code: "03", label: "Concrete",   keyword: "concrete"  },
  { code: "04", label: "Masonry",    keyword: "mason"     },
  { code: "05", label: "Metals",     keyword: "steel"     },
  { code: "06", label: "Wood",       keyword: "wood"      },
  { code: "07", label: "Insulation", keyword: "insul"     },
  { code: "07", label: "Roofing",    keyword: "roofing"   },
  { code: "08", label: "Glazing",    keyword: "glaz"      },
  { code: "09", label: "Flooring",   keyword: "floor"     },
  { code: "09", label: "Drywall",    keyword: "drywall"   },
] as const;

type CertKey = "EPD" | "HPD" | "FSC" | "C2C" | "GREENGUARD" | "Declare";
type SortBy  = "ccps" | "carbon" | "price" | "name" | "leadTime";
type ViewMode = "grid" | "list";

// ── Filter state ──────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  category: string;
  categorySearch: string;   // CSI division keyword (ILIKE)
  sortBy: SortBy;
  hasEpd: boolean;
  usManufactured: boolean;
  certifications: CertKey[];
  minScore: number;         // min CCPS score (0 = off)
  maxGwp: number | undefined;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "",
  categorySearch: "",
  sortBy: "ccps",
  hasEpd: false,
  usManufactured: false,
  certifications: [],
  minScore: 0,
  maxGwp: undefined,
};

// ── URL serialization ─────────────────────────────────────────────────────────

function filtersToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set("q", f.search);
  if (f.category) p.set("cat", f.category);
  if (f.categorySearch) p.set("div", f.categorySearch);
  if (f.sortBy !== "ccps") p.set("sort", f.sortBy);
  if (f.hasEpd) p.set("epd", "1");
  if (f.usManufactured) p.set("us", "1");
  if (f.certifications.length) p.set("certs", f.certifications.join(","));
  if (f.minScore > 0) p.set("score", String(f.minScore));
  if (f.maxGwp !== undefined) p.set("gwp", String(f.maxGwp));
  return p;
}

function paramsToFilters(search: string): FilterState {
  const p = new URLSearchParams(search);
  return {
    search: p.get("q") ?? "",
    category: p.get("cat") ?? "",
    categorySearch: p.get("div") ?? "",
    sortBy: (p.get("sort") as SortBy) ?? "ccps",
    hasEpd: p.get("epd") === "1",
    usManufactured: p.get("us") === "1",
    certifications: (p.get("certs")?.split(",").filter(Boolean) as CertKey[]) ?? [],
    minScore: Number(p.get("score") ?? 0),
    maxGwp: p.get("gwp") ? Number(p.get("gwp")) : undefined,
  };
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: FilterState;
  categories: { category: string; count: number }[];
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  totalMatches: number;
}

function FilterPanel({ filters, categories, onChange }: FilterPanelProps) {
  const toggleCert = (cert: CertKey) => {
    const next = filters.certifications.includes(cert)
      ? filters.certifications.filter((c) => c !== cert)
      : [...filters.certifications, cert];
    onChange({ certifications: next });
  };

  return (
    <div className="space-y-5 text-sm">

      {/* CSI Division quick pills */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          CSI Division
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CSI_DIVISIONS.map((div) => {
            const active = filters.categorySearch === div.keyword;
            return (
              <button
                key={div.keyword}
                onClick={() => onChange({ categorySearch: active ? "" : div.keyword, category: "" })}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  active
                    ? "border-green-600 bg-green-50 text-green-700 font-medium"
                    : "border-border text-muted-foreground hover:border-green-400 hover:text-foreground"
                }`}
              >
                <span className="opacity-50 mr-0.5">{div.code}</span>
                {div.label}
              </button>
            );
          })}
          {filters.categorySearch && (
            <button
              onClick={() => onChange({ categorySearch: "" })}
              className="text-[11px] px-2 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground"
            >
              × All
            </button>
          )}
        </div>
      </div>

      <Separator />

      {/* Specific category */}
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Category
        </Label>
        <Select
          value={filters.category || "all"}
          onValueChange={(v) => onChange({ category: v === "all" ? "" : v, categorySearch: "" })}
        >
          <SelectTrigger className="w-full text-xs h-8">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.category} value={c.category}>
                {c.category}
                <span className="text-muted-foreground ml-1">({c.count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Sustainability toggles */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Sustainability
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="epd-toggle" className="text-xs cursor-pointer">
                Verified Data only
              </Label>
              <Switch
                id="epd-toggle"
                checked={filters.hasEpd}
                onCheckedChange={(v) => onChange({ hasEpd: v })}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Limits results to materials with verified EPD documentation
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="us-toggle" className="text-xs cursor-pointer">
              US manufactured
            </Label>
            <Switch
              id="us-toggle"
              checked={filters.usManufactured}
              onCheckedChange={(v) => onChange({ usManufactured: v })}
            />
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Certifications
        </p>
        <div className="space-y-2">
          {(["EPD", "HPD", "FSC", "C2C", "GREENGUARD", "Declare"] as CertKey[]).map((cert) => (
            <div key={cert} className="flex items-center gap-2">
              <Checkbox
                id={`cert-${cert}`}
                checked={filters.certifications.includes(cert)}
                onCheckedChange={() => toggleCert(cert)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor={`cert-${cert}`} className="text-xs cursor-pointer">
                {cert}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Min score slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Min GreenScore
          </p>
          <span className="text-xs font-medium tabular-nums">
            {filters.minScore > 0 ? `≥ ${filters.minScore}` : "Any"}
          </span>
        </div>
        <Slider
          min={0}
          max={90}
          step={10}
          value={[filters.minScore]}
          onValueChange={([v]) => onChange({ minScore: v })}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">0</span>
          <span className="text-[9px] text-muted-foreground">90+</span>
        </div>
      </div>

    </div>
  );
}

// ── Active filter chips ───────────────────────────────────────────────────────

function ActiveChips({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.search)
    chips.push({ label: `"${filters.search}"`, onRemove: () => onChange({ search: "" }) });
  if (filters.category)
    chips.push({ label: filters.category, onRemove: () => onChange({ category: "" }) });
  if (filters.categorySearch) {
    const div = CSI_DIVISIONS.find((d) => d.keyword === filters.categorySearch);
    chips.push({
      label: div ? `Div ${div.code} · ${div.label}` : filters.categorySearch,
      onRemove: () => onChange({ categorySearch: "" }),
    });
  }
  if (filters.hasEpd)
    chips.push({ label: "Verified Data", onRemove: () => onChange({ hasEpd: false }) });
  if (filters.usManufactured)
    chips.push({ label: "US Made", onRemove: () => onChange({ usManufactured: false }) });
  filters.certifications.forEach((c) =>
    chips.push({
      label: c,
      onRemove: () =>
        onChange({ certifications: filters.certifications.filter((x) => x !== c) }),
    })
  );
  if (filters.minScore > 0)
    chips.push({ label: `GreenScore ≥ ${filters.minScore}`, onRemove: () => onChange({ minScore: 0 }) });

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {chips.map((chip) => (
        <Badge
          key={chip.label}
          variant="secondary"
          className="text-xs gap-1 cursor-pointer pr-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={chip.onRemove}
        >
          {chip.label}
          <X className="w-2.5 h-2.5" />
        </Badge>
      ))}
    </div>
  );
}

// ── Main catalog page ─────────────────────────────────────────────────────────

export default function MaterialsCatalog() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Initialise from URL on mount
  const [filters, setFilters] = useState<FilterState>(() =>
    paramsToFilters(typeof window !== "undefined" ? window.location.search : "")
  );

  const updateFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // Sync filters → URL (replace so back button works naturally)
  useEffect(() => {
    const qs = filtersToParams(filters).toString();
    const url = qs ? `/materials?${qs}` : "/materials";
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [filters]);

  // Show login nudge once for anonymous users
  const [nudged, setNudged] = useState(false);
  useEffect(() => {
    if (!user && !nudged) {
      toast.info("Sign in for personalised recommendations", { duration: 4000 });
      setNudged(true);
    }
  }, [user, nudged]);

  const { data, isLoading } = trpc.materials.list.useQuery(
    {
      search: filters.search || undefined,
      category: filters.category || undefined,
      categorySearch: filters.categorySearch || undefined,
      persona: "default",
      sortBy: filters.sortBy,
      sortOrder:
        filters.sortBy === "carbon" || filters.sortBy === "price" || filters.sortBy === "leadTime"
          ? "asc"
          : "desc",
      limit: 48,
      offset: 0,
      hasEpd: filters.hasEpd || undefined,
      usManufactured: filters.usManufactured || undefined,
      certifications: filters.certifications.length ? filters.certifications : undefined,
      minScore: filters.minScore > 0 ? filters.minScore : undefined,
    },
    { placeholderData: (prev) => prev }
  );

  const { data: rawCategories } = trpc.materials.categories.useQuery();
  const categories = rawCategories ?? [];
  const totalMatches = data?.total ?? 0;

  // Count of active filters for mobile badge
  const activeFilterCount = useMemo(
    () =>
      [
        filters.search,
        filters.category,
        filters.categorySearch,
        filters.hasEpd,
        filters.usManufactured,
        ...filters.certifications,
        filters.minScore > 0,
        filters.maxGwp !== undefined,
      ].filter(Boolean).length,
    [filters]
  );

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Link copied!"),
      () => toast.error("Copy failed")
    );
  };

  const filterPanelProps: FilterPanelProps = {
    filters,
    categories,
    onChange: updateFilters,
    onReset: resetFilters,
    totalMatches,
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      {/* ── Hero / search bar ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-background border-b shadow-sm px-4 md:px-6 py-3 flex items-center gap-3 z-10">

        {/* Page identity — desktop only */}
        <div className="hidden lg:block shrink-0 pr-3 border-r border-border">
          <h1 className="text-sm font-bold leading-tight">Materials</h1>
          <p className="text-[10px] text-muted-foreground whitespace-nowrap">
            Verified EPDs · Credit Scores
          </p>
        </div>

        {/* Search input — takes remaining width */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search by name, category, manufacturer…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
          {filters.search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => updateFilters({ search: "" })}
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Share — desktop */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex shrink-0 gap-1.5 text-xs"
          onClick={copyLink}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Share</span>
        </Button>

        {/* Mobile: filter sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden shrink-0 gap-1.5 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="h-4 min-w-4 px-1 flex items-center justify-center text-[10px] rounded-full"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto pt-8">
            <SheetHeader className="mb-5">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base">Refine Results</SheetTitle>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            </SheetHeader>
            <FilterPanel {...filterPanelProps} />
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Body: sidebar + main ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left-rail sidebar — desktop only */}
        <aside className="w-64 shrink-0 border-r overflow-y-auto hidden md:flex flex-col bg-muted/20">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
            <h2 className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              Refine Results
            </h2>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="px-4 pb-6 flex-1">
            <FilterPanel {...filterPanelProps} />
          </div>
          <div className="px-4 pb-4 shrink-0">
            <InsiderDashboard compact />
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">

            {/* Results header: count + sort + view toggle */}
            <div className="flex items-center justify-between mb-3 gap-3">
              <p className="text-sm text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="inline-block w-24 h-4 bg-muted animate-pulse rounded align-middle" />
                ) : (
                  <>
                    <span className="font-medium text-foreground">{totalMatches}</span>{" "}
                    material{totalMatches !== 1 ? "s" : ""}
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                {/* Sort selector */}
                <Select
                  value={filters.sortBy}
                  onValueChange={(v) => updateFilters({ sortBy: v as SortBy })}
                >
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ccps">Best Score</SelectItem>
                    <SelectItem value="carbon">Lowest GWP</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                    <SelectItem value="price">Lowest Price</SelectItem>
                    <SelectItem value="leadTime">Lead Time</SelectItem>
                  </SelectContent>
                </Select>

                {/* View mode toggle */}
                <div className="flex border border-border rounded-md overflow-hidden shrink-0">
                  <button
                    className={`px-2.5 py-1.5 transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className={`px-2.5 py-1.5 border-l border-border transition-colors ${
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            <ActiveChips filters={filters} onChange={updateFilters} />

            {/* Grid or List */}
            {isLoading ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              )
            ) : data?.items && data.items.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {data.items.map((item) => (
                    <MaterialCard key={item.id} {...item} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.items.map((item) => (
                    <MaterialCard key={item.id} {...item} variant="list" />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-20">
                <Search className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">No materials found</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Try broader filters or a different search term.
                </p>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear all filters
                </Button>
              </div>
            )}

            {/* Footer inside scroll area */}
            <div className="mt-16 pt-8 border-t border-border/40">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
