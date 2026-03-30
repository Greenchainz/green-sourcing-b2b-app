import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Globe,
  Package,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Eye,
  Layers,
  Award,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ManufacturerProfile() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { user } = useAuth();

  const { data: manufacturer, isLoading } = trpc.manufacturer.getById.useQuery(
    { id },
    { enabled: id > 0 }
  );

  const incrementViews = trpc.manufacturer.incrementViews.useMutation();

  useEffect(() => {
    if (id > 0) {
      incrementViews.mutate({ id });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-12">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Manufacturer not found</h2>
          <Link href="/manufacturers">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const materials = manufacturer.materials ?? [];
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-emerald-950/20 to-background">
        <div className="container py-10 md:py-14">
          <Link
            href="/manufacturers"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Supplier Directory
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  {manufacturer.name}
                </h1>
                {manufacturer.claimed ? (
                  <Badge className="bg-emerald-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Claimed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unclaimed
                  </Badge>
                )}
                {manufacturer.featured && (
                  <Badge className="bg-emerald-600 text-white">Featured</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {manufacturer.category && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    {manufacturer.category}
                  </Badge>
                )}
                {manufacturer.subcategory && (
                  <Badge variant="secondary">
                    {manufacturer.subcategory}
                  </Badge>
                )}
                {manufacturer.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-500/70" />
                    {manufacturer.location}
                  </span>
                )}
                {manufacturer.website && (
                  <a
                    href={manufacturer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            </div>

            {/* Admin view count */}
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
                <Eye className="h-4 w-4" />
                {manufacturer.profileViews ?? 0} views
              </div>
            )}
          </div>

          {/* Unclaimed CTA */}
          {!manufacturer.claimed && (
            <div className="mt-6 p-4 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5">
              <p className="text-sm text-muted-foreground">
                Are you this manufacturer?{" "}
                <a
                  href="mailto:hello@greenchainz.com?subject=Claim my manufacturer profile"
                  className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
                >
                  Claim your profile &rarr;
                </a>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Body */}
      <main className="container py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Description */}
            {manufacturer.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-3">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {manufacturer.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Product */}
            {manufacturer.keyProduct && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-500" />
                    Key Product
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {manufacturer.keyProduct}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Certifications & Status */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-500" />
                  Certifications & Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">EPD Status</span>
                    {manufacturer.hasEpd ? (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-500">
                        <ShieldCheck className="h-4 w-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <ShieldAlert className="h-4 w-4" />
                        Unknown
                      </span>
                    )}
                  </div>
                  {manufacturer.readinessLevel && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Readiness Level
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          manufacturer.readinessLevel === "high"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : manufacturer.readinessLevel === "medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }
                      >
                        {manufacturer.readinessLevel.charAt(0).toUpperCase() +
                          manufacturer.readinessLevel.slice(1)}
                      </Badge>
                    </div>
                  )}
                  {manufacturer.verified && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Verified by GreenChainz
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column — Materials */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xl font-semibold text-foreground">
                Materials Catalog
              </h2>
              {materials.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {materials.length}
                </Badge>
              )}
            </div>

            {materials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((mat) => (
                  <Link key={mat.id} href={`/materials/${mat.id}`}>
                    <Card className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
                      <CardContent className="p-5">
                        <h4 className="font-medium text-foreground group-hover:text-emerald-500 transition-colors truncate">
                          {mat.productName || mat.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mat.category}
                          {mat.subcategory ? ` / ${mat.subcategory}` : ""}
                        </p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {mat.hasEpd && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                              <ShieldCheck className="h-3 w-3" />
                              EPD
                            </span>
                          )}
                          {mat.gwpValue && (
                            <span className="text-xs text-muted-foreground">
                              GWP: {mat.gwpValue} {mat.gwpUnit}
                            </span>
                          )}
                          {mat.pricePerUnit && (
                            <span className="text-xs text-muted-foreground">
                              ${mat.pricePerUnit}/{mat.priceUnit || "unit"}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-10 text-center">
                  <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Products coming soon
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    This manufacturer has been identified as a leader in{" "}
                    {manufacturer.category || "sustainable building materials"}.
                    Their product catalog will be available shortly.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
