import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Loader2,
  FileEdit,
  Send,
  MessageSquare,
  Trophy,
  Clock,
  XCircle,
  Package,
  ArrowRight,
  Zap,
  DollarSign,
  FileText,
  ClipboardList,
  UserCheck,
  MapPin,
  Calendar,
} from "lucide-react";
import { RfqCreationForm } from "@/components/RfqCreationForm";
import { BidComparison } from "@/components/BidComparison";
import { AiRecommendations } from "@/components/AiRecommendations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Status map ────────────────────────────────────────────────────────────────
const RFQ_STATUS_MAP: Record<
  string,
  { label: string; icon: React.ElementType; cls: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  submitted: {
    label: "Sent",
    icon: Send,
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  responded: {
    label: "Quoted",
    icon: MessageSquare,
    cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  awarded: {
    label: "Awarded",
    icon: Trophy,
    cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  expired: {
    label: "Expired",
    icon: Clock,
    cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function isExpired(rfq: any): boolean {
  return (
    !!rfq.dueDate &&
    new Date(rfq.dueDate) < new Date() &&
    rfq.status !== "awarded" &&
    rfq.status !== "closed"
  );
}

function resolvedStatus(rfq: any): string {
  if (isExpired(rfq)) return "expired";
  return rfq.status ?? "draft";
}

function StatusBadge({ rfq }: { rfq: any }) {
  const key = resolvedStatus(rfq);
  const entry = RFQ_STATUS_MAP[key] ?? {
    label: key,
    icon: Package,
    cls: "bg-gray-100 text-gray-700",
  };
  const Icon = entry.icon;
  return (
    <Badge className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border-0 ${entry.cls}`}>
      <Icon className="w-3 h-3" />
      {entry.label}
    </Badge>
  );
}

// ─── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Expandable RFQ card ───────────────────────────────────────────────────────
function RfqCard({
  rfq,
  isSelected,
  onSelect,
  onViewBids,
  isClosedView,
}: {
  rfq: any;
  isSelected: boolean;
  onSelect: (id: number | null) => void;
  onViewBids: (id: number) => void;
  isClosedView?: boolean;
}) {
  const bidCount = rfq.bidCount ?? 0;
  const hasBids = bidCount > 0;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Card header row — always visible */}
      <button
        type="button"
        className="w-full text-left px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        onClick={() => onSelect(isSelected ? null : rfq.id)}
        aria-expanded={isSelected}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base truncate">{rfq.projectName}</span>
              <StatusBadge rfq={rfq} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {rfq.projectLocation ?? "No location specified"}
            </p>
          </div>

          {/* Quote count pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
              hasBids
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {bidCount} {bidCount === 1 ? "quote" : "quotes"}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {rfq.itemCount ?? 0} {rfq.itemCount === 1 ? "item" : "items"}
          </span>
          {rfq.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Due {new Date(rfq.dueDate).toLocaleDateString()}
            </span>
          )}
          {rfq.projectType && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <FileEdit className="w-3.5 h-3.5" />
              {rfq.projectType}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-green-600 font-medium">
            {isSelected ? "Collapse" : "Expand"}{" "}
            <ArrowRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isSelected ? "rotate-90" : ""
              }`}
            />
          </span>
        </div>
      </button>

      {/* Slide-down detail section */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isSelected ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t px-5 py-4 bg-muted/30 flex items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Items</span>
              <p className="font-semibold">{rfq.itemCount ?? 0}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Quotes received</span>
              <p className={`font-semibold ${hasBids ? "text-green-600" : ""}`}>
                {bidCount}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Due date</span>
              <p className="font-semibold">
                {rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : "Open"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onViewBids(rfq.id);
            }}
          >
            {isClosedView ? "View Details" : "View Bids"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeletons ─────────────────────────────────────────────────────────
function RfqSkeleton() {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// ─── Smart Requests tab ───────────────────────────────────────────────────────

const REQUEST_TYPE_ICONS: Record<string, React.ElementType> = {
  rfi:                     FileText,
  rfq_quote:               DollarSign,
  rfp:                     ClipboardList,
  supplier_qualification:  UserCheck,
  alternative_material:    ClipboardList,
  submittal_documentation: FileText,
  bid_package:             Package,
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  rfi:                     "RFI",
  rfq_quote:               "RFQ",
  rfp:                     "RFP",
  supplier_qualification:  "Qualification",
  alternative_material:    "Alternative",
  submittal_documentation: "Submittal",
  bid_package:             "Bid Package",
};

function SmartRequestsTab() {
  const [, navigate] = useLocation();
  const { data: requests, isLoading, error } =
    trpc.sourcingRequest.listMine.useQuery(
      { limit: 25 },
      { placeholderData: prev => prev }
    );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">
            {error.message ?? "Failed to load smart requests"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Zap className="w-10 h-10 text-green-600 mx-auto opacity-60" />
          <div>
            <p className="font-semibold">No smart requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the Smart RFx Builder to turn a material need into a structured
              RFI, RFQ, RFP, or qualification request — with auto-scoring.
            </p>
          </div>
          <Link href="/buyer/new-request">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Zap className="w-4 h-4 mr-1.5" />
              Create your first smart request
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href="/buyer/new-request">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            <Zap className="w-3.5 h-3.5 mr-1.5" /> New request
          </Button>
        </Link>
      </div>
      {requests.map((req) => {
        const TypeIcon = REQUEST_TYPE_ICONS[req.requestType ?? "rfq_quote"] ?? FileText;
        const typeLabel = REQUEST_TYPE_LABELS[req.requestType ?? "rfq_quote"] ?? "RFQ";
        return (
          <div
            key={req.id}
            className="rounded-xl border bg-card text-card-foreground shadow-sm px-5 py-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/buyer/requests/${req.id}`)}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30 shrink-0">
                <TypeIcon className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{req.status}</span>
                </div>
                <p className="font-semibold truncate">{req.projectName}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {req.projectLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{req.projectLocation}
                    </span>
                  )}
                  {req.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {Number(req.responseCount) > 0 && (
                <div className="text-center shrink-0">
                  <p className="text-lg font-bold text-green-600">{req.responseCount}</p>
                  <p className="text-xs text-muted-foreground">responses</p>
                </div>
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function BuyerRfqDashboard() {
  const { user } = useAuth();
  const { openWithConversation } = useChatWidget();
  const [activeTab, setActiveTab] = useState("active");
  const [showCreateRfq, setShowCreateRfq] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisData] = useState<any>(null);

  const userId = typeof user?.id === "string" ? parseInt(user.id) : (user?.id ?? 0);

  // ── tRPC queries ──────────────────────────────────────────────────────────
  const acceptBidMutation = trpc.rfqMarketplace.acceptBid.useMutation();

  const { data: buyerRfqs, isLoading: rfqsLoading, refetch: refetchRfqs } =
    trpc.rfqMarketplace.getUserRfqs.useQuery(
      {},
      { enabled: !!userId }
    );

  const { data: rfqDetails, isLoading: detailsLoading } =
    trpc.rfqMarketplace.getRfqDetails.useQuery(
      { rfqId: selectedRfqId ?? 0 },
      { enabled: !!selectedRfqId }
    );

  // ── Derived data ──────────────────────────────────────────────────────────
  const displayRfqs = buyerRfqs ?? [];
  const selectedRfq = displayRfqs.find((r: any) => r.id === selectedRfqId);
  const rfqBids = rfqDetails?.bids ?? [];

  const activeRfqs = displayRfqs.filter(
    (r: any) =>
      !isExpired(r) &&
      (r.status === "submitted" || r.status === "responded" || r.status === "draft")
  );
  const closedRfqs = displayRfqs.filter(
    (r: any) => r.status === "awarded" || r.status === "closed"
  );
  const expiredRfqs = displayRfqs.filter(
    (r: any) =>
      r.dueDate &&
      new Date(r.dueDate) < new Date() &&
      r.status !== "awarded" &&
      r.status !== "closed"
  );

  // Summary stats
  const totalCount = displayRfqs.length;
  const activeCount = activeRfqs.length;
  const quotedCount = displayRfqs.filter((r: any) => (r.bidCount ?? 0) > 0).length;
  const awardedCount = displayRfqs.filter((r: any) => r.status === "awarded").length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateRfq = async () => {
    setShowCreateRfq(false);
    await refetchRfqs();
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!selectedRfqId) return;
    try {
      await acceptBidMutation.mutateAsync({ rfqId: selectedRfqId, bidId });
      await refetchRfqs();
    } catch (error) {
      console.error("Failed to accept bid:", error);
    }
  };

  const handleViewBids = (id: number) => {
    setSelectedRfqId(id);
    // Scroll down to bid comparison section
    setTimeout(() => {
      document.getElementById("bid-comparison-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleCardExpand = (id: number | null) => {
    setExpandedCardId(id);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-6xl py-8 flex-1 space-y-6">

        {/* Page title + CTAs */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RFQ Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your requests for quotation and compare supplier bids
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/buyer/new-request">
              <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <Zap className="w-4 h-4" /> Smart RFx Builder
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setShowCreateRfq(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Classic RFQ
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        {rfqsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex-1">
                <CardContent className="pt-5 pb-4 px-5">
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total RFQs"
              value={totalCount}
              icon={Package}
              colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            />
            <StatCard
              label="Active"
              value={activeCount}
              icon={Send}
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatCard
              label="Quoted"
              value={quotedCount}
              icon={MessageSquare}
              colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
            />
            <StatCard
              label="Awarded"
              value={awardedCount}
              icon={Trophy}
              colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            />
          </div>
        )}

        {/* RFQ Creation Modal */}
        <Dialog open={showCreateRfq} onOpenChange={setShowCreateRfq}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New RFQ</DialogTitle>
              <DialogDescription>
                Submit a request for quotation to find the best suppliers for your materials
              </DialogDescription>
            </DialogHeader>
            <RfqCreationForm onSuccess={handleCreateRfq} />
          </DialogContent>
        </Dialog>

        {/* Loading state */}
        {rfqsLoading && (
          <div className="space-y-3">
            <RfqSkeleton />
            <RfqSkeleton />
            <RfqSkeleton />
          </div>
        )}

        {/* Tabs */}
        {!rfqsLoading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">
                Active{" "}
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold px-1.5 min-w-[1.25rem]">
                  {activeRfqs.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired{" "}
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-semibold px-1.5 min-w-[1.25rem]">
                  {expiredRfqs.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed / Awarded{" "}
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold px-1.5 min-w-[1.25rem]">
                  {closedRfqs.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="smart" className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-green-600" />
                Smart Requests
              </TabsTrigger>
            </TabsList>

            {/* ── Active RFQs ─────────────────────────────────────────────── */}
            <TabsContent value="active" className="space-y-3">
              {activeRfqs.length === 0 ? (
                <Card>
                  <CardContent className="pt-8 pb-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No active RFQs yet</p>
                    <Button
                      onClick={() => setShowCreateRfq(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Create Your First RFQ
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {activeRfqs.map((rfq: any) => (
                    <RfqCard
                      key={rfq.id}
                      rfq={rfq}
                      isSelected={expandedCardId === rfq.id}
                      onSelect={handleCardExpand}
                      onViewBids={handleViewBids}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Expired RFQs ─────────────────────────────────────────────── */}
            <TabsContent value="expired" className="space-y-3">
              {expiredRfqs.length === 0 ? (
                <Card>
                  <CardContent className="pt-8 pb-8 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No expired RFQs</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {expiredRfqs.map((rfq: any) => (
                    <RfqCard
                      key={rfq.id}
                      rfq={rfq}
                      isSelected={expandedCardId === rfq.id}
                      onSelect={handleCardExpand}
                      onViewBids={handleViewBids}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Closed / Awarded RFQs ────────────────────────────────────── */}
            <TabsContent value="closed" className="space-y-3">
              {closedRfqs.length === 0 ? (
                <Card>
                  <CardContent className="pt-8 pb-8 text-center">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No closed or awarded RFQs yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {closedRfqs.map((rfq: any) => (
                    <RfqCard
                      key={rfq.id}
                      rfq={rfq}
                      isSelected={expandedCardId === rfq.id}
                      onSelect={handleCardExpand}
                      onViewBids={handleViewBids}
                      isClosedView
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            {/* ── Smart RFx Requests ──────────────────────────────────────────── */}
            <TabsContent value="smart">
              <SmartRequestsTab />
            </TabsContent>
          </Tabs>
        )}

        {/* ── Bid Comparison View ──────────────────────────────────────────── */}
        {selectedRfqId && selectedRfq && (
          <div id="bid-comparison-section">
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Bid Comparison: {selectedRfq.projectName}</CardTitle>
                    <CardDescription>{selectedRfq.projectLocation}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedRfqId(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* AI Analysis Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">AI-Powered Analysis</h3>
                      <Button
                        variant="outline"
                        onClick={() => setShowAiAnalysis(!showAiAnalysis)}
                      >
                        {showAiAnalysis ? "Hide Analysis" : "Show AI Recommendations"}
                      </Button>
                    </div>
                    {showAiAnalysis && (
                      <AiRecommendations analysis={aiAnalysisData} isLoading={false} />
                    )}
                  </div>

                  {/* Bid Comparison */}
                  {detailsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                      <span className="ml-2 text-muted-foreground">Loading bids...</span>
                    </div>
                  ) : (
                    <BidComparison
                      rfqId={selectedRfqId}
                      bids={rfqBids as any}
                      onAcceptBid={handleAcceptBid}
                      onMessage={(supplierId) => openWithConversation({ supplierId })}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
