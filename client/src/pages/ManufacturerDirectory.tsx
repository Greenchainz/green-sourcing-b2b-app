import React from "react";
import { Link } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Package,
  ShieldCheck,
  Building2,
  ChevronRight,
  Star,
  Sparkles,
  Search,
  FileText,
} from "lucide-react";

type SpotlightItem = RouterOutputs["manufacturer"]["getSpotlight"][number];

export default function ManufacturerDirectory() {
  const { data: spotlight, isLoading } =
    trpc.manufacturer.getSpotlight.useQuery(undefined);

  const heroSupplier = spotlight?.[0] ?? null;
  const emergingSuppliers = spotlight?.slice(1) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Intro */}
      <section className="border-b border-border bg-gradient-to-b from-emerald-950/20 to-background">
        <div className="container py-12 md:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Supplier Spotlight
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Emerging Sustainable Suppliers
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            A hand-picked look at new and noteworthy manufacturers pushing
            low-carbon building materials forward. These are early-stage
            suppliers we&rsquo;re watching&nbsp;&mdash;{" "}
            <span className="text-foreground font-medium">
              not yet GreenChainz&nbsp;Verified
            </span>
            .
          </p>
          <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2">
            Ready to source? Search materials by carbon, EPD, price and lead
            time&nbsp;&mdash; or start an RFQ and we&rsquo;ll match verified
            suppliers for you.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/search">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                <Search className="h-4 w-4 mr-2" />
                Find materials
              </Button>
            </Link>
            <Link href="/rfq/new">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Start an RFQ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container flex-1 py-8 md:py-10">
        {isLoading ? (
          <div className="space-y-10">
            <Skeleton className="h-56 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !heroSupplier ? (
          <EmptyState />
        ) : (
          <>
            <SupplierOfTheWeek supplier={heroSupplier} />

            {emergingSuppliers.length > 0 && (
              <section className="mt-12">
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-foreground">
                    New &amp; Noteworthy
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {emergingSuppliers.map((mfg) => (
                    <EmergingCard key={mfg.id} mfg={mfg} />
                  ))}
                </div>
              </section>
            )}

            <ClaimStrip />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

/** Small pill making the emerging-vs-verified distinction explicit and honest. */
function EmergingPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      New / Emerging &mdash; not yet GreenChainz Verified
    </span>
  );
}

/** "Published EPD" — an EPD exists; this is NOT a GreenChainz endorsement. */
function PublishedEpd() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
      <ShieldCheck className="h-3.5 w-3.5" />
      Published EPD
    </span>
  );
}

/** Wrap children in a profile link only when a real DB profile exists (id > 0). */
function ProfileLink({
  id,
  className,
  children,
}: {
  id: number;
  className?: string;
  children: React.ReactNode;
}) {
  if (id > 0) {
    return (
      <Link href={`/manufacturers/${id}`} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

function SupplierOfTheWeek({ supplier }: { supplier: SpotlightItem }) {
  const hasProfile = supplier.id > 0;
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        <h2 className="text-xl font-semibold text-foreground">
          Supplier of the Week
        </h2>
      </div>
      <Card className="overflow-hidden border-emerald-500/40 shadow-lg shadow-emerald-500/5">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-emerald-600 text-white">
                  Supplier of the Week
                </Badge>
                {supplier.category && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    {supplier.category}
                  </Badge>
                )}
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {supplier.name}
              </h3>
            </div>
            <div className="shrink-0">
              <EmergingPill />
            </div>
          </div>

          {supplier.pitchAngle && (
            <p className="text-muted-foreground leading-relaxed mt-4 max-w-3xl">
              {supplier.pitchAngle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-sm text-muted-foreground">
            {supplier.location && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500/70" />
                {supplier.location}
              </span>
            )}
            {supplier.keyProduct && (
              <span className="inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500/70" />
                {supplier.keyProduct}
              </span>
            )}
            {supplier.hasEpd && <PublishedEpd />}
          </div>

          {hasProfile && (
            <div className="mt-6">
              <ProfileLink id={supplier.id}>
                <Button variant="outline" size="sm">
                  View supplier profile
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </ProfileLink>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function EmergingCard({ mfg }: { mfg: SpotlightItem }) {
  const hasProfile = mfg.id > 0;
  return (
    <ProfileLink id={mfg.id}>
      <Card
        className={`h-full transition-all ${
          hasProfile
            ? "group cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
            : "opacity-90"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3 gap-2">
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
            <Badge className="shrink-0 bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/15">
              Emerging
            </Badge>
          </div>

          {mfg.pitchAngle && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {mfg.pitchAngle}
            </p>
          )}

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

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            {mfg.hasEpd ? (
              <PublishedEpd />
            ) : (
              <span className="text-xs text-muted-foreground">
                No published EPD yet
              </span>
            )}
            {hasProfile ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Profile coming soon
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </ProfileLink>
  );
}

/** Supplier-side soft CTA: claim, don't browse-to-quote. */
function ClaimStrip() {
  return (
    <div className="mt-12 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">
            Is one of these your company?
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Claim your profile to keep your details accurate and start the path
            to becoming GreenChainz&nbsp;Verified.
          </p>
        </div>
        <Link href="/suppliers/claim" className="shrink-0">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
            Claim your profile
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 max-w-lg mx-auto">
      <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No suppliers spotlighted yet
      </h3>
      <p className="text-muted-foreground mb-6">
        We&rsquo;re curating the next set of emerging manufacturers. In the
        meantime, source materials directly or start an RFQ.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/search">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Search className="h-4 w-4 mr-2" />
            Find materials
          </Button>
        </Link>
        <Link href="/rfq/new">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Start an RFQ
          </Button>
        </Link>
      </div>
    </div>
  );
}
