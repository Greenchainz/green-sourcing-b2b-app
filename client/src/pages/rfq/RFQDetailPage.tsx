/**
 * RFQDetailPage — view a single rfqRequest (direct-assignment model)
 * Route: /rfqs/:rfqId
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  FolderOpen,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Leaf,
  Calendar,
  MapPin,
  Ruler,
  Send,
  Ban,
} from "lucide-react";
import { Link } from "wouter";
import { useChatWidget } from "@/contexts/ChatWidgetContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectInfo {
  projectName?: string;
  projectType?: string;
  projectCity?: string;
  projectState?: string;
  startDate?: string;
  projectSqFt?: number;
}

interface MaterialRequest {
  category?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  certifications?: string[];
  maxGwp?: number;
  epdRequired?: string;
  targetDeliveryDate?: string;
}

interface ParsedSpecs {
  version?: number;
  projectInfo?: ProjectInfo;
  materialRequest?: MaterialRequest;
  cancelledByArchitect?: boolean;
  cancelledAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    description: "Awaiting supplier response",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle,
    cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    description: "Supplier accepted your request",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    description: "Supplier declined your request",
  },
  fulfilled: {
    label: "Fulfilled",
    icon: CheckCircle,
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Request fulfilled",
  },
} as const;

function StatusBadge({ status, cancelled }: { status: string; cancelled?: boolean }) {
  if (cancelled) {
    return (
      <Badge className="flex items-center gap-1 border-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <Ban className="w-3 h-3" /> Cancelled
      </Badge>
    );
  }
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`flex items-center gap-1 border-0 ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </Badge>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────────

function Timeline({ status, cancelled, createdAt: _createdAt }: { status: string; cancelled: boolean; createdAt: string }) {
  const steps = [
    { label: "Sent",      done: true,                              icon: Send },
    { label: "Received",  done: true,                              icon: Building2 },
    { label: "Responded", done: status !== "pending" && !cancelled, icon: cancelled ? Ban : status === "accepted" ? CheckCircle : XCircle },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 px-3 ${s.done ? "text-green-600" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                s.done ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/30 bg-background"
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mb-4 ${i < steps.length - 1 && steps[i + 1].done ? "bg-green-500" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Detail row helper ──────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ── Supplier response panel ────────────────────────────────────────────────────

function SupplierResponsePanel({ rfqId, architectId }: { rfqId: number; architectId: number }) {
  const { openWithConversation } = useChatWidget();

  const respond = trpc.rfqRequests.respond.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "accepted" ? "RFQ accepted" : "RFQ declined");
      if (vars.status === "accepted") {
        openWithConversation({ rfqId, buyerId: architectId });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Send className="w-4 h-4" /> Respond to This RFQ
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ id: rfqId, status: "accepted" })}
        >
          <CheckCircle className="w-4 h-4 mr-1" /> Accept & Message Architect
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ id: rfqId, status: "declined" })}
        >
          <XCircle className="w-4 h-4 mr-1" /> Decline
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RFQDetailPage() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const id = Number(rfqId);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: rfq, isLoading, error } = trpc.rfqRequests.getById.useQuery(
    { id },
    { enabled: !isNaN(id) }
  );

  const cancelMutation = trpc.rfqRequests.cancel.useMutation({
    onSuccess: () => {
      toast.success("RFQ cancelled");
      navigate("/rfqs");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container max-w-2xl py-8 flex-1 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container max-w-2xl py-16 flex-1 text-center">
          <p className="text-muted-foreground">RFQ not found or access denied.</p>
          <Link href="/rfqs"><Button variant="outline" className="mt-4">Back to My RFQs</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const parsed = rfq.parsedSpecs as ParsedSpecs | null;
  const projectInfo = parsed?.projectInfo;
  const matReq = parsed?.materialRequest;
  const isCancelled = !!parsed?.cancelledByArchitect;
  const isOwner = rfq.architectId === Number(user?.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-2xl py-8 flex-1 space-y-6">
        {/* Back */}
        <Link href="/rfqs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> My RFQs
        </Link>

        {/* Header card */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">RFQ #{rfq.id}</p>
                <h1 className="text-xl font-bold">
                  {projectInfo?.projectName ?? rfq.materialType}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {new Date(rfq.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <StatusBadge status={rfq.status} cancelled={isCancelled} />
            </div>

            <div className="mt-5 flex justify-center">
              <Timeline status={rfq.status} cancelled={isCancelled} createdAt={rfq.createdAt.toString()} />
            </div>

            {rfq.status === "accepted" && !isCancelled && (
              <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
                <strong>{rfq.supplierName}</strong> accepted your request. Reach out to proceed.
              </div>
            )}
            {rfq.status === "declined" && !isCancelled && (
              <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
                <strong>{rfq.supplierName}</strong> declined this request.{" "}
                <Link href="/rfq/new" className="underline">Send a new RFQ?</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project details */}
        {projectInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow icon={FolderOpen}  label="Project Name"  value={projectInfo.projectName} />
              <DetailRow icon={Package}     label="Project Type"  value={projectInfo.projectType} />
              <DetailRow icon={MapPin}      label="Location"      value={[projectInfo.projectCity, projectInfo.projectState].filter(Boolean).join(", ") || undefined} />
              <DetailRow icon={Calendar}    label="Start Date"    value={projectInfo.startDate} />
              <DetailRow icon={Ruler}       label="Project Size"  value={projectInfo.projectSqFt ? `${projectInfo.projectSqFt.toLocaleString()} sq ft` : undefined} />
            </CardContent>
          </Card>
        )}

        {/* Material request */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="w-4 h-4" /> Material Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matReq ? (
              <>
                <DetailRow icon={Package}  label="Category"     value={matReq.category} />
                <DetailRow icon={Package}  label="Description"  value={matReq.description} />
                <DetailRow icon={Ruler}    label="Quantity"     value={matReq.quantity ? `${matReq.quantity} ${matReq.unit ?? ""}` : undefined} />
                <DetailRow icon={Leaf}     label="EPD"          value={matReq.epdRequired ? `EPD: ${matReq.epdRequired}` : undefined} />
                {matReq.certifications && matReq.certifications.length > 0 && (
                  <div className="flex gap-3">
                    <Leaf className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Certifications</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {matReq.certifications.map((c) => (
                          <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {matReq.maxGwp && <DetailRow icon={Leaf} label="Max GWP" value={`${matReq.maxGwp} kgCO₂e/kg`} />}
                {matReq.targetDeliveryDate && <DetailRow icon={Calendar} label="Target Delivery" value={matReq.targetDeliveryDate} />}
              </>
            ) : (
              // Legacy simple format
              <>
                <DetailRow icon={Package} label="Material"  value={rfq.materialType} />
                <DetailRow icon={Ruler}   label="Quantity"  value={rfq.quantity?.toString()} />
                {rfq.specs && !rfq.parsedSpecs && (
                  <DetailRow icon={Package} label="Specs" value={rfq.specs} />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Supplier response */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Supplier Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{rfq.supplierName ?? `Supplier #${rfq.supplierId}`}</p>
                  {rfq.supplierCity && (
                    <p className="text-xs text-muted-foreground">{[rfq.supplierCity, rfq.supplierState].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
              <StatusBadge status={rfq.status} cancelled={isCancelled} />
            </div>
          </CardContent>
        </Card>

        {/* Supplier: accept / decline + open chat */}
        {!isOwner && rfq.status === "pending" && !isCancelled && (
          <SupplierResponsePanel rfqId={id} architectId={rfq.architectId} />
        )}

        {/* Actions */}
        {isOwner && rfq.status === "pending" && !isCancelled && (
          <div className="flex gap-3">
            <Link href="/rfq/new" className="flex-1">
              <Button variant="outline" className="w-full">Send Another RFQ</Button>
            </Link>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (confirm("Cancel this RFQ? This cannot be undone.")) {
                  cancelMutation.mutate({ id });
                }
              }}
              disabled={cancelMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-1" />
              {cancelMutation.isPending ? "Cancelling…" : "Cancel RFQ"}
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
