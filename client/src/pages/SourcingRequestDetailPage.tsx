/**
 * SourcingRequestDetailPage — /buyer/requests/:id
 *
 * Shows a single sourcing request with:
 * - Request metadata (type, status, fields)
 * - Supplier response comparison table (SupplierComparisonTable)
 * - Score breakdown per response
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  ArrowLeft,
  MapPin,
  Users,
  ClipboardList,
  Link2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { SupplierComparisonTable } from "@/components/SupplierComparisonTable";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  rfi:                     "RFI — Request for Information",
  rfq_quote:               "RFQ — Request for Quote",
  rfp:                     "RFP — Request for Proposal",
  supplier_qualification:  "Supplier Qualification",
  alternative_material:    "Alternative Material Request",
  submittal_documentation: "Submittal Documentation",
  bid_package:             "Bid Package",
};

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  responded: "bg-yellow-100 text-yellow-800",
  awarded:   "bg-green-100 text-green-800",
  closed:    "bg-red-100 text-red-800",
};

export default function SourcingRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const rfqId = parseInt(id ?? "0", 10);

  const { data, isLoading, error } = trpc.sourcingRequest.getById.useQuery(
    { rfqId },
    { enabled: rfqId > 0 }
  );

  const responsesQuery = trpc.supplierResponse.listForRequest.useQuery(
    { rfqId },
    { enabled: rfqId > 0 }
  );

  const supplierLink = `${window.location.origin}/supplier/respond/${rfqId}`;

  const copyLink = () => {
    void navigator.clipboard.writeText(supplierLink).then(() => {
      toast.success("Supplier link copied!");
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-80 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {error?.message ?? "Request not found"}
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  const { rfq, responseCount, bestScore, avgPrice } = data;
  const fieldSchema = (rfq.responseFieldSchema ?? []) as Array<{ label: string; required: boolean; category: string }>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Back + title */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buyer/requests")}
            className="text-muted-foreground mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            All requests
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{rfq.projectName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {rfq.requestType && (
                  <Badge variant="outline" className="text-xs">
                    {REQUEST_TYPE_LABELS[rfq.requestType] ?? rfq.requestType}
                  </Badge>
                )}
                {rfq.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[rfq.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                  </span>
                )}
                {rfq.projectLocation && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {rfq.projectLocation}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{responseCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Responses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{bestScore ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Best score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">
                {avgPrice ? `$${parseFloat(String(avgPrice)).toLocaleString()}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg price</p>
            </CardContent>
          </Card>
        </div>

        {/* Supplier link */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Share with suppliers</p>
                <p className="text-sm font-mono truncate text-muted-foreground">{supplierLink}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Request details */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Description / notes */}
          {rfq.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{rfq.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Field schema summary */}
          {fieldSchema.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Supplier fields ({fieldSchema.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {fieldSchema.map((f) => (
                    <Badge
                      key={f.label}
                      variant={f.required ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        {/* Comparison table */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Supplier responses
          </h2>

          {responsesQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : responsesQuery.error ? (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{responsesQuery.error.message}</AlertDescription>
            </Alert>
          ) : (
            <SupplierComparisonTable
              rfqId={rfqId}
              bids={(responsesQuery.data?.bids ?? []) as Parameters<typeof SupplierComparisonTable>[0]["bids"]}
              onRescore={() => void responsesQuery.refetch()}
            />
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}
