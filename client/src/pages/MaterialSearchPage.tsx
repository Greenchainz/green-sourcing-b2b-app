import { useState, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaterialCard from "@/components/MaterialCard";
import { Input } from "@/components/ui/input";
import { MaterialTypeahead } from "@/components/ui/typeahead-variants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { isCalgreenCompliant } from "@/lib/calgreen";

const PAGE_SIZE = 24;

const CERT_OPTIONS = [
  { id: "leed",         label: "LEED" },
  { id: "epd",          label: "EPD" },
  { id: "cradle2cradle",label: "Cradle to Cradle" },
  { id: "fsc",          label: "FSC" },
  { id: "greenguard",   label: "Greenguard" },
  { id: "iso14001",     label: "ISO 14001" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

interface FilterState {
  search: string;
  category: string;
  certifications: string[];
  hasEpd: boolean | undefined;
  usManufactured: boolean | undefined;
  state: string;
  sortBy: "ccps" | "carbon" | "price" | "name" | "leadTime";
  maxGwp: number | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  calgreenOnly: boolean;
}

function FilterPanel({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: FilterState;
  categories: string[];
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  const toggleCert = (id: string) => {
    const next = filters.certifications.includes(id)
      ? filters.certifications.filter((c) => c !== id)
      : [...filters.certifications, id];
    onChange({ certifications: next });
  };

  const hasActiveFilters =
    filters.category ||
    filters.certifications.length > 0 ||
    filters.hasEpd !== undefined ||
    filters.usManufactured !== undefined ||
    filters.state ||
    filters.maxGwp !== undefined ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.calgreenOnly;

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-base">Filters</p>
        {hasActiveFilters && (
          <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* ── CALGreen Toggle ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              CALGreen Compliant
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-green-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-60 text-xs">
                  California Title 24 Part 11 (eff. Jan 1 2026) — Prescriptive EPD Pathway.
                  Requires a verified EPD and GWP ≤ 175% of category industry average.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="calgreen-toggle"
            checked={filters.calgreenOnly}
            onCheckedChange={(v) => onChange({ calgreenOnly: v })}
            className="data-[state=checked]:bg-green-600"
          />
        </div>
        <p className="text-[10px] text-green-600 dark:text-green-500 leading-snug">
          EPD required · GWP ≤ 175% industry avg
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Category</p>
        <Select value={filters.category || "all"} onValueChange={(v) => onChange({ category: v === "all" ? "" : v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Sort By</p>
        <Select value={filters.sortBy} onValueChange={(v) => onChange({ sortBy: v as FilterState["sortBy"] })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ccps">CCPS Score</SelectItem>
            <SelectItem value="carbon">Carbon (low to high)</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="leadTime">Lead Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certifications */}
      <div className="space-y-2">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Certifications</p>
        <div className="flex flex-wrap gap-1.5">
          {CERT_OPTIONS.map((cert) => {
            const active = filters.certifications.includes(cert.id);
            return (
              <button
                key={cert.id}
                onClick={() => toggleCert(cert.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  active
                    ? "bg-green-600 text-white border-green-600"
                    : "border-border text-muted-foreground hover:border-green-500 hover:text-foreground"
                }`}
              >
                {cert.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Attributes</p>
        <div className="flex items-center justify-between">
          <Label htmlFor="epd-toggle" className="text-xs">Has EPD</Label>
          <Switch
            id="epd-toggle"
            checked={!!filters.hasEpd}
            onCheckedChange={(v) => onChange({ hasEpd: v || undefined })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="us-toggle" className="text-xs">US Manufactured</Label>
          <Switch
            id="us-toggle"
            checked={!!filters.usManufactured}
            onCheckedChange={(v) => onChange({ usManufactured: v || undefined })}
          />
        </div>
      </div>

      {/* State / Region */}
      <div className="space-y-2">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Supplier State</p>
        <Select value={filters.state || "any"} onValueChange={(v) => onChange({ state: v === "any" ? "" : v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Any state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any state</SelectItem>
            {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Max GWP */}
      <div className="space-y-2">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Max GWP (kgCO₂e)</p>
        <Input
          type="number"
          min={0}
          placeholder="e.g. 500"
          className="h-8 text-xs"
          value={filters.maxGwp ?? ""}
          onChange={(e) =>
            onChange({ maxGwp: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-xs">Price Range (USD)</p>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            className="h-8 text-xs"
            value={filters.priceMin ?? ""}
            onChange={(e) =>
              onChange({ priceMin: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
          <span className="text-muted-foreground text-xs shrink-0">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            className="h-8 text-xs"
            value={filters.priceMax ?? ""}
            onChange={(e) =>
              onChange({ priceMax: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "",
  certifications: [],
  hasEpd: undefined,
  usManufactured: undefined,
  state: "",
  sortBy: "ccps",
  maxGwp: undefined,
  priceMin: undefined,
  priceMax: undefined,
  calgreenOnly: false,
};

export default function MaterialSearchPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(0);

  const patchFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setInputValue("");
    setPage(0);
  }, []);

  const { data, isLoading } = trpc.materials.list.useQuery(
    {
      search: filters.search || undefined,
      category: filters.category || undefined,
      hasEpd: filters.calgreenOnly ? true : filters.hasEpd,
      usManufactured: filters.usManufactured,
      sortBy: filters.sortBy,
      sortOrder: "desc",
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 30_000, placeholderData: (prev) => prev }
  );

  const { data: categoriesRaw = [] } = trpc.materials.categories.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const categories = categoriesRaw.map((c: { category: string; count: number }) => c.category);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    patchFilters({ search: inputValue });
  };

  const total = data?.total ?? 0;
  const rawItems = data?.items ?? [];

  const filteredItems = rawItems.filter((m: any) => {
    if (filters.maxGwp !== undefined && m.gwpValue && Number(m.gwpValue) > filters.maxGwp) return false;
    if (filters.priceMin !== undefined && m.pricePerUnit && Number(m.pricePerUnit) < filters.priceMin) return false;
    if (filters.priceMax !== undefined && m.pricePerUnit && Number(m.pricePerUnit) > filters.priceMax) return false;
    if (filters.calgreenOnly && !isCalgreenCompliant(m)) return false;
    return true;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFilterCount = [
    filters.category,
    ...filters.certifications,
    filters.hasEpd !== undefined && "epd",
    filters.usManufactured !== undefined && "us",
    filters.state,
    filters.maxGwp !== undefined && "gwp",
    filters.priceMin !== undefined && "priceMin",
    filters.priceMax !== undefined && "priceMax",
    filters.calgreenOnly && "calgreen",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="border-b bg-card/50 sticky top-0 z-10 backdrop-blur">
        <div className="container max-w-7xl py-3 flex gap-3 items-center">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="flex-1">
              <MaterialTypeahead
                value={inputValue}
                onChange={setInputValue}
                onSelect={(item) => {
                  setInputValue(item.label);
                  patchFilters({ search: item.label });
                }}
                onClear={() => { setInputValue(""); patchFilters({ search: "" }); }}
                placeholder="Search materials, products, specs…"
              />
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 shrink-0">Search</Button>
          </form>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden shrink-0">
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-green-600 border-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterPanel filters={filters} categories={categories} onChange={patchFilters} onReset={resetFilters} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="container max-w-7xl flex-1 py-6">
        <div className="flex gap-6">
          <aside className="hidden md:block w-52 shrink-0 sticky top-20 self-start">
            <FilterPanel filters={filters} categories={categories} onChange={patchFilters} onReset={resetFilters} />
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : `${filteredItems.length.toLocaleString()} material${filteredItems.length !== 1 ? "s" : ""}`}
                  {filters.search && <span className="ml-1">for "<strong>{filters.search}</strong>"</span>}
                </p>
                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span>🟢 &lt; 100 kgCO₂e</span>
                  <span>🟡 &lt; 500 kgCO₂e</span>
                  <span>🔴 &gt; 500 kgCO₂e</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {filters.calgreenOnly && (
                  <Badge className="text-xs gap-1 bg-green-600 text-white border-0">
                    🌿 CALGreen
                    <button onClick={() => patchFilters({ calgreenOnly: false })}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                )}
                {filters.category && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {filters.category}
                    <button onClick={() => patchFilters({ category: "" })}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                )}
                {filters.hasEpd && !filters.calgreenOnly && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Has EPD
                    <button onClick={() => patchFilters({ hasEpd: undefined })}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                )}
                {filters.usManufactured && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    US Made
                    <button onClick={() => patchFilters({ usManufactured: undefined })}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                )}
                {filters.maxGwp !== undefined && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Max GWP: {filters.maxGwp} kgCO₂e
                    <button onClick={() => patchFilters({ maxGwp: undefined })}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                )}
                {(filters.priceMin !== undefined || filters.priceMax !== undefined) && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Price: {filters.priceMin !== undefined ? `$${filters.priceMin}` : "$0"} – {filters.priceMax !== undefined ? `$${filters.priceMax}` : "∞"}
                    <button onClick={() => patchFilters({ priceMin: undefined, priceMax: undefined })}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                )}
                {filters.certifications.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs gap-1">
                    {CERT_OPTIONS.find((o) => o.id === c)?.label ?? c}
                    <button onClick={() => patchFilters({ certifications: filters.certifications.filter((x) => x !== c) })}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No materials matched your filters.</p>
                {filters.calgreenOnly && (
                  <p className="text-xs mt-1 text-green-600">
                    CALGreen requires a verified EPD and GWP ≤ 175% of category average.
                  </p>
                )}
                <Button variant="ghost" size="sm" className="mt-2" onClick={resetFilters}>Clear filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map((m: any) => (
                  <MaterialCard key={m.id} {...m} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
