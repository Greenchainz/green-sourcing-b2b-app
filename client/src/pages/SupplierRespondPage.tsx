/**
 * SupplierRespondPage — /supplier/respond/:rfqId
 *
 * Supplier-facing response form for a sourcing request.
 * Dynamically renders fields from the buyer's responseFieldSchema.
 * Auto-scores on submission.
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  MapPin,
  Calendar,
  Building2,
  ArrowLeft,
  Lock,
} from "lucide-react";

import { SupplierResponseForm } from "@/components/SupplierResponseForm";
import type { SupplierResponseField } from "@/components/SmartRfxRecommendationCard";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  rfi:                     "RFI — Request for Information",
  rfq_quote:               "RFQ — Request for Quote",
  rfp:                     "RFP — Request for Proposal",
  supplier_qualification:  "Supplier Qualification",
  alternative_material:    "Alternative Material Request",
  submittal_documentation: "Submittal Documentation",
  bid_package:             "Bid Package",
};

export default function SupplierRespondPage() {
  const { rfqId: rfqIdStr } = useParams<{ rfqId: string }>();
  const rfqId = parseInt(rfqIdStr ?? "0", 10);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Load RFQ details (public-safe — only metadata, no scoring data)
  const rfqQuery = trpc.sourcingRequest.getForResponse.useQuery(
    { rfqId },
    { enabled: rfqId > 0 }
  );

  const existingResponseQuery = trpc.supplierResponse.getMyResponse.useQuery(
    { rfqId },
    { enabled: rfqId > 0 && !!user }
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-16 text-center space-y-4">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Sign in to respond</h2>
          <p className="text-muted-foreground text-sm">
            You need a GreenChainz supplier account to submit a response.
          </p>
          <Button
            onClick={() => navigate(`/login?returnPath=/supplier/respond/${rfqId}`)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Sign in
          </Button>
          <p className="text-xs text-muted-foreground">
            Not a supplier yet?{" "}
            <a href="/supplier/register" className="text-green-600 hover:underline">
              Create a free account
            </a>
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const isLoading = rfqQuery.isLoading;
  const rfq = rfqQuery.data;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (rfqQuery.error || !rfq) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {rfqQuery.error?.message ?? "Request not found or no longer accepting responses."}
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  // Extract field schema from rfq — fall back to empty
  const fieldSchema: SupplierResponseField[] = Array.isArray(rfq.responseFieldSchema)
    ? (rfq.responseFieldSchema as SupplierResponseField[])
    : [];

  const existingValues = existingResponseQuery.data?.fieldValues as Record<string, unknown> | null ?? undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Back nav */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/supplier/rfqs")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          My RFQ dashboard
        </Button>

        {/* Request header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                {rfq.requestType && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {REQUEST_TYPE_LABELS[rfq.requestType] ?? rfq.requestType}
                  </Badge>
                )}
                <CardTitle className="text-xl">{rfq.projectName}</CardTitle>
              </div>
              <Building2 className="w-6 h-6 text-muted-foreground shrink-0 mt-1" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {rfq.projectLocation && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {rfq.projectLocation}
              </p>
            )}
            {rfq.dueDate && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Due {new Date(rfq.dueDate).toLocaleDateString()}
              </p>
            )}
            {rfq.notes && (
              <p className="text-sm leading-relaxed pt-1">{rfq.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Already responded banner */}
        {existingResponseQuery.data && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              You've already submitted a response. Submitting again will update your previous response.
            </AlertDescription>
          </Alert>
        )}

        {/* Response form */}
        {fieldSchema.length > 0 ? (
          <SupplierResponseForm
            rfqId={rfqId}
            projectName={rfq.projectName}
            fieldSchema={fieldSchema}
            existingResponse={existingValues}
            onSubmitted={() => {
              void existingResponseQuery.refetch();
            }}
          />
        ) : (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              This request doesn't have a structured response form. Contact the buyer directly.
            </AlertDescription>
          </Alert>
        )}

      </main>

      <Footer />
    </div>
  );
}
