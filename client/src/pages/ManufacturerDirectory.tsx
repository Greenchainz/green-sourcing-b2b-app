import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Package,
  ShieldCheck,
  Building2,
  ChevronRight,
} from "lucide-react";

export default function ManufacturerDirectory() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: allManufacturers, isLoading } = trpc.manufacturer.getAll.useQuery(undefined);

  const categories = useMemo(() => {
    if (!allManufacturers) return [];
    const cats = new Set<string>();
    allManufacturers.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [allManufacturers]);

  const manufacturers = useMemo(
    () =>
      (allManufacturers ?? []).filter(
        (m) => !selectedCategory || m.category === selectedCategory
      ),
    [allManufacturers, selectedCategory]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-emerald-950/20 to-background">
        <div className="container py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Supplier Directory
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Discover verified sustainable building material manufacturers.
            Every supplier in our directory has been vetted for innovation,
            sustainability credentials, and architect-readiness.
          </p>
        </div>
      </section>

      {/* Category Filter Bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur sticky top-16 z-40">
        <div className="container py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-emerald-600 text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat ? null : cat)
                }
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="container flex-1 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No suppliers found
            </h3>
            <p className="text-muted-foreground">
              {selectedCategory
                ? `No suppliers in the "${selectedCategory}" category yet.`
                : "No suppliers in the directory yet."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {manufacturers.length} supplier{manufacturers.length !== 1 ? "s" : ""}
              {selectedCategory ? ` in ${selectedCategory}` : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {manufacturers.map((mfg) => {
                // Research-library entries have negative IDs — no DB profile exists yet.
                const hasProfile = mfg.id > 0;
                const CardWrapper = hasProfile
                  ? ({ children }: { children: React.ReactNode }) => (
                      <Link key={mfg.id} href={`/manufacturers/${mfg.id}`}>{children}</Link>
                    )
                  : ({ children }: { children: React.ReactNode }) => <div key={mfg.id}>{children}</div>;
                return (
                <CardWrapper key={mfg.id}>
                  <Card
                    className={`transition-all ${hasProfile ? "group cursor-pointer hover:shadow-lg hover:-translate-y-0.5" : "opacity-80"} ${
                      mfg.featured
                        ? "border-emerald-500/50 shadow-emerald-500/10"
                        : ""
                    }`}
                  >
                    <CardContent className="p-6">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-emerald-500 transition-colors">
                            {mfg.name}
                          </h3>
                          {mfg.category && (
                            <Badge
                              variant="secondary"
                              className="mt-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            >
                              {mfg.category}
                            </Badge>
                          )}
                        </div>
                        {mfg.featured && (
                          <Badge className="shrink-0 bg-emerald-600 text-white">
                            Featured
                          </Badge>
                        )}
                      </div>

                      {/* Info rows */}
                      <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                        {mfg.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-emerald-500/70" />
                            <span className="truncate">{mfg.location}</span>
                          </div>
                        )}
                        {mfg.keyProduct && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 shrink-0 text-emerald-500/70" />
                            <span className="truncate">{mfg.keyProduct}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer badges */}
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                        <div className="flex items-center gap-3">
                          {mfg.hasEpd && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              EPD Verified
                            </span>
                          )}
                          {mfg.materialCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {mfg.materialCount} material
                              {mfg.materialCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {hasProfile ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Profile coming soon</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CardWrapper>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
