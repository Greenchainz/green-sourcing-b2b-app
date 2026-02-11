import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaterialCard from "@/components/MaterialCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal, ShoppingCart, Scale, X } from "lucide-react";
import { Link } from "wouter";

export default function MaterialsCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [persona, setPersona] = useState("default");
  const [sortBy, setSortBy] = useState<"ccps"|"carbon"|"price"|"name"|"leadTime">("ccps");
  const [sortOrder, setSortOrder] = useState<"asc"|"desc">("desc");
  const [hasEpd, setHasEpd] = useState<boolean|undefined>(undefined);
  const [usManufactured, setUsManufactured] = useState<boolean|undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = trpc.materials.list.useQuery({
    search: search || undefined,
    category: category || undefined,
    persona, sortBy, sortOrder,
    limit: 50, offset: 0,
    hasEpd, usManufactured,
  });

  const { data: categories } = trpc.materials.categories.useQuery();

  const rfqCount = useMemo(() => { try { return JSON.parse(localStorage.getItem("rfq-items")||"[]").length; } catch { return 0; } }, []);
  const compareCount = useMemo(() => { try { return JSON.parse(localStorage.getItem("compare-ids")||"[]").length; } catch { return 0; } }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
    setSearch(input.value);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Materials Catalog</h1>
              <p className="text-sm text-muted-foreground">{data?.total || 0} verified sustainable building materials ranked by CCPS</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/compare"><Button variant="outline" size="sm" className="text-xs"><Scale className="w-3.5 h-3.5 mr-1" />Compare {compareCount > 0 && `(${compareCount})`}</Button></Link>
              <Link href="/rfq"><Button variant="outline" size="sm" className="text-xs"><ShoppingCart className="w-3.5 h-3.5 mr-1" />RFQ Cart {rfqCount > 0 && `(${rfqCount})`}</Button></Link>
            </div>
          </div>
          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search materials, products, categories..." className="pl-9" defaultValue={search} />
              </div>
              <Button type="submit" size="sm">Search</Button>
            </form>
            <div className="flex gap-2">
              <Select value={persona} onValueChange={setPersona}>
                <SelectTrigger className="w-40 text-xs"><SelectValue placeholder="My Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">All Roles</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                  <SelectItem value="leed_ap">LEED AP</SelectItem>
                  <SelectItem value="gc_pm">Contractor / GC PM</SelectItem>
                  <SelectItem value="spec_writer">Spec Writer</SelectItem>
                  <SelectItem value="owner">Owner / Developer</SelectItem>
                  <SelectItem value="facility_manager">Facility Manager</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />Filters
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-3 p-4 bg-card rounded-lg border border-border/50 flex flex-wrap gap-4 items-center">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-44 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((c) => <SelectItem key={c.category} value={c.category}>{c.category} ({c.count})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Sort By</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ccps">CCPS Score</SelectItem>
                    <SelectItem value="carbon">Carbon (GWP)</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="leadTime">Lead Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Order</Label>
                <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                  <SelectTrigger className="w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">High → Low</SelectItem>
                    <SelectItem value="asc">Low → High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={hasEpd === true} onCheckedChange={(v) => setHasEpd(v ? true : undefined)} /><Label className="text-xs">EPD Only</Label></div>
              <div className="flex items-center gap-2"><Switch checked={usManufactured === true} onCheckedChange={(v) => setUsManufactured(v ? true : undefined)} /><Label className="text-xs">US Made</Label></div>
              {(search || category || hasEpd || usManufactured) && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearch(""); setCategory(""); setHasEpd(undefined); setUsManufactured(undefined); }}>
                  <X className="w-3 h-3 mr-1" />Clear All
                </Button>
              )}
            </div>
          )}
          {(search || category || hasEpd || usManufactured) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {search && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setSearch("")}>Search: {search} <X className="w-3 h-3 ml-1" /></Badge>}
              {category && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setCategory("")}>{category} <X className="w-3 h-3 ml-1" /></Badge>}
              {hasEpd && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setHasEpd(undefined)}>EPD Only <X className="w-3 h-3 ml-1" /></Badge>}
              {usManufactured && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setUsManufactured(undefined)}>US Made <X className="w-3 h-3 ml-1" /></Badge>}
            </div>
          )}
        </div>
      </section>
      <div className="container py-6 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-lg" />)}
          </div>
        ) : data?.items && data.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => <MaterialCard key={item.id} {...item} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No materials found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
