/**
 * SourcingRequestDetailPage — /buyer/requests/:id
 *
 * Shows a single sourcing request with:
 * - Request metadata (type, status, fields)
 * - Supplier response comparison table (SupplierComparisonTable)
 * - Score breakdown per response
 */

import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Mail,
  Bell,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Building2,
  Calculator,
  X,
  FileText,
  Send,
  BarChart3,
  Trophy,
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

// ─── Procurement Lifecycle component ─────────────────────────────────────────

interface LifecycleStage {
  label:    string;
  sublabel: string;
  icon:     React.ReactNode;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  { label: "Define",   sublabel: "Request + fields",   icon: <FileText  className="w-4 h-4" /> },
  { label: "Invite",   sublabel: "Suppliers notified", icon: <Send      className="w-4 h-4" /> },
  { label: "Collect",  sublabel: "Awaiting responses", icon: <Bell      className="w-4 h-4" /> },
  { label: "Evaluate", sublabel: "Compare & score",    icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Award",    sublabel: "Supplier selected",  icon: <Trophy    className="w-4 h-4" /> },
];

function resolveLifecycleStage(
  status: string | null | undefined,
  responseCount: number,
  inviteCount: number,
): number {
  if (status === "awarded" || status === "closed") return 4;
  if (responseCount > 0) return 3;
  if (inviteCount > 0)   return 2;
  if (status === "submitted" || status === "responded") return 1;
  return 0;
}

function ProcurementLifecycle({
  status,
  responseCount,
  inviteCount,
}: {
  status: string | null | undefined;
  responseCount: number;
  inviteCount: number;
}) {
  const current = resolveLifecycleStage(status, responseCount, inviteCount);

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-2 overflow-x-auto">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isDone    = idx < current;
            const isCurrent = idx === current;
            const isPending = idx > current;

            return (
              <div key={stage.label} className="flex items-start gap-0 flex-1 min-w-0">
                {/* Stage */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  {/* Icon circle */}
                  <div
                    className={[
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isDone    ? "bg-green-500 text-white"                                         : "",
                      isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" : "",
                      isPending ? "bg-muted text-muted-foreground"                                  : "",
                    ].join(" ")}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : stage.icon}
                  </div>
                  {/* Labels */}
                  <div className="text-center min-w-0">
                    <p className={`text-xs font-semibold truncate ${isCurrent ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"}`}>
                      {stage.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                      {stage.sublabel}
                    </p>
                  </div>
                </div>

                {/* Connector line (not after last item) */}
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <div className="flex-1 h-px mt-4 mx-1 shrink-0 min-w-[12px]"
                    style={{
                      background: idx < current
                        ? "rgb(34 197 94)"   // green-500
                        : "hsl(var(--border))",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

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

  const invitesQuery = trpc.sourcingRequest.listInvitedSuppliers.useQuery(
    { rfqId },
    { enabled: rfqId > 0 }
  );

  const reinviteMutation = trpc.sourcingRequest.reinviteSuppliers.useMutation({
    onSuccess: (result) => {
      toast.success(`Invited ${result.invited} new supplier${result.invited !== 1 ? "s" : ""}${result.emailed ? ` — ${result.emailed} emailed` : ""}`);
      void invitesQuery.refetch();
    },
    onError: (err) => toast.error(err.message ?? "Failed to reinvite suppliers"),
  });

  // ── Shadow Carbon Pricing ────────────────────────────────────────────────────
  const [shadowCarbonPrice, setShadowCarbonPrice] = useState<number | null>(null);
  const [shadowInput, setShadowInput] = useState<string>("");

  // Sync from server value after load
  useEffect(() => {
    if (data?.rfq?.shadowCarbonPrice != null) {
      const val = parseFloat(String(data.rfq.shadowCarbonPrice));
      setShadowCarbonPrice(val);
      setShadowInput(val.toString());
    }
  }, [data?.rfq?.shadowCarbonPrice]);

  const updateFieldsMutation = trpc.sourcingRequest.updateFields.useMutation({
    onSuccess: () => toast.success("Carbon price saved"),
    onError: (err) => toast.error(err.message ?? "Failed to save"),
  });

  const applyShadowPrice = (price: number | null) => {
    setShadowCarbonPrice(price);
    setShadowInput(price != null ? price.toString() : "");
    updateFieldsMutation.mutate({ rfqId, shadowCarbonPrice: price });
  };

  const handleShadowInputApply = () => {
    const parsed = parseFloat(shadowInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter a valid carbon price ($/tonne)");
      return;
    }
    applyShadowPrice(Math.round(parsed * 100) / 100);
  };

  const SHADOW_PRESETS = [
    { label: "$40", value: 40, hint: "WEF floor" },
    { label: "$70", value: 70, hint: "Unilever ICP" },
    { label: "$100", value: 100, hint: "Near-term target" },
    { label: "$180", value: 180, hint: "2030 trajectory" },
  ];

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

        {/* Procurement lifecycle */}
        <ProcurementLifecycle
          status={rfq.status}
          responseCount={responseCount}
          inviteCount={invitesQuery.data?.length ?? 0}
        />

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
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
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {invitesQuery.data?.length ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Invited</p>
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

        {/* Shadow Carbon Pricing setter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-500" />
              Internal Carbon Price
              {shadowCarbonPrice != null && shadowCarbonPrice > 0 && (
                <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100 ml-1">
                  ${shadowCarbonPrice}/tonne active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set your organization's internal carbon price ($/tonne CO₂e) to see a <strong>carbon-adjusted cost</strong> alongside each bid.
              Adds the carbon penalty to each supplier's price so you can compare true total cost.
            </p>

            {/* Quick presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Presets:</span>
              {SHADOW_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyShadowPrice(p.value)}
                  title={p.hint}
                  className={[
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    shadowCarbonPrice === p.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border text-foreground hover:border-blue-400 hover:text-blue-700",
                  ].join(" ")}
                >
                  {p.label}
                  <span className="text-[10px] opacity-70 ml-1">{p.hint}</span>
                </button>
              ))}
              {shadowCarbonPrice != null && (
                <button
                  onClick={() => applyShadowPrice(null)}
                  className="text-xs px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Custom value input */}
            <div className="flex items-center gap-2 max-w-xs">
              <span className="text-sm text-muted-foreground shrink-0">$</span>
              <Input
                type="number"
                min={0}
                max={10000}
                step={5}
                placeholder="Custom (e.g. 55)"
                value={shadowInput}
                onChange={(e) => setShadowInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleShadowInputApply()}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground shrink-0">/tonne CO₂e</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleShadowInputApply}
                disabled={updateFieldsMutation.isPending}
                className="h-8 text-xs shrink-0"
              >
                {updateFieldsMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
              shadowCarbonPrice={shadowCarbonPrice}
            />
          )}
        </div>

        <Separator />

        {/* Invited suppliers section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Auto-matched suppliers
              {invitesQuery.data && invitesQuery.data.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({invitesQuery.data.length} notified)
                </span>
              )}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reinviteMutation.mutate({ rfqId })}
              disabled={reinviteMutation.isPending}
            >
              {reinviteMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Find more suppliers
            </Button>
          </div>

          {invitesQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !invitesQuery.data || invitesQuery.data.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>No suppliers have been notified yet.</p>
                <p className="text-xs mt-1">Click "Find more suppliers" to run auto-matching.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {invitesQuery.data.map((invite) => (
                <div
                  key={invite.inviteId}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-card"
                >
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{invite.companyName}</p>
                      {invite.tier === "premium" && (
                        <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-500">Premium</Badge>
                      )}
                      {invite.tier === "standard" && (
                        <Badge variant="secondary" className="text-xs">Standard</Badge>
                      )}
                      {invite.respondedAt && (
                        <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">Responded</Badge>
                      )}
                    </div>
                    {invite.state && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {invite.state}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {invite.matchScore ? Math.round(parseFloat(String(invite.matchScore))) : "—"}%
                      </p>
                      <p className="text-xs text-muted-foreground">match</p>
                    </div>
                    <div className="flex gap-1">
                      <span title="Email sent">
                        <Mail className={`w-4 h-4 ${invite.emailSent ? "text-green-500" : "text-muted-foreground/30"}`} />
                      </span>
                      <span title="In-app notified">
                        <Bell className={`w-4 h-4 ${invite.inAppSent ? "text-green-500" : "text-muted-foreground/30"}`} />
                      </span>
                      {invite.respondedAt && (
                        <span title="Responded">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}
